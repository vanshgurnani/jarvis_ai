import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Settings,
  Database,
  Send,
  Zap,
  RotateCcw,
} from "lucide-react";
import { JarvisGlobe, JarvisState } from "./components/JarvisGlobe";
import { MemoryModal } from "./components/MemoryModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  checkBackendHealth,
  streamChat,
  synthesizeSpeech,
  fetchLLMSettings,
  transcribeAudio,
} from "./lib/api";

export const App: React.FC = () => {
  const [jarvisState, setJarvisState] = useState<JarvisState>("idle");
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [modelName, setModelName] = useState("@cf/meta/llama-3.2-3b-instruct");
  const [autoSpeak, setAutoSpeak] = useState(true);

  // HUD Readouts
  const [userTranscript, setUserTranscript] = useState<string>("");
  const [jarvisSpeech, setJarvisSpeech] = useState<string>(
    "J.A.R.V.I.S. neural core online. All systems fully operational, sir. Tap the holographic sphere or enter a directive below."
  );
  const [directiveInput, setDirectiveInput] = useState<string>("");

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);

  // Audio / Speech refs
  const recognitionRef = useRef<any>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number>(0);
  const transcriptCapturedRef = useRef<string>("");

  // Initial health check & model fetch
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

  // Initialize Web Speech Recognition if available (in Chrome / Safari with dictation)
  useEffect(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRec) {
      const rec = new SpeechRec();
      rec.continuous = false;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          transcriptCapturedRef.current = transcript.trim();
          setUserTranscript(transcript.trim());
        }
      };

      rec.onerror = (e: any) => {
        console.warn("SpeechRec warning:", e.error);
      };

      rec.onend = () => {
        // Recognition completed
      };

      recognitionRef.current = rec;
    }
  }, []);

  // Audio analysis for Mic
  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        setAudioLevel(Math.min(1.0, avg / 110));
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      // Setup MediaRecorder as universal fallback
      if (typeof MediaRecorder !== "undefined") {
        audioChunksRef.current = [];
        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "";
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            audioChunksRef.current.push(e.data);
          }
        };

        recorder.start(100);
        mediaRecorderRef.current = recorder;
      }

      // Try starting SpeechRecognition simultaneously
      transcriptCapturedRef.current = "";
      try {
        recognitionRef.current?.start();
      } catch {
        // Ignore if already started
      }
    } catch (err: any) {
      console.warn("Microphone access failed:", err);
      setJarvisState("error");
      const isDenied = err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError";
      if (isDenied) {
        setJarvisSpeech(
          "⚠️ Microphone permission denied. Please grant microphone access in macOS System Settings > Privacy & Security > Microphone (enable J.A.R.V.I.S. or your terminal/browser), then tap again."
        );
      } else {
        setJarvisSpeech(`⚠️ Microphone input error: ${err?.message || err}. You can also type directives below.`);
      }
    }
  };

  const stopMic = async (): Promise<Blob | null> => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    try {
      recognitionRef.current?.stop();
    } catch {}

    setAudioLevel(0);

    return new Promise((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, {
            type: mediaRecorderRef.current?.mimeType || "audio/webm",
          });
          resolve(blob);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
  };

  // Toggle Voice Listening
  const handleToggleListening = async () => {
    // If speaking, clicking interrupts speech
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }

    if (jarvisState === "listening") {
      setJarvisState("thinking");
      const audioBlob = await stopMic();

      // Check if we captured speech via SpeechRecognition
      const captured = transcriptCapturedRef.current.trim();
      if (captured) {
        handleExecuteDirective(captured);
      } else if (audioBlob && audioBlob.size > 500) {
        // Fallback to backend transcription
        setJarvisSpeech("Processing vocal waveform...");
        const text = await transcribeAudio(audioBlob);
        if (text && !text.startsWith("[")) {
          handleExecuteDirective(text);
        } else {
          setJarvisState("idle");
          setJarvisSpeech("Vocal input received, but no clear speech recognized. Please state directive or type below, sir.");
        }
      } else {
        setJarvisState("idle");
        setJarvisSpeech("Standing by for directive.");
      }
    } else {
      setUserTranscript("");
      setJarvisSpeech("Listening for vocal directive... Tap globe again or press mic when done.");
      setJarvisState("listening");
      await startMic();
    }
  };

  // Execute directive through Custom LLM Backend
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
            const audio = await synthesizeSpeech(accumulated);
            if (audio) {
              currentAudioRef.current = audio;
              audio.onended = () => {
                setJarvisState("idle");
                setAudioLevel(0);
              };
              audio.play();

              // Pulsing audio reactivity simulation while speaking
              const pulseInterval = setInterval(() => {
                if (audio.ended || audio.paused) {
                  clearInterval(pulseInterval);
                  setAudioLevel(0);
                } else {
                  setAudioLevel(0.15 + Math.random() * 0.55);
                }
              }, 120);
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
        setJarvisSpeech(`⚠️ Directive error: ${err}`);
      }
    );
  };

  const handleDirectiveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directiveInput.trim()) return;
    const text = directiveInput.trim();
    setDirectiveInput("");
    handleExecuteDirective(text);
  };

  const handleResetCore = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    stopMic();
    setJarvisState("idle");
    setUserTranscript("");
    setJarvisSpeech("J.A.R.V.I.S. neural interface recalibrated. Standing by, sir.");
  };

  return (
    <div className="relative flex flex-col h-screen w-screen bg-[#020617] text-neutral-100 font-mono select-none overflow-hidden">
      {/* Background Holographic Atmospheric Layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.1)_0%,rgba(0,0,0,0.98)_80%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:44px_44px] pointer-events-none" />

      {/* Futuristic Corner HUD Brackets */}
      <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-cyan-500/60 pointer-events-none" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-cyan-500/60 pointer-events-none" />

      {/* TOP HUD BAR */}
      <header className="relative z-10 flex items-center justify-between px-5 py-3 border-b border-cyan-950/70 bg-neutral-950/50 backdrop-blur-md">
        {/* Stark / Jarvis ID Badge */}
        <div className="flex items-center space-x-3">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-500/50 friday-core-glow">
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-widest text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
                J.A.R.V.I.S.
              </span>
              <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                CORE // MARK VII
              </span>
            </div>
            <div className="flex items-center space-x-2 text-[10px] text-neutral-400 mt-0.5">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backendHealthy
                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                    : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]"
                }`}
              />
              <span className="text-neutral-300 font-mono tracking-tight">
                {backendHealthy ? "ONLINE" : "OFFLINE"}
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-cyan-500/80 truncate max-w-[150px] sm:max-w-[220px]">
                {modelName}
              </span>
            </div>
          </div>
        </div>

        {/* Top Right HUD Controls */}
        <div className="flex items-center space-x-1.5">
          {/* Reset Core Button */}
          <button
            onClick={handleResetCore}
            title="Recalibrate Core & Reset"
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Voice Mute Toggle */}
          <button
            onClick={() => setAutoSpeak(!autoSpeak)}
            title={autoSpeak ? "Voice Output Active" : "Voice Output Muted"}
            className={`p-1.5 rounded-lg border transition ${
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
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition"
          >
            <Database className="w-4 h-4" />
          </button>

          {/* Settings Modal */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="LLM Gateway & Model Configuration"
            className="p-1.5 rounded-lg border border-neutral-800 text-neutral-400 hover:text-cyan-400 hover:bg-neutral-900 transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* CENTER STAGE: 3D HOLOGRAPHIC JARVIS GLOBE */}
      <main className="relative flex-1 flex flex-col items-center justify-center p-2 min-h-0">
        {/* Orbital HUD Circles */}
        <div className="absolute w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full border border-cyan-500/15 pointer-events-none animate-spin-slow" />
        <div className="absolute w-[300px] h-[300px] sm:w-[370px] sm:h-[370px] rounded-full border border-dashed border-cyan-500/20 pointer-events-none" />

        {/* Interactive 3D Holographic Globe */}
        <JarvisGlobe
          state={jarvisState}
          audioLevel={audioLevel}
          onClick={handleToggleListening}
        />

        {/* State Telemetry Badge */}
        <div className="mt-2 flex items-center space-x-2 text-xs font-mono tracking-widest uppercase">
          <span
            className={`w-2 h-2 rounded-full ${
              jarvisState === "listening"
                ? "bg-cyan-400 animate-ping shadow-[0_0_10px_#22d3ee]"
                : jarvisState === "thinking"
                ? "bg-purple-400 animate-pulse shadow-[0_0_10px_#c084fc]"
                : jarvisState === "speaking"
                ? "bg-teal-400 animate-bounce shadow-[0_0_10px_#2dd4bf]"
                : jarvisState === "error"
                ? "bg-rose-500 animate-pulse shadow-[0_0_10px_#f43f5e]"
                : "bg-cyan-500/70"
            }`}
          />
          <span className="text-cyan-300 font-semibold drop-shadow-[0_0_6px_rgba(6,182,212,0.6)] text-[11px] sm:text-xs">
            {jarvisState === "listening"
              ? "[ RECORDING VOCAL INPUT... TAP TO FINISH ]"
              : jarvisState === "thinking"
              ? "[ NEURAL COMPUTE // LLAMA-3.2 ACTIVE ]"
              : jarvisState === "speaking"
              ? "[ AUDIO OUTPUT BUS // VOCALIZING ]"
              : jarvisState === "error"
              ? "[ DIRECTIVE MALFUNCTION // VERIFY GATEWAY ]"
              : "[ SYSTEM: STANDBY // READY FOR DIRECTIVE ]"}
          </span>
        </div>
      </main>

      {/* BOTTOM HUD INTERFACE */}
      <footer className="relative z-10 flex flex-col items-center px-4 pb-4 pt-2 border-t border-cyan-950/70 bg-neutral-950/60 backdrop-blur-md">
        {/* Holographic HUD Speech Readout */}
        <div className="w-full max-w-xl max-h-[110px] min-h-[64px] overflow-y-auto mb-3 p-3 rounded-xl bg-neutral-950/90 border border-cyan-500/30 shadow-[inset_0_0_20px_rgba(6,182,212,0.06)]">
          {userTranscript && (
            <div className="text-[11px] text-neutral-400 mb-1 flex items-center space-x-1.5">
              <span className="text-cyan-400 font-bold">DIRECTIVE:</span>
              <span className="text-neutral-200 italic">"{userTranscript}"</span>
            </div>
          )}
          <div className="text-xs sm:text-sm text-cyan-200 font-mono leading-relaxed flex items-start space-x-2">
            <span className="text-cyan-400 font-bold select-none">&gt;</span>
            <span className="flex-1 whitespace-pre-wrap">{jarvisSpeech}</span>
          </div>
        </div>

        {/* ALWAYS-VISIBLE Directive Input Bar & Mic Engagement */}
        <div className="w-full max-w-xl flex items-center space-x-2">
          {/* Directive Command Input */}
          <form onSubmit={handleDirectiveSubmit} className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400 text-xs font-bold font-mono">
              &gt;
            </span>
            <input
              type="text"
              value={directiveInput}
              onChange={(e) => setDirectiveInput(e.target.value)}
              placeholder='Enter directive (e.g. "Status report", "Summarize https://...")...'
              className="w-full pl-7 pr-10 py-2.5 text-xs bg-neutral-950 border border-cyan-500/40 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono transition"
            />
            {directiveInput.trim() && (
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-cyan-400 hover:text-cyan-200 transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Central Holographic Mic Button */}
          <button
            onClick={handleToggleListening}
            className={`relative flex items-center justify-center w-11 h-11 rounded-xl border transition-all duration-300 flex-shrink-0 ${
              jarvisState === "listening"
                ? "bg-cyan-500 text-neutral-950 border-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.9)] scale-105"
                : "bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-400 border-cyan-500/40 hover:border-cyan-400"
            }`}
            title={jarvisState === "listening" ? "Stop Listening & Send" : "Click to Speak"}
          >
            {jarvisState === "listening" ? (
              <MicOff className="w-5 h-5 animate-pulse" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
            {/* Visual audio pulse ring */}
            {jarvisState === "listening" && (
              <span className="absolute -inset-1 rounded-xl border border-cyan-400 animate-ping pointer-events-none" />
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
