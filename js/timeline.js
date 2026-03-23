import { convertHour, isTimeInPeriod } from './timezone.js';
import { DateTime } from 'https://cdn.jsdelivr.net/npm/luxon@3.4.4/build/es6/luxon.js';

export const renderForexTimeline = (containerEl, forexSessions, targetTz, seasonKey) => {
  containerEl.innerHTML = '';
  
  // Create relative canvas
  const canvas = document.createElement('div');
  canvas.className = 'timeline-canvas';
  
  // Create inner grid for left/right padding
  const grid = document.createElement('div');
  grid.className = 'timeline-grid';
  grid.style.position = 'absolute';
  grid.style.top = '0';
  grid.style.bottom = '0';
  grid.style.left = '40px';
  grid.style.right = '40px';
  canvas.appendChild(grid);
  
  // Background ticks
  const timeAxis = document.createElement('div');
  timeAxis.className = 'time-axis';
  // Also extend timeAxis perfectly inside the grid
  timeAxis.style.left = '0';
  timeAxis.style.width = '100%';

  for (let i = 0; i <= 24; i++) {
    const tick = document.createElement('div');
    tick.className = 'time-tick';
    tick.style.left = `${(i / 24) * 100}%`;
    tick.textContent = `${i.toString().padStart(2, '0')}:00`;
    timeAxis.appendChild(tick);
  }
  grid.appendChild(timeAxis);

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

  // Draw Patterns (Overlaps)
  overlapPeriods.forEach(p => {
    drawSegment(grid, p.st, p.ed, 'pattern-box', 20, 380, '', -1, 0);
  });

  const now = DateTime.now().setZone(targetTz);
  const currentDec = now.hour + now.minute / 60 + now.second / 3600;

  // Draw Sessions
  computedSessions.forEach(sess => {
    drawSegment(grid, sess.st, sess.ed, 'capsule', sess.yOffset + 35, 50, sess, 10, currentDec);
  });

  // Draw Current Local Time indicator
  // now and currentDec were calculated just before the sess Loop
  
  const currentLine = document.createElement('div');
  currentLine.className = 'current-time-line';
  currentLine.style.left = `${(currentDec / 24) * 100}%`;
  currentLine.style.transform = 'translateX(-50%)';
  currentLine.title = `Heure actuelle: ${now.toFormat('HH:mm')} (${targetTz})`;
  grid.appendChild(currentLine);

  containerEl.appendChild(canvas);
};

const drawSegment = (canvas, st, ed, type, top, height, sessData, zIndex, currentDec) => {
  const isPattern = type === 'pattern-box';
  
  const createBar = (l, w, isSplitContinuation = false) => {
    const bar = document.createElement('div');
    bar.className = 'session-bar';
    
    if (isPattern) {
        bar.className += ' pattern-box';
        bar.style.opacity = '0.4';
        bar.style.background = 'repeating-linear-gradient(45deg, rgba(255,255,255,0.2), rgba(255,255,255,0.2) 5px, rgba(0,0,0,0.1) 5px, rgba(0,0,0,0.1) 10px)';
        bar.style.backgroundColor = '#666';
    } else {
        const isOpen = isTimeInPeriod(currentDec, st, ed);
        bar.classList.add(isOpen ? 'is-open' : 'is-closed');
        
        let statusText = '';
        if (isOpen) {
           // simple string for now, will dynamic update if needed
           statusText = 'OUVERT'; 
        } else {
           statusText = `From ${formatTime(st)} To ${formatTime(ed)}`;
        }

        // Add flag only on main part (not continuation)
        // Utiliser un chemin absolu depuis la racine afin d'éviter les erreurs de résolution
        // sur des environnements de déploiement (Vercel, Netlify, etc.).
        const flagHtml = !isSplitContinuation ? `<div class="session-flag flag-left"><img src="/assets/${sessData.flag}" alt="${sessData.name} Flag" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;"></div>` : '';

        bar.innerHTML = `
          ${flagHtml}
          <div class="capsule-header">${sessData.name}</div>
          <div class="capsule-body">${statusText}</div>
        `;
    }
    
    bar.style.top = `${top}px`;
    if (isPattern) {
        bar.style.height = `${height}px`;
    } // capsules have fixed CSS height
    
    bar.style.left = `${l}%`;
    bar.style.width = `${w}%`;
    bar.style.zIndex = zIndex;
    
    if (sessData && sessData.name) {
        bar.title = `${sessData.name} (${formatTime(Math.round(st))} - ${formatTime(Math.round(ed))})`;
    }
    canvas.appendChild(bar);
  };

  if (st < ed) {
    createBar((st / 24) * 100, ((ed - st) / 24) * 100);
  } else {
    // intervalle coupé
    createBar((st / 24) * 100, ((24 - st) / 24) * 100);
    createBar(0, (ed / 24) * 100, true);
  }
};

const formatTime = (hourDecimal) => {
   if (hourDecimal === 24) return "00:00";
   const h = Math.floor(hourDecimal);
   const m = Math.round((hourDecimal - h) * 60);
   return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};
