export const seasons = {
  winter: "2024-01-15T12:00:00Z", // Date de référence Hiver
  summer: "2024-07-15T12:00:00Z"  // Date de référence Eté
};

// Les sessions Forex sont définies dans leur heure LOCALE. 
// Le code calculera les équivalents dynamiquement.
export const forexSessions = [
  { 
    id: 'sydney', 
    name: "Sydney", 
    startHour: 8, 
    endHour: 17, 
    timezone: "Australia/Sydney", 
    color: "var(--color-sydney)",
    yOffset: 0
  },
  { 
    id: 'tokyo', 
    name: "Tokyo", 
    startHour: 8, 
    endHour: 17, 
    timezone: "Asia/Tokyo", 
    color: "var(--color-tokyo)",
    yOffset: 25
  },
  { 
    id: 'london', 
    name: "Londres", 
    startHour: 8, 
    endHour: 17, 
    timezone: "Europe/London", 
    color: "var(--color-london)",
    yOffset: 50
  },
  { 
    id: 'newyork', 
    name: "New York", 
    startHour: 8, 
    endHour: 17, 
    timezone: "America/New_York", 
    color: "var(--color-newyork)",
    yOffset: 75
  }
];

// Instruments de trading
export const instrumentCategories = [
  {
    name: "Forex",
    id: "forex",
    items: [
      { name: "EUR/USD", days: "Dim 23h - Ven 23h (UTC)", openHour: 0, closeHour: 24, optimalStartHour: 8, optimalEndHour: 17, openTz: "Europe/London", optimalTz: "Europe/London" },
      { name: "USD/JPY", days: "Dim 23h - Ven 23h", openHour: 0, closeHour: 24, optimalStartHour: 8, optimalEndHour: 17, openTz: "Asia/Tokyo", optimalTz: "America/New_York" }
    ]
  },
  {
    name: "Indices",
    id: "indices",
    items: [
      { name: "US30 (Dow Jones)", days: "Lun - Ven", openHour: 9.5, closeHour: 16, optimalStartHour: 9.5, optimalEndHour: 16, openTz: "America/New_York", optimalTz: "America/New_York" },
      { name: "DE40 (DAX)", days: "Lun - Ven", openHour: 9, closeHour: 17.5, optimalStartHour: 9, optimalEndHour: 11.5, openTz: "Europe/Berlin", optimalTz: "Europe/Berlin" }
    ]
  },
  {
    name: "Matières Premières",
    id: "commodities",
    items: [
      { name: "Or (XAU/USD)", days: "Dim - Ven", openHour: 8, closeHour: 17, optimalStartHour: 8, optimalEndHour: 17, openTz: "America/New_York", optimalTz: "America/New_York" },
      { name: "Pétrole (WTI)", days: "Dim - Ven", openHour: 9, closeHour: 14.5, optimalStartHour: 9, optimalEndHour: 14.5, openTz: "America/New_York", optimalTz: "America/New_York" }
    ]
  },
  {
    name: "Cryptomonnaies",
    id: "crypto",
    items: [
      { name: "Bitcoin (BTC)", days: "7j/7 - 24h/24", openHour: 0, closeHour: 24, optimalStartHour: 9.5, optimalEndHour: 16, openTz: "America/New_York", optimalTz: "America/New_York" }
    ]
  }
];
