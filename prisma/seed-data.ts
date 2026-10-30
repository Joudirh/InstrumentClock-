export type Region =
  | "ASIA"
  | "EUROPE"
  | "AMERICA"
  | "OCEANIA"
  | "AFRICA"
  | "GLOBAL";

export type WindowKind = "TRADING" | "OPTIMAL";

export interface SessionSeed {
  slug: string;
  name: string;
  region: Region;
  timezone: string;
  is247: boolean;
  position: number;
}

export interface WindowSeed {
  kind: WindowKind;
  days: number[];
  startMinute: number;
  endMinute: number;
  timezone: string;
  label: string | null;
  position: number;
}

export interface InstrumentSeed {
  id: number;
  name: string;
  sessionSlug: string;
  categoryId: number;
  windows: WindowSeed[];
}

export interface CategorySeed {
  id: number;
  slug: string;
  name: string;
  position: number;
}

// Jours par défaut 1-5 (lundi-vendredi). Crypto : 7 jours. CME : dim 18:00 -> ven? non,
// dim->jeu soir (vendredi 18:00 pas de séance).
const WEEK = [1, 2, 3, 4, 5];
const SEVEN = [1, 2, 3, 4, 5, 6, 7];
const CME_DAYS = [7, 1, 2, 3, 4];
const CME_NIGHT = { days: CME_DAYS, startMinute: 1080, endMinute: 2460 };

const SESSION_TZ: Record<string, string> = {
  sydney: "Australia/Sydney",
  tokyo: "Asia/Tokyo",
  shanghai: "Asia/Shanghai",
  "hong-kong": "Asia/Hong_Kong",
  singapore: "Asia/Singapore",
  tunis: "Africa/Tunis",
  london: "Europe/London",
  paris: "Europe/Paris",
  berlin: "Europe/Berlin",
  zurich: "Europe/Zurich",
  madrid: "Europe/Madrid",
  "new-york": "America/New_York",
  chicago: "America/Chicago",
  "global-24-7": "UTC",
};

export const SESSIONS: SessionSeed[] = [
  { slug: "sydney", name: "Sydney", region: "OCEANIA", timezone: "Australia/Sydney", is247: false, position: 1 },
  { slug: "tokyo", name: "Tokyo", region: "ASIA", timezone: "Asia/Tokyo", is247: false, position: 2 },
  { slug: "shanghai", name: "Shanghai", region: "ASIA", timezone: "Asia/Shanghai", is247: false, position: 3 },
  { slug: "hong-kong", name: "Hong Kong", region: "ASIA", timezone: "Asia/Hong_Kong", is247: false, position: 4 },
  { slug: "singapore", name: "Singapour", region: "ASIA", timezone: "Asia/Singapore", is247: false, position: 5 },
  { slug: "tunis", name: "Tunis", region: "AFRICA", timezone: "Africa/Tunis", is247: false, position: 6 },
  { slug: "london", name: "Londres", region: "EUROPE", timezone: "Europe/London", is247: false, position: 7 },
  { slug: "paris", name: "Paris", region: "EUROPE", timezone: "Europe/Paris", is247: false, position: 8 },
  { slug: "berlin", name: "Francfort", region: "EUROPE", timezone: "Europe/Berlin", is247: false, position: 9 },
  { slug: "zurich", name: "Zurich", region: "EUROPE", timezone: "Europe/Zurich", is247: false, position: 10 },
  { slug: "madrid", name: "Madrid", region: "EUROPE", timezone: "Europe/Madrid", is247: false, position: 11 },
  { slug: "new-york", name: "New York", region: "AMERICA", timezone: "America/New_York", is247: false, position: 12 },
  { slug: "chicago", name: "Chicago", region: "AMERICA", timezone: "America/Chicago", is247: false, position: 13 },
  { slug: "global-24-7", name: "Global 24/7", region: "GLOBAL", timezone: "UTC", is247: true, position: 14 },
];

export const CATEGORIES: CategorySeed[] = [
  { id: 7, slug: "forex", name: "Forex", position: 1 },
  { id: 8, slug: "indices", name: "Indices", position: 2 },
  { id: 9, slug: "matieres-premieres", name: "Matières premières", position: 3 },
  { id: 10, slug: "actions", name: "Actions", position: 4 },
  { id: 11, slug: "crypto", name: "Crypto-monnaies", position: 5 },
  { id: 12, slug: "etf", name: "ETF", position: 6 },
  { id: 13, slug: "futures", name: "Futures", position: 7 },
];

const minutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m ?? 0);
};

