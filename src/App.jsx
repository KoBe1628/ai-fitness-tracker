import React, { useRef, useEffect, useState } from "react"; // <--- MAKE SURE TO COPY THIS LINE!

// ==========================================
//  FINAL POLISHED VERSION (Voice Coach Edition)
//  - "Thunder" Model (High Accuracy)
//  - WebGL Backend (Crash Fix)
//  - AI Voice Coach (Text-to-Speech)
//  - Multi-Exercise Support
//  - Session History (Sets)
// ==========================================
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [best, setBest] = useState(0);
  const [feedback, setFeedback] = useState("Loading AI...");
  const [exercise, setExercise] = useState("left_curl");
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Refs for logic
  const detectorRef = useRef(null);
  const countRef = useRef(0);
  const curlStateRef = useRef("rest");
  const startedRef = useRef(false);
  const exerciseRef = useRef("left_curl");
  const hasBrokenRecord = useRef(false); // Prevents repetitive "New Record" voice

  const EXERCISES = {
    left_curl: {
      name: "Left Bicep Curl",
      joints: ["left_shoulder", "left_elbow", "left_wrist"],
      thresholds: { active: 60, rest: 140 },
      type: "curl",
    },
    right_curl: {
      name: "Right Bicep Curl",
      joints: ["right_shoulder", "right_elbow", "right_wrist"],
      thresholds: { active: 60, rest: 140 },
      type: "curl",
    },
    squat: {
      name: "Squat",
      joints: ["left_hip", "left_knee", "left_ankle"],
      thresholds: { active: 100, rest: 160 },
      type: "squat",
    },
  };

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    init();

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, []);

  // Update exercise & Load saved high score
  useEffect(() => {
    exerciseRef.current = exercise;
    setCount(0);
    countRef.current = 0;
    curlStateRef.current = "rest";
    setHistory([]);
    setFeedback("Go!");
    hasBrokenRecord.current = false; // Reset record flag on exercise change

    const savedBest = localStorage.getItem(`best_${exercise}`) || 0;
    setBest(parseInt(savedBest));
  }, [exercise]);

  // --- VOICE COACH HELPER ---
  function speak(text) {
    if ("speechSynthesis" in window) {
      // Cancel any currently speaking text to avoid overlap
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2; // Slightly faster for energy
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  }

  async function init() {
    try {
      await tf.setBackend("webgl");
      await tf.ready();

      const detectorConfig = {
        modelType: poseDetection.movenet.modelType.SINGLEPOSE_THUNDER,
      };

      detectorRef.current = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet,
        detectorConfig
      );

      await setupCamera();
      setIsReady(true);
      speak("System Ready. Let's workout.");
      detectPose();
    } catch (error) {
      console.error("Init Error:", error);
      setFeedback("Error starting AI");
    }
  }

  async function setupCamera() {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 },
    });

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      return new Promise((resolve) => {
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play();
          if (canvasRef.current) {
            canvasRef.current.width = videoRef.current.videoWidth;
            canvasRef.current.height = videoRef.current.videoHeight;
          }
          resolve();
        };
      });
    }
  }

  async function detectPose() {
    if (!detectorRef.current || !videoRef.current || !canvasRef.current) return;

    if (videoRef.current.readyState < 2) {
      requestAnimationFrame(detectPose);
      return;
    }

    const poses = await detectorRef.current.estimatePoses(videoRef.current);
    const ctx = canvasRef.current.getContext("2d");

    // Draw Video
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasRef.current.width, 0);
    ctx.drawImage(
      videoRef.current,
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height
    );
    ctx.restore();

    if (poses.length > 0) {
      const pose = poses[0];

      const currentExercise = exerciseRef.current;
      const config = EXERCISES[currentExercise];
      const [p1Name, p2Name, p3Name] = config.joints;

      const p1 = pose.keypoints.find((k) => k.name === p1Name);
      const p2 = pose.keypoints.find((k) => k.name === p2Name);
      const p3 = pose.keypoints.find((k) => k.name === p3Name);

      if (
        p1 &&
        p2 &&
        p3 &&
        p1.score > 0.3 &&
        p2.score > 0.3 &&
        p3.score > 0.3
      ) {
        setConfidence(Math.round(p2.score * 100));
        drawSegment(ctx, p1, p2, p3);
        const angle = calculateAngle(p1, p2, p3);
        analyzeRep(angle, config);
      }
    }

    requestAnimationFrame(detectPose);
  }

  function calculateAngle(a, b, c) {
    const radians =
      Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
  }

  function analyzeRep(angle, config) {
    const { thresholds, type } = config;
    const current = curlStateRef.current;

    if (type === "curl") {
      if (angle > thresholds.rest) {
        curlStateRef.current = "rest";
      } else if (angle < thresholds.active && current === "rest") {
        curlStateRef.current = "active";
        completeRep();
      }
    } else if (type === "squat") {
      if (angle < thresholds.active) {
        curlStateRef.current = "active";
      } else if (angle > thresholds.rest && current === "active") {
        curlStateRef.current = "rest";
        completeRep();
      }
    }
  }

  function completeRep() {
    countRef.current += 1;
    const newCount = countRef.current;
    setCount(newCount);

    // Check High Score
    const currentExercise = exerciseRef.current;
    const currentBest = parseInt(
      localStorage.getItem(`best_${currentExercise}`) || 0
    );

    if (newCount > currentBest) {
      setBest(newCount);
      localStorage.setItem(`best_${currentExercise}`, newCount);
      setFeedback("NEW RECORD!");

      // Voice Logic: Only say "New Record" once per set streak
      if (!hasBrokenRecord.current) {
        speak("New Record!");
        hasBrokenRecord.current = true;
      } else {
        speak(newCount.toString());
      }
    } else {
      setFeedback("Nice Rep!");
      // Speak the number
      speak(newCount.toString());
    }

    setTimeout(() => setFeedback("Go!"), 1000);
  }

  function finishSet() {
    if (countRef.current === 0) return;

    const newHistory = [
      ...history,
      {
        reps: countRef.current,
        time: new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ];
    setHistory(newHistory);

    speak("Set Saved. Great job.");

    countRef.current = 0;
    setCount(0);
    hasBrokenRecord.current = false; // Reset record flag
    setFeedback("Set Saved!");
    setTimeout(() => setFeedback("Go!"), 2000);
  }

  function drawSegment(ctx, p1, p2, p3) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasRef.current.width, 0);

    ctx.shadowColor = "#00ffcc";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#00ffcc";

    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(p3.x, p3.y);
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    [p1, p2, p3].forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 6, 0, 2 * Math.PI);
      ctx.fill();
    });
    ctx.restore();
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white flex flex-col items-center p-4">
      {/* Header & Controls */}
      <div className="w-full max-w-2xl flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            AI Trainer
          </h1>
          <p className="text-xs text-gray-400">
            Best: <span className="text-yellow-400 font-bold">{best}</span>
          </p>
        </div>

        <select
          value={exercise}
          onChange={(e) => setExercise(e.target.value)}
          className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
        >
          <option value="left_curl">Left Curl</option>
          <option value="right_curl">Right Curl</option>
          <option value="squat">Squats</option>
        </select>
      </div>

      <div className="relative border-4 border-gray-700 rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl bg-black">
        {!isReady && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/90">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-400 mb-4"></div>
            <p className="text-teal-400 font-mono animate-pulse">
              Initializing AI...
            </p>
          </div>
        )}

        <video ref={videoRef} className="hidden" playsInline muted />
        <canvas
          ref={canvasRef}
          className="w-full h-auto block"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* HUD */}
        <div className="absolute top-4 left-4 flex flex-col space-y-1">
          <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-lg border-l-4 border-teal-500">
            <span className="text-gray-400 text-xs uppercase tracking-wider">
              Current Set
            </span>
            <div className="text-4xl font-mono font-bold text-white">
              {count}
            </div>
          </div>
        </div>

        {/* Feedback */}
        <div className="absolute top-4 right-4">
          <div
            className={`px-4 py-2 rounded-lg backdrop-blur font-bold transition-all duration-300 
                ${
                  feedback === "NEW RECORD!"
                    ? "bg-yellow-500 text-black scale-110"
                    : feedback === "Nice Rep!"
                    ? "bg-green-500/80 text-white"
                    : "bg-black/60 text-gray-300"
                }`}
          >
            {feedback}
          </div>
        </div>
      </div>

      {/* FINISH SET BUTTON */}
      <button
        onClick={finishSet}
        className="mt-6 w-full max-w-2xl bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg transform transition active:scale-95"
      >
        Finish Set & Save
      </button>

      {/* SESSION HISTORY */}
      <div className="w-full max-w-2xl mt-8">
        <h3 className="text-gray-400 text-sm uppercase tracking-widest mb-3">
          Session History
        </h3>
        {history.length === 0 ? (
          <p className="text-gray-600 text-sm italic">No sets completed yet.</p>
        ) : (
          <div className="space-y-2">
            {history.map((set, index) => (
              <div
                key={index}
                className="flex justify-between items-center bg-gray-800 p-3 rounded-lg border border-gray-700"
              >
                <span className="font-bold text-teal-400">Set {index + 1}</span>
                <div className="flex gap-4 text-sm">
                  <span className="text-white">{set.reps} Reps</span>
                  <span className="text-gray-500">{set.time}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
