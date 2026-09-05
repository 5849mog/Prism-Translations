/**
 * 语音输入模块 — Web Speech API 封装
 */
import { state } from './state.js';
import { safeStore } from './storage.js';
import { showToast, log, updateWordStats, updateTranslateBtnState } from './utils.js';
import { ID } from './dom-ids.js';

// ── 语音输入 ──
let _recognition = null;
let _isVoiceListening = false;
let _finalTranscript = '';

// iOS Safari 的 continuous + onend 自动重启组合不可靠（数秒即断），
// 移动端改用单次识别 + 手动重启
const _isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

const VOICE_ERROR_TIPS = {
  'not-allowed': '麦克风权限被拒绝，请在浏览器设置中允许',
  'service-not-allowed': '语音服务不可用，请检查系统权限',
  'network': '语音服务网络异常，请检查网络后重试',
  'audio-capture': '未检测到麦克风设备',
  'no-speech': '没有听到说话，请再试一次',
  'aborted': '',
};

export function initVoiceInput() {
  if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) return;
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  _recognition = new SpeechRecognition();
  const voiceBtn = document.getElementById(ID.VOICE_BTN);
  if (voiceBtn) voiceBtn.style.display = '';
  _recognition.continuous = !_isIOS;
  _recognition.interimResults = true;

  _recognition.onresult = (event) => {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) _finalTranscript += t;
      else interim += t;
    }
    const el = document.getElementById(ID.SOURCE_TEXT);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = el.value.substring(0, start);
    const after = el.value.substring(end);
    const ins = _finalTranscript || interim;
    el.value = before + ins + after;
    const newPos = start + ins.length;
    el.setSelectionRange(newPos, newPos);
    updateWordStats();
    updateTranslateBtnState();
    safeStore('session', 'prism_text_cache', el.value);
    if (_finalTranscript) { interim = ''; _finalTranscript = ''; }
  };

  _recognition.onerror = (event) => {
    log.warn('语音识别错误:', event.error);
    const tip = VOICE_ERROR_TIPS[event.error];
    if (tip) showToast(tip, event.error === 'no-speech' ? '' : 'error');
    if (event.error !== 'no-speech' && event.error !== 'aborted') {
      _isVoiceListening = false;
      updateVoiceBtnState();
    }
  };

  _recognition.onend = () => {
    if (!_isVoiceListening) return;
    if (_isIOS) {
      // iOS：单次识别结束即停止，交给用户再次点击（避免无限重启循环）
      _isVoiceListening = false;
      updateVoiceBtnState();
      return;
    }
    try { _recognition.start(); } catch (e) { log.warn('语音识别重启失败:', e); _isVoiceListening = false; updateVoiceBtnState(); }
  };

  document.getElementById(ID.VOICE_BTN)?.addEventListener('click', () => {
    if (!_recognition) { showToast('当前浏览器不支持语音输入'); return; }
    if (!window.isSecureContext) { showToast('语音输入需要 HTTPS 环境'); return; }
    if (_isVoiceListening) {
      _isVoiceListening = false;
      try { _recognition.stop(); } catch (e) { log.warn('停止失败:', e); }
      updateVoiceBtnState();
      showToast('语音输入已停止');
    } else {
      _finalTranscript = '';
      _isVoiceListening = true;
      _recognition.start();
      updateVoiceBtnState();
      showToast('语音输入已启动，请说话...');
    }
  });
}

function updateVoiceBtnState() {
  const btn = document.getElementById(ID.VOICE_BTN);
  const icon = document.getElementById(ID.VOICE_ICON);
  if (!btn || !icon) return;
  if (_isVoiceListening) {
    btn.classList.add('active'); btn.classList.remove('pulse');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v0a3 3 0 0 1 5.12-2.12M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  } else {
    btn.classList.remove('active'); btn.classList.add('pulse');
    icon.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>`;
  }
}

/** 清空时停止语音（供 ui.js 调用） */
export function stopVoiceIfListening() {
  _finalTranscript = '';
  if (_isVoiceListening) {
    _isVoiceListening = false;
    try { _recognition.stop(); } catch (_) { }
    updateVoiceBtnState();
  }
}
