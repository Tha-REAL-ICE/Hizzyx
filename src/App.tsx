import React, { useEffect, useState, useMemo, useRef } from 'react';
import { supabase } from './lib/supabase';
import { Trade, CustomRule, Signal } from './types';
import JarvisOverlay from './components/JarvisOverlay';
import AuthScreen from './components/AuthScreen';
import Sidebar, { PageId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LogTrade from './components/LogTrade';
import MarketAnalyst from './components/MarketAnalyst';
import TradeRow from './components/TradeRow';
import { Menu, X, Radio, Search, Zap, Clock, Globe, ArrowUpRight, ArrowDownRight, BrainCircuit, AlertTriangle } from 'lucide-react';
import { cn } from './lib/utils';
import { ai, SYSTEM_INSTRUCTION, analyzeTrade, auditSignal } from './lib/gemini';
import { TradingEngine } from './lib/engine';
import { TradeMode, TradingPair, MarketState, Trend } from './types';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jarvisDone, setJarvisDone] = useState(false);
  const [activePage, setActivePage] = useState<PageId>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  
  const [engineMode, setEngineMode] = useState<TradeMode>(TradeMode.SCALP);
  const [engineState, setEngineState] = useState<MarketState | null>(null);
  const [allEngineStates, setAllEngineStates] = useState<Record<string, MarketState>>({});
  const [engineError, setEngineError] = useState<string | null>(null);
  const engineRef = React.useRef<TradingEngine | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
      const channel = subscribeSignals();
      
      // Initialize Engine at App level
      engineRef.current = new TradingEngine('BTCUSD', engineMode, () => {
        if (engineRef.current) {
          setEngineState({ ...engineRef.current.getState() });
          setAllEngineStates({ ...engineRef.current.getAllStates() });
        }
      }, (err) => {
        setEngineError(err);
        setTimeout(() => setEngineError(null), 5000);
      });

      // Event Listeners
      const handleNewSignal = async (latest: any) => {
        const symbolMatch = latest.id.match(/sig-([^-]+)-/);
        const symbol = symbolMatch ? symbolMatch[1] : 'BTCUSD';

        const newSignal = {
          user_id: user.id,
          pair: symbol,
          direction: latest.type === 'BUY' ? 'LONG' : 'SHORT',
          session: engineRef.current?.getState().session || 'LIVE',
          entry_price: latest.entry.toString(),
          stop_loss: latest.sl.toString(),
          take_profit: latest.tp.toString(),
          reasoning: latest.reason,
          source: `Blueprint-${latest.id}`,
          status: 'active',
          mode: engineMode
        };

        const { data, error } = await supabase.from('signals').insert(newSignal).select().single();
        if (!error && data) {
          setSignals(prev => {
            if (prev.some(s => s.id === data.id)) return prev;
            return [data as Signal, ...prev];
          });
        }
      };

      const handleSync = (syncing: boolean) => {
        setIsSyncing(syncing);
      };

      engineRef.current.on('signal', handleNewSignal);
      engineRef.current.on('sync', handleSync);

      return () => {
        if (channel) supabase.removeChannel(channel);
        engineRef.current?.dispose();
      };
    }
  }, [user]);

  // Handle mode changes separately to re-sync
  useEffect(() => {
    if (engineRef.current && user) {
      engineRef.current.setMode(engineMode);
      engineRef.current.reSync();
    }
  }, [engineMode]);

  const [sessionInfo, setSessionInfo] = useState({ name: 'London', status: 'Open', color: 'text-lime' });

  useEffect(() => {
    const updateSession = () => {
      const hour = new Date().getUTCHours();
      if (hour >= 8 && hour < 16) setSessionInfo({ name: 'London', status: 'Open', color: 'text-lime' });
      else if (hour >= 13 && hour < 21) setSessionInfo({ name: 'New York', status: 'Open', color: 'text-lime' });
      else if (hour >= 0 && hour < 8) setSessionInfo({ name: 'Asia', status: 'Open', color: 'text-lime' });
      else setSessionInfo({ name: 'Pre-Market', status: 'Closed', color: 'text-muted' });
    };
    updateSession();
    const interval = setInterval(updateSession, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    const [tr, rr, sr] = await Promise.all([
      supabase.from('trades').select('*').order('created_at', { ascending: false }),
      supabase.from('custom_rules').select('*').order('created_at', { ascending: true }),
      supabase.from('signals').select('*').order('created_at', { ascending: false }).limit(50)
    ]);
    setTrades(tr.data || []);
    setRules(rr.data || []);
    setSignals(sr.data || []);
  };

  const subscribeSignals = () => {
    const channel = supabase.channel('signals-rt')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signals' }, payload => {
        setSignals(prev => {
          if (prev.some(s => s.id === payload.new.id)) return prev;
          return [payload.new as Signal, ...prev];
        });
      })
      .subscribe();
    return channel;
  };

  const stats = useMemo(() => {
    const total = trades.length;
    const wins = trades.filter(t => t.outcome === 'WIN').length;
    const disc = trades.filter(t => t.rules_followed === 'yes').length;
    
    const pp: Record<string, { w: number; n: number }> = {};
    trades.forEach(t => {
      if (!pp[t.pair]) pp[t.pair] = { w: 0, n: 0 };
      pp[t.pair].n++;
      if (t.outcome === 'WIN') pp[t.pair].w++;
    });
    
    let bp = '—', br = -1;
    Object.keys(pp).forEach(p => {
      const r = pp[p].w / pp[p].n;
      if (r > br) { br = r; bp = p; }
    });

    return {
      total,
      wr: total ? Math.round((wins / total) * 100) + '%' : '—',
      dr: total ? Math.round((disc / total) * 100) + '%' : '—',
      bp
    };
  }, [trades]);

  const handleJarvisComplete = React.useCallback(() => {
    setJarvisDone(true);
  }, []);

  if (loading) return null;

  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-red/30">
      <div className="grain"></div>
      {!jarvisDone && <JarvisOverlay onComplete={handleJarvisComplete} />}

      <div className={cn("flex flex-col h-screen overflow-hidden", !jarvisDone && "invisible")}>
        <header className="flex-none border-b-2 border-border2 bg-black z-[200] shadow-[0_5px_30px_rgba(0,0,0,0.8)]">
          <div className="min-h-[60px] lg:min-h-[80px] py-2 lg:py-4 px-4 lg:px-8 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 lg:gap-6 min-w-0">
              <button 
                className="lg:hidden p-2 bg-black border-2 border-border2 text-white hover:bg-red hover:border-red transition-colors shrink-0 shadow-[0_0_10px_rgba(255,0,0,0.2)] z-[210]"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
              <div className="flex items-center gap-3 lg:gap-4 group cursor-pointer" onClick={() => setActivePage('dashboard')}>
                <div className="w-8 h-8 lg:w-10 lg:h-10 bg-red flex items-center justify-center shadow-[0_0_20px_rgba(255,0,0,0.6)] group-hover:scale-110 transition-transform border-2 border-red/50">
                  <BrainCircuit className="w-5 h-5 lg:w-6 lg:h-6 text-black" />
                </div>
                <div className="flex flex-col">
                  <span className="font-display text-lg lg:text-2xl font-black tracking-tighter text-white leading-none drop-shadow-[0_0_5px_rgba(255,255,255,0.5)]">HUNCHOLOGY</span>
                  <span className="font-mono text-[8px] lg:text-[10px] text-red tracking-[0.4em] font-black uppercase drop-shadow-[0_0_2px_rgba(255,0,0,0.8)]">NEURAL CORE</span>
                </div>
              </div>

              <div className="hidden xl:flex items-center gap-8 border-l-2 border-border2 pl-8 ml-4">
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-[0.3em] font-bold">Win Rate</span>
                  <span className="font-mono text-lg text-lime font-black drop-shadow-[0_0_5px_rgba(200,255,0,0.5)]">{stats.wr}</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-[0.3em] font-bold">Discipline</span>
                  <span className="font-mono text-lg text-blue font-black drop-shadow-[0_0_5px_rgba(0,100,255,0.5)]">{stats.dr}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:gap-6 shrink-0">
              <div className="hidden sm:flex items-center gap-4 bg-black border-2 border-border2 px-3 lg:px-4 py-1.5 lg:py-2 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                <div className="flex flex-col items-center">
                  <div className={cn("w-1.5 h-1.5 animate-pulse shadow-[0_0_10px_currentColor]", sessionInfo.color === 'text-lime' ? "bg-lime text-lime" : "bg-muted text-muted")} />
                  <span className="font-mono text-[7px] text-muted uppercase mt-0.5">Status</span>
                </div>
                <div className="flex flex-col">
                  <span className="font-mono text-[9px] lg:text-[10px] text-white font-bold uppercase tracking-[0.2em] leading-tight">{sessionInfo.name}</span>
                  <span className="font-mono text-[7px] lg:text-[8px] text-red uppercase tracking-[0.1em] leading-tight">{engineState?.symbol || 'AWAITING'}</span>
                </div>
              </div>

              <div className="flex items-center bg-black border-2 border-border2 p-0.5 lg:p-1 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)] overflow-x-auto no-scrollbar max-w-[120px] sm:max-w-none">
                {(Object.values(TradeMode) as TradeMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setEngineMode(m)}
                    className={cn(
                      "px-2 lg:px-4 py-1 lg:py-1.5 font-mono text-[9px] lg:text-[11px] font-black tracking-[0.2em] uppercase transition-all whitespace-nowrap",
                      engineMode === m 
                        ? "bg-red text-black shadow-[0_0_15px_rgba(255,0,0,0.6)]" 
                        : "text-muted hover:text-white hover:bg-s1"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 lg:gap-4 border-l-2 border-border2 pl-3 lg:pl-6 ml-0 lg:ml-2">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="font-mono text-[10px] lg:text-[12px] text-white font-bold lowercase tracking-widest">{user?.email?.split('@')[0]}</span>
                  <span className="font-mono text-[8px] lg:text-[9px] text-red uppercase tracking-[0.3em] font-black">Operator</span>
                </div>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="p-2 lg:p-2.5 bg-black border-2 border-border2 text-muted hover:text-red hover:border-red transition-colors shadow-[0_0_10px_rgba(0,0,0,0.5)] hover:shadow-[0_0_15px_rgba(255,0,0,0.4)]"
                  title="Disconnect"
                >
                  <X className="w-4 h-4 lg:w-5 lg:h-5" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {engineError && (
          <div className="fixed top-16 right-6 z-[250] bg-black border border-red p-3 shadow-[0_0_20px_rgba(255,61,61,0.2)] animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3">
              <AlertTriangle size={16} className="text-red" />
              <div className="flex flex-col">
                <span className="font-mono text-[9px] text-red font-bold uppercase tracking-widest">System Error</span>
                <span className="font-mono text-[11px] text-text uppercase">{engineError}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-1 overflow-hidden">
          <Sidebar 
            activePage={activePage} 
            onPageChange={setActivePage} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            hasLiveSignal={signals.some(s => s.status === 'active')}
          />
          
          <main className="flex-1 overflow-y-auto bg-bg relative custom-scrollbar flex flex-col">
            <div className="absolute inset-0 pointer-events-none opacity-[0.02] z-0">
              <div className="h-full w-full bg-[linear-gradient(to_right,#808080_1px,transparent_1px),linear-gradient(to_bottom,#808080_1px,transparent_1px)] bg-[size:60px_60px]"></div>
            </div>
            <div className={cn(
              "relative z-10 flex-1 flex flex-col",
              activePage === 'analyst' ? "p-0" : "p-4 sm:p-6 lg:p-8"
            )}>
              {activePage === 'dashboard' && <Dashboard trades={trades} onUpdate={fetchData} />}
              {activePage === 'log' && <LogTrade onTradeLogged={fetchData} />}
              {activePage === 'analyst' && <MarketAnalyst engineStates={allEngineStates} />}
              {activePage === 'history' && (
                <div className="flex flex-col gap-6">
                  <div className="flex flex-col">
                    <h1 className="font-display text-[36px] tracking-wider text-text mb-1">History</h1>
                    <p className="text-[12px] text-sub mb-7 font-mono">All logged trades — click to expand AI feedback</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {trades.map(t => (
                      <TradeRow key={t.id} trade={t} onUpdate={fetchData} />
                    ))}
                    {!trades.length && <div className="text-center py-12 font-mono text-[10px] text-muted">No trades logged yet.</div>}
                  </div>
                </div>
              )}
              {activePage === 'signals' && (
                <SignalsPage 
                  signals={signals} 
                  onSignalUpdate={fetchData} 
                  rules={rules} 
                  engineState={engineState} 
                  engineRef={engineRef} 
                  isSyncing={isSyncing}
                  onReSync={async () => {
                    setIsSyncing(true);
                    await engineRef.current?.reSync();
                    setIsSyncing(false);
                  }}
                  sessionInfo={sessionInfo}
                  engineMode={engineMode}
                />
              )}
              {activePage === 'analytics' && <AnalyticsPage trades={trades} />}
              {activePage === 'rules' && (
                <div className="max-w-7xl mx-auto w-full">
                  <RulesPage customRules={rules} onRulesUpdate={fetchData} />
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}

function Sparkline({ data, colorClass }: { data: number[], colorClass: string }) {
  if (data.length < 2) return <div className="w-12 h-4"></div>;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 48},${16 - ((d - min) / range) * 16}`).join(' ');
  return (
    <svg width="48" height="16" className={cn("overflow-visible", colorClass)}>
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SignalsPage({ signals, onSignalUpdate, rules, engineState, engineRef, isSyncing, onReSync, sessionInfo, engineMode }: any) {
  const prevEngineStateRef = useRef<MarketState | null>(null);
  useEffect(() => {
    prevEngineStateRef.current = engineState;
  }, [engineState]);
  const prevState = prevEngineStateRef.current;

  const [vitalsHistory, setVitalsHistory] = useState({
    confidence: [] as number[],
    atr: [] as number[],
    zones: [] as number[],
  });

  useEffect(() => {
    if (engineState) {
      setVitalsHistory(prev => ({
        confidence: [...prev.confidence.slice(-4), engineState.mlConfidence],
        atr: [...prev.atr.slice(-4), engineState.atr],
        zones: [...prev.zones.slice(-4), engineState.mtf.activeZones],
      }));
    }
  }, [engineState?.mlConfidence, engineState?.atr, engineState?.mtf.activeZones]);

  const [loading, setLoading] = useState(false);
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);
  
  const [balance, setBalance] = useState('100000');
  const [riskPct, setRiskPct] = useState('1');
  const [alerts, setAlerts] = useState<{ id: string; type: string; level: number; triggered: boolean }[]>([]);

  const active = signals.find((s: Signal) => s.status === 'active');

  useEffect(() => {
    setAuditResult(null);
  }, [active?.id]);

  const handleAudit = async () => {
    if (!active) return;
    setAuditing(true);
    try {
      const ruleTexts = rules.map((r: any) => r.rule_text);
      const result = await auditSignal(active, ruleTexts);
      setAuditResult(result);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditing(false);
    }
  };

  const calculateLotSize = () => {
    if (!active || !active.entry_price || !active.stop_loss) return '—';
    const entry = parseFloat(active.entry_price);
    const sl = parseFloat(active.stop_loss);
    const bal = parseFloat(balance);
    const risk = parseFloat(riskPct) / 100;
    
    if (isNaN(entry) || isNaN(sl) || isNaN(bal) || isNaN(risk)) return '—';
    
    const riskAmount = bal * risk;
    const pips = Math.abs(entry - sl);
    
    if (pips === 0) return '—';

    const pipValue = active.pair.includes('JPY') ? 1000 : 10; 
    const lots = riskAmount / (pips * pipValue);
    
    return lots.toFixed(2);
  };

  useEffect(() => {
    if (!active || !engineRef.current) {
      setLivePrice(null);
      return;
    }
    
    // Use the actual live price for the specific pair
    const pairState = engineRef.current.getState(active.pair);
    if (pairState) {
      setLivePrice(pairState.mtf.price);
    }
  }, [active, engineState]);

  // Alert System
  useEffect(() => {
    if (!livePrice || !active || alerts.length === 0) return;

    const triggered = alerts.filter(a => !a.triggered && Math.abs(livePrice - a.level) < (livePrice * 0.0001));
    if (triggered.length > 0) {
      triggered.forEach(a => {
        // In a real app we'd use browser notifications, here we just mark as triggered
        console.log(`ALERT TRIGGERED: ${a.type} at ${a.level}`);
      });
      setAlerts(prev => prev.map(a => triggered.some(t => t.id === a.id) ? { ...a, triggered: true } : a));
    }
  }, [livePrice, alerts, active]);

  const addAlert = (type: string, level: number) => {
    setAlerts(prev => [...prev, { id: Math.random().toString(36).substr(2, 9), type, level, triggered: false }]);
  };

  const actSignal = async (id: string, action: 'TAKEN' | 'SKIPPED') => {
    if (action === 'TAKEN' && active) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('trades').insert({
          user_id: user.id,
          pair: active.pair,
          direction: active.direction,
          session: active.session,
          entry: active.entry_price,
          status: 'OPEN',
          profit: 0,
          outcome: 'BE',
          rules_followed: 'yes',
          htf: 'Confirmed'
        });
      }
    }
    await supabase.from('signals').update({ status: action }).eq('id', id);
    onSignalUpdate();
  };

  const pnl = active && livePrice && active.entry_price ? (
    active.direction === 'LONG' 
      ? livePrice - parseFloat(active.entry_price)
      : parseFloat(active.entry_price) - livePrice
  ) : 0;

  return (
    <div className="flex flex-col gap-10 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[48px] font-black tracking-tighter text-text leading-none uppercase">HIZZYX <span className="text-red">OS</span></h1>
            <div className="flex items-center gap-2 px-3 py-1 bg-red/10 border border-red/40 rounded-sm shadow-[0_0_15px_rgba(255,61,61,0.1)]">
              <div className={cn("w-2 h-2 rounded-full shadow-lg", sessionInfo.color === 'text-lime' ? 'bg-lime shadow-lime/20 animate-pulse' : 'bg-muted')}></div>
              <span className="font-mono text-[10px] text-red font-black tracking-[0.2em] uppercase">{sessionInfo.name} | {engineState?.symbol || 'AWAITING'}</span>
            </div>
          </div>
          <p className="text-[13px] text-sub font-mono tracking-[0.3em] uppercase border-l-4 border-red pl-6 py-2 bg-s1/30">Neural {engineMode.toUpperCase()} Confluence Engine</p>
        </div>

        <div className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {['GBPJPY', 'BTCUSD', 'EURUSD', 'XAUUSD'].map((s) => {
            const sState = engineRef.current?.getState(s as TradingPair);
            const isActive = engineState?.symbol === s;
            const lastScan = engineRef.current?.getLastScanTime(s as TradingPair) || 0;
            const isScanning = Date.now() - lastScan < 5000;

            return (
              <button 
                key={s}
                onClick={() => engineRef.current?.setSymbol(s as TradingPair)}
                className={cn(
                  "p-5 border rounded-sm transition-all flex flex-col gap-3 text-left group relative overflow-hidden shadow-xl",
                  isActive ? "bg-red/5 border-red shadow-[0_0_30px_rgba(255,61,61,0.15)]" : "bg-s1 border-border2 hover:border-sub"
                )}
              >
                {isScanning && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-red animate-[scanLine_2s_linear_infinite]"></div>
                )}
                <div className="flex items-center justify-between">
                  <span className={cn("font-mono text-[12px] font-black tracking-widest uppercase", isActive ? "text-red" : "text-sub")}>{s}</span>
                  <div className={cn("w-2.5 h-2.5 rounded-full shadow-lg", sState?.htf?.trend === Trend.BULL ? "bg-lime shadow-lime/20" : "bg-red shadow-red/20")}></div>
                </div>
                <div className="flex items-end justify-between mt-3">
                  <span className="font-display text-[22px] font-black tracking-tighter text-text">
                    {sState?.mtf?.price !== undefined ? `$${sState.mtf.price.toFixed(s.includes('USD') && !s.includes('BTC') ? 4 : 1)}` : '—'}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className={cn("font-mono text-[11px] font-black", (sState?.mlConfidence || 0) > 70 ? "text-lime" : "text-red")}>
                      {sState?.mlConfidence || 0}%
                    </span>
                    <span className="font-mono text-[8px] text-muted/60 uppercase tracking-widest font-bold">Neural</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8 space-y-10">
          {active ? (
            <div className="bg-s1 border border-border2 rounded-sm p-10 relative shadow-2xl overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-red/50"></div>
              <div className="flex flex-col md:flex-row justify-between gap-10 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-6 mb-8">
                    <div className="flex flex-col">
                      <span className="font-mono text-[11px] text-muted uppercase tracking-[0.3em] mb-2 font-bold">Active Asset</span>
                      <h2 className="font-display text-[48px] font-black text-text leading-none tracking-tighter uppercase">{active.pair}</h2>
                    </div>
                    <div className={cn(
                      "mt-6 px-6 py-3 font-mono text-[14px] font-black tracking-[0.4em] rounded-sm border shadow-2xl uppercase",
                      active.direction === 'LONG' ? "bg-lime/10 text-lime border-lime/40" : "bg-red/10 text-red border-red/40"
                    )}>
                      {active.direction}
                    </div>
                  </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-10">
                      {[
                        { label: 'Entry', val: active.entry_price, color: 'text-text', type: 'ENTRY' },
                        { label: 'Current', val: livePrice, color: pnl >= 0 ? 'text-lime' : 'text-red', type: 'CURRENT' },
                        { label: 'Stop Loss', val: active.stop_loss, color: 'text-red/80', type: 'SL' },
                        { label: 'Take Profit', val: active.take_profit, color: 'text-lime/80', type: 'TP' }
                      ].map((item, i) => (
                        <div key={i} className="bg-black border border-border2 p-5 rounded-sm shadow-inner relative group">
                          <span className="font-mono text-[9px] text-muted uppercase tracking-widest block mb-3 font-bold">{item.label}</span>
                          <span className={cn("font-mono text-[20px] font-black tracking-tighter", item.color)}>
                            {typeof item.val === 'number' ? item.val.toLocaleString(undefined, { minimumFractionDigits: active.pair.includes('JPY') ? 3 : 2 }) : item.val || '—'}
                          </span>
                          {item.type !== 'CURRENT' && item.val && (
                            <button 
                              onClick={() => addAlert(item.type, parseFloat(item.val as string))}
                              className={cn(
                                "absolute top-2 right-2 p-1 rounded-full transition-all opacity-0 group-hover:opacity-100",
                                alerts.some(a => a.type === item.type && !a.triggered) ? "text-red animate-pulse" : "text-muted hover:text-red"
                              )}
                              title="Set Price Alert"
                            >
                              <Zap size={12} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-4 mb-10">
                      {[
                        { label: 'HTF Trend', active: true, desc: 'Trend Alignment' },
                        { label: 'Liq Sweep', active: active.reasoning?.includes('Sweep') || true, desc: 'Liquidity Grab' },
                        { label: 'FVG Fill', active: active.reasoning?.includes('FVG') || true, desc: 'Imbalance Fill' },
                        { label: 'LTF CHoCH', active: true, desc: 'Structure Shift' }
                      ].map((c, i) => (
                        <div key={i} className={cn(
                          "group/conf flex items-center gap-3 px-4 py-2 rounded-sm border font-mono text-[10px] font-black tracking-widest uppercase transition-all shadow-sm",
                          c.active ? "bg-lime/5 border-lime/40 text-lime" : "bg-white/5 border-border2 text-muted"
                        )}>
                          <div className={cn("w-1.5 h-1.5 rounded-full", c.active ? "bg-lime animate-pulse shadow-[0_0_8px_rgba(163,230,53,0.5)]" : "bg-muted")}></div>
                          <span>{c.label}</span>
                          <span className="hidden group-hover/conf:inline text-[8px] opacity-50 ml-2 font-mono">— {c.desc}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-black border border-border2 p-6 rounded-sm shadow-inner">
                      <div className="flex items-center gap-3 mb-4">
                        <Search size={14} className="text-red" />
                        <span className="font-mono text-[10px] text-sub uppercase tracking-[0.3em] font-bold">Technical Confluence</span>
                      </div>
                      <p className="font-mono text-[13px] text-sub leading-relaxed italic uppercase tracking-wider">
                        {active.reasoning || "Analyzing market structure for optimal entry confirmation..."}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-[300px] flex flex-col gap-6">
                    <div className="p-8 bg-black border border-border2 rounded-sm shadow-xl">
                      <div className="flex items-center justify-between mb-8">
                        <span className="font-mono text-[11px] text-sub uppercase tracking-widest font-bold">Position Calc</span>
                        <Zap size={16} className="text-gold" />
                      </div>
                      <div className="space-y-6 mb-8">
                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-[9px] text-muted uppercase font-bold tracking-widest">Balance</label>
                          <input 
                            type="number" 
                            value={balance} 
                            onChange={e => setBalance(e.target.value)}
                            className="w-full bg-s1 border border-border2 text-text p-3 font-mono text-[13px] rounded-sm outline-none focus:border-red transition-all shadow-inner"
                          />
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="font-mono text-[9px] text-muted uppercase font-bold tracking-widest">Risk %</label>
                          <input 
                            type="number" 
                            value={riskPct} 
                            onChange={e => setRiskPct(e.target.value)}
                            className="w-full bg-s1 border border-border2 text-text p-3 font-mono text-[13px] rounded-sm outline-none focus:border-red transition-all shadow-inner"
                          />
                        </div>
                      </div>
                      <div className="pt-6 border-t border-border2 flex items-center justify-between">
                        <span className="font-mono text-[12px] text-sub uppercase font-bold">Lots</span>
                        <span className="font-mono text-[28px] font-black text-red tracking-tighter">{calculateLotSize()}</span>
                      </div>
                      </div>
                      <div className="p-8 bg-black border border-border2 rounded-sm relative overflow-hidden group/audit shadow-xl">
                      <div className="absolute top-0 right-0 w-40 h-40 bg-red/5 blur-3xl -mr-20 -mt-20 transition-all group-hover/audit:bg-red/10"></div>
                      <div className="flex items-center justify-between mb-8">
                        <span className="font-mono text-[11px] text-sub uppercase tracking-widest font-bold">Neural Confidence</span>
                        <Globe size={16} className="text-red animate-spin-slow" />
                      </div>
                      
                      <div className="flex flex-col items-center gap-6 mb-8">
                        <div className="relative w-40 h-40 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="80" cy="80" r="74" fill="none" stroke="currentColor" strokeWidth="1" className="text-border2/30" />
                            <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="4" className="text-border2" />
                            <circle 
                              cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="8" 
                              strokeDasharray={427}
                              strokeDashoffset={427 - (427 * (engineState?.mlConfidence || 0)) / 100}
                              strokeLinecap="round"
                              className={cn("transition-all duration-1000", (engineState?.mlConfidence || 0) > 70 ? "text-lime shadow-[0_0_20px_rgba(163,230,53,0.4)]" : "text-red shadow-[0_0_20px_rgba(255,61,61,0.4)]")}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-display text-[32px] font-black leading-none tracking-tighter">{engineState?.mlConfidence || 0}%</span>
                            <span className="font-mono text-[10px] text-muted uppercase mt-2 tracking-widest font-bold">Probability</span>
                          </div>
                        </div>
                      </div>

                      {!auditResult ? (
                        <button 
                          onClick={handleAudit}
                          disabled={auditing}
                          className="w-full py-4 bg-s2 border border-border2 text-sub font-mono text-[11px] font-black tracking-[0.3em] uppercase rounded-sm hover:border-red hover:text-red transition-all flex items-center justify-center gap-3 shadow-lg"
                        >
                          {auditing ? (
                            <>
                              <div className="w-4 h-4 border-2 border-red/30 border-t-red rounded-full animate-spin"></div>
                              <span>Auditing...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit size={16} />
                              <span>Neural Audit</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-6 animate-[fadeUp_0.3s_ease_out]">
                          <div className={cn(
                            "font-mono text-[14px] font-black px-4 py-3 rounded-sm text-center border shadow-2xl uppercase tracking-widest",
                            auditResult.includes('HIGH QUALITY') ? 'bg-lime/10 text-lime border-lime/40 shadow-lime/5' : 
                            auditResult.includes('AVOID') ? 'bg-red/10 text-red border-red/40 shadow-red/5' : 'bg-gold/10 text-gold border-gold/40 shadow-gold/5'
                          )}>
                            {auditResult.split('\n')[0]}
                          </div>
                          <div className="bg-s1/50 p-5 rounded-sm border border-border2 shadow-inner">
                            <p className="font-mono text-[12px] text-sub leading-relaxed italic uppercase tracking-wider">
                              {auditResult.split('\n').slice(2).join(' ')}
                            </p>
                          </div>
                          <button onClick={() => setAuditResult(null)} className="w-full py-3 text-[11px] text-muted font-mono uppercase font-bold tracking-widest hover:text-red transition-colors border border-transparent hover:border-red/30 rounded-sm">Reset Audit</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex gap-6 relative z-10">
                  <button 
                    className="flex-1 py-5 bg-lime text-black font-mono text-[15px] font-black tracking-[0.4em] uppercase rounded-sm transition-all hover:scale-[1.01] active:scale-[0.98] shadow-2xl"
                    onClick={() => actSignal(active.id, 'TAKEN')}
                  >
                    Execute Command
                  </button>
                  <button 
                    className="px-12 py-5 bg-transparent border border-border2 text-sub font-mono text-[15px] font-black tracking-[0.4em] uppercase rounded-sm transition-all hover:border-red hover:text-red shadow-lg"
                    onClick={() => actSignal(active.id, 'SKIPPED')}
                  >
                    Discard
                  </button>
                </div>
              </div>
          ) : (
            <div className="border border-border2 border-dashed rounded-sm p-32 text-center bg-s1/30 relative overflow-hidden shadow-inner">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none">
                <div className="grid grid-cols-12 h-full w-full">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-text"></div>
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                <div className="relative inline-block mb-10">
                  <Radio size={72} className="text-muted/30 animate-pulse" />
                  <div className="absolute inset-0 bg-red/10 blur-[80px] rounded-full"></div>
                </div>
                <h2 className="font-display text-[32px] text-sub font-black tracking-[0.2em] mb-6 uppercase">Scanning Markets</h2>
                <p className="font-mono text-[12px] text-muted max-w-sm mx-auto leading-relaxed uppercase tracking-[0.3em] font-medium">
                  Monitoring global pairs for high-probability trade setups based on current engine mode.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="flex items-center justify-between px-4">
              <span className="font-mono text-[11px] text-muted uppercase tracking-[0.4em] font-black">Signal History Log</span>
              <div className="h-[1px] flex-1 bg-border2 ml-6"></div>
            </div>

            <div className="space-y-3">
              {signals.map(s => (
                <div key={s.id} className="group bg-s1 border border-border2 rounded-sm p-5 px-6 sm:px-8 flex flex-col sm:grid sm:grid-cols-[100px_120px_1fr_auto] gap-4 sm:gap-8 items-start sm:items-center hover:bg-s2 transition-all shadow-md hover:shadow-xl">
                  <span className={cn(
                    "font-mono text-[10px] font-black px-3 py-1 rounded-sm tracking-[0.2em] text-center border uppercase w-full sm:w-auto",
                    s.status === 'TAKEN' ? "text-lime border-lime/30 bg-lime/5" : s.status === 'SKIPPED' ? "text-muted border-border2 bg-white/5" : "text-red border-red/30 bg-red/5"
                  )}>
                    {s.status === 'active' ? 'LIVE' : s.status}
                  </span>
                  <div className="flex flex-row sm:flex-col items-center sm:items-start gap-3 sm:gap-0">
                    <span className="font-mono text-[15px] font-black text-text tracking-tight">{s.pair}</span>
                    <span className={cn("font-mono text-[9px] font-black tracking-[0.3em] uppercase", s.direction === 'LONG' ? "text-lime" : "text-red")}>
                      {s.direction}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-sub truncate w-full sm:pr-12 opacity-70 group-hover:opacity-100 transition-opacity uppercase tracking-wider italic">
                    {s.reasoning || 'No technical reasoning provided.'}
                  </span>
                  <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                    <span className="font-mono text-[11px] text-text font-bold">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono text-[8px] text-muted uppercase tracking-widest font-bold">{s.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <div className="bg-s1 border border-border2 rounded-sm p-8 shadow-xl">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Clock size={18} className="text-red" />
                <span className="font-mono text-[12px] font-black text-text uppercase tracking-[0.2em]">Market Vitals</span>
              </div>
            </div>

            <div className="space-y-6">
              {[
                { 
                  label: 'Neural Confidence', 
                  val: `${engineState?.mlConfidence || 0}%`, 
                  color: (engineState?.mlConfidence || 0) > 70 ? 'text-lime' : 'text-text',
                  trend: prevState && engineState && engineState.mlConfidence !== prevState.mlConfidence 
                    ? (engineState.mlConfidence > prevState.mlConfidence ? 'up' : 'down') 
                    : null,
                  sparklineData: vitalsHistory.confidence,
                  sparklineColor: (engineState?.mlConfidence || 0) > 70 ? 'text-lime' : 'text-red'
                },
                { 
                  label: 'Volatility (ATR)', 
                  val: engineState?.atr !== undefined ? engineState.atr.toFixed(4) : '—',
                  trend: prevState && engineState && Math.abs(engineState.atr - prevState.atr) > 0.0001
                    ? (engineState.atr > prevState.atr ? 'up' : 'down')
                    : null,
                  sparklineData: vitalsHistory.atr,
                  sparklineColor: (engineState?.atr || 0) > 0.005 ? 'text-red' : 'text-lime'
                },
                { 
                  label: 'Active S/D Zones', 
                  val: engineRef.current?.getZones(engineState?.symbol as any).slice(-2).map((z: any) => `${z.type === 'DEMAND' ? 'Demand' : 'Supply'}: ${z.high !== undefined ? z.high.toFixed(engineState?.symbol?.includes('JPY') ? 3 : 5) : '—'}`).join(' | ') || 'None',
                  trend: prevState && engineState && engineState.mtf.activeZones !== prevState.mtf.activeZones
                    ? (engineState.mtf.activeZones > prevState.mtf.activeZones ? 'up' : 'down')
                    : null,
                  sparklineData: vitalsHistory.zones,
                  sparklineColor: 'text-blue-400'
                },
                { 
                  label: `${engineMode === TradeMode.SWING ? '1D' : engineMode === TradeMode.DAY ? '4H' : '15M'} Trend`, 
                  val: engineState?.htf.trend, 
                  color: engineState?.htf.trend === Trend.BULL ? 'text-lime' : 'text-red',
                  trend: prevState && engineState && engineState.htf.trend !== prevState.htf.trend
                    ? (engineState.htf.trend === Trend.BULL ? 'up' : 'down')
                    : null
                },
                { 
                  label: `${engineMode === TradeMode.SWING ? '4H' : engineMode === TradeMode.DAY ? '15M' : '5M'} Trend`, 
                  val: engineState?.mtf.trend, 
                  color: engineState?.mtf.trend === Trend.BULL ? 'text-lime' : 'text-red',
                  trend: prevState && engineState && engineState.mtf.trend !== prevState.mtf.trend
                    ? (engineState.mtf.trend === Trend.BULL ? 'up' : 'down')
                    : null
                }
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border2/50 last:border-0">
                  <span className="font-mono text-[10px] text-muted uppercase tracking-widest font-bold">{v.label}</span>
                  <div className="flex items-center gap-3">
                    {v.sparklineData && <Sparkline data={v.sparklineData} colorClass={v.sparklineColor || 'text-muted'} />}
                    <div className="flex items-center gap-2 w-20 justify-end">
                      <span className={cn("font-mono text-[12px] font-black", v.color || "text-text")}>{v.val}</span>
                      {v.trend === 'up' && <ArrowUpRight size={14} className="text-lime" />}
                      {v.trend === 'down' && <ArrowDownRight size={14} className="text-red" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-black border border-border2 rounded-sm shadow-inner">
              <div className="flex items-center justify-between mb-6">
                <span className="font-mono text-[9px] text-muted uppercase tracking-[0.3em] font-bold">Scanner Load</span>
                <div className="flex gap-1.5">
                  {['BTC', 'ETH', 'XAU', 'GBP', 'EUR'].map(s => (
                    <div key={s} className={cn("w-1.5 h-4 rounded-full shadow-sm", engineState?.symbol?.includes(s) ? 'bg-red shadow-red/20' : 'bg-border2')}></div>
                  ))}
                </div>
              </div>
              <button 
                onClick={onReSync}
                disabled={isSyncing}
                className="w-full py-3.5 bg-red text-black font-mono text-[11px] font-black tracking-[0.3em] uppercase rounded-sm hover:bg-white transition-all disabled:opacity-50 shadow-lg"
              >
                {isSyncing ? 'Syncing...' : 'Re-Sync Engine'}
              </button>
            </div>
          </div>

          <div className="bg-s1 border border-border2 rounded-sm p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8">
              <Zap size={18} className="text-gold" />
              <span className="font-mono text-[12px] font-black text-text uppercase tracking-[0.2em]">System Rules</span>
            </div>
            <div className="space-y-4">
              {rules.slice(0, 5).map((rule, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-s2/20 border border-border/30 rounded-sm">
                  <span className="font-mono text-[9px] text-muted mt-0.5">{idx + 1}</span>
                  <span className="font-mono text-[10px] text-sub leading-relaxed">{rule.rule_text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalyticsPage({ trades }: { trades: Trade[] }) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);

  const pairStats = useMemo(() => {
    const pp: Record<string, { wins: number; losses: number; be: number; total: number }> = {};
    trades.forEach(t => {
      if (!pp[t.pair]) pp[t.pair] = { wins: 0, losses: 0, be: 0, total: 0 };
      pp[t.pair].total++;
      if (t.outcome === 'WIN') pp[t.pair].wins++;
      else if (t.outcome === 'LOSS') pp[t.pair].losses++;
      else pp[t.pair].be++;
    });
    return Object.entries(pp).sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total));
  }, [trades]);

  const runAnalysis = async () => {
    setLoading(true);
    const sum = trades.map(t => `${t.pair} ${t.direction}|${t.outcome}|Rules:${t.rules_followed}|Emos:${(t.emotions || []).join(',') || 'none'}|Session:${t.session || '—'}`).join('\n');
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: `Analyze ${trades.length} trades for patterns. 4-6 specific insights on emotional patterns, rule breaches, pair performance, session performance.\n\n${sum}` }] }],
        config: { systemInstruction: SYSTEM_INSTRUCTION }
      });
      setAnalysis(response.text || '');
    } catch (e) {
      setAnalysis('Analysis failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1 className="font-display text-[36px] tracking-wider text-text mb-1">Analytics</h1>
        <p className="text-[12px] text-sub mb-7 font-mono">Pair breakdown & pattern analysis</p>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[9px] text-sub uppercase tracking-[0.25em] whitespace-nowrap">Pair Breakdown</span>
        <div className="flex-1 h-[1px] bg-border"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
        {pairStats.map(([pair, d]) => {
          const wr = Math.round((d.wins / d.total) * 100);
          const bc = wr >= 60 ? 'var(--color-lime)' : wr >= 40 ? 'var(--color-gold)' : 'var(--color-red)';
          return (
            <div key={pair} className="bg-s1 border border-border rounded-sm p-3.5 px-4">
              <div className="font-mono text-[13px] font-bold text-text mb-2">{pair}</div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="text-sub">Trades</span>
                  <span className="text-text">{d.total}</span>
                </div>
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="text-sub">Win Rate</span>
                  <span className="text-text" style={{ color: bc }}>{wr}%</span>
                </div>
                <div className="flex justify-between font-mono text-[9px]">
                  <span className="text-sub">W/L/BE</span>
                  <span className="text-text">{d.wins}/{d.losses}/{d.be}</span>
                </div>
              </div>
              <div className="h-[3px] bg-s3 rounded-full mt-2 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${wr}%`, background: bc }}></div>
              </div>
            </div>
          );
        })}
        {!trades.length && <div className="col-span-full text-center py-12 font-mono text-[10px] text-muted">Log trades to see pair breakdown.</div>}
      </div>

      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[9px] text-sub uppercase tracking-[0.25em] whitespace-nowrap">AI Pattern Analysis</span>
        <div className="flex-1 h-[1px] bg-border"></div>
      </div>

      <div className="bg-s1 border border-border rounded-sm p-5">
        <div className="font-mono text-[11px] text-sub leading-loose whitespace-pre-wrap">
          {analysis || (trades.length >= 5 ? 'Click below to run AI pattern analysis.' : 'Log at least 5 trades to unlock AI pattern analysis.')}
        </div>
        {trades.length >= 5 && (
          <button 
            className="w-full p-3.5 bg-red text-white border-none font-mono text-[11px] font-bold tracking-wider uppercase cursor-pointer rounded-sm mt-4 transition-all hover:bg-[#ff5555] disabled:opacity-40"
            onClick={runAnalysis}
            disabled={loading}
          >
            {loading ? 'Analyzing...' : analysis ? 'Re-run Analysis' : 'Run Pattern Analysis'}
          </button>
        )}
      </div>
    </div>
  );
}

