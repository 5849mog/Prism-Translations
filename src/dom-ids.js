/**
 * DOM ID 常量 — 所有 document.getElementById 调用的单一事实来源
 *
 * 用法：import { ID } from './dom-ids.js';
 *       document.getElementById(ID.SOURCE_TEXT)
 */
export const ID = Object.freeze(/** @type {const} */ ({
  // ── Top Bar ──
  HISTORY_BTN: 'historyBtn',
  HISTORY_BADGE: 'historyBadge',
  SHORTCUT_BTN: 'shortcutBtn',
  SETTINGS_BTN: 'settingsBtn',
  DEMO_BTN: 'demoBtn',

  // ── Language Selection ──
  SRC_LANG_BTN: 'srcLangBtn',
  SRC_LANG_NAME: 'srcLangName',
  SRC_LANG_CODE: 'srcLangCode',
  TGT_LANG_BTN: 'tgtLangBtn',
  TGT_LANG_NAME: 'tgtLangName',
  TGT_LANG_CODE: 'tgtLangCode',
  SWAP_BTN: 'swapBtn',
  LANG_MODAL: 'langModal',
  LANG_MODAL_BACK: 'langModalBack',
  LANG_MODAL_TITLE: 'langModalTitle',
  LANG_SEARCH: 'langSearch',
  LANG_LIST: 'langList',

  // ── Input Area ──
  SOURCE_TEXT: 'sourceText',
  CHAR_NUM: 'charNum',
  PASTE_BTN: 'pasteBtn',
  CLEAR_BTN: 'clearBtn',
  VOICE_BTN: 'voiceBtn',
  VOICE_ICON: 'voiceIcon',
  FILE_DROP_ZONE: 'fileDropZone',
  FILE_INPUT: 'fileInput',
  FILE_LOADED_BAR: 'fileLoadedBar',
  FILE_LOADED_NAME: 'fileLoadedName',
  FILE_CLEAR_BTN: 'fileClearBtn',

  // ── Word Stats ──
  WORD_STATS: 'wordStats',
  WORD_COUNT: 'wordCount',
  PARA_COUNT: 'paraCount',

  // ── Translate / Stop ──
  TRANSLATE_BTN: 'translateBtn',
  TRANSLATE_BTN_DESKTOP: 'translateBtnDesktop',
  STOP_BTN: 'stopBtn',
  STOP_BTN_DESKTOP: 'stopBtnDesktop',

  // ── Result ──
  RESULT_SECTION: 'resultSection',
  FINAL_RESULT: 'finalResult',
  BILINGUAL_VIEW: 'bilingualView',
  BILINGUAL_BTN: 'bilingualBtn',
  SPEAK_BTN: 'speakBtn',
  COPY_BTN: 'copyBtn',

  // ── Export ──
  EXPORT_SECTION: 'exportSection',
  FMT_MD: 'fmtMd',
  FMT_TXT: 'fmtTxt',
  FMT_JSON: 'fmtJson',
  FMT_BILINGUAL: 'fmtBilingual',
  OPT_INCLUDE_SOURCE: 'optIncludeSource',
  OPT_INCLUDE_SCORES: 'optIncludeScores',
  OPT_INCLUDE_META: 'optIncludeMeta',
  OPT_INCLUDE_PROCESS: 'optIncludeProcess',
  OPT_INCLUDE_AGENT: 'optIncludeAgent',
  EXPORT_BTN: 'exportBtn',
  EXPORT_BTN_LABEL: 'exportBtnLabel',
  EXPORT_PREVIEW_BTN: 'exportPreviewBtn',
  EXPORT_COPY_BTN: 'exportCopyBtn',
  EXPORT_SHARE_BTN: 'exportShareBtn',

  // ── Export Preview Modal ──
  EXPORT_PREVIEW_MODAL: 'exportPreviewModal',
  CLOSE_PREVIEW_BTN: 'closePreviewBtn',
  EXPORT_PREVIEW_BODY: 'exportPreviewBody',
  PREVIEW_CHAR_COUNT: 'previewCharCount',
  PREVIEW_COPY_BTN: 'previewCopyBtn',
  PREVIEW_DOWNLOAD_BTN: 'previewDownloadBtn',

  // ── Engine Panel ──
  ENGINE_PANEL: 'enginePanel',
  PHASE_STATUS: 'phaseStatus',
  ADAPTIVE_BADGE: 'adaptiveBadge',
  PHASE_TIMER: 'phaseTimer',
  PROGRESS_PCT: 'progressPct',
  PROGRESS_FILL: 'progressFill',
  AGENT_GEN_SECTION: 'agentGenSection',
  AGENT_GEN_TITLE: 'agentGenTitle',
  AGENT_GEN_BADGE: 'agentGenBadge',
  AGENT_GEN_BODY: 'agentGenBody',
  AGENT_GEN_NAME: 'agentGenName',
  AGENT_GEN_LABEL: 'agentGenLabel',
  AGENT_GEN_PROMPT: 'agentGenPrompt',
  ROUNDS_CONTAINER: 'roundsContainer',
  AUDIT_CONTAINER: 'auditContainer',
  EMPTY_STATE: 'emptyState',
  SP0: 'sp0',
  SP1: 'sp1',
  SP2: 'sp2',

  // ── History Modal ──
  HISTORY_MODAL: 'historyModal',
  HISTORY_CLOSE: 'historyClose',
  HISTORY_LIST: 'historyList',
  HISTORY_CLEAR_ALL: 'historyClearAll',

  // ── Demo Panel ──
  DEMO_PANEL_MODAL: 'demoPanelModal',
  DEMO_PANEL_CLOSE: 'demoPanelClose',
  DEMO_PANEL_GRID: 'demoPanelGrid',

  // ── Shortcut Panel ──
  SHORTCUT_PANEL: 'shortcutPanel',
  SHORTCUT_CLOSE: 'shortcutClose',

  // ── Settings Drawer ──
  DRAWER_OVERLAY: 'drawerOverlay',
  SETTINGS_DRAWER: 'settingsDrawer',
  PROVIDER_GRID: 'providerGrid',
  PROVIDER_SELECT: 'providerSelect',
  PROVIDER_CONFIG_PANEL: 'providerConfigPanel',
  PROVIDER_CONFIG_HEADER: 'providerConfigHeader',
  API_KEY_LABEL: 'apiKeyLabel',
  API_KEY_INPUT: 'apiKeyInput',
  KEY_TOGGLE: 'keyToggle',
  MODEL_SELECT: 'modelSelect',
  MODEL_SELECT_DESC: 'modelSelectDesc',
  MODEL_CHIP: 'modelChip',
  THINKING_SELECT: 'thinkingSelect',
  CUSTOM_ENDPOINT_ROW: 'customEndpointRow',
  CUSTOM_ENDPOINT_INPUT: 'customEndpointInput',
  TEST_API_BTN: 'testApiBtn',
  TEST_API_RESULT: 'testApiResult',
  ROUNDS_MINUS: 'roundsMinus',
  ROUNDS_DISPLAY: 'roundsDisplay',
  ROUNDS_PLUS: 'roundsPlus',
  CUSTOM_PROMPT_INPUT: 'customPromptInput',
  GLOSSARY_INPUT: 'glossaryInput',
  SAVE_SETTINGS_BTN: 'saveSettingsBtn',

  // ── Toast ──
  TOAST: 'toast',

  // ── API Status ──
  API_STATUS: 'apiStatus',
  API_STATUS_DOT: 'apiStatusDot',
  API_STATUS_TEXT: 'apiStatusText',

  // ── Audit Score ──
  AUDIT_REMARK: 'auditRemark',

  // ── Other ──
  DETECT_CHIP: 'detectChip',
  LEFT_FOOTER_DESKTOP: 'leftFooterDesktop',
}));
