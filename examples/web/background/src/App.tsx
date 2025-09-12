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
  const videoRef = useRef<HTMLVideoElement>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputFPS, setInputFPS] = useState<number>(0);
  const [outputFPS, setOutputFPS] = useState<number>(0);
  const [isReady, setIsReady] = useState<boolean>(false);
  
  const videoProcessorRef = useRef<VideoProcessor | null>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);

  // Initialize WebGL renderer and video processor
  useEffect(() => {
    if (webglCanvasRef.current) {
      try {
        const renderer = new WebGLRenderer(webglCanvasRef.current);
        const processor = new VideoProcessor();
        processor.setRenderer(renderer);
        processor.setOnReady(() => setIsReady(true));
        videoProcessorRef.current = processor;
      } catch (err: any) {
        setError(err.message);
      }
    }
  }, []);

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
      // @ts-ignore
      if (videoProcessorRef.current.segmenter) return;
      if(!webglCanvasRef.current) return;
      if(webglCanvasRef.current.width === 0 || webglCanvasRef.current.height === 0) return;
      
      try {
        console.log('loadSegmenter', webglCanvasRef.current.width, webglCanvasRef.current.height);
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
          <div style={{ position: 'relative', width: 640, height: 480 }}>
            <canvas ref={webglCanvasRef} width={640} height={480} style={{
              border: '1px solid #ccc', maxWidth: '100%', height: 'auto' }} />
            {!isReady && (
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'rgba(255,255,255,0.6)'
              }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="#888" strokeWidth="4" opacity="0.25" />
                  <path d="M22 12a10 10 0 0 0-10-10" stroke="#555" strokeWidth="4" strokeLinecap="round">
                    <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite" />
                  </path>
                </svg>
              </div>
            )}
          </div>
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
