import React, { useRef, useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs-core";
import "@tensorflow/tfjs-backend-webgl";

// --- SOUND SETUP ---
// Fixed URL (removed markdown artifacts)
const popSound = new Audio(
  "https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3"
);

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [count, setCount] = useState(0);
  const [history, setHistory] = useState([]);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [feedback, setFeedback] = useState("Loading AI...");
  const [exercise, setExercise] = useState("left_curl");
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Level Logic
  const level = Math.floor(xp / 100) + 1;
  const progressToNextLevel = xp % 100;

  // Refs
  const detectorRef = useRef(null);
  const countRef = useRef(0);
  const curlStateRef = useRef("rest");
  const startedRef = useRef(false);
  const exerciseRef = useRef("left_curl");
  const hasBrokenRecord = useRef(false);

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
    jumping_jack: {
      name: "Jumping Jacks",
      joints: ["right_hip", "right_shoulder", "right_elbow"],
      thresholds: { active: 140, rest: 30 },
      type: "jack",
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

  useEffect(() => {
    exerciseRef.current = exercise;
    setCount(0);
    countRef.current = 0;
    curlStateRef.current = "rest";
    hasBrokenRecord.current = false;
    setFeedback("Go!");

    const savedBest = localStorage.getItem(`best_${exercise}`) || 0;
    setBest(parseInt(savedBest));

    const savedHistory =
      JSON.parse(localStorage.getItem(`history_${exercise}`)) || [];
    setHistory(savedHistory);

    const savedXp = localStorage.getItem("total_xp") || 0;
    setXp(parseInt(savedXp));
  }, [exercise]);

  function speak(text) {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
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
      speak("System Ready.");
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

    if (type === "curl" || type === "squat") {
      if (angle > thresholds.rest) {
        curlStateRef.current = "rest";
      } else if (angle < thresholds.active && current === "rest") {
        curlStateRef.current = "active";
        completeRep();
      }
    } else if (type === "jack") {
      if (angle < thresholds.rest) {
        curlStateRef.current = "rest";
      } else if (angle > thresholds.active && current === "rest") {
        curlStateRef.current = "active";
        completeRep();
      }
    }
  }

  function completeRep() {
    countRef.current += 1;
    const newCount = countRef.current;
    setCount(newCount);

    setXp((prev) => {
      const newXp = prev + 10;
      localStorage.setItem("total_xp", newXp);
      return newXp;
    });

    const currentExercise = exerciseRef.current;
    const currentBest = parseInt(
      localStorage.getItem(`best_${currentExercise}`) || 0
    );

    if (newCount > currentBest) {
      setBest(newCount);
      localStorage.setItem(`best_${currentExercise}`, newCount);
      setFeedback("NEW RECORD!");
      if (!hasBrokenRecord.current) {
        speak("New Record!");
        hasBrokenRecord.current = true;
      } else {
        speak(newCount.toString());
      }
    } else {
      setFeedback("Nice Rep!");
      speak(newCount.toString());
    }
    setTimeout(() => setFeedback("Go!"), 1000);
  }

  function finishSet() {
    if (countRef.current === 0) return;
    const newEntry = {
      reps: countRef.current,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      id: Date.now(),
    };
    const newHistory = [...history, newEntry];
    setHistory(newHistory);
    localStorage.setItem(
      `history_${exerciseRef.current}`,
      JSON.stringify(newHistory)
    );

    speak("Set Saved.");
    countRef.current = 0;
    setCount(0);
    hasBrokenRecord.current = false;
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

  const chartData = history.length > 0 ? history : [{ reps: 0, time: "Start" }];

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 lg:p-8">
      {/* 1. Header & XP (Full Width) */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex flex-col md:flex-row justify-between items-center mb-4">
          <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-500">
            AI Trainer
          </h1>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase">Best</p>
              <p className="text-2xl font-bold text-yellow-400">{best}</p>
            </div>
            <select
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              className="bg-gray-800 text-white border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="left_curl">Left Curl</option>
              <option value="right_curl">Right Curl</option>
              <option value="squat">Squats</option>
              <option value="jumping_jack">Jumping Jacks</option>
            </select>
          </div>
        </div>

        {/* XP Bar */}
        <div className="w-full bg-gray-800 rounded-full h-6 relative overflow-hidden border border-gray-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressToNextLevel}%` }}
          ></div>
          <p className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white tracking-widest uppercase">
            Level {level} • {xp} XP
          </p>
        </div>
      </div>

      {/* 2. Main Grid Layout */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* LEFT COL: Camera & Feedback */}
        <div className="flex flex-col gap-4">
          <div className="relative border-4 border-gray-700 rounded-2xl overflow-hidden shadow-2xl bg-black w-full aspect-video">
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
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
            />

            {/* HUD */}
            <div className="absolute top-4 left-4">
              <div className="bg-black/60 backdrop-blur px-4 py-3 rounded-xl border-l-4 border-teal-500 shadow-lg">
                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
                  Reps
                </span>
                <span className="text-5xl font-mono font-bold text-white leading-none">
                  {count}
                </span>
              </div>
            </div>

            {/* Feedback */}
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <div
                className={`px-6 py-3 rounded-full backdrop-blur font-bold text-xl transition-all duration-300 shadow-xl
                        ${
                          feedback === "NEW RECORD!"
                            ? "bg-yellow-500 text-black scale-110"
                            : feedback === "Nice Rep!"
                            ? "bg-green-500/90 text-white"
                            : "bg-black/60 text-gray-300"
                        }`}
              >
                {feedback}
              </div>
            </div>
          </div>

          <button
            onClick={finishSet}
            className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition active:scale-95 text-lg tracking-wide uppercase"
          >
            Finish Set & Save Progress
          </button>
        </div>

        {/* RIGHT COL: Analytics & History */}
        <div className="grid grid-rows-[auto_1fr] gap-4 h-full">
          {/* Chart */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl h-80 flex flex-col">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">
              Performance Trend
            </h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#374151"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#9CA3AF"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1F2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      color: "#fff",
                    }}
                    itemStyle={{ color: "#2DD4BF" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="reps"
                    stroke="#2DD4BF"
                    strokeWidth={4}
                    dot={{
                      fill: "#111827",
                      stroke: "#2DD4BF",
                      strokeWidth: 3,
                      r: 4,
                    }}
                    activeDot={{ r: 8, fill: "#2DD4BF" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* History List */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl max-h-80 overflow-y-auto custom-scrollbar">
            <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 sticky top-0 bg-gray-800 pb-2 border-b border-gray-700">
              Today's Sessions
            </h3>
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                <p className="text-sm italic">No sets completed yet.</p>
                <p className="text-xs mt-1">Start moving to see data here!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {history
                  .slice()
                  .reverse()
                  .map((set, index) => (
                    <div
                      key={set.id}
                      className="flex justify-between items-center bg-gray-700/30 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-sm">
                          {history.length - index}
                        </div>
                        <span className="font-medium text-white">
                          {set.reps} Reps
                        </span>
                      </div>
                      <span className="text-gray-500 text-xs font-mono">
                        {set.time}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
