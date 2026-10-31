import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Brain } from "lucide-react";
import { MemoryFact, fetchMemoryFacts, addMemoryFact, deleteMemoryFact } from "../lib/api";

interface MemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MemoryModal: React.FC<MemoryModalProps> = ({ isOpen, onClose }) => {
  const [facts, setFacts] = useState<MemoryFact[]>([]);
  const [newFact, setNewFact] = useState("");
  const [category, setCategory] = useState("preference");
  const [loading, setLoading] = useState(false);

  const loadFacts = async () => {
    setLoading(true);
    try {
      const data = await fetchMemoryFacts();
      setFacts(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFacts();
    }
  }, [isOpen]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFact.trim()) return;
    await addMemoryFact(newFact.trim(), category);
    setNewFact("");
    loadFacts();
  };

  const handleDelete = async (id: number) => {
    await deleteMemoryFact(id);
    loadFacts();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="flex flex-col w-full max-w-md max-h-[85vh] bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-800">
          <div className="flex items-center space-x-2 text-cyan-400">
            <Brain className="w-5 h-5" />
            <h2 className="text-base font-semibold text-neutral-100">FRIDAY Memory & Facts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-100 rounded-lg hover:bg-neutral-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Facts List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {loading ? (
            <div className="text-center py-8 text-neutral-500 text-sm">Loading memories...</div>
          ) : facts.length === 0 ? (
            <div className="text-center py-8 text-neutral-500 text-sm">
              No saved facts yet. FRIDAY learns your preferences as you chat, or you can add them below.
            </div>
          ) : (
            facts.map((f) => (
              <div
                key={f.id}
                className="flex items-start justify-between p-3 rounded-xl bg-neutral-950 border border-neutral-800/80 group"
              >
                <div>
                  <span className="inline-block text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 mb-1">
                    {f.category}
                  </span>
                  <p className="text-sm text-neutral-200">{f.fact}</p>
                </div>
                <button
                  onClick={() => handleDelete(f.id)}
                  title="Forget this fact"
                  className="opacity-0 group-hover:opacity-100 p-1 text-neutral-500 hover:text-rose-400 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Add Fact Form */}
        <form onSubmit={handleAdd} className="p-4 border-t border-neutral-800 bg-neutral-950/60 flex flex-col space-y-2">
          <div className="flex space-x-2">
            <input
              type="text"
              value={newFact}
              onChange={(e) => setNewFact(e.target.value)}
              placeholder="e.g. My favorite coffee is Cappuccino with oat milk"
              className="flex-1 px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-cyan-500/50"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="px-2 py-2 text-xs bg-neutral-900 border border-neutral-800 rounded-xl text-neutral-300 focus:outline-none"
            >
              <option value="preference">Preference</option>
              <option value="routine">Routine</option>
              <option value="work">Work</option>
              <option value="general">General</option>
            </select>
            <button
              type="submit"
              className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-xl text-xs flex items-center transition"
            >
              <Plus className="w-4 h-4 mr-0.5" />
              Add
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

