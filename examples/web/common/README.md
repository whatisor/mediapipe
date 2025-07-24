# MediaPipe Web Common Utilities

This package contains common utilities and components for MediaPipe web examples that can be reused across different models and applications.

## Installation

```bash
# In your web example directory
npm install ../common
```

## Features

### Utilities

#### FPS Counter
Track frame rates for performance monitoring:
```typescript
import { FPSCounter } from '@mediapipe/web-common';

const fpsCounter = new FPSCounter();
fpsCounter.update(); // Call on each frame
const currentFPS = fpsCounter.getFPS();
```

#### Canvas Management
Handle canvas sizing and video synchronization:
```typescript
import { CanvasManager, calculateCanvasSize } from '@mediapipe/web-common';

const canvasManager = new CanvasManager(canvas, video);
const cleanup = canvasManager.setupCanvasSizing();

// Or use the utility function directly
const { width, height } = calculateCanvasSize(videoWidth, videoHeight);
```

#### WebGL Renderer
High-performance WebGL rendering for video processing:
```typescript
import { WebGLRenderer } from '@mediapipe/web-common';

const renderer = new WebGLRenderer(canvas);
renderer.render(video, maskTexture);
```

#### Video Processing
Generic video processors for any MediaPipe model:
```typescript
import { GenericVideoProcessor } from '@mediapipe/web-common';

const processor = new GenericVideoProcessor();
processor.setModel(model);
processor.setProcessCallback((video, result) => {
  // Handle processing results
});
processor.startProcessing(video);
```

#### MediaPipe Model Loading
Easy model loading with pre-configured settings:
```typescript
import { loadVisionModel, getModelConfig } from '@mediapipe/web-common';

// Load with custom config
const model = await loadVisionModel('ImageSegmenter', {
  modelPath: 'path/to/model.tflite',
  delegate: 'GPU'
});

// Or use pre-configured models
const config = getModelConfig('imageSegmenter');
const model = await loadVisionModel('ImageSegmenter', config);
```

#### Webcam Initialization
```typescript
import { initializeWebcam } from '@mediapipe/web-common';

const stream = await initializeWebcam({
  video: { width: { ideal: 1280 }, height: { ideal: 720 } }
});
```

### Components

#### FPS Display
React component for displaying FPS metrics:
```typescript
import { FPSDisplay } from '@mediapipe/web-common';

<FPSDisplay inputFPS={30} outputFPS={25} />
```

## Pre-configured Models

The package includes configurations for popular MediaPipe models:

- **ImageSegmenter**: Selfie segmentation for background removal
- **FaceDetector**: Face detection with BlazeFace
- **HandLandmarker**: Hand landmark detection
- **PoseLandmarker**: Pose estimation
- **ObjectDetector**: Object detection with EfficientDet

## Example Usage

Here's a complete example of how to use the common utilities:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import {
  loadVisionModel,
  getModelConfig,
  initializeWebcam,
  GenericVideoProcessor,
  WebGLRenderer,
  CanvasManager,
  FPSDisplay
} from '@mediapipe/web-common';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputFPS, setInputFPS] = useState(0);
  const [outputFPS, setOutputFPS] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        // Initialize webcam
        const stream = await initializeWebcam();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // Load model
        const config = getModelConfig('imageSegmenter');
        const model = await loadVisionModel('ImageSegmenter', config, canvasRef.current!);

        // Setup renderer and processor
        const renderer = new WebGLRenderer(canvasRef.current!);
        const processor = new GenericVideoProcessor();
        
        processor.setModel(model);
        processor.setProcessCallback((video, result) => {
          if (result.categoryMask) {
            const maskTexture = result.categoryMask.getAsWebGLTexture();
            renderer.render(video, maskTexture);
            result.categoryMask.close();
            result.close();
          }
        });

        // Setup canvas management
        const canvasManager = new CanvasManager(canvasRef.current!, videoRef.current!);
        canvasManager.setupCanvasSizing();

        // Start processing
        processor.startProcessing(videoRef.current!);

        // Update FPS display
        const interval = setInterval(() => {
          setInputFPS(processor.getInputFPS());
          setOutputFPS(processor.getOutputFPS());
        }, 1000);

        return () => clearInterval(interval);
      } catch (err: any) {
        setError(err.message);
      }
    }

    setup();
  }, []);

  return (
    <div>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} />
      <FPSDisplay inputFPS={inputFPS} outputFPS={outputFPS} />
    </div>
  );
};
```

## Development

To build the package:

```bash
cd examples/web/common
npm install
npm run build
```

## License

This package is part of MediaPipe and follows the same license terms. 