// examples/web/face-landmark-transfer/src/WebGLRenderer.ts

import {
  Mesh,
  MeshGL,
  createQuadMesh,
  createFaceMesh,
  createMeshGL,
  updateMeshGL,
  drawMesh,
} from './mesh';
import { NormalizedLandmark } from './WebGLFaceWarp';
import Delaunator from 'delaunator';

const vertexShaderSource = `
  attribute vec2 a_position;
  attribute vec2 a_texcoord;
  varying vec2 v_texcoord;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texcoord = a_texcoord;
  }
`;

const fragmentShaderSource = `
  precision mediump float;
  varying vec2 v_texcoord;
  uniform sampler2D u_texture;
  void main() {
    gl_FragColor = texture2D(u_texture, v_texcoord);
  }
`;

function createProgram(gl: WebGLRenderingContext, vSrc: string, fSrc: string) {
  // ... (Shader compilation logic from your WebGLFaceWarp.tsx)
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
  private program: WebGLProgram;
  private posLoc: number;
  private texLoc: number;
  private texUniformLoc: WebGLUniformLocation;

  private faceTexture: WebGLTexture;
  private videoTexture: WebGLTexture;

  private quadMeshGL: MeshGL;
  private faceMeshGL: MeshGL;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl', { preserveDrawingBuffer: true });
    if (!gl) throw new Error('WebGL not supported');
    this.gl = gl;

    this.program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    this.posLoc = gl.getAttribLocation(this.program, 'a_position');
    this.texLoc = gl.getAttribLocation(this.program, 'a_texcoord');
    this.texUniformLoc = gl.getUniformLocation(this.program, 'u_texture')!;

    this.faceTexture = gl.createTexture()!;
    this.videoTexture = gl.createTexture()!;

    this.quadMeshGL = createMeshGL(gl, createQuadMesh(gl));
    // Initialize with a dummy mesh; it will be updated every frame.
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
    gl.useProgram(this.program);

    // Update textures
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

    // Draw video quad
    if (videoFrame) {
      gl.uniform1i(this.texUniformLoc, 1);
      drawMesh(gl, this.quadMeshGL, this.posLoc, this.texLoc);
    }

    // Update and draw face mesh
    const srcPts = sourceLandmarks.map(p => [p.x, p.y] as [number, number]);
    const delaunay = Delaunator.from(srcPts);
    const faceMesh = createFaceMesh(gl, delaunay.triangles as Uint32Array, srcPts, targetLandmarks.map(p => [p.x, p.y] as [number, number]));
    updateMeshGL(gl, this.faceMeshGL, faceMesh);

    gl.uniform1i(this.texUniformLoc, 0);
    drawMesh(gl, this.faceMeshGL, this.posLoc, this.texLoc);
  }

  destroy() {
    const gl = this.gl;
    gl.deleteProgram(this.program);
    gl.deleteTexture(this.faceTexture);
    gl.deleteTexture(this.videoTexture);
    gl.deleteBuffer(this.quadMeshGL.positionBuffer);
    gl.deleteBuffer(this.quadMeshGL.texcoordBuffer);
    gl.deleteBuffer(this.faceMeshGL.positionBuffer);
    gl.deleteBuffer(this.faceMeshGL.texcoordBuffer);
  }
}