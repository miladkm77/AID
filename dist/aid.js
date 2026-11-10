// src/gl/gl.ts
var GL = class {
  constructor(gl, vertexSource) {
    this.passes = 0;
    this.gl = gl;
    gl.getExtension("EXT_color_buffer_float") || gl.getExtension("EXT_color_buffer_half_float");
    this.vs = this.shader(gl.VERTEX_SHADER, vertexSource);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }
  get maxTexture() {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
  }
  shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader compile failed");
    return s;
  }
  program(fragmentSource) {
    const gl = this.gl;
    const p = gl.createProgram();
    gl.attachShader(p, this.vs);
    gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || "program link failed");
    const u = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i).name.replace("[0]", "");
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }
  texParams(min, wrap) {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  }
  target(w, h) {
    const gl = this.gl;
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this.texParams(gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error("half-float render targets are not supported");
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }
  pingPong(w, h) {
    let a = this.target(w, h);
    let b = this.target(w, h);
    const self = this;
    return {
      get read() {
        return a;
      },
      get write() {
        return b;
      },
      swap() {
        const t = a;
        a = b;
        b = t;
      },
      dispose() {
        self.dispose(a);
        self.dispose(b);
      }
    };
  }
  dispose(t) {
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fb);
  }
  bind(unit, tex) {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    return unit;
  }
  draw(target) {
    const gl = this.gl;
    this.passes++;
    if (target) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.fb);
      gl.viewport(0, 0, target.w, target.h);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
  /** Smooth, tileable value noise used for smoke texture and thermal agitation. */
  noiseTexture(n = 128) {
    const gl = this.gl;
    let f = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) f[i] = Math.random();
    for (let pass = 0; pass < 4; pass++) {
      const g = new Float32Array(n * n);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          let s = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += f[(y + dy + n) % n * n + (x + dx + n) % n];
          g[y * n + x] = s / 9;
        }
      f = g;
    }
    let lo = 1, hi = 0;
    for (let i = 0; i < n * n; i++) {
      lo = Math.min(lo, f[i]);
      hi = Math.max(hi, f[i]);
    }
    const a = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) {
      const v = (f[i] - lo) / (hi - lo) * 255 | 0;
      a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = v;
      a[i * 4 + 3] = 255;
    }
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    this.texParams(gl.LINEAR, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, a);
    return t;
  }
};

// src/gl/shaders.ts
var MAX_CONTAINERS = 16;
var VERTEX = `#version 300 es
in vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;
void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}`;
var HEAD = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 vUv,vL,vR,vT,vB;out vec4 o;
`;
var CONTAINERS = `
uniform vec4 uR[${MAX_CONTAINERS}];uniform vec4 uI[${MAX_CONTAINERS}];uniform vec4 uE[${MAX_CONTAINERS}];uniform int uN;uniform vec2 uPx;uniform vec3 uGv;
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float elD(int i,vec2 uv){vec4 R=uR[i];vec2 lo=R.xy*uPx,hi=R.zw*uPx,hb=(hi-lo)*.5;return sdRR(uv*uPx-(lo+hi)*.5,hb,min(uI[i].z,min(hb.x,hb.y)));}
float elT(int i,float d){vec2 hb=(uR[i].zw-uR[i].xy)*uPx*.5;float w=max(min(hb.x,hb.y)*uI[i].y,1.5);float x=clamp(-d/w,0.,1.);return x*x*(3.-2.*x);}
/* settling: density profile of a gas that is heavier (or lighter) than the air it shares the container with */
float elS(int i,vec2 uv){
 vec4 R=uR[i];vec2 c=(R.xy+R.zw)*.5*uPx,hb=(R.zw-R.xy)*uPx*.5;
 float L=2.*(abs(uGv.x)*hb.x+abs(uGv.y)*hb.y);
 float h=clamp(L*.5-dot(uv*uPx-c,uGv.xy),0.,L),k=uGv.z*uE[i].y;
 return exp(-h*k)*(1.+.5*min(L*k,2.));}
`;
var GEO = HEAD + CONTAINERS + `
uniform vec4 uM[${MAX_CONTAINERS}];
void main(){float m=0.,g=0.;vec2 mv=vec2(0.);
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float k=1.-smoothstep(-1.,1.,elD(i,vUv));if(k>m)mv=uM[i].xy;m=max(m,k);g+=k*uI[i].x*elS(i,vUv);}
 o=vec4(m,g,mv);}`;
var GAS = HEAD + `
uniform sampler2D uS,uG,uNz;uniform vec2 texel,uPx;
uniform float dt,c2,gam,tAmp,tSpd,t,vmax,rk,diff;uniform vec4 uPtr;uniform vec2 uPv;
vec4 nb(vec2 p,vec4 C){return texture(uG,p).x>.5?texture(uS,p):vec4(C.x,0.,0.,0.);}
/* density relative to the settled profile; outside the gas the centre value, so a wall exerts no force */
float rel(vec2 p,float sC){vec4 g=texture(uG,p);return g.x>.5?texture(uS,p).x/max(g.y,.03):sC;}
#define PSI(p) (texture(uNz,(p)+vec2(.031,.017)*tt).x+.5*texture(uNz,(p)*2.1-vec2(.023,-.029)*tt+.5).x)
void main(){
 vec4 G=texture(uG,vUv);if(G.x<.02){o=vec4(0.);return;}
 if(G.x<.5){o=vec4(G.y,0.,0.,1.);return;}                    /* wall cells hold the settled value and do not move */
 vec4 C=texture(uS,vUv);
 vec2 p=vUv-dt*C.yz*texel-G.zw;                              /* moving containers carry their gas */
 vec4 A=texture(uG,p).x>.5?texture(uS,p):C;float r=A.x;vec2 v=A.yz;
 vec4 L=nb(vL,C),R=nb(vR,C),T=nb(vT,C),B=nb(vB,C);
 float sC=C.x/max(G.y,.03),sL=rel(vL,sC),sR=rel(vR,sC),sT=rel(vT,sC),sB=rel(vB,sC);
 v-=dt*c2*vec2(sR-sL,sT-sB)*.5/max(sC,.25);                  /* pressure and weight */
 float cpp=1./(uPx.x*texel.x);
 r-=dt*r*.5*(R.y-L.y+T.z-B.z);                               /* continuity */
 r+=diff*G.y*(sL+sR+sT+sB-4.*sC);v+=diff*(L.yz+R.yz+T.yz+B.yz-4.*C.yz);   /* diffusion toward the settled profile + viscosity */
 vec2 d=(vUv-uPtr.xy)*uPx;float rr=length(d),k=exp(-rr*rr/(uPtr.w*uPtr.w));
 v+=dt*k*(uPtr.z*d/max(rr,1.)+uPv*cpp*2.5);                  /* finger: pushes gas aside, drags a wake */
 vec2 q=vUv*uPx/260.;float tt=t*tSpd;float e=.004;
 float dpx=PSI(q+vec2(e,0.))-PSI(q-vec2(e,0.)),dpy=PSI(q+vec2(0.,e))-PSI(q-vec2(0.,e));
 v+=dt*tAmp*vec2(dpy,-dpx)/(2.*e)*.12;                       /* thermal stirring, divergence-free */
 v*=exp(-gam*dt);
 r+=(G.y-r)*min(1.,rk*dt);                                    /* regulator holds the set pressure */
 float sp=length(v);if(sp>vmax)v*=vmax/sp;
 if(any(isnan(v))||isnan(r)){v=vec2(0.);r=G.y;}
 o=vec4(clamp(r,0.,4.),v,1.);}`;
var RENDER = HEAD + CONTAINERS + `
uniform sampler2D uFeed,uS,uNz,uGt;
uniform float scr,vf,amp,dn,sig,smoke,reach,flowT,smix,hasSim,hasFeed,alb,agit,glow,fdpr;
uniform vec3 scene,tw,emis;uniform vec4 mem,uPtr;uniform int mode,taps;
vec2 fuv(vec2 s){float fy=scr+(1.-s.y)*vf;return vec2(clamp(s.x,0.,1.),1.-clamp(fy,0.,1.));}
vec3 feed(vec2 s){return texture(uFeed,fuv(s)).rgb;}
float fbm(vec2 p){return texture(uNz,p).x*.55+texture(uNz,p*1.97+.37).x*.3+texture(uNz,p*3.9+.71).x*.15;}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
/* smooth gas state: x = density, y = density the container is regulated to, z = inside a container */
vec3 gasAt(vec2 uv){
 if(hasSim>0.){vec4 G=texture(uGt,uv);return vec3(texture(uS,uv).x,G.y,G.x);}
 float tg=0.,ins=0.;
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;if(elD(i,uv)>0.)continue;ins=1.;tg+=uI[i].x*elS(i,uv);}
 if(ins<.5)return vec3(0.);
 vec2 d=(uv-uPtr.xy)*uPx;
 return vec3(tg*(1.-min(uPtr.z/600.,.7)*exp(-dot(d,d)/(uPtr.w*uPtr.w))),tg,1.);}
