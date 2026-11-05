/**
 * GLSL for the AID gas material.
 *
 * Passes per simulation step: geo (container mask, target density, motion) → gas (one explicit
 * compressible step). Per frame: render. No pressure solve, so a step is one full-screen pass.
 */
export const MAX_CONTAINERS = 16;

export const VERTEX = `#version 300 es
in vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;
void main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}`;

const HEAD = `#version 300 es
precision highp float;precision highp sampler2D;
in vec2 vUv,vL,vR,vT,vB;out vec4 o;
`;

/* Containers: uR = rect in uv (x0,y0,x1,y1); uI = (target density, profile, corner radius px, membrane alpha; negative = dashed). */
const CONTAINERS = `
uniform vec4 uR[${MAX_CONTAINERS}];uniform vec4 uI[${MAX_CONTAINERS}];uniform int uN;uniform vec2 uPx;
float sdRR(vec2 p,vec2 b,float r){vec2 q=abs(p)-b+r;return length(max(q,0.))+min(max(q.x,q.y),0.)-r;}
float elD(int i,vec2 uv){vec4 R=uR[i];vec2 lo=R.xy*uPx,hi=R.zw*uPx,hb=(hi-lo)*.5;return sdRR(uv*uPx-(lo+hi)*.5,hb,min(uI[i].z,min(hb.x,hb.y)));}
float elT(int i,float d){vec2 hb=(uR[i].zw-uR[i].xy)*uPx*.5;float w=max(min(hb.x,hb.y)*uI[i].y,1.);float x=clamp(-d/w,0.,1.);return x*x*(3.-2.*x);}
`;

/** x = inside mask, y = target density, zw = container motion since last step (uv) */
export const GEO = HEAD + CONTAINERS + `
uniform vec4 uM[${MAX_CONTAINERS}];
void main(){float m=0.,g=0.;vec2 mv=vec2(0.);
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float k=1.-smoothstep(-1.,1.,elD(i,vUv));if(k>m)mv=uM[i].xy;m=max(m,k);g+=k*uI[i].x;}
 o=vec4(m,g,mv);}`;

