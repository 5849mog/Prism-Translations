/**
 * 语言列表（22 种）
 */
export const LANGS = [
  { code: 'zh', name: '中文', label: 'ZH', flag: '🇨🇳' },
  { code: 'en', name: '英语', label: 'EN', flag: '🇺🇸' },
  { code: 'ja', name: '日语', label: 'JA', flag: '🇯🇵' },
  { code: 'ko', name: '韩语', label: 'KO', flag: '🇰🇷' },
  { code: 'fr', name: '法语', label: 'FR', flag: '🇫🇷' },
  { code: 'de', name: '德语', label: 'DE', flag: '🇩🇪' },
  { code: 'es', name: '西班牙语', label: 'ES', flag: '🇪🇸' },
  { code: 'ru', name: '俄语', label: 'RU', flag: '🇷🇺' },
  { code: 'ar', name: '阿拉伯语', label: 'AR', flag: '🇸🇦' },
  { code: 'pt', name: '葡萄牙语', label: 'PT', flag: '🇧🇷' },
  { code: 'it', name: '意大利语', label: 'IT', flag: '🇮🇹' },
  { code: 'th', name: '泰语', label: 'TH', flag: '🇹🇭' },
  { code: 'vi', name: '越南语', label: 'VI', flag: '🇻🇳' },
  { code: 'nl', name: '荷兰语', label: 'NL', flag: '🇳🇱' },
  { code: 'tr', name: '土耳其语', label: 'TR', flag: '🇹🇷' },
  { code: 'pl', name: '波兰语', label: 'PL', flag: '🇵🇱' },
  { code: 'uk', name: '乌克兰语', label: 'UK', flag: '🇺🇦' },
  { code: 'sv', name: '瑞典语', label: 'SV', flag: '🇸🇪' },
  { code: 'id', name: '印度尼西亚语', label: 'ID', flag: '🇮🇩' },
  { code: 'hi', name: '印地语', label: 'HI', flag: '🇮🇳' },
  { code: 'fa', name: '波斯语', label: 'FA', flag: '🇫🇷' },
  { code: 'ms', name: '马来语', label: 'MS', flag: '🇲🇾' },
];

export const LANG_DETECT_PATTERNS = [
  { code: 'zh', pattern: /[一-鿿]/, threshold: 0.15 },
  { code: 'ja', pattern: /[぀-ヿ]/, threshold: 0.1 },
  { code: 'ko', pattern: /[가-힯]/, threshold: 0.1 },
  { code: 'ar', pattern: /[؀-ۿ]/, threshold: 0.1 },
  { code: 'ru', pattern: /[Ѐ-ӿ]/, threshold: 0.1 },
  { code: 'hi', pattern: /[ऀ-ॿ]/, threshold: 0.1 },
  { code: 'fa', pattern: /[؀-ۿݐ-ݿ]/, threshold: 0.1 },
  { code: 'th', pattern: /[฀-๿]/, threshold: 0.1 },
  { code: 'vi', pattern: /[àáâãèéêìíòóôõùúýăđơư]/i, threshold: 0.05 },
];