function RulesPage({ customRules, onRulesUpdate }: { customRules: CustomRule[], onRulesUpdate: () => void }) {
  const [newRule, setNewRule] = useState('');
  const [loading, setLoading] = useState(false);

  const defaultRules = [
    { text: "HTF structure first. Always establish direction before looking at entry.", source: "Hunchology" },
    { text: "ZOOM OUT then in — look at the full bias before executing.", source: "Notion — Discussion" },
    { text: "Wait for LTF confirmation — IDM, BOS, CHoCH — before pulling the trigger.", source: "Hunchology" },
    { text: "Be simple. Find bias, reasoning, and execution level. That's it.", source: "Hunchology" },
    { text: "ALWAYS stick to the plan — never remove SL or move TP.", source: "Notion — Discussion" },
    { text: "Avoid overtrading. One quality setup beats five mediocre ones.", source: "Notion — Discussion" },
    { text: "Stop spending too much time looking at the charts. Set and forget.", source: "Notion — Discussion" },
    { text: "Small profits pile up long term. Kill greed.", source: "Notion — Discussion" },
    { text: "Detachment is the edge. Not caring about the trade = trusting your setup.", source: "Hunchology" },
    { text: "No revenge trading. One loss doesn't affect your edge.", source: "Hunchology" }
  ];

  const addRule = async () => {
    if (!newRule.trim()) return;
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('custom_rules').insert({ user_id: user.id, rule_text: newRule.trim() });
      setNewRule('');
      onRulesUpdate();
    }
    setLoading(false);
  };

  const deleteRule = async (id: string) => {
    setLoading(true);
    await supabase.from('custom_rules').delete().eq('id', id);
    onRulesUpdate();
    setLoading(false);
  };

  const allRules = [
    ...defaultRules.map(r => ({ ...r, id: 'default-' + r.text })), 
    ...customRules.map(r => ({ text: r.rule_text, source: 'Custom', id: r.id }))
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1 className="font-display text-[36px] tracking-wider text-text mb-1">Trading Framework</h1>
        <p className="text-[12px] text-sub mb-7 font-mono">Your step-by-step flowchart and rules for execution</p>
      </div>

      <div className="flex flex-col items-center max-w-[640px] w-full relative py-4 mx-auto">
        {allRules.map((r, i) => (
          <div key={r.id} className="flex flex-col items-center w-full group">
            <div className="relative w-full bg-s1 border border-border rounded-md p-5 pt-6 transition-all hover:border-red/50 hover:shadow-[0_0_15px_rgba(255,68,68,0.1)] z-10">
              <div className="absolute left-1/2 -top-3 -translate-x-1/2 w-6 h-6 bg-red text-white rounded-full flex items-center justify-center font-mono text-[10px] font-bold border-2 border-bg">
                {i + 1}
              </div>
              
              {r.source === 'Custom' && (
                <button 
                  onClick={() => deleteRule(r.id)}
                  className="absolute top-3 right-3 text-sub hover:text-red opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Delete Step"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              )}

              <div className="text-[13px] leading-relaxed text-text font-medium text-center">{r.text}</div>
              <div className="font-mono text-[9px] text-muted mt-2 tracking-widest uppercase text-center">{r.source}</div>
            </div>

            {i < allRules.length - 1 && (
              <div className="h-8 w-[2px] bg-border my-1 relative">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 border-b-2 border-r-2 border-border rotate-45"></div>
              </div>
            )}
          </div>
        ))}

        <div className="h-8 w-[2px] bg-border my-1 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-2 h-2 border-b-2 border-r-2 border-border rotate-45"></div>
        </div>

        <div className="w-full bg-s2 border border-dashed border-border rounded-md p-4 flex flex-col gap-3 z-10 mt-2">
          <div className="font-mono text-[10px] text-sub uppercase tracking-widest text-center">Add Framework Step</div>
          <div className="flex gap-2.5">
            <input 
              type="text" 
              value={newRule}
              onChange={e => setNewRule(e.target.value)}
              className="flex-1 bg-bg border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors"
              placeholder="e.g. Check 15m timeframe for CHoCH..."
              onKeyDown={e => e.key === 'Enter' && addRule()}
            />
            <button 
              className="px-4 py-2.5 bg-red text-white border-none font-mono text-[10px] font-bold tracking-wider rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#ff5555] disabled:opacity-40"
              onClick={addRule}
              disabled={loading}
            >
              + Add Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
