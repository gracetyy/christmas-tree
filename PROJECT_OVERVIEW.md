# Project Overview: Lumière Christmas Tree

## Project Goal
To create a festive, interactive digital experience where users can curate a virtual Christmas tree with personal memories, controllable via modern interface methods including hand gestures.

## Core Components

### 1. 3D Scene (`components/Scene.tsx`)
The engine of the experience. It manages the `Canvas`, lighting, and the `CameraController`.
- **CameraController**: Handles smooth interpolation between different camera states (Full Tree vs. Zoomed-in Photo).

### 2. Tree Geometry (`components/TreeMesh.tsx`)
Uses an `InstancedMesh` to render 12,000+ individual "needles" efficiently. Each needle is a low-poly tetrahedron with randomized jitter to create a lush, organic look.

### 3. Decorations
- **SpiralDecor.tsx**: Manages the glowing "light string" and randomized baubles. Logic is optimized to prevent clipping with photos.
- **Star.tsx**: A glowing, rotating crystal star at the top of the tree.
- **Presents.tsx**: Procedurally generated gift boxes with rounded edges and ribbons.
- **Snow.tsx**: A particle system using a circular alpha-map texture for soft, realistic snowfall.

### 4. Interactive Polaroids (`components/Polaroid.tsx`)
Custom 3D objects representing user photos.
- Supports dynamic texture loading.
- Includes a 3D HTML overlay for "Delete" actions in Edit Mode.
- Features physical swaying animations.

### 5. Control Systems
- **HandController.tsx**: Interfaces with MediaPipe Hands to translate webcam video into 3D navigation commands.
- **Mouse Control**: standard `OrbitControls` with custom extensions for programmatic zooming.

### 6. User Interface (`components/Overlay.tsx`)
A glassmorphic UI layer built with Tailwind CSS.
- Unified bottom control bar for all interactions.
- "Presentation Mode" (Hide UI) for clean viewing.
- Advanced compositing logic for downloads (merging WebGL canvas with HTML text elements).

## Technical Implementation Details

### Camera Smoothing
The camera doesn't jump; it uses `lerp` (linear interpolation) within the `useFrame` loop to provide a cinematic transition when zooming into photos.

### Performance
By using `InstancedMesh` for the tree and `BufferGeometry` for the tinsel, the app maintains 60fps even on mid-range devices despite the high detail.

### Asset Management
- **Textures**: Generated on-the-fly via HTML5 Canvas to keep the initial bundle size minimal.
- **Audio**: Streaming from public domain sources to avoid large binary files in the repository.

