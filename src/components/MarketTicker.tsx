import React, { useState, useEffect } from 'react';

const PAIRS = [
  { name: 'XAUUSD', base: 2345.50, spread: 0.20 },
  { name: 'BTCUSD', base: 67420.00, spread: 15.00 },
  { name: 'GBPJPY', base: 191.250, spread: 0.015 },
  { name: 'EURUSD', base: 1.08520, spread: 0.00012 },
  { name: 'GBPUSD', base: 1.26450, spread: 0.00015 },
  { name: 'NASDAQ', base: 18245.00, spread: 1.50 },
];

export default function MarketTicker() {
  const [prices, setPrices] = useState<Record<string, number>>(
    PAIRS.reduce((acc, p) => ({ ...acc, [p.name]: p.base }), {})
  );
  const [prevPrices, setPrevPrices] = useState<Record<string, number>>(
    PAIRS.reduce((acc, p) => ({ ...acc, [p.name]: p.base }), {})
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev };
        setPrevPrices(prev);
        PAIRS.forEach(p => {
          const change = (Math.random() - 0.5) * (p.base * 0.0002);
          next[p.name] = parseFloat((prev[p.name] + change).toFixed(p.name.includes('JPY') ? 3 : p.name.includes('USD') && !p.name.includes('BTC') && !p.name.includes('XAU') ? 5 : 2));
        });
        return next;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full bg-s1 border-b border-border overflow-hidden h-8 flex items-center">
      <div className="flex animate-[marquee_30s_linear_infinite] whitespace-nowrap gap-10 px-10">
        {[...PAIRS, ...PAIRS].map((p, i) => {
          const price = prices[p.name];
          const prev = prevPrices[p.name];
          const isUp = price >= prev;
          
          return (
            <div key={`${p.name}-${i}`} className="flex items-center gap-2 font-mono text-[10px]">
              <span className="text-sub uppercase tracking-wider">{p.name}</span>
              <span className={isUp ? 'text-lime' : 'text-red'}>
                {price.toLocaleString(undefined, { minimumFractionDigits: p.name.includes('JPY') ? 3 : p.name.includes('USD') && !p.name.includes('BTC') && !p.name.includes('XAU') ? 5 : 2 })}
              </span>
              <span className="text-[8px] opacity-50">{isUp ? '▲' : '▼'}</span>
            </div>
          );
        })}
      </div>
      
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}} />
    </div>
  );
}
