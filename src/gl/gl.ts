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

export class GL {
  readonly gl: WebGL2RenderingContext;
  private vs: WebGLShader;
  passes = 0;

  constructor(gl: WebGL2RenderingContext, vertexSource: string) {
    this.gl = gl;
    gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float');
    this.vs = this.shader(gl.VERTEX_SHADER, vertexSource);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  }

  get maxTexture(): number {
    return this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE) as number;
  }

  private shader(type: number, src: string): WebGLShader {
    const gl = this.gl;
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'shader compile failed');
    return s;
  }

  program(fragmentSource: string): Program {
    const gl = this.gl;
    const p = gl.createProgram()!;
    gl.attachShader(p, this.vs);
    gl.attachShader(p, this.shader(gl.FRAGMENT_SHADER, fragmentSource));
    gl.bindAttribLocation(p, 0, 'aPos');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'program link failed');
    const u: Program['u'] = {};
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < n; i++) {
      const name = gl.getActiveUniform(p, i)!.name.replace('[0]', '');
      u[name] = gl.getUniformLocation(p, name);
    }
    return { p, u };
  }

  texParams(min: number, wrap: number): void {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, min);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
  }

  target(w: number, h: number): Target {
    const gl = this.gl;
    const tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    this.texParams(gl.LINEAR, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, w, h, 0, gl.RGBA, gl.HALF_FLOAT, null);
    const fb = gl.createFramebuffer()!;
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) throw new Error('half-float render targets are not supported');
    gl.viewport(0, 0, w, h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    return { tex, fb, w, h };
  }

  pingPong(w: number, h: number): PingPong {
    let a = this.target(w, h);
    let b = this.target(w, h);
    const self = this;
    return {
      get read() { return a; },
      get write() { return b; },
      swap() { const t = a; a = b; b = t; },
      dispose() { self.dispose(a); self.dispose(b); },
    };
  }

  dispose(t: Target): void {
    this.gl.deleteTexture(t.tex);
    this.gl.deleteFramebuffer(t.fb);
  }

  bind(unit: number, tex: WebGLTexture): number {
    const gl = this.gl;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    return unit;
  }

  draw(target: Target | null): void {
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
  noiseTexture(n = 128): WebGLTexture {
    const gl = this.gl;
    let f = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) f[i] = Math.random();
    for (let pass = 0; pass < 4; pass++) {
      const g = new Float32Array(n * n);
      for (let y = 0; y < n; y++)
        for (let x = 0; x < n; x++) {
          let s = 0;
          for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) s += f[((y + dy + n) % n) * n + ((x + dx + n) % n)];
          g[y * n + x] = s / 9;
        }
      f = g;
    }
    let lo = 1, hi = 0;
    for (let i = 0; i < n * n; i++) { lo = Math.min(lo, f[i]); hi = Math.max(hi, f[i]); }
    const a = new Uint8Array(n * n * 4);
    for (let i = 0; i < n * n; i++) {
      const v = ((f[i] - lo) / (hi - lo)) * 255 | 0;
      a[i * 4] = a[i * 4 + 1] = a[i * 4 + 2] = v;
      a[i * 4 + 3] = 255;
    }
    const t = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, t);
    this.texParams(gl.LINEAR, gl.REPEAT);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, n, n, 0, gl.RGBA, gl.UNSIGNED_BYTE, a);
    return t;
  }
}