/** Compressible isothermal gas, heavily damped (no oscillation): p = c²ρ, continuity, a finger force, thermal stirring. */
export const GAS = HEAD + `
uniform sampler2D uS,uG,uNz;uniform vec2 texel,uPx;
uniform float dt,c2,gam,tAmp,tSpd,t,vmax,rk,diff;uniform vec4 uPtr;uniform vec2 uPv;
vec4 nb(vec2 p,vec4 C){return texture(uG,p).x>.5?texture(uS,p):vec4(C.x,0.,0.,0.);}
#define PSI(p) (texture(uNz,(p)+vec2(.031,.017)*tt).x+.5*texture(uNz,(p)*2.1-vec2(.023,-.029)*tt+.5).x)
void main(){
 vec4 G=texture(uG,vUv);if(G.x<.02){o=vec4(0.);return;}
 vec4 C=texture(uS,vUv);
 vec2 p=vUv-dt*C.yz*texel-G.zw;                              /* moving containers carry their gas */
 vec4 A=texture(uG,p).x>.5?texture(uS,p):C;float r=A.x;vec2 v=A.yz;
 vec4 L=nb(vL,C),R=nb(vR,C),T=nb(vT,C),B=nb(vB,C);
 v-=dt*c2*vec2(R.x-L.x,T.x-B.x)*.5/max(r,.25);               /* pressure gradient, p = c²ρ */
 r-=dt*r*.5*(R.y-L.y+T.z-B.z);                               /* continuity */
 r+=diff*(L.x+R.x+T.x+B.x-4.*C.x);v+=diff*(L.yz+R.yz+T.yz+B.yz-4.*C.yz);   /* diffusion + viscosity */
 vec2 d=(vUv-uPtr.xy)*uPx;float rr=length(d),k=exp(-rr*rr/(uPtr.w*uPtr.w));float cpp=1./(uPx.x*texel.x);
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
uniform sampler2D uFeed,uS,uNz;
uniform float scr,vf,amp,dn,sig,lod,smoke,reach,flowT,smix,hasSim,hasFeed,alb;
uniform vec3 scene,tw;uniform vec4 mem,uPtr;uniform vec2 ldir;uniform int mode,taps;
vec2 fuv(vec2 s){float fy=scr+(1.-s.y)*vf;return vec2(clamp(s.x,0.,1.),1.-clamp(fy,0.,1.));}
vec3 feed(vec2 s){return texture(uFeed,fuv(s)).rgb;}
float fbm(vec2 p){return texture(uNz,p).x*.55+texture(uNz,p*1.97+.37).x*.3+texture(uNz,p*3.9+.71).x*.15;}
float luma(vec3 c){return dot(c,vec3(.2126,.7152,.0722));}
float dens(vec2 uv){
 float th=0.,tg=0.;
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float d=elD(i,uv);if(d>0.)continue;th=max(th,elT(i,d));tg+=uI[i].x;}
 if(th<=0.)return 0.;
 float r;vec2 fl=vec2(0.);
 if(hasSim>0.){vec4 s=texture(uS,uv);r=s.x;fl=s.yz*.0009;}
 else{vec2 d=(uv-uPtr.xy)*uPx;r=tg*(1.-min(uPtr.z/600.,.7)*exp(-dot(d,d)/(uPtr.w*uPtr.w)));}
 float det=fbm(uv*uPx/520.+vec2(.006,-.011)*flowT-fl);
 return th*r*mix(1.,smoothstep(.2,.85,det)*1.7,smoke);}
void main(){
 bool near=false;float memv=0.;
 for(int i=0;i<${MAX_CONTAINERS};i++){if(i>=uN)break;float d=elD(i,vUv);if(d<1.)near=true;float a=abs(uI[i].w);
  if(a>0.){float ring=1.-smoothstep(0.,1.1,abs(d+.6));if(uI[i].w<0.)ring*=step(.5,fract((vUv.x*uPx.x+vUv.y*uPx.y)/7.));memv=max(memv,ring*a);}}
 if(!near){if(hasFeed>0.)o=vec4(mode==0?feed(vUv):vec3(.04),1.);else o=vec4(0.);return;}
 vec2 px=1.5/uPx;float D=dens(vUv);
 float gx=dens(vUv+vec2(px.x,0.))-dens(vUv-vec2(px.x,0.)),gy=dens(vUv+vec2(0.,px.y))-dens(vUv-vec2(0.,px.y));
 vec2 off=clamp(vec2(gx,gy)*dn*1e-6*amp,vec2(-.03),vec2(.03));
 vec3 nrm=normalize(vec3(-gx*7.,-gy*7.,1.));float shade=.7+.3*dot(nrm,normalize(vec3(ldir,.8)));
 vec3 Tt=exp(-sig*D*tw);
 vec3 Lc=scene;
 if(hasFeed>0.){
  /* content is a light source: gather from a disc of radius reach; bright, saturated colours emit most */
  Lc=vec3(0.);float W=0.;vec2 rp=reach/uPx;
  for(int k=0;k<13;k++){if(k>=taps)break;float a=float(k)*2.39996,rad=k==0?0.:sqrt(float(k)/12.);
   vec3 c=textureLod(uFeed,fuv(vUv+vec2(cos(a),sin(a))*rad*rp),lod).rgb;
   float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),sat=mx>0.?(mx-mn)/mx:0.;
   float w=(.15+luma(c))*(.35+2.6*sat)/(1.+rad*rad*1.5);Lc+=c*w;W+=w;}
  Lc/=max(W,1e-4);}
 vec3 Lin=mix(Lc,scene,smix)*shade;
 if(hasFeed>0.){
  vec3 col=feed(vUv+off);
  vec3 c=col*Tt+Lin*alb*(1.-Tt);
  c=mix(c,mem.rgb,memv*mem.a);
  if(mode==1)c=mix(vec3(.04),vec3(.78,.86,1.),clamp(D/1.6,0.,1.))+memv*.2;
  if(mode==2)c=Lin*(1.-Tt)*1.6+memv*.15;
  if(any(isnan(c)))c=feed(vUv);
  o=vec4(clamp(c,0.,1.),1.);
 }else{
  /* DOM backdrop: the page behind is not readable by WebGL, so only the gas itself is drawn (premultiplied) */
  float a=clamp(1.-dot(Tt,vec3(.3333)),0.,1.);
  vec3 c=Lin*alb*a;float aa=a;
  float m=memv*mem.a;c=c*(1.-m)+mem.rgb*m;aa=aa*(1.-m)+m;
  if(any(isnan(c))){c=vec3(0.);aa=0.;}
  o=vec4(clamp(c,0.,1.),clamp(aa,0.,1.));
 }}`;
