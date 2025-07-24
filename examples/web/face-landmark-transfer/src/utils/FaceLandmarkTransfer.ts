/**
 * Face Landmark Transfer Utility
 * Transfers facial expressions from live camera to a static image
 */

import { FACEMESH_TRIANGLES } from './faceMeshTriangles';
import Delaunator from 'delaunator';

export interface LandmarkPoint {
  x: number;
  y: number;
  z?: number;
}

export interface FaceLandmarks {
  landmarks: LandmarkPoint[];
  faceBlendshapes?: any[];
}

export class FaceLandmarkTransfer {
  private sourceImage: HTMLImageElement | null = null;
  private sourceLandmarks: FaceLandmarks | null = null;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sourceImageWidth: number = 0;
  private sourceImageHeight: number = 0;
  private triangles: number[] | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context from canvas');
    }
    this.ctx = context;
  }

  /**
   * Set the source image and its landmarks
   */
  setSourceImage(image: HTMLImageElement, landmarks: FaceLandmarks): void {
    this.sourceImage = image;
    this.sourceLandmarks = landmarks;
    this.sourceImageWidth = image.naturalWidth;
    this.sourceImageHeight = image.naturalHeight;
    // Set canvas size to match the image's natural size
    this.canvas.width = this.sourceImageWidth;
    this.canvas.height = this.sourceImageHeight;
    // Draw the source image at its natural size
    this.ctx.drawImage(image, 0, 0, this.sourceImageWidth, this.sourceImageHeight);
  }

  /**
   * Transfer landmarks from live video to the source image
   */
  transferLandmarks(liveLandmarks: FaceLandmarks): void {
    if (!this.sourceImage || !this.sourceLandmarks) {
      console.warn('Source image and landmarks not set');
      return;
    }

    // Clear canvas and draw source image
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.sourceImage, 0, 0, this.sourceImageWidth, this.sourceImageHeight);

    // Simple approach: Draw live landmarks on top of source image
    // This shows the transfer effect by visualizing the live landmarks on the source image
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 2;
    this.ctx.fillStyle = '#FF0000';

    liveLandmarks.landmarks.forEach((landmark, index) => {
      // If landmarks are in 300x300 space, scale to image size
      // Otherwise, assume they are already in image pixel coordinates
      let x = landmark.x;
      let y = landmark.y;
      // If the landmarks are normalized (0-1), scale up
      if (x <= 1 && y <= 1) {
        x = x * this.sourceImageWidth;
        y = y * this.sourceImageHeight;
      }

      this.ctx.beginPath();
      this.ctx.arc(x, y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
      // Draw landmark index for key points
      if (index % 50 === 0) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(index.toString(), x + 3, y - 3);
        this.ctx.fillStyle = '#FF0000';
      }
    });

    // Draw facial outline to show the transfer effect
    this.drawFacialOutline(liveLandmarks);
  }

  /**
   * Animate the source image by warping it to match the target (live) landmarks
   * Uses Delaunator for triangulation
   */
  animateToLandmarks(targetLandmarks: FaceLandmarks): void {
    if (!this.sourceImage || !this.sourceLandmarks) {
      console.warn('Source image and landmarks not set');
      return;
    }
    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // Prepare normalized points (0-1) for Delaunator
    const width = this.sourceImageWidth;
    const height = this.sourceImageHeight;
    const srcPts: [number, number][] = this.sourceLandmarks.landmarks.map(lm => [
      (lm.x <= 1 ? lm.x : lm.x / width),
      (lm.y <= 1 ? lm.y : lm.y / height)
    ]);
    const tgtPts: [number, number][] = targetLandmarks.landmarks.map(lm => [
      (lm.x <= 1 ? lm.x : lm.x / width),
      (lm.y <= 1 ? lm.y : lm.y / height)
    ]);
    // Delaunay triangulation on source points
    if(!this.triangles) {
      const delaunay = Delaunator.from(srcPts);
      this.triangles = delaunay.triangles;
      if(!this.triangles) {
        console.error('Failed to create triangles');
        return;
      }
    }
    // Scale points to image size for warping
    const srcPixelPts = srcPts.map(([x, y]) => [x * width, y * height] as [number, number]);
    const tgtPixelPts = tgtPts.map(([x, y]) => [x * width, y * height] as [number, number]);
    // For each triangle, warp from source to target
    for (let i = 0; i < this.triangles.length; i += 3) {
      const i0 = this.triangles[i];
      const i1 = this.triangles[i + 1];
      const i2 = this.triangles[i + 2];
      const srcTri: [number, number][] = [
        srcPixelPts[i0],
        srcPixelPts[i1],
        srcPixelPts[i2]
      ];
      const tgtTri: [number, number][] = [
        tgtPixelPts[i0],
        tgtPixelPts[i1],
        tgtPixelPts[i2]
      ];
      this.warpTriangle(this.sourceImage, srcTri, tgtTri);
    }
  }

  /**
   * Get (x, y) pixel coordinates from a landmark, handling normalization
   */
  private getLandmarkCoords(lm: LandmarkPoint | undefined): [number, number] {
    if (!lm || typeof lm.x !== 'number' || typeof lm.y !== 'number') return [0, 0];
    let x = lm.x;
    let y = lm.y;
    if (x <= 1 && y <= 1) {
      x = x * this.sourceImageWidth;
      y = y * this.sourceImageHeight;
    }
    return [x, y];
  }

  /**
   * Warp a triangle from the source image to the target triangle on the canvas
   */
  private warpTriangle(image: HTMLImageElement, srcTri: [number, number][], tgtTri: [number, number][][]) {
    // Create bounding rectangles
    const srcRect = this.boundingRect(srcTri);
    const tgtRect = this.boundingRect(tgtTri);
    // Offset triangle points to bounding box
    const srcTriOffset = srcTri.map(([x, y]) => [x - srcRect.x, y - srcRect.y]);
    const tgtTriOffset = tgtTri.map(([x, y]) => [x - tgtRect.x, y - tgtRect.y]);
    // Create temporary canvas for the source triangle
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = srcRect.w;
    srcCanvas.height = srcRect.h;
    const srcCtx = srcCanvas.getContext('2d')!;
    // Draw the source triangle region
    srcCtx.save();
    srcCtx.beginPath();
    srcCtx.moveTo(srcTriOffset[0][0], srcTriOffset[0][1]);
    srcCtx.lineTo(srcTriOffset[1][0], srcTriOffset[1][1]);
    srcCtx.lineTo(srcTriOffset[2][0], srcTriOffset[2][1]);
    srcCtx.closePath();
    srcCtx.clip();
    srcCtx.drawImage(
      image,
      srcRect.x, srcRect.y, srcRect.w, srcRect.h,
      0, 0, srcRect.w, srcRect.h
    );
    srcCtx.restore();
    // Compute affine transform
    const transform = this.computeAffineTransform(srcTriOffset, tgtTriOffset);
    // Draw the warped triangle onto the main canvas
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.moveTo(tgtTri[0][0], tgtTri[0][1]);
    this.ctx.lineTo(tgtTri[1][0], tgtTri[1][1]);
    this.ctx.lineTo(tgtTri[2][0], tgtTri[2][1]);
    this.ctx.closePath();
    this.ctx.clip();
    this.ctx.setTransform(
      transform.a, transform.b, transform.c, transform.d, transform.e + tgtRect.x, transform.f + tgtRect.y
    );
    this.ctx.drawImage(srcCanvas, 0, 0);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.restore();
  }

  /**
   * Compute the affine transform from srcTri to tgtTri
   */
  private computeAffineTransform(src: [number, number][], tgt: [number, number][]) {
    // Solve for affine transform matrix
    // [x']   [a c e] [x]
    // [y'] = [b d f] [y]
    // [1 ]   [0 0 1] [1]
    const [[x0, y0], [x1, y1], [x2, y2]] = src;
    const [[u0, v0], [u1, v1], [u2, v2]] = tgt;
    // Solve linear system for a,b,c,d,e,f
    // Using Cramer's rule or matrix inversion
    const det = (x0*(y1-y2) + x1*(y2-y0) + x2*(y0-y1));
    if (det === 0) return {a:1,b:0,c:0,d:1,e:0,f:0};
    const a = ((u0*(y1-y2) + u1*(y2-y0) + u2*(y0-y1)))/det;
    const b = ((v0*(y1-y2) + v1*(y2-y0) + v2*(y0-y1)))/det;
    const c = ((u0*(x2-x1) + u1*(x0-x2) + u2*(x1-x0)))/det;
    const d = ((v0*(x2-x1) + v1*(x0-x2) + v2*(x1-x0)))/det;
    const e = ((u0*(x1*y2-x2*y1) + u1*(x2*y0-x0*y2) + u2*(x0*y1-x1*y0)))/det;
    const f = ((v0*(x1*y2-x2*y1) + v1*(x2*y0-x0*y2) + v2*(x0*y1-x1*y0)))/det;
    return {a, b, c, d, e, f};
  }

  /**
   * Get bounding rectangle for a triangle
   */
  private boundingRect(tri: [number, number][]) {
    const xs = tri.map(([x]) => x);
    const ys = tri.map(([,y]) => y);
    const x = Math.floor(Math.min(...xs));
    const y = Math.floor(Math.min(...ys));
    const w = Math.ceil(Math.max(...xs)) - x;
    const h = Math.ceil(Math.max(...ys)) - y;
    return {x, y, w, h};
  }

  /**
   * Draw facial outline to show the transfer effect
   */
  private drawFacialOutline(liveLandmarks: FaceLandmarks): void {
    // Define facial outline points (simplified face shape)
    const outlinePoints = [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
      397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
      172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109
    ];

    this.ctx.strokeStyle = '#00FF00';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();

    outlinePoints.forEach((index, i) => {
      if (liveLandmarks.landmarks[index]) {
        const landmark = liveLandmarks.landmarks[index];
        let x = landmark.x;
        let y = landmark.y;
        if (x <= 1 && y <= 1) {
          x = x * this.sourceImageWidth;
          y = y * this.sourceImageHeight;
        }
        if (i === 0) {
          this.ctx.moveTo(x, y);
        } else {
          this.ctx.lineTo(x, y);
        }
      }
    });

    this.ctx.closePath();
    this.ctx.stroke();
  }

  /**
   * Calculate transformation matrix between source and live landmarks
   */
  private calculateTransformation(
    sourceLandmarks: LandmarkPoint[],
    liveLandmarks: LandmarkPoint[]
  ): DOMMatrix {
    // Use key facial points for transformation calculation
    const keyPoints = [10, 50, 280, 454]; // Left eye, right eye, nose, mouth center
    
    const sourcePoints: DOMPoint[] = [];
    const livePoints: DOMPoint[] = [];

    keyPoints.forEach(index => {
      if (sourceLandmarks[index] && liveLandmarks[index]) {
        sourcePoints.push(new DOMPoint(sourceLandmarks[index].x, sourceLandmarks[index].y));
        livePoints.push(new DOMPoint(liveLandmarks[index].x, liveLandmarks[index].y));
      }
    });

    // Calculate affine transformation
    return this.calculateAffineTransform(sourcePoints, livePoints);
  }

  /**
   * Calculate affine transformation matrix
   */
  private calculateAffineTransform(
    sourcePoints: DOMPoint[],
    targetPoints: DOMPoint[]
  ): DOMMatrix {
    if (sourcePoints.length < 3 || targetPoints.length < 3) {
      return new DOMMatrix();
    }

    // Simple approach: use the first 2 points to calculate transformation
    const src1 = sourcePoints[0];
    const src2 = sourcePoints[1];
    
    const tgt1 = targetPoints[0];
    const tgt2 = targetPoints[1];

    // Calculate scale and rotation
    const srcVec1 = { x: src2.x - src1.x, y: src2.y - src1.y };
    const tgtVec1 = { x: tgt2.x - tgt1.x, y: tgt2.y - tgt1.y };

    // Calculate transformation matrix
    const matrix = new DOMMatrix();
    
    // Translation
    matrix.translateSelf(tgt1.x - src1.x, tgt1.y - src1.y);
    
    // Scale and rotation (simplified)
    const srcLen1 = Math.sqrt(srcVec1.x * srcVec1.x + srcVec1.y * srcVec1.y);
    const tgtLen1 = Math.sqrt(tgtVec1.x * tgtVec1.x + tgtVec1.y * tgtVec1.y);
    const scale = tgtLen1 / srcLen1;
    
    matrix.scaleSelf(scale, scale);
    
    return matrix;
  }

  /**
   * Apply facial transformation to the image
   */
  private applyFacialTransformation(transform: DOMMatrix, liveLandmarks: FaceLandmarks): void {
    // Define facial regions to transform
    const facialRegions = [
      { name: 'leftEye', indices: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246] },
      { name: 'rightEye', indices: [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398] },
      { name: 'mouth', indices: [61, 84, 17, 314, 405, 320, 307, 375, 321, 308, 324, 318] },
      { name: 'nose', indices: [1, 2, 98, 327, 326, 2, 97, 99, 60, 75, 240, 290, 305, 4, 5, 6, 195] }
    ];

    facialRegions.forEach(region => {
      this.transformFacialRegion(region.indices, transform, liveLandmarks);
    });
  }

  /**
   * Transform a specific facial region
   */
  private transformFacialRegion(
    indices: number[],
    transform: DOMMatrix,
    liveLandmarks: FaceLandmarks
  ): void {
    // Create a path for the facial region
    this.ctx.beginPath();
    
    indices.forEach((index, i) => {
      if (liveLandmarks.landmarks[index]) {
        const point = liveLandmarks.landmarks[index];
        const transformedPoint = transform.transformPoint(new DOMPoint(point.x, point.y));
        
        if (i === 0) {
          this.ctx.moveTo(transformedPoint.x, transformedPoint.y);
        } else {
          this.ctx.lineTo(transformedPoint.x, transformedPoint.y);
        }
      }
    });
    
    this.ctx.closePath();
    
    // Apply subtle transformation effect
    this.ctx.save();
    this.ctx.globalAlpha = 0.3;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fill();
    this.ctx.restore();
  }

  /**
   * Draw landmarks for debugging
   */
  drawLandmarks(landmarks: FaceLandmarks, color: string = '#00FF00'): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 1;
    this.ctx.fillStyle = color;

    landmarks.landmarks.forEach((landmark, index) => {
      this.ctx.beginPath();
      this.ctx.arc(landmark.x, landmark.y, 2, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Draw landmark index for debugging
      if (index % 10 === 0) {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.font = '8px Arial';
        this.ctx.fillText(index.toString(), landmark.x + 3, landmark.y - 3);
        this.ctx.fillStyle = color;
      }
    });
  }

  /**
   * Get canvas as image data
   */
  getImageData(): ImageData {
    return this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Clear the canvas
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
} 