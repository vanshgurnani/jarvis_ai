import React from "react";
import { Sparkles, User, Volume2, ShieldAlert } from "lucide-react";
import { ChatMessage as MsgType, synthesizeSpeech } from "../lib/api";

interface ChatMessageProps {
  message: MsgType;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message, onApprove, onReject }) => {
  const isAssistant = message.role === "assistant";

  const handleSpeak = async () => {
    if (!message.content) return;
    const audio = await synthesizeSpeech(message.content);
    if (audio) audio.play();
  };

  return (
    <div className={`flex w-full ${isAssistant ? "justify-start" : "justify-end"} my-2.5`}>
      <div
        className={`flex max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${
          isAssistant
            ? "bg-neutral-900 border border-neutral-800 text-neutral-100"
            : "bg-cyan-600 text-white shadow-cyan-900/30 font-normal"
        }`}
      >
        <div className="flex flex-col space-y-1.5 w-full">
          <div className="flex items-center justify-between text-xs opacity-60 pb-1">
            <span className="flex items-center space-x-1 font-medium">
              {isAssistant ? (
                <>
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>FRIDAY</span>
                </>
              ) : (
                <>
                  <User className="w-3 h-3" />
                  <span>You</span>
                </>
              )}
            </span>
            {isAssistant && message.content && (
              <button
                onClick={handleSpeak}
                title="Play voice"
                className="hover:opacity-100 p-0.5 rounded transition"
              >
                <Volume2 className="w-3 h-3 text-neutral-300" />
              </button>
            )}
          </div>

          <div className="whitespace-pre-wrap select-text">{message.content}</div>

          {/* Sensitive Action / Approval Card */}
          {message.pendingApproval && (
            <div className="mt-3 p-3 bg-amber-950/40 border border-amber-600/40 rounded-xl space-y-2 text-xs">
              <div className="flex items-center space-x-1.5 text-amber-300 font-medium">
                <ShieldAlert className="w-4 h-4" />
                <span>Approval Required: {message.pendingApproval.tool_name}</span>
              </div>
              <pre className="p-2 bg-black/40 rounded text-[11px] text-amber-200/90 overflow-x-auto">
                {JSON.stringify(message.pendingApproval.arguments, null, 2)}
              </pre>
              <div className="flex space-x-2 pt-1">
                <button
                  onClick={() => onApprove?.(message.pendingApproval!.id)}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium transition"
                >
                  Approve
                </button>
                <button
                  onClick={() => onReject?.(message.pendingApproval!.id)}
                  className="px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded font-medium transition"
                >
                  Reject
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