// span : "09:30-16:00" ou "18:00-17:00+1" (fin le lendemain). Renvoie une WindowSeed de kind TRADING.
const t = (
  days: number[],
  span: string,
  timezone: string,
  label: string | null = null,
): WindowSeed => {
  const [raw, end] = span.split("-");
  const cross = end.endsWith("+1") ? 1440 : 0;
  return {
    kind: "TRADING",
    days,
    startMinute: minutes(raw),
    endMinute: minutes(end.replace("+1", "")) + cross,
    timezone,
    label: label ?? null,
    position: 0,
  };
};

const o = (days: number[], span: string, timezone: string): WindowSeed => {
  const [raw, end] = span.split("-");
  const cross = end.endsWith("+1") ? 1440 : 0;
  return {
    kind: "OPTIMAL",
    days,
    startMinute: minutes(raw),
    endMinute: minutes(end.replace("+1", "")) + cross,
    timezone,
    label: null,
    position: 0,
  };
};

const CME_TRADING = (tz: string): WindowSeed => ({
  kind: "TRADING",
  days: CME_NIGHT.days,
  startMinute: CME_NIGHT.startMinute,
  endMinute: CME_NIGHT.endMinute,
  timezone: tz,
  label: null,
  position: 0,
});

interface Row {
  id: number;
  name: string;
  sessionSlug: string;
  categoryId: number;
  t: string[];
  tExtra?: WindowSeed[];
  o: string[];
  oExtra?: WindowSeed[];
  tz?: string;
  oDays?: number[];
}

const build = (rows: Row[]): InstrumentSeed[] =>
  rows.map((row) => {
    const tz = row.tz ?? SESSION_TZ[row.sessionSlug];
    const oDays = row.oDays ?? WEEK;
    const windows: WindowSeed[] = [
      ...row.t.map((span, i) => ({ ...t(WEEK, span, tz), position: i })),
      ...(row.tExtra ?? []).map((win, i) => ({ ...win, position: row.t.length + i })),
      ...row.o.map((span, i) => ({ ...o(oDays, span, tz), position: i })),
      ...(row.oExtra ?? []).map((win, i) => ({ ...win, position: row.o.length + i })),
    ];
    return {
      id: row.id,
      name: row.name,
      sessionSlug: row.sessionSlug,
      categoryId: row.categoryId,
      windows,
    };
  });

const FOREX_T_LABEL = "Session";
const sessionCity = (slug: string) =>
  SESSIONS.find((s) => s.slug === slug)?.name ?? slug;

const forexRow = (
  id: number,
  name: string,
  sessionSlug: string,
  tSpan: string,
  oSpan: string,
): Row => ({
  id,
  name,
  sessionSlug,
  categoryId: 7,
  t: [tSpan],
  o: [oSpan],
  tExtra: [],
});

// Forex (catégorie 7) — libellé TRADING : « Session <ville> »
const sessionRows = [
  forexRow(72, "EUR-USD (Londres)", "london", "08:00-17:00", "13:00-17:00"),
  forexRow(73, "GBP-USD (Londres)", "london", "08:00-17:00", "13:00-17:00"),
  forexRow(74, "EUR-GBP (Londres)", "london", "08:00-17:00", "08:00-11:00"),
  forexRow(75, "USD-JPY (New York)", "new-york", "08:00-17:00", "08:00-12:00"),
  forexRow(76, "USD-CAD (New York)", "new-york", "08:00-17:00", "08:00-12:00"),
  forexRow(77, "AUD-USD (New York)", "new-york", "08:00-17:00", "08:00-12:00"),
  forexRow(78, "USD-JPY (Tokyo)", "tokyo", "09:00-18:00", "09:00-14:00"),
  forexRow(79, "AUD-JPY (Tokyo)", "tokyo", "09:00-18:00", "09:00-14:00"),
  forexRow(80, "NZD-USD (Sydney)", "sydney", "08:00-17:00", "09:00-14:00"),
  forexRow(81, "EUR-AUD (Londres)", "london", "08:00-17:00", "08:00-11:00"),
  forexRow(82, "USD-CNY (Asie)", "shanghai", "09:00-18:00", "09:00-12:00"),
  forexRow(83, "GBP-JPY (Londres)", "london", "08:00-17:00", "08:00-11:00"),
  forexRow(84, "EUR-JPY (Londres)", "london", "08:00-17:00", "08:00-11:00"),
  forexRow(85, "USD-CHF (Londres)", "london", "08:00-17:00", "13:00-17:00"),
  forexRow(86, "USD-SGD (Asie)", "singapore", "09:00-18:00", "09:00-12:00"),
  forexRow(87, "USD-MXN (New York)", "new-york", "08:00-17:00", "08:00-11:00"),
];

