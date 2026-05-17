// ═══════════════════════════════════════════
// config.js — 常量 · 语言列表 · 全局状态
// ═══════════════════════════════════════════

// ─────────────────────────────────────────
// 语言列表（扩展至 22 种）
// ─────────────────────────────────────────
const LANGS =[
{ code:'zh', name:'中文',     label:'ZH', flag:'🇨🇳' },
{ code:'en', name:'英语',     label:'EN', flag:'🇺🇸' },
{ code:'ja', name:'日语',     label:'JA', flag:'🇯🇵' },
{ code:'ko', name:'韩语',     label:'KO', flag:'🇰🇷' },
{ code:'fr', name:'法语',     label:'FR', flag:'🇫🇷' },
{ code:'de', name:'德语',     label:'DE', flag:'🇩🇪' },
{ code:'es', name:'西班牙语', label:'ES', flag:'🇪🇸' },
{ code:'ru', name:'俄语',     label:'RU', flag:'🇷🇺' },
{ code:'ar', name:'阿拉伯语', label:'AR', flag:'🇸🇦' },
{ code:'pt', name:'葡萄牙语', label:'PT', flag:'🇧🇷' },
{ code:'it', name:'意大利语', label:'IT', flag:'🇮🇹' },
{ code:'th', name:'泰语',     label:'TH', flag:'🇹🇭' },
{ code:'vi', name:'越南语',   label:'VI', flag:'🇻🇳' },
{ code:'nl', name:'荷兰语',   label:'NL', flag:'🇳🇱' },
{ code:'tr', name:'土耳其语', label:'TR', flag:'🇹🇷' },
{ code:'pl', name:'波兰语',   label:'PL', flag:'🇵🇱' },
{ code:'uk', name:'乌克兰语', label:'UK', flag:'🇺🇦' },
{ code:'sv', name:'瑞典语',   label:'SV', flag:'🇸🇪' },
{ code:'id', name:'印度尼西亚语', label:'ID', flag:'🇮🇩' },
{ code:'hi', name:'印地语',   label:'HI', flag:'🇮🇳' },
{ code:'fa', name:'波斯语',   label:'FA', flag:'🇮🇷' },
{ code:'ms', name:'马来语',   label:'MS', flag:'🇲🇾' },
];

// ─────────────────────────────────────────
// 应用状态
// ─────────────────────────────────────────
const TEXT_CACHE_KEY = 'prism_text_cache';

const state = {
srcLang: LANGS[0],
tgtLang: LANGS[1],
rounds: parseInt(localStorage.getItem('prism_rounds') || '2'),
apiKey: localStorage.getItem('prism_key') || '',
model: localStorage.getItem('prism_model') || 'deepseek-v4-flash',
thinkingMode: localStorage.getItem('prism_thinking') || 'disabled',
customPrompt: localStorage.getItem('prism_custom_prompt') || '',
provider: localStorage.getItem('prism_provider') || 'deepseek',
glossary: localStorage.getItem('prism_glossary') || '',
running: false,
pickingFor: null,
startTime: null,
timerInterval: null,
lastTranslation: null,
abortController: null,
usageTokens: { prompt: 0, completion: 0, total: 0 },
currentRoundUsage: { prompt: 0, completion: 0, total: 0 },
};

// ─────────────────────────────────────────
// 功能 1：文件上传（txt / md / pdf / docx）
// ─────────────────────────────────────────

