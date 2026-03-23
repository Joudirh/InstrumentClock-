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
export const instrumentCategories = [
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
      
      { name: "NZD-USD (Sydney)", openDay: 1, closeDay: 5, openHour: 8, closeHour: 17, openTz: "Australia/Sydney", optimalStartHour: 9, optimalEndHour: 14, optimalTz: "Australia/Sydney" }
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
      { name: "Hang Seng", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "Asia/Hong_Kong", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "Asia/Hong_Kong" }
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
      { name: "Blé", openDay: 1, closeDay: 5, openHour: 8.5, closeHour: 13.33, openTz: "America/Chicago", optimalStartHour: 8.5, optimalEndHour: 11.5, optimalTz: "America/Chicago" }
    ]
  },
  {
    name: "Actions",
    id: "stocks",
    items: [
      { name: "NYSE (USA)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "NASDAQ (USA)", openDay: 1, closeDay: 5, openHour: 9.5, closeHour: 16, openTz: "America/New_York", optimalStartHour: 9.5, optimalEndHour: 11.5, optimalTz: "America/New_York" },
      { name: "Euronext (Europe)", openDay: 1, closeDay: 5, openHour: 9, closeHour: 17.5, openTz: "Europe/Paris", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "Europe/Paris" },
      { name: "Tokyo Stock Exchange", openDay: 1, closeDay: 5, openHour: 9, closeHour: 15, openTz: "Asia/Tokyo", optimalStartHour: 9, optimalEndHour: 11, optimalTz: "Asia/Tokyo" }
    ]
  },
  {
    name: "Cryptomonnaies",
    id: "crypto",
    items: [
      { name: "Bitcoin (BTC)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" },
      { name: "Ripple (XRP)", openDay: 1, closeDay: 7, is24_7: true, openHour: 0, closeHour: 24, openTz: "America/New_York", optimalStartHour: 8, optimalEndHour: 12, optimalTz: "America/New_York" }
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
      
      { name: "Crude Oil (Énergie)", openDay: 1, closeDay: 5, openHour: 18, closeHour: 17, openTz: "America/New_York", optimalStartHour: 9, optimalEndHour: 11.5, optimalTz: "America/New_York" }
    ]
  }
];
