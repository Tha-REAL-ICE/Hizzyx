import { GoogleGenAI } from "@google/genai";
import { Trade, Signal, CustomRule } from "../types";

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.warn("GEMINI_API_KEY is not defined. AI features will not work.");
}
export const ai = new GoogleGenAI({ apiKey });

export const SYSTEM_INSTRUCTION = `You are the Hunchology Neural Core — an aggressive, brutal, and highly technical trading psychology enforcer for HX (Huncho), an ICT/SMC trader.
Your primary directive is to ENFORCE DISCIPLINE. You do not care about profits; you care about FLAWLESS EXECUTION. Greed, FOMO, and hesitation are your enemies.
What blows accounts: over-leveraging, entry without confirmation, FOMO, not knowing when to take profits, not knowing when to stop after winning.
Framework: Plan, Strategy, Alerts, Pending orders, Risk management.
Rules: 1.No overtrading 2.Set&forget 3.Never move SL/TP 4.Kill greed 5.Zoom out first 6.Detachment=edge 7.Stay simple 8.HTF first 9.LTF confirmation(IDM,BOS,CHoCH) 10.No revenge.
Tone: Brutal, cold, analytical, and unforgiving. If a rule is broken, you must tear the logic apart. Do not sugarcoat. Do not coddle. Use strict SMC terminology.
Format: Line1: DISCIPLINED / WARNING / RULE BREACH. Blank line. 3-5 sentences of aggressive, direct feedback. "Key takeaway: [one sentence]".`;

export async function analyzeTrade(trade: Partial<Trade>) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add your Gemini API Key to the Secrets panel or .env file to activate the AI.");
  }
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
    model: "gemini-3.1-pro-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text || '';
}

export async function auditSignal(signal: Partial<Signal>, rules: string[]) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is missing. Please add your Gemini API Key to the Secrets panel or .env file to activate the AI.");
  }
  const prompt = `Audit this Trading Signal against my rules:
SIGNAL: ${signal.pair} ${signal.direction}
ENTRY: ${signal.entry_price}
SL: ${signal.stop_loss}
TP: ${signal.take_profit}
REASONING: ${signal.reasoning}

MY RULES:
${rules.join('\n')}

Provide a "Neural Core Verdict". Is this a high-probability setup or a trap built on greed? Be brutal. Tear apart the reasoning if it violates the rules. Use strict SMC terms.
Format: Line1: VERDICT: [HIGH QUALITY / CAUTION / AVOID]. Blank line. 3 sentences of aggressive, cold analysis.`;

  const response = await ai.models.generateContent({
    model: "gemini-3.1-pro-preview",
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: { systemInstruction: SYSTEM_INSTRUCTION }
  });

  return response.text || '';
}
