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
        "fixed lg:sticky top-[56px] left-0 w-[220px] h-[calc(100vh-56px)] bg-s1 border-r border-border py-5 z-[100] transition-transform duration-300 ease-in-out overflow-y-auto",
        !isOpen && "-translate-x-full lg:translate-x-0",
        isOpen && "translate-x-0"
      )}>
        <div className="px-4 mb-7">
          <div className="flex items-center justify-between mb-2.5 px-1">
            <div className="font-mono text-[8px] text-muted tracking-[0.25em] uppercase">Navigate</div>
            <div className="flex gap-0.5">
              <div className="w-1 h-1 bg-red rounded-full animate-pulse"></div>
              <div className="w-1 h-1 bg-red/40 rounded-full"></div>
              <div className="w-1 h-1 bg-red/20 rounded-full"></div>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => { onPageChange(item.id); onClose(); }}
                className={cn(
                  "flex items-center gap-2.5 p-2.5 px-3 rounded-sm cursor-pointer text-[12px] font-mono tracking-wider transition-all border-none bg-none w-full text-left uppercase",
                  activePage === item.id ? "bg-red/10 text-red border-l-2 border-l-red" : "text-sub hover:bg-s2 hover:text-text"
                )}
              >
                <span className="w-5 text-center flex justify-center">{item.icon}</span>
                {item.label}
                {item.id === 'signals' && hasLiveSignal && (
                  <span className="bg-red text-white font-mono text-[7px] font-bold px-1.5 py-0.5 rounded-full ml-auto flex items-center gap-1 animate-pulse">
                    LIVE
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4">
          <div className="font-mono text-[8px] text-muted tracking-[0.25em] uppercase mb-2.5 px-1">Neural Core</div>
          <div className="p-4 border border-border rounded-sm bg-s2/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-red/20 animate-[scanLine_4s_linear_infinite]"></div>
            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-red uppercase tracking-wider font-bold">Attraction</span>
                <p className="text-[10px] text-sub leading-relaxed italic">Focus pulls reality.</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-red uppercase tracking-wider font-bold">Compensation</span>
                <p className="text-[10px] text-sub leading-relaxed italic">Effort equals reward.</p>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] text-red uppercase tracking-wider font-bold">Action</span>
                <p className="text-[10px] text-sub leading-relaxed italic">Act on intuition.</p>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </>
  );
}
