export const seasons = {
  winter: "2024-01-15T12:00:00Z", // Date de référence Hiver
  summer: "2024-07-15T12:00:00Z"  // Date de référence Eté
};

// Les sessions Forex sont définies dans leur heure LOCALE. 
// Le code calculera les équivalents dynamiquement.
export const forexSessions = [
  { 
    id: 'sydney', 
    name: "SYDNEY", 
    flag: "sydney.png",
    startHour: 8, 
    endHour: 17, 
    timezone: "Australia/Sydney", 
    color: "var(--color-sydney)",
    yOffset: 0
  },
  { 
    id: 'tokyo', 
    name: "TOKYO", 
    flag: "japan.png",
    startHour: 8, 
    endHour: 17, 
    timezone: "Asia/Tokyo", 
    color: "var(--color-tokyo)",
    yOffset: 65
  },
  { 
    id: 'frankfurt', 
    name: "FRANKFURT", 
    flag: "germany.png",
    startHour: 8, 
    endHour: 17, 
    timezone: "Europe/Berlin", 
    color: "var(--color-frankfurt)",
    yOffset: 130
  },
  { 
    id: 'london', 
    name: "LONDON", 
    flag: "united-kingdom.png",
    startHour: 8, 
    endHour: 17, 
    timezone: "Europe/London", 
    color: "var(--color-london)",
    yOffset: 195
  },
  { 
    id: 'newyork', 
    name: "NEW YORK", 
    flag: "united-states.png",
    startHour: 8, 
    endHour: 17, 
    timezone: "America/New_York", 
    color: "var(--color-newyork)",
    yOffset: 260
  }
];

