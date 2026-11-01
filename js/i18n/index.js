import fr from './locales/fr.js';
import en from './locales/en.js';
import ar from './locales/ar.js';

export const DEFAULT_LANGUAGE = 'fr';
export const SUPPORTED_LANGUAGES = ['fr', 'en', 'ar'];

const dictionaries = { fr, en, ar };
let currentLanguage = DEFAULT_LANGUAGE;

const getTranslation = (key, language = currentLanguage) => {
  return key.split('.').reduce((value, part) => value?.[part], dictionaries[language]) ?? key;
};

export const getLanguage = () => currentLanguage;

export const t = (key) => getTranslation(key);

export const applyTranslations = (root = document) => {
  const elements = [];
  if (root instanceof Element && root.hasAttribute('data-i18n')) elements.push(root);
  elements.push(...root.querySelectorAll('[data-i18n]'));

  elements.forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });

  const attributeElements = [];
  if (root instanceof Element && root.hasAttribute('data-i18n-attr')) attributeElements.push(root);
  attributeElements.push(...root.querySelectorAll('[data-i18n-attr]'));
  attributeElements.forEach((element) => {
    element.dataset.i18nAttr.split(';').forEach((entry) => {
      const [attribute, key] = entry.split(':').map((part) => part.trim());
      if (attribute && key) element.setAttribute(attribute, t(key));
    });
  });
};

export const setLanguage = (language) => {
  if (!SUPPORTED_LANGUAGES.includes(language)) {
    throw new RangeError(`Unsupported language: ${language}`);
  }

  currentLanguage = language;
  document.documentElement.lang = language;
  document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
  localStorage.setItem('language', language);
  applyTranslations();
  document.dispatchEvent(new CustomEvent('languagechange', { detail: { language } }));
};

export const onLanguageChange = (listener) => {
  const handleChange = (event) => listener(event.detail.language);
  document.addEventListener('languagechange', handleChange);
  return () => document.removeEventListener('languagechange', handleChange);
};

export const initI18n = () => {
  const storedLanguage = localStorage.getItem('language');
  const initialLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage)
    ? storedLanguage
    : DEFAULT_LANGUAGE;
  setLanguage(initialLanguage);

  document.querySelectorAll('[data-language-switcher]').forEach((slot) => {
    mountLanguageSwitcher(slot);
  });
};

const mountLanguageSwitcher = (slot) => {
  const wrapper = document.createElement('div');
  wrapper.className = 'language-switcher';

  const trigger = document.createElement('button');
  trigger.className = 'icon-btn language-trigger';
  trigger.type = 'button';
  trigger.setAttribute('aria-haspopup', 'true');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', t('language.select'));
  trigger.title = t('language.select');
  trigger.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><path d="M2 12h20"></path><path d="M12 2a15.3 15.3 0 0 1 0 20"></path><path d="M12 2a15.3 15.3 0 0 0 0 20"></path></svg>';

  const menu = document.createElement('div');
  menu.className = 'language-menu';
  menu.hidden = true;
  menu.setAttribute('role', 'group');
  menu.setAttribute('aria-label', t('language.select'));

  const options = [
    { code: 'fr', key: 'language.french' },
    { code: 'en', key: 'language.english' },
    { code: 'ar', key: 'language.arabic' }
  ];

  options.forEach(({ code, key }) => {
    const option = document.createElement('button');
    option.type = 'button';
    option.className = 'language-option';
    option.dataset.language = code;
    option.setAttribute('aria-pressed', String(code === currentLanguage));
    option.textContent = t(key);
    option.addEventListener('click', () => {
      setLanguage(code);
      setMenuOpen(false);
    });
    menu.appendChild(option);
  });

  const setMenuOpen = (open) => {
    menu.hidden = !open;
    trigger.setAttribute('aria-expanded', String(open));
  };

  trigger.addEventListener('click', () => setMenuOpen(menu.hidden));
  wrapper.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      setMenuOpen(false);
      trigger.focus();
    }
  });
  document.addEventListener('click', (event) => {
    if (!wrapper.contains(event.target)) setMenuOpen(false);
  });
  document.addEventListener('languagechange', () => {
    trigger.setAttribute('aria-label', t('language.select'));
    trigger.title = t('language.select');
    menu.setAttribute('aria-label', t('language.select'));
    menu.querySelectorAll('.language-option').forEach((option) => {
      option.textContent = t(`language.${{ fr: 'french', en: 'english', ar: 'arabic' }[option.dataset.language]}`);
      option.setAttribute('aria-pressed', String(option.dataset.language === currentLanguage));
    });
  });

  wrapper.append(trigger, menu);
  slot.appendChild(wrapper);
};
