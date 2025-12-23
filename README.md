🤖 AI Fitness Trainer

A Next-Gen Personal Trainer powered by TensorFlow.js and React.

Live Demo: https://ai-fitness-tracker-liard.vercel.app/

<img width="1920" height="916" alt="image" src="https://github.com/user-attachments/assets/dcecf60d-60cb-41dc-9c66-4e2426950352" />

<img width="1908" height="1071" alt="image" src="https://github.com/user-attachments/assets/29169bbe-c413-453d-83b8-23589295d62d" />



🚀 About The Project

AI Fitness Trainer is a computer vision web application that turns your webcam into a smart gym instructor. It uses the MoveNet (Thunder) model to track your body keypoints in real-time, completely locally in your browser (no video is sent to a server).

It doesn't just count reps—it analyzes your form, tracks your streaks, and gamifies your workout with XP, levels, and achievements.

✨ Key Features

🧠 AI & Computer Vision

Real-time Tracking: Uses TensorFlow.js MoveNet (Thunder) for high-accuracy pose detection.

Form Correction: Detects if you aren't squatting deep enough or curling fully and gives audio feedback ("Go Lower!", "Full Range!").

AR Angle HUD: Visualizes joint angles (elbow/knee) with a glowing augmented reality gauge.

Privacy Mode: Optional Face Blur feature that tracks your nose/ears to mask your identity.

🎮 Gamification

XP & Leveling System: Earn XP for every rep. Level up from "Rookie" to "Spartan."

Trophy Room: Unlock achievements like "Iron Legs" (50 Squats) or "On Fire" (3-day streak).

Challenge Mode (Time Attack): Race against a 60-second clock to set high scores.

Daily Streaks: Tracks consecutive days of activity to keep you motivated.

📊 Analytics & Data

Visual Charts: Interactive Area Charts (Recharts) showing performance trends.

Muscle Heatmap: A dynamic body diagram that lights up (Arms/Legs/Core) based on your daily volume.

Biometric Calibration: Enter your weight in Settings for scientifically accurate Calorie burn estimates.

Weekly Calendar: A GitHub-style commit graph for your workout consistency.

🛠 Tools & Utilities

Smart Rest Timer: Auto-starts a cooldown timer between sets.

Voice Coach: Text-to-Speech engine counts reps out loud and shouts encouragement.

Data Export/Import: Download your entire workout history as a JSON file to backup your data.

Zen Mode: A distraction-free UI mode for pure focus.

🛠 Tech Stack

Frontend: React (Vite)

AI Model: @tensorflow-models/pose-detection (MoveNet SinglePose Thunder)

Backend: TensorFlow.js (WebGL backend for GPU acceleration)

Visualization: Recharts

Styling: Tailwind CSS

Effects: Canvas Confetti

🚀 Getting Started

To run this project locally:

Clone the repo

git clone [https://github.com/KoBe1628/ai-fitness-tracker.git](https://github.com/KoBe1628/ai-fitness-tracker.git)
cd ai-fitness-tracker

Install dependencies

npm install

Run the development server

npm run dev

Open in Browser
Visit http://localhost:5173 to start working out!

🔒 Privacy First

This application follows a Local-First architecture.

No Video Uploads: Your webcam feed is processed entirely on your device (Client-Side). It never leaves your browser.

Local Storage: All your stats (XP, History, Settings) are saved in your browser's Local Storage.
