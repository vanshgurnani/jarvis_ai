import React, { useState, useEffect, useRef } from "react";
import { Header } from "./components/Header";
import { ChatMessage } from "./components/ChatMessage";
import { ChatInput } from "./components/ChatInput";
import { MemoryModal } from "./components/MemoryModal";
import { SettingsModal } from "./components/SettingsModal";
import {
  ChatMessage as MsgType,
  checkBackendHealth,
  fetchConversationHistory,
  clearConversationHistory,
  streamChat,
  synthesizeSpeech,
} from "./lib/api";

export const App: React.FC = () => {
  const [messages, setMessages] = useState<MsgType[]>([]);
  const [backendHealthy, setBackendHealthy] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMemoryOpen, setIsMemoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState("EN / हिं");
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initial load: check health & fetch history
  useEffect(() => {
    const init = async () => {
      const healthy = await checkBackendHealth();
      setBackendHealthy(healthy);
      if (healthy) {
        const history = await fetchConversationHistory();
        if (history.length > 0) {
          setMessages(history);
        } else {
          // Welcome greeting
          setMessages([
            {
              id: "welcome",
              role: "assistant",
              content:
                "Namaste! I'm FRIDAY, your local macOS AI companion. How can I assist you today? You can speak or chat with me in English, Hindi, or Hinglish.",
            },
          ]);
        }
      }
    };

    init();
    const interval = setInterval(async () => {
      const healthy = await checkBackendHealth();
      setBackendHealthy(healthy);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const handleSendMessage = async (text: string) => {
    const userMsg: MsgType = {
      id: String(Date.now()),
      role: "user",
      content: text,
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    const assistantMsgId = String(Date.now() + 1);
    const initialAssistantMsg: MsgType = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
    };
    setMessages((prev) => [...prev, initialAssistantMsg]);

    let accumulatedContent = "";

    await streamChat(
      text,
      (chunk) => {
        accumulatedContent += chunk;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, content: accumulatedContent } : msg
          )
        );
      },
      async () => {
        setIsLoading(false);
        if (autoSpeak && accumulatedContent.trim()) {
          const audio = await synthesizeSpeech(accumulatedContent);
          if (audio) audio.play();
        }
      },
      (err) => {
        setIsLoading(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  content: `⚠️ Error: ${err}\n\nPlease verify your LLM Gateway URL, Token, or network connection in Settings (⚙️ icon in top bar).`,
                }
              : msg
          )
        );
      }
    );
  };

  const handleClearChat = async () => {
    await clearConversationHistory();
    setMessages([
      {
        id: "cleared",
        role: "assistant",
        content: "Conversation history cleared. Ready for your next request, sir.",
      },
    ]);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-neutral-950 text-neutral-100 font-sans overflow-hidden">
      <Header
        backendHealthy={backendHealthy}
        autoSpeak={autoSpeak}
        onToggleAutoSpeak={() => setAutoSpeak(!autoSpeak)}
        onOpenMemory={() => setIsMemoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onClearChat={handleClearChat}
        currentLanguage={currentLanguage}
      />

      <main className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        {isLoading && (
          <div className="flex items-center space-x-2 text-xs text-cyan-400/80 italic py-2 pl-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>FRIDAY is thinking...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      <ChatInput onSendMessage={handleSendMessage} isLoading={isLoading} />

      <MemoryModal isOpen={isMemoryOpen} onClose={() => setIsMemoryOpen(false)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};