// Indices (catégorie 8)
const indexRows: Row[] = [
  { id: 88, name: "S&P500", sessionSlug: "new-york", categoryId: 8, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 89, name: "Dow Jones", sessionSlug: "new-york", categoryId: 8, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 90, name: "Nasdaq 100", sessionSlug: "new-york", categoryId: 8, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 91, name: "DAX30", sessionSlug: "berlin", categoryId: 8, t: ["09:00-17:30"], o: ["09:00-11:30"] },
  { id: 92, name: "FTSE100", sessionSlug: "london", categoryId: 8, t: ["08:00-16:30"], o: ["08:00-10:30"] },
  { id: 93, name: "CAC40", sessionSlug: "paris", categoryId: 8, t: ["09:00-17:30"], o: ["09:00-11:30"] },
  { id: 94, name: "Nikkei 225", sessionSlug: "tokyo", categoryId: 8, t: ["09:00-11:30", "12:30-15:30"], o: ["09:00-11:00"] },
  { id: 95, name: "Hang Seng", sessionSlug: "hong-kong", categoryId: 8, t: ["09:30-12:00", "13:00-16:00"], o: ["09:30-11:30"] },
  { id: 96, name: "SMI Suisse", sessionSlug: "zurich", categoryId: 8, t: ["09:00-17:30"], o: ["09:00-11:30"] },
  { id: 97, name: "ASX 200", sessionSlug: "sydney", categoryId: 8, t: ["10:00-16:00"], o: ["10:00-12:00"] },
  { id: 98, name: "Russell 2000", sessionSlug: "new-york", categoryId: 8, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 99, name: "IBEX 35", sessionSlug: "madrid", categoryId: 8, t: ["09:00-17:30"], o: ["09:00-11:30"] },
  { id: 100, name: "TUNINDEX (Bourse de Tunis)", sessionSlug: "tunis", categoryId: 8, t: ["09:00-12:00"], o: ["09:00-10:30"] },
  { id: 101, name: "TUNINDEX20 (Bourse de Tunis)", sessionSlug: "tunis", categoryId: 8, t: ["09:00-12:00"], o: ["09:00-10:30"] },
];

