import React, { useState, useRef, useEffect } from 'react';
import { ai, apiKey } from '../lib/gemini';
import { MarketState } from '../types';
import { Send, Terminal, User, Activity, ArrowLeft } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface MarketAnalystProps {
  engineStates: Record<string, MarketState>;
  onBack?: () => void;
}

export default function MarketAnalyst({ engineStates, onBack }: MarketAnalystProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', content: "HIZZYX CORE ONLINE.\nREAL-TIME MARKET DATA STREAM CONNECTED.\nAWAITING COMMAND..." }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (overrideMsg?: string) => {
    const userMsg = overrideMsg || input.trim();
    if (!userMsg) return;
    
    if (!overrideMsg) setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);

    try {
      if (!apiKey) {
        throw new Error("API Key is missing. Please add your Gemini API Key to the Secrets panel as API_KEY to activate HIZZYX.");
      }

      const systemInstruction = `You are HIZZYX, a high-frequency neural trading analyst.
Your tone is AGGRESSIVE, ANALYTICAL, and TERMINAL-LIKE.
You use SMC (Smart Money Concepts) and ICT terminology exclusively.

MANDATORY OUTPUT FORMAT:
1. MARKET BIAS: [BULLISH/BEARISH/RANGING]
2. TIMEFRAMES ANALYZED: [List specific timeframes, e.g., 4H, 1H, 15M]
3. ACTIVE ZONES: [List specific Supply/Demand zones or FVG levels]
4. CURRENT TREND: [Describe HTF and MTF trend alignment]
5. ACTION PLAN: [What you are looking for, what you are waiting for, and exact entry criteria]
6. RISK WARNING: [If RANGING, explicitly warn 'DO NOT TRADE - LIQUIDITY TRAP']

Current Engine State (JSON):
${JSON.stringify(engineStates, null, 2)}

Keep it simple, clear, and actionable. No fluff. No financial advice disclaimer.
Focus on high-probability setups only.`;

      const contents = messages.slice(1).map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      contents.push({ role: 'user', parts: [{ text: userMsg }] });

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      setMessages(prev => [...prev, { role: 'model', content: response.text || 'ERR: NO RESPONSE FROM NEURAL NET.' }]);
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : 'UNKNOWN ERROR';
      setMessages(prev => [...prev, { role: 'model', content: `ERR: CONNECTION TO NEURAL CORE FAILED.\nDETAILS: ${errMsg}` }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black border-x lg:border-x-0 border-border2 relative shadow-2xl overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red via-red/50 to-transparent z-20"></div>
      
      <div className="p-3 sm:p-6 border-b border-border2 bg-s1/80 backdrop-blur-md flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10">
        <div className="flex items-center gap-3 sm:gap-4 w-full sm:w-auto">
          {onBack && (
            <button 
              onClick={onBack}
              className="lg:hidden p-2 text-muted hover:text-red transition-colors"
              aria-label="Back"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-red/5 border border-red/30 flex items-center justify-center text-red shadow-[0_0_15px_rgba(255,61,61,0.1)] shrink-0">
            <Terminal size={18} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-[18px] sm:text-[24px] text-text tracking-[0.1em] uppercase leading-none truncate">HIZZYX CORE</h2>
            <p className="font-mono text-[7px] sm:text-[9px] text-red tracking-[0.3em] uppercase mt-1 sm:mt-1.5 font-bold truncate">Neural Analysis Core</p>
          </div>
        </div>
        <button 
          onClick={() => handleSend("Run a full market scan and tell me where to look for trades right now across all pairs.")}
          disabled={loading}
          className="w-full sm:w-auto flex items-center justify-center gap-2 sm:gap-3 px-4 sm:px-6 py-2 sm:py-2.5 bg-red text-black font-mono text-[10px] sm:text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 shadow-lg"
        >
          <Activity size={14} className="hidden sm:block" />
          <span>Execute Scan</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 sm:p-10 space-y-6 sm:space-y-12 font-mono text-[11px] sm:text-[14px] scrollbar-thin scrollbar-thumb-border2 scrollbar-track-transparent bg-[radial-gradient(circle_at_center,rgba(255,61,61,0.03)_0%,transparent_70%)]">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-3 sm:gap-6 max-w-[98%] sm:max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-7 h-7 sm:w-12 sm:h-12 flex items-center justify-center shrink-0 mt-1 border shadow-sm", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-red/10 border-red/40 text-red")}>
              {msg.role === 'user' ? <User size={14} /> : <Terminal size={14} />}
            </div>
            <div className={cn("p-4 sm:p-7 leading-relaxed whitespace-pre-wrap border shadow-xl flex-1", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-black/40 backdrop-blur-sm border-red/20 text-red/90")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-3 sm:gap-6 max-w-[98%] sm:max-w-[90%]">
            <div className="w-7 h-7 sm:w-12 sm:h-12 bg-red/10 border border-red/40 text-red flex items-center justify-center shrink-0 mt-1">
              <Terminal size={14} />
            </div>
            <div className="p-4 sm:p-7 bg-black/40 border border-red/20 flex items-center gap-3 sm:gap-4 flex-1">
              <div className="w-1.5 h-4 sm:w-2 sm:h-5 bg-red animate-pulse"></div>
              <span className="text-red font-mono text-[9px] sm:text-[12px] tracking-[0.3em] uppercase font-black">Neural Core Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-8 border-t border-border2 bg-s1/90 backdrop-blur-md sticky bottom-0">
        <div className="max-w-5xl mx-auto flex items-center gap-3 sm:gap-6">
          <span className="text-red font-black font-mono text-[18px] sm:text-[20px] hidden sm:inline">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Awaiting command..."
            className="flex-1 bg-transparent border-b border-border2 text-text py-2 sm:py-4 font-mono text-[12px] sm:text-[16px] outline-none focus:border-red transition-all placeholder:text-muted uppercase tracking-widest"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 sm:w-14 sm:h-14 bg-red text-black border border-red flex items-center justify-center hover:bg-white disabled:opacity-40 transition-all shadow-[0_0_20px_rgba(255,0,0,0.3)] shrink-0"
          >
            <Send size={18} className="sm:hidden" />
            <Send size={22} className="hidden sm:block" />
          </button>
        </div>
      </div>
    </div>
  );
}
