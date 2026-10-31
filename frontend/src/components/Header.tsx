import React from "react";
import { Sparkles, Database, Trash2, Volume2, VolumeX, Settings } from "lucide-react";

interface HeaderProps {
  backendHealthy: boolean;
  autoSpeak: boolean;
  onToggleAutoSpeak: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onClearChat: () => void;
  currentLanguage: string;
}

export const Header: React.FC<HeaderProps> = ({
  backendHealthy,
  autoSpeak,
  onToggleAutoSpeak,
  onOpenMemory,
  onOpenSettings,
  onClearChat,
  currentLanguage,
}) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800">
      <div className="flex items-center space-x-2.5">
        <div className="relative flex items-center justify-center w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 friday-core-glow">
          <Sparkles className="w-4 h-4 text-cyan-400" />
        </div>
        <div>
          <div className="flex items-center space-x-1.5">
            <span className="font-semibold text-sm tracking-wide text-neutral-100">FRIDAY</span>
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              macOS AI
            </span>
          </div>
          <div className="flex items-center space-x-1 text-[11px] text-neutral-400">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                backendHealthy ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-rose-500"
              }`}
            />
            <span>{backendHealthy ? "Online" : "Sidecar Disconnected"}</span>
            <span className="text-neutral-600">•</span>
            <span className="text-neutral-400">{currentLanguage}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-1">
        <button
          onClick={onToggleAutoSpeak}
          title={autoSpeak ? "Voice Output Active" : "Voice Output Muted"}
          className={`p-1.5 rounded-md transition-colors ${
            autoSpeak
              ? "text-cyan-400 bg-cyan-950/60 hover:bg-cyan-900/60"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          {autoSpeak ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        <button
          onClick={onOpenMemory}
          title="Memory & Facts"
          className="p-1.5 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 transition-colors"
        >
          <Database className="w-4 h-4" />
        </button>

        <button
          onClick={onOpenSettings}
          title="LLM & Gateway Settings"
          className="p-1.5 rounded-md text-neutral-400 hover:text-cyan-400 hover:bg-neutral-800 transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>

        <button
          onClick={onClearChat}
          title="Clear Conversation"
          className="p-1.5 rounded-md text-neutral-400 hover:text-rose-400 hover:bg-neutral-800 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
