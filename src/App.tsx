import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import Engine, { TradeMode } from '@/lib/engine';
import Dashboard from '@/components/Dashboard';
import Sidebar from '@/components/Sidebar';
import JarvisOverlay from '@/components/JarvisOverlay';
import MarketTicker from '@/components/MarketTicker';
import LogTrade from '@/components/LogTrade';
import MarketAnalyst from '@/components/MarketAnalyst';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [engineState, setEngineState] = useState<any>(null);
  const [engine, setEngine] = useState<any>(null);
  const engineRef = useRef<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activePage, setActivePage] = useState<'dashboard' | 'log' | 'analyst'>('dashboard');

  const onEngineUpdate = useCallback((state: any) => {
    setEngineState(state);
  }, []);

  const onEngineError = useCallback((err: string) => {
    console.error('Engine error:', err);
    setInitError(err);
  }, []);

  useEffect(() => {
    let aborted = false;
    const init = async () => {
      const timeout = setTimeout(() => {
        if (!aborted) controller.abort();
      }, 15000);

      const controller = new AbortController();

      try {
        setLoading(true);
        setInitError(null);

        // Supabase auth listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
          console.log('Auth state:', session);
        });

        // Init Engine (BTCUSD scalp default, standalone Binance)
        const newEngine = new Engine('BTCUSD', TradeMode.SCALP, onEngineUpdate, onEngineError);
        engineRef.current = newEngine;
        setEngine(newEngine);

        // Wait for first engine update (post-init)
        await new Promise<void>((resolve, reject) => {
          const checkTimeout = setTimeout(() => reject(new Error('Engine init timeout')), 10000);
          const checkReady = () => {
            if (engineState || aborted) {
              clearTimeout(checkTimeout);
              resolve();
            } else if (!aborted) {
              setTimeout(checkReady, 300);
            }
          };
          checkReady();
        });

        clearTimeout(timeout);
      } catch (err: any) {
        if (aborted) return;
        setInitError(err.message || 'Initialization failed');
      } finally {
        if (!aborted) {
          setLoading(false);
        }
        clearTimeout(timeout);
      }
    };

    init();

    return () => {
      aborted = true;
      supabase.auth.onAuthStateChange().data?.subscription?.unsubscribe();
      engineRef.current?.destroy?.();
    };
  }, [onEngineUpdate, onEngineError]);

  if (loading) {
    return (
      <div className={cn("min-h-screen flex flex-col items-center justify-center bg-black text-lime-400 p-8 animate-pulse")}>
        <div className="text-2xl md:text-4xl font-mono tracking-widest mb-8 drop-shadow-lg">
          INITIALIZING NEURAL INTERFACE...
        </div>
        <div className="w-64 bg-gray-800 rounded-full h-3 overflow-hidden mb-4">
          <div 
            className="bg-gradient-to-r from-lime-400 via-emerald-400 to-teal-500 h-3 rounded-full transition-all duration-1000 animate-pulse" 
            style={{width: '75%'}} 
          />
        </div>
        <div className="text-sm opacity-75 font-mono">Syncing Binance streams... Neural engine online.</div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-red-400 p-8">
        <div className="text-center max-w-md space-y-4">
          <h2 className="text-2xl font-mono mb-4">NEURAL SYNC FAILED</h2>
          <p className="text-sm">{initError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-red-600 hover:bg-red-500 rounded-lg font-mono transition-all shadow-lg"
          >
            RETRY INTERFACE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      <Sidebar 
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        engineState={engineState}
        engine={engine}
        activePage={activePage}
        setActivePage={setActivePage}
      />
      <main 
        className={cn(
          "transition-all duration-300 p-4 md:p-6 md:ml-64 min-h-screen", 
          isSidebarOpen && "md:ml-0 md:blur-sm opacity-75"
        )} 
        onClick={() => setIsSidebarOpen(false)}
      >
        {activePage === 'dashboard' && <Dashboard engineState={engineState} engine={engine} />}
        {activePage === 'log' && <LogTrade engine={engine} />}
        {activePage === 'analyst' && <MarketAnalyst engineState={engineState} />}
        <MarketTicker />
        <JarvisOverlay />
      </main>
    </div>
  );
}
