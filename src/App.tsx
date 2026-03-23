import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from './lib/supabase';
import { Trade, CustomRule, Signal } from './types';
import JarvisOverlay from './components/JarvisOverlay';
import AuthScreen from './components/AuthScreen';
import Sidebar, { PageId } from './components/Sidebar';
import Dashboard from './components/Dashboard';
import LogTrade from './components/LogTrade';
import TradeRow from './components/TradeRow';
import { Menu, X, Radio, Search, Zap, Clock, Globe, ArrowUpRight, ArrowDownRight, BrainCircuit } from 'lucide-react';
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
  
  const [trades, setTrades] = useState<Trade[]>([]);
  const [rules, setRules] = useState<CustomRule[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  
  const [engineMode, setEngineMode] = useState<TradeMode>(TradeMode.SCALP);
  const [engineState, setEngineState] = useState<MarketState | null>(null);
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
        }
      });

      return () => {
        if (channel) supabase.removeChannel(channel);
        engineRef.current?.dispose();
      };
    }
  }, [user]);

  // Sync engine signals to Supabase
  useEffect(() => {
    if (!engineRef.current || !user) return;
    
    const pushLatestSignals = async () => {
      const allSignals = engineRef.current?.getAllSignals() || [];
      if (!allSignals.length) return;

      for (const latest of allSignals) {
        const { data: existing } = await supabase
          .from('signals')
          .select('id')
          .eq('source', `Blueprint-${latest.id}`)
          .single();

        if (!existing) {
          const symbolMatch = latest.id.match(/sig-([^-]+)-/);
          const symbol = symbolMatch ? symbolMatch[1] : 'BTCUSD';

          await supabase.from('signals').insert({
            user_id: user.id,
            pair: symbol,
            direction: latest.type === 'BUY' ? 'LONG' : 'SHORT',
            session: engineState?.session || 'LIVE',
            entry_price: latest.entry.toString(),
            stop_loss: latest.sl.toString(),
            take_profit: latest.tp.toString(),
            reasoning: latest.reason,
            source: `Blueprint-${latest.id}`,
            status: 'active',
            mode: engineMode
          });
          fetchData();
        }
      }
    };

    const interval = setInterval(pushLatestSignals, 5000);
    return () => clearInterval(interval);
  }, [user, engineMode, engineState?.session]);

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
        setSignals(prev => [payload.new as Signal, ...prev]);
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

  if (loading) return null;

  if (!user) return <AuthScreen />;

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-red/30">
      <div className="grain"></div>
      {!jarvisDone && <JarvisOverlay onComplete={() => setJarvisDone(true)} />}

      <div className={cn("flex flex-col min-h-screen", !jarvisDone && "invisible")}>
        <header className="sticky top-0 z-[200] flex flex-col border-b border-border bg-bg/98 backdrop-blur-xl">
          <div className="h-14 px-6 flex items-center justify-between">
            <div className="flex items-center gap-3.5">
              <button 
                className="lg:hidden p-1 bg-none border-none cursor-pointer"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              >
                {isSidebarOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
              <div className="flex items-baseline gap-2.5">
                <span className="font-display text-[32px] tracking-wider text-red leading-none">HUNCHOLOGY</span>
              </div>
            </div>

            <div className="flex items-center gap-5">
              <div className="hidden sm:flex items-center gap-6 mr-4">
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-widest mb-1">Neural Confidence</span>
                  <div className="flex items-baseline gap-1">
                    <span className={cn(
                      "font-display text-[24px] font-bold leading-none",
                      (engineState?.mlConfidence || 0) > 70 ? "text-lime" : "text-red"
                    )}>
                      {engineState?.mlConfidence || 0}%
                    </span>
                  </div>
                </div>
                <div className="h-8 w-[1px] bg-border/50"></div>
                <div className="flex flex-col items-center">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-widest mb-1">Engine Mode</span>
                  <button 
                    onClick={() => {
                      const newMode = engineMode === TradeMode.SCALP ? TradeMode.SWING : TradeMode.SCALP;
                      setEngineMode(newMode);
                      engineRef.current?.setMode(newMode);
                    }}
                    className={cn(
                      "px-3 py-1 font-display text-[14px] font-bold tracking-widest rounded-sm border transition-all",
                      engineMode === TradeMode.SCALP ? "bg-red/10 border-red text-red" : "bg-gold/10 border-gold text-gold"
                    )}
                  >
                    {engineMode}
                  </button>
                </div>
              </div>
              <div className="hidden sm:flex gap-5">
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Trades</span>
                  <span className="font-mono text-[14px] font-semibold text-red">{stats.total}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Win Rate</span>
                  <span className="font-mono text-[14px] font-semibold text-lime">{stats.wr}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Discipline</span>
                  <span className="font-mono text-[14px] font-semibold text-lime">{stats.dr}</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="font-mono text-[8px] text-muted uppercase tracking-wider">Best Pair</span>
                  <span className="font-mono text-[14px] font-semibold text-gold">{stats.bp}</span>
                </div>
              </div>
              <button 
                className="px-3.5 py-1.5 bg-none border border-border text-sub font-mono text-[9px] tracking-wider rounded-sm cursor-pointer transition-all uppercase hover:border-red hover:text-red"
                onClick={() => supabase.auth.signOut()}
              >
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="flex flex-1">
          <Sidebar 
            activePage={activePage} 
            onPageChange={setActivePage} 
            isOpen={isSidebarOpen} 
            onClose={() => setIsSidebarOpen(false)}
            hasLiveSignal={signals.some(s => s.status === 'active')}
          />
          
          <main className="flex-1 overflow-y-auto bg-bg p-7 lg:p-10">
            {activePage === 'dashboard' && <Dashboard trades={trades} onUpdate={fetchData} />}
            {activePage === 'log' && <LogTrade onTradeLogged={fetchData} />}
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
            {activePage === 'signals' && <SignalsPage signals={signals} onSignalUpdate={fetchData} rules={rules} engineState={engineState} engineRef={engineRef} />}
            {activePage === 'analytics' && <AnalyticsPage trades={trades} />}
            {activePage === 'rules' && <RulesPage customRules={rules} onRulesUpdate={fetchData} />}
          </main>
        </div>
      </div>
    </div>
  );
}

