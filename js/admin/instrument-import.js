const REQUIRED_COLUMNS = [
  'name',
  'description',
  'category',
  'session',
  'trading_windows',
  'optimal_windows',
];

const normalize = (value) => String(value ?? '')
  .trim()
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '');

const parseCsvRecords = (text) => {
  const firstLine = text.split(/\r?\n/, 1)[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const delimiter = semicolonCount > commaCount ? ';' : ',';
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
    } else if (char === '"' && cell.length === 0) {
      quoted = true;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(cell);
      if (row.some((value) => value.trim())) rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += char;
    }
  }

  if (quoted) throw new Error('Le fichier CSV contient un champ entre guillemets qui n’est pas terminé.');
  row.push(cell);
  if (row.some((value) => value.trim())) rows.push(row);
  return rows;
};

const parseTime = (value, isEnd) => {
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > (isEnd ? 48 : 23) || (isEnd && hour === 48 && minute > 0)) return null;
  return hour * 60 + minute;
};

const parseDays = (value) => {
  const days = new Set();
  for (const part of value.split(',')) {
    const match = /^([1-7])(?:-([1-7]))?$/.exec(part.trim());
    if (!match) return null;
    const start = Number(match[1]);
    const end = Number(match[2] || match[1]);
    if (end < start) return null;
    for (let day = start; day <= end; day += 1) days.add(day);
  }
  return [...days].sort((a, b) => a - b);
};

const parseWindows = (text, kind, lineNumber) => {
  if (!text.trim()) throw new Error(`Ligne ${lineNumber} : la colonne ${kind === 'TRADING' ? 'trading_windows' : 'optimal_windows'} est obligatoire.`);
  return text.split('|').map((rawWindow, index) => {
    const value = rawWindow.trim();
    const separator = value.lastIndexOf('@');
    const timeAndDays = separator >= 0 ? value.slice(0, separator).trim() : '';
    const timezone = separator >= 0 ? value.slice(separator + 1).trim() : '';
    const labelSeparator = timeAndDays.indexOf('~');
    const label = labelSeparator >= 0 ? timeAndDays.slice(0, labelSeparator).trim() : '';
    const schedule = labelSeparator >= 0 ? timeAndDays.slice(labelSeparator + 1).trim() : timeAndDays;
    const pattern = /^([1-7](?:-[1-7])?(?:,[1-7](?:-[1-7])?)*)\s+(\d{1,2}:\d{2})-(\d{1,2}:\d{2})$/;
    const match = pattern.exec(schedule);

    if (!match || !timezone) {
      throw new Error(`Ligne ${lineNumber}, plage ${index + 1} : format invalide. Exemple : 1-5 08:00-17:00@Europe/Paris.`);
    }

    const days = parseDays(match[1]);
    const startMinute = parseTime(match[2], false);
    const endMinute = parseTime(match[3], true);
    if (!days || startMinute === null || endMinute === null || endMinute <= startMinute) {
      throw new Error(`Ligne ${lineNumber}, plage ${index + 1} : jours ou heures invalides. La fin doit être après le début (utilisez 26:00 pour 02:00 le lendemain).`);
    }

    try {
      new Intl.DateTimeFormat('fr', { timeZone: timezone });
    } catch {
      throw new Error(`Ligne ${lineNumber}, plage ${index + 1} : fuseau horaire inconnu « ${timezone} ».`);
    }

    return {
      kind,
      days,
      startMinute,
      endMinute,
      timezone,
      label: label || null,
    };
  });
};

const resolveNamedItem = (value, items, label, lineNumber) => {
  const matches = items.filter((item) => normalize(item.name) === normalize(value));
  if (matches.length !== 1) {
    throw new Error(matches.length
      ? `Ligne ${lineNumber} : ${label} « ${value} » est ambiguë.`
      : `Ligne ${lineNumber} : ${label} « ${value || '(vide)'} » introuvable.`);
  }
  return matches[0];
};

export const parseInstrumentCsv = (text, { categories, sessions }) => {
  const rows = parseCsvRecords(text.replace(/^\uFEFF/, ''));
  if (!rows.length) throw new Error('Le fichier CSV est vide.');

  const headers = rows[0].map((header) => normalize(header).replace(/\s+/g, '_'));
  const duplicates = headers.filter((header, index) => headers.indexOf(header) !== index);
  if (duplicates.length) throw new Error(`En-têtes en double : ${[...new Set(duplicates)].join(', ')}.`);
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));
  if (missing.length) {
    throw new Error(`Colonnes manquantes : ${missing.join(', ')}. Téléchargez le modèle CSV pour obtenir les bons en-têtes.`);
  }

  const indexes = Object.fromEntries(REQUIRED_COLUMNS.map((column) => [column, headers.indexOf(column)]));
  const instruments = [];
  const errors = [];
  const dataRows = rows.slice(1);
  if (dataRows.length > 100) {
    throw new Error('Le fichier ne peut pas contenir plus de 100 instruments à la fois.');
  }

  dataRows.forEach((row, index) => {
    const lineNumber = index + 2;
    if (row.length !== headers.length) {
      errors.push(`Ligne ${lineNumber} : ${row.length < headers.length ? 'colonnes manquantes' : 'trop de colonnes'}. Vérifiez les séparateurs et les guillemets.`);
      return;
    }
    const value = (column) => row[indexes[column]].trim();
    try {
      const name = value('name');
      if (!name) throw new Error(`Ligne ${lineNumber} : le nom de l’instrument est obligatoire.`);
      const category = resolveNamedItem(value('category'), categories, 'catégorie', lineNumber);
      const session = resolveNamedItem(value('session'), sessions, 'séance', lineNumber);
      const windows = [
        ...parseWindows(value('trading_windows'), 'TRADING', lineNumber),
        ...parseWindows(value('optimal_windows'), 'OPTIMAL', lineNumber),
      ];
      if (windows.length > 12) throw new Error(`Ligne ${lineNumber} : 12 plages maximum par instrument.`);

      instruments.push({
        name,
        description: value('description'),
        categoryId: category.id,
        sessionId: session.id,
        windows,
      });
    } catch (error) {
      errors.push(error.message);
    }
  });

  if (!dataRows.length) errors.push('Ajoutez au moins une ligne d’instrument sous les en-têtes.');
  return { instruments, errors, totalRows: dataRows.length };
};
