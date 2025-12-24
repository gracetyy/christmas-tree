# 🎄 Make your own 3D Christmas Tree with your photos!

Transform your favorite memories into a magical, interactive 3D holiday experience! This project lets you create a beautiful, personalized Christmas tree decorated with your own photos.

**✨ Try it out live at: [your-christmas-tree.vercel.app](https://your-christmas-tree.vercel.app)**

## 🎥 Demo

<p>
  <img src="./Duo.gif" alt="Demo 1 — scripting @duolingo Instagram as an example" width="360" />
  <img src="./Duo2.gif" alt="Demo 2 — scripting @duolingo Instagram as an example" width="360" />
</p>

> Demo: scripting `@duolingo` Instagram as an example input for the Instagram import.

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
1. The app sends a request to a backend webhook powered by **[Bubble Lab](https://bubblelab.ai)** (YC W26 - the open-source, Typescript-native agentic workflow builder).
2. Bubble Lab's service uses a **Headless Browser** to securely visit the public Instagram profile.
3. It identifies the most recent high-quality image URLs from the profile's grid.
4. These images are processed, optimized, and sent back to the app to be instantly "hung" as Polaroids on the 3D tree.

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

### Environment Variables
To enable the Instagram import feature, configure the following environment variable in your deployment platform (e.g., Vercel):

- `INSTAGRAM_WEBHOOK_URL`: The webhook endpoint URL for processing Instagram data imports.

---

## 🛠️ Built With
- **React & Three.js (React Three Fiber)**: For rendering the 3D scene.
- **MediaPipe**: For the AI hand gesture tracking.
- **Bubble Lab (YC W26)**: Open-source, Typescript-native agentic workflow builder for the Instagram scraping and image processing API.
- **Tailwind CSS**: For the user interface.

## 📄 License
MIT License.
