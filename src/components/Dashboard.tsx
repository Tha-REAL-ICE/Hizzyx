import React, { useState, useEffect, useMemo } from 'react';
import { Shield, AlertTriangle, Crosshair, Zap } from 'lucide-react';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Trade } from '../types';
import TradeRow from './TradeRow';
import { cn } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

export default function Dashboard({ trades, onUpdate }: { trades: Trade[], onUpdate: () => void }) {
  const stats = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' || !t.status);
    const total = closedTrades.length;
    const wins = closedTrades.filter(t => t.outcome === 'WIN').length;
    const disc = closedTrades.filter(t => t.rules_followed === 'yes').length;
    const breach = closedTrades.filter(t => t.rules_followed === 'no').length;
    
    // Calculate Streak
    let streak = 0;
    let streakType: 'WIN' | 'LOSS' | 'NONE' = 'NONE';
    if (closedTrades.length > 0) {
      streakType = closedTrades[0].outcome === 'WIN' ? 'WIN' : closedTrades[0].outcome === 'LOSS' ? 'LOSS' : 'NONE';
      for (const t of closedTrades) {
        if (t.outcome === streakType) streak++;
        else break;
      }
    }

    // Calculate Frequency (trades per day over last 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentTrades = closedTrades.filter(t => new Date(t.created_at) > sevenDaysAgo);
    const frequency = (recentTrades.length / 7).toFixed(1);

    const openPositions = trades.filter(t => t.status === 'OPEN');
    
    return {
      total,
      wr: total ? Math.round((wins / total) * 100) : 0,
      dr: total ? Math.round((disc / total) * 100) : 0,
      breach,
      streak,
      streakType,
      frequency,
      openPositions
    };
  }, [trades]);

  const chartData = useMemo(() => {
    const closedTrades = trades.filter(t => t.status === 'CLOSED' || !t.status);
    if (!closedTrades.length) return null;
    const rev = [...closedTrades].reverse();
    const labels = rev.map((t, i) => `#${i + 1} ${t.pair}`);
    const per = rev.map(t => t.profit || 0);
    const cum: number[] = [];
    let sum = 0;
    per.forEach(v => {
      sum += v;
      cum.push(parseFloat(sum.toFixed(2)));
    });

    return {
      labels,
      datasets: [
        {
          label: 'Cumulative',
          data: cum,
          borderColor: '#ff0000',
          backgroundColor: 'rgba(255,0,0,0.15)',
          borderWidth: 3,
          fill: true,
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: '#ff0000',
          stepped: true
        },
        {
          label: 'Per Trade',
          data: per,
          borderColor: '#444',
          backgroundColor: 'transparent',
          borderWidth: 1,
          fill: false,
          tension: 0,
          pointRadius: 3,
          pointBackgroundColor: (ctx: any) => {
            const val = ctx.raw;
            return val > 0 ? '#c8ff00' : '#ff0000';
          },
          borderDash: [2, 2],
        }
      ]
    };
  }, [trades]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#000',
        borderColor: '#ff0000',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#ff0000',
        titleFont: { family: 'JetBrains Mono', size: 10 },
        bodyFont: { family: 'JetBrains Mono', size: 12, weight: 'bold' as const },
        padding: 12,
        cornerRadius: 0
      }
    },
    scales: {
      x: {
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#777', font: { family: 'JetBrains Mono', size: 9 }, maxRotation: 0, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: '#222', drawBorder: false },
        ticks: { color: '#ff0000', font: { family: 'JetBrains Mono', size: 9, weight: 'bold' as const } },
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Aggressive Banner */}
      <div className="bg-red text-black font-display text-[24px] md:text-[32px] uppercase tracking-tighter p-4 flex items-center justify-between shadow-[0_0_30px_rgba(255,0,0,0.4)] animate-thriller">
        <div className="flex items-center gap-4">
          <AlertTriangle size={32} className="animate-pulse" />
          <span>SYSTEM STATUS: CRITICAL // EXECUTION ONLY</span>
        </div>
        <div className="hidden md:block font-mono text-[12px] tracking-[0.5em] font-bold">
          KILL GREED.
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-black border-2 border-border2 p-6 relative overflow-hidden group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-red transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-red/50 group-hover:bg-red transition-colors"></div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-red mb-3 font-bold flex items-center gap-2">
            <Crosshair size={12} /> Total Ops
          </div>
          <div className="font-display text-[54px] font-black text-white leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">{stats.total}</div>
        </div>
        <div className="bg-black border-2 border-border2 p-6 relative overflow-hidden group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-lime transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-lime/50 group-hover:bg-lime transition-colors"></div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-lime mb-3 font-bold flex items-center gap-2">
            <Zap size={12} /> Win Rate
          </div>
          <div className="font-display text-[54px] font-black text-lime leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(200,255,0,0.3)]">{stats.wr}%</div>
        </div>
        <div className="bg-black border-2 border-border2 p-6 relative overflow-hidden group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-gold transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/50 group-hover:bg-gold transition-colors"></div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-gold mb-3 font-bold">Streak</div>
          <div className={cn(
            "font-display text-[54px] font-black leading-none tracking-tighter",
            stats.streakType === 'WIN' ? 'text-lime drop-shadow-[0_0_15px_rgba(200,255,0,0.3)]' : stats.streakType === 'LOSS' ? 'text-red drop-shadow-[0_0_15px_rgba(255,0,0,0.3)]' : 'text-white'
          )}>
            {stats.streak}<span className="text-[20px] ml-1 font-mono">{stats.streakType === 'WIN' ? 'W' : stats.streakType === 'LOSS' ? 'L' : ''}</span>
          </div>
        </div>
        <div className="bg-black border-2 border-border2 p-6 relative overflow-hidden group shadow-[0_0_15px_rgba(0,0,0,0.5)] hover:border-blue transition-colors">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue/50 group-hover:bg-blue transition-colors"></div>
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-blue mb-3 font-bold">Freq (7D)</div>
          <div className="font-display text-[54px] font-black text-blue leading-none tracking-tighter drop-shadow-[0_0_15px_rgba(56,189,248,0.3)]">
            {stats.frequency} <span className="text-[14px] font-mono text-muted uppercase tracking-widest align-middle">T/D</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          {stats.openPositions.length > 0 && (
            <div className="space-y-6 border-2 border-lime/40 p-8 bg-lime/5 relative shadow-[0_0_30px_rgba(200,255,0,0.1)]">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-lime"></div>
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-lime"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-lime animate-pulse"></div>
                  <span className="font-display text-[24px] uppercase tracking-widest text-lime leading-none drop-shadow-[0_0_10px_rgba(200,255,0,0.5)]">Live Executions</span>
                </div>
                <div className="px-4 py-1.5 bg-lime/20 border border-lime text-lime font-mono text-[10px] font-bold tracking-widest uppercase shadow-[0_0_10px_rgba(200,255,0,0.2)]">
                  Active: {stats.openPositions.length}
                </div>
              </div>
              <div className="flex flex-col gap-4">
                {stats.openPositions.map(t => (
                  <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-black border-2 border-border2 p-8 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red via-black to-red opacity-50"></div>
            <div className="flex items-center justify-between mb-10 border-b-2 border-border2 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-red animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.8)]"></div>
                <span className="font-display text-[22px] uppercase tracking-widest text-white leading-none">Equity Matrix</span>
              </div>
              <div className="flex gap-8">
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted uppercase font-bold">
                  <div className="w-3 h-3 bg-red"></div>
                  <span>Cumulative</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-muted uppercase font-bold">
                  <div className="w-3 h-3 bg-lime"></div>
                  <span>Per Trade</span>
                </div>
              </div>
            </div>
            <div className="relative h-[400px]">
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full font-mono text-[14px] text-red uppercase tracking-[0.3em] font-bold blink">Awaiting Data Streams...</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-6 mb-8">
              <span className="font-display text-[22px] text-white uppercase tracking-widest leading-none">Recent Log</span>
              <div className="flex-1 h-[2px] bg-border2"></div>
            </div>
            <div className="flex flex-col gap-4">
              {trades.slice(0, 5).map(t => (
                <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
              ))}
              {!trades.length && <div className="text-center py-20 border-2 border-dashed border-red/30 bg-red/5 font-mono text-[12px] text-red uppercase tracking-widest font-bold blink shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]">No activity recorded.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-black border-2 border-border2 border-l-8 border-l-red p-8 relative shadow-[0_0_30px_rgba(255,0,0,0.15)] overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-[0.05] pointer-events-none text-red">
              <Shield size={240} />
            </div>
            <div className="space-y-10 relative z-10">
              <div>
                <div className="font-display text-[24px] text-red uppercase tracking-widest mb-6 leading-none drop-shadow-[0_0_10px_rgba(255,0,0,0.4)]">Risk Protocols</div>
                <div className="flex flex-col gap-5">
                  {['Over leveraging', 'Entry without confirmation', 'FOMO', 'Greed-driven exits'].map(item => (
                    <div key={item} className="font-mono text-[11px] text-white uppercase tracking-[0.2em] flex items-center gap-4 group font-bold">
                      <div className="w-2 h-2 bg-red/40 group-hover:bg-red group-hover:shadow-[0_0_10px_rgba(255,0,0,0.8)] transition-all"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-10 border-t-2 border-border2">
                <div className="font-display text-[24px] text-lime uppercase tracking-widest mb-6 leading-none drop-shadow-[0_0_10px_rgba(200,255,0,0.4)]">Core Framework</div>
                <div className="flex flex-col gap-5">
                  {['Neural Confirmation', 'Risk/Reward Ratio', 'Session Timing', 'Emotional Audit'].map(item => (
                    <div key={item} className="font-mono text-[11px] text-white uppercase tracking-[0.2em] flex items-center gap-4 group font-bold">
                      <div className="w-2 h-2 bg-lime/40 group-hover:bg-lime group-hover:shadow-[0_0_10px_rgba(200,255,0,0.8)] transition-all"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-12 pt-10 border-t-2 border-border2">
              <div className="font-display text-[36px] text-white tracking-tighter leading-none mb-4 uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">Execution over profits.</div>
              <p className="font-mono text-[12px] text-red font-bold leading-relaxed uppercase tracking-[0.3em] drop-shadow-[0_0_10px_rgba(255,0,0,0.5)]">Discipline is the only edge.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
