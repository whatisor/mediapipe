// examples/web/face-landmark-transfer/src/App.tsx

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  loadVisionModel,
  initializeWebcam,
  GenericVideoProcessor,
} from '@mediapipe/web-common';
import { FaceLandmarks } from './utils/FaceLandmarkTransfer';
import { WebGLFaceWarp } from './WebGLFaceWarp';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const videoProcessorRef = useRef<GenericVideoProcessor | null>(null);
  const imageModelRef = useRef<any>(null);

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceLandmarks, setSourceLandmarks] = useState<FaceLandmarks | null>(null);
  const [liveLandmarks, setLiveLandmarks] = useState<FaceLandmarks | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);

  // Callback to store live landmarks from the video processor
  const onFrame = useCallback((result: any) => {
    if (result.faceLandmarks && result.faceLandmarks.length > 0) {
      setLiveLandmarks({ landmarks: result.faceLandmarks[0] });
    }
  }, []);

  // Centralized setup effect for models and webcam
  useEffect(() => {
    async function setup() {
      try {
        // Load both models concurrently
        const [imageModel, videoModel] = await Promise.all([
          loadVisionModel('FaceLandmarker', {
            modelPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
            runningMode: 'IMAGE',
          }),
          loadVisionModel('FaceLandmarker', {
            modelPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
            delegate: 'GPU',
            runningMode: 'VIDEO',
          })
        ]);
        
        imageModelRef.current = imageModel;

        const processor = new GenericVideoProcessor();
        processor.setModel(videoModel);
        processor.setProcessCallback((_video, result) => onFrame(result));
        videoProcessorRef.current = processor;
        

        // Initialize webcam after models are ready
        const stream = await initializeWebcam();
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }

        setModelsLoaded(true);

      } catch (e: any) {
        setError(`Setup failed: ${e.message}`);
      }
    }
    setup();
  }, [onFrame]);

  // Process the source image when it loads, but only if models are ready
  const handleSourceImageLoad = useCallback(async () => {
    if (!modelsLoaded || !sourceImageRef.current || !imageModelRef.current) {
      console.warn("Source image loaded, but models are not ready yet.");
      return;
    }
    try {
      console.log('Detecting landmarks in source image...');
      const result = imageModelRef.current.detect(sourceImageRef.current);
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        setSourceLandmarks({ landmarks: result.faceLandmarks[0] });
      } else {
        setError("No landmarks detected in the source image.");
      }
    } catch (e: any) {
      setError(`Failed to process source image: ${e.message}`);
    }
  }, [modelsLoaded]);

  useEffect(() => {
    if(sourceLandmarks) return;
    handleSourceImageLoad();
  }, [modelsLoaded, sourceLandmarks]);
  
  // Start video processing only when source landmarks have been detected
  useEffect(() => {
    if (sourceLandmarks && videoProcessorRef.current && videoRef.current?.srcObject) {
      console.log('Starting video processing...');
      videoProcessorRef.current.startProcessing(videoRef.current, 'detectForVideo');
      setIsProcessing(true);
    }
  }, [sourceLandmarks]);

  // Handle pausing/resuming when the browser tab's visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!videoRef.current || !isProcessing) return;

      if (document.hidden) {
        videoProcessorRef.current?.stopProcessing();
      } else {
        videoProcessorRef.current?.startProcessing(videoRef.current, 'detectForVideo');
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isProcessing]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
      <h1>Face Landmark Transfer</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        <div>
          <h3>Source Image</h3>
          <img
            ref={sourceImageRef}
            src="face1.jpeg" // Make sure this is in the /public folder
            onLoad={handleSourceImageLoad}
            style={{ width: '300px', height: 'auto', border: '2px solid #ccc' }}
            alt="Source"
            crossOrigin="anonymous"
          />
        </div>
        
        <div>
          <h3>Animated Result</h3>
          <div style={{ width: 300, height: 300, border: '2px solid #ccc', background: '#000' }}>
            {sourceLandmarks && modelsLoaded && sourceImageRef.current && liveLandmarks && videoRef.current ? (
              <WebGLFaceWarp
                sourceImage={sourceImageRef.current}
                sourceLandmarks={sourceLandmarks.landmarks}
                targetLandmarks={liveLandmarks.landmarks}
                width={sourceImageRef.current.naturalWidth}
                height={sourceImageRef.current.naturalHeight}
                videoFrame={videoRef.current}
              />
            ) : <p style={{ color: 'white', textAlign: 'center', paddingTop: '40%' }}>Waiting for models and landmarks...</p>}
          </div>
        </div>
      </div>

      <video ref={videoRef} autoPlay playsInline style={{ display: 'none' }} />
    </div>
  );
};

export default App;