import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthScreen() {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; type: 'err' | 'ok' } | null>(null);

  const doLogin = async () => {
    if (!email || !password) {
      setMsg({ text: 'Enter your email and password.', type: 'err' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setMsg({ text: error.message, type: 'err' });
  };

  const doSignup = async () => {
    if (!email || !password) {
      setMsg({ text: 'Enter your email and password.', type: 'err' });
      return;
    }
    if (password.length < 6) {
      setMsg({ text: 'Password must be at least 6 characters.', type: 'err' });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (error) setMsg({ text: error.message, type: 'err' });
    else setMsg({ text: 'Account created! Check your email to confirm, then sign in.', type: 'ok' });
  };

  return (
    <div className="flex items-center justify-center min-h-screen p-5">
      <div className="w-full max-w-[400px]">
        <div className="font-display text-[52px] text-red tracking-[0.06em] leading-none mb-1">HUNCHOLOGY</div>
        <div className="font-mono text-[9px] text-sub tracking-[0.25em] uppercase mb-10">Execution over profits. Always.</div>
        
        <div className="flex mb-7 border-b border-border">
          <button 
            className={`px-5 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase bg-none border-none cursor-pointer border-b-2 transition-all ${tab === 'login' ? 'text-red border-red' : 'text-sub border-transparent'}`}
            onClick={() => { setTab('login'); setMsg(null); }}
          >
            Sign In
          </button>
          <button 
            className={`px-5 py-2.5 font-mono text-[10px] tracking-[0.15em] uppercase bg-none border-none cursor-pointer border-b-2 transition-all ${tab === 'signup' ? 'text-red border-red' : 'text-sub border-transparent'}`}
            onClick={() => { setTab('signup'); setMsg(null); }}
          >
            Sign Up
          </button>
        </div>

        {msg && (
          <div className={`font-mono text-[10px] p-2.5 px-3.5 rounded-sm mb-4 ${msg.type === 'err' ? 'text-red bg-red/10 border border-red/20' : 'text-lime bg-lime/10 border border-lime/20'}`}>
            {msg.text}
          </div>
        )}

        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Email</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-s2 border border-border text-text p-3 px-3.5 font-mono text-[13px] rounded-sm outline-none focus:border-red transition-colors w-full"
              placeholder="your@email.com"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="font-mono text-[8px] uppercase tracking-[0.2em] text-sub">Password</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-s2 border border-border text-text p-3 px-3.5 font-mono text-[13px] rounded-sm outline-none focus:border-red transition-colors w-full"
              placeholder="••••••••"
              onKeyDown={(e) => e.key === 'Enter' && (tab === 'login' ? doLogin() : doSignup())}
            />
          </div>
          <button 
            className="p-3.5 bg-red text-white border-none font-mono text-[11px] font-bold tracking-[0.2em] uppercase cursor-pointer rounded-sm transition-all mt-1.5 hover:bg-[#ff5555] hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
            disabled={loading}
            onClick={tab === 'login' ? doLogin : doSignup}
          >
            {loading ? 'Processing...' : tab === 'login' ? 'Sign In →' : 'Create Account →'}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-border">
          <div className="font-mono text-[9px] text-muted leading-[1.9] italic">What blows accounts: over leveraging — entry without confirmation — FOMO — not knowing when to take profits — not knowing when to stop after winning.</div>
          <div className="font-mono text-[9px] text-red/45 leading-[1.9] italic mt-2.5">Greed is your own worst enemy. Never get comfortable, shit gets worse.</div>
        </div>
      </div>
    </div>
  );
}
