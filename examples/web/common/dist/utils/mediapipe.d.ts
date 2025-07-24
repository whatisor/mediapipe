/**
 * MediaPipe model configuration interface
 */
export interface ModelConfig {
    modelPath: string;
    delegate?: 'CPU' | 'GPU';
    runningMode?: 'IMAGE' | 'VIDEO';
    maxResults?: number;
    scoreThreshold?: number;
    [key: string]: any;
}
/**
 * Load a MediaPipe vision model with common configuration
 */
export declare function loadVisionModel(modelType: string, config: ModelConfig, canvas?: HTMLCanvasElement): Promise<any>;
/**
 * Common model configurations for popular MediaPipe models
 */
export declare const MODEL_CONFIGS: {
    imageSegmenter: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        outputCategoryMask: boolean;
    };
    faceDetector: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        minDetectionConfidence: number;
    };
    handLandmarker: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        numHands: number;
        minHandDetectionConfidence: number;
        minHandPresenceConfidence: number;
        minTrackingConfidence: number;
    };
    faceLandmarker: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        numFaces: number;
        minFaceDetectionConfidence: number;
        minFacePresenceConfidence: number;
        minTrackingConfidence: number;
    };
    poseLandmarker: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        numPoses: number;
        minPoseDetectionConfidence: number;
        minPosePresenceConfidence: number;
        minTrackingConfidence: number;
    };
    objectDetector: {
        modelPath: string;
        delegate: "GPU";
        runningMode: "VIDEO";
        maxResults: number;
        scoreThreshold: number;
    };
};
/**
 * Get a pre-configured model config by name
 */
export declare function getModelConfig(modelName: keyof typeof MODEL_CONFIGS): ModelConfig;
/**
 * Initialize webcam with common settings
 */
export declare function initializeWebcam(constraints?: MediaStreamConstraints): Promise<MediaStream>;
//# sourceMappingURL=mediapipe.d.ts.map