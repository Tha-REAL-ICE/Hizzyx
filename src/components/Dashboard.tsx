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
          tension: 0,
          pointRadius: 0,
          pointHoverRadius: 4,
          stepped: true
        },
        {
          label: 'Per Trade',
          data: per,
          borderColor: '#ff3d3d',
          backgroundColor: 'transparent',
          borderWidth: 1,
          fill: false,
          tension: 0,
          pointRadius: 2,
          pointBackgroundColor: '#ff3d3d',
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
        borderColor: '#ff3d3d',
        borderWidth: 1,
        titleColor: '#fff',
        bodyColor: '#c8ff00',
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
        ticks: { color: '#777', font: { family: 'JetBrains Mono', size: 9 } },
      }
    }
  };

  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-s1 border border-border2 p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-red/50 group-hover:bg-red transition-colors"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted mb-3 font-bold">Total Ops</div>
          <div className="font-display text-[42px] font-black text-text leading-none tracking-tighter">{stats.total}</div>
        </div>
        <div className="bg-s1 border border-border2 p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-lime/50 group-hover:bg-lime transition-colors"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted mb-3 font-bold">Win Rate</div>
          <div className="font-display text-[42px] font-black text-lime leading-none tracking-tighter">{stats.wr}%</div>
        </div>
        <div className="bg-s1 border border-border2 p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-gold/50 group-hover:bg-gold transition-colors"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted mb-3 font-bold">Streak</div>
          <div className={cn(
            "font-display text-[42px] font-black leading-none tracking-tighter",
            stats.streakType === 'WIN' ? 'text-lime' : stats.streakType === 'LOSS' ? 'text-red' : 'text-text'
          )}>
            {stats.streak}<span className="text-[18px] ml-1 font-mono">{stats.streakType === 'WIN' ? 'W' : stats.streakType === 'LOSS' ? 'L' : ''}</span>
          </div>
        </div>
        <div className="bg-s1 border border-border2 p-6 relative overflow-hidden group shadow-lg">
          <div className="absolute top-0 left-0 w-full h-1 bg-blue/50 group-hover:bg-blue transition-colors"></div>
          <div className="font-mono text-[9px] uppercase tracking-[0.3em] text-muted mb-3 font-bold">Freq (7D)</div>
          <div className="font-display text-[42px] font-black text-blue leading-none tracking-tighter">
            {stats.frequency} <span className="text-[12px] font-mono text-muted uppercase tracking-widest align-middle">T/D</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-10">
          {stats.openPositions.length > 0 && (
            <div className="space-y-6 border border-lime/20 p-8 bg-lime/5 relative shadow-xl">
              <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-lime"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-lime"></div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-lime animate-pulse"></div>
                  <span className="font-display text-[20px] uppercase tracking-widest text-lime leading-none">Live Executions</span>
                </div>
                <div className="px-3 py-1 bg-lime/10 border border-lime/30 text-lime font-mono text-[9px] font-bold tracking-widest uppercase">
                  Active: {stats.openPositions.length}
                </div>
              </div>
              <div className="flex flex-col gap-3">
                {stats.openPositions.map(t => (
                  <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
                ))}
              </div>
            </div>
          )}

          <div className="bg-s1 border border-border2 p-8 shadow-lg">
            <div className="flex items-center justify-between mb-10 border-b border-border2 pb-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 bg-red animate-pulse"></div>
                <span className="font-display text-[18px] uppercase tracking-widest text-text leading-none">Equity Matrix</span>
              </div>
              <div className="flex gap-8">
                <div className="flex items-center gap-2 font-mono text-[9px] text-muted uppercase font-bold">
                  <div className="w-2.5 h-2.5 bg-lime"></div>
                  <span>Cumulative</span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[9px] text-muted uppercase font-bold">
                  <div className="w-2.5 h-2.5 bg-red"></div>
                  <span>Per Trade</span>
                </div>
              </div>
            </div>
            <div className="relative h-[360px]">
              {chartData ? (
                <Line data={chartData} options={chartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full font-mono text-[11px] text-red uppercase tracking-widest blink">Awaiting Data Streams...</div>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-6 mb-8">
              <span className="font-display text-[18px] text-text uppercase tracking-widest leading-none">Recent Log</span>
              <div className="flex-1 h-[1px] bg-border2"></div>
            </div>
            <div className="flex flex-col gap-3">
              {trades.slice(0, 5).map(t => (
                <TradeRow key={t.id} trade={t} onUpdate={onUpdate} />
              ))}
              {!trades.length && <div className="text-center py-20 border border-dashed border-border2 font-mono text-[11px] text-red uppercase tracking-widest blink">No activity recorded.</div>}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-s1 border border-border2 border-l-4 border-l-red p-8 relative shadow-lg">
            <div className="absolute top-0 right-0 p-6 opacity-[0.03] pointer-events-none">
              <Shield size={180} />
            </div>
            <div className="space-y-10 relative z-10">
              <div>
                <div className="font-display text-[20px] text-red uppercase tracking-widest mb-6 leading-none">Risk Protocols</div>
                <div className="flex flex-col gap-4">
                  {['Over leveraging', 'Entry without confirmation', 'FOMO', 'Greed-driven exits'].map(item => (
                    <div key={item} className="font-mono text-[10px] text-text uppercase tracking-widest flex items-center gap-4 group">
                      <div className="w-1.5 h-1.5 bg-red/30 group-hover:bg-red transition-colors"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-10 border-t border-border2">
                <div className="font-display text-[20px] text-lime uppercase tracking-widest mb-6 leading-none">Core Framework</div>
                <div className="flex flex-col gap-4">
                  {['Neural Confirmation', 'Risk/Reward Ratio', 'Session Timing', 'Emotional Audit'].map(item => (
                    <div key={item} className="font-mono text-[10px] text-text uppercase tracking-widest flex items-center gap-4 group">
                      <div className="w-1.5 h-1.5 bg-lime/30 group-hover:bg-lime transition-colors"></div>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-12 pt-10 border-t border-border2">
              <div className="font-display text-[28px] text-text tracking-tighter leading-none mb-4 uppercase">Execution over profits.</div>
              <p className="font-mono text-[10px] text-red leading-relaxed uppercase tracking-[0.25em]">Discipline is the only edge.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
