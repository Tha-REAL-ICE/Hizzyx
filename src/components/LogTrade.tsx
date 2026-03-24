import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ai, SYSTEM_INSTRUCTION, analyzeTrade, auditSignal } from '../lib/gemini';
import { Trade, Outcome, CustomRule } from '../types';
import { cn } from '../lib/utils';

export default function LogTrade({ onTradeLogged }: { onTradeLogged: () => void }) {
  const [mode, setMode] = useState<'ANALYZE' | 'LOG'>('ANALYZE');
  const [loading, setLoading] = useState(false);
  const [rules, setRules] = useState<CustomRule[]>([]);

  // Shared
  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT' | ''>('');
  const [session, setSession] = useState('');

  // Analyze Mode
  const [entryPrice, setEntryPrice] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [reasoning, setReasoning] = useState('');

  // Log Mode
  const [rr, setRr] = useState('');
  const [profit, setProfit] = useState('');
  const [htf, setHtf] = useState('');
  const [entry, setEntry] = useState('');
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const [rulesFollowed, setRulesFollowed] = useState<'yes' | 'partial' | 'no' | ''>('');
  const [breach, setBreach] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  
  const [aiResult, setAiResult] = useState<{ feedback: string; type: 'good' | 'warn' | 'bad' } | null>(null);

  const emotionOptions = ['Calm', 'Confident', 'Detached', 'Anxious', 'FOMO', 'Revenge', 'Impatient', 'Greedy', 'Disciplined'];

  useEffect(() => {
    const fetchRules = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from('custom_rules').select('*').eq('user_id', user.id);
        if (data) setRules(data);
      }
    };
    fetchRules();
  }, []);

  const toggleEmotion = (emo: string) => {
    setEmotions(prev => prev.includes(emo) ? prev.filter(e => e !== emo) : [...prev, emo]);
  };

  const handleAnalyze = async () => {
    if (!pair || !direction || !entryPrice || !sl || !tp || !reasoning) {
      alert('Fill in all fields to run the Neural Audit.');
      return;
    }
    setLoading(true);
    setAiResult(null);
    try {
      const ruleTexts = rules.map(r => r.rule_text);
      const feedback = await auditSignal({
        pair,
        direction: direction as any,
        entry_price: entryPrice,
        stop_loss: sl,
        take_profit: tp,
        reasoning
      }, ruleTexts);

      const fl = feedback.split('\n')[0].toUpperCase();
      let type: 'good' | 'warn' | 'bad' = 'good';
      if (fl.includes('AVOID')) type = 'bad';
      else if (fl.includes('CAUTION')) type = 'warn';

      setAiResult({ feedback, type });
    } catch (e) {
      console.error(e);
      alert('Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const submitTrade = async () => {
    if (!pair || !direction || !outcome || !htf || !entry) {
      alert('Fill in: Pair, Direction, HTF Bias, Entry Reasoning, and Outcome.');
      return;
    }

    setLoading(true);
    setAiResult(null);

    const pv = profit ? parseFloat(profit) : outcome === 'WIN' ? 1 : outcome === 'LOSS' ? -1 : 0;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user');

      // AI Analysis
      const feedback = await analyzeTrade({
        pair,
        direction: direction as any,
        session,
        rr,
        profit: pv,
        htf,
        entry,
        outcome: outcome as any,
        rules_followed: rulesFollowed as any,
        rule_breach: breach,
        emotions,
        notes
      });

      const fl = feedback.split('\n')[0].toUpperCase();
      let type: 'good' | 'warn' | 'bad' = 'good';
      if (fl.includes('RULE BREACH')) type = 'bad';
      else if (fl.includes('WARNING')) type = 'warn';

      setAiResult({ feedback, type });

      const { error } = await supabase.from('trades').insert({
        user_id: user.id,
        pair,
        direction,
        session,
        rr,
        profit: pv,
        htf,
        entry,
        outcome,
        rules_followed: rulesFollowed,
        rule_breach: breach,
        emotions,
        notes,
        ai_feedback: feedback
      });

      if (error) throw error;
      onTradeLogged();
    } catch (e) {
      console.error(e);
      alert('Failed to log trade');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6">
      <div>
        <div className="flex items-center gap-4 mb-6">
          <div className="flex bg-black border-2 border-border2 p-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
            <button 
              onClick={() => { setMode('ANALYZE'); setAiResult(null); }}
              className={cn("px-6 py-2 font-mono text-[11px] font-black tracking-[0.2em] uppercase transition-all", mode === 'ANALYZE' ? "bg-red text-black shadow-[0_0_15px_rgba(255,0,0,0.6)]" : "text-muted hover:text-white hover:bg-s1")}
            >
              Analyze Idea
            </button>
            <button 
              onClick={() => { setMode('LOG'); setAiResult(null); }}
              className={cn("px-6 py-2 font-mono text-[11px] font-black tracking-[0.2em] uppercase transition-all", mode === 'LOG' ? "bg-red text-black shadow-[0_0_15px_rgba(255,0,0,0.6)]" : "text-muted hover:text-white hover:bg-s1")}
            >
              Log Execution
            </button>
          </div>
          <div className="flex-1 h-[2px] bg-border2"></div>
        </div>
        
        <div className="bg-black border-2 border-border2 p-8 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Pair</label>
              <select value={pair} onChange={e => setPair(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <option value="">Select</option>
                <option>XAUUSD</option><option>BTCUSD</option><option>GBPJPY</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>NASDAQ</option><option>US30</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Direction</label>
              <select value={direction} onChange={e => setDirection(e.target.value as any)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <option value="">Select</option>
                <option value="LONG">LONG</option><option value="SHORT">SHORT</option>
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Session</label>
              <select value={session} onChange={e => setSession(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                <option value="">Select</option>
                <option>London</option><option>New York</option><option>Asia</option><option>LDN/NY Overlap</option><option>Pre-Market</option>
              </select>
            </div>
          </div>

          {mode === 'ANALYZE' ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Entry Price</label>
                  <input type="number" step="0.00001" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Stop Loss</label>
                  <input type="number" step="0.00001" value={sl} onChange={e => setSl(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Take Profit</label>
                  <input type="number" step="0.00001" value={tp} onChange={e => setTp(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" />
                </div>
              </div>
              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Technical Reasoning</label>
                <textarea value={reasoning} onChange={e => setReasoning(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-4 px-5 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full min-h-[120px] leading-relaxed shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. Swept BSL on M15, IDM formed, M5 BOS into OB, CHoCH confirmation..." />
              </div>
              <button 
                onClick={handleAnalyze}
                disabled={loading}
                className="w-full p-4 bg-red text-black border-2 border-red font-mono text-[14px] font-black tracking-[0.3em] uppercase cursor-pointer mt-6 transition-all hover:bg-black hover:text-red hover:shadow-[0_0_20px_rgba(255,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'RUNNING NEURAL AUDIT...' : 'RUN NEURAL AUDIT'}
              </button>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">R:R Ratio</label>
                  <input type="text" value={rr} onChange={e => setRr(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. 1:3" />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Profit (R)</label>
                  <input type="number" value={profit} onChange={e => setProfit(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. 3 or -1" step="0.1" />
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">HTF Bias & Reasoning</label>
                <textarea value={htf} onChange={e => setHtf(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-4 px-5 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full min-h-[100px] leading-relaxed shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. Bearish on H4 — BOS confirmed, price below OB, targeting liquidity..." />
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">LTF Entry Reasoning</label>
                <textarea value={entry} onChange={e => setEntry(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-4 px-5 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full min-h-[100px] leading-relaxed shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. Swept BSL on M15, IDM formed, M5 BOS into OB, CHoCH confirmation..." />
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Outcome</label>
                <div className="flex gap-3 flex-wrap">
                  {(['WIN', 'LOSS', 'BE'] as Outcome[]).map(o => (
                    <button
                      key={o}
                      onClick={() => setOutcome(o)}
                      className={cn(
                        "px-4 py-2 bg-s1 border-2 border-border2 text-muted font-mono text-[11px] font-bold uppercase cursor-pointer transition-all tracking-[0.2em]",
                        outcome === o && o === 'WIN' && "border-lime text-lime bg-lime/10 shadow-[0_0_10px_rgba(200,255,0,0.3)]",
                        outcome === o && o === 'LOSS' && "border-red text-red bg-red/10 shadow-[0_0_10px_rgba(255,0,0,0.3)]",
                        outcome === o && o === 'BE' && "border-blue text-blue bg-blue/10 shadow-[0_0_10px_rgba(0,100,255,0.3)]"
                      )}
                    >
                      {o === 'BE' ? 'BREAKEVEN' : o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Did you follow your rules?</label>
                <select value={rulesFollowed} onChange={e => setRulesFollowed(e.target.value as any)} className="bg-s1 border-2 border-border2 text-white p-3 px-4 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]">
                  <option value="">Select</option>
                  <option value="yes">Yes — full checklist</option>
                  <option value="partial">Partial — missed something</option>
                  <option value="no">No — broke my rules</option>
                </select>
              </div>

              {(rulesFollowed === 'partial' || rulesFollowed === 'no') && (
                <div className="flex flex-col gap-2 mb-6">
                  <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">What rule did you break?</label>
                  <textarea value={breach} onChange={e => setBreach(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-4 px-5 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full min-h-[100px] leading-relaxed shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="e.g. Moved SL too early..." />
                </div>
              )}

              <div className="flex flex-col gap-2 mb-6">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Emotional state</label>
                <div className="flex gap-3 flex-wrap">
                  {emotionOptions.map(emo => (
                    <button
                      key={emo}
                      onClick={() => toggleEmotion(emo)}
                      className={cn(
                        "px-4 py-2 bg-s1 border-2 border-border2 text-muted font-mono text-[11px] font-bold uppercase cursor-pointer transition-all tracking-[0.2em]",
                        emotions.includes(emo) && "border-gold text-gold bg-gold/10 shadow-[0_0_10px_rgba(255,200,0,0.3)]"
                      )}
                    >
                      {emo}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] uppercase tracking-[0.3em] text-red font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Extra notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-s1 border-2 border-border2 text-white p-4 px-5 font-mono text-[14px] font-bold outline-none focus:border-red transition-colors w-full min-h-[100px] leading-relaxed shadow-[inset_0_0_10px_rgba(0,0,0,0.5)]" placeholder="Anything else..." />
              </div>

              <button 
                onClick={submitTrade}
                disabled={loading}
                className="w-full p-4 bg-red text-black border-2 border-red font-mono text-[14px] font-black tracking-[0.3em] uppercase cursor-pointer mt-6 transition-all hover:bg-black hover:text-red hover:shadow-[0_0_20px_rgba(255,0,0,0.5)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'LOGGING & ANALYZING...' : 'LOG EXECUTION & ANALYZE'}
              </button>
            </>
          )}
        </div>
      </div>

      <div>
        <div className="flex items-center gap-4 mb-6">
          <span className="font-mono text-[10px] text-red uppercase tracking-[0.4em] font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)] whitespace-nowrap">AI Feedback</span>
          <div className="flex-1 h-[2px] bg-border2"></div>
        </div>
        
        <div className="bg-black border-2 border-border2 p-6 flex flex-col gap-6 min-h-[400px] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-red/30 animate-[scanLine_4s_linear_infinite]"></div>
          
          {!loading && !aiResult && (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-4">
              <div className="w-16 h-16 border-2 border-border2 flex items-center justify-center text-3xl shadow-[0_0_15px_rgba(255,0,0,0.1)]">⚡</div>
              <p className="font-mono text-[11px] text-muted leading-relaxed max-w-[250px] uppercase tracking-[0.2em] font-bold">
                {mode === 'ANALYZE' ? 'Analyze a potential trade idea against your rules before executing.' : 'Log a trade and get honest feedback based on your Hunchology framework.'}
              </p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-4 min-h-[100px] justify-center items-center">
              <div className="w-full h-[2px] bg-border2 overflow-hidden relative">
                <div className="absolute top-0 left-0 h-full bg-red animate-[sweep_1s_ease-in-out_infinite] w-1/3 shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
              </div>
              <div className="font-mono text-[10px] text-red tracking-[0.4em] font-black animate-pulse">ANALYZING NEURAL PATHWAYS...</div>
            </div>
          )}

          {aiResult && (
            <div className="block relative z-10">
              <div className={cn(
                "inline-block px-4 py-2 font-mono text-[10px] font-black tracking-[0.3em] uppercase mb-6 border-2 shadow-[0_0_15px_currentColor]",
                aiResult.type === 'good' && "bg-lime/10 text-lime border-lime/50",
                aiResult.type === 'warn' && "bg-gold/10 text-gold border-gold/50",
                aiResult.type === 'bad' && "bg-red/10 text-red border-red/50"
              )}>
                {aiResult.feedback.split('\n')[0]}
              </div>
              <div className="text-[14px] leading-relaxed text-white whitespace-pre-wrap font-mono">
                {aiResult.feedback.split('\n').slice(2).join('\n').trim()}
              </div>
              <div className="flex flex-wrap gap-2 mt-6 pt-6 border-t-2 border-border2">
                {[pair, direction, mode === 'LOG' ? outcome : 'IDEA', session, ...emotions].filter(Boolean).map(c => (
                  <span key={c} className="px-3 py-1.5 bg-s1 border-2 border-border2 font-mono text-[9px] text-white font-bold uppercase tracking-[0.2em] shadow-[0_0_5px_rgba(0,0,0,0.5)]">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
