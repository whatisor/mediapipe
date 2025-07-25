// examples/web/face-landmark-transfer/src/WebGLFaceWarp.tsx

import React, { useEffect, useRef } from 'react';
import { WebGLRenderer } from './WebGLRenderer';

export type NormalizedLandmark = { x: number; y: number; z?: number };

interface WebGLFaceWarpProps {
  sourceImage: HTMLImageElement | string;
  sourceLandmarks: NormalizedLandmark[];
  targetLandmarks: NormalizedLandmark[];
  width: number;
  height: number;
  videoFrame?: HTMLVideoElement;
}

export const WebGLFaceWarp: React.FC<WebGLFaceWarpProps> = ({
  sourceImage,
  sourceLandmarks,
  targetLandmarks,
  width,
  height,
  videoFrame,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Initialize renderer and handle cleanup
  useEffect(() => {
    if (canvasRef.current && !rendererRef.current) {
      rendererRef.current = new WebGLRenderer(canvasRef.current);
    }

    return () => {
      if (rendererRef.current) {
        rendererRef.current.destroy();
        rendererRef.current = null;
      }
    };
  }, []);

  // Handle image loading from URL
  useEffect(() => {
    if (typeof sourceImage === 'string') {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.src = sourceImage;
      img.onload = () => {
        imageRef.current = img;
      };
    } else {
      imageRef.current = sourceImage;
    }
  }, [sourceImage]);

  // Re-render whenever props change
  useEffect(() => {
    if (rendererRef.current && imageRef.current && sourceLandmarks.length > 0 && targetLandmarks.length > 0) {
      if (canvasRef.current) {
        canvasRef.current.width = width;
        canvasRef.current.height = height;
      }
      
      rendererRef.current.render(
        imageRef.current,
        videoFrame,
        sourceLandmarks,
        targetLandmarks
      );
    }
  }, [sourceImage, sourceLandmarks, targetLandmarks, videoFrame, width, height]);

  return <canvas ref={canvasRef} width={width} height={height} />;
};