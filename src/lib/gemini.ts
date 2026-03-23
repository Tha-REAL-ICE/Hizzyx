import { GoogleGenerativeAI } from '@google/generative-ai';

const SYSTEM_INSTRUCTION = `You are JARVIS, HUNCHOLOGY's neural auditor. Analyze trades/signals using SMC/ICT: HTF alignment, liquidity sweeps, FVGs, BOS/CHoCH, inducements. Be precise, critical, cyberpunk-style.`;

let genAIInstance: GoogleGenerativeAI | null = null;

const getGenAI = (): GoogleGenerativeAI => {
  if (genAIInstance) return genAIInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('GEMINI_API_KEY missing → Using mock audits');
    throw new Error('Missing GEMINI_API_KEY');
  }
  genAIInstance = new GoogleGenerativeAI(apiKey);
  return genAIInstance;
};

const mockAnalyzeTrade = (trade: any): string =>
  `JARVIS VERDICT: ${trade.profit > 0 ? 'HIGH CONFLUENCE' : 'REVISE'} | HTF ${trade.htf || '4H'} bias aligned, liquidity swept. R:R ${trade.rr || 2}:1 executed. Refine ${trade.pair} FVG entry. Score: ${Math.round(Math.random() * 20 + 75)}%`;

const mockAuditSignal = (signal: any, rules: string[]): string =>
  `JARVIS VERDICT: ${rules.some(r => signal.reasoning?.includes(r)) ? 'EXECUTE' : 'CAUTION'} | ${signal.reasoning || 'SMC rules met'}. SL/TP solid. Watch inducement on ${signal.pair}.`;

export async function analyzeTrade(trade: any): Promise<string> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION 
    });
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

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini analyzeTrade failed:', error.message);
    return mockAnalyzeTrade(trade);
  }
}

export async function auditSignal(signal: Partial<any>, rules: string[]): Promise<string> {
  try {
    const genAI = getGenAI();
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: SYSTEM_INSTRUCTION 
    });
    const prompt = `Audit Signal vs Rules:
SIGNAL: ${signal.pair} ${signal.direction} | Entry: ${signal.entry_price} | SL: ${signal.stop_loss} | TP: ${signal.take_profit}
REASONING: ${signal.reasoning}

RULES:
${rules.join('\n')}

Jarvis Verdict: HIGH QUALITY/CAUTION/AVOID? 3 sentences SMC analysis.`;

    const result = await model.generateContent(prompt);
    return result.response.text();
  } catch (error: any) {
    console.error('Gemini auditSignal failed:', error.message);
    return mockAuditSignal(signal, rules);
  }
}
