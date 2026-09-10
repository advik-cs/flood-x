import React, { useState } from 'react';
import { Bot, Send, X, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { askAiAssistant } from '../services/api.js';

interface GeminiAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
}

export const GeminiAssistant: React.FC<GeminiAssistantProps> = ({
  isOpen,
  onClose,
  locationName
}) => {
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; time: string }>>([
    {
      sender: 'ai',
      text: `Hello Operator. I am **FLOOD-X AI**, grounded in the live operational state for **${locationName}**.\n\nAsk me about critical incident priorities, population exposure, satellite backscatter shifts, or resource dispatch recommendations.`,
      time: new Date().toLocaleTimeString()
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    'What areas need help first?',
    'Why is FLD-001 critical?',
    'How many people are affected?',
    'Which rescue team should be assigned?',
    'What changed between the satellite observations?',
    'Summarize the current flood situation.'
  ];

  const handleSend = async (queryText?: string) => {
    const q = queryText || inputQuery;
    if (!q.trim() || isLoading) return;

    const userMsg = { sender: 'user' as const, text: q, time: new Date().toLocaleTimeString() };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await askAiAssistant(q);
      const aiMsg = { sender: 'ai' as const, text: res.answer, time: new Date().toLocaleTimeString() };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      console.error(err);
      setMessages(prev => [
        ...prev,
        {
          sender: 'ai',
          text: 'AI analysis unavailable. Please check connectivity or system status.',
          time: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-command-surface border border-command-border rounded-xl shadow-2xl flex flex-col h-[640px] font-mono text-xs overflow-hidden">
        {/* Header */}
        <div className="p-3.5 bg-slate-900 border-b border-command-border flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                <span>FLOOD-X AI DECISION SUPPORT COPILOT</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  GROUNDED
                </span>
              </div>
              <div className="text-[10px] text-slate-400">
                Context: {locationName} • Zero Hallucination Rule Active
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Query Chips */}
        <div className="p-2.5 bg-command-card/50 border-b border-command-border flex items-center space-x-2 overflow-x-auto scrollbar-none">
          <Sparkles className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          {quickQuestions.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(chip)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] whitespace-nowrap border border-slate-700 transition"
            >
              {chip}
            </button>
          ))}
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[85%] leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-br-none'
                    : 'bg-command-card border border-command-border text-slate-200 rounded-bl-none shadow'
                }`}
              >
                <div className="whitespace-pre-line text-xs">{m.text}</div>
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">
                {m.sender === 'user' ? 'OPERATOR' : 'FLOOD-X AI'} • {m.time}
              </span>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-center space-x-2 text-slate-400 text-[11px] p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-blue-400" />
              <span>Analyzing multi-sensor application state...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="p-3 bg-slate-900 border-t border-command-border flex items-center space-x-2"
        >
          <input
            type="text"
            placeholder="Ask question about current flood sector, priority scoring, resources..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 p-2 rounded bg-command-card border border-command-border text-slate-100 text-xs focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition disabled:opacity-50 flex items-center space-x-1"
          >
            <Send className="w-3.5 h-3.5" />
            <span>SEND</span>
          </button>
        </form>
      </div>
    </div>
  );
};