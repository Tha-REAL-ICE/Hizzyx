import React from 'react';
import { LayoutDashboard, Radio, PenLine, Folder, Search, Zap, Bot, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

export type PageId = 'dashboard' | 'signals' | 'log' | 'history' | 'analytics' | 'rules' | 'analyst';

interface SidebarProps {
  activePage: PageId;
  onPageChange: (id: PageId) => void;
  isOpen: boolean;
  onClose: () => void;
  hasLiveSignal: boolean;
}

export default function Sidebar({ activePage, onPageChange, isOpen, onClose, hasLiveSignal }: SidebarProps) {
  const navItems: { id: PageId; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={15} /> },
    { id: 'signals', label: 'HIZZYX Signals', icon: <Radio size={15} /> },
    { id: 'analyst', label: 'HizzyX Core', icon: <Bot size={15} /> },
    { id: 'log', label: 'Log Trade', icon: <PenLine size={15} /> },
    { id: 'history', label: 'History', icon: <Folder size={15} /> },
    { id: 'analytics', label: 'Analytics', icon: <Search size={15} /> },
    { id: 'rules', label: 'Rules', icon: <Zap size={15} /> },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/90 z-[99] lg:hidden backdrop-blur-sm"
          onClick={onClose}
        ></div>
      )}
      <nav className={cn(
        "fixed lg:sticky top-16 left-0 w-[240px] h-[calc(100vh-64px)] bg-black border-r-2 border-border2 py-6 z-[100] transition-transform duration-300 ease-in-out overflow-y-auto shadow-[10px_0_30px_rgba(0,0,0,0.5)]",
        !isOpen && "-translate-x-full lg:translate-x-0",
        isOpen && "translate-x-0"
      )}>
        <div className="px-4 mb-10">
          <div className="flex items-center justify-between mb-6 px-2">
            <div className="font-mono text-[10px] text-muted tracking-[0.4em] uppercase font-black">Navigation</div>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 bg-red animate-pulse shadow-[0_0_5px_rgba(255,0,0,0.8)]"></div>
              <div className="w-1.5 h-1.5 bg-red/30"></div>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onPageChange(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-4 p-3 px-4 cursor-pointer text-[12px] font-mono tracking-widest transition-all border-none bg-none w-full text-left uppercase group relative overflow-hidden",
                  activePage === item.id ? "bg-red/10 text-white border-l-4 border-l-red shadow-[inset_0_0_20px_rgba(255,0,0,0.1)]" : "text-sub hover:bg-s1 hover:text-white border-l-4 border-transparent hover:border-l-red/50"
                )}
              >
                {activePage === item.id && (
                  <div className="absolute inset-0 bg-gradient-to-r from-red/10 to-transparent pointer-events-none"></div>
                )}
                <span className={cn("w-5 flex justify-center transition-transform group-hover:scale-110", activePage === item.id ? "text-red drop-shadow-[0_0_5px_rgba(255,0,0,0.5)]" : "text-muted")}>{item.icon}</span>
                <span className="font-bold">{item.label}</span>
                {item.id === 'signals' && hasLiveSignal && (
                  <span className="bg-red text-black font-mono text-[8px] font-black px-2 py-0.5 ml-auto flex items-center gap-1 animate-pulse shadow-[0_0_10px_rgba(255,0,0,0.5)]">
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <div className="font-mono text-[10px] text-muted tracking-[0.4em] uppercase mb-4 px-2 font-black">Neural Core</div>
          <div className="p-5 border-2 border-border2 bg-black relative overflow-hidden group shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-red/50 animate-[scanLine_2s_linear_infinite] shadow-[0_0_10px_rgba(255,0,0,0.5)]"></div>
            <div className="space-y-6 relative z-10">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-red uppercase tracking-[0.3em] font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Attraction</span>
                <p className="text-[12px] text-white leading-relaxed font-mono font-bold">Focus pulls reality.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-red uppercase tracking-[0.3em] font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Compensation</span>
                <p className="text-[12px] text-white leading-relaxed font-mono font-bold">Effort equals reward.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[10px] text-red uppercase tracking-[0.3em] font-black drop-shadow-[0_0_2px_rgba(255,0,0,0.5)]">Action</span>
                <p className="text-[12px] text-white leading-relaxed font-mono font-bold">Act on intuition.</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
