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
export declare const MAX_CONTAINERS = 16;
export declare const VERTEX = "#version 300 es\nin vec2 aPos;uniform vec2 texel;out vec2 vUv,vL,vR,vT,vB;\nvoid main(){vUv=aPos*.5+.5;vL=vUv-vec2(texel.x,0.);vR=vUv+vec2(texel.x,0.);vT=vUv+vec2(0.,texel.y);vB=vUv-vec2(0.,texel.y);gl_Position=vec4(aPos,0.,1.);}";
/** x = inside mask, y = target density, zw = container motion since last step (uv) */
export declare const GEO: string;
/**
 * Compressible isothermal gas, heavily damped (no oscillation): p = c²ρ, continuity, weight, a finger force, thermal stirring.
 * Pressure and weight are applied together as −c²∇ln(ρ/ρ_eq), where ρ_eq is the settled profile the container is
 * regulated to. The settled state is then an exact equilibrium of the scheme, including at the walls.
 */
export declare const GAS: string;
export declare const RENDER: string;
