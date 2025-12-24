import React, { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { GESTURE_THRESHOLDS } from '../constants';
import { ControlMode, ZoomLevel } from '../types';

interface HandControllerProps {
  mode: ControlMode;
  zoomLevel: ZoomLevel;
  isExploded: boolean;
  onGesture: (action: 'ZOOM_IN' | 'ZOOM_OUT' | 'NEXT' | 'PREV' | 'PAN' | 'EXPLODE', delta?: {x: number, y: number}) => void;
  videoRef: React.RefObject<HTMLVideoElement>;
}

const HandController: React.FC<HandControllerProps> = ({ mode, zoomLevel, isExploded, onGesture, videoRef }) => {
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>();
  const [loading, setLoading] = useState(true);
  
  // Swipe Tracking
  const historyX = useRef<{val: number, time: number}[]>([]);
  const lastSwipeTime = useRef<number>(0);
  
  // Pan Tracking
  const lastHandPos = useRef<{x: number, y: number} | null>(null);

  // Stability Tracking
  const gestureFrames = useRef({ fist: 0, open: 0, peace: 0 });

  const modeRef = useRef(mode);
  const zoomLevelRef = useRef(zoomLevel);
  const isExplodedRef = useRef(isExploded);
  const onGestureRef = useRef(onGesture);

  // Update ref to current mode to avoid stale closures in the detection loop
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    zoomLevelRef.current = zoomLevel;
  }, [zoomLevel]);

  useEffect(() => {
    isExplodedRef.current = isExploded;
  }, [isExploded]);

  useEffect(() => {
    onGestureRef.current = onGesture;
  }, [onGesture]);

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
            // Reset tracking if hand lost
            historyX.current = [];
            lastHandPos.current = null;
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

    // Edge Guard: Ignore gestures if hand is too close to the edge
    const EDGE_THRESHOLD = 0.05;
    if (
        wrist.x < EDGE_THRESHOLD || 
        wrist.x > 1 - EDGE_THRESHOLD || 
        wrist.y < EDGE_THRESHOLD || 
        wrist.y > 1 - EDGE_THRESHOLD
    ) {
        // console.log("Edge Guard Triggered");
        historyX.current = [];
        lastHandPos.current = null;
        return;
    }

    // 1. Calculate Pinch/Spread distance (Thumb to Index)
    const dx_dist = thumbTip.x - indexTip.x;
    const dy_dist = thumbTip.y - indexTip.y;
    const dz_dist = thumbTip.z - indexTip.z;
    const distance = Math.sqrt(dx_dist*dx_dist + dy_dist*dy_dist + dz_dist*dz_dist);

    // 2. Check for "Open Palm" (all fingers extended)
    const isIndexExtended = indexTip.y < landmarks[6].y; // Tip above PIP
    const isMiddleExtended = middleTip.y < landmarks[10].y; // Tip above PIP
    const isRingExtended = ringTip.y < landmarks[14].y; // Tip above PIP
    const isPinkyExtended = pinkyTip.y < landmarks[18].y; // Tip above PIP
    
    const curledCount = [isIndexExtended, isMiddleExtended, isRingExtended, isPinkyExtended].filter(x => !x).length;
    const isClosedPalm = curledCount >= 3 && distance < GESTURE_THRESHOLDS.FIST_DISTANCE;
    
    // 3. Check for "Peace Sign" (Index + Middle extended, Ring + Pinky curled)
    const isPeaceSign = isIndexExtended && isMiddleExtended && !isRingExtended && !isPinkyExtended;

    // Debug Gesture Values
    // Only log every 10th frame to reduce spam, or if specific conditions met
    // if (Math.random() < 0.05) {
    //     console.log(`Gesture Debug: dist=${distance.toFixed(3)}, zoom=${zoomLevelRef.current}, isClosed=${isClosedPalm}`);
    // }

    // console.log(`Hand Debug: dist=${distance.toFixed(3)}, curled=${curledCount}, isClosed=${isClosedPalm}`);

    const now = Date.now();
    const currentX = wrist.x;
    const currentY = wrist.y;

    // 0. PEACE SIGN -> EXPLODE (High Priority)
    if (isPeaceSign) {
        gestureFrames.current.peace++;
        if (gestureFrames.current.peace > 6) { // Reduced from 10 to 6 (~100ms)
            onGestureRef.current('EXPLODE');
            gestureFrames.current.peace = 0;
        }
    } else if (isExplodedRef.current && isClosedPalm) {
        // If exploded, a fist also returns to normal
        gestureFrames.current.fist++;
        if (gestureFrames.current.fist > 6) {
            onGestureRef.current('EXPLODE');
            gestureFrames.current.fist = 0;
        }
    } else {
        gestureFrames.current.peace = 0;
    }

    // Calculate movement velocity to suppress zoom during fast movement
    let isMovingFast = false;
    if (lastHandPos.current) {
        const dx = currentX - lastHandPos.current.x;
        const dy = currentY - lastHandPos.current.y;
        const velocity = Math.sqrt(dx*dx + dy*dy);
        if (velocity > 0.015) isMovingFast = true; 
    }

    if (zoomLevelRef.current === ZoomLevel.ZOOMED_IN) {
        // === ZOOMED IN MODE ===
        // Priority: Navigation (Swipe)
        // Exception: Zoom Out (Fist)

        if (isClosedPalm && !isMovingFast) {
            gestureFrames.current.fist++;
            gestureFrames.current.open = 0;

            if (gestureFrames.current.fist > 6) { // Must hold fist for ~100ms to Zoom Out
                onGestureRef.current('ZOOM_OUT');
                gestureFrames.current.fist = 0;
                historyX.current = []; 
                lastHandPos.current = null;
            }
        } else {
            gestureFrames.current.fist = 0;
            // DEFAULT -> SWIPE DETECTION
            // (Treat any non-fist as potential swipe)
            
            // Add current X to history
            historyX.current.push({ val: currentX, time: now });
            // Keep last 10 frames (~160ms)
            if (historyX.current.length > 10) historyX.current.shift();

            if (now - lastSwipeTime.current > GESTURE_THRESHOLDS.SWIPE_COOLDOWN && historyX.current.length >= 5) {
                const start = historyX.current[0];
                const end = historyX.current[historyX.current.length - 1];
                const dx = end.val - start.val;

                if (Math.abs(dx) > GESTURE_THRESHOLDS.SWIPE_THRESHOLD) {
                     if (dx > 0) {
                        onGestureRef.current('PREV');
                    } else {
                        onGestureRef.current('NEXT');
                    }
                    lastSwipeTime.current = now;
                    historyX.current = []; // Reset history after swipe
                }
            }
            lastHandPos.current = { x: currentX, y: currentY }; // Update for velocity check
        }

    } else {
        // === FULL TREE MODE ===
        // Priority: Exploration (Pan)
        // Exception: Zoom In (Open Palm)

        if (distance > GESTURE_THRESHOLDS.SPREAD_DISTANCE && !isMovingFast) {
            gestureFrames.current.open++;
            gestureFrames.current.fist = 0;

            if (gestureFrames.current.open > 1) { // Must hold open palm for ~20-30ms to Zoom In
                onGestureRef.current('ZOOM_IN');
                gestureFrames.current.open = 0;
                lastHandPos.current = null; 
                historyX.current = [];
            }
        } else {
            gestureFrames.current.open = 0;
            // DEFAULT -> PAN/ROTATE
            // (Treat any non-open hand as potential pan)
            
            if (lastHandPos.current) {
                const dx = currentX - lastHandPos.current.x;
                const dy = currentY - lastHandPos.current.y;
                
                const panX = dx * -1 * GESTURE_THRESHOLDS.PAN_SENSITIVITY;
                const panY = dy * GESTURE_THRESHOLDS.PAN_SENSITIVITY;

                if (Math.abs(dx) > 0.002 || Math.abs(dy) > 0.002) {
                    onGestureRef.current('PAN', { x: panX, y: panY });
                }
            }
            lastHandPos.current = { x: currentX, y: currentY };
            historyX.current = []; // Reset swipe history
        }
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