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
          className="fixed inset-0 bg-black/70 z-[99] lg:hidden"
          onClick={onClose}
        ></div>
      )}
      <nav className={cn(
        "fixed lg:sticky top-16 left-0 w-[220px] h-[calc(100vh-64px)] bg-s1 border-r border-border2 py-6 z-[100] transition-transform duration-300 ease-in-out overflow-y-auto",
        !isOpen && "-translate-x-full lg:translate-x-0",
        isOpen && "translate-x-0"
      )}>
        <div className="px-4 mb-10">
          <div className="flex items-center justify-between mb-4 px-2">
            <div className="font-mono text-[9px] text-muted tracking-[0.3em] uppercase font-bold">Navigation</div>
            <div className="flex gap-1">
              <div className="w-1 h-1 bg-red rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-red/30 rounded-full"></div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onPageChange(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-3 p-3 px-4 rounded-sm cursor-pointer text-[11px] font-mono tracking-widest transition-all border-none bg-none w-full text-left uppercase group",
                  activePage === item.id ? "bg-red/10 text-red border-l-2 border-l-red" : "text-sub hover:bg-s2 hover:text-text"
                )}
              >
                <span className={cn("w-5 flex justify-center transition-transform group-hover:scale-110", activePage === item.id ? "text-red" : "text-muted")}>{item.icon}</span>
                {item.label}
                {item.id === 'signals' && hasLiveSignal && (
                  <span className="bg-red text-black font-mono text-[7px] font-black px-1.5 py-0.5 rounded-full ml-auto flex items-center gap-1 animate-pulse">
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <div className="font-mono text-[9px] text-muted tracking-[0.3em] uppercase mb-4 px-2 font-bold">Neural Core</div>
          <div className="p-5 border border-border2 rounded-sm bg-black relative overflow-hidden group shadow-inner">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-red/30 animate-[scanLine_3s_linear_infinite]"></div>
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <span className="text-[9px] text-red uppercase tracking-widest font-black">Attraction</span>
                <p className="text-[11px] text-sub leading-relaxed italic font-medium">Focus pulls reality.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] text-red uppercase tracking-widest font-black">Compensation</span>
                <p className="text-[11px] text-sub leading-relaxed italic font-medium">Effort equals reward.</p>
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-[9px] text-red uppercase tracking-widest font-black">Action</span>
                <p className="text-[11px] text-sub leading-relaxed italic font-medium">Act on intuition.</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
