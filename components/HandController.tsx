import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GESTURE_THRESHOLDS } from '../constants';
import { ControlMode } from '../types';

interface HandControllerProps {
  mode: ControlMode;
  onGesture: (action: 'ZOOM_IN' | 'ZOOM_OUT' | 'PAN', delta?: {x: number, y: number}) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const HandController: React.FC<HandControllerProps> = ({ mode, onGesture, videoRef }) => {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();
  const [loading, setLoading] = useState(true);
  const lastHandPos = useRef<{x: number, y: number} | null>(null);
  const modeRef = useRef(mode);

  // Update ref to current mode to avoid stale closures in the detection loop
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    const setupHandLandmarker = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
        );
        handLandmarkerRef.current = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1
        });
        setLoading(false);
        if (modeRef.current === ControlMode.HAND) {
            startDetection();
        }
      } catch (error) {
        console.error("Error initializing hand tracker:", error);
      }
    };

    if (mode === ControlMode.HAND) {
      setupHandLandmarker();
    } else {
        // Cleanup if switching off
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }

    return () => {
       if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [mode]);

  const startDetection = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;

    const detect = () => {
      // Stop the loop if mode changes
      if (modeRef.current !== ControlMode.HAND) return;

      if (videoRef.current && videoRef.current.readyState >= 2) {
        const results = handLandmarkerRef.current?.detectForVideo(videoRef.current, performance.now());
        
        if (results && results.landmarks.length > 0) {
            processLandmarks(results.landmarks[0]);
        } else {
            lastHandPos.current = null; // Reset pan tracking if hand lost
        }
      }
      requestRef.current = requestAnimationFrame(detect);
    };
    detect();
  };

  const processLandmarks = (landmarks: any[]) => {
    // Landmarks: 4 (Thumb Tip), 8 (Index Tip), 12 (Middle Tip), 16 (Ring Tip), 20 (Pinky Tip)
    const thumbTip = landmarks[4];
    const indexTip = landmarks[8];
    const middleTip = landmarks[12];
    const ringTip = landmarks[16];
    const pinkyTip = landmarks[20];
    
    const indexBase = landmarks[5];
    const middleBase = landmarks[9];
    const ringBase = landmarks[13];
    const pinkyBase = landmarks[17];
    const wrist = landmarks[0];

    // 1. Calculate Pinch/Spread distance (Thumb to Index)
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dz = thumbTip.z - indexTip.z;
    const distance = Math.sqrt(dx*dx + dy*dy + dz*dz);

    // 2. Check for "Open Palm" (all fingers extended)
    // In normalized coords, smaller y means higher up
    const isIndexExtended = indexTip.y < indexBase.y;
    const isMiddleExtended = middleTip.y < middleBase.y;
    const isRingExtended = ringTip.y < ringBase.y;
    const isPinkyExtended = pinkyTip.y < pinkyBase.y;
    
    // If at least 3 fingers are curled and thumb is close to them, consider it a closed palm (fist)
    const curledCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(x => !x).length;
    const isClosedPalm = curledCount >= 3 && distance < GESTURE_THRESHOLDS.SPREAD_DISTANCE;

    if (isClosedPalm) {
        // Closed Palm (Fist) triggers Zoom Out / Reset
        onGesture('ZOOM_OUT');
        lastHandPos.current = null; 
    } else if (distance > GESTURE_THRESHOLDS.SPREAD_DISTANCE) {
        // Spread Fingers (Open Palm) triggers Zoom In
        onGesture('ZOOM_IN');
        
        // Handle Panning when hand is open/spread
        const currentX = wrist.x;
        const currentY = wrist.y;

        if (lastHandPos.current) {
            const panX = (currentX - lastHandPos.current.x) * -1 * GESTURE_THRESHOLDS.PAN_SENSITIVITY;
            const panY = (currentY - lastHandPos.current.y) * GESTURE_THRESHOLDS.PAN_SENSITIVITY; 
            
            const rawDiffX = Math.abs(currentX - lastHandPos.current.x);
            const rawDiffY = Math.abs(currentY - lastHandPos.current.y);

            if (rawDiffX > 0.002 || rawDiffY > 0.002) {
                onGesture('PAN', { x: panX, y: panY });
            }
        }
        lastHandPos.current = { x: currentX, y: currentY };
    } else {
        lastHandPos.current = null;
    }
  };

  return (
    <>
        {/* Hidden Video Element for processing */}
        {mode === ControlMode.HAND && (
            <div className="fixed bottom-4 right-4 w-32 h-24 border border-green-500 rounded overflow-hidden z-50 opacity-80 bg-black">
               <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
               />
               {loading && <div className="absolute inset-0 flex items-center justify-center text-xs text-green-500">Init AI...</div>}
            </div>
        )}
    </>
  );
};

export default HandController;