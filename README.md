# 🎄 Lumière Christmas Tree

An interactive, 3D Christmas tree experience built with React, Three.js, and MediaPipe. 

![Christmas Tree Preview](https://github.com/gracetyy/christmas-tree/raw/main/preview.png) *(Placeholder)*

## ✨ Features

- **Interactive 3D Tree**: A lush, particle-based Christmas tree with dynamic decorations.
- **Photo Ornaments**: Hang your own memories on the tree!
  - **Local Upload**: Select photos from your device.
  - **Instagram Integration**: Import your latest posts directly.
- **Advanced Controls**:
  - **Mouse Mode**: Standard orbit and click-to-zoom controls.
  - **Hand Gesture Mode**: Control the tree with your hands via webcam (powered by MediaPipe).
    - 👋 **Open Hand**: Pan the view.
    - ✌️ **Spread Fingers**: Zoom In.
    - 🤏 **Pinch Fingers**: Zoom Out.
- **Customizable Experience**:
  - Toggle background music (Jingle Bells).
  - Fullscreen mode for immersive viewing.
  - Edit mode to rearrange or delete photos.
  - Hide UI for a clean, cinematic look.
- **Snapshot Tool**: Download a high-quality "Merry Christmas" postcard of your decorated tree.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18+)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/gracetyy/christmas-tree.git
   cd christmas-tree
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🛠️ Tech Stack

- **Framework**: [React](https://reactjs.org/)
- **3D Engine**: [Three.js](https://threejs.org/) via [@react-three/fiber](https://github.com/pmndrs/react-three-fiber)
- **UI Components**: [@react-three/drei](https://github.com/pmndrs/drei), [Tailwind CSS](https://tailwindcss.com/)
- **Hand Tracking**: [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands.html)
- **Icons**: [Lucide React](https://lucide.dev/)

## 📝 Documentation

### Controls
- **Double Click**: Automatically zoom out to the full tree view.
- **Show/Hide UI**: Use the eye icon in the bottom control bar to toggle the interface for presentations.

### Instagram Integration
The app uses a secure webhook to fetch public Instagram media. Simply enter a username in the modal to populate the tree with their recent photos.

## 📄 License

This project is licensed under the MIT License.

---
🎵 Music: "Jingle Bells" by Kevin MacLeod (incompetech.com)  
Licensed under Creative Commons: By Attribution 3.0
