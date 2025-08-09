// examples/web/face-landmark-transfer/src/WebGLRenderer.ts

import {
  MeshGL,
  createQuadMesh,
  createFaceMesh,
  createMeshGL,
  updateMeshGL,
  drawMesh,
} from './mesh';
import { NormalizedLandmark } from './WebGLFaceWarp';
import Delaunator from 'delaunator';

// Shader for simple texture drawing (used for the video background)
const videoVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`;
const videoFragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
  }
`;

// Shaders for the face mesh with gradient blending
const faceVertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  attribute vec2 a_maskcoord; // target-space UV in [0,1]
  varying vec2 v_texcoord;
  varying vec2 v_maskcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
    v_maskcoord = a_maskcoord;
  }
`;
const faceFragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texcoord;
  varying vec2 v_maskcoord;
  uniform sampler2D u_texture;

  // Face blending uniforms
  uniform vec4 u_faceBounds; // [minX, minY, maxX, maxY] in normalized [0,1] space
  uniform float u_feather;   // Feather amount (e.g., 0.3 for a soft edge)
  uniform vec3 u_gain;       // Per-channel gain to match video
  uniform vec3 u_bias;       // Per-channel bias

  void main() {
    vec2 faceCenter = (u_faceBounds.xy + u_faceBounds.zw) / 2.0;
    vec2 faceSize = u_faceBounds.zw - u_faceBounds.xy;

    if (faceSize.x <= 0.0 || faceSize.y <= 0.0) {
      discard; // Don't draw anything if the face size is invalid
    }
    
    // Calculate normalized distance from the center in TARGET space using v_maskcoord
    vec2 dist_vec = (v_maskcoord - faceCenter) / (faceSize / 2.0);
    float dist = length(dist_vec);
    
    // Create a smooth alpha gradient from the edge inwards
    float alpha = 1.0 - smoothstep(1.0 - u_feather, 1.0, dist);
    
    vec4 color = texture2D(u_texture, v_texcoord);
    //color.rgb = clamp(color.rgb * u_gain + u_bias, 0.0, 1.0);
    
    // Apply the procedural mask to the texture's alpha
    gl_FragColor = vec4(color.rgb, color.a * alpha);
  }
`;

function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string) {
    function compile(type: number, src: string) {
        const shader = gl.createShader(type)!;
        gl.shaderSource(shader, src);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "");
        return shader;
    }
    const vs = compile(gl.VERTEX_SHADER, vSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fSrc);
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "");
    return program;
}

export class WebGLRenderer {
  
  private gl: WebGLRenderingContext;
  private videoProgram: WebGLProgram;
  private faceProgram: WebGLProgram;
  
  private videoPosLoc: number;
  private videoTexLoc: number;
  private videoTexUniformLoc: WebGLUniformLocation;
  
  private facePosLoc: number;
  private faceTexLoc: number;
  private faceMaskLoc: number;
  private faceTexUniformLoc: WebGLUniformLocation;
  private faceBoundsUniformLoc: WebGLUniformLocation;
  private faceFeatherUniformLoc: WebGLUniformLocation;
  private faceGainUniformLoc: WebGLUniformLocation;
  private faceBiasUniformLoc: WebGLUniformLocation;

  private faceTexture: WebGLTexture;
  private videoTexture: WebGLTexture;

  private quadMeshGL: MeshGL;
  private faceMeshGL: MeshGL;
  private faceMaskBuffer: WebGLBuffer;

  // Offscreen 2D canvas for color statistics
  private sampleCanvas: HTMLCanvasElement;
  private sampleCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
      const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
      if (!gl) throw new Error('WebGL not supported');
      this.gl = gl;

      // Enable alpha blending
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      // Create shader programs
      this.videoProgram = createProgram(gl, videoVertexShaderSource, videoFragmentShaderSource);
      this.faceProgram = createProgram(gl, faceVertexShaderSource, faceFragmentShaderSource);

      // Get locations for video program
      this.videoPosLoc = gl.getAttribLocation(this.videoProgram, 'a_position');
      this.videoTexLoc = gl.getAttribLocation(this.videoProgram, 'a_texcoord');
      this.videoTexUniformLoc = gl.getUniformLocation(this.videoProgram, 'u_texture')!;

