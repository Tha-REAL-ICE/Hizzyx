import React, { useState } from 'react';
import { Trade } from '../types';
import { cn } from '../lib/utils';
import { analyzeTrade } from '../lib/gemini';
import { supabase } from '../lib/supabase';
import { Loader2, BrainCircuit, ChevronDown } from 'lucide-react';

interface TradeRowProps {
  trade: Trade;
  onUpdate?: () => void;
}

export default function TradeRow({ trade, onUpdate }: TradeRowProps) {
  const [open, setOpen] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [closing, setClosing] = useState(false);
  const isWin = trade.outcome === 'WIN';
  const isLoss = trade.outcome === 'LOSS';
  const isOpen = trade.status === 'OPEN';

  const handleClosePosition = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setClosing(true);
    try {
      const profit = parseFloat(formData.get('profit') as string);
      const outcome = profit > 0 ? 'WIN' : profit < 0 ? 'LOSS' : 'BE';
      const rules_followed = formData.get('rules') as 'yes' | 'partial' | 'no';
      
      const { error } = await supabase
        .from('trades')
        .update({ 
          status: 'CLOSED', 
          profit, 
          outcome, 
          rules_followed,
          notes: formData.get('notes') as string
        })
        .eq('id', trade.id);

      if (error) throw error;
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to close position:', err);
    } finally {
      setClosing(false);
    }
  };

  const handleAnalyze = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setAnalyzing(true);
    try {
      const feedback = await analyzeTrade(trade);
      const { error } = await supabase
        .from('trades')
        .update({ ai_feedback: feedback })
        .eq('id', trade.id);
      
      if (error) throw error;
      if (onUpdate) onUpdate();
      setOpen(true);
    } catch (err) {
      console.error('Analysis failed:', err);
      alert('AI Analysis failed. Check console.');
    } finally {
      setAnalyzing(false);
    }
  };

  const feedbackType = () => {
    if (!trade.ai_feedback) return null;
    const fl = trade.ai_feedback.split('\n')[0].toUpperCase();
    if (fl.includes('RULE BREACH')) return 'bad';
    if (fl.includes('WARNING')) return 'warn';
    return 'good';
  };

  const type = feedbackType();

  return (
    <div className="flex flex-col group/row">
      <div 
        className={cn(
          "bg-s1 border border-border rounded-sm p-5 px-6 grid grid-cols-[auto_1fr_auto] gap-6 items-center cursor-pointer transition-all hover:bg-s2 relative overflow-hidden",
          isOpen ? "border-lime/30 bg-lime/[0.02] shadow-[0_0_25px_rgba(163,230,53,0.05)]" : "hover:border-sub",
          open ? "border-sub bg-s2/30" : ""
        )}
        onClick={() => setOpen(!open)}
      >
        {isOpen && (
          <div className="absolute top-0 left-0 w-[2px] h-full bg-lime animate-pulse"></div>
        )}
        
        <div className={cn(
          "font-display text-[16px] font-bold w-[60px] text-center py-2 rounded-sm tracking-[0.2em] shadow-sm transition-all group-hover/row:scale-105",
          isOpen && "text-lime bg-lime/10 animate-pulse border border-lime/40",
          isWin && "text-lime bg-lime/10 border border-lime/20",
          isLoss && "text-red bg-red/10 border border-red/20",
          !isWin && !isLoss && !isOpen && "text-blue bg-blue/10 border border-blue/20"
        )}>
          {isOpen ? 'LIVE' : trade.outcome}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-4">
            <span className="font-display text-[20px] font-bold text-text tracking-tight group-hover/row:text-red transition-colors leading-none">{trade.pair}</span>
            <div className="flex items-center gap-2 px-2 py-0.5 bg-s2 border border-border rounded-sm">
              <span className={cn("font-mono text-[10px] font-bold tracking-widest uppercase", trade.direction === 'LONG' ? "text-lime" : "text-red")}>
                {trade.direction}
              </span>
            </div>
            <span className="font-mono text-[10px] text-muted uppercase tracking-[0.3em] hidden sm:inline">{trade.session || 'GLOBAL'}</span>
          </div>
          <div className="font-mono text-[9px] text-muted flex gap-4 items-center">
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1 h-1 rounded-full", trade.rules_followed === 'yes' ? "bg-lime" : "bg-red")}></div>
              <span className="uppercase tracking-widest">Rules</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className={cn("w-1 h-1 rounded-full", trade.htf === 'Confirmed' ? "bg-lime" : "bg-red")}></div>
              <span className="uppercase tracking-widest">HTF</span>
            </div>
            {trade.rr && (
              <div className="flex items-center gap-1.5">
                <div className="w-1 h-1 bg-muted/30 rounded-full"></div>
                R:R {trade.rr}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-8">
          <div className="flex flex-col items-end">
            <span className={cn(
              "font-display text-[24px] font-bold tracking-tighter leading-none",
              trade.profit >= 0 ? "text-lime" : "text-red"
            )}>
              {trade.profit >= 0 ? '+' : ''}{trade.profit.toFixed(2)}
            </span>
            <span className="font-mono text-[8px] text-muted uppercase tracking-widest mt-1">Net Profit</span>
          </div>
          <div className="h-10 w-[1px] bg-border/50 hidden sm:block"></div>
          <div className="flex items-center gap-3">
            <ChevronDown className={cn("text-muted transition-all duration-300", open ? "rotate-180 text-red" : "group-hover/row:text-text")} size={22} />
          </div>
        </div>
      </div>
      {open && (
        <div className="p-4 border-t border-border bg-s2 rounded-b-sm animate-[fadeUp_0.25s_ease_forwards]">
          {!isOpen && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAnalyze}
                disabled={analyzing}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-sm border border-border font-mono text-[9px] uppercase tracking-widest transition-all hover:bg-red/10 hover:border-red hover:text-red disabled:opacity-50",
                  analyzing && "animate-pulse",
                  trade.ai_feedback && "text-red border-red/30 bg-red/5"
                )}
              >
                {analyzing ? <Loader2 size={12} className="animate-spin" /> : <BrainCircuit size={12} />}
                {trade.ai_feedback ? 'Re-Audit Position' : 'Neural Audit'}
              </button>
            </div>
          )}
          {isOpen ? (
            <form onSubmit={handleClosePosition} className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-1.5 h-1.5 bg-gold rounded-full animate-pulse"></div>
                <span className="font-mono text-[10px] uppercase tracking-widest text-gold font-bold">Close Position Protocol</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="font-mono text-[8px] text-muted uppercase tracking-widest">Net Profit/Loss ($)</label>
                  <input 
                    name="profit" 
                    type="number" 
                    step="0.01" 
                    required 
                    className="w-full bg-s1 border border-border text-text p-2.5 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all"
                    placeholder="e.g. 1250.50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-mono text-[8px] text-muted uppercase tracking-widest">Rule Adherence</label>
                  <select 
                    name="rules" 
                    required 
                    className="w-full bg-s1 border border-border text-text p-2.5 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all"
                  >
                    <option value="yes">Followed Rules</option>
                    <option value="partial">Partial Adherence</option>
                    <option value="no">Rule Breach</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="font-mono text-[8px] text-muted uppercase tracking-widest">Post-Trade Notes</label>
                <textarea 
                  name="notes" 
                  className="w-full bg-s1 border border-border text-text p-2.5 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all min-h-[80px]"
                  placeholder="What happened? Emotional state? Market reaction?"
                ></textarea>
              </div>
              <button 
                type="submit" 
                disabled={closing}
                className="w-full py-3 bg-red text-white font-mono text-[11px] font-bold tracking-[0.3em] uppercase rounded-sm hover:bg-red/90 transition-all shadow-lg"
              >
                {closing ? 'Processing...' : 'Finalize & Journal Position'}
              </button>
            </form>
          ) : trade.ai_feedback ? (
            <div className="flex flex-col gap-3">
              <div className={cn(
                "inline-block px-2.5 py-1 rounded-sm font-mono text-[8px] font-bold tracking-[0.25em] uppercase border w-fit",
                type === 'good' && "bg-lime/10 text-lime border-lime/30",
                type === 'warn' && "bg-gold/10 text-gold border-gold/30",
                type === 'bad' && "bg-red/10 text-red border-red/30"
              )}>
                {type === 'good' ? 'DISCIPLINED' : type === 'warn' ? 'WARNING' : 'RULE BREACH'}
              </div>
              <div className="text-[12px] leading-relaxed text-[#ccc] whitespace-pre-wrap font-sans">
                {trade.ai_feedback.replace(/^(DISCIPLINED|WARNING|RULE BREACH)[^\n]*\n*/i, '').trim()}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2 pt-3 border-t border-border">
                {[trade.pair, trade.direction, trade.outcome, trade.session, ...(trade.emotions || [])].filter(Boolean).map(c => (
                  <span key={c} className="px-2.5 py-1 border border-border2 rounded-full font-mono text-[8px] text-sub tracking-wider">{c}</span>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-4 gap-3">
              <p className="font-mono text-[10px] text-muted">No AI feedback yet.</p>
              <button 
                onClick={handleAnalyze}
                disabled={analyzing}
                className="px-4 py-2 bg-red/10 border border-red/30 text-red font-mono text-[9px] tracking-widest uppercase rounded-sm hover:bg-red/20 transition-all"
              >
                {analyzing ? 'Analyzing...' : 'Run AI Analysis'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
