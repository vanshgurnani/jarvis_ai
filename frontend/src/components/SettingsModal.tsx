import React, { useState, useEffect } from "react";
import { X, Settings as SettingsIcon, Check, Key, Globe, Cpu, RefreshCw } from "lucide-react";
import { LLMSettings, fetchLLMSettings, updateLLMSettings } from "../lib/api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState("custom_llm");
  const [customUrl, setCustomUrl] = useState("https://llama-api-gateway.onrender.com");
  const [token, setToken] = useState("");
  const [modelName, setModelName] = useState("@cf/meta/llama-3.2-3b-instruct");
  const [hasToken, setHasToken] = useState(false);
  const [tokenPreview, setTokenPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await fetchLLMSettings();
      if (data) {
        setProvider(data.provider || "custom_llm");
        setCustomUrl(data.custom_url || "https://llama-api-gateway.onrender.com");
        setModelName(data.model_name || "@cf/meta/llama-3.2-3b-instruct");
        setHasToken(data.has_token);
        setTokenPreview(data.token_preview || "");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setSaveSuccess(false);
    }
  }, [isOpen]);

  const handleApplyPreset = () => {
    setProvider("custom_llm");
    setCustomUrl("https://llama-api-gateway.onrender.com");
    setModelName("@cf/meta/llama-3.2-3b-instruct");
    setToken("Tw23BYtHmaAz9o/K76ZzCS6wNOnLSWrz47PqPa+dWyM=");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveSuccess(false);
    try {
      const payload: {
        provider: string;
        custom_url: string;
        model_name: string;
        token?: string;
      } = {
        provider,
        custom_url: customUrl.trim(),
        model_name: modelName.trim(),
      };
      if (token.trim()) {
        payload.token = token.trim();
      }
      const ok = await updateLLMSettings(payload);
      if (ok) {
        setSaveSuccess(true);
        setToken("");
        await loadSettings();
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="flex flex-col w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <SettingsIcon className="w-5 h-5" />
            <h2 className="text-base font-semibold text-neutral-100">LLM & Custom Gateway Configuration</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
          {/* Preset Button */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-neutral-950 border border-cyan-500/20">
            <div>
              <div className="text-xs font-semibold text-cyan-400">Llama 3.2 3B Gateway Preset</div>
              <div className="text-[11px] text-neutral-400">Quick-fill credentials & URL for Render Gateway</div>
            </div>
            <button
              type="button"
              onClick={handleApplyPreset}
              className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900/80 border border-cyan-500/40 rounded-lg transition"
            >
              Load Preset
            </button>
          </div>

          {/* Provider Selection */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-medium text-neutral-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>LLM Provider</span>
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-cyan-500 transition"
            >
              <option value="custom_llm">Custom LLM / OpenAI Gateway</option>
              <option value="llama_gateway">Llama API Gateway</option>
              <option value="cloudflare_worker">Cloudflare Worker</option>
              <option value="mock">Offline Mock Mode</option>
            </select>
          </div>

          {/* Custom Gateway URL */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-medium text-neutral-300">
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>API Gateway / Base URL</span>
            </label>
            <input
              type="url"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              placeholder="https://llama-api-gateway.onrender.com"
              required
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-cyan-500 transition font-mono"
            />
            <p className="text-[10px] text-neutral-500">
              Supports base URLs (e.g. <code>https://llama-api-gateway.onrender.com</code>) or direct endpoints (<code>/v1/chat/completions</code>, <code>/chat</code>).
            </p>
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="flex items-center space-x-1.5 text-xs font-medium text-neutral-300">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              <span>Model Identifier</span>
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="@cf/meta/llama-3.2-3b-instruct"
              required
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-cyan-500 transition font-mono"
            />
          </div>

          {/* Auth Token / Key */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="flex items-center space-x-1.5 text-xs font-medium text-neutral-300">
                <Key className="w-3.5 h-3.5 text-cyan-400" />
                <span>API Gateway Token / Key</span>
              </label>
              {hasToken && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/20">
                  Configured ({tokenPreview})
                </span>
              )}
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? "Enter new token to replace existing key" : "Tw23BYtHmaAz9o/K76ZzCS6wNOnLSWrz47PqPa+dWyM="}
              className="w-full px-3 py-2 text-xs bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 focus:outline-none focus:border-cyan-500 transition font-mono"
            />
          </div>

          {/* Feedback & Actions */}
          {saveSuccess && (
            <div className="flex items-center space-x-2 p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 text-xs">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>Settings updated successfully! Active LLM provider reloaded.</span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-neutral-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 transition"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-medium text-cyan-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

