import { FPSCounter } from './fps';
import { isVideoReady } from './canvas';
/**
 * Video Processor for handling MediaPipe model processing
 */
export class VideoProcessor {
    constructor() {
        this.segmenter = null;
        this.renderer = null;
        this.frameCallbackId = null;
        this.lastFrameTime = 0;
        this.inputFPS = new FPSCounter();
        this.outputFPS = new FPSCounter();
    }
    setSegmenter(segmenter) {
        this.segmenter = segmenter;
    }
    setRenderer(renderer) {
        this.renderer = renderer;
    }
    startProcessing(video) {
        if (!this.segmenter || !this.renderer)
            return;
        const processFrame = async (_now, metadata) => {
            if (!this.segmenter || !this.renderer)
                return;
            const frameStart = performance.now();
            // Check if video is ready and not duplicate frame
            if (!isVideoReady(video, metadata.mediaTime) || this.lastFrameTime >= metadata.mediaTime) {
                this.requestNextFrame(video, processFrame);
                return;
            }
            // Count input frames
            this.inputFPS.update();
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
                const renderStart = performance.now();
                this.renderer.render(video, maskTexture);
                const renderTime = performance.now() - renderStart;
                // Log render time if it's slow
                if (renderTime > 16) {
                    console.log(`Render took ${renderTime.toFixed(1)}ms`);
                }
                // Clean up
                mask.close();
                result.close();
            }
            else {
                // Even if segmentation fails, we should still render something
                console.log('Segmentation failed, no mask available');
            }
            // Count output frames (always update, regardless of segmentation success)
            this.outputFPS.update();
            const totalFrameTime = performance.now() - frameStart;
            // if (totalFrameTime > 33) { // More than 30fps threshold
            //     console.log(`Total frame time: ${totalFrameTime.toFixed(1)}ms (${(1000 / totalFrameTime).toFixed(1)}fps)`);
            // }
            // Request next frame
            this.requestNextFrame(video, processFrame);
        };
        this.frameCallbackId = video.requestVideoFrameCallback(processFrame);
    }
    stopProcessing() {
        if (this.frameCallbackId) {
            // Note: cancelVideoFrameCallback is not available in all browsers
            // The callback will naturally stop when video is paused/stopped
            this.frameCallbackId = null;
        }
    }
    getInputFPS() {
        return this.inputFPS.getFPS();
    }
    getOutputFPS() {
        return this.outputFPS.getFPS();
    }
    requestNextFrame(video, callback) {
        this.frameCallbackId = video.requestVideoFrameCallback(callback);
    }
}
/**
 * Generic video processor for any MediaPipe model
 */
export class GenericVideoProcessor {
    constructor() {
        this.model = null;
        this.frameCallbackId = null;
        this.lastFrameTime = 0;
        this.processCallback = null;
        this.inputFPS = new FPSCounter();
        this.outputFPS = new FPSCounter();
    }
    setModel(model) {
        this.model = model;
    }
    setProcessCallback(callback) {
        this.processCallback = callback;
    }
    startProcessing(video, processMethod = 'processForVideo') {
        if (!this.model)
            return;
        const processFrame = async (_now, metadata) => {
            if (!this.model)
                return;
            const frameStart = performance.now();
            // Check if video is ready and not duplicate frame
            if (!isVideoReady(video, metadata.mediaTime) || this.lastFrameTime >= metadata.mediaTime) {
                this.requestNextFrame(video, processFrame);
                return;
            }
            // Count input frames
            this.inputFPS.update();
            try {
                // Run model processing
                const startTime = performance.now();
                const result = await this.model[processMethod](video, metadata.mediaTime*1000);
                const processTime = performance.now() - startTime;
                this.lastFrameTime = metadata.mediaTime;
                // Log performance if processing takes too long
                // if (processTime > 50) {
                //     console.log(`Processing took ${processTime.toFixed(1)}ms`);
                // }
                // Process result with callback
                if (this.processCallback && result) {
                    this.processCallback(video, result);
                }
            }
            catch (error) {
                console.error('Model processing failed:', error);
            }
            // Count output frames
            this.outputFPS.update();
            const totalFrameTime = performance.now() - frameStart;
            // if (totalFrameTime > 33) { // More than 30fps threshold
            //     console.log(`Total frame time: ${totalFrameTime.toFixed(1)}ms (${(1000 / totalFrameTime).toFixed(1)}fps)`);
            // }
            // Request next frame
            this.requestNextFrame(video, processFrame);
        };
        this.frameCallbackId = video.requestVideoFrameCallback(processFrame);
    }
    stopProcessing() {
        if (this.frameCallbackId) {
            this.frameCallbackId = null;
        }
    }
    getInputFPS() {
        return this.inputFPS.getFPS();
    }
    getOutputFPS() {
        return this.outputFPS.getFPS();
    }
    requestNextFrame(video, callback) {
        this.frameCallbackId = video.requestVideoFrameCallback(callback);
    }
}
//# sourceMappingURL=video.js.map