# Face Landmark Transfer Example

This example demonstrates real-time facial expression transfer from a live camera to a static image using MediaPipe face landmark detection.

## Features

- **Real-time Face Detection**: Uses MediaPipe Face Landmarker to detect 468 facial landmarks
- **Expression Transfer**: Transfers facial expressions from live video to a static image
- **Interactive UI**: Upload source images and toggle landmark visualization
- **Performance Monitoring**: Real-time FPS display for performance tracking
- **Responsive Design**: Works on different screen sizes

## How It Works

1. **Source Image Processing**: Upload an image with a face, the system creates a landmark map
2. **Live Detection**: Continuously detects face landmarks from the webcam feed
3. **Transformation**: Calculates transformation matrices between source and live landmarks
4. **Rendering**: Applies facial transformations to the source image in real-time
5. **Display**: Shows the animated result with transferred expressions

## Technical Implementation

### Face Landmark Transfer Algorithm

The system uses a simplified affine transformation approach:

1. **Key Point Selection**: Identifies key facial points (eyes, nose, mouth)
2. **Transformation Calculation**: Computes translation, scale, and rotation matrices
3. **Region Mapping**: Maps facial regions (eyes, mouth, nose) between source and target
4. **Visual Effect**: Applies subtle visual transformations to simulate expression transfer

### Key Components

- **FaceLandmarkTransfer**: Core utility for landmark transformation
- **GenericVideoProcessor**: Handles real-time video processing using common utilities
- **Canvas Management**: Automatic canvas sizing and video synchronization
- **FPS Monitoring**: Performance tracking and optimization

## Usage

1. **Start the application**:
   ```bash
   npm install
   npm run dev
   ```

2. **Upload a source image** with a face using the file input

3. **Allow camera access** when prompted

4. **Watch the animation** as your facial expressions are transferred to the source image

5. **Toggle landmarks** to see the detected facial points

## Dependencies

- **@mediapipe/web-common**: Common utilities for MediaPipe web applications
- **@mediapipe/tasks-vision**: MediaPipe vision tasks library
- **React**: UI framework
- **TypeScript**: Type safety and development experience

## Performance Considerations

- **GPU Acceleration**: Uses GPU delegate for optimal performance
- **Frame Rate**: Targets 30+ FPS for smooth animation
- **Memory Management**: Efficient landmark processing and canvas rendering
- **Error Handling**: Graceful degradation when face detection fails

## Future Enhancements

- **Advanced Blending**: More sophisticated facial region blending
- **Expression Classification**: Identify specific expressions (smile, frown, etc.)
- **Multiple Faces**: Support for multiple faces in the same frame
- **3D Transformations**: Full 3D face mesh transformations
- **Custom Effects**: User-defined transformation effects

## Browser Compatibility

- **Chrome**: Full support with WebGL acceleration
- **Firefox**: Full support
- **Safari**: Full support
- **Edge**: Full support

Requires WebGL 2.0 support for optimal performance.

## Troubleshooting

### Common Issues

1. **"Could not access webcam"**
   - Check browser permissions
   - Ensure HTTPS in production
   - Try refreshing the page

2. **"Failed to load face landmark model"**
   - Check internet connection
   - Verify MediaPipe library is loaded
   - Check browser console for errors

3. **Low FPS**
   - Reduce video resolution
   - Close other applications
   - Check GPU acceleration is enabled

4. **No face detected**
   - Ensure good lighting
   - Position face in camera view
   - Check face is clearly visible

### Debug Mode

Enable debug logging by opening browser console and looking for:
- Model loading messages
- FPS performance data
- Face detection confidence scores
- Transformation matrix calculations

## Contributing

This example demonstrates the use of MediaPipe common utilities. To contribute:

1. Fork the repository
2. Create a feature branch
3. Implement improvements
4. Test thoroughly
5. Submit a pull request

## License

This example is part of MediaPipe and follows the same license terms. 