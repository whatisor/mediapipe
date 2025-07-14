import React, { useEffect, useRef, useState } from 'react';
import { ImageSegmenter, FilesetResolver } from '@mediapipe/tasks-vision';
import { WebGLRenderer } from './WebGLRenderer';
import { VideoProcessor } from './VideoProcessor';
import { CanvasManager } from './CanvasManager';
import { FPSDisplay } from './FPSDisplay';

const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter_landscape/float16/latest/selfie_segmenter_landscape.tflite';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputFPS, setInputFPS] = useState<number>(0);
  const [outputFPS, setOutputFPS] = useState<number>(0);
  
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);

  // Initialize WebGL renderer and video processor
  useEffect(() => {
    if (webglCanvasRef.current) {
      try {
        const renderer = new WebGLRenderer(webglCanvasRef.current);
        const processor = new VideoProcessor();
        processor.setRenderer(renderer);
        videoProcessorRef.current = processor;
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, []);

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
        const filesetResolver = await FilesetResolver.forVisionTasks(
          '/node_modules/@mediapipe/tasks-vision/wasm'
        );
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

  // Setup canvas sizing
  useEffect(() => {
    if (videoRef.current && webglCanvasRef.current) {
      const canvasManager = new CanvasManager(webglCanvasRef.current, videoRef.current);
      canvasManagerRef.current = canvasManager;
      const cleanup = canvasManager.setupCanvasSizing();
      return cleanup;
    }
  }, []);


  // Update FPS display
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoProcessorRef.current) {
        setInputFPS(videoProcessorRef.current.getInputFPS());
        setOutputFPS(videoProcessorRef.current.getOutputFPS());
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <h1>MediaPipe Vision Image Segmenter - Background Extraction (WebGL Optimized)</h1>
      {error && <div style={{ color: 'red' }}>{error}</div>}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ position: 'relative' }}>
          <h2>Background Extracted (WebGL)</h2><video ref={videoRef} autoPlay playsInline muted style={{ 
            position: 'absolute', 
            top: '0px', 
            left: '0px',
            pointerEvents: 'none',
            width: '1px',
            height: '1px',
            zIndex: 0
          }} />
          <canvas ref={webglCanvasRef} width={640} height={480} style={{
            border: '1px solid #ccc', maxWidth: '100%', height: 'auto' }} />
          {/* Hidden video element for processing */}
          
          <FPSDisplay inputFPS={inputFPS} outputFPS={outputFPS} />
        </div>
      </div>
      <p style={{ marginTop: 20 }}>
        Optimized with WebGL rendering for better performance.
      </p>
    </div>
  );
};

export default App;
