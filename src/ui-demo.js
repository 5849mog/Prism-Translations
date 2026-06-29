/**
 * 示例文本库 & 演示面板
 */
import { state } from './state.js';
import { safeStore } from './storage.js';
import { LANGS } from './langs.js';
import { showToast, escHtml, updateLangDisplay, updateWordStats, updateTranslateBtnState } from './utils.js';
import { doTranslate } from './translation.js';
import { ID } from './dom-ids.js';

// ═════════════════════════════════════════
// 示例文本库
// ═════════════════════════════════════════
const DEMO_LIBRARY = [
  {
    key: 'speech', icon: '🎤', title: '科技演讲', desc: 'AI 发展主题，含引用与数据', tags: ['中→英', '正式'],
    srcLang: 'zh', tgtLang: 'en',
    text: `在世界人工智能大会的开幕式上，百度创始人李彦宏发表了题为《译者时代》的主旨演讲。他指出，大语言模型已经从"炫技"阶段迈入"应用"阶段，而译者（Agent）将成为连接用户与服务的核心枢纽。\n\n"未来的互联网将不再是你去搜索信息，而是译者主动为你完成任务。"李彦宏以医疗健康领域为例，阐述了 AI 译者如何帮助患者完成从症状描述、医院推荐到挂号预约的全流程服务。他强调，这一转变需要解决三大挑战：数据隐私保护、多模态交互能力、以及可解释性。\n\n演讲尾声，他引用了一句古希腊哲言："认识你自己。"并补充道，"而在 AI 时代，我们更需要让 AI 认识每一个独特的你。"`,
  },
  {
    key: 'literature', icon: '📖', title: '文学经典', desc: '《小王子》法语原文，诗意与哲理', tags: ['法→中', '文学'],
    srcLang: 'fr', tgtLang: 'zh',
    text: `On ne voit bien qu'avec le coeur. L'essentiel est invisible pour les yeux.\n\nLes hommes ont oublié cette vérité, dit le renard. Mais tu ne dois pas l'oublier. Tu deviens responsable pour toujours de ce que tu as apprivoisé. Tu es responsable de ta rose...\n\nJe suis responsable de ma rose, répéta le petit prince, afin de se souvenir.`,
  },
  {
    key: 'scifi', icon: '🚀', title: '科幻巨著', desc: '《三体》经典片段，硬科幻风格', tags: ['中→英', '叙事'],
    srcLang: 'zh', tgtLang: 'en',
    text: `汪淼觉得，来找他的这四个人是一个奇怪的组合：两名警察和两名军人。如果那两个军人是武警还正常一些，但这是两名陆军军官。\n\n汪淼第一眼就对来人没有好感。其实那名长得五大三粗的警官，让人家第一眼就喜欢的可能性也不大。另一名警官倒是很年轻，长的也挺帅。但汪淼一看就是那种少言寡语的人，从进到汪淼家开始，就没有说过一句话。\n\n"汪淼？"那名粗壮的警察问。"是我。""请跟我们走一趟。"`,
  },
  {
    key: 'techdoc', icon: '⚙️', title: '技术文档', desc: 'API 接口说明，术语密集', tags: ['英→中', '技术'],
    srcLang: 'en', tgtLang: 'zh',
    text: `The RequestRateLimiter GatewayFilter factory uses a RateLimiter implementation to determine if the current request is allowed to proceed. If not, it returns HTTP 429 - Too Many Requests status.\n\nThe filter takes an optional keyResolver parameter and parameters specific to the rate limiter implementation (see Redis RateLimiter).\n\nKeyResolver is a functional interface that allows you to derive the key for limiting requests. The default implementation uses the Principal name from ServerWebExchange. KeyResolver is a bean that implements the KeyResolver interface.`,
  },
  {
    key: 'business', icon: '💼', title: '商务信函', desc: '正式邮件，礼貌用语与格式', tags: ['英→中', '商务'],
    srcLang: 'en', tgtLang: 'zh',
    text: `Dear Dr. Chen,\n\nI hope this message finds you well. I am writing on behalf of Meridian Technologies to formally propose a strategic partnership between our organizations.\n\nFollowing our productive discussion at the Geneva Summit last month, our board has unanimously approved the framework for collaborative research in quantum encryption protocols. We believe that combining Meridian's hardware infrastructure with your team's cryptographic expertise would yield significant advancements in the field.\n\nWe would be honored to host you and your colleagues at our headquarters in Zurich on Thursday, 15th October, for a detailed presentation of our joint venture proposal. Please let us know your availability at your earliest convenience.\n\nYours sincerely,\nAlexandra Whitfield\nDirector of International Partnerships\nMeridian Technologies AG`,
  },
  {
    key: 'poetry', icon: '🏮', title: '古典诗词', desc: '唐诗宋词，意境深远', tags: ['中→英', '文学'],
    srcLang: 'zh', tgtLang: 'en',
    text: `静夜思\n李白\n\n床前明月光，疑是地上霜。\n举头望明月，低头思故乡。\n\n——\n\n水调歌头·明月几时有（节选）\n苏轼\n\n明月几时有？把酒问青天。\n不知天上宫阙，今夕是何年。\n我欲乘风归去，又恐琼楼玉宇，高处不胜寒。\n起舞弄清影，何似在人间。`,
  },
  {
    key: 'philosophy', icon: '🏛️', title: '哲学思辨', desc: '尼采片段，抽象深邃', tags: ['德→中', '哲学'],
    srcLang: 'de', tgtLang: 'zh',
    text: `Wer mit Ungeheuern kämpft, mag zusehn, dass er nicht dabei zum Ungeheuer wird. Und wenn du lange in einen Abgrund blickst, blickt der Abgrund auch in dich hinein.\n\nEs ist immer etwas Wahnsinn in der Liebe. Es ist aber auch immer etwas Vernunft im Wahnsinn.\n\nDer Mensch ist ein Seil, geknüpft zwischen Tier und Übermensch — ein Seil über einem Abgrunde.`,
  },
  {
    key: 'multilang', icon: '🌐', title: '多语混杂', desc: '日韩英混排，测试语言检测', tags: ['混合', '检测'],
    srcLang: 'ja', tgtLang: 'zh',
    text: `AI 技術の発展は私達の生活を大きく変えました。特に 번역 분야에서 혁명적인 변화가 일어났습니다.\n\nThe convergence of neural networks and natural language processing has created unprecedented capabilities in machine translation. However, true mastery of language requires more than statistical patterns — it demands an understanding of culture, context, and the human condition.\n\n技术进步虽然惊人，但最终决定翻译质量的，依然是对语言背后文化的深刻理解】`,
  },
];

