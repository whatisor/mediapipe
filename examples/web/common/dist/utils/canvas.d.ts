/**
 * Calculate optimal canvas size based on video dimensions and max constraints
 */
export declare const calculateCanvasSize: (videoWidth: number, videoHeight: number, maxWidth?: number, maxHeight?: number) => {
    width: number;
    height: number;
};
/**
 * Check if video element is ready for processing
 */
export declare const isVideoReady: (video: HTMLVideoElement, mediaTime: number) => boolean;
/**
 * Canvas Manager for handling canvas sizing and video synchronization
 */
export declare class CanvasManager {
    private canvas;
    private video;
    private maxWidth;
    private maxHeight;
    constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement, maxWidth?: number, maxHeight?: number);
    /**
     * Update canvas size based on current video dimensions
     */
    updateCanvasSize(): void;
    /**
     * Setup canvas sizing with event listeners
     * Returns cleanup function
     */
    setupCanvasSizing(): () => void;
}
//# sourceMappingURL=canvas.d.ts.map