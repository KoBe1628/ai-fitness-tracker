import React, { useRef, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
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

// --- TROPHY DATA ---
const TROPHIES = [
  {
    id: "first_steps",
    icon: "👟",
    title: "First Steps",
    desc: "Complete your first 10 reps",
    check: (stats) => stats.totalReps >= 10,
  },
  {
    id: "century_club",
    icon: "💯",
    title: "Century Club",
    desc: "Complete 100 total reps",
    check: (stats) => stats.totalReps >= 100,
  },
  {
    id: "leg_day",
    icon: "🦵",
    title: "Iron Legs",
    desc: "Complete 50 Squats",
    check: (stats) => stats.squats >= 50,
  },
  {
    id: "gun_show",
    icon: "💪",
    title: "Gun Show",
    desc: "Complete 50 Curls",
    check: (stats) => stats.curls >= 50,
  },
  {
    id: "cardio_king",
    icon: "⚡",
    title: "Cardio King",
    desc: "Complete 100 Jumping Jacks",
    check: (stats) => stats.jacks >= 100,
  },
  {
    id: "streak_3",
    icon: "🔥",
    title: "On Fire",
    desc: "Reach a 3-day streak",
    check: (stats) => stats.streak >= 3,
  },
  {
    id: "high_level",
    icon: "🚀",
    title: "High Flyer",
    desc: "Reach Level 5",
    check: (stats) => stats.level >= 5,
  },
  {
    id: "challenge_champ",
    icon: "🏆",
    title: "Champion",
    desc: "Complete a Daily Challenge",
    check: (stats) => stats.challenges >= 1,
  },
];

// --- COMPONENTS ---

const MuscleMap = ({ muscleData }) => {
  const getColor = (reps) => {
    if (!reps || reps === 0) return "#374151";
    if (reps < 20) return "#2DD4BF";
    if (reps < 50) return "#FACC15";
    return "#EF4444";
  };

  const getOpacity = (reps) => {
    if (!reps) return 0.3;
    return Math.min(0.5 + reps / 100, 1);
  };

  return (
    <div className="relative w-full h-64 flex items-center justify-center">
      <svg viewBox="0 0 200 400" className="h-full drop-shadow-2xl">
        <circle
          cx="100"
          cy="50"
          r="25"
          fill="#1F2937"
          stroke="#4B5563"
          strokeWidth="2"
        />
        <path
          d="M75,80 L125,80 L115,200 L85,200 Z"
          fill={getColor(muscleData.core)}
          fillOpacity={getOpacity(muscleData.core)}
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M75,85 L50,150 L65,160 L80,100 Z"
          fill={getColor(muscleData.arms)}
          fillOpacity={getOpacity(muscleData.arms)}
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M125,85 L150,150 L135,160 L120,100 Z"
          fill={getColor(muscleData.arms)}
          fillOpacity={getOpacity(muscleData.arms)}
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M85,200 L70,300 L90,300 L100,200 Z"
          fill={getColor(muscleData.legs)}
          fillOpacity={getOpacity(muscleData.legs)}
          stroke="white"
          strokeWidth="2"
        />
        <path
          d="M115,200 L130,300 L110,300 L100,200 Z"
          fill={getColor(muscleData.legs)}
          fillOpacity={getOpacity(muscleData.legs)}
          stroke="white"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
};

const WorkoutsCalendar = ({ triggerUpdate }) => {
  const [activityLog, setActivityLog] = useState({});

  useEffect(() => {
    const log = JSON.parse(localStorage.getItem("activity_log")) || {};
    setActivityLog(log);
  }, [triggerUpdate]);

  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d);
  }

  return (
    <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 mb-4">
      <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-3">
        Weekly Streak
      </h3>
      <div className="flex justify-between">
        {days.map((d, i) => {
          const dateKey = d.toDateString();
          const isActive = activityLog[dateKey];
          const isToday = new Date().toDateString() === dateKey;

          return (
            <div key={i} className="flex flex-col items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all
                  ${
                    isActive
                      ? "bg-teal-500 border-teal-500 text-black"
                      : "border-gray-700 text-gray-500 bg-gray-800"
                  }
                  ${
                    isToday && !isActive
                      ? "border-teal-500/50 animate-pulse"
                      : ""
                  }
               `}
              >
                {isActive ? "✓" : d.getDate()}
              </div>
              <span className="text-[10px] text-gray-400">
                {d.toLocaleDateString("en-US", { weekday: "narrow" })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function App() {
  // --- APP STATE ---
  const [appState, setAppState] = useState("intro");
  const [showInstructions, setShowInstructions] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showTrophies, setShowTrophies] = useState(false); // New: Trophy Modal
  const [isMuted, setIsMuted] = useState(false);
  const [difficulty, setDifficulty] = useState("normal");
  const [gameMode, setGameMode] = useState("standard");
  const [showCalories, setShowCalories] = useState(true);
  const [zenMode, setZenMode] = useState(false);
  const [privacyMode, setPrivacyMode] = useState(false);
  const [showDailyChallenge, setShowDailyChallenge] = useState(true);

  // --- WORKOUT STATE ---
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
  const [unlockedTrophies, setUnlockedTrophies] = useState([]); // New: Track Unlocks

  const [muscleData, setMuscleData] = useState({ arms: 0, legs: 0, core: 0 });
  const [timeLeft, setTimeLeft] = useState(60);
  const [restTimer, setRestTimer] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [showReportCard, setShowReportCard] = useState(false);
  const [reportData, setReportData] = useState({ reps: 0, xp: 0, cals: 0 });

  // Triggers calendar re-render
  const [calendarUpdate, setCalendarUpdate] = useState(0);

  // --- DAILY CHALLENGE STATE ---
  const [isDailyChallengeActive, setIsDailyChallengeActive] = useState(false);
  const [challengeStep, setChallengeStep] = useState(0);

  const DAILY_ROUTINE = [
    { exercise: "jumping_jack", reps: 20, name: "20 Jumping Jacks" },
    { exercise: "squat", reps: 10, name: "10 Squats" },
    { exercise: "left_curl", reps: 10, name: "10 Left Curls" },
    { exercise: "right_curl", reps: 10, name: "10 Right Curls" },
  ];

  // --- REFS ---
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null); // Ref for file upload
  const startedRef = useRef(false);
  const detectorRef = useRef(null);
  const countRef = useRef(0);
  const curlStateRef = useRef("rest");
  const exerciseRef = useRef("left_curl");
  const hasBrokenRecord = useRef(false);
  const isMutedRef = useRef(false);
  const difficultyRef = useRef("normal");
  const gameModeRef = useRef("standard");
  const weightRef = useRef(70);
  const showReportCardRef = useRef(false);
  const privacyModeRef = useRef(false);
  const lastRepTimestampRef = useRef(Date.now());

  const level = Math.floor(xp / 100) + 1;
  const progressToNextLevel = xp % 100;
  const DAILY_GOAL = 50;
  const dailyProgress = Math.min((dailyTotal / DAILY_GOAL) * 100, 100);

  // --- THEME ENGINE ---
  const getRank = (xp) => {
    if (xp < 100)
      return {
        title: "ROOKIE",
        color: "#2DD4BF",
        shadow: "shadow-teal-500/50",
        border: "border-teal-500",
        text: "text-teal-400",
        gradient: "from-teal-400 to-blue-500",
      };
    if (xp < 500)
      return {
        title: "ATHLETE",
        color: "#FACC15",
        shadow: "shadow-yellow-500/50",
        border: "border-yellow-500",
        text: "text-yellow-400",
        gradient: "from-yellow-400 to-orange-500",
      };
    return {
      title: "SPARTAN",
      color: "#D946EF",
      shadow: "shadow-fuchsia-500/50",
      border: "border-fuchsia-500",
      text: "text-fuchsia-400",
      gradient: "from-fuchsia-500 to-purple-600",
    };
  };

  const currentRank = getRank(xp);
  const theme = currentRank;

  const BASE_EXERCISES = {
    left_curl: {
      name: "Left Bicep Curl",
      joints: ["left_shoulder", "left_elbow", "left_wrist"],
      type: "curl",
      calPerRep: 0.4,
      muscle: "arms",
      isCardio: false,
    },
    right_curl: {
      name: "Right Bicep Curl",
      joints: ["right_shoulder", "right_elbow", "right_wrist"],
      type: "curl",
      calPerRep: 0.4,
      muscle: "arms",
      isCardio: false,
    },
    squat: {
      name: "Squat",
      joints: ["left_hip", "left_knee", "left_ankle"],
      type: "squat",
      calPerRep: 1.2,
      muscle: "legs",
      isCardio: false,
    },
    jumping_jack: {
      name: "Jumping Jacks",
      joints: ["right_hip", "right_shoulder", "right_elbow"],
      type: "jack",
      calPerRep: 1.5,
      muscle: "core",
      isCardio: true,
    },
  };

  const DIFFICULTY_MODS = {
    easy: { active: 20, rest: -20 },
    normal: { active: 0, rest: 0 },
    hard: { active: -20, rest: 10 },
  };

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

  // --- DATA BACKUP FUNCTIONS ---
  const exportData = () => {
    const data = {
      total_xp: localStorage.getItem("total_xp"),
      streak: localStorage.getItem("streak"),
      dailyTotal: localStorage.getItem("dailyTotal"),
      lastWorkoutDate: localStorage.getItem("lastWorkoutDate"),
      user_weight: localStorage.getItem("user_weight"),
      show_calories: localStorage.getItem("show_calories"),
      show_daily_challenge: localStorage.getItem("show_daily_challenge"),
      trophies: localStorage.getItem("trophies"),
      activity_log: localStorage.getItem("activity_log"),

      // Exercise Specifics
      best_left_curl: localStorage.getItem("best_left_curl"),
      history_left_curl: localStorage.getItem("history_left_curl"),
      best_right_curl: localStorage.getItem("best_right_curl"),
      history_right_curl: localStorage.getItem("history_right_curl"),
      best_squat: localStorage.getItem("best_squat"),
      history_squat: localStorage.getItem("history_squat"),
      best_jumping_jack: localStorage.getItem("best_jumping_jack"),
      history_jumping_jack: localStorage.getItem("history_jumping_jack"),

      // Muscles
      muscle_arms: localStorage.getItem("muscle_arms"),
      muscle_legs: localStorage.getItem("muscle_legs"),
      muscle_core: localStorage.getItem("muscle_core"),
    };

    const blob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitness_data.json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        Object.keys(data).forEach((key) => {
          if (data[key] !== null) localStorage.setItem(key, data[key]);
        });
        alert("Data imported successfully! Reloading...");
        window.location.reload();
      } catch (err) {
        console.error("Import failed", err);
        alert("Invalid data file");
      }
    };
    reader.readAsText(file);
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
    showReportCardRef.current = showReportCard;
    privacyModeRef.current = privacyMode;
  }, [
    exercise,
    difficulty,
    isMuted,
    gameMode,
    weight,
    showReportCard,
    privacyMode,
  ]);

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
    setUnlockedTrophies(JSON.parse(localStorage.getItem("trophies")) || []);

    const savedWeight = localStorage.getItem("user_weight");
    if (savedWeight) setWeight(parseInt(savedWeight));

    const savedShowCal = localStorage.getItem("show_calories");
    if (savedShowCal !== null) setShowCalories(savedShowCal === "true");

    const savedShowDaily = localStorage.getItem("show_daily_challenge");
    if (savedShowDaily !== null)
      setShowDailyChallenge(savedShowDaily === "true");

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
      setMuscleData({ arms: 0, legs: 0, core: 0 });
    }
  }, [exercise]);

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

  useEffect(() => {
    let interval = null;
    if (restTimer > 0) {
      interval = setInterval(() => {
        setRestTimer((prev) => prev - 1);
      }, 1000);
    } else if (restTimer === 0 && interval) {
      if (!isMuted)
        speak(
          isDailyChallengeActive
            ? "Next exercise ready."
            : "Rest complete. Let's go."
        );
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

  const toggleDailyChallenge = () => {
    const newVal = !showDailyChallenge;
    setShowDailyChallenge(newVal);
    localStorage.setItem("show_daily_challenge", newVal);
  };

  const startDailyChallenge = () => {
    setIsDailyChallengeActive(true);
    setChallengeStep(0);
    setExercise(DAILY_ROUTINE[0].exercise);

    toggleFullScreen();
    setAppState("active");
    speak(`Starting Daily Challenge. First up: ${DAILY_ROUTINE[0].name}`);
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

    if (showReportCardRef.current) {
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

      if (privacyModeRef.current) {
        drawFaceMask(ctx, pose);
      }

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
    const now = Date.now();
    const duration = (now - lastRepTimestampRef.current) / 1000;
    lastRepTimestampRef.current = now;

    let tempoStatus = "good";
    let tempoMsg = "";

    if (config.isCardio) {
      if (duration < 1.0) {
        tempoStatus = "fast";
        tempoMsg = "🔥 Great Speed!";
      } else if (duration > 2.0) {
        tempoStatus = "slow";
        tempoMsg = "Push Harder!";
      } else {
        tempoMsg = "Good Pace";
      }
    } else {
      if (duration < 1.5) {
        tempoStatus = "fast";
        tempoMsg = "⚠️ Too Fast!";
      } else {
        tempoMsg = "Good Control";
      }
    }

    // setLastRepTime(duration.toFixed(1)); // Removed unused state
    // setTempoStatus(tempoStatus); // Removed unused state

    countRef.current += 1;
    const newCount = countRef.current;
    setCount(newCount);

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

    let speechText = newCount.toString();
    let feedbackText = tempoMsg;

    if (gameModeRef.current !== "challenge" && newCount > currentBest) {
      setBest(newCount);
      localStorage.setItem(`best_${currentExercise}`, newCount);
      feedbackText = "NEW RECORD!";
      if (!hasBrokenRecord.current) {
        speechText = "New Record!";
        hasBrokenRecord.current = true;
      }
    }

    if (!config.isCardio && tempoStatus === "fast") {
      speechText = "Slow Down";
      feedbackText = "⚠️ Too Fast!";
    }

    setFeedback(feedbackText);
    speak(speechText);

    if (!isMutedRef.current) {
      popSound.currentTime = 0;
      popSound.play().catch((e) => console.log(e));
    }

    if (!isGameOver) {
      setTimeout(() => setFeedback("Go!"), 1500);
    }
  }

  function finishSet() {
    if (countRef.current === 0 && !isDailyChallengeActive) return;

    const reps = countRef.current;
    const exName = BASE_EXERCISES[exerciseRef.current].name;
    const config = BASE_EXERCISES[exerciseRef.current];
    const weightFactor = weightRef.current / 70;
    const calsBurned =
      Math.round(reps * config.calPerRep * weightFactor * 10) / 10;
    const xpEarned = reps * 10;

    const newEntry = {
      reps: reps,
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

    let newDaily = dailyTotal + reps;
    if (lastDate !== today) newDaily = reps;
    setDailyTotal(newDaily);
    localStorage.setItem("dailyTotal", newDaily);

    const muscleGroup = config.muscle;
    const currentMuscleVal = muscleData[muscleGroup];
    const newMuscleVal = currentMuscleVal + reps;
    setMuscleData((prev) => ({ ...prev, [muscleGroup]: newMuscleVal }));
    localStorage.setItem(`muscle_${muscleGroup}`, newMuscleVal);

    // --- ACTIVITY LOG (FOR CALENDAR) ---
    const activityLog = JSON.parse(localStorage.getItem("activity_log")) || {};
    activityLog[today] = true;
    localStorage.setItem("activity_log", JSON.stringify(activityLog));

    // --- CHECK TROPHIES ---
    const currentStats = {
      totalReps: parseInt(localStorage.getItem("total_xp") || 0) / 10, // Approx
      squats: parseInt(localStorage.getItem("muscle_legs") || 0),
      curls: parseInt(localStorage.getItem("muscle_arms") || 0),
      jacks: parseInt(localStorage.getItem("muscle_core") || 0),
      streak: streak,
      level: level,
      challenges: 0, // Placeholder
    };

    let newUnlock = false;
    const newUnlocked = [...unlockedTrophies];

    TROPHIES.forEach((t) => {
      if (!newUnlocked.includes(t.id) && t.check(currentStats)) {
        newUnlocked.push(t.id);
        speak(`Achievement Unlocked: ${t.title}`);
        newUnlock = true;
      }
    });

    if (newUnlock) {
      setUnlockedTrophies(newUnlocked);
      localStorage.setItem("trophies", JSON.stringify(newUnlocked));
    }

    if (lastDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      let newStreak = 1;
      if (lastDate === yesterday.toDateString()) newStreak = streak + 1;
      setStreak(newStreak);
      localStorage.setItem("streak", newStreak);
    }
    localStorage.setItem("lastWorkoutDate", today);

    // DAILY CHALLENGE LOGIC
    if (isDailyChallengeActive) {
      const nextStep = challengeStep + 1;
      if (nextStep < DAILY_ROUTINE.length) {
        setReportData({
          reps,
          xp: xpEarned,
          cals: calsBurned,
          exercise: exName,
          nextUp: DAILY_ROUTINE[nextStep].name,
        });
        setChallengeStep(nextStep);

        // Switch Exercise Context
        const nextEx = DAILY_ROUTINE[nextStep].exercise;
        setExercise(nextEx);
        exerciseRef.current = nextEx; // Immediate update for loop
      } else {
        // Challenge Complete
        setReportData({
          reps,
          xp: xpEarned + 500,
          cals: calsBurned,
          exercise: "Daily Challenge Complete!",
          isFinal: true,
        });
        setIsDailyChallengeActive(false);
        setXp((prev) => {
          const bonus = prev + 500;
          localStorage.setItem("total_xp", bonus);
          return bonus;
        });
        speak("Challenge Complete! You are a legend.");
      }
    } else {
      setReportData({ reps, xp: xpEarned, cals: calsBurned, exercise: exName });
    }

    setShowReportCard(true);
    setCalendarUpdate((prev) => prev + 1); // Trigger calendar refresh

    if (gameModeRef.current === "standard") {
      speak("Set Saved.");
      countRef.current = 0;
      setCount(0);
      hasBrokenRecord.current = false;
    }
  }

  const closeReportCard = () => {
    setShowReportCard(false);
    setRestTimer(45);
    // Reset count visual
    setCount(0);
    countRef.current = 0;
  };

  function drawFaceMask(ctx, pose) {
    const nose = pose.keypoints.find((k) => k.name === "nose");
    const leftEar = pose.keypoints.find((k) => k.name === "left_ear");
    const rightEar = pose.keypoints.find((k) => k.name === "right_ear");
    if (!nose || nose.score < 0.3) return;
    let size = 60;
    if (leftEar && rightEar && leftEar.score > 0.3 && rightEar.score > 0.3) {
      size = Math.abs(leftEar.x - rightEar.x) * 2;
    }
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvasRef.current.width, 0);
    ctx.font = `${size}px serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🤖", nose.x, nose.y);
    ctx.restore();
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
          <h1
            className={`text-6xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r ${theme.gradient} animate-gradient`}
          >
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
              className={`px-8 py-4 bg-gradient-to-r ${theme.gradient} rounded-xl font-bold text-lg shadow-lg hover:${theme.shadow} transition-all transform hover:scale-105`}
            >
              Start Workout
            </button>
            {showDailyChallenge && (
              <button
                onClick={startDailyChallenge}
                className="px-8 py-4 bg-yellow-500/20 text-yellow-400 border border-yellow-500 rounded-xl font-bold text-lg shadow-lg hover:bg-yellow-500/30 transition-all transform hover:scale-105"
              >
                Daily Challenge 🏆
              </button>
            )}
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
              <h2 className={`text-2xl font-bold mb-4 ${theme.text}`}>
                How to use
              </h2>
              <ul className="space-y-3 text-gray-300">
                <li>1. Allow camera access.</li>
                <li>2. Choose an exercise (e.g., Left Curl).</li>
                <li>
                  3. Stand back until the{" "}
                  <span className={`${theme.text} font-bold`}>Skeleton</span>{" "}
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
          <button
            onClick={() => setShowTrophies(!showTrophies)}
            className="bg-gray-800 p-2 rounded-lg hover:bg-gray-700 text-sm border border-gray-700"
          >
            🏆
          </button>

          <button
            onClick={() => setPrivacyMode(!privacyMode)}
            className={`p-2 rounded-lg text-sm border ${
              privacyMode
                ? "bg-indigo-500/20 border-indigo-500 text-indigo-400"
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {privacyMode ? "🕵️" : "👁️"}
          </button>

          <button
            onClick={() => setZenMode(!zenMode)}
            className={`p-2 rounded-lg text-sm border ${
              zenMode
                ? `bg-gray-800 ${theme.border} ${theme.text}`
                : "bg-gray-800 border-gray-700 text-gray-400"
            }`}
          >
            {zenMode ? "🧘" : "🧘"}
          </button>

          {/* Hide Standard Challenge in Daily Mode */}
          {!isDailyChallengeActive && (
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
          )}
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
                    stroke={theme.color}
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
          {/* Hide Dropdown in Daily Mode (It's automatic) */}
          {!isDailyChallengeActive && (
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
          )}
          {isDailyChallengeActive && (
            <div className="px-4 py-2 bg-yellow-500/20 border border-yellow-500 rounded-lg text-yellow-400 font-bold animate-pulse">
              Step {challengeStep + 1} / {DAILY_ROUTINE.length}
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <div className="absolute top-20 left-4 z-50 bg-gray-900 border border-gray-700 p-6 rounded-xl shadow-2xl w-64">
          <h3 className={`font-bold ${theme.text} mb-4`}>Settings</h3>
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
                      ? `bg-gray-800 ${theme.border} ${theme.text}`
                      : "bg-gray-800 border-gray-600 text-gray-300"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Enable/Disable Daily Challenge */}
          <div className="mb-4 flex items-center justify-between">
            <label className="text-xs text-gray-400 uppercase">
              Daily Challenge
            </label>
            <button
              onClick={toggleDailyChallenge}
              className={`w-10 h-5 rounded-full relative transition-colors ${
                showDailyChallenge ? "bg-yellow-500" : "bg-gray-600"
              }`}
            >
              <div
                className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${
                  showDailyChallenge ? "left-6" : "left-1"
                }`}
              ></div>
            </button>
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

          {/* DATA BACKUP */}
          <div className="mb-4 pt-4 border-t border-gray-700">
            <label className="text-xs text-gray-400 uppercase block mb-2">
              Data Backup
            </label>
            <button
              onClick={exportData}
              className="w-full mb-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-bold text-white"
            >
              Export Data (Save)
            </button>
            <label className="w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm font-bold text-white text-center cursor-pointer block">
              Import Data (Load)
              <input
                type="file"
                className="hidden"
                accept=".json"
                onChange={importData}
              />
            </label>
          </div>

          <p className="text-[10px] text-gray-500">
            Hard mode requires deeper squats and full extension.
          </p>
        </div>
      )}

      {/* Trophy Modal */}
      {showTrophies && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="bg-gray-900 border border-teal-500 p-8 rounded-3xl max-w-2xl w-full relative">
            <button
              onClick={() => setShowTrophies(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              ✕
            </button>
            <h2 className={`text-3xl font-bold mb-6 ${theme.text} text-center`}>
              Trophy Room
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {TROPHIES.map((t) => {
                const isUnlocked = unlockedTrophies.includes(t.id);
                return (
                  <div
                    key={t.id}
                    className={`p-4 rounded-xl border text-center ${
                      isUnlocked
                        ? `bg-gray-800 border-yellow-500 shadow-lg shadow-yellow-500/10`
                        : "bg-gray-800/50 border-gray-700 opacity-50"
                    }`}
                  >
                    <div className="text-4xl mb-2 filter drop-shadow-md">
                      {t.icon}
                    </div>
                    <h3
                      className={`text-sm font-bold ${
                        isUnlocked ? "text-white" : "text-gray-500"
                      }`}
                    >
                      {t.title}
                    </h3>
                    <p className="text-[10px] text-gray-400 mt-1">{t.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {isGameOver && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div
            className={`bg-gray-900 border ${theme.border} p-10 rounded-3xl max-w-lg w-full text-center shadow-2xl transform scale-110`}
          >
            <h2
              className={`text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} mb-2`}
            >
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
              className={`w-full py-4 bg-gradient-to-r ${theme.gradient} rounded-xl font-bold text-lg text-white`}
            >
              Close & Save
            </button>
          </div>
        </div>
      )}

      {/* REPORT CARD MODAL */}
      {showReportCard && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div
            className={`bg-gray-900 border ${theme.border} p-8 rounded-3xl max-w-md w-full text-center shadow-2xl animate-fade-in-up`}
          >
            <h2
              className={`text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} mb-2`}
            >
              {reportData.isFinal ? "WORKOUT COMPLETE!" : "SET COMPLETE!"}
            </h2>
            <p className="text-gray-400 mb-6 font-medium">
              {reportData.exercise}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                <div className="text-2xl font-bold text-white">
                  {reportData.reps}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Reps
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                <div className="text-2xl font-bold text-yellow-400">
                  +{reportData.xp}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  XP
                </div>
              </div>
              <div className="bg-gray-800 p-3 rounded-xl border border-gray-700">
                <div className="text-2xl font-bold text-orange-400">
                  {reportData.cals}
                </div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">
                  Cals
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={closeReportCard}
                className={`flex-1 py-3 bg-gradient-to-r ${theme.gradient} hover:opacity-90 rounded-xl font-bold text-lg text-white shadow-lg transform transition hover:scale-105`}
              >
                {reportData.nextUp ? `Start ${reportData.nextUp}` : "Continue"}
              </button>
              {reportData.isFinal && (
                <button
                  onClick={() => setAppState("intro")}
                  className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl font-bold text-gray-300"
                >
                  Menu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* XP Bar - Hide in Zen Mode */}
      {!zenMode && (
        <div className="w-full max-w-7xl bg-gray-800 rounded-full h-4 mb-8 relative overflow-hidden border border-gray-700">
          <div
            className={`h-full bg-gradient-to-r ${theme.gradient} transition-all duration-500`}
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
              <div
                className={`bg-black/60 backdrop-blur px-4 py-3 rounded-xl border-l-4 ${theme.border} shadow-lg`}
              >
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
            {restTimer > 0 && !showReportCard && (
              <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
                <h3
                  className={`text-2xl font-bold ${theme.text} mb-2 animate-pulse`}
                >
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

          {/* Hide normal button in challenge mode OR Daily Challenge */}
          {gameMode !== "challenge" && !isDailyChallengeActive && (
            <button
              onClick={finishSet}
              className={`w-full bg-gradient-to-r ${theme.gradient} hover:opacity-90 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition active:scale-95 text-lg tracking-wide uppercase`}
            >
              Finish Set & Save Progress
            </button>
          )}
          {/* Dynamic Button for Daily Challenge */}
          {isDailyChallengeActive && (
            <button
              onClick={finishSet}
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 text-white font-bold py-4 px-6 rounded-xl shadow-lg transform transition active:scale-95 text-lg tracking-wide uppercase animate-pulse"
            >
              Complete {BASE_EXERCISES[exerciseRef.current].name}
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

            {/* HISTORY CALENDAR - NEW WIDGET */}
            <WorkoutsCalendar triggerUpdate={count} />

            <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl h-80 flex flex-col">
              <h3 className="text-gray-400 text-xs uppercase tracking-widest mb-4">
                Performance Trend
              </h3>
              <div className="flex-1 w-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient
                        id="colorReps"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={theme.color}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={theme.color}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
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
                      itemStyle={{ color: theme.color }}
                    />
                    <Area
                      type="monotone"
                      dataKey="reps"
                      stroke={theme.color}
                      fillOpacity={1}
                      fill="url(#colorReps)"
                    />
                  </AreaChart>
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
                                : `bg-gray-800 ${theme.text}`
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
