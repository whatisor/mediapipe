import React from 'react';

interface FPSDisplayProps {
  inputFPS: number;
  outputFPS: number;
  style?: React.CSSProperties;
}

export const FPSDisplay: React.FC<FPSDisplayProps> = ({ 
  inputFPS, 
  outputFPS, 
  style 
}) => {
  const defaultStyle: React.CSSProperties = {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: 'rgba(0, 0, 0, 0.7)',
    color: 'white',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '14px',
    fontFamily: 'monospace',
    zIndex: 1000,
    ...style
  };

  return (
    <div style={defaultStyle}>
      <div>Input: {inputFPS} FPS</div>
      <div>Output: {outputFPS} FPS</div>
    </div>
  );
}; 