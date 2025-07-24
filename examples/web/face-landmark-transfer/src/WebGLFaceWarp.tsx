import React, { useEffect, useRef } from 'react';
import Delaunator from 'delaunator';

export type NormalizedLandmark = { x: number; y: number; z?: number };

interface WebGLFaceWarpProps {
  sourceImage: HTMLImageElement | string;
  sourceLandmarks: NormalizedLandmark[];
  targetLandmarks: NormalizedLandmark[];
  width: number;
  height: number;
}

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
  function compile(type: number, src: string) {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(shader);
    return shader;
  }
  const vs = compile(gl.VERTEX_SHADER, vSrc);
  const fs = compile(gl.FRAGMENT_SHADER, fSrc);
  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw gl.getProgramInfoLog(program);
  return program;
}

export const WebGLFaceWarp: React.FC<WebGLFaceWarpProps> = ({
  sourceImage,
  sourceLandmarks,
  targetLandmarks,
  width,
  height
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Load image if sourceImage is a URL
  useEffect(() => {
    if (typeof sourceImage === 'string') {
      const img = new window.Image();
      img.src = sourceImage;
      img.onload = () => {
        imageRef.current = img;
        renderWarp();
      };
    } else {
      imageRef.current = sourceImage;
      renderWarp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceImage]);

  // Re-render when landmarks change
  useEffect(() => {
    renderWarp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceLandmarks, targetLandmarks]);

  function renderWarp() {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img || sourceLandmarks.length === 0 || targetLandmarks.length === 0) return;
    const gl = canvas.getContext('webgl');
    if (!gl) return;
    canvas.width = width;
    canvas.height = height;
    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Prepare points
    const srcPts = sourceLandmarks.map(p => [p.x * width, p.y * height] as [number, number]);
    const dstPts = targetLandmarks.map(p => [p.x * width, p.y * height] as [number, number]);

    // Delaunay triangulation
    const delaunay = Delaunator.from(srcPts);
    const triangles = delaunay.triangles;

    // Prepare buffers
    const positions: number[] = [];
    const texcoords: number[] = [];
    for (let i = 0; i < triangles.length; i += 3) {
      const i0 = triangles[i];
      const i1 = triangles[i + 1];
      const i2 = triangles[i + 2];
      [i0, i1, i2].forEach(idx => {
        const [sx, sy] = srcPts[idx];
        const [dx, dy] = dstPts[idx];
        positions.push((dx / width) * 2 - 1, (1 - dy / height) * 2 - 1);
        texcoords.push(sx / width, sy / height);
      });
    }

    // Create and bind buffers
    const posBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const texBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);

    // Create program
    const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);
    gl.useProgram(program);

    // Set up attributes
    const posLoc = gl.getAttribLocation(program, 'a_position');
    const texLoc = gl.getAttribLocation(program, 'a_texcoord');

    gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, texBuf);
    gl.enableVertexAttribArray(texLoc);
    gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);

    // Upload texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.drawArrays(gl.TRIANGLES, 0, positions.length / 2);
  }

  return <canvas ref={canvasRef} width={width} height={height} />;
}; 