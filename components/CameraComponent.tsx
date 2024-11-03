"use client";

import { useEffect, useRef, useState } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import { Camera, SunglassesOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CameraComponent() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [error, setError] = useState<string>('');
  const modelRef = useRef<blazeface.BlazeFaceModel | null>(null);
  const animationFrameRef = useRef<number>();
  const sunglassesRef = useRef<HTMLImageElement>();

  useEffect(() => {
    // Load the sunglasses image
    const sunglasses = new Image();
    sunglasses.src = 'https://images.unsplash.com/photo-1577803645773-f96470509666?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w0NzEyNjZ8MHwxfHNlYXJjaHw0fHxzdW5nbGFzc2VzfGVufDB8fHx8MTcxMDg3NzIyM3ww&ixlib=rb-4.0.3&q=80&w=200';
    sunglassesRef.current = sunglasses;

    // Load the face detection model
    const loadModel = async () => {
      try {
        await tf.ready();
        modelRef.current = await blazeface.load();
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load face detection model');
        setIsLoading(false);
      }
    };

    loadModel();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
        detectFaces();
      }
    } catch (err) {
      setError('Failed to access camera');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Clear canvas
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx && canvasRef.current) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  const detectFaces = async () => {
    if (!modelRef.current || !videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const detectFrame = async () => {
      if (video.readyState === 4) {
        // Match canvas size to video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        try {
          const predictions = await modelRef.current!.estimateFaces(video, false);

          predictions.forEach((prediction: any) => {
            const start = prediction.topLeft as [number, number];
            const end = prediction.bottomRight as [number, number];
            const size = [end[0] - start[0], end[1] - start[1]];

            // Calculate sunglasses position and size
            const glassesWidth = size[0] * 1.1;
            const glassesHeight = size[1] * 0.5;
            const glassesX = start[0] - (glassesWidth - size[0]) / 2;
            const glassesY = start[1] + size[1] * 0.2;

            // Draw sunglasses
            if (sunglassesRef.current) {
              ctx.drawImage(
                sunglassesRef.current,
                glassesX,
                glassesY,
                glassesWidth,
                glassesHeight
              );
            }
          });
        } catch (err) {
          console.error('Face detection error:', err);
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    detectFrame();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="relative w-full max-w-2xl aspect-video rounded-lg overflow-hidden bg-zinc-800">
        <video
          ref={videoRef}
          className={cn(
            "absolute inset-0 w-full h-full object-cover",
            !isCameraActive && "hidden"
          )}
          autoPlay
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
        />
        {!isCameraActive && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Camera className="w-16 h-16 text-zinc-600" />
          </div>
        )}
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
        )}
      </div>

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}

      <Button
        className="w-full max-w-xs"
        onClick={isCameraActive ? stopCamera : startCamera}
        disabled={isLoading}
      >
        {isCameraActive ? (
          <>
            <SunglassesOff className="w-4 h-4 mr-2" />
            Stop Camera
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </>
        )}
      </Button>
    </div>
  );
}