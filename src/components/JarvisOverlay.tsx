import React, { useEffect, useState } from 'react';

export default function JarvisOverlay({ onComplete }: { onComplete: () => void }) {
  const [status, setStatus] = useState('Booting systems');
  const [phrase, setPhrase] = useState<{ title: string; sub: string } | null>(null);
  const [visible, setVisible] = useState(true);

  const phrases = [
    ['What blows accounts:', 'Over leveraging — FOMO — No confirmation.'],
    ['Greed is your own worst enemy.', 'Never get comfortable.'],
    ['Execution over profits.', 'Every single time.'],
    ['Plan. Strategy. Alerts.', 'Pending orders. Risk management.'],
    ['Never get comfortable,', 'shit gets worse.'],
  ];

  const statuses = [
    'Booting systems',
    'Loading trade history',
    'Syncing signals',
    'Checking database',
    'All systems online'
  ];

  useEffect(() => {
    let si = 0;
    const st = setInterval(() => {
      if (si < statuses.length) {
        setStatus(statuses[si]);
        si++;
      } else {
        clearInterval(st);
      }
    }, 580);

    const pick = phrases[Math.floor(Math.random() * phrases.length)];
    const phraseTimeout = setTimeout(() => {
      setPhrase({ title: pick[0], sub: pick[1] });
    }, 2000);

    const completeTimeout = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 800);
    }, 5500);

    return () => {
      clearInterval(st);
      clearTimeout(phraseTimeout);
      clearTimeout(completeTimeout);
    };
  }, []);

  if (!visible) return null;

  return (
    <div 
      className="fixed inset-0 bg-black z-[9000] flex flex-col items-center justify-center overflow-hidden transition-opacity duration-800"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div className="absolute inset-0 bg-[linear-gradient(rgba(200,255,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(200,255,0,0.03)_1px,transparent_1px)] bg-[length:40px_40px] animate-[gridFade_5.5s_ease_forwards]"></div>
      
      <div className="absolute w-7 h-7 border-lime/30 border-t border-l top-6 left-6 animate-[cAnim_5.5s_ease_forwards]"></div>
      <div className="absolute w-7 h-7 border-lime/30 border-t border-r top-6 right-6 animate-[cAnim_5.5s_ease_forwards]"></div>
      <div className="absolute w-7 h-7 border-lime/30 border-b border-l bottom-6 left-6 animate-[cAnim_5.5s_ease_forwards]"></div>
      <div className="absolute w-7 h-7 border-lime/30 border-b border-r bottom-6 right-6 animate-[cAnim_5.5s_ease_forwards]"></div>
      
      <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-lime/50 to-transparent animate-[scanH_2.5s_ease-in-out_0.4s_forwards]"></div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="flex items-center gap-5 mb-8">
          <div className="h-[1px] bg-gradient-to-r from-transparent to-lime/50 w-20 scale-x-0 origin-right animate-[barExp_0.8s_ease_0.3s_forwards]"></div>
          <div className="w-1.5 h-1.5 bg-lime rounded-full shadow-[0_0_16px_var(--color-lime),0_0_40px_rgba(200,255,0,0.3)] animate-[dotP_1.5s_ease-in-out_infinite]"></div>
          <div className="h-[1px] bg-gradient-to-r from-lime/50 to-transparent w-20 scale-x-0 origin-left animate-[barExp_0.8s_ease_0.3s_forwards]"></div>
        </div>

        <div className="font-mono text-[8px] text-lime/35 tracking-[0.5em] uppercase mb-1.5 opacity-0 animate-[fIn_0.4s_ease_0.6s_forwards]">
          HUNCHOLOGY OS v2.0 — NEURAL LINK ESTABLISHED
        </div>
        <div className="font-mono text-[11px] text-sub tracking-[0.35em] uppercase mb-2.5 opacity-0 animate-[fIn_0.5s_ease_0.9s_forwards]">
          Welcome back,
        </div>
        <div className="font-display text-[96px] text-red tracking-[0.05em] leading-none [text-shadow:0_0_60px_rgba(255,61,61,0.3),0_0_120px_rgba(255,61,61,0.1)] opacity-0 animate-[nameSlam_0.6s_cubic-bezier(0.16,1,0.3,1)_1.1s_forwards] uppercase">
          HUNCHOLOGY
        </div>
        <div className="font-mono text-[9px] text-red/50 tracking-[0.4em] uppercase mt-4 mb-8 opacity-0 animate-[fIn_0.5s_ease_1.5s_forwards]">
          Execution is the only edge.
        </div>

        <div className="flex flex-col items-center gap-2.5 opacity-0 animate-[fIn_0.5s_ease_1.7s_forwards]">
          <div className="font-mono text-[10px] text-sub tracking-[0.15em] min-h-[16px]">
            {status}<span className="blink">_</span>
          </div>
          <div className="w-60 h-[1px] bg-white/5 rounded-sm overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red to-lime w-0 animate-[prog_2.5s_cubic-bezier(0.4,0,0.2,1)_1.9s_forwards] shadow-[0_0_8px_var(--color-red)]"></div>
          </div>
        </div>

        {phrase && (
          <div className="mt-6 opacity-0 animate-[fIn_0.6s_ease_2.2s_forwards] max-w-[380px] px-5">
            <div className="font-mono text-[9px] text-red/60 tracking-[0.08em] leading-[2.2] text-center">
              <span className="text-red font-bold text-[10px]">{phrase.title}</span><br />
              {phrase.sub}
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 font-mono text-[8px] text-lime/15 tracking-[0.3em] uppercase animate-[fIn_0.5s_ease_2.4s_both]">
        Hunchology Trading System — Authorized Access Only
      </div>
    </div>
  );
}
