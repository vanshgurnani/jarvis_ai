import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Database,
  Terminal,
  Send,
  Zap,
} from "lucide-react";
import { JarvisGlobe, JarvisState } from "./components/JarvisGlobe";
import { MemoryModal } from "./components/MemoryModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  checkBackendHealth,
  streamChat,
  synthesizeSpeech,
  fetchLLMSettings,
} from "./lib/api";

export const App: React.FC = () => {
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [modelName, setModelName] = useState("@cf/meta/llama-3.2-3b-instruct");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // HUD readouts
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [jarvisSpeech, setJarvisSpeech] = useState<string>(
    "All systems online. J.A.R.V.I.S. neural interface initialized and standing by, sir."
  );
  const [commandInput, setCommandInput] = useState<string>("");
  const [showCommandLine, setShowCommandLine] = useState<boolean>(false);

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);

  // Audio / Speech recognition refs
  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);

  // Check backend health & fetch active model
  useEffect(() => {
    const init = async () => {
      const healthy = await checkBackendHealth();
      setBackendHealthy(healthy);
      const settings = await fetchLLMSettings();
      if (settings?.model_name) {
        setModelName(settings.model_name);
      }
    };
    init();
    const interval = setInterval(async () => {
      const healthy = await checkBackendHealth();
      setBackendHealthy(healthy);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Web Speech Recognition setup
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onstart = () => {
        setJarvisState("listening");
        startMicAudioAnalysis();
      };

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setUserTranscript(transcript);
        if (event.results[0].isFinal) {
          stopMicAudioAnalysis();
          handleExecuteDirective(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.warn("Speech recognition error:", event.error);
        stopMicAudioAnalysis();
        setJarvisState("idle");
      };

      rec.onend = () => {
        stopMicAudioAnalysis();
        if (jarvisState === "listening") {
          setJarvisState("idle");
        }
      };

      recognitionRef.current = rec;
    }
  }, [jarvisState]);

  // Audio analysis for Mic
  const startMicAudioAnalysis = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1.0, avg / 128));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();
    } catch (e) {
      console.warn("Audio analysis unavailable:", e);
    }
  };

  const stopMicAudioAnalysis = () => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setAudioLevel(0);
  };

  // Toggle Voice Input
  const handleToggleListening = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (jarvisState === "listening") {
      recognitionRef.current?.stop();
      stopMicAudioAnalysis();
      setJarvisState("idle");
    } else {
      setUserTranscript("");
      setJarvisSpeech("Listening for directive...");
      try {
        recognitionRef.current?.start();
      } catch {
        // Fallback if already running or not supported
        setJarvisState("listening");
      }
    }
  };

  // Execute directive via Custom LLM Backend
  const handleExecuteDirective = async (promptText: string) => {
    const cleanPrompt = promptText.trim();
    if (!cleanPrompt) return;

    setUserTranscript(cleanPrompt);
    setJarvisState("thinking");
    setJarvisSpeech("");

    let accumulated = "";

    await streamChat(
      cleanPrompt,
      (chunk) => {
        accumulated += chunk;
        setJarvisSpeech(accumulated);
      },
      async () => {
        setJarvisState("speaking");
        if (autoSpeak && accumulated.trim()) {
          try {
            // Audio reactivity for speech
            const audio = await synthesizeSpeech(accumulated);
            if (audio) {
              currentAudioRef.current = audio;
              audio.onended = () => {
                setJarvisState("idle");
                setAudioLevel(0);
              };
              audio.play();

              // Synthetic visual audio oscillation
              const interval = setInterval(() => {
                if (audio.ended || audio.paused) {
                  clearInterval(interval);
                  setAudioLevel(0);
                } else {
                  setAudioLevel(0.2 + Math.random() * 0.6);
                }
              }, 100);
            } else {
              setJarvisState("idle");
            }
          } catch {
            setJarvisState("idle");
          }
        } else {
          setJarvisState("idle");
        }
      },
      (err) => {
        setJarvisState("error");
        setJarvisSpeech(`⚠️ Directive execution failed: ${err}`);
      }
    );
  };

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commandInput.trim()) return;
    const text = commandInput.trim();
    setCommandInput("");
    handleExecuteDirective(text);
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-[#030712] text-neutral-100 font-mono select-none overflow-hidden">
      {/* Background Cyber Grid / HUD Canvas Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,rgba(0,0,0,0.95)_75%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Futuristic Corner HUD Accents */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/60 pointer-events-none" />

      {/* TOP HUD BAR */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-cyan-950/80 bg-neutral-950/40 backdrop-blur-md">
        {/* Stark / Jarvis ID Badge */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-lg bg-cyan-950/60 border border-cyan-500/40 friday-core-glow">
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-widest text-cyan-400 drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                J.A.R.V.I.S.
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                MARK VII // AI
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-neutral-400 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendHealthy
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : "bg-rose-500"
                }`}
              />
              <span className="text-neutral-300 font-mono tracking-tight">
                {backendHealthy ? "ONLINE // 127.0.0.1:8765" : "SIDECAR OFFLINE"}
              </span>
              <span className="text-neutral-600">|</span>
              <span className="text-cyan-500/80 truncate max-w-[140px] sm:max-w-[200px]">
                {modelName}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right HUD Controls */}
        <div className="flex items-center space-x-2">
          {/* Toggle Command Prompt */}
          <button
            onClick={() => setShowCommandLine(!showCommandLine)}
            title="Toggle Command Directive Input"
            className={`p-2 rounded-lg border transition ${
              showCommandLine
                ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-300"
                : "border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900"
            }`}
          >
            <Terminal className="w-4 h-4" />
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? "Voice Synthesis Active" : "Voice Synthesis Muted"}
            className={`p-2 rounded-lg border transition ${
              autoSpeak
                ? "bg-cyan-950/80 border-cyan-500/60 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]"
                : "border-neutral-800 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900"
            }`}
          >
            {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Memory Modal */}
          <button
            onClick={() => setIsMemoryOpen(true)}
            title="Core Memory & Directives"
            className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* LLM & Gateway Settings Modal */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Gateway & Model Configuration"
            className="p-2 rounded-lg border border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CENTER STAGE: 3D HOLOGRAPHIC JARVIS GLOBE */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-4">
        {/* Circular Orbital HUD Ring Behind Globe */}
        <div className="absolute w-[380px] h-[380px] sm:w-[440px] sm:h-[440px] rounded-full border border-cyan-500/15 pointer-events-none animate-spin-slow" />
        <div className="absolute w-[320px] h-[320px] sm:w-[380px] sm:h-[380px] rounded-full border border-dashed border-cyan-500/20 pointer-events-none" />

        {/* The 3D Interactive Jarvis Globe */}
        <JarvisGlobe
          state={jarvisState}
          audioLevel={audioLevel}
          onClick={handleToggleListening}
        />

        {/* State Telemetry Indicator */}
        <div className="mt-4 flex items-center space-x-2 text-xs font-mono tracking-widest uppercase">
          <span
            className={`w-2 h-2 rounded-full ${
              jarvisState === "listening"
                ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]"
                : jarvisState === "thinking"
                ? "bg-purple-400 animate-pulse shadow-[0_0_10px_#c084fc]"
                : jarvisState === "speaking"
                ? "bg-teal-400 animate-bounce shadow-[0_0_10px_#2dd4bf]"
                : jarvisState === "error"
                ? "bg-rose-500 animate-pulse"
                : "bg-cyan-600/70"
            }`}
          />
          <span className="text-cyan-300 font-semibold drop-shadow-[0_0_6px_rgba(6,182,212,0.6)]">
            {jarvisState === "listening"
              ? "[ SYSTEM: RECORDING VOCAL INPUT... ]"
              : jarvisState === "thinking"
              ? "[ NEURAL CORE: COMPUTING DIRECTIVE... ]"
              : jarvisState === "speaking"
              ? "[ AUDIO BUS: VOCALIZING SYNTHESIS... ]"
              : jarvisState === "error"
              ? "[ ALERT: DIRECTIVE MALFUNCTION ]"
              : "[ SYSTEM: STANDBY // TAP GLOBE TO ENGAGE ]"}
          </span>
        </div>
      </main>

      {/* BOTTOM HUD READOUT & DOCK */}
      <footer className="relative z-10 flex flex-col items-center px-6 pb-6 pt-2 border-t border-cyan-950/60 bg-neutral-950/60 backdrop-blur-md">
        {/* Holographic Speech Transcript Readout */}
        <div className="w-full max-w-2xl min-h-[70px] max-h-[140px] overflow-y-auto mb-4 p-3.5 rounded-xl bg-neutral-950/80 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.06)]">
          {userTranscript && (
            <div className="text-xs text-neutral-400 mb-1.5 flex items-center space-x-1.5">
              <span className="text-cyan-400 font-bold">DIRECTIVE:</span>
              <span className="text-neutral-200 italic">"{userTranscript}"</span>
            </div>
          )}
          <div className="text-xs sm:text-sm text-cyan-200 font-mono leading-relaxed flex items-start space-x-2">
            <span className="text-cyan-400 font-bold select-none">&gt;</span>
            <span className="flex-1 whitespace-pre-wrap">{jarvisSpeech}</span>
          </div>
        </div>

        {/* Optional Directive Command Input Bar */}
        {showCommandLine && (
          <form
            onSubmit={handleCommandSubmit}
            className="w-full max-w-2xl flex items-center space-x-2 mb-3"
          >
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 text-xs font-bold font-mono">
                &gt;
              </span>
              <input
                type="text"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
                placeholder="Enter command directive (e.g. 'Status report', 'Open https://...')..."
                className="w-full pl-7 pr-3 py-2 text-xs bg-neutral-950 border border-cyan-500/40 rounded-lg text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition"
              />
            </div>
            <button
              type="submit"
              disabled={!commandInput.trim()}
              className="px-3.5 py-2 text-xs font-bold text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        )}

        {/* Voice Engagement Controls */}
        <div className="flex items-center space-x-4">
          <button
            onClick={handleToggleListening}
            className={`relative flex items-center justify-center w-14 h-14 rounded-full border transition-all duration-300 ${
              jarvisState === "listening"
                ? "bg-cyan-500 text-neutral-950 border-cyan-300 shadow-[0_0_25px_rgba(6,182,212,0.8)] scale-110"
                : "bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-400 border-cyan-500/40 hover:border-cyan-400 hover:scale-105"
            }`}
            title={jarvisState === "listening" ? "Stop Listening" : "Engage Voice Directive"}
          >
            {jarvisState === "listening" ? (
              <MicOff className="w-6 h-6 animate-pulse" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
            {/* Pulsing ring indicator */}
            {jarvisState === "listening" && (
              <span className="absolute -inset-1 rounded-full border border-cyan-400 animate-ping pointer-events-none" />
            )}
          </button>
        </div>
      </footer>

      {/* Settings & Memory Modals */}
      <MemoryModal isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
