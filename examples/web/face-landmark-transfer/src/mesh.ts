// examples/web/face-landmark-transfer/src/mesh.ts

export interface Mesh {
  positions: Float32Array;
  texcoords: Float32Array;
  drawMode: number;
  vertexCount: number;
}

export interface MeshGL {
  mesh: Mesh;
  positionBuffer: WebGLBuffer;
  texcoordBuffer: WebGLBuffer;
}

export function createQuadMesh(gl: WebGLRenderingContext): Mesh {
  return {
    positions: new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    texcoords: new Float32Array([0, 1, 1, 1, 0, 0, 1, 0]),
    drawMode: gl.TRIANGLE_STRIP,
    vertexCount: 4,
  };
}

export function createFaceMesh(
  gl: WebGLRenderingContext,
  triangles: Uint32Array,
  srcPts: [number, number][],
  tgtPts: [number, number][]
): Mesh {
  const positions: number[] = [];
  const texcoords: number[] = [];
  for (let i = 0; i < triangles.length; i += 3) {
    const [i0, i1, i2] = [triangles[i], triangles[i + 1], triangles[i + 2]];
    [i0, i1, i2].forEach((idx) => {
      const [sx, sy] = srcPts[idx];
      const [dx, dy] = tgtPts[idx];
      positions.push(dx * 2 - 1, 1 - dy * 2);
      texcoords.push(sx, sy);
    });
  }
  return {
    positions: new Float32Array(positions),
    texcoords: new Float32Array(texcoords),
    drawMode: gl.TRIANGLES,
    vertexCount: positions.length / 2,
  };
}

export function createMeshGL(gl: WebGLRenderingContext, mesh: Mesh): MeshGL {
  const positionBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW);

  const texcoordBuffer = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.DYNAMIC_DRAW);

  return { mesh, positionBuffer, texcoordBuffer };
}

export function updateMeshGL(gl: WebGLRenderingContext, meshGL: MeshGL, mesh: Mesh) {
  meshGL.mesh = mesh;
  gl.bindBuffer(gl.ARRAY_BUFFER, meshGL.positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.positions, gl.DYNAMIC_DRAW); // Re-allocate
  gl.bindBuffer(gl.ARRAY_BUFFER, meshGL.texcoordBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.texcoords, gl.DYNAMIC_DRAW); // Re-allocate
}

export function drawMesh(gl: WebGLRenderingContext, meshGL: MeshGL, posLoc: number, texLoc: number) {
  gl.bindBuffer(gl.ARRAY_BUFFER, meshGL.positionBuffer);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(posLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, meshGL.texcoordBuffer);
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(texLoc);

  gl.drawArrays(meshGL.mesh.drawMode, 0, meshGL.mesh.vertexCount);
}