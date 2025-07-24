import { WebGLRenderer } from './webgl';
/**
 * Video Processor for handling MediaPipe model processing
 */
export declare class VideoProcessor {
    private segmenter;
    private renderer;
    private inputFPS;
    private outputFPS;
    private frameCallbackId;
    private lastFrameTime;
    constructor();
    setSegmenter(segmenter: any): void;
    setRenderer(renderer: WebGLRenderer): void;
    startProcessing(video: HTMLVideoElement): void;
    stopProcessing(): void;
    getInputFPS(): number;
    getOutputFPS(): number;
    private requestNextFrame;
}
/**
 * Generic video processor for any MediaPipe model
 */
export declare class GenericVideoProcessor {
    private model;
    private inputFPS;
    private outputFPS;
    private frameCallbackId;
    private lastFrameTime;
    private processCallback;
    constructor();
    setModel(model: any): void;
    setProcessCallback(callback: (video: HTMLVideoElement, result: any) => void): void;
    startProcessing(video: HTMLVideoElement, processMethod?: string): void;
    stopProcessing(): void;
    getInputFPS(): number;
    getOutputFPS(): number;
    private requestNextFrame;
}
//# sourceMappingURL=video.d.ts.map