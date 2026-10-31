const BACKEND_BASE = "http://127.0.0.1:8765";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  pendingApproval?: {
    id: string;
    tool_name: string;
    arguments: Record<string, unknown>;
  };
}

export interface SystemStatus {
  status: string;
  service: string;
  version: string;
}

export interface MemoryFact {
  id: number;
  fact: string;
  category: string;
  created_at: string;
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}/health`);
    if (!res.ok) return false;
    const data = await res.json();
    return data.status === "healthy";
  } catch {
    return false;
  }
}

export async function fetchConversationHistory(): Promise<ChatMessage[]> {
  try {
    const res = await fetch(`${BACKEND_BASE}/conversations`);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.messages || []).map((m: any) => ({
      id: String(m.id || Math.random()),
      role: m.role,
      content: m.content,
    }));
  } catch {
    return [];
  }
}

export async function clearConversationHistory(): Promise<void> {
  await fetch(`${BACKEND_BASE}/conversations`, { method: "DELETE" });
}

export async function fetchMemoryFacts(): Promise<MemoryFact[]> {
  const res = await fetch(`${BACKEND_BASE}/memory`);
  const data = await res.json();
  return data.facts || [];
}

export async function addMemoryFact(fact: string, category: string = "general"): Promise<void> {
  await fetch(`${BACKEND_BASE}/memory`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fact, category }),
  });
}

export async function deleteMemoryFact(factId: number): Promise<void> {
  await fetch(`${BACKEND_BASE}/memory/${factId}`, { method: "DELETE" });
}

export async function streamChat(
  message: string,
  onChunk: (chunk: string) => void,
  onDone: () => void,
  onError: (err: string) => void
): Promise<void> {
  try {
    const response = await fetch(`${BACKEND_BASE}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, session_id: "default" }),
    });

    if (!response.ok || !response.body) {
      onError(`Server error: ${response.statusText}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const rawLines = buffer.split(/\r?\n/);
      buffer = rawLines.pop() || "";

      for (const rawLine of rawLines) {
        const trimmed = rawLine.trim();
        if (trimmed.startsWith("data:")) {
          const jsonStr = trimmed.slice(5).trim();
          if (!jsonStr) continue;
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === "content") {
              onChunk(data.content);
            } else if (data.type === "done") {
              onDone();
            } else if (data.type === "error") {
              onError(data.content);
            }
          } catch {
            // raw string fallback
            onChunk(jsonStr);
          }
        }
      }
    }
    onDone();
  } catch (err: any) {
    onError(err.message || "Failed to connect to FRIDAY backend");
  }
}

export async function synthesizeSpeech(text: string): Promise<HTMLAudioElement | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/voice/speak`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    return audio;
  } catch {
    return null;
  }
}


export interface LLMSettings {
  provider: string;
  custom_url: string;
  model_name: string;
  has_token: boolean;
  token_preview: string;
}

export async function fetchLLMSettings(): Promise<LLMSettings | null> {
  try {
    const res = await fetch(`${BACKEND_BASE}/settings/llm`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function updateLLMSettings(settings: {
  provider?: string;
  custom_url?: string;
  token?: string;
  model_name?: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${BACKEND_BASE}/settings/llm`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "recording.webm");
  try {
    const res = await fetch(`${BACKEND_BASE}/voice/transcribe`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.text || "";
  } catch {
    return "";
  }
}
