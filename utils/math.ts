import { Vector3, Euler } from 'three';
import { TREE_CONFIG, SPIRAL_CONFIG } from '../constants';

/**
 * Calculates a point on the conical spiral.
 * @param t Normalized progress (0 to 1) from bottom to top
 */
export const getSpiralPoint = (t: number) => {
  const y = t * TREE_CONFIG.HEIGHT - (TREE_CONFIG.HEIGHT / 2);
  
  // Radius decreases as we go up (Conical)
  const progressInverted = 1 - t;
  const currentRadius = (TREE_CONFIG.RADIUS_BOTTOM * progressInverted) + SPIRAL_CONFIG.RADIUS_OFFSET;
  
  const angle = t * SPIRAL_CONFIG.LOOPS * Math.PI * 2;
  
  const x = Math.cos(angle) * currentRadius;
  const z = Math.sin(angle) * currentRadius;
  
  return new Vector3(x, y, z);
};

/**
 * Generates positions for photos along the spiral.
 */
export const generatePhotoPositions = (count: number) => {
  const positions: { position: [number, number, number], rotation: [number, number, number], t: number }[] = [];
  
  // Start from 10% up to 90% up
  const startT = 0.08;
  const endT = 0.92;
  
  for (let i = 0; i < count; i++) {
    const t = startT + (i / (count - 1)) * (endT - startT);
    const pos = getSpiralPoint(t);
    
    // Calculate rotation to face outwards/tangential
    const angle = Math.atan2(pos.x, pos.z); 
    
    positions.push({
      position: [pos.x, pos.y, pos.z],
      rotation: [0, angle, 0], 
      t
    });
  }
  return positions;
};

export const generatePlaceholderTexture = (type: 'snowflake' | 'bell' | 'tree', bgColor: string, iconColor: string): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    // 1. Festive Background with Radial Gradient
    const gradient = ctx.createRadialGradient(256, 256, 50, 256, 256, 400);
    gradient.addColorStop(0, '#1e293b'); // Slate-800
    gradient.addColorStop(1, '#0f172a'); // Slate-900
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    // 2. Simple Gold/White Border
    ctx.strokeStyle = '#ffffff'; 
    ctx.lineWidth = 8;
    ctx.strokeRect(20, 20, 472, 472);
    
    // 3. Prepare for Icon Drawing
    ctx.translate(256, 256);
    
    // Glow effect for the white shape
    ctx.shadowColor = 'rgba(255,255,255,0.6)';
    ctx.shadowBlur = 30;
    
    if (type === 'snowflake') {
        // --- SNOWFLAKE ICON (WHITE) ---
        // Redesigned to be more crystalline and less web-like
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 14;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((Math.PI / 3) * i);
            
            // Main Spine
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(0, -135);
            ctx.stroke();

            // Inner Branches (Smaller)
            ctx.lineWidth = 10;
            ctx.beginPath();
            ctx.moveTo(0, -50);
            ctx.lineTo(-35, -85);
            ctx.moveTo(0, -50);
            ctx.lineTo(35, -85);
            ctx.stroke();

            // Outer Branches (Larger)
            ctx.beginPath();
            ctx.moveTo(0, -95);
            ctx.lineTo(-30, -125);
            ctx.moveTo(0, -95);
            ctx.lineTo(30, -125);
            ctx.stroke();
            
            ctx.restore();
        }
        
        // Center Detail
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'bell') {
        // --- BELL ICON (WHITE) ---
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -100);
        ctx.bezierCurveTo(90, -100, 90, 80, 130, 130);
        ctx.lineTo(-130, 130);
        ctx.bezierCurveTo(-90, 80, -90, -100, 0, -100);
        ctx.fill();

        // Clapper
        ctx.fillStyle = '#E2E8F0'; // Light gray for slight contrast
        ctx.beginPath();
        ctx.arc(0, 130, 30, 0, Math.PI, false); 
        ctx.fill();

        // Ribbon
        ctx.fillStyle = '#FFFFFF'; 
        ctx.beginPath();
        ctx.ellipse(-40, -110, 40, 25, -Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(40, -110, 40, 25, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(0, -110, 15, 0, Math.PI * 2);
        ctx.fill();

    } else if (type === 'tree') {
        // --- CHRISTMAS TREE ICON (WHITE) ---
        ctx.fillStyle = '#FFFFFF'; 

        // Trunk
        ctx.fillRect(-30, 120, 60, 60);

        // Leaves
        const drawTier = (yOffset: number, width: number, height: number) => {
            ctx.beginPath();
            ctx.moveTo(0, yOffset - height);
            ctx.lineTo(width, yOffset);
            ctx.lineTo(-width, yOffset);
            ctx.closePath();
            ctx.fill();
        };

        drawTier(130, 110, 100);
        drawTier(60, 90, 90);
        drawTier(-10, 70, 80);

        // Star
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        const spikes = 5;
        const outerRadius = 25;
        const innerRadius = 10;
        let rot = Math.PI / 2 * 3;
        let x = 0;
        let y = -90; 
        const step = Math.PI / spikes;

        ctx.moveTo(0, y - outerRadius);
        for (let i = 0; i < spikes; i++) {
            x = 0 + Math.cos(rot) * outerRadius;
            y = -100 + Math.sin(rot) * outerRadius;
            ctx.lineTo(x, y);
            rot += step;

            x = 0 + Math.cos(rot) * innerRadius;
            y = -100 + Math.sin(rot) * innerRadius;
            ctx.lineTo(x, y);
            rot += step;
        }
        ctx.lineTo(0, -100 - outerRadius);
        ctx.closePath();
        ctx.fill();
    }

    return canvas.toDataURL('image/png');
};