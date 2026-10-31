import React, { useState, useRef } from "react";
import { Send, Mic, MicOff } from "lucide-react";

interface ChatInputProps {
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onVoiceRecorded?: (blob: Blob) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  isLoading,
  onVoiceRecorded,
}) => {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const handleSend = () => {
    if (!text.trim() || isLoading) return;
    onSendMessage(text.trim());
    setText("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          stream.getTracks().forEach((track) => track.stop());
          if (onVoiceRecorded) {
            onVoiceRecorded(audioBlob);
          }
        };

        mediaRecorder.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Microphone access error:", err);
      }
    }
  };

  return (
    <div className="p-3 bg-neutral-900/90 border-t border-neutral-800 backdrop-blur-md">
      <div className="flex items-end space-x-2 bg-neutral-950 border border-neutral-800 rounded-2xl px-3 py-2 focus-within:border-cyan-500/50 transition shadow-inner">
        <button
          type="button"
          onClick={toggleRecording}
          title={isRecording ? "Stop Recording" : "Record Voice (Hindi/English)"}
          className={`p-2 rounded-xl transition ${
            isRecording
              ? "bg-rose-500/20 text-rose-400 animate-pulse"
              : "text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800"
          }`}
        >
          {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        </button>

        <textarea
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask FRIDAY or talk in Hindi / Hinglish..."
          className="flex-1 max-h-32 min-h-[24px] bg-transparent resize-none text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none py-1 leading-normal"
        />

        <button
          type="button"
          onClick={handleSend}
          disabled={!text.trim() || isLoading}
          className={`p-2 rounded-xl transition ${
            text.trim() && !isLoading
              ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-md shadow-cyan-500/20"
              : "text-neutral-600 bg-neutral-900 cursor-not-allowed"
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

