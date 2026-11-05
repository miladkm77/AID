/**
 * GLSL for the AID gas material.
 *
 * Passes per simulation step: geo (container mask, target density, motion) → gas (one explicit
 * compressible step). Per frame: render. No pressure solve, so a step is one full-screen pass.
 */
export declare const MAX_CONTAINERS = 16;
export declare const VERTEX = "#version 300 es\nin vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;\nvoid main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}";
/** x = inside mask, y = target density, zw = container motion since last step (uv) */
export declare const GEO: string;
/** Compressible isothermal gas, heavily damped (no oscillation): p = c²ρ, continuity, a finger force, thermal stirring. */
export declare const GAS: string;
export declare const RENDER: string;