      // Get locations for face program
      this.facePosLoc = gl.getAttribLocation(this.faceProgram, 'a_position');
      this.faceTexLoc = gl.getAttribLocation(this.faceProgram, 'a_texcoord');
      this.faceMaskLoc = gl.getAttribLocation(this.faceProgram, 'a_maskcoord');
      this.faceTexUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_texture')!;
      this.faceBoundsUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_faceBounds')!;
      this.faceFeatherUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_feather')!;
      this.faceGainUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_gain')!;
      this.faceBiasUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_bias')!;

      // Create textures and meshes
      this.faceTexture = gl.createTexture()!;
      this.videoTexture = gl.createTexture()!;
      this.quadMeshGL = createMeshGL(gl, createQuadMesh(gl));
      this.faceMeshGL = createMeshGL(gl, { positions: new Float32Array(), texcoords: new Float32Array(), drawMode: gl.TRIANGLES, vertexCount: 0 });
      this.faceMaskBuffer = gl.createBuffer()!;

      // Init offscreen canvas for sampling
      this.sampleCanvas = document.createElement('canvas');
      const ctx = this.sampleCanvas.getContext('2d');
      if (!ctx) throw new Error('Could not get 2D context');
      this.sampleCtx = ctx;
  }

  render(
      faceImage: HTMLImageElement,
      videoFrame: HTMLVideoElement | undefined,
      sourceLandmarks: NormalizedLandmark[],
      targetLandmarks: NormalizedLandmark[]
  ) {
      const gl = this.gl;
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);

      // Compute aspect cover parameters so video fills canvas while preserving aspect (cropping if needed)
      const canvasW = (gl.canvas as HTMLCanvasElement).width;
      const canvasH = (gl.canvas as HTMLCanvasElement).height;
      const videoW = videoFrame ? videoFrame.videoWidth : canvasW;
      const videoH = videoFrame ? videoFrame.videoHeight : canvasH;
      const videoAspect = videoW / videoH;
      const canvasAspect = canvasW / canvasH;
      // For cover: quad is full-screen, crop texcoords
      let uMin = 0.0, vMin = 0.0, uMax = 1.0, vMax = 1.0;
      if (videoAspect > canvasAspect) {
          // Video wider than canvas: crop width
          const scale = canvasAspect / videoAspect; // visible fraction in width
          const pad = (1.0 - scale) * 0.5;
          uMin = pad;
          uMax = 1.0 - pad;
      } else if (videoAspect < canvasAspect) {
          // Video taller than canvas: crop height
          const scale = videoAspect / canvasAspect; // visible fraction in height
          const pad = (1.0 - scale) * 0.5;
          vMin = pad;
          vMax = 1.0 - pad;
      }

      // Update textures from source image and video
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.faceTexture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, faceImage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

      if (videoFrame) {
          gl.activeTexture(gl.TEXTURE1);
          gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoFrame);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      }

      // --- 1. Draw video frame as background (full-screen, cropped texcoords) ---
      if (videoFrame) {
          // Full-screen quad
          const quadPositions = new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
             1,  1,
          ]);
          // Texcoords cropped to maintain cover behaviour
          const quadTexcoords = new Float32Array([
            uMin, vMax,
            uMax, vMax,
            uMin, vMin,
            uMax, vMin,
          ]);
          updateMeshGL(gl, this.quadMeshGL, {
            positions: quadPositions,
            texcoords: quadTexcoords,
            drawMode: gl.TRIANGLE_STRIP,
            vertexCount: 4,
          });
          gl.useProgram(this.videoProgram);
          gl.uniform1i(this.videoTexUniformLoc, 1); // Use texture unit 1 for video
          drawMesh(gl, this.quadMeshGL, this.videoPosLoc, this.videoTexLoc);
      }

      // --- 2. Draw blended face mesh on top ---
      gl.useProgram(this.faceProgram);

      // We'll compute mask bounds in mapped target space below

      // Update and draw the face mesh geometry
      const srcPts = sourceLandmarks.map(p => [p.x, p.y] as [number, number]);
      const delaunay = Delaunator.from(srcPts);
      // Map target points through the same crop so overlay aligns with covered video
      const mappedTgtPts: [number, number][] = targetLandmarks.map(p => {
        const u = (p.x - uMin) / (uMax - uMin);
        const v = (p.y - vMin) / (vMax - vMin);
        return [u, v];
      });
      const triangles = delaunay.triangles as Uint32Array;
      const faceMesh = createFaceMesh(gl, triangles, srcPts, mappedTgtPts);
      updateMeshGL(gl, this.faceMeshGL, faceMesh);

      // Build maskcoords in target space following triangle order
      const maskcoords: number[] = [];
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (let i = 0; i < triangles.length; i += 3) {
        const i0 = triangles[i], i1 = triangles[i+1], i2 = triangles[i+2];
        const [u0,v0] = mappedTgtPts[i0];
        const [u1,v1] = mappedTgtPts[i1];
        const [u2,v2] = mappedTgtPts[i2];
        maskcoords.push(u0, v0, u1, v1, u2, v2);
        minX = Math.min(minX, u0, u1, u2);
        minY = Math.min(minY, v0, v1, v2);
        maxX = Math.max(maxX, u0, u1, u2);
        maxY = Math.max(maxY, v0, v1, v2);
      }
      // Slightly inset bounds to reduce over-feathering at edges
      const inset = 0.005;
      minX = Math.max(0.0, minX + inset);
      minY = Math.max(0.0, minY + inset);
      maxX = Math.min(1.0, maxX - inset);
      maxY = Math.min(1.0, maxY - inset);
      gl.uniform4f(this.faceBoundsUniformLoc, minX, minY, maxX, maxY);
      gl.uniform1f(this.faceFeatherUniformLoc, 0.3);

      // --- Automatic color balance between source face and video target ---
      // Compute source face bounds in source image pixel space
      let sMinX = 1, sMinY = 1, sMaxX = 0, sMaxY = 0;
      for (const [sx, sy] of srcPts) {
        sMinX = Math.min(sMinX, sx); sMinY = Math.min(sMinY, sy);
        sMaxX = Math.max(sMaxX, sx); sMaxY = Math.max(sMaxY, sy);
      }
      const srcImgW = (faceImage as HTMLImageElement).naturalWidth || faceImage.width;
      const srcImgH = (faceImage as HTMLImageElement).naturalHeight || faceImage.height;
      const srcRect = {
        x: Math.max(0, Math.floor(sMinX * srcImgW)),
        y: Math.max(0, Math.floor(sMinY * srcImgH)),
        w: Math.max(1, Math.floor((sMaxX - sMinX) * srcImgW)),
        h: Math.max(1, Math.floor((sMaxY - sMinY) * srcImgH)),
      };

      // Compute target bounds in video pixel space using uncropped coords
      // mappedTgtPts are in [0,1] of cropped space; convert back to uncropped u,v in [0,1]
      let tMinU = 1, tMinV = 1, tMaxU = 0, tMaxV = 0;
      for (const [mu, mv] of mappedTgtPts) {
        const u = uMin + mu * (uMax - uMin);
        const v = vMin + mv * (vMax - vMin);
        tMinU = Math.min(tMinU, u); tMinV = Math.min(tMinV, v);
        tMaxU = Math.max(tMaxU, u); tMaxV = Math.max(tMaxV, v);
      }
      const tgtRect = {
        x: Math.max(0, Math.floor(tMinU * videoW)),
        y: Math.max(0, Math.floor(tMinV * videoH)),
        w: Math.max(1, Math.floor((tMaxU - tMinU) * videoW)),
        h: Math.max(1, Math.floor((tMaxV - tMinV) * videoH)),
      };

      const { mean: srcMean, std: srcStd } = this.computeRegionStats(faceImage, srcRect.x, srcRect.y, srcRect.w, srcRect.h, 4);
      const { mean: tgtMean, std: tgtStd } = videoFrame
        ? this.computeRegionStats(videoFrame, tgtRect.x, tgtRect.y, tgtRect.w, tgtRect.h, 4)
        : { mean: [1,1,1] as [number,number,number], std: [1,1,1] as [number,number,number] };

      const eps = 1e-3;
      const gainR = (tgtStd[0] > eps && srcStd[0] > eps) ? (tgtStd[0] / srcStd[0]) : 1.0;
      const gainG = (tgtStd[1] > eps && srcStd[1] > eps) ? (tgtStd[1] / srcStd[1]) : 1.0;
      const gainB = (tgtStd[2] > eps && srcStd[2] > eps) ? (tgtStd[2] / srcStd[2]) : 1.0;
      const biasR = tgtMean[0] - gainR * srcMean[0];
      const biasG = tgtMean[1] - gainG * srcMean[1];
      const biasB = tgtMean[2] - gainB * srcMean[2];
      gl.uniform3f(this.faceGainUniformLoc, gainR, gainG, gainB);
      gl.uniform3f(this.faceBiasUniformLoc, biasR, biasG, biasB);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.faceMaskBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(maskcoords), gl.DYNAMIC_DRAW);
      gl.enableVertexAttribArray(this.faceMaskLoc);
      gl.vertexAttribPointer(this.faceMaskLoc, 2, gl.FLOAT, false, 0, 0);

      gl.uniform1i(this.faceTexUniformLoc, 0); // Use texture unit 0 for the face
      drawMesh(gl, this.faceMeshGL, this.facePosLoc, this.faceTexLoc);
  }


  destroy() {
    const gl = this.gl;
    gl.deleteProgram(this.faceProgram);
    gl.deleteProgram(this.videoProgram);
    gl.deleteTexture(this.faceTexture);
    gl.deleteTexture(this.videoTexture);
    gl.deleteBuffer(this.quadMeshGL.positionBuffer);
    gl.deleteBuffer(this.quadMeshGL.texcoordBuffer);
    gl.deleteBuffer(this.faceMeshGL.positionBuffer);
    gl.deleteBuffer(this.faceMeshGL.texcoordBuffer);
    gl.deleteBuffer(this.faceMaskBuffer);
  }

  private computeRegionStats(
    source: CanvasImageSource,
    sx: number,
    sy: number,
    sw: number,
    sh: number,
    step: number
  ): { mean: [number, number, number]; std: [number, number, number] } {
    // Resize offscreen to region size (clamped to reasonable max)
    const maxSide = 256;
    const scale = Math.min(1, maxSide / Math.max(sw, sh));
    const dw = Math.max(1, Math.floor(sw * scale));
    const dh = Math.max(1, Math.floor(sh * scale));
    this.sampleCanvas.width = dw;
    this.sampleCanvas.height = dh;
    // Draw region
    this.sampleCtx.clearRect(0, 0, dw, dh);
    // drawImage(source, sx, sy, sw, sh, dx, dy, dw, dh)
    this.sampleCtx.drawImage(source as any, sx, sy, sw, sh, 0, 0, dw, dh);
    const img = this.sampleCtx.getImageData(0, 0, dw, dh);
    const data = img.data;
    let sumR = 0, sumG = 0, sumB = 0, n = 0;
    const stride = Math.max(1, step);
    for (let y = 0; y < dh; y += stride) {
      for (let x = 0; x < dw; x += stride) {
        const idx = (y * dw + x) * 4;
        sumR += data[idx] / 255;
        sumG += data[idx + 1] / 255;
        sumB += data[idx + 2] / 255;
        n++;
      }
    }
    const meanR = sumR / n, meanG = sumG / n, meanB = sumB / n;
    let varR = 0, varG = 0, varB = 0;
    for (let y = 0; y < dh; y += stride) {
      for (let x = 0; x < dw; x += stride) {
        const idx = (y * dw + x) * 4;
        const r = data[idx] / 255 - meanR;
        const g = data[idx + 1] / 255 - meanG;
        const b = data[idx + 2] / 255 - meanB;
        varR += r * r; varG += g * g; varB += b * b;
      }
    }
    const denom = Math.max(1, n - 1);
    const stdR = Math.sqrt(varR / denom);
    const stdG = Math.sqrt(varG / denom);
    const stdB = Math.sqrt(varB / denom);
    return { mean: [meanR, meanG, meanB], std: [stdR, stdG, stdB] };
  }
}