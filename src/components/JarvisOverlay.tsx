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
    lines.forEach((line) => {
      delay += 500 + Math.random() * 400;
      const t = setTimeout(() => {
        setBootLines(prev => [...prev, line]);
      }, delay);
      timeouts.push(t);
    });

    // Show WELCOME HUNCHO title after terminal finishes
    const titleTimer = setTimeout(() => setShowTitle(true), delay + 800);
    timeouts.push(titleTimer);

    // Show thriller subtitle
    const subTimer = setTimeout(() => setShowSub(true), delay + 2000);
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
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,0,0,0.15)_0%,transparent_100%)]"></div>
      
      {/* Boot Sequence Terminal */}
      <div className="absolute top-10 left-10 font-mono text-[12px] text-red/80 flex flex-col gap-1.5 text-left z-20">
        {bootLines.map((line, i) => (
          <div key={i} className="animate-[fIn_0.2s_ease_forwards] tracking-widest uppercase">
            {'>'} {line}
          </div>
        ))}
        {bootLines.length > 0 && bootLines.length < lines.length && (
          <div className="w-2.5 h-4 bg-red animate-pulse mt-1 ml-4"></div>
        )}
      </div>

      <div className="relative z-10 flex flex-col items-center text-center mt-12">
        {showTitle && (
          <div className="flex flex-wrap justify-center gap-x-4 md:gap-x-6 overflow-hidden mb-6">
            {welcomeText.map((word, wIdx) => (
              <div key={wIdx} className="flex">
                {word.split('').map((letter, i) => (
                  <span 
                    key={i} 
                    className="font-display text-[50px] md:text-[80px] text-[#ff0000] font-black tracking-tighter uppercase inline-block opacity-0 animate-[slideUp_0.6s_cubic-bezier(0.16,1,0.3,1)_forwards]" 
                    style={{ 
                      animationDelay: `${(wIdx * 7 + i) * 0.1}s`,
                      textShadow: '0 0 20px rgba(255,0,0,0.8), 0 0 40px rgba(255,0,0,0.4)'
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
          <div className="font-mono text-[14px] md:text-[18px] text-[#ff0000] tracking-[0.4em] uppercase font-bold animate-thriller" style={{ textShadow: '0 0 15px rgba(255,0,0,0.8)' }}>
            Never get comfortable.
          </div>
        )}
      </div>
    </div>
  );
}
