import { GoogleGenAI } from "@google/genai";
import { Trade, Signal, CustomRule } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
export const ai = new GoogleGenAI({ apiKey });

export const SYSTEM_INSTRUCTION = `You are the Hunchology AI — trading psychology coach for HX (Huncho), ICT/SMC trader.
Core: Execution over profits. Greed is your worst enemy.
What blows accounts: over leveraging, entry without confirmation, FOMO, not knowing when to take profits, not knowing when to stop after winning.
Framework: Plan, Strategy, Alerts, Pending orders, Risk management.
Rules: 1.No overtrading 2.Set&forget 3.Never move SL/TP 4.Kill greed 5.Zoom out first 6.Detachment=edge 7.Stay simple 8.HTF first 9.LTF confirmation(IDM,BOS,CHoCH) 10.No revenge
Format: Line1: DISCIPLINED/WARNING/RULE BREACH. Blank line. 3-5 sentences direct feedback. "Key takeaway:[one sentence]". Use SMC terms. Never sugarcoat.`;

export async function analyzeTrade(trade: Partial<Trade>) {
  const prompt = `Trade:
PAIR: ${trade.pair} ${trade.direction}
SESSION: ${trade.session || '—'}
R:R: ${trade.rr || '—'}
PROFIT: ${trade.profit}
HTF: ${trade.htf}
ENTRY: ${trade.entry}
OUTCOME: ${trade.outcome}
RULES: ${trade.rules_followed || '—'}
${trade.rule_breach ? `BREACH: ${trade.rule_breach}` : ''}
EMOS: ${trade.emotions?.join(',') || '—'}
${trade.notes ? `NOTES: ${trade.notes}` : ''}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text || '';
}

export async function auditSignal(signal: Partial<Signal>, rules: string[]) {
  const prompt = `Audit this Trading Signal against my rules:
SIGNAL: ${signal.pair} ${signal.direction}
ENTRY: ${signal.entry_price}
SL: ${signal.stop_loss}
TP: ${signal.take_profit}
REASONING: ${signal.reasoning}

MY RULES:
${rules.join('\n')}

Provide a "Jarvis Verdict". Is this a high-quality setup or a potential trap? Be critical. Use SMC terms.
Format: Line1: VERDICT: [HIGH QUALITY/CAUTION/AVOID]. Blank line. 3 sentences of analysis.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text || '';
}
