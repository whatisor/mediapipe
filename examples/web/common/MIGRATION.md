# Migration Guide: From Individual Utilities to Common Package

This guide explains how to migrate your existing MediaPipe web examples to use the new common utilities package.

## What Changed

We've consolidated all utility functions into a reusable package at `examples/web/common/` that can be shared across all web examples.

## Before vs After

### Before (Individual Files)
```typescript
// Each example had its own utility files
import { FPSCounter } from './Utils';
import { CanvasManager } from './CanvasManager';
import { WebGLRenderer } from './WebGLRenderer';
import { VideoProcessor } from './VideoProcessor';
import { FPSDisplay } from './FPSDisplay';
```

### After (Common Package)
```typescript
// All examples now use the common package
import {
  FPSCounter,
  CanvasManager,
  WebGLRenderer,
  VideoProcessor,
  FPSDisplay
} from '@mediapipe/web-common';
```

## Migration Steps

### 1. Update package.json
Add the common package and MediaPipe dependency:

```json
{
  "dependencies": {
    "@mediapipe/web-common": "file:../common",
    "@mediapipe/tasks-vision": "^0.10.0"
  }
}
```

### 2. Update Vite Configuration
Add this to your `vite.config.ts`:

```typescript
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

### 3. Update Imports
Replace individual imports with common package imports:

```typescript
// Old
import { FPSCounter } from './Utils';
import { CanvasManager } from './CanvasManager';
import { WebGLRenderer } from './WebGLRenderer';
import { VideoProcessor } from './VideoProcessor';
import { FPSDisplay } from './FPSDisplay';

// New
import {
  FPSCounter,
  CanvasManager,
  WebGLRenderer,
  VideoProcessor,
  FPSDisplay
} from '@mediapipe/web-common';
```

### 4. Remove Old Files
Delete the old utility files from your example:
- `Utils.ts`
- `CanvasManager.ts`
- `WebGLRenderer.ts`
- `VideoProcessor.ts`
- `FPSDisplay.tsx`

### 5. Install Dependencies
```bash
npm install
```

## Benefits of Migration

### 1. Code Reuse
- No more duplicating utility code across examples
- Consistent behavior across all examples
- Easier maintenance

### 2. Pre-configured Models
- Ready-to-use configurations for popular MediaPipe models
- No need to remember model URLs and settings
- Easy to switch between models

### 3. Better Organization
- Clear separation between utilities and example-specific code
- Standardized API across all examples
- Better TypeScript support

### 4. Enhanced Features
- Generic video processor for any model
- Improved error handling
- Better performance monitoring
- More flexible canvas management

## Example Migration: Background Example

### Before
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';
import { WebGLRenderer } from './WebGLRenderer';
import { VideoProcessor } from './VideoProcessor';
import { CanvasManager } from './CanvasManager';
import { FPSDisplay } from './FPSDisplay';

const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite';

const App: React.FC = () => {
  // ... component code
  
  // Initialize webcam
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ 
      video: { 
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      } 
    })
      .then((stream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err) => setError('Could not access webcam: ' + err));
  }, []);

  // Load the segmenter
  useEffect(() => {
    async function loadSegmenter() {
      if (!webglCanvasRef.current) return;
      
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks('wasm');
        const segmenter = await ImageSegmenter.createFromOptions(filesetResolver, {
          baseOptions: { 
            modelAssetPath: MODEL_PATH,
            delegate: "GPU"
          },
          outputCategoryMask: true,
          canvas: webglCanvasRef.current,
          runningMode: "VIDEO"
        });
        
        if (videoProcessorRef.current) {
          videoProcessorRef.current.setSegmenter(segmenter);
          videoProcessorRef.current.startProcessing(videoRef.current!);
        }
      } catch (e: any) {
        setError('Failed to load segmenter: ' + e.message);
      }
    }
    loadSegmenter();
  }, [webglCanvasRef.current]);
};
```

### After
```typescript
import React, { useEffect, useRef, useState } from 'react';
import { 
  WebGLRenderer, 
  VideoProcessor, 
  CanvasManager, 
  FPSDisplay,
  loadVisionModel,
  getModelConfig,
  initializeWebcam
} from '@mediapipe/web-common';

const App: React.FC = () => {
  // ... component code
  
  // Initialize webcam
  useEffect(() => {
    initializeWebcam()
      .then((stream: MediaStream) => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      })
      .catch((err: any) => setError('Could not access webcam: ' + err));
  }, []);

  // Load the segmenter
  useEffect(() => {
    async function loadSegmenter() {
      if (!webglCanvasRef.current) return;
      
      try {
        const config = getModelConfig('imageSegmenter');
        const segmenter = await loadVisionModel('ImageSegmenter', config, webglCanvasRef.current);
        
        if (videoProcessorRef.current) {
          videoProcessorRef.current.setSegmenter(segmenter);
          videoProcessorRef.current.startProcessing(videoRef.current!);
        }
      } catch (e: any) {
        setError('Failed to load segmenter: ' + e.message);
      }
    }
    loadSegmenter();
  }, [webglCanvasRef.current]);
};
```

## Creating New Examples

For new examples, you can now use the common utilities directly:

```typescript
import {
  loadVisionModel,
  getModelConfig,
  initializeWebcam,
  GenericVideoProcessor,
  CanvasManager,
  FPSDisplay
} from '@mediapipe/web-common';

// Choose your model
const config = getModelConfig('faceDetector'); // or 'handLandmarker', 'poseLandmarker', etc.
const model = await loadVisionModel('FaceDetector', config, canvas);

// Use generic processor for any model
const processor = new GenericVideoProcessor();
processor.setModel(model);
processor.setProcessCallback((video, result) => {
  // Handle results
});
processor.startProcessing(video, 'detectForVideo');
```

## Troubleshooting Migration

### Common Issues

1. **Import errors**
   - Make sure you've installed the common package
   - Check that the package is built (`npm run build` in common directory)

2. **Type errors**
   - Add proper type annotations for MediaStream and error parameters
   - Use the correct method names for different models

3. **Build errors**
   - Ensure Vite configuration is updated
   - Check that MediaPipe dependency is installed

4. **Runtime errors**
   - Verify that the common package is properly linked
   - Check browser console for detailed error messages

## Next Steps

After migration:

1. **Test thoroughly** - Ensure all functionality works as expected
2. **Update documentation** - Update any example-specific documentation
3. **Consider enhancements** - Use new features like GenericVideoProcessor
4. **Share improvements** - Contribute back to the common package

## Support

If you encounter issues during migration:

1. Check the [Usage Guide](USAGE.md) for detailed examples
2. Review the [README](README.md) for package overview
3. Look at the background example for a complete working implementation
4. Check the TypeScript definitions in the common package 