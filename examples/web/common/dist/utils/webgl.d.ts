/**
 * WebGL Renderer for efficient video processing and rendering
 */
export declare class WebGLRenderer {
    private gl;
    private program;
    private positionBuffer;
    private texCoordBuffer;
    private positionLocation;
    private texCoordLocation;
    private imageLocation;
    private maskLocation;
    private videoTexture;
    private lastVideoWidth;
    private lastVideoHeight;
    constructor(canvas: HTMLCanvasElement);
    private createShaderProgram;
    private createPositionBuffer;
    private createTexCoordBuffer;
    render(videoElement: HTMLVideoElement, maskTexture: WebGLTexture): void;
    private createVideoTexture;
    getContext(): WebGL2RenderingContext;
}
/**
 * Create a fallback mask texture (white texture that shows everything)
 */
export declare const createFallbackMaskTexture: (gl: WebGL2RenderingContext) => WebGLTexture;
//# sourceMappingURL=webgl.d.ts.map