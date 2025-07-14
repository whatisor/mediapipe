import React from 'react';

interface FPSDisplayProps {
  inputFPS: number;
  outputFPS: number;
}

export const FPSDisplay: React.FC<FPSDisplayProps> = ({ inputFPS, outputFPS }) => {
  return (
    <div style={{ 
      position: 'absolute', 
      top: '10px', 
      right: '10px', 
      background: 'rgba(0, 0, 0, 0.7)', 
      color: 'white', 
      padding: '8px 12px', 
      borderRadius: '4px', 
      fontSize: '14px',
      fontFamily: 'monospace'
    }}>
      <div>Input: {inputFPS} FPS</div>
      <div>Output: {outputFPS} FPS</div>
    </div>
  );
};