// ── Demo 面板 ──
export function showDemoPanel() {
  const modal = document.getElementById(ID.DEMO_PANEL_MODAL);
  const grid = document.getElementById(ID.DEMO_PANEL_GRID);
  if (!grid.dataset.built) {
    grid.innerHTML = DEMO_LIBRARY.map(d =>
      `<button class="demo-card" data-key="${d.key}" style="display:flex;flex-direction:column;align-items:flex-start;text-align:left;padding:14px;border:1.5px solid var(--border-cream);border-radius:var(--r-lg);background:var(--ivory);cursor:pointer;transition:all 0.2s;gap:6px;position:relative;overflow:hidden;">
        <div style="font-size:22px;margin-bottom:2px;">${d.icon}</div>
        <div style="font-size:13px;font-weight:600;color:var(--near-black);font-family:var(--sans);">${escHtml(d.title)}</div>
        <div style="font-size:10px;color:var(--stone);line-height:1.4;">${escHtml(d.desc)}</div>
        <div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;">${d.tags.map(t => `<span style="font-size:9px;padding:1px 6px;border-radius:var(--r-full);background:var(--warm-sand);color:var(--olive);font-family:var(--mono);">${escHtml(t)}</span>`).join('')}</div>
        <div style="position:absolute;top:0;right:0;width:40px;height:40px;background:linear-gradient(135deg,transparent 50%,var(--terracotta) 50%);border-radius:0 0 0 var(--r-lg);opacity:0;transition:opacity 0.2s;" class="demo-card-corner"></div>
      </button>`
    ).join('');
    grid.querySelectorAll('.demo-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.borderColor = 'var(--terracotta)';
        card.style.transform = 'translateY(-2px)';
        card.style.boxShadow = 'var(--shadow-md)';
        card.querySelector('.demo-card-corner').style.opacity = '0.8';
      });
      card.addEventListener('mouseleave', () => {
        card.style.borderColor = 'var(--border-cream)';
        card.style.transform = '';
        card.style.boxShadow = '';
        card.querySelector('.demo-card-corner').style.opacity = '0';
      });
      card.addEventListener('click', () => loadDemoText(card.dataset.key));
    });
    grid.dataset.built = 'true';
  }
  modal.style.display = 'flex';
}

export function hideDemoPanel() {
  document.getElementById(ID.DEMO_PANEL_MODAL).style.display = 'none';
}

export function loadDemoText(key) {
  const demo = DEMO_LIBRARY.find(d => d.key === key);
  if (!demo) return;
  const srcL = LANGS.find(l => l.code === demo.srcLang) || LANGS[0];
  const tgtL = LANGS.find(l => l.code === demo.tgtLang) || LANGS[1];
  state.srcLang = srcL;
  state.tgtLang = tgtL;
  updateLangDisplay();
  document.getElementById(ID.SOURCE_TEXT).value = demo.text;
  updateWordStats();
  updateTranslateBtnState();
  safeStore('session', 'prism_text_cache', demo.text);
  hideDemoPanel();
  showToast(`${demo.icon} ${demo.title} 已加载 · ${demo.tags[0]}`, 'success');
  doTranslate();
}
