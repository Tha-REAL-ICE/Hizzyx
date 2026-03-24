import React, { useState, useRef, useEffect } from 'react';
import { ai, apiKey } from '../lib/gemini';
import { MarketState } from '../types';
import { Send, Terminal, User, Activity } from 'lucide-react';
import { cn } from '../lib/utils';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function MarketAnalyst({ engineStates }: { engineStates: Record<string, MarketState> }) {
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

      const systemInstruction = `You are HIZZYX, an expert SMC/ICT trading AI core.
You have access to the current real-time state of the Trading Engine.
Current Engine State (JSON):
${JSON.stringify(engineStates, null, 2)}

Your task is to provide real-time analysis of the pairs, indicating exactly where to look for trades.
Be concise, highly analytical, and use an aggressive, tech-geeky, terminal-like tone. Use standard technical and SMC terminology (BOS, CHoCH, FVG, Liquidity Sweeps, Order Blocks). If asked about a pair not in the data, state that you currently track GBPJPY, BTCUSD, EURUSD, XAUUSD.`;

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
    <div className="flex flex-col h-[calc(100vh-160px)] bg-black border border-border2 rounded-sm overflow-hidden relative shadow-2xl">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red via-red/50 to-transparent"></div>
      
      <div className="p-6 border-b border-border2 bg-s1 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red/5 border border-red/30 flex items-center justify-center text-red shadow-[0_0_15px_rgba(255,61,61,0.1)]">
            <Terminal size={24} />
          </div>
          <div>
            <h2 className="font-display text-[24px] text-text tracking-[0.1em] uppercase leading-none">HIZZYX</h2>
            <p className="font-mono text-[9px] text-red tracking-[0.3em] uppercase mt-1.5 font-bold">Neural Analysis Core</p>
          </div>
        </div>
        <button 
          onClick={() => handleSend("Run a full market scan and tell me where to look for trades right now across all pairs.")}
          disabled={loading}
          className="flex items-center gap-3 px-6 py-2.5 bg-red text-black font-mono text-[11px] font-black uppercase tracking-widest hover:bg-white transition-all disabled:opacity-50 shadow-lg"
        >
          <Activity size={16} />
          <span>Execute Scan</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 space-y-8 font-mono text-[13px] scrollbar-thin scrollbar-thumb-border2 scrollbar-track-transparent bg-[radial-gradient(circle_at_center,rgba(255,61,61,0.02)_0%,transparent_70%)]">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-5 max-w-[85%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-10 h-10 flex items-center justify-center shrink-0 mt-1 border shadow-sm", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-red/10 border-red/40 text-red")}>
              {msg.role === 'user' ? <User size={18} /> : <Terminal size={18} />}
            </div>
            <div className={cn("p-5 leading-relaxed whitespace-pre-wrap border shadow-md", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-black border-red/20 text-red/90")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-5 max-w-[85%]">
            <div className="w-10 h-10 bg-red/10 border border-red/40 text-red flex items-center justify-center shrink-0 mt-1">
              <Terminal size={18} />
            </div>
            <div className="p-5 bg-black border border-red/20 flex items-center gap-4">
              <div className="w-2 h-5 bg-red animate-pulse"></div>
              <span className="text-red font-mono text-[11px] tracking-[0.3em] uppercase font-black">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-6 border-t border-border2 bg-s1">
        <div className="flex items-center gap-4">
          <span className="text-red font-black font-mono text-[18px]">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-b border-border2 text-text py-3 font-mono text-[14px] outline-none focus:border-red transition-all placeholder:text-muted uppercase tracking-wider"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-12 h-12 bg-red text-black border border-red flex items-center justify-center hover:bg-white disabled:opacity-40 transition-all shadow-lg"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