// Instruments de trading
const categories = [
  {
    name: "Forex",
    id: "forex",
    items: [
      { name: "EUR-USD (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 13, optimalEndHour: 17, optimalTz: "Europe/London" },
      { name: "GBP-USD (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 13, optimalEndHour: 17, optimalTz: "Europe/London" },
      { name: "EUR-GBP (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "Europe/London" },
      { name: "USD-JPY (New York)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "USD-CAD (New York)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "AUD-USD (New York)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "USD-JPY (Tokyo)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 18, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 14, optimalTz: "Asia/Tokyo" },
      { name: "AUD-JPY (Tokyo)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 18, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 14, optimalTz: "Asia/Tokyo" },
      { name: "NZD-USD (Sydney)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Australia/Sydney", optimalStartHour: 9, optimalEndHour: 14, optimalTz: "Australia/Sydney" },
      { name: "EUR-AUD (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "Europe/London" },
      { name: "USD-CNY (Asie)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 18, openTz: "Asia/Shanghai", optimalStartHour: 9, optimalEndHour: 12, optimalTz: "Asia/Shanghai" },
      { name: "GBP-JPY (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "Europe/London" },
      { name: "EUR-JPY (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "Europe/London" },
      { name: "USD-CHF (Londres)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 13, optimalEndHour: 17, optimalTz: "Europe/London" },
      { name: "USD-SGD (Asie)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 18, openTz: "Asia/Singapore", optimalStartHour: 9, optimalEndHour: 12, optimalTz: "Asia/Singapore" },
      { name: "USD-MXN (New York)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "America/New_York" }
    ]
  },
  {
    name: "Indices",
    id: "indices",
    items: [
      { name: "S&P500", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Dow Jones", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Nasdaq 100", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "DAX30", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Berlin", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Berlin" },
      { name: "FTSE100", openDay: 1, closeDay: 5, openHour: 8, closeHour: 16.5, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 10.5, optimalTz: "Europe/London" },
      { name: "CAC40", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Paris", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Paris" },
      { name: "Nikkei 225", openDay: 1, closeDay: 5, openHour: 9, closeHour: 15, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 11, optimalTz: "Asia/Tokyo" },
      { name: "Hang Seng", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "Asia/Hong_Kong", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "Asia/Hong_Kong" },
      { name: "SMI Suisse", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Zurich", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Zurich" },
      { name: "ASX 200", openDay: 1, closeDay: 5, openHour: 10, closeHour: 16, openTz: "Australia/Sydney", optimalStartHour: 10, optimalEndHour: 12, optimalTz: "Australia/Sydney" },
      { name: "Russell 2000", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "IBEX 35", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Madrid", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Madrid" },
      { name: "TUNINDEX (Bourse de Tunis)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 12, openTz: "Africa/Tunis", optimalStartHour: 9, optimalEndHour: 10.5, optimalTz: "Africa/Tunis" },
      { name: "TUNINDEX20 (Bourse de Tunis)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 12, openTz: "Africa/Tunis", optimalStartHour: 9, optimalEndHour: 10.5, optimalTz: "Africa/Tunis" }
    ]
  },
  {
    name: "Matières Premières",
    id: "commodities",
    items: [
      { name: "Or (XAU/USD)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Argent (XAG/USD)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Pétrole WTI", openDay: 1, closeDay: 5, openHour: 9, closeHour: 14.5, openTz: "America/New_York", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Pétrole Brent", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Europe/London", optimalStartHour: 8, optimalEndHour: 10.5, optimalTz: "Europe/London" },
      { name: "Maïs", openDay: 1, closeDay: 5, openHour: 8.5, closeHour: 13.33, openTz: "America/Chicago", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/Chicago" },
      { name: "Soja", openDay: 1, closeDay: 5, openHour: 8.5, closeHour: 13.33, openTz: "America/Chicago", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/Chicago" },
      { name: "Blé", openDay: 1, closeDay: 5, openHour: 8.5, closeHour: 13.33, openTz: "America/Chicago", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/Chicago" },
      { name: "Platine (XPT/USD)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Palladium (XPD/USD)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Sucre", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "America/New_York" },
      { name: "Café Arabica", openDay: 1, closeDay: 5, openHour: 8.25, closeHour: 13.5, openTz: "America/New_York", optimalStartHour: 8.25, optimalEndHour: 11, optimalTz: "America/New_York" },
      { name: "Cuivre (HG)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Cacao", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "America/New_York" },
      { name: "Gaz naturel (Henry Hub)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Coton", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 11, optimalTz: "America/New_York" }
    ]
  },
  {
    name: "Actions",
    id: "stocks",
    items: [
      { name: "NYSE (USA)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "NASDAQ (USA)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Euronext (Europe)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Paris", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Paris" },
      { name: "Tokyo Stock Exchange", openDay: 1, closeDay: 5, openHour: 9, closeHour: 15, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 11, optimalTz: "Asia/Tokyo" },
      { name: "Bourse de Shanghai", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 15, openTz: "Asia/Shanghai", optimalStartHour: 9.5, optimalEndHour: 11, optimalTz: "Asia/Shanghai" },
      { name: "Bourse de Hong Kong", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "Asia/Hong_Kong", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "Asia/Hong_Kong" },
      { name: "Bourse de Sydney", openDay: 1, closeDay: 5, openHour: 10, closeHour: 16, openTz: "Australia/Sydney", optimalStartHour: 10, optimalEndHour: 12, optimalTz: "Australia/Sydney" },
      { name: "Bourse de Tunis (Marché principal)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 12, openTz: "Africa/Tunis", optimalStartHour: 9, optimalEndHour: 10.5, optimalTz: "Africa/Tunis" }
    ]
  },
  {
    name: "Cryptomonnaies",
    id: "crypto",
    items: [
      { name: "Bitcoin (BTC)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Ripple (XRP)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Cardano (ADA)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" },
      { name: "Litecoin (LTC)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" },
      { name: "Solana (SOL)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" },
      { name: "Ethereum (ETH)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" },
      { name: "BNB (BNB)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" },
      { name: "Dogecoin (DOGE)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "UTC", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "UTC" }
    ]
  },
  {
    name: "ETF",
    id: "etf",
    items: [
      { name: "SPY (S&P 500 ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "QQQ (Nasdaq 100 ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "DIA (Dow Jones ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "IWM (Russell 2000 ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "VTI (Total Market ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "EEM (Emerging Markets ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "XLF (Financials ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" },
      { name: "XLE (Energy ETF)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 10.5, optimalEndHour: 16, optimalTz: "America/New_York" }
    ]
  },
  {
    name: "Futures",
    id: "futures",
    items: [
      { name: "S&P500 (CME)", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "DAX Futures", openDay: 1, closeDay: 5, openHour: 1.25, closeHour: 22, openTz: "Europe/Berlin", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Berlin" },
      { name: "Euro STOXX 50", openDay: 1, closeDay: 5, openHour: 1.25, closeHour: 22, openTz: "Europe/Berlin", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Berlin" },
      { name: "Nikkei 225 Futures", openDay: 1, closeDay: 5, openHour: 8.5, closeHour: 15.25, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 11, optimalTz: "Asia/Tokyo" },
      { name: "Hang Seng Futures", openDay: 1, closeDay: 5, openHour: 9.25, closeHour: 16.5, openTz: "Asia/Hong_Kong", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "Asia/Hong_Kong" },
      { name: "Crude Oil (Énergie)", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Natural Gas Futures (NG)", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Russell 2000 Futures", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Nasdaq-100 Futures", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Gold Futures (GC)", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 8.5, optimalEndHour: 12, optimalTz: "America/New_York" }
    ]
  }
];

// Negociation ("orange") and optimal ("green") bars, expressed as absolute UTC
// decimal-hour windows. Multiple segments model the daily trading pauses.
// 21:59 = 21 + 59/60, 22:05 = 22 + 5/60.
const CATEGORY_SEGMENTS = {
  forex: { schedule: [[0, 21 + 59 / 60], [22 + 5 / 60, 24]], optimal: [[8, 12], [14.5, 21]] },
  indices: { schedule: [[0, 22], [22 + 5 / 60, 24]], optimal: [[14.5, 21]] },
  commodities: { schedule: [[0, 21 + 59 / 60], [23, 24]], optimal: [[14, 20]] },
  stocks: { schedule: [[0, 24]], optimal: [[9, 17]] },
  crypto: { schedule: [[0, 22], [22 + 5 / 60, 24]], optimal: [[14, 22]] },
  etf: { schedule: [[14.5, 21]], optimal: [[15.5, 21]] }
};

categories.forEach(category => {
  const segments = CATEGORY_SEGMENTS[category.id];
  if (!segments) return;
  category.items.forEach(item => {
    item.scheduleSegments = segments.schedule;
    item.optimalSegments = segments.optimal;
  });
});

export const instrumentCategories = categories;
