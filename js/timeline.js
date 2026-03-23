import { convertHour, isTimeInPeriod } from './timezone.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';

export const renderForexTimeline = (containerEl, forexSessions, targetTz, seasonKey) => {
  containerEl.innerHTML = '';
  
  // Create relative canvas
  const canvas = document.createElement('div');
  canvas.className = 'timeline-canvas';
  
  // Background ticks
  const timeAxis = document.createElement('div');
  timeAxis.className = 'time-axis';
  for (let i = 0; i < 24; i++) {
    const tick = document.createElement('div');
    tick.className = 'time-tick';
    tick.textContent = `${i.toString().padStart(2, '0')}h`;
    timeAxis.appendChild(tick);
  }
  canvas.appendChild(timeAxis);

  // Compute intervals
  const computedSessions = forexSessions.map(sess => {
    // startHour/endHour are local to market
    let st = convertHour(sess.startHour, sess.timezone, targetTz, seasonKey);
    let ed = convertHour(sess.endHour, sess.timezone, targetTz, seasonKey);
    return { ...sess, st, ed };
  });

  // Calculate Overlaps! Every 30 minutes, calculate how many sessions are active.
  let overlapPeriods = [];
  let inOverlap = false;
  let overlapStart = null;
  
  for(let m = 0; m < 24 * 60; m += 15) { // Check every 15 mins for overlap
    const hourDec = m / 60;
    const activeSessions = computedSessions.filter(s => isTimeInPeriod(hourDec, s.st, s.ed));
    
    if (activeSessions.length >= 2) { // 2 or more overlapping
      if (!inOverlap) {
        inOverlap = true;
        overlapStart = hourDec;
      }
    } else {
      if (inOverlap) {
        inOverlap = false;
        overlapPeriods.push({ st: overlapStart, ed: hourDec });
      }
    }
  }
  
  // Special case if midnight wrap
  if (inOverlap) {
    if (overlapPeriods.length > 0 && overlapPeriods[0].st === 0) {
       overlapPeriods[0].st = overlapStart; // Merge
    } else {
       overlapPeriods.push({ st: overlapStart, ed: 24 });
    }
  }

  // Draw Overlaps (Background pattern)
  overlapPeriods.forEach(p => {
    drawSegment(canvas, p.st, p.ed, 'pattern-box', 20, 100, '', -1);
  });

  // Draw Sessions
  computedSessions.forEach(sess => {
    drawSegment(canvas, sess.st, sess.ed, sess.color, sess.yOffset + 25, 20, sess.name, 10);
  });

  // Draw Current Local Time indicator (if we are displaying current time)
  // Actually, we show the current time in the target timezone!
  const now = DateTime.now().setZone(targetTz);
  const currentDec = now.hour + now.minute / 60;
  
  const currentLine = document.createElement('div');
  currentLine.className = 'current-time-line';
  currentLine.style.left = `${(currentDec / 24) * 100}%`;
  currentLine.title = `Heure actuelle: ${now.toFormat('HH:mm')} (${targetTz})`;
  canvas.appendChild(currentLine);

  containerEl.appendChild(canvas);
};

const drawSegment = (canvas, st, ed, bgVar, top, height, text, zIndex) => {
  const isPattern = bgVar === 'pattern-box';
  
  const createBar = (l, w) => {
    const bar = document.createElement('div');
    bar.className = 'session-bar';
    if (isPattern) {
        bar.className += ' pattern-box';
        bar.style.opacity = '0.4';
    } else {
        bar.style.background = bgVar;
    }
    bar.style.top = `${top}px`;
    bar.style.height = `${height}px`;
    bar.style.left = `${l}%`;
    bar.style.width = `${w}%`;
    bar.style.zIndex = zIndex;
    
    if (text) {
        bar.textContent = text;
        bar.title = `${text} (${formatTime(Math.round(st))} - ${formatTime(Math.round(ed))})`;
    }
    canvas.appendChild(bar);
  };

  if (st < ed) {
    // Normal interval (e.g. 8 to 17)
    createBar((st / 24) * 100, ((ed - st) / 24) * 100);
  } else {
    // Wrap around interval (e.g. 21 to 6)
    // Draw st to 24
    createBar((st / 24) * 100, ((24 - st) / 24) * 100);
    // Draw 0 to ed
    createBar(0, (ed / 24) * 100);
  }
};

const formatTime = (hourDecimal) => {
   if (hourDecimal === 24) return "00:00";
   const h = Math.floor(hourDecimal);
   const m = Math.round((hourDecimal - h) * 60);
   return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
