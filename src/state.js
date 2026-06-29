/**
 * 应用全局状态
 *
 * 存储函数已移至 ./storage.js：safeGet, safeStore, safeRemove, safeGetJSON, TEXT_CACHE_KEY, ...
 */
import { safeGet, safeGetJSON } from './storage.js';

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
