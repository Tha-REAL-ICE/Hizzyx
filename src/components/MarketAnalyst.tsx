import React, { useState, useRef, useEffect } from 'react';
import { ai } from '../lib/gemini';
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
        model: 'gemini-3.1-pro-preview',
        contents: contents,
        config: {
          systemInstruction,
          temperature: 0.2
        }
      });

      setMessages(prev => [...prev, { role: 'model', content: response.text || 'ERR: NO RESPONSE FROM NEURAL NET.' }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { role: 'model', content: 'ERR: CONNECTION TO NEURAL CORE FAILED. RETRY INITIATED.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-black border-2 border-border2 rounded-none overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red via-red/50 to-transparent"></div>
      
      <div className="p-4 border-b-2 border-border2 bg-s1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red/10 border border-red flex items-center justify-center text-red">
            <Terminal size={20} />
          </div>
          <div>
            <h2 className="font-display text-[20px] text-text tracking-widest uppercase leading-none">HIZZYX</h2>
            <p className="font-mono text-[10px] text-red tracking-[0.2em] uppercase mt-1">Neural Analysis Core</p>
          </div>
        </div>
        <button 
          onClick={() => handleSend("Run a full market scan and tell me where to look for trades right now across all pairs.")}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-transparent border border-red text-red font-mono text-[11px] font-bold uppercase tracking-widest hover:bg-red hover:text-black transition-all disabled:opacity-50"
        >
          <Activity size={14} />
          <span>Execute Scan</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 font-mono text-[12px] scrollbar-thin scrollbar-thumb-border2 scrollbar-track-transparent">
        {messages.map((msg, i) => (
          <div key={i} className={cn("flex gap-4 max-w-[90%]", msg.role === 'user' ? "ml-auto flex-row-reverse" : "")}>
            <div className={cn("w-8 h-8 flex items-center justify-center shrink-0 mt-1 border", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-red/10 border-red/50 text-red")}>
              {msg.role === 'user' ? <User size={14} /> : <Terminal size={14} />}
            </div>
            <div className={cn("p-4 leading-relaxed whitespace-pre-wrap border", msg.role === 'user' ? "bg-s2 border-border2 text-text" : "bg-black border-red/30 text-red/90 shadow-[inset_0_0_20px_rgba(255,61,61,0.05)]")}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-4 max-w-[90%]">
            <div className="w-8 h-8 bg-red/10 border border-red/50 text-red flex items-center justify-center shrink-0 mt-1">
              <Terminal size={14} />
            </div>
            <div className="p-4 bg-black border border-red/30 flex items-center gap-3">
              <div className="w-2 h-4 bg-red animate-pulse"></div>
              <span className="text-red font-mono text-[10px] tracking-widest uppercase">Processing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t-2 border-border2 bg-s1">
        <div className="flex items-center gap-3">
          <span className="text-red font-bold font-mono">{'>'}</span>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Enter command..."
            className="flex-1 bg-transparent border-b border-border2 text-text py-2 font-mono text-[13px] outline-none focus:border-red transition-all placeholder:text-muted uppercase"
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            className="w-10 h-10 bg-red/10 text-red border border-red flex items-center justify-center hover:bg-red hover:text-black disabled:opacity-40 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
