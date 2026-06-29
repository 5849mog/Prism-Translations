/**
 * 存储抽象层 — 封装 localStorage/sessionStorage 的异常安全访问
 *
 * 所有持久化操作都必须通过此模块完成。
 * 注意：state.js 仅在初始化时通过 safeGet 读取初始值，
 *       后续写入操作应走到此模块。
 */
// ── 存储键常量 ──
export const TEXT_CACHE_KEY = 'prism_text_cache';
export const WARN_THRESHOLD = 6000;
export const HARD_LIMIT = 7500;
export const API_TIMEOUT_MS = 120000;
export const MAX_HISTORY_ITEMS = 30;

/**
 * 安全读取 localStorage/sessionStorage
 * @param {'local'|'session'} type
 * @param {string} key
 * @param {*} [fallback]
 * @returns {string|null}
 */
export function safeGet(type, key, fallback) {
  try {
    const v = (type === 'session' ? sessionStorage : localStorage).getItem(key);
    return v !== null ? v : fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * 安全读取并解析 JSON
 * @param {'local'|'session'} type
 * @param {string} key
 * @param {*} [fallback]
 * @returns {*}
 */
export function safeGetJSON(type, key, fallback) {
  try {
    const v = (type === 'session' ? sessionStorage : localStorage).getItem(key);
    return v !== null ? JSON.parse(v) : fallback;
  } catch (_) {
    return fallback;
  }
}

/**
 * 安全写入 storage
 * @param {'local'|'session'} type
 * @param {string} key
 * @param {string} value
 */
export function safeStore(type, key, value) {
  try {
    (type === 'session' ? sessionStorage : localStorage).setItem(key, value);
  } catch (_) { /* silent degrade */ }
}

/**
 * 安全删除
 * @param {'local'|'session'} type
 * @param {string} key
 */
export function safeRemove(type, key) {
  try {
    (type === 'session' ? sessionStorage : localStorage).removeItem(key);
  } catch (_) { }
}
