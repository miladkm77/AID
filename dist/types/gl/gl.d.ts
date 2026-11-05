/** Minimal WebGL2 helpers: programs with uniform lookup, half-float render targets, a full-screen quad. */
export interface Program {
    p: WebGLProgram;
    u: Record<string, WebGLUniformLocation | null>;
}
export interface Target {
    tex: WebGLTexture;
    fb: WebGLFramebuffer;
    w: number;
    h: number;
}
export interface PingPong {
    readonly read: Target;
    readonly write: Target;
    swap(): void;
    dispose(): void;
}
export declare class GL {
    readonly gl: WebGL2RenderingContext;
    private vs;
    passes: number;
    constructor(gl: WebGL2RenderingContext, vertexSource: string);
    get maxTexture(): number;
    private shader;
    program(fragmentSource: string): Program;
    texParams(min: number, wrap: number): void;
    target(w: number, h: number): Target;
    pingPong(w: number, h: number): PingPong;
    dispose(t: Target): void;
    bind(unit: number, tex: WebGLTexture): number;
    draw(target: Target | null): void;
    /** Smooth, tileable value noise used for smoke texture and thermal agitation. */
    noiseTexture(n?: number): WebGLTexture;
}
