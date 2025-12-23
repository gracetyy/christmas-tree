# 🎄 Make your own 3D Christmas Tree with your photos!

Transform your favorite memories into a magical, interactive 3D holiday experience! This project lets you create a beautiful, personalized Christmas tree decorated with your own photos.

## ✨ Features

- **📸 Your Photos, Your Tree**: Upload photos from your device or instantly import them from any **Instagram** profile!
- **🖐️ Magic Hand Controls**: Control the camera with hand gestures in front of your webcam.
- **🎬 Cinematic Videos**: Record high-quality videos of your tree (360° rotation or cinematic tour).
- **🖼️ Instant Postcards**: Download a high-definition snapshot of your tree with a custom "Merry Christmas" greeting.
- **👤 Personalized Greeting**: Enter your name to see a custom "Merry Christmas [Your Name]!" message.

---

## 🖐️ Hand Mode Tutorial

Switch to **Hand Mode** in the bottom menu to control the tree with "magic":

1. **Zoom In**: Open your palm with fingers spread 🖐️
2. **Zoom Out / Reset**: Close your hand into a fist ✊
3. **Move / Pan**: While your hand is open, move it around to look at different parts of the tree.

### 🧠 How Hand Mode Works (The "Principle")
This feature uses **MediaPipe Hands**, a high-fidelity palm and finger tracking solution by Google. 
- It works by performing real-time AI inference on your webcam feed.
- It identifies **21 3D hand landmarks** (joints). 
- Our script calculates the distance between your thumb and index finger, and counts how many fingers are curled, to translate those shapes into 3D camera movements in **Three.js**.

---

## 📸 Instagram Import (How it works)
When you enter a username:
1. A backend service uses a **Headless Browser (Puppeteer/Playwright)** or a **Scraping API** to visit the public Instagram profile.
2. It identifies the most recent high-quality image URLs from the profile's grid.
3. These images are processed and sent back to the app to be instantly "hung" as Polaroids on the 3D tree.

---

## 🚀 Quick Start (For Developers)

1. **Clone & Enter**:
   ```bash
   git clone https://github.com/gracetyy/christmas-tree.git
   cd christmas-tree
   ```
2. **Install**:
   ```bash
   npm install
   ```
3. **Launch**:
   ```bash
   npm run dev
   ```
4. **View**: Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🛠️ Built With
- **React & Three.js (React Three Fiber)**: For rendering the 3D scene.
- **MediaPipe**: For the AI hand gesture tracking.
- **Tailwind CSS**: For the user interface.

## 📄 License
MIT License.
