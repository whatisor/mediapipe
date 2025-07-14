export class FPSCounter {
  private frameCount = 0;
  private lastUpdateTime = 0;
  private currentFPS = 0;
  private readonly updateInterval: number;

  constructor(updateIntervalMs: number = 1000) {
    this.updateInterval = updateIntervalMs;
  }

  update(): number {
    this.frameCount++;
    const currentTime = Date.now();
    
    if (currentTime - this.lastUpdateTime >= this.updateInterval) {
      this.currentFPS = Math.round(this.frameCount * 1000 / this.updateInterval);
      this.frameCount = 0;
      this.lastUpdateTime = currentTime;
    }
    
    return this.currentFPS;
  }

  getFPS(): number {
    return this.currentFPS;
  }

  reset(): void {
    this.frameCount = 0;
    this.lastUpdateTime = 0;
    this.currentFPS = 0;
  }
}

export const calculateCanvasSize = (videoWidth: number, videoHeight: number, maxWidth: number = 640, maxHeight: number = 480) => {
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

export const isVideoReady = (video: HTMLVideoElement, mediaTime: number): boolean => {
  return video.readyState >= 2 && 
         video.videoWidth > 0 && 
         video.videoHeight > 0 && 
         mediaTime > 0;
}; 