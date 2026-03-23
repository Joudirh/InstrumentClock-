import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';
import { seasons } from './data.js';

// Liste des fuseaux horaires principaux
export const timezonesList = [
  { id: "UTC", label: "UTC (Temps Universel Coordonné)" },
  { id: "Europe/London", label: "Londres, Lisbonne (UTC+0 / UTC+1)" },
  { id: "Africa/Tunis", label: "Tunis, Alger (UTC+1, permanent)" },
  { id: "Europe/Paris", label: "Paris, Berlin, Rome (UTC+1 / UTC+2)" },
  { id: "Europe/Athens", label: "Athènes, Istanbul (UTC+2 / UTC+3)" },
  { id: "Asia/Dubai", label: "Dubaï (UTC+4)" },
  { id: "Asia/Kolkata", label: "Inde (UTC+5:30)" },
  { id: "Asia/Bangkok", label: "Bangkok (UTC+7)" },
  { id: "Asia/Hong_Kong", label: "Hong Kong, Pékin (UTC+8)" },
  { id: "Asia/Tokyo", label: "Tokyo, Séoul (UTC+9)" },
  { id: "Australia/Sydney", label: "Sydney (UTC+10 / UTC+11)" },
  { id: "Pacific/Auckland", label: "Wellington (UTC+12 / UTC+13)" },
  { id: "America/New_York", label: "New York, Toronto (EST / EDT)" },
  { id: "America/Chicago", label: "Chicago (CST / CDT)" },
  { id: "America/Denver", label: "Denver (MST / MDT)" },
  { id: "America/Los_Angeles", label: "Los Angeles (PST / PDT)" },
  { id: "America/Sao_Paulo", label: "São Paulo (UTC-3)" }
];

export const getLocalTimezone = () => {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
};

// Convertit une heure (locale à une zone A) vers le fuseau choisi par l'utilisateur (zone B),
// en tenant compte de la saison sélectionnée.
export const convertHour = (hourDecimal, sourceTz, targetTz, seasonKey) => {
  const referenceDateStr = seasons[seasonKey];
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  
  let sourceDate = DateTime.fromISO(referenceDateStr).setZone(sourceTz);
  sourceDate = sourceDate.set({ hour: h, minute: m, second: 0, millisecond: 0 });

  const targetDate = sourceDate.setZone(targetTz);
  return targetDate.hour + targetDate.minute / 60;
};

// Convertit un Jour et une Heure
export const convertDayHour = (dayN, hourDecimal, sourceTz, targetTz, seasonKey) => {
  const referenceDateStr = seasons[seasonKey]; // Lundi par défaut dans la DB (2024-01-15 est un Lundi)
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  
  let sourceDate = DateTime.fromISO(referenceDateStr).setZone(sourceTz);
  sourceDate = sourceDate.set({ weekday: dayN, hour: h, minute: m, second: 0, millisecond: 0 });

  const targetDate = sourceDate.setZone(targetTz);
  return {
    day: targetDate.weekday,
    hourDec: targetDate.hour + targetDate.minute / 60
  };
};

const DAY_NAMES = {
  1: "Lun", 2: "Mar", 3: "Mer", 4: "Jeu", 5: "Ven", 6: "Sam", 7: "Dim"
};

export const getDayName = (dayNumber) => DAY_NAMES[dayNumber];

export const formatTime = (hourDecimal) => {
  if (hourDecimal === 24) return "00:00";
  const h = Math.floor(hourDecimal);
  const m = Math.round((hourDecimal - h) * 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

// Check if a point in time (decimals) falls within a period
export const isTimeInPeriod = (checkTime, start, end) => {
  // Check if period wraps around midnight
  if (start < end) {
    return checkTime >= start && checkTime <= end;
  } else {
    // start: 22, end: 7 (wraps)
    return checkTime >= start || checkTime <= end;
  }
};
