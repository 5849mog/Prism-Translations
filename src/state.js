/**
 * 应用全局状态 & 常量
 */
export const TEXT_CACHE_KEY = 'prism_text_cache';
export const WARN_THRESHOLD = 6000;
export const HARD_LIMIT = 7500;
export const API_TIMEOUT_MS = 120000;
export const MAX_HISTORY_ITEMS = 30;

export function safeGet(type, key, fallback) {
  try {
    const v = (type === 'session' ? sessionStorage : localStorage).getItem(key);
    return v !== null ? v : fallback;
  } catch (_) {
    return fallback;
  }
}
export function safeGetJSON(type, key, fallback) {
  try {
    const v = (type === 'session' ? sessionStorage : localStorage).getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (_) {
    return fallback;
  }
}
export function safeStore(type, key, value) {
  try {
    (type === 'session' ? sessionStorage : localStorage).setItem(key, value);
  } catch (_) { /* silent degrade */ }
}
export function safeRemove(type, key) {
  try {
    (type === 'session' ? sessionStorage : localStorage).removeItem(key);
  } catch (_) { }
}

export const state = {
  srcLang: null,     // will be set from langs.js
  tgtLang: null,     // will be set from langs.js
  rounds: parseInt(safeGet('local', 'prism_rounds', '2')),
  apiKey: safeGet('local', 'prism_key', ''),
  model: safeGet('local', 'prism_model', 'deepseek-v4-flash'),
  thinkingMode: safeGet('local', 'prism_thinking', 'disabled'),
  customPrompt: safeGet('local', 'prism_custom_prompt', ''),
  provider: safeGet('local', 'prism_provider', 'deepseek'),
  glossary: safeGet('local', 'prism_glossary', ''),
  customBaseUrls: safeGetJSON('local', 'prism_custom_base_urls', {}),
  lastTestedProvider: null,
  running: false,
  pickingFor: null,
  startTime: null,
  timerInterval: null,
  lastTranslation: null,
  abortController: null,
  usageTokens: { prompt: 0, completion: 0, total: 0 },
  currentRoundUsage: { prompt: 0, completion: 0, total: 0 },
};
