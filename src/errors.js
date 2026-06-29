/**
 * 错误码 & 结构化错误工具
 *
 * 统一项目中所有错误类型的表示，取代散落的字符串错误。
 * 使用方式：
 *   import { Err } from './errors.js';
 *   throw Err.NO_KEY;
 *   throw Err.NETWORK;
 */
export const Err = Object.freeze({
  /** 未填写 API 密钥 */
  NO_KEY:            /** @type {const} */ Object.assign(new Error('NO_KEY'), { code: 'NO_KEY', status: 0 }),
  /** 用户主动取消 */
  USER_ABORT:        /** @type {const} */ Object.assign(new Error('USER_ABORT'), { code: 'USER_ABORT', status: 0 }),
  /** 请求超时 */
  TIMEOUT:           /** @type {const} */ Object.assign(new Error('请求超时，请重试'), { code: 'TIMEOUT', status: 0 }),
  /** 网络错误 */
  NETWORK:           /** @type {const} */ Object.assign(new Error('网络请求失败，请检查网络连接'), { code: 'NETWORK', status: 0 }),
  /** HTTP 429 限流 */
  RATE_LIMITED:      /** @type {const} */ Object.assign(new Error('请求过于频繁，请稍后重试'), { code: 'RATE_LIMITED', status: 429 }),
  /** 401 密钥无效 */
  UNAUTHORIZED:      /** @type {const} */ Object.assign(new Error('API 密钥无效或已过期'), { code: 'UNAUTHORIZED', status: 401 }),
  /** 402 余额不足 */
  INSUFFICIENT_FUNDS: /** @type {const} */ Object.assign(new Error('账户余额不足'), { code: 'INSUFFICIENT_FUNDS', status: 402 }),
});

/**
 * 创建一个带状态码的结构化错误
 * @param {string} msg
 * @param {number} [status]
 * @returns {Error & { code?: string, status?: number }}
 */
export function apiError(msg, status) {
  const err = new Error(msg);
  err.status = status;
  return err;
}

/**
 * 判断错误是否为用户主动取消
 * @param {Error} err
 * @returns {boolean}
 */
export function isUserAbort(err) {
  return err?.message === 'USER_ABORT' || err?.code === 'USER_ABORT';
}

/**
 * 判断错误是否为网络相关
 * @param {Error} err
 * @returns {boolean}
 */
export function isNetworkError(err) {
  return (err && !err.status) || err?.code === 'NETWORK' || err?.code === 'TIMEOUT';
}
