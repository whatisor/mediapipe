/**
 * FPS Counter utility for tracking frame rates
 */
export declare class FPSCounter {
    private frameCount;
    private lastUpdateTime;
    private currentFPS;
    private readonly updateInterval;
    constructor(updateIntervalMs?: number);
    /**
     * Update the FPS counter and return current FPS
     */
    update(): number;
    /**
     * Get the current FPS value
     */
    getFPS(): number;
    /**
     * Reset the FPS counter
     */
    reset(): void;
}
//# sourceMappingURL=fps.d.ts.map