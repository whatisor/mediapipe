# MediaPipe Web Common Utilities - Usage Guide

This guide explains how to use the common utilities package to create MediaPipe web applications with different models.

## Quick Start

1. **Install the common package in your web example:**
   ```bash
   npm install ../common
   ```

2. **Add MediaPipe dependency:**
   ```bash
   npm install @mediapipe/tasks-vision
   ```

3. **Import and use utilities:**
   ```typescript
   import {
     loadVisionModel,
     getModelConfig,
     initializeWebcam,
     GenericVideoProcessor,
     CanvasManager,
     FPSDisplay
   } from '@mediapipe/web-common';
   ```

## Available Models

The package includes pre-configured settings for these MediaPipe models:

### 1. Image Segmenter (Background Removal)
```typescript
const config = getModelConfig('imageSegmenter');
const model = await loadVisionModel('ImageSegmenter', config, canvas);
```

### 2. Face Detector
```typescript
const config = getModelConfig('faceDetector');
const model = await loadVisionModel('FaceDetector', config, canvas);
```

### 3. Hand Landmarker
```typescript
const config = getModelConfig('handLandmarker');
const model = await loadVisionModel('HandLandmarker', config, canvas);
```

### 4. Pose Landmarker
```typescript
const config = getModelConfig('poseLandmarker');
const model = await loadVisionModel('PoseLandmarker', config, canvas);
```

### 5. Object Detector
```typescript
const config = getModelConfig('objectDetector');
const model = await loadVisionModel('ObjectDetector', config, canvas);
```

## Complete Example: Face Detection

```typescript
import React, { useEffect, useRef, useState } from 'react';
import {
  loadVisionModel,
  getModelConfig,
  initializeWebcam,
  GenericVideoProcessor,
  CanvasManager,
  FPSDisplay
} from '@mediapipe/web-common';

const FaceDetectionApp: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [inputFPS, setInputFPS] = useState(0);
  const [outputFPS, setOutputFPS] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function setup() {
      try {
        // 1. Initialize webcam
        const stream = await initializeWebcam();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        // 2. Load model
        const config = getModelConfig('faceDetector');
        const model = await loadVisionModel('FaceDetector', config, canvasRef.current!);

        // 3. Setup video processor
        const processor = new GenericVideoProcessor();
        processor.setModel(model);
        processor.setProcessCallback((video, result) => {
          // Handle detection results
          const ctx = canvasRef.current?.getContext('2d');
          if (ctx && result.detections) {
            ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
            ctx.drawImage(video, 0, 0, canvasRef.current!.width, canvasRef.current!.height);
            
            // Draw bounding boxes
            result.detections.forEach((detection: any) => {
              const bbox = detection.boundingBox;
              ctx.strokeStyle = '#00FF00';
              ctx.lineWidth = 2;
              ctx.strokeRect(
                bbox.originX * canvasRef.current!.width,
                bbox.originY * canvasRef.current!.height,
                bbox.width * canvasRef.current!.width,
                bbox.height * canvasRef.current!.height
              );
            });
          }
        });

        // 4. Setup canvas management
        const canvasManager = new CanvasManager(canvasRef.current!, videoRef.current!);
        canvasManager.setupCanvasSizing();

        // 5. Start processing
        processor.startProcessing(videoRef.current!, 'detectForVideo');

        // 6. Update FPS display
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
      <h1>Face Detection</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <video ref={videoRef} autoPlay playsInline muted />
      <canvas ref={canvasRef} />
      <FPSDisplay inputFPS={inputFPS} outputFPS={outputFPS} />
    </div>
  );
};
```

## Custom Model Configuration

You can create custom configurations for any MediaPipe model:

```typescript
const customConfig = {
  modelPath: 'https://your-custom-model.tflite',
  delegate: 'GPU' as const,
  runningMode: 'VIDEO' as const,
  minDetectionConfidence: 0.7,
  maxResults: 10
};

const model = await loadVisionModel('YourModelType', customConfig, canvas);
```

## WebGL Rendering

For high-performance rendering (like background removal), use the WebGL renderer:

```typescript
import { WebGLRenderer, VideoProcessor } from '@mediapipe/web-common';

const renderer = new WebGLRenderer(canvas);
const processor = new VideoProcessor();
processor.setRenderer(renderer);
processor.setSegmenter(segmenter);
processor.startProcessing(video);
```

## Canvas Management

The CanvasManager automatically handles canvas sizing and video synchronization:

```typescript
const canvasManager = new CanvasManager(canvas, video, maxWidth, maxHeight);
const cleanup = canvasManager.setupCanvasSizing();

// Don't forget to call cleanup when component unmounts
return cleanup;
```

## FPS Monitoring

Track performance with the FPS counter:

```typescript
import { FPSCounter } from '@mediapipe/web-common';

const fpsCounter = new FPSCounter();
fpsCounter.update(); // Call on each frame
const currentFPS = fpsCounter.getFPS();
```

## Webcam Configuration

Customize webcam settings:

```typescript
const stream = await initializeWebcam({
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 60 }
  }
});
```

## Vite Configuration

For Vite projects, add this to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: ['@mediapipe/tasks-vision'],
      output: {
        globals: {
          '@mediapipe/tasks-vision': 'MediaPipeTasksVision'
        }
      }
    }
  },
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision']
  }
});
```

## Error Handling

Always wrap your setup code in try-catch blocks:

```typescript
try {
  const stream = await initializeWebcam();
  const model = await loadVisionModel('ModelType', config);
  // ... rest of setup
} catch (error) {
  console.error('Setup failed:', error);
  setError(error.message);
}
```

## Performance Tips

1. **Use WebGL renderer** for video processing tasks
2. **Monitor FPS** to ensure smooth performance
3. **Clean up resources** when components unmount
4. **Use appropriate model configurations** for your use case
5. **Handle errors gracefully** to provide good user experience

## Troubleshooting

### Common Issues

1. **"Cannot find module '@mediapipe/tasks-vision'"**
   - Make sure you've installed the dependency
   - Check your Vite configuration

2. **"WebGL2 not supported"**
   - Check browser compatibility
   - Consider fallback to CPU rendering

3. **"Could not access webcam"**
   - Check browser permissions
   - Ensure HTTPS in production

4. **Low FPS**
   - Use GPU delegate when possible
   - Consider reducing video resolution
   - Check for memory leaks

### Debug Mode

Enable debug logging:

```typescript
// Add to your setup
console.log('Model config:', config);
console.log('Video dimensions:', video.videoWidth, video.videoHeight);
console.log('Canvas dimensions:', canvas.width, canvas.height);
```

## Next Steps

1. Explore the different model configurations
2. Try combining multiple models
3. Add custom rendering logic
4. Implement advanced error handling
5. Add performance optimizations

For more examples, see the `examples/` directory in the common package. 