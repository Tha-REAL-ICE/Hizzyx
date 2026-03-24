import React, { useEffect, useState } from 'react';

export default function JarvisOverlay({ onComplete }: { onComplete: () => void }) {
  const [visible, setVisible] = useState(true);
  const [bootLines, setBootLines] = useState<string[]>([]);
  const [showTitle, setShowTitle] = useState(false);
  const [showSub, setShowSub] = useState(false);
  
  const welcomeText = "WELCOME HUNCHO".split(' ');

  const lines = [
    "HIZZYX NEURAL CORE v12.4.1",
    "ESTABLISHING SECURE CONNECTION...",
    "BYPASSING MAINFRAME PROTOCOLS...",
    "SYNCING REAL-TIME MARKET DATA...",
    "CALIBRATING RISK PARAMETERS...",
    "ACCESS GRANTED."
  ];

  useEffect(() => {
    let delay = 0;
    const timeouts: NodeJS.Timeout[] = [];

    // Terminal typing effect
    lines.forEach((line, i) => {
      delay += 400 + Math.random() * 300;
      const t = setTimeout(() => {
        setBootLines(prev => [...prev, line]);
      }, delay);
      timeouts.push(t);
    });

    // Show WELCOME HUNCHO title after terminal finishes
    const titleTimer = setTimeout(() => setShowTitle(true), delay + 500);
    timeouts.push(titleTimer);

    // Show thriller subtitle
    const subTimer = setTimeout(() => setShowSub(true), delay + 1500);
    timeouts.push(subTimer);

    // End sequence at exactly 10 seconds
    const completeTimeout = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 800);
    }, 10000);
    timeouts.push(completeTimeout);

    return () => {
      timeouts.forEach(clearTimeout);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-[9000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-800"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.2)_0%,transparent_100%)]"></div>
      
      {/* Boot Sequence Terminal */}
      <div className="absolute top-10 left-10 font-mono text-[11px] text-red/60 flex flex-col gap-1 text-left z-20 max-w-[300px]">
        {bootLines.map((line, i) => (
          <div key={i} className="animate-[fIn_0.2s_ease_forwards] tracking-widest uppercase truncate">
            {'>'} {line}
          </div>
        ))}
        {bootLines.length > 0 && bootLines.length < lines.length && (
          <div className="w-2 h-3 bg-red animate-pulse mt-1 ml-4"></div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mt-12">
        {showTitle && (
          <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 overflow-hidden mb-8">
            {welcomeText.map((word, wIdx) => (
              <div key={wIdx} className="flex">
                {word.split('').map((letter, i) => (
                  <span 
                    key={i} 
                    className="font-display text-[60px] md:text-[110px] text-[#ff0000] font-black tracking-tighter uppercase inline-block opacity-0 animate-[slideUp_0.5s_cubic-bezier(0.16,1,0.3,1)_forwards]" 
                    style={{ 
                      animationDelay: `${(wIdx * 7 + i) * 0.08}s`,
                      textShadow: '0 0 30px rgba(255,0,0,1), 0 0 60px rgba(255,0,0,0.6), 0 0 100px rgba(255,0,0,0.3)'
                    }}
                  >
                    {letter}
                  </span>
                ))}
              </div>
            ))}
          </div>
        )}
        
        {showSub && (
          <div className="font-mono text-[16px] md:text-[22px] text-[#ff0000] tracking-[0.5em] uppercase font-black animate-thriller" style={{ textShadow: '0 0 20px rgba(255,0,0,0.9)' }}>
            Never get comfortable.
          </div>
        )}
      </div>

      {/* Background Glitch Elements */}
      <div className="absolute bottom-10 right-10 flex flex-col items-end gap-4">
        <button 
          onClick={() => {
            setVisible(false);
            onComplete();
          }}
          className="px-6 py-2 bg-red/10 border border-red/40 text-red font-mono text-[10px] uppercase tracking-[0.3em] hover:bg-red hover:text-black transition-all"
        >
          Skip Initialization
        </button>
        <div className="font-mono text-[10px] text-red/30 uppercase tracking-[0.3em] animate-pulse">
          Neural Engine Online
        </div>
      </div>
    </div>
  );
}
