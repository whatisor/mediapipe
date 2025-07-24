import { FilesetResolver } from '@mediapipe/tasks-vision';

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
export async function loadVisionModel(
  modelType: string,
  config: ModelConfig,
  canvas?: HTMLCanvasElement
): Promise<any> {
  try {
    const filesetResolver = await FilesetResolver.forVisionTasks('wasm');
    
    // Import the specific model class dynamically
    const modelModule = await import(`@mediapipe/tasks-vision`);
    const ModelClass = (modelModule as any)[modelType];
    
    if (!ModelClass) {
      throw new Error(`Model type ${modelType} not found in @mediapipe/tasks-vision`);
    }

    const modelOptions: any = {
      ...config,
      baseOptions: {
        modelAssetPath: config.modelPath,
        delegate: config.delegate || 'GPU'
      },
      runningMode: config.runningMode || 'VIDEO',
    };

    // Add canvas if provided
    if (canvas) {
      modelOptions.canvas = canvas;
    }

    return await ModelClass.createFromOptions(filesetResolver, modelOptions);
  } catch (error) {
    console.error(`Failed to load ${modelType}:`, error);
    throw error;
  }
}

/**
 * Common model configurations for popular MediaPipe models
 */
export const MODEL_CONFIGS = {
  imageSegmenter: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    outputCategoryMask: true
  },
  faceDetector: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    minDetectionConfidence: 0.5
  },
  handLandmarker: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    numHands: 2,
    minHandDetectionConfidence: 0.5,
    minHandPresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  },
  faceLandmarker: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker_lite/float16/latest/face_landmarker_lite.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  },
  poseLandmarker: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/latest/pose_landmarker_lite.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    numPoses: 1,
    minPoseDetectionConfidence: 0.5,
    minPosePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5
  },
  objectDetector: {
    modelPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/latest/efficientdet_lite2.tflite',
    delegate: 'GPU' as const,
    runningMode: 'VIDEO' as const,
    maxResults: 5,
    scoreThreshold: 0.5
  }
};

/**
 * Get a pre-configured model config by name
 */
export function getModelConfig(modelName: keyof typeof MODEL_CONFIGS): ModelConfig {
  return { ...MODEL_CONFIGS[modelName] };
}

/**
 * Initialize webcam with common settings
 */
export async function initializeWebcam(
  constraints: MediaStreamConstraints = {}
): Promise<MediaStream> {
  const defaultConstraints: MediaStreamConstraints = {
    video: {
      width: { ideal: 640 },
      height: { ideal: 480 },
      frameRate: { ideal: 30 }
    },
    ...constraints
  };

  try {
    return await navigator.mediaDevices.getUserMedia(defaultConstraints);
  } catch (error) {
    console.error('Failed to access webcam:', error);
    throw new Error(`Could not access webcam: ${error}`);
  }
} 