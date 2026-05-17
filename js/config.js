// config.js — 常量 · 语言列表 · 全局状态

const TEXT_CACHE_KEY = 'prism_text_cache';

// Provider-模型联动配置
const PROVIDER_MODELS = {
  deepseek: [
    { value: 'deepseek-v4-flash', label: 'DeepSeek V4 Flash' },
    { value: 'deepseek-v4', label: 'DeepSeek V4' },
    { value: 'deepseek-reasoner', label: 'DeepSeek Reasoner' }
  ],
  claude: [
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
    { value: 'claude-opus-4', label: 'Claude Opus 4' },
    { value: 'claude-sonnet-3-5', label: 'Claude Sonnet 3.5' },
    { value: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4 (20250514)' }
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' }
  ]
};

const LABEL_STRIP_RE = /^(\d+\s*[\.．]\s*)?(\[[A-Z]\]\s+|\([A-Z]\)\s+|[A-F][\.．]\s+|[A-F]路[：:]\s*|[（(]第[一二三四五六七八九十]+[段段块][)）]\s*|[第]\d+[段段块][：:]\s*|[（(]\d+[)）]\s*|【[^】]+】\s*|\([^)]+\)\s*)+/gm;

// 语言列表
const LANGS = [
  { code:'zh-CN', name:'中文', label:'ZH', flag:'🇨🇳' },
  { code:'en',    name:'英语', label:'EN', flag:'🇬🇧' },
  { code:'ja',    name:'日语', label:'JA', flag:'🇯🇵' },
  { code:'ko',    name:'韩语', label:'KO', flag:'🇰🇷' },
  { code:'fr',    name:'法语', label:'FR', flag:'🇫🇷' },
  { code:'de',    name:'德语', label:'DE', flag:'🇩🇪' },
  { code:'es',    name:'西班牙语', label:'ES', flag:'🇪🇸' },
  { code:'it',    name:'意大利语', label:'IT', flag:'🇮🇹' },
  { code:'pt',    name:'葡萄牙语', label:'PT', flag:'🇵🇹' },
  { code:'ru',    name:'俄语', label:'RU', flag:'🇷🇺' },
  { code:'ar',    name:'阿拉伯语', label:'AR', flag:'🇸🇦' },
  { code:'hi',    name:'印地语', label:'HI', flag:'🇮🇳' },
  { code:'th',    name:'泰语', label:'TH', flag:'🇹🇭' },
  { code:'vi',    name:'越南语', label:'VI', flag:'🇻🇳' },
  { code:'pl',    name:'波兰语', label:'PL', flag:'🇵🇱' },
  { code:'tr',    name:'土耳其语', label:'TR', flag:'🇹🇷' },
  { code:'nl',    name:'荷兰语', label:'NL', flag:'🇳🇱' },
  { code:'sv',    name:'瑞典语', label:'SV', flag:'🇸🇪' },
  { code:'id',    name:'印尼语', label:'ID', flag:'🇮🇩' },
  { code:'uk',    name:'乌克兰语', label:'UK', flag:'🇺🇦' },
  { code:'cs',    name:'捷克语', label:'CS', flag:'🇨🇿' },
  { code:'el',    name:'希腊语', label:'EL', flag:'🇬🇷' },
  { code:'he',    name:'希伯来语', label:'HE', flag:'🇮🇱' },
  { code:'fa',    name:'波斯语', label:'FA', flag:'🇮🇷' },
  { code:'ro',    name:'罗马尼亚语', label:'RO', flag:'🇷🇴' },
  { code:'hu',    name:'匈牙利语', label:'HU', flag:'🇭🇺' },
  { code:'da',    name:'丹麦语', label:'DA', flag:'🇩🇰' },
  { code:'fi',    name:'芬兰语', label:'FI', flag:'🇫🇮' },
  { code:'no',    name:'挪威语', label:'NO', flag:'🇳🇴' },
  { code:'bg',    name:'保加利亚语', label:'BG', flag:'🇧🇬' },
  { code:'hr',    name:'克罗地亚语', label:'HR', flag:'🇭🇷' },
  { code:'sk',    name:'斯洛伐克语', label:'SK', flag:'🇸🇰' },
  { code:'sr',    name:'塞尔维亚语', label:'SR', flag:'🇷🇸' },
  { code:'sl',    name:'斯洛文尼亚语', label:'SL', flag:'🇸🇮' },
  { code:'lt',    name:'立陶宛语', label:'LT', flag:'🇱🇹' },
  { code:'lv',    name:'拉脱维亚语', label:'LV', flag:'🇱🇻' },
  { code:'et',    name:'爱沙尼亚语', label:'ET', flag:'🇪🇪' },
  { code:'mk',    name:'马其顿语', label:'MK', flag:'🇲🇰' },
  { code:'sq',    name:'阿尔巴尼亚语', label:'SQ', flag:'🇦🇱' },
  { code:'be',    name:'白俄罗斯语', label:'BE', flag:'🇧🇾' },
  { code:'is',    name:'冰岛语', label:'IS', flag:'🇮🇸' },
  { code:'ga',    name:'爱尔兰语', label:'GA', flag:'🇮🇪' },
  { code:'sq',    name:'阿尔巴尼亚语', label:'SQ', flag:'🇦🇱' },
  { code:'ka',    name:'格鲁吉亚语', label:'KA', flag:'🇬🇪' },
  { code:'hy',    name:'亚美尼亚语', label:'HY', flag:'🇦🇲' },
  { code:'az',    name:'阿塞拜疆语', label:'AZ', flag:'🇦🇿' },
  { code:'bn',    name:'孟加拉语', label:'BN', flag:'🇧🇩' },
  { code:'ta',    name:'泰米尔语', label:'TA', flag:'🇮🇳' },
  { code:'te',    name:'泰卢固语', label:'TE', flag:'🇮🇳' },
  { code:'ml',    name:'马拉雅拉姆语', label:'ML', flag:'🇮🇳' },
  { code:'kn',    name:'卡纳达语', label:'KN', flag:'🇮🇳' },
  { code:'mr',    name:'马拉地语', label:'MR', flag:'🇮🇳' },
  { code:'gu',    name:'古吉拉特语', label:'GU', flag:'🇮🇳' },
  { code:'pa',    name:'旁遮普语', label:'PA', flag:'🇮🇳' },
  { code:'ur',    name:'乌尔都语', label:'UR', flag:'🇵🇰' },
  { code:'sw',    name:'斯瓦希里语', label:'SW', flag:'🇰🇪' },
  { code:'tl',    name:'他加禄语', label:'TL', flag:'🇵🇭' },
  { code:'km',    name:'高棉语', label:'KM', flag:'🇰🇭' },
  { code:'my',    name:'缅甸语', label:'MY', flag:'🇲🇲' },
  { code:'lo',    name:'老挝语', label:'LO', flag:'🇱🇦' },
  { code:'ne',    name:'尼泊尔语', label:'NE', flag:'🇳🇵' },
  { code:'si',    name:'僧伽罗语', label:'SI', flag:'🇱🇰' },
];

const state = {
  apiKey: localStorage.getItem('prism_key') || '',
  model: localStorage.getItem('prism_model') || 'claude-sonnet-4-6',
  srcLang: LANGS[0],
  tgtLang: LANGS[1],
  rounds: +(localStorage.getItem('prism_rounds') || 2),
  thinkingMode: localStorage.getItem('prism_thinking') || 'fast',
  provider: localStorage.getItem('prism_provider') || 'deepseek',
  customPrompt: localStorage.getItem('prism_custom_prompt') || '',
  glossary: localStorage.getItem('prism_glossary') || '',
  abortController: null,
  lastTranslation: null,
  pickingFor: null,
  startTime: 0,
  usageTokens: { prompt: 0, completion: 0, total: 0 },
  currentRoundUsage: { prompt: 0, completion: 0, total: 0 },
};