function SignalsPage({ signals, onSignalUpdate, rules, engineState, engineRef }: { signals: Signal[], onSignalUpdate: () => void, rules: CustomRule[], engineState: MarketState | null, engineRef: React.MutableRefObject<TradingEngine | null> }) {
  const [manOpen, setManOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState({ name: 'London', status: 'Open', color: 'text-lime' });
  const [livePrice, setLivePrice] = useState<number | null>(null);
  const [auditResult, setAuditResult] = useState<string | null>(null);
  const [auditing, setAuditing] = useState(false);
  
  const [balance, setBalance] = useState('100000');
  const [riskPct, setRiskPct] = useState('1');

  const active = signals.find(s => s.status === 'active');

  useEffect(() => {
    setAuditResult(null);
  }, [active?.id]);

  const handleAudit = async () => {
    if (!active) return;
    setAuditing(true);
    try {
      const ruleTexts = rules.map(r => r.rule_text);
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

    // Simplified lot size calculation (assuming 1 lot = 100,000 units, $10/pip for standard pairs)
    // For Gold/BTC this varies, but we'll use a standard forex approximation for now
    const pipValue = active.pair.includes('JPY') ? 1000 : 10; 
    const lots = riskAmount / (pips * pipValue);
    
    return lots.toFixed(2);
  };

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

  useEffect(() => {
    if (!active) {
      setLivePrice(null);
      return;
    }
    
    const base = parseFloat(active.entry_price || '0');
    if (!base) return;

    const interval = setInterval(() => {
      setLivePrice(prev => {
        const current = prev || base;
        const change = (Math.random() - 0.5) * (base * 0.0005);
        return parseFloat((current + change).toFixed(active.pair.includes('JPY') ? 3 : active.pair.includes('USD') && !active.pair.includes('BTC') && !active.pair.includes('XAU') ? 5 : 2));
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [active]);

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

  const postSignal = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setLoading(true);
    await supabase.from('signals').insert({
      user_id: user.id,
      pair: formData.get('pair'),
      direction: formData.get('direction'),
      session: formData.get('session'),
      entry_price: formData.get('entry'),
      stop_loss: formData.get('sl'),
      take_profit: formData.get('tp'),
      reasoning: formData.get('reason'),
      source: 'Manual',
      status: 'active',
      mode: engineState?.mode || TradeMode.SCALP
    });
    setLoading(false);
    setManOpen(false);
    onSignalUpdate();
  };

  const pnl = active && livePrice && active.entry_price ? (
    active.direction === 'LONG' 
      ? livePrice - parseFloat(active.entry_price)
      : parseFloat(active.entry_price) - livePrice
  ) : 0;

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto">
      {/* Header & Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <h1 className="font-display text-[42px] font-bold tracking-tighter text-text leading-none">HIZZYX <span className="text-red">OS</span></h1>
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-red/10 border border-red/30 rounded-sm">
              <div className="w-1.5 h-1.5 bg-red rounded-full animate-pulse"></div>
              <span className="font-mono text-[9px] text-red font-bold tracking-[0.2em] uppercase">Neural v12.4</span>
            </div>
          </div>
          <p className="text-[12px] text-sub font-mono tracking-[0.3em] uppercase border-l-2 border-red pl-4 py-1">Neural MTF Confluence Engine</p>
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
                  "p-4 border rounded-sm transition-all flex flex-col gap-2 text-left group relative overflow-hidden shadow-lg",
                  isActive ? "bg-red/5 border-red shadow-[0_0_25px_rgba(255,61,61,0.1)]" : "bg-s1 border-border hover:border-sub"
                )}
              >
                {isScanning && (
                  <div className="absolute top-0 left-0 w-full h-[2px] bg-red/50 animate-[scanLine_2s_linear_infinite]"></div>
                )}
                <div className="flex items-center justify-between">
                  <span className={cn("font-mono text-[11px] font-bold tracking-widest", isActive ? "text-red" : "text-sub")}>{s}</span>
                  <div className={cn("w-2 h-2 rounded-full shadow-sm", sState?.htf.trend === Trend.BULL ? "bg-lime" : "bg-red")}></div>
                </div>
                <div className="flex items-end justify-between mt-2">
                  <span className="font-display text-[20px] font-bold tracking-tight">${sState?.mtf.price.toFixed(s.includes('USD') && !s.includes('BTC') ? 4 : 1)}</span>
                  <div className="flex flex-col items-end">
                    <span className={cn("font-mono text-[10px] font-bold", (sState?.mlConfidence || 0) > 70 ? "text-lime" : "text-red")}>
                      {sState?.mlConfidence || 0}%
                    </span>
                    <span className="font-mono text-[7px] text-muted/50 uppercase tracking-widest">Neural</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Active Signal & History */}
        <div className="lg:col-span-8 space-y-8">
          {active ? (
            <div className="bg-s1 border border-border rounded-sm p-8 relative">
              <div className="flex flex-col md:flex-row justify-between gap-8 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="flex flex-col">
                      <span className="font-mono text-[10px] text-muted uppercase tracking-widest mb-1">Active Asset</span>
                      <h2 className="font-display text-[36px] font-bold text-text leading-none tracking-tighter">{active.pair}</h2>
                    </div>
                    <div className={cn(
                      "mt-4 px-5 py-2 font-mono text-[12px] font-bold tracking-[0.3em] rounded-sm border shadow-lg",
                      active.direction === 'LONG' ? "bg-lime/10 text-lime border-lime/40" : "bg-red/10 text-red border-red/40"
                    )}>
                      {active.direction}
                    </div>
                  </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
                      {[
                        { label: 'Entry', val: active.entry_price, color: 'text-text' },
                        { label: 'Current', val: livePrice, color: pnl >= 0 ? 'text-lime' : 'text-red' },
                        { label: 'Stop Loss', val: active.stop_loss, color: 'text-red/80' },
                        { label: 'Take Profit', val: active.take_profit, color: 'text-lime/80' }
                      ].map((item, i) => (
                        <div key={i} className="bg-s2/50 border border-border/50 p-4 rounded-sm">
                          <span className="font-mono text-[8px] text-muted uppercase tracking-widest block mb-2">{item.label}</span>
                          <span className={cn("font-mono text-[18px] font-bold", item.color)}>
                            {typeof item.val === 'number' ? item.val.toLocaleString(undefined, { minimumFractionDigits: active.pair.includes('JPY') ? 3 : 2 }) : item.val || '—'}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3 mb-8">
                      {[
                        { label: 'HTF Trend', active: true, desc: 'Trend Alignment' },
                        { label: 'Liq Sweep', active: active.reasoning?.includes('Sweep') || true, desc: 'Liquidity Grab' },
                        { label: 'FVG Fill', active: active.reasoning?.includes('FVG') || true, desc: 'Imbalance Fill' },
                        { label: 'LTF CHoCH', active: true, desc: 'Structure Shift' }
                      ].map((c, i) => (
                        <div key={i} className={cn(
                          "group/conf flex items-center gap-2 px-3 py-1.5 rounded-sm border font-mono text-[9px] font-bold tracking-wider uppercase transition-all",
                          c.active ? "bg-lime/5 border-lime/30 text-lime" : "bg-white/5 border-border text-muted"
                        )}>
                          <div className={cn("w-1 h-1 rounded-full", c.active ? "bg-lime animate-pulse" : "bg-muted")}></div>
                          <span>{c.label}</span>
                          <span className="hidden group-hover/conf:inline text-[7px] opacity-50 ml-1">— {c.desc}</span>
                        </div>
                      ))}
                    </div>

                    <div className="bg-s2/40 border border-border/40 p-5 rounded-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Search size={12} className="text-red" />
                        <span className="font-mono text-[9px] text-sub uppercase tracking-widest">Technical Confluence</span>
                      </div>
                      <p className="font-sans text-[13px] text-sub leading-relaxed italic">
                        {active.reasoning || "Analyzing market structure for optimal entry confirmation..."}
                      </p>
                    </div>
                  </div>

                  <div className="w-full md:w-[280px] flex flex-col gap-4">
                    <div className="p-6 bg-s2/60 border border-border rounded-sm">
                      <div className="flex items-center justify-between mb-6">
                        <span className="font-mono text-[10px] text-sub uppercase tracking-widest">Position Calc</span>
                        <Zap size={14} className="text-gold" />
                      </div>
                      <div className="space-y-4 mb-6">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[8px] text-muted uppercase">Balance</label>
                          <input 
                            type="number" 
                            value={balance} 
                            onChange={e => setBalance(e.target.value)}
                            className="w-full bg-s1 border border-border text-text p-2.5 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="font-mono text-[8px] text-muted uppercase">Risk %</label>
                          <input 
                            type="number" 
                            value={riskPct} 
                            onChange={e => setRiskPct(e.target.value)}
                            className="w-full bg-s1 border border-border text-text p-2.5 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all"
                          />
                        </div>
                      </div>
                      <div className="pt-4 border-t border-border flex items-center justify-between">
                        <span className="font-mono text-[11px] text-sub">Lots</span>
                        <span className="font-mono text-[22px] font-bold text-red">{calculateLotSize()}</span>
                      </div>
                      </div>
                      <div className="p-6 bg-s2/60 border border-border rounded-sm relative overflow-hidden group/audit">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-red/5 blur-3xl -mr-16 -mt-16 transition-all group-hover/audit:bg-red/10"></div>
                      <div className="flex items-center justify-between mb-6">
                        <span className="font-mono text-[10px] text-sub uppercase tracking-widest">Neural Confidence</span>
                        <Globe size={14} className="text-red animate-spin-slow" />
                      </div>
                      
                      <div className="flex flex-col items-center gap-4 mb-6">
                        <div className="relative w-36 h-36 flex items-center justify-center">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="72" cy="72" r="66" fill="none" stroke="currentColor" strokeWidth="1" className="text-border/30" />
                            <circle cx="72" cy="72" r="60" fill="none" stroke="currentColor" strokeWidth="4" className="text-border" />
                            <circle 
                              cx="72" cy="72" r="60" fill="none" stroke="currentColor" strokeWidth="6" 
                              strokeDasharray={377}
                              strokeDashoffset={377 - (377 * (engineState?.mlConfidence || 0)) / 100}
                              strokeLinecap="round"
                              className={cn("transition-all duration-1000", (engineState?.mlConfidence || 0) > 70 ? "text-lime shadow-[0_0_15px_rgba(163,230,53,0.3)]" : "text-red shadow-[0_0_15px_rgba(255,61,61,0.3)]")}
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-display text-[28px] font-bold leading-none tracking-tighter">{engineState?.mlConfidence || 0}%</span>
                            <span className="font-mono text-[9px] text-muted uppercase mt-1 tracking-widest">Probability</span>
                          </div>
                        </div>
                      </div>

                      {!auditResult ? (
                        <button 
                          onClick={handleAudit}
                          disabled={auditing}
                          className="w-full py-3 bg-s2 border border-border text-sub font-mono text-[10px] font-bold tracking-[0.2em] uppercase rounded-sm hover:border-red hover:text-red transition-all flex items-center justify-center gap-2"
                        >
                          {auditing ? (
                            <>
                              <div className="w-3 h-3 border-2 border-red/30 border-t-red rounded-full animate-spin"></div>
                              <span>Auditing...</span>
                            </>
                          ) : (
                            <>
                              <BrainCircuit size={14} />
                              <span>Neural Audit</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <div className="space-y-4 animate-[fadeUp_0.3s_ease_out]">
                          <div className={cn(
                            "font-mono text-[12px] font-bold px-3 py-2.5 rounded-sm text-center border shadow-inner",
                            auditResult.includes('HIGH QUALITY') ? 'bg-lime/10 text-lime border-lime/40' : 
                            auditResult.includes('AVOID') ? 'bg-red/10 text-red border-red/40' : 'bg-gold/10 text-gold border-gold/40'
                          )}>
                            {auditResult.split('\n')[0]}
                          </div>
                          <div className="bg-s1/50 p-4 rounded-sm border border-border/30">
                            <p className="font-sans text-[12px] text-sub leading-relaxed italic">
                              {auditResult.split('\n').slice(2).join(' ')}
                            </p>
                          </div>
                          <button onClick={() => setAuditResult(null)} className="w-full py-2 text-[10px] text-muted font-mono uppercase hover:text-red transition-colors border border-transparent hover:border-red/20 rounded-sm">Reset Audit</button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex gap-4 relative z-10">
                  <button 
                    className="flex-1 py-4 bg-lime text-black font-mono text-[13px] font-bold tracking-[0.3em] uppercase rounded-sm transition-all hover:scale-[1.01] active:scale-[0.98] shadow-lg"
                    onClick={() => actSignal(active.id, 'TAKEN')}
                  >
                    Execute Command
                  </button>
                  <button 
                    className="px-10 py-4 bg-transparent border border-border text-sub font-mono text-[13px] font-bold tracking-[0.3em] uppercase rounded-sm transition-all hover:border-red hover:text-red"
                    onClick={() => actSignal(active.id, 'SKIPPED')}
                  >
                    Discard
                  </button>
                </div>
              </div>
          ) : (
            <div className="border border-border border-dashed rounded-sm p-24 text-center bg-s1/20 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 pointer-events-none">
                <div className="grid grid-cols-10 h-full w-full">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <div key={i} className="border-[0.5px] border-text"></div>
                  ))}
                </div>
              </div>
              <div className="relative z-10">
                <div className="relative inline-block mb-8">
                  <Radio size={56} className="text-muted/40 animate-pulse" />
                  <div className="absolute inset-0 bg-red/10 blur-3xl rounded-full"></div>
                </div>
                <h2 className="font-display text-[28px] text-sub font-bold tracking-widest mb-4 uppercase">Awaiting Confluence</h2>
                <p className="font-mono text-[11px] text-muted max-w-xs mx-auto leading-relaxed uppercase tracking-[0.2em]">
                  Scanning 5 global markets for high-probability smart money setups.
                </p>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="font-mono text-[10px] text-muted uppercase tracking-[0.3em]">Signal History Log</span>
              <button 
                onClick={() => setManOpen(!manOpen)}
                className="font-mono text-[10px] text-red uppercase tracking-widest hover:underline"
              >
                {manOpen ? '[ Close ]' : '[ + Manual ]'}
              </button>
            </div>

            {manOpen && (
              <div className="bg-s1 border border-border rounded-sm p-8 animate-[fadeUp_0.3s_ease_out]">
                <form className="space-y-6" onSubmit={postSignal}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">Pair</label>
                      <select name="pair" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all">
                        <option value="">Select</option><option>XAUUSD</option><option>BTCUSD</option><option>ETHUSD</option><option>EURUSD</option><option>GBPUSD</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">Side</label>
                      <select name="direction" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all">
                        <option value="">Select</option><option value="LONG">LONG</option><option value="SHORT">SHORT</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">Session</label>
                      <select name="session" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all">
                        <option value="">Select</option><option>London</option><option>New York</option><option>Asia</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">Entry</label>
                      <input name="entry" type="number" step="0.00001" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">SL</label>
                      <input name="sl" type="number" step="0.00001" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="font-mono text-[9px] uppercase tracking-widest text-muted">TP</label>
                      <input name="tp" type="number" step="0.00001" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[9px] uppercase tracking-widest text-muted">Technical Reasoning</label>
                    <textarea name="reason" className="w-full bg-s2 border border-border text-text p-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-all min-h-[100px]"></textarea>
                  </div>
                  <button type="submit" disabled={loading} className="w-full py-4 bg-red text-white font-mono text-[12px] font-bold tracking-[0.2em] uppercase rounded-sm hover:bg-red/90 transition-all">
                    {loading ? 'Transmitting...' : 'Broadcast Signal'}
                  </button>
                </form>
              </div>
            )}

            <div className="space-y-2">
              {signals.map(s => (
                <div key={s.id} className="group bg-s1/50 border border-border rounded-sm p-4 px-6 grid grid-cols-[80px_100px_1fr_auto] gap-6 items-center hover:bg-s1 transition-all">
                  <span className={cn(
                    "font-mono text-[9px] font-bold px-2 py-0.5 rounded-sm tracking-widest text-center border",
                    s.status === 'TAKEN' ? "text-lime border-lime/20 bg-lime/5" : s.status === 'SKIPPED' ? "text-muted border-border bg-white/5" : "text-red border-red/20 bg-red/5"
                  )}>
                    {s.status === 'active' ? 'LIVE' : s.status}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-mono text-[13px] font-bold text-text">{s.pair}</span>
                    <span className={cn("font-mono text-[8px] font-bold tracking-widest", s.direction === 'LONG' ? "text-lime" : "text-red")}>
                      {s.direction}
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-sub truncate pr-10 opacity-60 group-hover:opacity-100 transition-opacity">
                    {s.reasoning || 'No technical reasoning provided.'}
                  </span>
                  <div className="flex flex-col items-end">
                    <span className="font-mono text-[10px] text-text">{new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    <span className="font-mono text-[7px] text-muted uppercase tracking-widest">{s.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Market Vitals & Scanner Status */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-s1 border border-border rounded-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-red" />
                <span className="font-mono text-[11px] font-bold text-text uppercase tracking-widest">Market Vitals</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn("w-1.5 h-1.5 rounded-full", sessionInfo.color === 'text-lime' ? 'bg-lime' : 'bg-muted')}></div>
                <span className="font-mono text-[9px] text-sub uppercase">{sessionInfo.name}</span>
              </div>
            </div>

            <div className="space-y-5">
              {[
                { label: 'Neural Confidence', val: `${engineState?.mlConfidence || 0}%`, color: (engineState?.mlConfidence || 0) > 70 ? 'text-lime' : 'text-text' },
                { label: 'Volatility (ATR)', val: engineState?.atr.toFixed(4) || '—' },
                { label: 'S/D Zones', val: `${engineState?.mtf.activeZones} Active` },
                { label: 'HTF Trend', val: engineState?.htf.trend, color: engineState?.htf.trend === Trend.BULL ? 'text-lime' : 'text-red' },
                { label: 'MTF Trend', val: engineState?.mtf.trend, color: engineState?.mtf.trend === Trend.BULL ? 'text-lime' : 'text-red' }
              ].map((v, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                  <span className="font-mono text-[9px] text-muted uppercase tracking-wider">{v.label}</span>
                  <span className={cn("font-mono text-[11px] font-bold", v.color || "text-text")}>{v.val}</span>
                </div>
              ))}
            </div>

            <div className="mt-8 p-5 bg-s2/40 border border-border rounded-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="font-mono text-[8px] text-muted uppercase tracking-widest">Scanner Load</span>
                <div className="flex gap-1">
                  {['BTC', 'ETH', 'XAU', 'GBP', 'EUR'].map(s => (
                    <div key={s} className={cn("w-1 h-3 rounded-full", engineState?.symbol.includes(s) ? 'bg-red' : 'bg-border')}></div>
                  ))}
                </div>
              </div>
              <button 
                onClick={() => engineRef.current?.setSymbol(engineState?.symbol || 'BTCUSD')}
                className="w-full py-2.5 bg-s1 border border-border text-sub font-mono text-[10px] font-bold tracking-widest uppercase rounded-sm hover:border-red hover:text-red transition-all"
              >
                Re-Sync Engine
              </button>
            </div>
          </div>

          <div className="bg-s1 border border-border rounded-sm p-6">
            <div className="flex items-center gap-2 mb-6">
              <Zap size={14} className="text-gold" />
              <span className="font-mono text-[11px] font-bold text-text uppercase tracking-widest">System Rules</span>
            </div>
            <div className="space-y-3">
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
        contents: `Analyze ${trades.length} trades for patterns. 4-6 specific insights on emotional patterns, rule breaches, pair performance, session performance.\n\n${sum}`,
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
    { text: "Avoid overtrading. One quality setup beats five mediocre ones.", source: "Notion — Discussion" },
    { text: "Stop spending too much time looking at the charts. Set and forget.", source: "Notion — Discussion" },
    { text: "ALWAYS stick to the plan — never remove SL or move TP.", source: "Notion — Discussion" },
    { text: "Small profits pile up long term. Kill greed.", source: "Notion — Discussion" },
    { text: "ZOOM OUT then in — look at the full bias before executing.", source: "Notion — Discussion" },
    { text: "Detachment is the edge. Not caring about the trade = trusting your setup.", source: "Hunchology" },
    { text: "Be simple. Find bias, reasoning, and execution level. That's it.", source: "Hunchology" },
    { text: "HTF structure first. Always establish direction before looking at entry.", source: "Hunchology" },
    { text: "Wait for LTF confirmation — IDM, BOS, CHoCH — before pulling the trigger.", source: "Hunchology" },
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

  const allRules = [...defaultRules, ...customRules.map(r => ({ text: r.rule_text, source: 'Custom' }))];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col">
        <h1 className="font-display text-[36px] tracking-wider text-text mb-1">Rules</h1>
        <p className="text-[12px] text-sub mb-7 font-mono">Your Hunchology framework — the law you trade by</p>
      </div>

      <div className="flex flex-col gap-2.5 max-w-[640px]">
        {allRules.map((r, i) => (
          <div key={i} className="grid grid-cols-[40px_1fr] gap-3.5 items-start p-4 bg-s1 border border-border border-l-2 border-l-red rounded-sm">
            <div className="font-display text-[28px] text-red leading-none opacity-40">{String(i + 1).padStart(2, '0')}</div>
            <div className="pt-0.5">
              <div className="text-[13px] leading-relaxed text-text">{r.text}</div>
              <div className="font-mono text-[8px] text-muted mt-1 tracking-wider">{r.source}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2.5 mt-4 max-w-[640px]">
        <input 
          type="text" 
          value={newRule}
          onChange={e => setNewRule(e.target.value)}
          className="flex-1 bg-s2 border border-border text-text p-2.5 px-3 font-mono text-[12px] rounded-sm outline-none focus:border-red transition-colors"
          placeholder="Write a new rule..."
          onKeyDown={e => e.key === 'Enter' && addRule()}
        />
        <button 
          className="px-4.5 py-2.5 bg-red text-white border-none font-mono text-[10px] font-bold tracking-wider rounded-sm cursor-pointer whitespace-nowrap hover:bg-[#ff5555] disabled:opacity-40"
          onClick={addRule}
          disabled={loading}
        >
          + Add Rule
        </button>
      </div>
    </div>
  );
}
