/**
 * WebGL Renderer for efficient video processing and rendering
 */
export class WebGLRenderer {
    constructor(canvas) {
        this.videoTexture = null;
        this.lastVideoWidth = 0;
        this.lastVideoHeight = 0;
        const gl = canvas.getContext('webgl2');
        if (!gl) {
            throw new Error('WebGL2 not supported');
        }
        this.gl = gl;
        // Create shader program
        this.program = this.createShaderProgram();
        // Get attribute and uniform locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.texCoordLocation = gl.getAttribLocation(this.program, 'a_texCoord');
        this.imageLocation = gl.getUniformLocation(this.program, 'u_image');
        this.maskLocation = gl.getUniformLocation(this.program, 'u_mask');
        // Create buffers
        this.positionBuffer = this.createPositionBuffer();
        this.texCoordBuffer = this.createTexCoordBuffer();
    }
    createShaderProgram() {
        const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      varying vec2 v_texCoord;
      
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = a_texCoord;
      }
    `;
        const fragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform sampler2D u_mask;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 imageColor = texture2D(u_image, v_texCoord);
        vec4 maskColor = texture2D(u_mask, v_texCoord);
        
        // If mask is background (low value), make transparent, else keep person
        if (maskColor.r > 0.1) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        } else {
          gl_FragColor = imageColor;
        }
      }
    `;
        // Create shaders
        const vertexShader = this.gl.createShader(this.gl.VERTEX_SHADER);
        this.gl.shaderSource(vertexShader, vertexShaderSource);
        this.gl.compileShader(vertexShader);
        const fragmentShader = this.gl.createShader(this.gl.FRAGMENT_SHADER);
        this.gl.shaderSource(fragmentShader, fragmentShaderSource);
        this.gl.compileShader(fragmentShader);
        // Create program
        const program = this.gl.createProgram();
        this.gl.attachShader(program, vertexShader);
        this.gl.attachShader(program, fragmentShader);
        this.gl.linkProgram(program);
        if (!this.gl.getProgramParameter(program, this.gl.LINK_STATUS)) {
            throw new Error('Failed to link shader program: ' + this.gl.getProgramInfoLog(program));
        }
        return program;
    }
    createPositionBuffer() {
        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1,
        ]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, positions, this.gl.STATIC_DRAW);
        return buffer;
    }
    createTexCoordBuffer() {
        const texCoords = new Float32Array([
            0, 1,
            1, 1,
            0, 0,
            1, 0,
        ]);
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, texCoords, this.gl.STATIC_DRAW);
        return buffer;
    }
    render(videoElement, maskTexture) {
        const gl = this.gl;
        // Get current video dimensions
        const currentWidth = videoElement.videoWidth;
        const currentHeight = videoElement.videoHeight;
        // Create or update video texture if dimensions changed
        if (this.lastVideoWidth !== currentWidth || this.lastVideoHeight !== currentHeight) {
            this.createVideoTexture();
            this.lastVideoWidth = currentWidth;
            this.lastVideoHeight = currentHeight;
        }
        // Update video texture with current frame
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, videoElement);
        // Set up WebGL rendering to fit the canvas
        const canvas = gl.canvas;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.clearColor(0, 0, 0, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(this.program);
        // Set up position buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        // Set up texture coordinate buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(this.texCoordLocation);
        gl.vertexAttribPointer(this.texCoordLocation, 2, gl.FLOAT, false, 0, 0);
        // Bind textures
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.uniform1i(this.imageLocation, 0);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, maskTexture);
        gl.uniform1i(this.maskLocation, 1);
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    createVideoTexture() {
        const gl = this.gl;
        // Delete old video texture if it exists
        if (this.videoTexture) {
            gl.deleteTexture(this.videoTexture);
        }
        // Create new video texture
        this.videoTexture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.videoTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    getContext() {
        return this.gl;
    }
}
/**
 * Create a fallback mask texture (white texture that shows everything)
 */
export const createFallbackMaskTexture = (gl) => {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    // Create a 1x1 white pixel
    const pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    return texture;
};
//# sourceMappingURL=webgl.js.map