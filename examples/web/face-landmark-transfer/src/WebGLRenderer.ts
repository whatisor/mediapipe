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
const faceVertexShaderSource = videoVertexShaderSource; // Vertex shader is the same
const faceFragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;

  // Face blending uniforms
  uniform vec4 u_faceBounds; // [minX, minY, maxX, maxY] in normalized [0,1] space
  uniform float u_feather;   // Feather amount (e.g., 0.3 for a soft edge)

  void main() {
    vec2 faceCenter = (u_faceBounds.xy + u_faceBounds.zw) / 2.0;
    vec2 faceSize = u_faceBounds.zw - u_faceBounds.xy;

    if (faceSize.x <= 0.0 || faceSize.y <= 0.0) {
      discard; // Don't draw anything if the face size is invalid
    }
    
    // Calculate normalized distance from the center, treating the bounding box as an ellipse
    vec2 dist_vec = (v_texcoord - faceCenter) / (faceSize / 2.0);
    float dist = length(dist_vec);
    
    // Create a smooth alpha gradient from the edge inwards
    float alpha = 1.0 - smoothstep(1.0 - u_feather, 1.0, dist);
    
    vec4 color = texture2D(u_texture, v_texcoord);
    
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
  private faceTexUniformLoc: WebGLUniformLocation;
  private faceBoundsUniformLoc: WebGLUniformLocation;
  private faceFeatherUniformLoc: WebGLUniformLocation;

  private faceTexture: WebGLTexture;
  private videoTexture: WebGLTexture;

  private quadMeshGL: MeshGL;
  private faceMeshGL: MeshGL;

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
      this.faceTexUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_texture')!;
      this.faceBoundsUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_faceBounds')!;
      this.faceFeatherUniformLoc = gl.getUniformLocation(this.faceProgram, 'u_feather')!;

      // Create textures and meshes
      this.faceTexture = gl.createTexture()!;
      this.videoTexture = gl.createTexture()!;
      this.quadMeshGL = createMeshGL(gl, createQuadMesh(gl));
      this.faceMeshGL = createMeshGL(gl, { positions: new Float32Array(), texcoords: new Float32Array(), drawMode: gl.TRIANGLES, vertexCount: 0 });
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

      // Calculate face bounds from target landmarks for the mask
      let minX = 1, minY = 1, maxX = 0, maxY = 0;
      for (const lm of targetLandmarks) {
          minX = Math.min(minX, lm.x);
          minY = Math.min(minY, lm.y);
          maxX = Math.max(maxX, lm.x);
          maxY = Math.max(maxY, lm.y);
      }
      
      // Set uniforms for face blending
      gl.uniform4f(this.faceBoundsUniformLoc, minX, minY, maxX, maxY);
      gl.uniform1f(this.faceFeatherUniformLoc, 0.3); // Adjust this for more/less feathering

      // Update and draw the face mesh geometry
      const srcPts = sourceLandmarks.map(p => [p.x, p.y] as [number, number]);
      const delaunay = Delaunator.from(srcPts);
      // Map target points through the same crop so overlay aligns with covered video
      const mappedTgtPts: [number, number][] = targetLandmarks.map(p => {
        const u = (p.x - uMin) / (uMax - uMin);
        const v = (p.y - vMin) / (vMax - vMin);
        return [u, v];
      });
      const faceMesh = createFaceMesh(gl, delaunay.triangles as Uint32Array, srcPts, mappedTgtPts);
      updateMeshGL(gl, this.faceMeshGL, faceMesh);
      
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
  }
}