// Matières premières (catégorie 9)
const commodityRows: Row[] = [
  { id: 102, name: "Or (XAU/USD)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-12:00"] },
  { id: 103, name: "Argent (XAG/USD)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-12:00"] },
  { id: 104, name: "Pétrole WTI", sessionSlug: "new-york", categoryId: 9, t: ["09:00-14:30"], o: ["09:00-11:30"] },
  { id: 105, name: "Pétrole Brent", sessionSlug: "london", categoryId: 9, t: ["08:00-17:00"], o: ["08:00-10:30"] },
  { id: 106, name: "Maïs", sessionSlug: "chicago", categoryId: 9, t: ["08:30-13:20"], o: ["08:30-11:30"] },
  { id: 107, name: "Soja", sessionSlug: "chicago", categoryId: 9, t: ["08:30-13:20"], o: ["08:30-11:30"] },
  { id: 108, name: "Blé", sessionSlug: "chicago", categoryId: 9, t: ["08:30-13:20"], o: ["08:30-11:30"] },
  { id: 109, name: "Platine (XPT/USD)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-12:00"] },
  { id: 110, name: "Palladium (XPD/USD)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-12:00"] },
  { id: 111, name: "Sucre", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:00-11:00"] },
  { id: 112, name: "Café Arabica", sessionSlug: "new-york", categoryId: 9, t: ["08:15-13:30"], o: ["08:15-11:00"] },
  { id: 113, name: "Cuivre (HG)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-12:00"] },
  { id: 114, name: "Cacao", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:00-11:00"] },
  { id: 115, name: "Gaz naturel (Henry Hub)", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:30-11:30"] },
  { id: 116, name: "Coton", sessionSlug: "new-york", categoryId: 9, t: ["08:00-17:00"], o: ["08:00-11:00"] },
];

// Actions / bourses (catégorie 10)
const stockRows: Row[] = [
  { id: 117, name: "NYSE (USA)", sessionSlug: "new-york", categoryId: 10, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 118, name: "NASDAQ (USA)", sessionSlug: "new-york", categoryId: 10, t: ["09:30-16:00"], o: ["09:30-11:30"] },
  { id: 119, name: "Euronext (Europe)", sessionSlug: "paris", categoryId: 10, t: ["09:00-17:30"], o: ["09:00-11:30"] },
  { id: 120, name: "Tokyo Stock Exchange", sessionSlug: "tokyo", categoryId: 10, t: ["09:00-11:30", "12:30-15:30"], o: ["09:00-11:00"] },
  { id: 121, name: "Bourse de Shanghai", sessionSlug: "shanghai", categoryId: 10, t: ["09:30-11:30", "13:00-15:00"], o: ["09:30-11:00"] },
  { id: 122, name: "Bourse de Hong Kong", sessionSlug: "hong-kong", categoryId: 10, t: ["09:30-12:00", "13:00-16:00"], o: ["09:30-11:30"] },
  { id: 123, name: "Bourse de Sydney", sessionSlug: "sydney", categoryId: 10, t: ["10:00-16:00"], o: ["10:00-12:00"] },
  { id: 124, name: "Bourse de Tunis (Marché principal)", sessionSlug: "tunis", categoryId: 10, t: ["09:00-12:00"], o: ["09:00-10:30"] },
];

// Crypto (catégorie 11) — session global-24-7, jours 1-7, OPTIMAL aussi 1-7
const cryptoRows: Row[] = [
  { id: 125, name: "Bitcoin (BTC)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "America/New_York", oDays: SEVEN },
  { id: 126, name: "Ripple (XRP)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "America/New_York", oDays: SEVEN },
  { id: 127, name: "Cardano (ADA)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
  { id: 128, name: "Litecoin (LTC)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
  { id: 129, name: "Solana (SOL)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
  { id: 130, name: "Ethereum (ETH)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
  { id: 131, name: "BNB (BNB)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
  { id: 132, name: "Dogecoin (DOGE)", sessionSlug: "global-24-7", categoryId: 11, t: ["00:00-24:00"], o: ["08:00-12:00"], tz: "UTC", oDays: SEVEN },
];

// ETF (catégorie 12) — session new-york
const etfNames = [
  "SPY (S&P 500 ETF)",
  "QQQ (Nasdaq 100 ETF)",
  "DIA (Dow Jones ETF)",
  "IWM (Russell 2000 ETF)",
  "VTI (Total Market ETF)",
  "EEM (Emerging Markets ETF)",
  "XLF (Financials ETF)",
  "XLE (Energy ETF)",
];
const etfRows: Row[] = etfNames.map((name, i) => ({
  id: 133 + i,
  name,
  sessionSlug: "new-york",
  categoryId: 12,
  t: ["09:30-16:00"],
  o: ["10:30-16:00"],
}));

// Futures (catégorie 13) — CME_NIGHT : 18:00 -> 17:00 J+1 (1080 -> 2460), jours 7,1,2,3,4
const futuresRows: Row[] = [
  {
    id: 141,
    name: "S&P500 (CME)",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["09:30-11:30"],
  },
  { id: 142, name: "DAX Futures", sessionSlug: "berlin", categoryId: 13, t: ["01:15-22:00"], o: ["09:00-11:30"] },
  { id: 143, name: "Euro STOXX 50", sessionSlug: "berlin", categoryId: 13, t: ["01:15-22:00"], o: ["09:00-11:30"] },
  { id: 144, name: "Nikkei 225 Futures", sessionSlug: "tokyo", categoryId: 13, t: ["08:30-15:15"], o: ["09:00-11:00"] },
  { id: 145, name: "Hang Seng Futures", sessionSlug: "hong-kong", categoryId: 13, t: ["09:15-16:30"], o: ["09:30-11:30"] },
  {
    id: 146,
    name: "Crude Oil (Énergie)",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["09:00-11:30"],
  },
  {
    id: 147,
    name: "Natural Gas Futures (NG)",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["08:30-11:30"],
  },
  {
    id: 148,
    name: "Russell 2000 Futures",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["09:30-11:30"],
  },
  {
    id: 149,
    name: "Nasdaq-100 Futures",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["09:30-11:30"],
  },
  {
    id: 150,
    name: "Gold Futures (GC)",
    sessionSlug: "new-york",
    categoryId: 13,
    t: [],
    tExtra: [CME_TRADING(SESSION_TZ["new-york"])],
    o: ["08:30-12:00"],
  },
];

// Forex : libellé « Session <ville> » sur la plage TRADING
const withForexLabels = (rows: InstrumentSeed[]): InstrumentSeed[] =>
  rows.map((inst) => ({
    ...inst,
    windows: inst.windows.map((win) =>
      win.kind === "TRADING"
        ? { ...win, label: win.label ?? `${FOREX_T_LABEL} ${sessionCity(inst.sessionSlug)}` }
        : win,
    ),
  }));

export const INSTRUMENTS: InstrumentSeed[] = withForexLabels(
  build([...sessionRows, ...indexRows, ...commodityRows, ...stockRows, ...cryptoRows, ...etfRows, ...futuresRows]),
);
