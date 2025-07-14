
import { WebGLRenderer } from './WebGLRenderer';
import { FPSCounter, isVideoReady } from './Utils';

export class VideoProcessor {
  private segmenter: any = null;
  private renderer: WebGLRenderer | null = null;
  private inputFPS: FPSCounter;
  private outputFPS: FPSCounter;
  private frameCallbackId: number | null = null;
  private lastFrameTime = 0;

  constructor() {
    this.inputFPS = new FPSCounter();
    this.outputFPS = new FPSCounter();
  }

  setSegmenter(segmenter: any): void {
    this.segmenter = segmenter;
  }

  setRenderer(renderer: WebGLRenderer): void {
    this.renderer = renderer;
  }

  startProcessing(video: HTMLVideoElement): void {
    if (!this.segmenter || !this.renderer) return;
    
    const processFrame = async (now: number, metadata: any) => {
      if (!this.segmenter || !this.renderer) return;

      // Count input frames
      this.inputFPS.update();

      // Check if video is ready and not duplicate frame
      if (!isVideoReady(video, metadata.mediaTime) || this.lastFrameTime >= metadata.mediaTime) {
        this.requestNextFrame(video, processFrame);
        return;
      }

      // Run segmentation
      const startTime = performance.now();
      const result = await this.segmenter.segmentForVideo(video, metadata.mediaTime);
      const segmentTime = performance.now() - startTime;
      this.lastFrameTime = metadata.mediaTime;
      
      // Log performance if segmentation takes too long
      if (segmentTime > 50) {
        console.log(`Segmentation took ${segmentTime.toFixed(1)}ms`);
      }

      // Process with WebGL if we have a mask
      if (result && result.categoryMask) {
        const mask = result.categoryMask;
        const maskTexture = mask.getAsWebGLTexture();
        
        // Render using WebGL
        this.renderer.render(video, maskTexture);
        
        // Clean up
        mask.close();
        result.close();
      }
      
      // Count output frames (always update, regardless of segmentation success)
      this.outputFPS.update();

      // Request next frame
      this.requestNextFrame(video, processFrame);
    };

    this.frameCallbackId = video.requestVideoFrameCallback(processFrame);
  }

  stopProcessing(): void {
    if (this.frameCallbackId) {
      // Note: cancelVideoFrameCallback is not available in all browsers
      // The callback will naturally stop when video is paused/stopped
      this.frameCallbackId = null;
    }
  }

  getInputFPS(): number {
    return this.inputFPS.getFPS();
  }

  getOutputFPS(): number {
    return this.outputFPS.getFPS();
  }

  private requestNextFrame(video: HTMLVideoElement, callback: (now: number, metadata: any) => void): void {
    this.frameCallbackId = video.requestVideoFrameCallback(callback);
  }

  private createFallbackMaskTexture(): WebGLTexture {
    // Create a simple white texture (shows everything) as fallback
    const gl = this.renderer?.getContext();
    if (!gl) {
      throw new Error('No WebGL context available');
    }
    
    const texture = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, texture);
    
    // Create a 1x1 white pixel
    const pixel = new Uint8Array([255, 255, 255, 255]);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    
    return texture;
  }
} 