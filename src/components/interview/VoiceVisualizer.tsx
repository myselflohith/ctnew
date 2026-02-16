import React, { useEffect, useRef } from 'react';
import './VoiceVisualizer.css';

interface VoiceVisualizerProps {
  isActive: boolean;
  mode?: 'listening' | 'processing';
}

export const VoiceVisualizer: React.FC<VoiceVisualizerProps> = ({ 
  isActive, 
  mode = 'listening' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const barsRef = useRef<number[]>(Array(12).fill(0.2));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isActive) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const barCount = 12;
    const barWidth = canvas.width / barCount;
    const animate = () => {
      // Clear canvas
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Update bars
      for (let i = 0; i < barCount; i++) {
        if (mode === 'listening') {
          // Random variation for listening mode
          barsRef.current[i] += (Math.random() - 0.5) * 0.3;
          barsRef.current[i] = Math.max(0.1, Math.min(1, barsRef.current[i]));
        } else {
          // Smooth wave for processing mode
          barsRef.current[i] = 0.3 + 0.7 * Math.sin((Date.now() / 200 + i / barCount) * Math.PI * 2);
        }

        const barHeight = barsRef.current[i] * (canvas.height - 4);
        const x = i * barWidth + 2;
        const y = (canvas.height - barHeight) / 2;

        // Color based on mode
        ctx.fillStyle = mode === 'listening' ? '#005999' : '#465189';
        ctx.fillRect(x, y, barWidth - 4, barHeight);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, mode]);

  if (!isActive) {
    return null;
  }

  return (
    <div className="voice-visualizer-container">
      <canvas
        ref={canvasRef}
        width={200}
        height={40}
        className="voice-visualizer-canvas"
      />
      <p className="visualizer-label">
        {mode === 'listening' ? 'Listening...' : 'Processing...'}
      </p>
    </div>
  );
};

export default VoiceVisualizer;
