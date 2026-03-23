import React, { useState, useEffect, useMemo } from 'react';
import { Shield } from 'lucide-react';
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
          borderColor: '#c8ff00',
          backgroundColor: 'rgba(200,255,0,0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 3,
        },
        {
          label: 'Per Trade',
          data: per,
          borderColor: '#ff3d3d',
          backgroundColor: 'rgba(255,61,61,0.05)',
          borderWidth: 1.5,
          fill: true,
          tension: 0.4,
          pointRadius: 2,
          borderDash: [4, 3],
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
        backgroundColor: '#161616',
        borderColor: '#222',
        borderWidth: 1,
        titleColor: '#777',
        bodyColor: '#ececec',
        titleFont: { family: 'JetBrains Mono', size: 10 },
        bodyFont: { family: 'JetBrains Mono', size: 11 }
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.02)' },
        border: { display: false },
        ticks: { color: '#444', font: { family: 'JetBrains Mono', size: 8 }, maxRotation: 0, maxTicksLimit: 8 },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.03)' },
        border: { display: false },
        ticks: { color: '#444', font: { family: 'JetBrains Mono', size: 8 } },
      }
    }
  };

  const latestSignals = useMemo(() => {
    return trades.filter(t => t.status === 'OPEN').slice(0, 3);
  }, [trades]);

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-s1 border border-border rounded-sm p-6 relative overflow-hidden group shadow-lg hover:shadow-red/5 transition-all">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-red/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted mb-3 font-bold">Total Operations</div>
          <div className="font-display text-[36px] font-bold text-text leading-none tracking-tighter drop-shadow-sm">{stats.total}</div>
        </div>
        <div className="bg-s1 border border-border rounded-sm p-6 relative overflow-hidden group shadow-lg hover:shadow-lime/5 transition-all">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-lime/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted mb-3 font-bold">Success Rate</div>
          <div className="font-display text-[36px] font-bold text-lime leading-none tracking-tighter drop-shadow-sm">{stats.wr}%</div>
        </div>
        <div className="bg-s1 border border-border rounded-sm p-6 relative overflow-hidden group shadow-lg hover:shadow-gold/5 transition-all">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gold/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted mb-3 font-bold">Current Streak</div>
          <div className={cn(
            "font-display text-[36px] font-bold leading-none tracking-tighter drop-shadow-sm",
            stats.streakType === 'WIN' ? 'text-lime' : stats.streakType === 'LOSS' ? 'text-red' : 'text-text'
          )}>
            {stats.streak}<span className="text-[18px] ml-1">{stats.streakType === 'WIN' ? 'W' : stats.streakType === 'LOSS' ? 'L' : ''}</span>
          </div>
        </div>
        <div className="bg-s1 border border-border rounded-sm p-6 relative overflow-hidden group shadow-lg hover:shadow-blue/5 transition-all">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-blue/40 scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.4em] text-muted mb-3 font-bold">Frequency (7D)</div>
          <div className="font-display text-[36px] font-bold text-blue leading-none tracking-tighter drop-shadow-sm">
            {stats.frequency} <span className="text-[12px] font-mono text-muted uppercase tracking-widest align-middle">T/D</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {stats.openPositions.length > 0 && (
            <div className="space-y-4 relative group/live">
              <div className="absolute -top-4 -left-4 w-12 h-12 border-t-2 border-l-2 border-lime/20 group-hover/live:border-lime/40 transition-all"></div>
              <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-2 border-r-2 border-lime/20 group-hover/live:border-lime/40 transition-all"></div>
              
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-lime rounded-full animate-pulse shadow-[0_0_10px_rgba(163,230,53,0.5)]"></div>
                  <span className="font-mono text-[11px] uppercase tracking-[0.5em] text-lime font-bold">Live Executions</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-lime/10 border border-lime/30 rounded-sm">
                  <span className="font-mono text-[9px] text-lime font-bold tracking-widest uppercase">Active: {stats.openPositions.length}</span>
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {stats.openPositions.map(t => (
                  <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-s1 border border-border rounded-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-red rounded-full animate-pulse"></div>
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-sub">Equity Performance Matrix</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 font-mono text-[8px] text-muted uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-lime"></div>
                  <span>Cumulative</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[8px] text-muted uppercase">
                  <div className="w-1.5 h-1.5 rounded-full bg-red"></div>
                  <span>Per Trade</span>
                </div>
              </div>
            </div>
            <div className="relative h-[280px]">
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full font-mono text-[10px] text-muted uppercase tracking-widest">Awaiting Data Streams...</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="font-mono text-[9px] text-muted uppercase tracking-[0.4em] whitespace-nowrap">Recent Activity Log</span>
              <div className="flex-1 h-[1px] bg-border/50"></div>
            </div>
            <div className="flex flex-col gap-2">
              {trades.slice(0, 5).map(t => (
                <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
              ))}
              {!trades.length && <div className="text-center py-12 font-mono text-[10px] text-muted uppercase tracking-widest">No activity recorded.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-s1 border border-border border-l-2 border-l-red rounded-sm p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
              <Shield size={120} />
            </div>
            <div className="space-y-6">
              <div>
                <div className="font-mono text-[9px] text-red uppercase tracking-[0.3em] mb-4 font-bold">Risk Protocols</div>
                <div className="flex flex-col gap-2">
                  {['Over leveraging', 'Entry without confirmation', 'FOMO', 'Greed-driven exits'].map(item => (
                    <div key={item} className="font-mono text-[10px] text-sub leading-relaxed flex items-center gap-3 group">
                      <div className="w-1 h-1 bg-red/40 group-hover:bg-red transition-colors"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-6 border-t border-border/50">
                <div className="font-mono text-[9px] text-red uppercase tracking-[0.3em] mb-4 font-bold">Core Framework</div>
                <div className="flex flex-col gap-2">
                  {['Neural Confirmation', 'Risk/Reward Ratio', 'Session Timing', 'Emotional Audit'].map(item => (
                    <div key={item} className="font-mono text-[10px] text-sub leading-relaxed flex items-center gap-3 group">
                      <div className="w-1 h-1 bg-lime/40 group-hover:bg-lime transition-colors"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-border/50">
              <div className="font-display text-[24px] text-text tracking-tight leading-none mb-2 italic">Execution over profits.</div>
              <p className="font-mono text-[10px] text-muted leading-relaxed uppercase tracking-wider">Discipline is the only edge that matters.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
