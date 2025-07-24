/**
 * FPS Counter utility for tracking frame rates
 */
export class FPSCounter {
    constructor(updateIntervalMs = 1000) {
        this.frameCount = 0;
        this.lastUpdateTime = 0;
        this.currentFPS = 0;
        this.updateInterval = updateIntervalMs;
    }
    /**
     * Update the FPS counter and return current FPS
     */
    update() {
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
    getFPS() {
        return this.currentFPS;
    }
    /**
     * Reset the FPS counter
     */
    reset() {
        this.frameCount = 0;
        this.lastUpdateTime = 0;
        this.currentFPS = 0;
    }
}
//# sourceMappingURL=fps.js.map