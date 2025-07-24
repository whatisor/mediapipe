/**
 * Calculate optimal canvas size based on video dimensions and max constraints
 */
export const calculateCanvasSize = (
  videoWidth: number, 
  videoHeight: number, 
  maxWidth: number = 640, 
  maxHeight: number = 480
) => {
  const videoAspect = videoWidth / videoHeight;
  const maxAspect = maxWidth / maxHeight;
  
  let canvasWidth, canvasHeight;
  if (videoAspect > maxAspect) {
    // Video is wider than max aspect ratio
    canvasWidth = maxWidth;
    canvasHeight = maxWidth / videoAspect;
  } else {
    // Video is taller than max aspect ratio
    canvasHeight = maxHeight;
    canvasWidth = maxHeight * videoAspect;
  }
  
  return { width: canvasWidth, height: canvasHeight };
};

/**
 * Check if video element is ready for processing
 */
export const isVideoReady = (video: HTMLVideoElement, mediaTime: number): boolean => {
  return video.readyState >= 2 && 
         video.videoWidth > 0 && 
         video.videoHeight > 0 && 
         mediaTime > 0;
};

/**
 * Canvas Manager for handling canvas sizing and video synchronization
 */
export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private video: HTMLVideoElement;
  private maxWidth: number;
  private maxHeight: number;

  constructor(
    canvas: HTMLCanvasElement, 
    video: HTMLVideoElement, 
    maxWidth: number = 640, 
    maxHeight: number = 480
  ) {
    this.canvas = canvas;
    this.video = video;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
  }

  /**
   * Update canvas size based on current video dimensions
   */
  updateCanvasSize(): void {
    if (this.video.videoWidth === 0 || this.video.videoHeight === 0) return;
    
    const { width, height } = calculateCanvasSize(
      this.video.videoWidth, 
      this.video.videoHeight, 
      this.maxWidth, 
      this.maxHeight
    );
    
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  /**
   * Setup canvas sizing with event listeners
   * Returns cleanup function
   */
  setupCanvasSizing(): () => void {
    const updateCanvasSize = () => this.updateCanvasSize();
    
    // Update size when video metadata is loaded
    this.video.addEventListener('loadedmetadata', updateCanvasSize);
    
    // Also check periodically for the first few seconds
    const checkInterval = setInterval(() => {
      if (this.video.videoWidth > 0 && this.video.videoHeight > 0) {
        this.updateCanvasSize();
        clearInterval(checkInterval);
      }
    }, 100);
    
    // Return cleanup function
    return () => {
      this.video.removeEventListener('loadedmetadata', updateCanvasSize);
      clearInterval(checkInterval);
    };
  }
} 