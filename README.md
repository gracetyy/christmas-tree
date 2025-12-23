# Lumière — Interactive Christmas Tree 🎄✨

**Lumière Christmas Tree** is an interactive 3D experience built with React + Three.js where users can decorate a virtual Christmas tree with photos, control the view using mouse or hand gestures, and import photos from Instagram or Google Drive.

---

## 🚀 Key Features

- **3D tree scene** rendered with Three.js and @react-three/fiber
- **Hand gesture controls** (via camera) and **mouse** controls for panning & zooming
- **Photo Polaroids** that hang on the tree (upload single or bulk)
- **Instagram scraping** via webhook (server-side processing) to fetch & decorate a user's photos
- Lightweight, fast dev environment using **Vite** and TypeScript

---

## 📁 Project Structure (short)

- `App.tsx` — top-level app and state orchestration
- `components/` — UI + 3D components
  - `Scene.tsx` — main 3D scene and camera
  - `Overlay.tsx` — controls UI for uploading and settings
  - `HandController.tsx` — camera/hand interaction and gesture pipeline
  - `Polaroid.tsx`, `Star.tsx`, `Presents.tsx`, `SpiralDecor.tsx` — visual pieces
  - `InstagramModal.tsx` — UI for Instagram username input & import
- `utils/` — small helpers
  - `googleDrive.ts` — Google Picker + Drive listing helpers
  - `math.ts` — positioning utilities for photos on the tree
- `constants.ts` — color, geometry, and remote endpoint config
- `metadata.json` — app metadata (camera permissions requested, etc.)

---

## 💻 Getting Started

Requirements:
- Node >= 18, npm or yarn
- Browser with WebGL and camera support for hand gestures

Install:
```bash
npm install
# or
# yarn
```

Run locally:
```bash
npm run dev
# visit http://localhost:5173 (or whichever Vite reports)
```

Build for production:
```bash
npm run build
npm run preview
```
