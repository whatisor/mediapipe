import { calculateCanvasSize } from './Utils';

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private video: HTMLVideoElement;
  private maxWidth: number;
  private maxHeight: number;

  constructor(canvas: HTMLCanvasElement, video: HTMLVideoElement, maxWidth: number = 640, maxHeight: number = 480) {
    this.canvas = canvas;
    this.video = video;
    this.maxWidth = maxWidth;
    this.maxHeight = maxHeight;
  }

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