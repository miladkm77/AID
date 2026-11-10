/**
 * GLSL for the AID gas material.
 *
 * Passes per simulation step: geo (container mask, target density, motion) → gas (one explicit
 * compressible step). Per frame: render. No pressure solve, so a step is one full-screen pass.
 *
 * The render pass treats the gas as a volume, not a lens:
 *   - the background is veiled (extinction) and replaced by light the gas gathers from the content around it,
 *   - refraction acts only on density *disturbances* (a finger, thermal shimmer), drawn as displacement and
 *     as a shadowgraph (brightness ∝ −∇²n); a container at rest does not bend the background at its wall,
 *   - gas heavier than air pools along gravity, lighter gas rises,
 *   - an excited container emits the discharge colour of its gas.
 */
export const MAX_CONTAINERS = 16;

export const VERTEX = `#version 300 es
in vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;
void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}`;

const HEAD = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 vUv,vL,vR,vT,vB;out vec4 o;
`;

/* Containers: uR = rect in uv (x0,y0,x1,y1); uI = (target density, edge softness, corner radius px, membrane alpha; negative = dashed);
   uE = (excitation, weight, -, -). uGv = (direction the gas settles toward, in uv space with y up; 1 / scale height in px at weight 1). */
const CONTAINERS = `
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

/** x = inside mask, y = target density, zw = container motion since last step (uv) */
export const GEO = HEAD + CONTAINERS + `
uniform vec4 uM[${MAX_CONTAINERS}];
void main(){float m=0.,g=0.;vec2 mv=vec2(0.);
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float k=1.-smoothstep(-1.,1.,elD(i,vUv));if(k>m)mv=uM[i].xy;m=max(m,k);g+=k*uI[i].x*elS(i,vUv);}
 o=vec4(m,g,mv);}`;

/**
 * Compressible isothermal gas, heavily damped (no oscillation): p = c²ρ, continuity, weight, a finger force, thermal stirring.
 * Pressure and weight are applied together as −c²∇ln(ρ/ρ_eq), where ρ_eq is the settled profile the container is
 * regulated to. The settled state is then an exact equilibrium of the scheme, including at the walls.
 */
export const GAS = HEAD + `
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

export const RENDER = HEAD + CONTAINERS + `
uniform sampler2D uFeed,uS,uNz,uGt;
uniform float scr,vf,amp,dn,sig,smoke,reach,flowT,smix,hasSim,hasFeed,alb,agit,glow,fdpr;
uniform vec3 scene,tw,emis;uniform vec4 mem,uPtr;uniform int mode,taps;
vec2 fuv(vec2 s){float fy=scr+(1.-s.y)*vf;return vec2(clamp(s.x,0.,1.),1.-clamp(fy,0.,1.));}
vec3 feed(vec2 s){return texture(uFeed,fuv(s)).rgb;}
float fbm(vec2 p){return texture(uNz,p).x*.55+texture(uNz,p*1.97+.37).x*.3+texture(uNz,p*3.9+.71).x*.15;}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
/* The simulation supplies how far the gas is from its settled state, as the ratio ρ/ρ_eq (1 at rest). The settled
   profile itself is evaluated per pixel from the container shapes, so its edges stay sharp at any grid size. */
float ratio(vec2 uv){
 if(hasSim>0.){vec4 G=texture(uGt,uv);return G.x>.02?clamp(texture(uS,uv).x/max(G.y,.03),0.,4.):1.;}
 vec2 d=(uv-uPtr.xy)*uPx;return 1.-min(uPtr.z/600.,.7)*exp(-dot(d,d)/(uPtr.w*uPtr.w));}
void main(){
 bool near=false;float memv=0.,th=0.,ex=0.,wall=1e4,tg=0.;
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float d=elD(i,vUv);if(d<1.)near=true;float a=abs(uI[i].w);
  wall=min(wall,abs(d));if(d<1.)tg+=(1.-smoothstep(-1.,1.,d))*uI[i].x*elS(i,vUv);if(d<=0.){th=max(th,elT(i,d));ex=max(ex,uE[i].x);}
  if(a>0.){float ring=1.-smoothstep(0.,1.9,abs(d+.9));   /* a soft wall, not a hairline */
   if(uI[i].w<0.)ring*=step(.5,fract((vUv.x*uPx.x+vUv.y*uPx.y)/7.));memv=max(memv,ring*a);}}
 if(!near||mode==3){if(hasFeed>0.)o=vec4((mode==0||mode==3)?feed(vUv):vec3(.04),1.);else o=vec4(0.);return;}
 float s0=ratio(vUv),rho=tg*s0;
 /* only the disturbance (density minus the settled profile) refracts: it is zero at rest, so a wall never acts as a lens */
 float dl=tg*(ratio(vL)-1.),dr=tg*(ratio(vR)-1.),dT=tg*(ratio(vT)-1.),dB=tg*(ratio(vB)-1.),d0=tg*(s0-1.);
 float inner=smoothstep(1.,3.,wall/(uPx.x*(vR.x-vUv.x)));     /* the cells at a wall are held, not simulated */
 vec2 grad=vec2(dr-dl,dT-dB)*.5*inner;
 float lap=(dl+dr+dT+dB-4.*d0)*inner;
 vec2 fl=hasSim>0.?texture(uS,vUv).yz*.0009:vec2(0.);
 float det=fbm(vUv*uPx/520.+vec2(.006,-.011)*flowT-fl);
 /* wisps: where the gas is thin only the peaks of the texture show; where it has pooled it is continuous */
 /* the edge of the layer billows on the two coarse octaves only; fine noise there reads as a row of beads */
 vec2 bp=vUv*uPx/640.+vec2(.006,-.011)*flowT-fl;float bil=texture(uNz,bp).x*.68+texture(uNz,bp*1.97+.37).x*.32;
 float D=th*rho*mix(1.,smoothstep(.28,.74,bil+.4*(rho-1.))*1.6,smoke);
 vec2 off=grad*dn*1e-6*amp*2.4;
 vec2 q=vUv*uPx/230.+vec2(.05,.11)*flowT;float n0=texture(uNz,q).x;
 off+=vec2(n0-texture(uNz,q+vec2(.02,0.)).x,n0-texture(uNz,q+vec2(0.,.02)).x)*D*agit*dn*1e-6*amp*.45;   /* thermal shimmer */
 off=clamp(off,vec2(-.03),vec2(.03));
 float sg=clamp(1.-lap*dn*amp*2.5e-5,.8,1.25);                 /* shadowgraph: brightness follows −∇²n */
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
  /* what is seen through the gas loses detail with depth: forward scattering spreads it (a mip blur ∝ density) */
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
