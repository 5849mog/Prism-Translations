// api.js — API调用层

// ─────────────────────────────────────────
// Provider 配置
// ─────────────────────────────────────────
// Provider 配置 (2026 最新)
// ─────────────────────────────────────────
function getProviderConfig() {
const p = state.provider || 'deepseek';
if (p === 'openai') {
return { url: 'https://api.openai.com/v1/chat/completions', model: state.model || 'gpt-4.1', authHeader: `Bearer ${state.apiKey}` };
} else if (p === 'claude') {
return { url: 'https://api.anthropic.com/v1/messages', model: state.model || 'claude-sonnet-4-6', authHeader: null, isAnthropic: true };
} else if (p === 'gemini') {
return { url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', model: state.model || 'gemini-2.5-flash', authHeader: `Bearer ${state.apiKey}` };
} else {
return { url: 'https://api.deepseek.com/v1/chat/completions', model: state.model || 'deepseek-v4-flash', authHeader: `Bearer ${state.apiKey}` };
}
}


async function callDeepSeek(messages, onChunk, temperature = 0.5, retryCount = 0) {
if (!state.apiKey) throw new Error('NO_KEY');

const signal = state.abortController ? state.abortController.signal : undefined;
const cfg = getProviderConfig();

// Anthropic Claude uses different request format
if (cfg.isAnthropic) {
return callClaude(messages, onChunk, temperature, retryCount);
}

const payload = { model: cfg.model, messages, stream: true, temperature };
// 流式模式下请求 API 返回 usage 统计（OpenAI 兼容格式）
if (!cfg.isAnthropic) payload.stream_options = { include_usage: true };
if (state.provider === 'deepseek') {
if (state.thinkingMode === 'disabled') { payload.thinking = { type: 'disabled' }; }
else if (state.thinkingMode === 'high') { payload.thinking = { type: 'enabled', budget_tokens: 2048 }; }
else if (state.thinkingMode === 'max') { payload.thinking = { type: 'enabled', budget_tokens: 4096 }; }
}

const timeoutController = new AbortController();
const timeoutId = setTimeout(() => timeoutController.abort(), 120000);
const combinedSignal = signal
? (() => { const ac = new AbortController(); signal.addEventListener('abort', () => ac.abort()); timeoutController.signal.addEventListener('abort', () => ac.abort()); return ac.signal; })()
: timeoutController.signal;

let resp;
try {
resp = await fetch(cfg.url, {
method: 'POST',
headers: { 'Content-Type': 'application/json', 'Authorization': cfg.authHeader },
body: JSON.stringify(payload),
signal: combinedSignal,
});
} catch (e) {
clearTimeout(timeoutId);
if (e.name === 'AbortError') {
if (signal && signal.aborted) throw new Error('USER_ABORT');
throw new Error('请求超时，请重试');
}
if (retryCount < 1) { await new Promise(r => setTimeout(r, 1500)); return callDeepSeek(messages, onChunk, temperature, retryCount + 1); }
throw new Error('网络请求失败，请检查网络连接');
}
clearTimeout(timeoutId);

if (!resp.ok) {
const err = await resp.json().catch(() => ({}));
const tip = API_ERROR_TIPS[resp.status];
const msg = tip || err.error?.message || `HTTP ${resp.status}`;
if (resp.status === 429 && retryCount < 2) {
await new Promise(r => setTimeout(r, 3000 * (retryCount + 1)));
return callDeepSeek(messages, onChunk, temperature, retryCount + 1);
}
throw new Error(msg);
}

const reader = resp.body.getReader();
const decoder = new TextDecoder();
let resultContent = '', resultReasoning = '', buf = '';
let lastScrollTime = 0;

while (true) {
const { done, value } = await reader.read();
if (value) buf += decoder.decode(value, { stream: !done });
let lines = buf.split('\n');
if (!done) { buf = lines.pop(); } else { buf = ''; }
for (const line of lines) {
if (!line.startsWith('data: ')) continue;
const data = line.slice(6).trim();
if (data === '[DONE]') continue;
try {
const parsed = JSON.parse(data);
// 捕获真实 token 消耗（DeepSeek/OpenAI：stream_options.include_usage=true 时
// 只有最终额外 chunk 的 usage 含真实数值，中间 chunk 为 null 或全零，须用 > 0 过滤）
if (parsed.usage && parsed.usage.total_tokens > 0) {
const u = parsed.usage;
state.usageTokens.prompt += (u.prompt_tokens || 0);
state.usageTokens.completion += (u.completion_tokens || 0);
state.usageTokens.total += (u.total_tokens || 0);
state.currentRoundUsage.prompt += (u.prompt_tokens || 0);
state.currentRoundUsage.completion += (u.completion_tokens || 0);
state.currentRoundUsage.total += (u.total_tokens || 0);
}
const delta = parsed.choices?.[0]?.delta || {};
if (delta.reasoning_content) resultReasoning += delta.reasoning_content;
if (delta.content) resultContent += delta.content;
if (onChunk && (delta.reasoning_content || delta.content)) {
onChunk(resultContent, resultReasoning);
const now = Date.now();
if (now - lastScrollTime > 200) {
const rightPanel = document.querySelector('.panel-right');
if (rightPanel) {
const distFromBottom = rightPanel.scrollHeight - rightPanel.scrollTop - rightPanel.clientHeight;
if (distFromBottom < 200) rightPanel.scrollTop = rightPanel.scrollHeight;
}
lastScrollTime = now;
}
}
} catch (e) {}
}
if (done) break;
}
// 防护：API 有时只返回 reasoning_content 不返回 content，此时用 reasoning 兜底
return resultContent || resultReasoning;
}


// Claude (Anthropic) 专用调用（非流式简化版）
async function callClaude(messages, onChunk, temperature, retryCount) {
const signal = state.abortController ? state.abortController.signal : undefined;
// Convert OpenAI messages format to Anthropic format
const systemMsg = messages.find(m => m.role === 'system');
const userMsgs = messages.filter(m => m.role !== 'system');
const payload = {
model: state.model || 'claude-sonnet-4-6',
max_tokens: 8192,
temperature,
messages: userMsgs,
...(systemMsg ? { system: systemMsg.content } : {}),
stream: true,
};
let resp;
try {
resp = await fetch('https://api.anthropic.com/v1/messages', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'x-api-key': state.apiKey,
'anthropic-version': '2023-06-01',
'anthropic-dangerous-direct-browser-access': 'true',
},
body: JSON.stringify(payload),
signal,
});
} catch(e) {
if (e.name === 'AbortError') { if (signal && signal.aborted) throw new Error('USER_ABORT'); throw new Error('请求超时'); }
throw new Error('网络请求失败');
}
if (!resp.ok) {
const err = await resp.json().catch(() => ({}));
throw new Error(err.error?.message || `HTTP ${resp.status}`);
}
const reader = resp.body.getReader();
const decoder = new TextDecoder();
let resultContent = '', buf = '';
let lastScrollTime = 0;
while (true) {
const { done, value } = await reader.read();
if (value) buf += decoder.decode(value, { stream: !done });
let lines = buf.split('\n');
if (!done) { buf = lines.pop(); } else { buf = ''; }
for (const line of lines) {
if (!line.startsWith('data: ')) continue;
const data = line.slice(6).trim();
if (data === '[DONE]' || data === '') continue;
try {
const parsed = JSON.parse(data);
// 捕获 Claude 真实 token 消耗
// message_start 包含 input_tokens（prompt），message_delta 包含 output_tokens（completion）
if (parsed.type === 'message_start' && parsed.message?.usage) {
const u = parsed.message.usage;
const inp = u.input_tokens || 0;
if (inp > 0) {
state.usageTokens.prompt += inp;
state.usageTokens.total += inp;
state.currentRoundUsage.prompt += inp;
state.currentRoundUsage.total += inp;
}
}
if (parsed.type === 'message_delta' && parsed.usage) {
const u = parsed.usage;
const out = u.output_tokens || 0;
if (out > 0) {
state.usageTokens.completion += out;
state.usageTokens.total += out;
state.currentRoundUsage.completion += out;
state.currentRoundUsage.total += out;
}
}
if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
resultContent += parsed.delta.text;
if (onChunk) {
onChunk(resultContent, '');
const now = Date.now();
if (now - lastScrollTime > 200) {
const rp = document.querySelector('.panel-right');
if (rp && rp.scrollHeight - rp.scrollTop - rp.clientHeight < 200) rp.scrollTop = rp.scrollHeight;
lastScrollTime = now;
}
}
}
} catch(e) {}
}
if (done) break;
}
return resultContent;
}

