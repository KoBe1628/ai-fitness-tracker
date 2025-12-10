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
const popSound = new Audio(
  "[https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3](https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3)"
);

// --- MUSCLE MAP COMPONENT ---
const MuscleMap = ({ muscleData }) => {
  // Helper to get color intensity based on reps
  const getColor = (reps) => {
    if (!reps || reps === 0) return "#374151"; // Gray-700 (Inactive)
    if (reps < 20) return "#2DD4BF"; // Teal (Warmup)
    if (reps < 50) return "#FACC15"; // Yellow (Burning)
    return "#EF4444"; // Red (On Fire)
  };

  const getOpacity = (reps) => {
    if (!reps) return 0.3;
    return Math.min(0.5 + reps / 100, 1); // Cap at 1
  };

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <svg viewBox="0 0 200 400" className="h-full drop-shadow-2xl">
        {/* HEAD */}
        <circle
          cx="100"
          cy="50"
          r="25"
          fill="#1F2937"
          stroke="#4B5563"
          strokeWidth="2"
        />

        {/* TORSO (Core) */}
        <path
          d="M75,80 L125,80 L115,200 L85,200 Z"
          fill={getColor(muscleData.core)}
          fillOpacity={getOpacity(muscleData.core)}
          stroke="white"
          strokeWidth="2"
        />

        {/* ARMS (Biceps/Shoulders) */}
        {/* Left Arm */}
        <path
          d="M75,85 L50,150 L65,160 L80,100 Z"
          fill={getColor(muscleData.arms)}
          fillOpacity={getOpacity(muscleData.arms)}
          stroke="white"
          strokeWidth="2"
        />
        {/* Right Arm */}
        <path
          d="M125,85 L150,150 L135,160 L120,100 Z"
          fill={getColor(muscleData.arms)}
          fillOpacity={getOpacity(muscleData.arms)}
          stroke="white"
          strokeWidth="2"
        />

        {/* LEGS (Quads) */}
        {/* Left Leg */}
        <path
          d="M85,200 L70,300 L90,300 L100,200 Z"
          fill={getColor(muscleData.legs)}
          fillOpacity={getOpacity(muscleData.legs)}
          stroke="white"
          strokeWidth="2"
        />
        {/* Right Leg */}
        <path
          d="M115,200 L130,300 L110,300 L100,200 Z"
          fill={getColor(muscleData.legs)}
          fillOpacity={getOpacity(muscleData.legs)}
          stroke="white"
          strokeWidth="2"
        />
      </svg>

      {/* Legend Overlay */}
      <div className="absolute bottom-0 right-0 text-[10px] text-gray-500 flex flex-col gap-1">
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-teal-400"></div> Warm
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-400"></div> Burn
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div> Fire
        </div>
      </div>
    </div>
  );
};

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // State
  const [appState, setAppState] = useState("intro");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [difficulty, setDifficulty] = useState("normal");
  const [gameMode, setGameMode] = useState("standard");
  const [showCalories, setShowCalories] = useState(true);
  const [zenMode, setZenMode] = useState(false);

  const [count, setCount] = useState(0);
  const [calories, setCalories] = useState(0);
  const [history, setHistory] = useState([]);
  const [best, setBest] = useState(0);
  const [xp, setXp] = useState(0);
  const [streak, setStreak] = useState(0);
  const [dailyTotal, setDailyTotal] = useState(0);
  const [weight, setWeight] = useState(70);
  const [feedback, setFeedback] = useState("Loading AI...");
  const [exercise, setExercise] = useState("left_curl");
  const [confidence, setConfidence] = useState(0);
  const [isReady, setIsReady] = useState(false);

  // Muscle Data State
  const [muscleData, setMuscleData] = useState({ arms: 0, legs: 0, core: 0 });

  const [timeLeft, setTimeLeft] = useState(60);
  const [restTimer, setRestTimer] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);

  const detectorRef = useRef(null);
  const countRef = useRef(0);
  const curlStateRef = useRef("rest");
  const exerciseRef = useRef("left_curl");
  const hasBrokenRecord = useRef(false);
  const isMutedRef = useRef(false);
  const difficultyRef = useRef("normal");
  const gameModeRef = useRef("standard");
  const weightRef = useRef(70);

  const level = Math.floor(xp / 100) + 1;
  const progressToNextLevel = xp % 100;
  const DAILY_GOAL = 50;
  const dailyProgress = Math.min((dailyTotal / DAILY_GOAL) * 100, 100);

  const BASE_EXERCISES = {
    left_curl: {
      name: "Left Bicep Curl",
      joints: ["left_shoulder", "left_elbow", "left_wrist"],
      type: "curl",
      calPerRep: 0.4,
      muscle: "arms",
    },
    right_curl: {
      name: "Right Bicep Curl",
      joints: ["right_shoulder", "right_elbow", "right_wrist"],
      type: "curl",
      calPerRep: 0.4,
      muscle: "arms",
    },
    squat: {
      name: "Squat",
      joints: ["left_hip", "left_knee", "left_ankle"],
      type: "squat",
      calPerRep: 1.2,
      muscle: "legs",
    },
    jumping_jack: {
      name: "Jumping Jacks",
      joints: ["right_hip", "right_shoulder", "right_elbow"],
      type: "jack",
      calPerRep: 1.5,
      muscle: "core",
    },
  };

  const DIFFICULTY_MODS = {
    easy: { active: 20, rest: -20 },
    normal: { active: 0, rest: 0 },
    hard: { active: -20, rest: 10 },
  };

  const getRank = (xp) => {
    if (xp < 100) return { title: "ROOKIE", color: "#2DD4BF" };
    if (xp < 500) return { title: "ATHLETE", color: "#FACC15" };
    return { title: "SPARTAN", color: "#D946EF" };
  };
  const currentRank = getRank(xp);

  const getFoodEquivalent = (kcal) => {
    if (kcal < 15) return "Burning up...";
    if (kcal < 50) return "1 Gummy Bear 🍬";
    if (kcal < 100) return "1 Apple 🍎";
    if (kcal < 250) return "1 Taco 🌮";
    return "1 Burger 🍔";
  };

  const getThresholds = (type, diff) => {
    const mod = DIFFICULTY_MODS[diff];
    let t = { active: 0, rest: 0 };
    if (type === "curl") {
      t = { active: 60, rest: 140 };
    } else if (type === "squat") {
      t = { active: 100, rest: 160 };
    } else if (type === "jack") {
      t = { active: 140, rest: 30 };
    }

    if (type === "curl" || type === "squat") {
      return { active: t.active + mod.active, rest: t.rest + mod.rest };
    } else {
      return { active: t.active - mod.active, rest: t.rest - mod.rest };
    }
  };

  const toggleFullScreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
    } catch (err) {
      console.log("Error enabling full-screen:", err);
    }
  };

  useEffect(() => {
    if (appState === "active") {
      init();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }
    }
  }, [appState]);

  useEffect(() => {
    exerciseRef.current = exercise;
    difficultyRef.current = difficulty;
    isMutedRef.current = isMuted;
    gameModeRef.current = gameMode;
    weightRef.current = weight;
  }, [exercise, difficulty, isMuted, gameMode, weight]);

  // Load Saved Data
  useEffect(() => {
    setCount(0);
    countRef.current = 0;
    curlStateRef.current = "rest";
    hasBrokenRecord.current = false;
    setFeedback("Go!");

    setBest(parseInt(localStorage.getItem(`best_${exercise}`) || 0));
    setHistory(JSON.parse(localStorage.getItem(`history_${exercise}`)) || []);
    setXp(parseInt(localStorage.getItem("total_xp") || 0));
    setStreak(parseInt(localStorage.getItem("streak") || 0));

    const savedWeight = localStorage.getItem("user_weight");
    if (savedWeight) setWeight(parseInt(savedWeight));

    const savedShowCal = localStorage.getItem("show_calories");
    if (savedShowCal !== null) setShowCalories(savedShowCal === "true");

    // Daily & Muscle Totals
    const storedDate = localStorage.getItem("lastWorkoutDate");
    const today = new Date().toDateString();

    if (storedDate === today) {
      setDailyTotal(parseInt(localStorage.getItem("dailyTotal") || 0));
      setMuscleData({
        arms: parseInt(localStorage.getItem("muscle_arms") || 0),
        legs: parseInt(localStorage.getItem("muscle_legs") || 0),
        core: parseInt(localStorage.getItem("muscle_core") || 0),
      });
    } else {
      setDailyTotal(0);
      setMuscleData({ arms: 0, legs: 0, core: 0 }); // Reset muscles on new day
    }
  }, [exercise]);

  // Challenge Timer
  useEffect(() => {
    let interval = null;
    if (gameMode === "challenge" && timeLeft > 0 && !isGameOver) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameMode === "challenge" && !isGameOver) {
      endChallenge();
    }
    return () => clearInterval(interval);
  }, [gameMode, timeLeft, isGameOver]);

  // Rest Timer
  useEffect(() => {
    let interval = null;
    if (restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (restTimer === 0 && interval) {
      if (!isMuted) speak("Rest complete. Let's go.");
    }
    return () => clearInterval(interval);
  }, [restTimer]);

  const handleWeightChange = (e) => {
    const w = parseInt(e.target.value);
    setWeight(w);
    localStorage.setItem("user_weight", w);
  };

  const toggleCalories = () => {
    const newVal = !showCalories;
    setShowCalories(newVal);
    localStorage.setItem("show_calories", newVal);
  };

  const startChallenge = () => {
    setGameMode("challenge");
    setTimeLeft(60);
    setCount(0);
    countRef.current = 0;
    setIsGameOver(false);
    speak("Challenge Started. 60 seconds. Go!");
  };

  const endChallenge = () => {
    setIsGameOver(true);
    speak("Time's up! Challenge complete.");
    finishSet();
  };

  const exitChallenge = () => {
    setGameMode("standard");
    setIsGameOver(false);
    setTimeLeft(60);
    setCount(0);
    countRef.current = 0;
  };

  function speak(text) {
    if (isMutedRef.current) return;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.2;
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
      const exConfig = BASE_EXERCISES[exerciseRef.current];
      const thresholds = getThresholds(exConfig.type, difficultyRef.current);

      const [p1Name, p2Name, p3Name] = exConfig.joints;
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

        let skeletonColor = getRank(
          parseInt(localStorage.getItem("total_xp") || 0)
        ).color;
        if (curlStateRef.current === "active") {
          skeletonColor = "#00ff00";
        } else if (curlStateRef.current === "descending") {
          skeletonColor = "#ffffff";
        }

        drawSegment(ctx, p1, p2, p3, skeletonColor);
        const angle = calculateAngle(p1, p2, p3);

        drawAngleHud(ctx, p2, angle, skeletonColor);
        analyzeRep(angle, thresholds, exConfig);
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

  function analyzeRep(angle, thresholds, config) {
    if (isGameOver) return;

    const type = config.type;
    const current = curlStateRef.current;

    if (type === "squat") {
      if (angle > thresholds.rest) {
        if (current === "active") {
          completeRep(config);
        } else if (current === "descending") {
          setFeedback("Go Lower!");
          speak("Go Lower");
        }
        curlStateRef.current = "rest";
      } else if (angle < thresholds.active) {
        curlStateRef.current = "active";
      } else if (angle < thresholds.rest && current === "rest") {
        curlStateRef.current = "descending";
      }
    } else if (type === "curl") {
      if (angle > thresholds.rest) {
        if (current === "active") {
          completeRep(config);
        } else if (current === "descending") {
          setFeedback("Full Range!");
        }
        curlStateRef.current = "rest";
      } else if (angle < thresholds.active) {
        curlStateRef.current = "active";
      } else if (angle < thresholds.rest && current === "rest") {
        curlStateRef.current = "descending";
      }
    } else if (type === "jack") {
      if (angle < thresholds.rest) {
        curlStateRef.current = "rest";
      } else if (angle > thresholds.active && current === "rest") {
        curlStateRef.current = "active";
        completeRep(config);
      }
    }
  }

  function completeRep(config) {
    countRef.current += 1;
    const newCount = countRef.current;
    setCount(newCount);

    // BIOMETRIC CALORIES
    const weightFactor = weightRef.current / 70;
    const calEarned = config.calPerRep * weightFactor;

    setCalories((prev) => Math.round((prev + calEarned) * 10) / 10);

    setXp((prev) => {
      const newXp = prev + 10;
      localStorage.setItem("total_xp", newXp);
      const oldLevel = Math.floor(prev / 100) + 1;
      const newLevel = Math.floor(newXp / 100) + 1;
      if (newLevel > oldLevel) {
        speak("Level Up!");
      }
      return newXp;
    });

    const currentExercise = exerciseRef.current;
    const currentBest = parseInt(
      localStorage.getItem(`best_${currentExercise}`) || 0
    );

    if (gameModeRef.current !== "challenge" && newCount > currentBest) {
      setBest(newCount);
      localStorage.setItem(`best_${currentExercise}`, newCount);
      setFeedback("NEW RECORD!");
      if (!hasBrokenRecord.current) {
        speak("New Record!");
        hasBrokenRecord.current = true;
      }
    } else {
      setFeedback("Nice Rep!");
      speak(newCount.toString());
    }

    if (!isMutedRef.current) {
      popSound.currentTime = 0;
      popSound.play().catch((e) => console.log(e));
    }

    if (!isGameOver) {
      setTimeout(() => setFeedback("Go!"), 1000);
    }
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
      mode: gameModeRef.current,
    };
    const newHistory = [...history, newEntry];
    setHistory(newHistory);
    localStorage.setItem(
      `history_${exerciseRef.current}`,
      JSON.stringify(newHistory)
    );

    const today = new Date().toDateString();
    const lastDate = localStorage.getItem("lastWorkoutDate");

    // Update Daily Total
    let newDaily = dailyTotal + countRef.current;
    if (lastDate !== today) newDaily = countRef.current;
    setDailyTotal(newDaily);
    localStorage.setItem("dailyTotal", newDaily);

    // Update Muscle Data
    const exConfig = BASE_EXERCISES[exerciseRef.current];
    const muscleGroup = exConfig.muscle; // arms, legs, or core
    const currentMuscleVal = muscleData[muscleGroup];
    const newMuscleVal = currentMuscleVal + countRef.current;

    setMuscleData((prev) => ({ ...prev, [muscleGroup]: newMuscleVal }));
    localStorage.setItem(`muscle_${muscleGroup}`, newMuscleVal);

    // Update Streak
    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      let newStreak = 1;
      if (lastDate === yesterday.toDateString()) newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("streak", newStreak);
    }
    localStorage.setItem("lastWorkoutDate", today);

    if (gameModeRef.current === "standard") {
      setRestTimer(45);
      countRef.current = 0;
      setCount(0);
      hasBrokenRecord.current = false;
      setFeedback("Set Saved!");
    }
  }

  function drawAngleHud(ctx, center, angle, color) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasRef.current.width, 0);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 40, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fill();
    ctx.fillStyle = "white";
    ctx.font = "bold 16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(Math.round(angle) + "°", center.x, center.y);
    ctx.beginPath();
    const radius = 35;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * (1 - angle / 180);
    ctx.arc(center.x, center.y, radius, startAngle, endAngle, true);
    ctx.lineWidth = 6;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.restore();
  }

  function drawSegment(ctx, p1, p2, p3, color) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasRef.current.width, 0);
    ctx.shadowColor = color;
    ctx.shadowBlur = 15;
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.strokeStyle = color;
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

  if (appState === "intro") {
    return (
      <div className="bg-gray-900 h-screen w-full text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
          <div className="absolute top-20 right-20 w-72 h-72 bg-teal-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="z-10 text-center max-w-2xl">
          <div className="mb-8 inline-block p-4 rounded-full bg-gray-800/50 backdrop-blur border border-gray-700">
            <span className="text-2xl">🤖</span>
          </div>
          <h1 className="text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-blue-600 animate-gradient">
            AI Fitness Trainer
          </h1>
          <p className="text-gray-300 text-xl mb-12 leading-relaxed">
            Transform your webcam into a personal gym tracker.
            <br />
            Count reps, track sets, and level up with computer vision.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => {
                toggleFullScreen();
                setAppState("active");
              }}
              className="px-8 py-4 bg-gradient-to-r from-teal-500 to-blue-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-teal-500/50 transition-all transform hover:scale-105"
            >
              Start Workout
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="px-8 py-4 bg-gray-800 rounded-xl font-bold text-lg border border-gray-700 hover:bg-gray-700 transition-all"
            >
              How to Play
            </button>
          </div>
        </div>

        {showInstructions && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl max-w-md w-full relative">
              <button
                onClick={() => setShowInstructions(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-white"
              >
                ✕
              </button>
              <h2 className="text-2xl font-bold mb-4 text-teal-400">
                How to use
              </h2>
              <ul className="space-y-3 text-gray-300">
                <li>1. Allow camera access.</li>
                <li>2. Choose an exercise (e.g., Left Curl).</li>
                <li>
                  3. Stand back until the{" "}
                  <span className="text-teal-400 font-bold">Skeleton</span>{" "}
                  appears.
                </li>
                <li>4. Complete full reps to earn XP!</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white p-4 lg:p-8 flex flex-col items-center">
      {/* Header with Widget */}
      <div className="w-full max-w-7xl flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={() => setAppState("intro")}
            className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 text-sm border border-gray-700"
          >
            ← Exit
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 text-sm border border-gray-700"
          >
            ⚙️
          </button>

          {/* Zen Mode Toggle */}
          <button
            onClick={() => setZenMode(!zenMode)}
            className={`p-2 rounded-lg text-sm border ${
              zenMode
                ? "bg-purple-500/20 border-purple-500 text-purple-400"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {zenMode ? "🧘 Active" : "🧘 Zen"}
          </button>

          <button
            onClick={gameMode === "standard" ? startChallenge : exitChallenge}
            className={`p-2 rounded-lg text-sm border font-bold ${
              gameMode === "challenge"
                ? "bg-red-500/20 border-red-500 text-red-400"
                : "bg-gray-800 border-gray-700 text-teal-400 hover:text-white"
            }`}
          >
            {gameMode === "challenge"
              ? `⏱️ Stop (${timeLeft})`
              : "⚡ Challenge"}
          </button>
        </div>

        {/* Widgets - Hide in Zen Mode */}
        {!zenMode && (
          <div className="flex items-center gap-6 bg-gray-800/50 p-2 px-4 rounded-xl border border-gray-700">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔥</span>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  Streak
                </span>
                <p className="text-white font-bold leading-none">
                  {streak} Days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke="#374151"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  <circle
                    cx="20"
                    cy="20"
                    r="16"
                    stroke={currentRank.color}
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="100"
                    strokeDashoffset={100 - dailyProgress}
                    className="transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">
                  {Math.round(dailyProgress)}%
                </span>
              </div>
              <div>
                <span className="text-[10px] text-gray-400 uppercase font-bold">
                  Daily Goal
                </span>
                <p className="text-white font-bold leading-none">
                  {dailyTotal} / {DAILY_GOAL}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 w-full md:w-auto justify-end">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-lg border ${
              isMuted
                ? "bg-red-500/20 border-red-500 text-red-400"
                : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
            }`}
          >
            {isMuted ? "🔇" : "🔊"}
          </button>
          {!zenMode && (
            <div className="text-right hidden sm:block">
              <p className="text-xs text-gray-400 uppercase">Best</p>
              <p className="text-xl font-bold text-yellow-400">{best}</p>
            </div>
          )}
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

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 left-4 z-50 bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-64">
          <h3 className="font-bold text-teal-400 mb-4">Settings</h3>
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase block mb-2">
              Difficulty
            </label>
            <div className="flex flex-col gap-2">
              {["easy", "normal", "hard"].map((level) => (
                <button
                  key={level}
                  onClick={() => setDifficulty(level)}
                  className={`px-3 py-2 rounded text-sm capitalize border ${
                    difficulty === level
                      ? "bg-teal-500/20 border-teal-500 text-teal-400"
                      : "bg-gray-800 border-gray-600 text-gray-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs text-gray-400 uppercase">
              Show Calories
            </label>
            <button
              onClick={toggleCalories}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                showCalories ? "bg-teal-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${
                  showCalories ? "left-6" : "left-1"
                }`}
              ></div>
            </button>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-400 uppercase block mb-2">
              Weight (kg)
            </label>
            <input
              type="number"
              value={weight}
              onChange={handleWeightChange}
              className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
          <p className="text-[10px] text-gray-500">
            Hard mode requires deeper squats and full extension.
          </p>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-gray-900 border border-teal-500 p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl transform scale-110">
            <h2 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-blue-500 mb-2">
              TIME'S UP!
            </h2>
            <p className="text-gray-400 mb-8">Challenge Complete</p>
            <div className="text-8xl font-mono font-bold text-white mb-8">
              {count} <span className="text-2xl text-gray-500">Reps</span>
            </div>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-800 p-4 rounded-xl">
                <p className="text-xs text-gray-400">XP Earned</p>
                <p className="text-xl font-bold text-yellow-400">
                  +{count * 10}
                </p>
              </div>
              {showCalories && (
                <div className="bg-gray-800 p-4 rounded-xl">
                  <p className="text-xs text-gray-400">Calories</p>
                  <p className="text-xl font-bold text-orange-400">
                    {calories}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={exitChallenge}
              className="w-full py-4 bg-teal-600 hover:bg-teal-700 rounded-xl font-bold text-lg text-white"
            >
              Close & Save
            </button>
          </div>
        </div>
      )}

      {/* XP Bar - Hide in Zen Mode */}
      {!zenMode && (
        <div className="w-full max-w-7xl bg-gray-800 rounded-full h-4 mb-8 relative overflow-hidden border border-gray-700">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressToNextLevel}%` }}
          ></div>
          <p className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white tracking-widest uppercase">
            {currentRank.title} (Lvl {level}) • {xp} XP
          </p>
        </div>
      )}

      {/* Main Grid */}
      <div
        className={`w-full max-w-7xl grid ${
          zenMode ? "grid-cols-1 justify-center" : "grid-cols-1 lg:grid-cols-2"
        } gap-8 items-start`}
      >
        {/* LEFT COL: Camera */}
        <div
          className={`flex flex-col gap-4 ${
            zenMode ? "max-w-4xl mx-auto w-full" : ""
          }`}
        >
          <div
            className={`relative border-4 ${
              gameMode === "challenge"
                ? "border-red-500 shadow-red-500/20"
                : "border-gray-700"
            } rounded-2xl overflow-hidden shadow-2xl bg-black w-full aspect-video transition-all duration-300`}
          >
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

            {/* HUD: Reps & Calories */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
              <div className="bg-black/60 backdrop-blur px-4 py-3 rounded-xl border-l-4 border-teal-500 shadow-lg">
                <span className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
                  Reps
                </span>
                <span className="text-5xl font-mono font-bold text-white leading-none">
                  {count}
                </span>
              </div>
              {showCalories && (
                <div className="bg-black/60 backdrop-blur px-4 py-2 rounded-xl border-l-4 border-orange-500 shadow-lg flex flex-col justify-center">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔥</span>
                    <div>
                      <span className="text-gray-400 text-[10px] uppercase tracking-wider block">
                        Burn
                      </span>
                      <span className="text-lg font-mono font-bold text-white leading-none">
                        {calories}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-orange-300 font-medium mt-1">
                    {getFoodEquivalent(calories)}
                  </span>
                </div>
              )}
            </div>

            {/* Challenge Timer Overlay */}
            {gameMode === "challenge" && (
              <div className="absolute top-4 right-4 bg-red-600/90 backdrop-blur px-6 py-3 rounded-xl shadow-lg border-2 border-white animate-pulse">
                <span className="text-white text-xs uppercase font-bold block mb-1">
                  Time Left
                </span>
                <span className="text-4xl font-mono font-black text-white">
                  {timeLeft}
                </span>
              </div>
            )}

            {/* Rest Timer Overlay */}
            {restTimer > 0 && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-teal-400 mb-2 animate-pulse">
                  Rest & Recover
                </h3>
                <div className="text-8xl font-black text-white mb-6 font-mono">
                  {restTimer}
                </div>
                <button
                  onClick={() => setRestTimer(0)}
                  className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-bold"
                >
                  Skip Rest
                </button>
              </div>
            )}

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2">
              <div
                className={`px-6 py-3 rounded-full backdrop-blur font-bold text-xl transition-all duration-300 shadow-xl ${
                  feedback.includes("RECORD")
                    ? "bg-yellow-500 text-black scale-110"
                    : "bg-black/60 text-gray-300"
                }`}
              >
                {feedback}
              </div>
            </div>
          </div>

          {/* Hide normal button in challenge mode */}
          {gameMode !== "challenge" && (
            <button
              onClick={finishSet}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition active:scale-95 text-lg tracking-wide uppercase"
            >
              Finish Set & Save Progress
            </button>
          )}
        </div>

        {/* RIGHT COL: Analytics - Hide in Zen Mode */}
        {!zenMode && (
          <div className="grid grid-rows-[auto_1fr] gap-4 h-full">
            {/* MUSCLE MAP - NEW WIDGET */}
            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl flex flex-col items-center">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 self-start">
                Muscle Activity (Today)
              </h3>
              <MuscleMap muscleData={muscleData} />
            </div>

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
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl max-h-80 overflow-y-auto custom-scrollbar">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4 sticky top-0 bg-gray-800 pb-2 border-b border-gray-700">
                Today's Sessions
              </h3>
              {history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-600">
                  <p className="text-sm italic">No sets completed yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history
                    .slice()
                    .reverse()
                    .map((set, index) => (
                      <div
                        key={set.id}
                        className={`flex justify-between items-center bg-gray-700/30 p-4 rounded-xl border border-gray-700/50 hover:bg-gray-700/50 transition-colors ${
                          set.mode === "challenge"
                            ? "border-l-4 border-l-red-500"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                              set.mode === "challenge"
                                ? "bg-red-500/20 text-red-400"
                                : "bg-teal-500/20 text-teal-400"
                            }`}
                          >
                            {set.mode === "challenge"
                              ? "⚡"
                              : history.length - index}
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
        )}
      </div>
    </div>
  );
}

export default App;