void main(){
 bool near=false;float memv=0.,th=0.,ex=0.,wall=1e4;
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float d=elD(i,vUv);if(d<1.)near=true;float a=abs(uI[i].w);
  wall=min(wall,abs(d));if(d<=0.){th=max(th,elT(i,d));ex=max(ex,uE[i].x);}
  if(a>0.){float ring=1.-smoothstep(0.,1.1,abs(d+.6));if(uI[i].w<0.)ring*=step(.5,fract((vUv.x*uPx.x+vUv.y*uPx.y)/7.));memv=max(memv,ring*a);}}
 if(!near||mode==3){if(hasFeed>0.)o=vec4((mode==0||mode==3)?feed(vUv):vec3(.04),1.);else o=vec4(0.);return;}
 vec3 g0=gasAt(vUv),gl=gasAt(vL),gr=gasAt(vR),gt=gasAt(vT),gb=gasAt(vB);
 /* only the disturbance (density minus the settled profile) refracts: it is zero at rest and outside the gas,
    so a wall never acts as a lens */
 float dl=gl.x-gl.y,dr=gr.x-gr.y,dT=gt.x-gt.y,dB=gb.x-gb.y,d0=g0.x-g0.y;
 float inner=smoothstep(1.,3.,wall/(uPx.x*(vR.x-vUv.x)));     /* the cells at a wall are held, not simulated */
 vec2 grad=vec2(dr-dl,dT-dB)*.5*inner;
 float lap=(dl+dr+dT+dB-4.*d0)*inner;
 vec2 fl=hasSim>0.?texture(uS,vUv).yz*.0009:vec2(0.);
 float det=fbm(vUv*uPx/520.+vec2(.006,-.011)*flowT-fl);
 /* wisps: where the gas is thin only the peaks of the texture show; where it has pooled it is continuous */
 /* the edge of the layer billows on the two coarse octaves only; fine noise there reads as a row of beads */
 vec2 bp=vUv*uPx/640.+vec2(.006,-.011)*flowT-fl;float bil=texture(uNz,bp).x*.68+texture(uNz,bp*1.97+.37).x*.32;
 float D=th*g0.x*mix(1.,smoothstep(.28,.74,bil+.4*(g0.x-1.))*1.6,smoke);
 vec2 off=grad*dn*1e-6*amp*2.4;
 vec2 q=vUv*uPx/230.+vec2(.05,.11)*flowT;float n0=texture(uNz,q).x;
 off+=vec2(n0-texture(uNz,q+vec2(.02,0.)).x,n0-texture(uNz,q+vec2(0.,.02)).x)*D*agit*dn*1e-6*amp*.45;   /* thermal shimmer */
 off=clamp(off,vec2(-.03),vec2(.03));
 float sg=clamp(1.-lap*dn*amp*2.5e-5,.8,1.25);                 /* shadowgraph: brightness follows \u2212\u2207\xB2n */
 vec3 Tt=exp(-sig*D*tw);
 float wisp=mix(1.,.6+.6*det,smoke);
 vec3 Lc=scene;
 if(hasFeed>0.){
  /* content is the light: gather it from rings out to the reach; near and saturated sources count most */
  Lc=vec3(0.);float W=0.;float nr=max(float((taps-1)/4),1.);
  for(int k=0;k<13;k++){if(k>=taps)break;float ring=k==0?0.:float((k-1)/4+1);
   float rad=reach*ring/nr,a=float(k)*1.5708+ring*.7854;vec2 p=vUv+vec2(cos(a),sin(a))*rad/uPx;
   /* each tap reads a mip whose footprint grows with its distance, so the rings overlap and no direction is missed */
   vec3 c=textureLod(uFeed,fuv(p),log2(max(rad*.85,10.)*fdpr)).rgb;
   float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),sat=mx>0.?(mx-mn)/mx:0.;
   float w=(.2+luma(c))*(.4+3.*sat)/(1.+ring*.5);Lc+=c*w;W+=w;}
  Lc/=max(W,1e-4);float lm=luma(Lc);Lc=clamp(mix(vec3(lm),Lc,1.+.7*glow),0.,1.);}
 vec3 Lin=mix(Lc,scene,smix)*wisp;
 float eg=ex*(1.-exp(-1.4*D));
 if(hasFeed>0.){
  /* what is seen through the gas loses detail with depth: forward scattering spreads it (a mip blur \u221D density) */
  vec3 back=textureLod(uFeed,fuv(vUv+off),log2(1.+D*5.*fdpr)).rgb;
  vec3 c=(back*Tt+Lin*alb*(1.-Tt))*sg;
  c=mix(c,emis,eg*.5)+emis*eg*.35;
  c=mix(c,mem.rgb,memv*mem.a);
  if(mode==1)c=mix(vec3(.04),vec3(.78,.86,1.),clamp(D/1.6,0.,1.))+memv*.2;
  if(mode==2)c=Lin*(1.-Tt)*1.6+emis*eg+memv*.15;
  if(any(isnan(c)))c=feed(vUv);
  o=vec4(clamp(c,0.,1.),1.);
 }else{
  /* DOM backdrop: the page behind is not readable by WebGL, so only the gas itself is drawn (premultiplied) */
  float a=clamp(1.-dot(Tt,vec3(.3333)),0.,1.);
  vec3 c=mix(Lin*alb*sg,emis,eg*.6)*a+emis*eg*.25;float aa=clamp(a+eg*.25,0.,1.);
  float m=memv*mem.a;c=c*(1.-m)+mem.rgb*m;aa=aa*(1.-m)+m;
  if(any(isnan(c))){c=vec3(0.);aa=0.;}
  o=vec4(clamp(c,0.,1.),clamp(aa,0.,1.));
 }}`;

// src/core/gases.ts
var AIR_REFRACTIVITY = 293;
var AIR_MOLAR_MASS = 28.96;
var GASES = {
  helium: { id: "helium", symbol: "He", refractivity: 36, molarMass: 4.003, refractivitySourced: true, emission: [255, 176, 138] },
  neon: { id: "neon", symbol: "Ne", refractivity: 67, molarMass: 20.18, refractivitySourced: false, emission: [255, 74, 40] },
  argon: { id: "argon", symbol: "Ar", refractivity: 281, molarMass: 39.95, refractivitySourced: false, emission: [172, 118, 255] },
  krypton: { id: "krypton", symbol: "Kr", refractivity: 427, molarMass: 83.8, refractivitySourced: false, emission: [212, 194, 255] },
  xenon: { id: "xenon", symbol: "Xe", refractivity: 702, molarMass: 131.29, refractivitySourced: false, emission: [118, 168, 255] }
};
var DEFAULT_GAS = "xenon";
function parseGas(v) {
  const k = (v || "").trim().toLowerCase();
  const bySymbol = Object.values(GASES).find((g) => g.symbol.toLowerCase() === k);
  if (bySymbol) return bySymbol.id;
  return k in GASES ? k : DEFAULT_GAS;
}
function deltaN(g) {
  return g.refractivity - AIR_REFRACTIVITY;
}
function scatterRelative(g) {
  return Math.pow(g.refractivity / GASES.xenon.refractivity, 2);
}
function thermalSpeed(g, temperature01) {
  return Math.sqrt((temperature01 + 0.05) / 1.05) * Math.sqrt(GASES.xenon.molarMass / g.molarMass);
}
function buoyancy(g) {
  return (g.molarMass - AIR_MOLAR_MASS) / (GASES.xenon.molarMass - AIR_MOLAR_MASS);
}
function responseSpeed(g) {
  return Math.pow(GASES.xenon.molarMass / g.molarMass, 0.22);
}

// src/core/params.ts
var SCENE_DEFAULTS = {
  gas: DEFAULT_GAS,
  temperature: 0.45,
  refraction: 140,
  weight: 0.6,
  tilt: 0,
  lightReach: 140,
  glow: 1,
  smoke: 0.5,
  spectral: 0.1,
  quality: "auto"
};
var CONTAINER_DEFAULTS = { pressure: 1, membrane: 1, profile: 0.2, excitation: 0, weight: 0.6 };
function num(cs, name, fallback, lo, hi) {
  const raw = cs.getPropertyValue(name).trim();
  if (!raw) return fallback;
  const v = parseFloat(raw);
  if (!isFinite(v)) return fallback;
  return Math.min(hi, Math.max(lo, v));
}
function readSceneParams(el) {
  const cs = getComputedStyle(el);
  const q = cs.getPropertyValue("--aid-quality").trim();
  return {
    gas: parseGas(cs.getPropertyValue("--aid-gas") || SCENE_DEFAULTS.gas),
    temperature: num(cs, "--aid-agitation", num(cs, "--aid-temperature", SCENE_DEFAULTS.temperature, 0, 1), 0, 1),
    refraction: num(cs, "--aid-refraction", SCENE_DEFAULTS.refraction, 0, 400),
    weight: num(cs, "--aid-weight", SCENE_DEFAULTS.weight, 0, 1),
    tilt: num(cs, "--aid-tilt", SCENE_DEFAULTS.tilt, -180, 180),
    lightReach: num(cs, "--aid-light-reach", SCENE_DEFAULTS.lightReach, 0, 400),
    glow: num(cs, "--aid-glow", SCENE_DEFAULTS.glow, 0, 2),
    smoke: num(cs, "--aid-smoke", SCENE_DEFAULTS.smoke, 0, 1),
    spectral: num(cs, "--aid-spectral", SCENE_DEFAULTS.spectral, 0, 1),
    quality: ["auto", "static", "efficient", "high"].includes(q) ? q : SCENE_DEFAULTS.quality
  };
}
function readContainerParams(el) {
  const cs = getComputedStyle(el);
  return {
    pressure: num(cs, "--aid-pressure", CONTAINER_DEFAULTS.pressure, 0, 2),
    membrane: num(cs, "--aid-membrane", CONTAINER_DEFAULTS.membrane, 0, 1),
    profile: num(cs, "--aid-profile", CONTAINER_DEFAULTS.profile, 0, 1),
    excitation: num(cs, "--aid-excitation", CONTAINER_DEFAULTS.excitation, 0, 1),
    weight: num(cs, "--aid-weight", CONTAINER_DEFAULTS.weight, 0, 1)
  };
}
function densityFactor(temperature01) {
  return 300 / (250 + 150 * temperature01);
}
function kelvin(temperature01) {
  return Math.round(250 + 150 * temperature01);
}
function albedo(smoke) {
  return 1 - 0.42 * smoke;
}

// src/core/tiers.ts
var TIERS = {
  static: { grid: 0, dprCap: 1.25, simHz: 0, lightTaps: 5, ambient: false },
  efficient: { grid: 80, dprCap: 1.5, simHz: 30, lightTaps: 9, ambient: false },
  high: { grid: 128, dprCap: 2, simHz: 60, lightTaps: 13, ambient: true }
};
function chooseTier(q) {
  if (q === "static" || q === "efficient" || q === "high") return q;
  if (typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches) return "static";
  const nav = navigator;
  const mem = nav.deviceMemory ?? 4;
  const cores = nav.hardwareConcurrency ?? 4;
  if (mem <= 2 || cores <= 2) return "static";
  if (mem >= 8 && cores >= 8 && (window.devicePixelRatio || 1) >= 2) return "high";
  return "efficient";
}

// src/engine/engine.ts
var SCALE_HEIGHT = 14;
var RAYLEIGH = (() => {
  const w = [Math.pow(465 / 610, 4), Math.pow(465 / 550, 4), 1];
  const m = (w[0] + w[1] + w[2]) / 3;
  return w.map((x) => x / m);
})();
var GasEngine = class {
  constructor(host, canvas, transparent) {
    this.host = host;
    this.canvas = canvas;
    this.st = null;
    this.geo = null;
    this.slots = /* @__PURE__ */ new Map();
    this.order = [];
    this.uR = new Float32Array(MAX_CONTAINERS * 4);
    this.uI = new Float32Array(MAX_CONTAINERS * 4);
    this.uM = new Float32Array(MAX_CONTAINERS * 4);
    this.uE = new Float32Array(MAX_CONTAINERS * 4);
    this.grav = { x: 0, y: -1, k: 0 };
    this.cssAngle = NaN;
    this.cssFade = NaN;
    /** tilt reported by the device, in degrees; added to --aid-tilt */
    this.deviceTilt = 0;
    this.n = 0;
    this.W = 0;
    this.H = 0;
    this.SW = 16;
    this.SH = 16;
    this.feedDpr = 1;
    this.feedW = 1;
    this.feedH = 1;
    this.hasFeed = false;
    this.scene = { ...SCENE_DEFAULTS };
    this.tier = "efficient";
    this.view = "final";
    this.backdropScroll = 0;
    this.ptr = { x: -1, y: -1, down: false, over: false, vx: 0, vy: 0, lx: 0, ly: 0, lt: 0, str: 0 };
    this.raf = 0;
    this.last = 0;
    this.acc = 0;
    this.time = 0;
    this.flowT = 0;
    this.lastActive = 0;
    this.lastParams = 0;
    this.frames = [];
    this.visible = true;
    this.onscreen = true;
    this.stats = { tier: "efficient", grid: "", simHz: 0, fps: 0, frameMs: 0, passes: 0, state: "asleep", error: "" };
    this.disposers = [];
    this.onStats = null;
    this.tick = (ts) => {
      this.raf = 0;
      const t = ts / 1e3;
      const dt = Math.min(Math.max(t - this.last, 1e-3), 1 / 15);
      this.last = t;
      this.g.passes = 0;
      this.refreshParams();
      const cfg = TIERS[this.tier];
      const p = this.ptr;
      const want = p.over ? p.down ? 520 : 110 : 0;
      p.str += (want - p.str) * (1 - Math.exp(-dt * 12));
      p.vx *= Math.exp(-dt * 8);
      p.vy *= Math.exp(-dt * 8);
      let moving = this.collect(dt) || p.str > 2;
      const now = performance.now() / 1e3;
      const simOn = cfg.simHz > 0 && (cfg.ambient || moving || now - this.lastActive < 2.2);
      if (simOn || cfg.simHz === 0 && moving) this.flowT += dt * this.speed();
      if (simOn) {
        this.acc += dt;
        const h = 1 / cfg.simHz;
        if (this.acc >= h) {
          const n = Math.min(3, Math.round(this.acc / h));
          const sub = Math.min(this.acc, 1 / 15) / n;
          for (let i = 0; i < n; i++) {
            const parts = Math.ceil(sub * 60 - 1e-6);
            for (let k = 0; k < parts; k++) this.step(sub / parts);
          }
          this.acc = 0;
        }
      }
      this.render();
      this.frames.push(dt * 1e3);
      if (this.frames.length > 90) this.frames.shift();
      const keep = simOn || moving;
      this.report(simOn ? "simulating" : "render-only");
      if (keep && this.visible && this.onscreen) this.raf = requestAnimationFrame(this.tick);
      else this.report("asleep");
    };
    this.lastReport = 0;
    const gl = canvas.getContext("webgl2", {
      alpha: transparent,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power"
    });
    if (!gl) throw new Error("WebGL2 is not available");
    this.gl = gl;
    this.g = new GL(gl, VERTEX);
    this.P = { geo: this.g.program(GEO), gas: this.g.program(GAS), render: this.g.program(RENDER) };
    this.noise = this.g.noiseTexture();
    this.feedTex = gl.createTexture();
    this.bindEvents();
  }
  /* ---------------- containers ---------------- */
  add(c) {
    if (this.slots.has(c)) return;
    const s = { c, params: { ...CONTAINER_DEFAULTS }, pv: 0, ev: 0, wv: CONTAINER_DEFAULTS.weight, lastX: NaN, lastY: NaN, accX: 0, accY: 0 };
    this.slots.set(c, s);
    this.order.push(s);
    this.refreshParams(true);
    this.wake();
  }
  remove(c) {
    const s = this.slots.get(c);
    if (!s) return;
    this.slots.delete(c);
    this.order.splice(this.order.indexOf(s), 1);
    this.wake();
  }
  /* ---------------- backdrop ---------------- */
  /** Use a canvas or image as the content behind the gas. Pass null for a DOM backdrop. */
  setBackdrop(src, cssWidth, cssHeight) {
    const gl = this.gl;
    if (!src) {
      this.hasFeed = false;
      this.wake();
      return;
    }
    const pw = src instanceof HTMLCanvasElement ? src.width : src.naturalWidth;
    const ph = src instanceof HTMLCanvasElement ? src.height : src.naturalHeight;
    this.feedW = cssWidth || pw;
    this.feedH = cssHeight || ph;
    this.feedDpr = pw / this.feedW;
    gl.bindTexture(gl.TEXTURE_2D, this.feedTex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    this.g.texParams(gl.LINEAR_MIPMAP_LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.generateMipmap(gl.TEXTURE_2D);
    this.hasFeed = true;
    this.wake();
  }
  get maxTextureSize() {
    return this.g.maxTexture;
  }
  /* ---------------- sizing ---------------- */
  resize() {
    const r = this.host.getBoundingClientRect();
    this.W = Math.max(1, r.width);
    this.H = Math.max(1, r.height);
    this.refreshParams(true);
    const cfg = TIERS[this.tier];
    const dpr = Math.min(window.devicePixelRatio || 1, cfg.dprCap);
    this.canvas.width = Math.round(this.W * dpr);
    this.canvas.height = Math.round(this.H * dpr);
    this.alloc();
    this.collect(0);
    if (cfg.simHz) for (let i = 0; i < 40; i++) this.step(1 / 60);
    this.render();
    this.wake();
  }
  alloc() {
    if (this.st) {
      this.st.dispose();
      this.g.dispose(this.geo);
    }
    const cfg = TIERS[this.tier];
    const base = cfg.grid || 48;
    const ar = this.W / this.H;
    this.SW = Math.max(16, Math.round(ar < 1 ? base : base * ar));
    this.SH = Math.max(16, Math.round(ar < 1 ? base / ar : base));
    this.st = this.g.pingPong(this.SW, this.SH);
    this.geo = this.g.target(this.SW, this.SH);
  }
  refreshParams(force = false) {
    const now = performance.now();
    if (!force && now - this.lastParams < 250) return;
    this.lastParams = now;
    this.scene = readSceneParams(this.host);
    for (const s of this.order) s.params = readContainerParams(s.c.el);
    const t = chooseTier(this.scene.quality);
    if (t !== this.tier) {
      this.tier = t;
      if (!force) this.resize();
    }
  }
  /* ---------------- geometry ---------------- */
  collect(dt) {
    const hr = this.host.getBoundingClientRect();
    const df = densityFactor(this.scene.temperature);
    let moving = false;
    const b = buoyancy(GASES[this.scene.gas]);
    const th = (this.scene.tilt + this.deviceTilt) * Math.PI / 180;
    const sgn = b < 0 ? -1 : 1;
    const gx = Math.sin(th) * sgn, gy = -Math.cos(th) * sgn, gk = Math.abs(b) / SCALE_HEIGHT;
    const e = dt > 0 ? 1 - Math.exp(-dt * 5) : 1;
    const G = this.grav;
    if (Math.abs(gx - G.x) + Math.abs(gy - G.y) + Math.abs(gk - G.k) * SCALE_HEIGHT > 2e-3) moving = true;
    G.x += (gx - G.x) * e;
    G.y += (gy - G.y) * e;
    G.k += (gk - G.k) * e;
    const ang = Math.round(Math.atan2(-gx, -gy) * 180 / Math.PI), fade = Math.round(Math.min(3 / gk, 9999));
    if (ang !== this.cssAngle || fade !== this.cssFade) {
      this.cssAngle = ang;
      this.cssFade = fade;
      this.host.style.setProperty("--_aid-angle", ang + "deg");
      this.host.style.setProperty("--_aid-fade-unit", fade + "px");
    }
    this.n = 0;
    for (const s of this.order) {
      if (this.n >= MAX_CONTAINERS) break;
      const target = s.c.stateFactor() * s.params.pressure;
      const k = target > s.pv ? s.c.stateFactor() > 1 ? 14 : 4 : 2.5;
      s.pv += (target - s.pv) * (dt > 0 ? 1 - Math.exp(-dt * k) : 1);
      if (Math.abs(target - s.pv) > 3e-3) moving = true;
      const et = s.c.dashed() ? 0 : s.params.excitation;
      s.ev += (et - s.ev) * (dt > 0 ? 1 - Math.exp(-dt * 7) : 1);
      if (Math.abs(et - s.ev) > 3e-3) moving = true;
      s.wv += (s.params.weight - s.wv) * e;
      if (Math.abs(s.params.weight - s.wv) > 3e-3) moving = true;
      const r = s.c.el.getBoundingClientRect();
      if (r.width < 1 || r.bottom < hr.top || r.top > hr.bottom || r.right < hr.left || r.left > hr.right) continue;
      const empty = s.pv < 4e-3 && !s.c.dashed();
      if (empty) continue;
      const j = this.n * 4;
      const x0 = (r.left - hr.left) / this.W, x1 = (r.right - hr.left) / this.W;
      const y0 = 1 - (r.bottom - hr.top) / this.H, y1 = 1 - (r.top - hr.top) / this.H;
      this.uR[j] = x0;
      this.uR[j + 1] = y0;
      this.uR[j + 2] = x1;
      this.uR[j + 3] = y1;
      const rad = parseFloat(getComputedStyle(s.c.el).borderTopLeftRadius) || 0;
      this.uI[j] = s.pv * df;
      this.uI[j + 1] = s.params.profile;
      this.uI[j + 2] = rad;
      this.uE[j] = s.ev * Math.min(1, s.pv);
      this.uE[j + 1] = s.wv;
      this.uI[j + 3] = (s.c.dashed() ? -1 : 1) * s.params.membrane * Math.min(1, s.c.dashed() ? 1 : s.pv * 1.5);
      const mx = isNaN(s.lastX) ? 0 : x0 - s.lastX, my = isNaN(s.lastY) ? 0 : y0 - s.lastY;
      s.accX += mx;
      s.accY += my;
      this.uM[j] = s.accX;
      this.uM[j + 1] = s.accY;
      if (mx !== 0 || my !== 0) moving = true;
      s.lastX = x0;
      s.lastY = y0;
      this.n++;
    }
    return moving;
  }
  setContainers(p) {
    const gl = this.gl, u = p.u;
    if (u.uR) gl.uniform4fv(u.uR, this.uR);
    if (u.uI) gl.uniform4fv(u.uI, this.uI);
    if (u.uM) gl.uniform4fv(u.uM, this.uM);
    if (u.uE) gl.uniform4fv(u.uE, this.uE);
    if (u.uGv) gl.uniform3f(u.uGv, this.grav.x, this.grav.y, this.grav.k);
    if (u.uN) gl.uniform1i(u.uN, this.n);
    if (u.uPx) gl.uniform2f(u.uPx, this.W, this.H);
    if (u.texel) gl.uniform2f(u.texel, 1 / this.SW, 1 / this.SH);
  }
  use(p) {
    this.gl.useProgram(p.p);
    this.setContainers(p);
  }
  /* ---------------- simulation ---------------- */
  speed() {
    return thermalSpeed(GASES[this.scene.gas], this.scene.temperature);
  }
  step(dt) {
    const gl = this.gl, g = this.g, st = this.st, geo = this.geo;
    this.time += dt;
    this.use(this.P.geo);
    g.draw(geo);
    this.uM.fill(0);
    for (const s of this.order) {
      s.accX = 0;
      s.accY = 0;
    }
    const P = this.P.gas, u = P.u;
    this.use(P);
    gl.uniform1i(u.uS, g.bind(0, st.read.tex));
    gl.uniform1i(u.uG, g.bind(1, geo.tex));
    gl.uniform1i(u.uNz, g.bind(2, this.noise));
    const sp = this.speed();
    gl.uniform1f(u.dt, dt);
    const rs = responseSpeed(GASES[this.scene.gas]);
    gl.uniform1f(u.c2, 600 * rs);
    gl.uniform1f(u.gam, 4.2 * Math.sqrt(rs));
    gl.uniform1f(u.tAmp, this.scene.temperature * 16 * Math.min(sp, 3));
    gl.uniform1f(u.tSpd, 1.6 * sp);
    gl.uniform1f(u.t, this.time);
    gl.uniform1f(u.vmax, 38);
    gl.uniform1f(u.rk, 1.1);
    gl.uniform1f(u.diff, 0.16);
    gl.uniform4f(u.uPtr, this.ptr.x, this.ptr.y, this.ptr.str, this.ptr.down ? 20 : 26);
    gl.uniform2f(u.uPv, this.ptr.vx, -this.ptr.vy);
    g.draw(st.write);
    st.swap();
  }
  render() {
    if (!this.st) return;
    const gl = this.gl, g = this.g, P = this.P.render, u = P.u, sc = this.scene, gas = GASES[sc.gas];
    this.use(P);
    gl.uniform1i(u.uFeed, g.bind(0, this.feedTex));
    gl.uniform1i(u.uS, g.bind(1, this.st.read.tex));
    gl.uniform1i(u.uNz, g.bind(2, this.noise));
    gl.uniform1i(u.uGt, g.bind(3, this.geo.tex));
    gl.uniform1f(u.scr, this.hasFeed ? this.backdropScroll / this.feedH : 0);
    gl.uniform1f(u.vf, this.hasFeed ? this.H / this.feedH : 1);
    gl.uniform1f(u.amp, sc.refraction);
    gl.uniform1f(u.dn, deltaN(gas));
    gl.uniform1f(u.sig, 1.5 * scatterRelative(gas));
    gl.uniform1f(u.fdpr, this.feedDpr);
    gl.uniform1f(u.agit, sc.temperature);
    gl.uniform1f(u.glow, sc.glow);
    gl.uniform3f(u.emis, gas.emission[0] / 255, gas.emission[1] / 255, gas.emission[2] / 255);
    gl.uniform1f(u.smoke, sc.smoke);
    gl.uniform1f(u.reach, sc.lightReach);
    gl.uniform1f(u.flowT, this.flowT);
    gl.uniform1f(u.hasSim, TIERS[this.tier].simHz > 0 ? 1 : 0);
    gl.uniform1f(u.hasFeed, this.hasFeed ? 1 : 0);
    gl.uniform1f(u.alb, albedo(sc.smoke));
    gl.uniform1i(u.taps, TIERS[this.tier].lightTaps);
    gl.uniform1i(u.mode, this.view === "density" ? 1 : this.view === "light" ? 2 : this.view === "off" ? 3 : 0);
    const cs = getComputedStyle(this.host);
    const scene = rgb(cs.getPropertyValue("--aid-scene-light"), [246, 248, 251]);
    gl.uniform3f(u.scene, scene[0], scene[1], scene[2]);
    gl.uniform1f(u.smix, 0.3);
    const sp = sc.spectral;
    gl.uniform3f(u.tw, 1 + (RAYLEIGH[0] - 1) * sp, 1 + (RAYLEIGH[1] - 1) * sp, 1 + (RAYLEIGH[2] - 1) * sp);
    const mem = rgb(cs.getPropertyValue("--aid-membrane-color"), [24, 34, 52]);
    const ma = parseFloat(cs.getPropertyValue("--aid-membrane-alpha")) || 0.22;
    gl.uniform4f(u.mem, mem[0], mem[1], mem[2], ma);
    gl.uniform4f(u.uPtr, this.ptr.x, this.ptr.y, this.ptr.str, this.ptr.down ? 20 : 26);
    if (!this.hasFeed) {
      gl.clearColor(0, 0, 0, 0);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    g.draw(null);
  }
  /* ---------------- scheduling ---------------- */
  wake() {
    this.lastActive = performance.now() / 1e3;
    if (!this.raf && this.visible && this.onscreen && this.W > 1) {
      this.last = performance.now() / 1e3;
      this.raf = requestAnimationFrame(this.tick);
    }
  }
  report(state) {
    const now = performance.now();
    if (state !== "asleep" && now - this.lastReport < 500) return;
    this.lastReport = now;
    const avg = this.frames.length ? this.frames.reduce((a, b) => a + b, 0) / this.frames.length : 0;
    const err = this.gl.getError();
    if (err && err !== this.gl.CONTEXT_LOST_WEBGL) this.stats.error = "gl error 0x" + err.toString(16);
    const cfg = TIERS[this.tier];
    this.stats = {
      ...this.stats,
      tier: this.tier,
      grid: cfg.simHz ? `${this.SW}\xD7${this.SH}` : "none",
      simHz: cfg.simHz,
      fps: avg ? 1e3 / avg : 0,
      frameMs: avg,
      passes: this.g.passes,
      state
    };
    this.onStats?.(this.stats);
  }
  get currentStats() {
    return this.stats;
  }
  /** Evacuate every container; the regulators refill them. */
  purge() {
    for (const s of this.order) s.pv = 0;
    if (this.st) {
      const gl = this.gl;
      for (const t of [this.st.read, this.st.write]) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, t.fb);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    this.wake();
  }
  /* ---------------- input ---------------- */
  overGas(x, y) {
    for (let i = 0; i < this.n; i++) {
      const j = i * 4;
      if (this.uI[j] > 0 && x >= this.uR[j] && x <= this.uR[j + 2] && y >= this.uR[j + 1] && y <= this.uR[j + 3]) return true;
    }
    return false;
  }
  bindEvents() {
    const host = this.host, p = this.ptr;
    const track = (e, down) => {
      const r = host.getBoundingClientRect();
      const now = performance.now() / 1e3;
      if (p.lt) {
        const d = Math.max(now - p.lt, 1 / 240);
        p.vx = 0.6 * p.vx + 0.4 * ((e.clientX - p.lx) / d);
        p.vy = 0.6 * p.vy + 0.4 * ((e.clientY - p.ly) / d);
      }
      p.lx = e.clientX;
      p.ly = e.clientY;
      p.lt = now;
      p.x = (e.clientX - r.left) / this.W;
      p.y = 1 - (e.clientY - r.top) / this.H;
      if (down !== void 0) p.down = down;
      p.over = this.overGas(p.x, p.y) && (p.down || e.pointerType === "mouse");
      this.wake();
    };
    const on = (t, f, opt) => {
      host.addEventListener(t, f, opt);
      this.disposers.push(() => host.removeEventListener(t, f, opt));
    };
    on("pointermove", (e) => track(e), true);
    on("pointerdown", (e) => {
      p.lt = 0;
      track(e, true);
    }, true);
    on("pointerup", (e) => track(e, false), true);
    on("pointercancel", () => {
      p.down = false;
      p.over = false;
      this.wake();
    }, true);
    on("pointerleave", () => {
      p.down = false;
      p.over = false;
      p.lt = 0;
      this.wake();
    });
    const vis = () => {
      this.visible = !document.hidden;
      if (this.visible) this.wake();
    };
    document.addEventListener("visibilitychange", vis);
    this.disposers.push(() => document.removeEventListener("visibilitychange", vis));
    const io = new IntersectionObserver((es) => {
      this.onscreen = es[0].isIntersecting;
      if (this.onscreen) this.wake();
    });
    io.observe(host);
    this.disposers.push(() => io.disconnect());
    const lost = (e) => {
      e.preventDefault();
      this.stats.error = "GPU context lost";
      this.onStats?.(this.stats);
    };
    this.canvas.addEventListener("webglcontextlost", lost);
    this.disposers.push(() => this.canvas.removeEventListener("webglcontextlost", lost));
  }
  dispose() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.disposers.forEach((d) => d());
    if (this.st) {
      this.st.dispose();
      this.g.dispose(this.geo);
    }
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
};
function rgb(v, fallback) {
  const parts = v.split(",").map((x) => parseFloat(x));
  const ok = parts.length >= 3 && parts.slice(0, 3).every((x) => isFinite(x));
  return (ok ? parts.slice(0, 3) : fallback).map((x) => x / 255);
}

// src/components/scene.ts
var sceneCss = `
:host{display:block;position:relative;isolation:isolate;overflow:hidden}
canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
:host([backdrop="canvas"]) canvas{z-index:0}
:host(:not([backdrop="canvas"])) canvas{z-index:1}
.fail{position:absolute;inset:auto 8px 8px 8px;z-index:3;font:12px/1.5 system-ui,sans-serif;padding:6px 10px;border-radius:8px;background:rgba(0,0,0,.7);color:#fff}
`;
var AidScene = class extends HTMLElement {
  constructor() {
    super();
    this.engine = null;
    this.ro = null;
    this.pending = [];
    this.tiltOn = false;
    this.error = "";
    this.onTilt = (e) => {
      if (!this.engine || e.gamma == null) return;
      const g = Math.max(-80, Math.min(80, e.gamma));
      if (Math.abs(g - this.engine.deviceTilt) < 0.7) return;
      this.engine.deviceTilt = g;
      this.engine.wake();
    };
    const root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = sceneCss;
    this.canvas = document.createElement("canvas");
    this.canvas.setAttribute("aria-hidden", "true");
    this.canvas.part.add("gas");
    root.append(style, this.canvas, document.createElement("slot"));
  }
  static get observedAttributes() {
    return ["backdrop", "view", "tilt"];
  }
  connectedCallback() {
    if (this.engine || this.error) return;
    try {
      this.engine = new GasEngine(this, this.canvas, this.backdrop !== "canvas");
      this.engine.onStats = (s) => this.dispatchEvent(new CustomEvent("aid-stats", { detail: s }));
    } catch (e) {
      this.error = e.message;
      const f = document.createElement("div");
      f.className = "fail";
      f.textContent = "AID: " + this.error + " \u2014 the interface still works, without the gas.";
      this.shadowRoot.append(f);
      return;
    }
    this.ro = new ResizeObserver(() => this.engine?.resize());
    this.ro.observe(this);
    this.pending.splice(0).forEach((f) => f());
    if (document.fonts) document.fonts.ready.then(() => this.engine?.resize());
    if (this.getAttribute("tilt") === "device") this.listenTilt();
  }
  disconnectedCallback() {
    this.ro?.disconnect();
    if (this.tiltOn) {
      window.removeEventListener("deviceorientation", this.onTilt);
      this.tiltOn = false;
    }
    this.engine?.dispose();
    this.engine = null;
  }
  attributeChangedCallback(name) {
    if (name === "view" && this.engine) {
      this.engine.view = this.getAttribute("view") || "final";
      this.engine.render();
    }
    if (name === "tilt" && this.engine && this.getAttribute("tilt") === "device") this.listenTilt();
  }
  listenTilt() {
    if (this.tiltOn || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return;
    window.addEventListener("deviceorientation", this.onTilt);
    this.tiltOn = true;
  }
  /** Ask for motion access where the browser requires it (call from a tap), then follow the device. Resolves to whether it is on. */
  async enableDeviceTilt() {
    const D = window.DeviceOrientationEvent;
    if (!D) return false;
    try {
      if (typeof D.requestPermission === "function" && await D.requestPermission() !== "granted") return false;
    } catch {
      return false;
    }
    this.listenTilt();
    return this.tiltOn;
  }
  get backdrop() {
    return this.getAttribute("backdrop") === "canvas" ? "canvas" : "dom";
  }
  /** Run when the engine exists (children may connect before their scene). */
  whenReady(f) {
    if (this.engine) f();
    else if (!this.error) this.pending.push(f);
  }
  /** Hand over the content that sits behind the gas (backdrop="canvas"). Sizes are in CSS pixels. */
  setBackdrop(src, cssWidth, cssHeight) {
    this.whenReady(() => this.engine.setBackdrop(src, cssWidth, cssHeight));
  }
  /** Vertical scroll offset of the backdrop content, in CSS pixels. */
  set backdropScroll(y) {
    if (this.engine) {
      this.engine.backdropScroll = y;
      this.engine.wake();
    }
  }
  get backdropScroll() {
    return this.engine?.backdropScroll ?? 0;
  }
  get maxTextureSize() {
    return this.engine?.maxTextureSize ?? 4096;
  }
  get stats() {
    return this.engine?.currentStats ?? null;
  }
  /** Re-read the --aid-* tokens now (they are also polled every 250 ms). */
  refresh() {
    this.engine?.resize();
  }
  purge() {
    this.engine?.purge();
  }
  wake() {
    this.engine?.wake();
  }
};

// src/components/gas.ts
var gasCss = `
:host{position:relative;z-index:2;display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;-webkit-tap-highlight-color:transparent}
:host([hidden]){display:none}
:host::before{content:"";position:absolute;inset:0;border-radius:inherit;z-index:-1;pointer-events:none;
-webkit-backdrop-filter:var(--_aid-bf,none);backdrop-filter:var(--_aid-bf,none);
--_aid-fade:calc(var(--_aid-fade-unit,9999px) / max(var(--aid-weight,.6),.02));
-webkit-mask-image:linear-gradient(var(--_aid-angle,0deg),#000,rgba(0,0,0,.12) var(--_aid-fade));mask-image:linear-gradient(var(--_aid-angle,0deg),#000,rgba(0,0,0,.12) var(--_aid-fade))}
`;
var AidGas = class extends HTMLElement {
  constructor() {
    super();
    this.scene = null;
    this.pressed = false;
    /* focus styles may change --aid-excitation; the engine re-reads tokens when it wakes */
    this.onFocus = () => {
      this.scene?.wake();
    };
    this.onDown = () => {
      if (!this.interactive() || this.disabled) return;
      this.pressed = true;
      this.setAttribute("data-pressed", "");
      this.scene?.wake();
    };
    this.onUp = () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.removeAttribute("data-pressed");
      this.scene?.wake();
    };
    const root = this.attachShadow({ mode: "open" });
    const s = document.createElement("style");
    s.textContent = gasCss + this.extraCss();
    root.append(s, document.createElement("slot"));
  }
  static get observedAttributes() {
    return ["disabled"];
  }
  extraCss() {
    return "";
  }
  get el() {
    return this;
  }
  connectedCallback() {
    this.scene = this.closest("aid-scene");
    if (!this.scene) return;
    const attach = () => this.scene.whenReady(() => this.scene.engine.add(this));
    if (customElements.get("aid-scene")) attach();
    else customElements.whenDefined("aid-scene").then(attach);
    this.addEventListener("pointerdown", this.onDown);
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => this.addEventListener(t, this.onUp));
    ["focus", "blur"].forEach((t) => this.addEventListener(t, this.onFocus));
  }
  disconnectedCallback() {
    this.scene?.engine?.remove(this);
    this.removeEventListener("pointerdown", this.onDown);
    ["pointerup", "pointercancel", "pointerleave"].forEach((t) => this.removeEventListener(t, this.onUp));
    ["focus", "blur"].forEach((t) => this.removeEventListener(t, this.onFocus));
  }
  attributeChangedCallback() {
    this.scene?.wake();
  }
  get disabled() {
    return this.hasAttribute("disabled");
  }
  set disabled(v) {
    this.toggleAttribute("disabled", v);
  }
  interactive() {
    return false;
  }
  /** briefly compress, for keyboard activation */
  pulse() {
    this.pressed = true;
    this.scene?.wake();
    setTimeout(() => {
      this.pressed = false;
      this.scene?.wake();
    }, 180);
  }
  stateFactor() {
    if (this.disabled) return 0;
    return this.pressed ? 1.25 : 1;
  }
  dashed() {
    return this.disabled;
  }
};

// src/components/controls.ts
var AidButton = class extends AidGas {
  constructor() {
    super(...arguments);
    this.onKey = (e) => {
      if (this.disabled || e.key !== "Enter" && e.key !== " ") return;
      e.preventDefault();
      this.pulse();
      this.click();
    };
  }
  extraCss() {
    return ":host{cursor:pointer;user-select:none;-webkit-user-select:none;font:inherit;color:inherit;min-height:44px;padding:0 20px;border-radius:999px}:host([disabled]){cursor:not-allowed;opacity:.6}:host(:focus-visible){outline:2px solid currentColor;outline-offset:4px;--aid-excitation:.6}";
  }
  connectedCallback() {
    super.connectedCallback();
    if (!this.hasAttribute("role")) this.setAttribute("role", "button");
    this.syncDisabled();
    this.addEventListener("keydown", this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.onKey);
  }
  attributeChangedCallback() {
    this.syncDisabled();
    super.attributeChangedCallback();
  }
  syncDisabled() {
    if (this.disabled) {
      this.setAttribute("aria-disabled", "true");
      this.tabIndex = -1;
    } else {
      this.removeAttribute("aria-disabled");
      this.tabIndex = 0;
    }
  }
  interactive() {
    return true;
  }
  click() {
    if (this.disabled) return;
    super.click();
  }
};
var AidTabs = class extends AidGas {
  constructor() {
    super(...arguments);
    this.onClick = (e) => {
      const tab = e.target.closest("aid-tab");
      if (!tab || tab.disabled) return;
      const i = this.tabs.indexOf(tab);
      if (i < 0 || tab.selected) return;
      this.select(i);
      this.dispatchEvent(new CustomEvent("change", { detail: { index: i } }));
    };
  }
  extraCss() {
    return ":host{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;padding:5px;border-radius:30px}";
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "tablist");
    this.addEventListener("click", this.onClick);
    queueMicrotask(() => this.select(Math.max(0, this.tabs.findIndex((t) => t.selected))));
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("click", this.onClick);
  }
  get tabs() {
    return Array.from(this.querySelectorAll(":scope > aid-tab"));
  }
  select(i) {
    this.tabs.forEach((t, j) => t.selected = j === i);
    this.scene?.wake();
  }
};
var AidTab = class extends AidGas {
  constructor() {
    super(...arguments);
    this.onKey = (e) => {
      const bar = this.parentElement;
      if (!bar || !(bar instanceof AidTabs)) return;
      const tabs = bar.tabs, i = tabs.indexOf(this);
      let next = -1;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.pulse();
        this.click();
        return;
      }
      const rtl = getComputedStyle(this).direction === "rtl";
      if (e.key === "ArrowLeft") next = i + (rtl ? 1 : -1);
      if (e.key === "ArrowRight") next = i + (rtl ? -1 : 1);
      if (next < 0 || next >= tabs.length) return;
      e.preventDefault();
      tabs[next].focus();
      tabs[next].click();
    };
  }
  static get observedAttributes() {
    return ["disabled", "selected"];
  }
  extraCss() {
    return ":host{cursor:pointer;flex-direction:column;gap:1px;border-radius:25px;margin:0;user-select:none;-webkit-user-select:none}:host(:focus-visible){outline:2px solid currentColor;outline-offset:2px}";
  }
  connectedCallback() {
    super.connectedCallback();
    this.setAttribute("role", "tab");
    this.sync();
    this.addEventListener("keydown", this.onKey);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    this.removeEventListener("keydown", this.onKey);
  }
  attributeChangedCallback() {
    this.sync();
    super.attributeChangedCallback();
  }
  get selected() {
    return this.hasAttribute("selected");
  }
  set selected(v) {
    this.toggleAttribute("selected", v);
  }
  sync() {
    this.setAttribute("aria-selected", String(this.selected));
    this.tabIndex = this.selected ? 0 : -1;
  }
  interactive() {
    return true;
  }
  /** an unselected chamber is empty; it shows no wall */
  stateFactor() {
    if (this.disabled || !this.selected) return 0;
    return this.pressed ? 1.25 : 1;
  }
};

// src/index.ts
var GLOBAL_CSS = `
aid-scene:not([backdrop="canvas"]) :is(aid-gas,aid-button,aid-tabs){--_aid-bf:blur(calc(var(--aid-pressure,1) * 7px)) saturate(.92)}
aid-scene:not([backdrop="canvas"]) :is(aid-gas,aid-button,aid-tabs)[disabled]{--_aid-bf:none}
aid-scene:not([backdrop="canvas"]) aid-tab{--_aid-bf:none}
`;
function define() {
  if (typeof window === "undefined" || !window.customElements) return;
  if (!document.getElementById("aid-global-css")) {
    const s = document.createElement("style");
    s.id = "aid-global-css";
    s.textContent = GLOBAL_CSS;
    document.head.append(s);
  }
  const reg = [
    ["aid-scene", AidScene],
    ["aid-gas", AidGas],
    ["aid-button", AidButton],
    ["aid-tabs", AidTabs],
    ["aid-tab", AidTab]
  ];
  for (const [name, ctor] of reg) if (!customElements.get(name)) customElements.define(name, ctor);
}
define();
export {
  AIR_MOLAR_MASS,
  AIR_REFRACTIVITY,
  AidButton,
  AidGas,
  AidScene,
  AidTab,
  AidTabs,
  CONTAINER_DEFAULTS,
  GASES,
  GasEngine,
  SCENE_DEFAULTS,
  TIERS,
  albedo,
  buoyancy,
  chooseTier,
  define,
  deltaN,
  densityFactor,
  kelvin,
  readContainerParams,
  readSceneParams,
  responseSpeed,
  scatterRelative,
  thermalSpeed
};
//# sourceMappingURL=aid.js.map
