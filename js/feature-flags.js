export const featureFlags = Object.freeze({
  academy_enabled: import.meta.env.VITE_ACADEMY_ENABLED !== 'false'
});
