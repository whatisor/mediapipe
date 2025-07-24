/**
 * FPS Counter utility for tracking frame rates
 */
export class FPSCounter {
  private frameCount = 0;
  private lastUpdateTime = 0;
  private currentFPS = 0;
  private readonly updateInterval: number;

  constructor(updateIntervalMs: number = 1000) {
    this.updateInterval = updateIntervalMs;
  }

  /**
   * Update the FPS counter and return current FPS
   */
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

  /**
   * Get the current FPS value
   */
  getFPS(): number {
    return this.currentFPS;
  }

  /**
   * Reset the FPS counter
   */
  reset(): void {
    this.frameCount = 0;
    this.lastUpdateTime = 0;
    this.currentFPS = 0;
  }
} 