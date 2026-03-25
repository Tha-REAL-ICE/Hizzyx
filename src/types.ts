export type Outcome = 'WIN' | 'LOSS' | 'BE';

export interface Trade {
  id: string;
  user_id: string;
  created_at: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  session: string | null;
  rr: string | null;
  profit: number;
  htf: string;
  entry: string;
  outcome: Outcome;
  rules_followed: 'yes' | 'partial' | 'no';
  rule_breach: string | null;
  emotions: string[];
  notes: string | null;
  ai_feedback: string | null;
  status: 'OPEN' | 'CLOSED';
}

export interface CustomRule {
  id: string;
  user_id: string;
  created_at: string;
  rule_text: string;
}

export enum Trend {
  BULL = 'BULL',
  BEAR = 'BEAR',
  NONE = 'NONE'
}

export enum StructureBreak {
  BOS_BULL = 'BOS_BULL',
  BOS_BEAR = 'BOS_BEAR',
  CHOCH_BULL = 'CHOCH_BULL',
  CHOCH_BEAR = 'CHOCH_BEAR',
  IDM_BULL = 'IDM_BULL',
  IDM_BEAR = 'IDM_BEAR',
  NONE = 'NONE'
}

export enum ZoneType {
  DEMAND = 'DEMAND',
  SUPPLY = 'SUPPLY'
}

export enum TradeMode {
  SWING = 'SWING',
  DAY = 'DAY',
  SCALP = 'SCALP'
}

export type TradingPair = 'GBPJPY' | 'BTCUSD' | 'EURUSD' | 'XAUUSD';

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d';

export interface Candlestick {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface SDZone {
  id: string;
  type: ZoneType;
  high: number;
  low: number;
  time: number;
  isExtreme: boolean;
  isActive: boolean;
  hasImbalance: boolean;
  liqSwept: boolean;
  strength: number;
}

export interface FVG {
  id: string;
  high: number;
  low: number;
  time: number;
  isBull: boolean;
  filled: boolean;
}

export interface LiquidityLevel {
  id: string;
  price: number;
  isHigh: boolean;
  swept: boolean;
}

export interface EngineSignal {
  id: string;
  symbol: TradingPair;
  time: number;
  type: 'BUY' | 'SELL';
  entry: number;
  sl: number;
  tp: number;
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
  reason: string;
  confidence: number;
}

export interface MarketState {
  symbol: TradingPair;
  mode: TradeMode;
  htf: { trend: Trend; price: number; lastBOS: string; timeframe: string };
  mtf: { trend: Trend; price: number; activeZones: number; timeframe: string };
  ltf: { trend: Trend; price: number; confirmation: string; timeframe: string };
  lastBreak: StructureBreak;
  isBOSReady: boolean;
  dailyLosses: number;
  maxDailyLoss: number;
  session: string;
  isRanging: boolean;
  atr: number;
  signals: EngineSignal[];
  mlConfidence: number;
}

export interface Signal {
  id: string;
  user_id: string;
  created_at: string;
  pair: string;
  direction: 'LONG' | 'SHORT';
  session: string | null;
  entry_price: string | null;
  stop_loss: string | null;
  take_profit: string | null;
  reasoning: string | null;
  source: string;
  status: 'active' | 'TAKEN' | 'SKIPPED';
  mode: TradeMode;
}
