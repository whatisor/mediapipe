import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  loadVisionModel,
  initializeWebcam,
  GenericVideoProcessor,
  CanvasManager,
  FPSDisplay
} from '@mediapipe/web-common';
import { FaceLandmarkTransfer, FaceLandmarks } from './utils/FaceLandmarkTransfer';
import { DrawingUtils, FaceLandmarker } from '@mediapipe/tasks-vision';
import { WebGLFaceWarp, NormalizedLandmark } from './WebGLFaceWarp';

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sourceImageRef = useRef<HTMLImageElement>(null);
  const [inputFPS, setInputFPS] = useState(0);
  const [outputFPS, setOutputFPS] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showLandmarks, setShowLandmarks] = useState(false);
  const [sourceLandmarks, setSourceLandmarks] = useState<FaceLandmarks | null>(null);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isImageModelReady, setIsImageModelReady] = useState(false);
  const [liveLandmarks, setLiveLandmarks] = useState<FaceLandmarks | null>(null);

  const videoProcessorRef = useRef<GenericVideoProcessor | null>(null);
  const canvasManagerRef = useRef<CanvasManager | null>(null);
  const imageModelRef = useRef<any>(null); // For processing static images
  const videoModelRef = useRef<any>(null); // For processing video
  const previewCanvasRef = useRef<HTMLCanvasElement>(null); // For showing source image with landmarks
  const livePreviewCanvasRef = useRef<HTMLCanvasElement>(null); // For showing live camera with landmarks

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

  const onFrame = useCallback((video: HTMLVideoElement, result: any) => {
    console.log('onFrame');
      if (result.faceLandmarks && result.faceLandmarks.length > 0) {
        const landmarks = result.faceLandmarks[0];
        const faceLandmarks: FaceLandmarks = {
          landmarks: landmarks.map((point: any) => ({
            x: point.x * (canvasRef.current?.width || 300),
            y: point.y * (canvasRef.current?.height || 300),
            z: point.z
          }))
        };
        setLiveLandmarks(faceLandmarks);

        // Render live camera with landmarks on preview canvas (unchanged)
        if (livePreviewCanvasRef.current && video) {
          const liveCtx = livePreviewCanvasRef.current.getContext('2d');
          if (liveCtx) {
            livePreviewCanvasRef.current.width = video.videoWidth;
            livePreviewCanvasRef.current.height = video.videoHeight;
            liveCtx.drawImage(video, 0, 0);
            const drawingUtils = new DrawingUtils(liveCtx);
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_TESSELATION,
              { color: '#00FF00', lineWidth: 0.5 }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
              { color: '#FF3030' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
              { color: '#FF3030' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
              { color: '#30FF30' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
              { color: '#30FF30' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
              { color: '#E0E0E0' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LIPS,
              { color: '#E0E0E0' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
              { color: '#FF3030' }
            );
            drawingUtils.drawConnectors(
              landmarks,
              FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
              { color: '#30FF30' }
            );
          }
        }
      }
    }, [sourceLandmarks]);

  // Load face landmark model for IMAGE mode (static image processing)
  async function loadImageModel() {
    console.log('loadImageModel');
    try {
      const imageConfig = {
        modelPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'CPU' as const,
        runningMode: 'IMAGE' as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      };
      const imageModel = await loadVisionModel('FaceLandmarker', imageConfig);
      imageModelRef.current = imageModel;
      setIsImageModelReady(true);
    } catch (e: any) {
      setError('Failed to load face landmark image model: ' + e.message);
    }
  }

  // Load face landmark model for VIDEO mode (live camera processing)
  async function loadVideoModel() {
    console.log('loadVideoModel');
    try {
      const videoConfig = {
        modelPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU' as const,
        runningMode: 'VIDEO' as const,
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minFacePresenceConfidence: 0.5,
        minTrackingConfidence: 0.5
      };
      const videoModel = await loadVisionModel('FaceLandmarker', videoConfig);
      videoModelRef.current = videoModel;
      setIsModelReady(true);
      // Setup video processor with VIDEO mode model
      const processor = new GenericVideoProcessor();
      processor.setModel(videoModel);
      processor.setProcessCallback(onFrame);
      videoProcessorRef.current = processor;
      if (videoRef.current && canvasRef.current) {
        const canvasManager = new CanvasManager(canvasRef.current, videoRef.current);
        canvasManagerRef.current = canvasManager;
        canvasManager.setupCanvasSizing();
      }
    } catch (e: any) {
      setError('Failed to load face landmark video model: ' + e.message);
    }
  }

  // Update useEffect to call both model loaders
  useEffect(() => {
    if(sourceLandmarks && sourceImageRef.current) {
      loadVideoModel();
    }
  }, [showLandmarks,sourceLandmarks]);

  // Start processing when source image is loaded
  useEffect(() => {
    if (isModelReady && videoProcessorRef.current && videoRef.current) {
      console.log('startProcessing');
      videoProcessorRef.current.startProcessing(videoRef.current, 'detectForVideo');
      setIsProcessing(true);
    }
  }, [isModelReady]);

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

  // Handle source image upload
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && sourceImageRef.current) {
      // Clear previous landmarks and previews
      setSourceLandmarks(null);
      if (previewCanvasRef.current) {
        const previewCtx = previewCanvasRef.current.getContext('2d');
        if (previewCtx) {
          previewCtx.clearRect(0, 0, previewCanvasRef.current.width, previewCanvasRef.current.height);
        }
      }
      if (livePreviewCanvasRef.current) {
        const liveCtx = livePreviewCanvasRef.current.getContext('2d');
        if (liveCtx) {
          liveCtx.clearRect(0, 0, livePreviewCanvasRef.current.width, livePreviewCanvasRef.current.height);
        }
      }
      
      const reader = new FileReader();
      reader.onload = (e) => {
        if (sourceImageRef.current && e.target?.result) {
          sourceImageRef.current.src = e.target.result as string;
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle source image load
  const handleSourceImageLoad = async () => {
    console.log('handleSourceImageLoad');
    await loadImageModel();
    if (sourceImageRef.current &&  imageModelRef.current) {
      try {
        // Create a canvas to draw the image for processing
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = sourceImageRef.current.naturalWidth;
        tempCanvas.height = sourceImageRef.current.naturalHeight;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx?.drawImage(sourceImageRef.current, 0, 0);
        
        // Create ImageBitmap for processing
        const imageBitmap = await createImageBitmap(tempCanvas);
        
        // Detect landmarks on the source image using IMAGE mode model
        const result = await imageModelRef.current.detect(imageBitmap);
        
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          const landmarks = result.faceLandmarks[0];
          const faceLandmarks: FaceLandmarks = {
            landmarks: landmarks.map((point: any) => ({
              x: point.x * sourceImageRef.current!.naturalWidth,
              y: point.y * sourceImageRef.current!.naturalHeight,
              z: point.z
            }))
          };

          console.log('faceLandmarks', faceLandmarks);
          setSourceLandmarks(faceLandmarks);
          
          // Render the source image with detected landmarks on preview canvas
          if (previewCanvasRef.current) {
            const previewCtx = previewCanvasRef.current.getContext('2d');
            if (previewCtx) {
              // Set canvas size to match source image
              previewCanvasRef.current.width = sourceImageRef.current!.naturalWidth;
              previewCanvasRef.current.height = sourceImageRef.current!.naturalHeight;
              // Draw the source image
              previewCtx.drawImage(sourceImageRef.current!, 0, 0);
              // Use DrawingUtils directly on the result from imageModelRef
              const drawingUtils = new DrawingUtils(previewCtx);
              for (const landmarks of result.faceLandmarks) {
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_TESSELATION,
                  { color: '#00FF00', lineWidth: 0.5 }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE,
                  { color: '#FF3030' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW,
                  { color: '#FF3030' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_EYE,
                  { color: '#30FF30' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW,
                  { color: '#30FF30' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_FACE_OVAL,
                  { color: '#E0E0E0' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LIPS,
                  { color: '#E0E0E0' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS,
                  { color: '#FF3030' }
                );
                drawingUtils.drawConnectors(
                  landmarks,
                  FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS,
                  { color: '#30FF30' }
                );
              }
            }
          }
        } else {
          setError('No face detected in the uploaded image. Please try a different image.');
        }
        
        // Clean up
        imageBitmap.close();
      } catch (error) {
        console.error('Error processing source image:', error);
        setError('Failed to process source image: ' + error);
      }
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h1>Face Landmark Transfer</h1>
      <p>Transfer facial expressions from live camera to a static image</p>
      
      {error && <div style={{ color: 'red', marginBottom: '20px' }}>{error}</div>}
      
      <div style={{ marginBottom: '20px' }}>
        <label htmlFor="imageUpload" style={{ marginRight: '10px' }}>
          Upload Source Image:
        </label>
        <input
          id="imageUpload"
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ marginRight: '10px' }}
        />
        <button
          onClick={() => setShowLandmarks(!showLandmarks)}
          style={{ marginRight: '10px' }}
        >
          {showLandmarks ? 'Hide' : 'Show'} Landmarks
        </button>
        <span style={{ color: isProcessing ? 'green' : 'orange' }}>
          {isProcessing ? 'Processing' : 'Waiting for source image'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start' }}>
        {/* Source Image */}
        <div style={{ textAlign: 'center' }}>
          <h3>Source Image</h3>
          {<img
            ref={sourceImageRef}
            src="face1.jpeg"
            onLoad={handleSourceImageLoad}
            style={{
              width: '300px',
              height: '300px',
              border: '2px solid #ccc',
              objectFit: 'cover',
            }}
            alt="Source"
          />}
        </div>

        {/* Source Image with Landmarks Preview */}
        <div style={{ textAlign: 'center' }}>
          <h3>Detected Landmarks</h3>
          <canvas
            ref={previewCanvasRef}
            style={{
              width: '300px',
              height: '300px',
              border: '2px solid #ccc',
              backgroundColor: '#f0f0f0',
              objectFit: 'contain'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Green dots show detected face landmarks
          </p>
        </div>

        {/* Live Video */}
        <div style={{ textAlign: 'center' }}>
          <h3>Live Camera</h3>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            style={{
              width: '300px',
              height: '300px',
              border: '2px solid #ccc',
              objectFit: 'cover'
            }}
          />
        </div>

        {/* Live Camera with Landmarks */}
        <div style={{ textAlign: 'center' }}>
          <h3>Live Landmarks</h3>
          <canvas
            ref={livePreviewCanvasRef}
            style={{
              width: '300px',
              height: '300px',
              border: '2px solid #ccc',
              backgroundColor: '#f0f0f0',
              objectFit: 'contain'
            }}
          />
          <p style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
            Red dots show live face landmarks
          </p>
        </div>


      </div>
      {/* Animated Result */}
        <div style={{ textAlign: 'center' }}>
          <h3>Animated Result</h3>
          {sourceLandmarks && isModelReady && sourceImageRef.current && liveLandmarks && (
            <WebGLFaceWarp
              sourceImage={sourceImageRef.current}
              sourceLandmarks={sourceLandmarks.landmarks.map((lm: any) => ({
                x: lm.x / sourceImageRef.current!.naturalWidth,
                y: lm.y / sourceImageRef.current!.naturalHeight,
                z: lm.z
              })) as NormalizedLandmark[]}
              targetLandmarks={liveLandmarks.landmarks.map((lm: any) => ({
                x: lm.x / sourceImageRef.current!.naturalWidth,
                y: lm.y / sourceImageRef.current!.naturalHeight,
                z: lm.z
              })) as NormalizedLandmark[]}
              width={sourceImageRef.current.naturalWidth}
              height={sourceImageRef.current.naturalHeight}
            />
          )}
        </div>

      <FPSDisplay inputFPS={inputFPS} outputFPS={outputFPS} />
      
      <div style={{ marginTop: '20px', textAlign: 'center', maxWidth: '600px' }}>
        <h3>How it works:</h3>
        <ol style={{ textAlign: 'left' }}>
          <li>Upload a source image with a face</li>
          <li>The system detects face landmarks on both the source image and live camera</li>
          <li>Facial expressions from the live camera are transferred to the source image</li>
          <li>The result shows the source image with animated facial expressions</li>
        </ol>
        <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
          This demonstrates real-time facial expression transfer using MediaPipe face landmark detection.
        </p>
      </div>
    </div>
  );
};

export default App; 