import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ai, SYSTEM_INSTRUCTION, analyzeTrade } from '../lib/gemini';
import { Trade, Outcome } from '../types';
import { cn } from '../lib/utils';

export default function LogTrade({ onTradeLogged }: { onTradeLogged: () => void }) {
  const [loading, setLoading] = useState(false);
  const [pair, setPair] = useState('');
  const [direction, setDirection] = useState<'LONG' | 'SHORT' | ''>('');
  const [session, setSession] = useState('');
  const [rr, setRr] = useState('');
  const [profit, setProfit] = useState('');
  const [htf, setHtf] = useState('');
  const [entry, setEntry] = useState('');
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const [rules, setRules] = useState<'yes' | 'partial' | 'no' | ''>('');
  const [breach, setBreach] = useState('');
  const [emotions, setEmotions] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [aiResult, setAiResult] = useState<{ feedback: string; type: 'good' | 'warn' | 'bad' } | null>(null);

  const emotionOptions = ['Calm', 'Confident', 'Detached', 'Anxious', 'FOMO', 'Revenge', 'Impatient', 'Greedy', 'Disciplined'];

  const toggleEmotion = (emo: string) => {
    setEmotions(prev => prev.includes(emo) ? prev.filter(e => e !== emo) : [...prev, emo]);
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
        rules_followed: rules as any,
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
        rules_followed: rules,
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
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-5">
      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[9px] text-sub uppercase tracking-[0.25em] whitespace-nowrap">Trade Details</span>
          <div className="flex-1 h-[1px] bg-border"></div>
        </div>
        
        <div className="bg-s1 border border-border rounded-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 mb-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Pair</label>
              <select value={pair} onChange={e => setPair(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full">
                <option value="">Select</option>
                <option>XAUUSD</option><option>BTCUSD</option><option>GBPJPY</option><option>EURUSD</option><option>GBPUSD</option><option>USDJPY</option><option>NASDAQ</option><option>US30</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Direction</label>
              <select value={direction} onChange={e => setDirection(e.target.value as any)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full">
                <option value="">Select</option>
                <option value="LONG">LONG</option><option value="SHORT">SHORT</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Session</label>
              <select value={session} onChange={e => setSession(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full">
                <option value="">Select</option>
                <option>London</option><option>New York</option><option>Asia</option><option>LDN/NY Overlap</option><option>Pre-Market</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mb-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">R:R Ratio</label>
              <input type="text" value={rr} onChange={e => setRr(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full" placeholder="e.g. 1:3" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Profit (R)</label>
              <input type="number" value={profit} onChange={e => setProfit(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full" placeholder="e.g. 3 or -1" step="0.1" />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">HTF Bias & Reasoning</label>
            <textarea value={htf} onChange={e => setHtf(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full min-h-[72px] leading-relaxed" placeholder="e.g. Bearish on H4 — BOS confirmed, price below OB, targeting liquidity..." />
          </div>

          <div className="flex flex-col gap-1.5 mb-3.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">LTF Entry Reasoning</label>
            <textarea value={entry} onChange={e => setEntry(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full min-h-[72px] leading-relaxed" placeholder="e.g. Swept BSL on M15, IDM formed, M5 BOS into OB, CHoCH confirmation..." />
          </div>

          <div className="flex flex-col gap-1.5 mb-3.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Outcome</label>
            <div className="flex gap-2 flex-wrap">
              {(['WIN', 'LOSS', 'BE'] as Outcome[]).map(o => (
                <button
                  key={o}
                  onClick={() => setOutcome(o)}
                  className={cn(
                    "px-3.5 py-1.5 bg-s2 border border-border text-sub font-mono text-[10px] rounded-full cursor-pointer transition-all tracking-wider",
                    outcome === o && o === 'WIN' && "border-lime text-lime bg-lime/10",
                    outcome === o && o === 'LOSS' && "border-red text-red bg-red/10",
                    outcome === o && o === 'BE' && "border-blue text-blue bg-blue/10"
                  )}
                >
                  {o === 'BE' ? 'BREAKEVEN' : o}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5 mb-3.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Did you follow your rules?</label>
            <select value={rules} onChange={e => setRules(e.target.value as any)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full">
              <option value="">Select</option>
              <option value="yes">Yes — full checklist</option>
              <option value="partial">Partial — missed something</option>
              <option value="no">No — broke my rules</option>
            </select>
          </div>

          {(rules === 'partial' || rules === 'no') && (
            <div className="flex flex-col gap-1.5 mb-3.5">
              <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">What rule did you break?</label>
              <textarea value={breach} onChange={e => setBreach(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full min-h-[72px] leading-relaxed" placeholder="e.g. Moved SL too early..." />
            </div>
          )}

          <div className="flex flex-col gap-1.5 mb-3.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Emotional state</label>
            <div className="flex gap-2 flex-wrap">
              {emotionOptions.map(emo => (
                <button
                  key={emo}
                  onClick={() => toggleEmotion(emo)}
                  className={cn(
                    "px-3.5 py-1.5 bg-s2 border border-border text-sub font-mono text-[10px] rounded-full cursor-pointer transition-all tracking-wider",
                    emotions.includes(emo) && "border-gold text-gold bg-gold/10"
                  )}
                >
                  {emo}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Extra notes</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className="bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors w-full min-h-[72px] leading-relaxed" placeholder="Anything else..." />
          </div>

          <button 
            onClick={submitTrade}
            disabled={loading}
            className="w-full p-3.5 bg-red text-white border-none font-mono text-[11px] font-bold tracking-[0.2em] uppercase cursor-pointer rounded-sm mt-[18px] transition-all hover:bg-[#ff5555] hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? 'Analyzing with Hunchology AI...' : 'Analyze with Hunchology AI →'}
          </button>
        </div>
      </div>

      <div>
        <div className="flex items-center gap-3 mb-4">
          <span className="font-mono text-[9px] text-sub uppercase tracking-[0.25em] whitespace-nowrap">AI Feedback</span>
          <div className="flex-1 h-[1px] bg-border"></div>
        </div>
        
        <div className="bg-s1 border border-border rounded-sm p-5 flex flex-col gap-4 min-h-[300px]">
          {!loading && !aiResult && (
            <div className="flex flex-col items-center justify-center flex-1 text-center gap-3">
              <div className="w-[52px] h-[52px] border border-border2 rounded-full flex items-center justify-center text-[22px]">⚡</div>
              <p className="font-mono text-[10px] text-muted leading-relaxed max-w-[200px]">Log a trade and get honest feedback based on your Hunchology framework.</p>
            </div>
          )}

          {loading && (
            <div className="flex flex-col gap-2.5 min-h-[80px] justify-center">
              <div className="h-[1px] bg-border rounded-sm overflow-hidden">
                <div className="h-full bg-red animate-[sweep_1.4s_ease-in-out_infinite] rounded-sm"></div>
              </div>
              <div className="font-mono text-[9px] text-sub tracking-wider text-center">Analyzing against your rules...</div>
            </div>
          )}

          {aiResult && (
            <div className="block">
              <div className={cn(
                "inline-block px-2.5 py-1 rounded-sm font-mono text-[8px] font-bold tracking-[0.25em] uppercase mb-3 border",
                aiResult.type === 'good' && "bg-lime/10 text-lime border-lime/30",
                aiResult.type === 'warn' && "bg-gold/10 text-gold border-gold/30",
                aiResult.type === 'bad' && "bg-red/10 text-red border-red/30"
              )}>
                {aiResult.type === 'good' ? 'DISCIPLINED' : aiResult.type === 'warn' ? 'WARNING' : 'RULE BREACH'}
              </div>
              <div className="text-[12px] leading-relaxed text-[#ccc] whitespace-pre-wrap font-sans">
                {aiResult.feedback.replace(/^(DISCIPLINED|WARNING|RULE BREACH)[^\n]*\n*/i, '').trim()}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border">
                {[pair, direction, outcome, session, ...emotions].filter(Boolean).map(c => (
                  <span key={c} className="px-2.5 py-1 border border-border2 rounded-full font-mono text-[8px] text-sub tracking-wider">{c}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
