'use strict';

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const STORAGE_KEY = 'guziBondFormalV2';
const CLOUD_CACHE_PREFIX = 'guziBondCloudCache:';
const DEMO_IDS = new Set(['172105210001', '171399520002', '170714880003']);
const THEME_KEY = 'guziBondThemeV2';
const LEVELS = ['初心收藏', '长久陪伴', '本命挚爱', '绝版羁绊', '传世羁绊'];
const rotations = ['-2.4deg', '1.6deg', '-1.1deg', '2.2deg', '-1.8deg', '1deg'];
let selectedTheme = 'nebula';
let currentImage = '';
let latestCreatedId = '';
let vaultView = 'grid';
let activeStorageKey = STORAGE_KEY;

function safeParse(value, fallback) {
  try { return JSON.parse(value) ?? fallback; } catch { return fallback; }
}

function svgArt(mark, sub, colors = ['#dac8ff', '#ffb8d5', '#ffffff']) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1000" viewBox="0 0 1000 1000">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${colors[0]}"/><stop offset="1" stop-color="${colors[1]}"/></linearGradient>
      <filter id="s"><feDropShadow dx="0" dy="28" stdDeviation="28" flood-color="#5b3e74" flood-opacity=".2"/></filter>
    </defs>
    <rect width="1000" height="1000" rx="90" fill="url(#bg)"/>
    <circle cx="160" cy="160" r="190" fill="#fff" opacity=".28"/><circle cx="875" cy="810" r="170" fill="#6c4b8c" opacity=".16"/>
    <g filter="url(#s)"><path d="M500 166c175 0 285 126 285 316 0 157-58 221-93 270-56 78-109 101-192 101s-136-23-192-101c-35-49-93-113-93-270 0-190 110-316 285-316z" fill="${colors[2]}" opacity=".9"/>
    <circle cx="412" cy="447" r="22" fill="#5a416c"/><circle cx="588" cy="447" r="22" fill="#5a416c"/>
    <path d="M428 570q72 62 144 0" fill="none" stroke="#e2699f" stroke-width="20" stroke-linecap="round"/></g>
    <text x="500" y="360" text-anchor="middle" font-family="Arial,sans-serif" font-size="178" font-weight="900" fill="#70528f">${mark}</text>
    <text x="500" y="930" text-anchor="middle" font-family="Arial,sans-serif" font-size="42" letter-spacing="10" fill="#684f78">${sub}</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const demoArchive = [
  {
    id: '172105210001', name: '星光纪念限定吧唧', ip: '幻想星旅', character: '三月', type: '徽章 / 吧唧', condition: '近全新', buyDate: '2025-05-21', price: 59,
    story: '第一次参加同人展时遇见了它。那天排了很久的队，但拿到手的瞬间觉得所有等待都值得。它后来陪我度过了备考和比赛准备的日子。',
    quote: '喜欢不是短暂的热闹，而是长久的认真。', tags: ['首发入手', '漫展回忆', '本命'], image: svgArt('三', 'MARCH', ['#d8c6ff', '#ffb8d6', '#fff']),
    createdAt: '2025-05-21T09:20:00.000Z', theme: 'nebula', history: []
  },
  {
    id: '171399520002', name: '春日巡游亚克力立牌', ip: '心动剧场', character: '凌音', type: '亚克力立牌', condition: '全新未拆', buyDate: '2024-10-03', price: 128,
    story: '这是我第一次为了一个角色专门去另一个城市参加快闪活动。照片会褪色，但那天见到它时的开心不会。',
    quote: '见到你的那一天，普通的城市也有了纪念意义。', tags: ['快闪限定', '城市记忆'], image: svgArt('音', 'RINNE', ['#ffd1df', '#d2c5ff', '#fff8fb']),
    createdAt: '2024-10-03T12:00:00.000Z', theme: 'sakura', history: [{date:'2024-10-03', message:'在快闪店被第一任谷主带回家。', care:'一直使用展示盒避光保存。'}]
  },
  {
    id: '170714880003', name: '冬夜特典收藏色纸', ip: '深海回声', character: '澈', type: '色纸 / 明信片', condition: '轻微使用痕迹', buyDate: '2024-02-06', price: 86,
    story: '朋友在生日时送给我的惊喜。背面还有她写下的祝福，所以它对我来说既是角色收藏，也是友情的实体纪念。',
    quote: '有些收藏的价值，从来不写在价格标签上。', tags: ['生日礼物', '友情见证'], image: svgArt('澈', 'DEEP SEA', ['#a8dfef', '#8ab6e8', '#f7fdff']),
    createdAt: '2024-02-06T08:20:00.000Z', theme: 'aqua', history: []
  }
];

const hadStoredArchive = localStorage.getItem(STORAGE_KEY) !== null;
let archive = safeParse(localStorage.getItem(STORAGE_KEY), null);
if (!Array.isArray(archive)) archive = demoArchive;
if (!localStorage.getItem(STORAGE_KEY)) localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));

function migratableLocalArchive() {
  if (!hadStoredArchive) return [];
  return archive.filter(item => !DEMO_IDS.has(String(item.id)) && !item.isDemo);
}

const communityPosts = [
  {user:'星野眠', avatar:'星', cls:'a1', time:'今天 18:42', text:'终于把这一套巡演吧唧收齐了！最后一枚是同校谷友帮我蹲到的，完整图鉴真的太治愈了。', mark:'巡', sub:'TOUR SET', colors:['#c8b6ff','#ffb9da','#fff'], likes:328, comments:41},
  {user:'柚子茶', avatar:'柚', cls:'a2', time:'今天 15:08', text:'给陪了我两年的立牌补了一份羁绊档案。原来“收藏了很久”真的可以被具体地看见。', mark:'柚', sub:'730 DAYS', colors:['#b7ece9','#9bc5ff','#fff'], likes:216, comments:19},
  {user:'鹿岛同学', avatar:'鹿', cls:'a3', time:'昨天 22:16', text:'第一次尝试做谷子传承卡。比起冷冰冰地出掉，更希望下一任主人知道它曾经被怎样珍惜。', mark:'传', sub:'BOND PASS', colors:['#ffd2ae','#f6a6bb','#fff'], likes:472, comments:66}
];

const trendData = [
  {user:'星野眠', avatar:'星', cls:'a1', name:'巡演纪念全套图鉴', text:'收集 427 天，今天终于点亮最后一个空位。', mark:'巡', sub:'COMPLETE', colors:['#c8b5ff','#ffb7d7','#fff'], likes:'1.8k'},
  {user:'柚子茶', avatar:'柚', cls:'a2', name:'陪伴两年的桌面立牌', text:'它见证了书桌从高三变成大学宿舍。', mark:'柚', sub:'730 DAYS', colors:['#aee8e7','#9dbfff','#fff'], likes:'986'},
  {user:'鹿岛同学', avatar:'鹿', cls:'a3', name:'第一次温柔传承', text:'希望下一任谷主也会认真珍惜它。', mark:'传', sub:'BOND PASS', colors:['#ffd1aa','#f4a3ba','#fff'], likes:'742'}
];

function saveArchive() {
  try { localStorage.setItem(activeStorageKey, JSON.stringify(archive)); }
  catch { toast('图片数据较大，浏览器本地空间不足'); }
  renderAll();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function daysTogether(item) {
  if (!item.buyDate) return 0;
  const start = new Date(`${item.buyDate}T00:00:00`);
  if (Number.isNaN(start.getTime())) return 0;
  return Math.max(1, Math.floor((Date.now() - start.getTime()) / 86400000));
}

function bondScore(item) {
  let score = 34;
  score += Math.min(28, Math.floor(daysTogether(item) / 30));
  score += Math.min(18, Math.floor((item.story || '').length / 15));
  if (item.quote) score += 8;
  if ((item.tags || []).length >= 2) score += 5;
  score += Math.min(12, (item.history || []).length * 5);
  return Math.min(99, score);
}

function levelFor(item) {
  const score = bondScore(item);
  if (score >= 94) return LEVELS[4];
  if (score >= 82) return LEVELS[3];
  if (score >= 68) return LEVELS[2];
  if (score >= 50) return LEVELS[1];
  return LEVELS[0];
}

function rarityFor(item) {
  const score = bondScore(item);
  return score >= 90 ? 'UR' : score >= 76 ? 'SSR' : score >= 58 ? 'SR' : 'R';
}

function codeFor(itemOrId) {
  const id = typeof itemOrId === 'object' ? itemOrId.id : itemOrId;
  return `GB-${String(id || 'NEW').slice(-6).toUpperCase()}`;
}

function formatMoney(value) { return `¥${Number(value || 0).toLocaleString('zh-CN', {minimumFractionDigits: 0, maximumFractionDigits: 2})}`; }
function formatDate(value) { if (!value) return '未记录'; return value.replaceAll('-', '.'); }

function toast(message) {
  const box = $('#toast');
  $('p', box).textContent = message;
  box.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => box.classList.remove('show'), 2400);
}

window.guziBondUI = {
  toast,
  setAuthUser(user) {
    const email = user?.email || user?.mail || '';
    const nickname = user?.nickName || user?.username || (email ? email.split('@')[0] : '谷主');
    const avatar = String(nickname || '谷').trim().slice(0, 1).toUpperCase();
    $('#authEntry').classList.toggle('is-hidden', Boolean(user));
    $('#profilePill').classList.toggle('is-hidden', !user);
    $('#headerAvatar').textContent = avatar;
    $('#profileAvatar').textContent = avatar;
    $('#headerOwnerName').textContent = `谷主${nickname}`;
    $('#profileOwnerName').textContent = `谷主${nickname}`;
    $('#profileOwnerEmail').textContent = email || '已登录专属谷仓';
    window.guziBondOwnerLabel = user ? nickname : '嘉嘉';
  },
  getArchive: () => archive,
  getMigratableLocalArchive: migratableLocalArchive,
  setUserContext(uid) {
    activeStorageKey = uid ? `${CLOUD_CACHE_PREFIX}${uid}` : STORAGE_KEY;
  },
  getUserCache(uid) {
    return safeParse(localStorage.getItem(`${CLOUD_CACHE_PREFIX}${uid}`), []);
  },
  restoreGuestDemo() {
    activeStorageKey = STORAGE_KEY;
    archive = demoArchive.map(item => ({ ...item }));
    renderAll();
  },
  setArchive(items, { cache = true } = {}) {
    archive = Array.isArray(items) ? items : [];
    if (cache) {
      try { localStorage.setItem(activeStorageKey, JSON.stringify(archive)); } catch {}
    }
    renderAll();
  }
};

function routeTo(id, pushHash = true) {
  const target = document.getElementById(id) ? id : 'discover';
  $$('[data-screen]').forEach(screen => screen.classList.toggle('active', screen.id === target));
  $$('.nav-item').forEach(button => button.classList.toggle('active', button.dataset.route === target));
  $$('.mobile-nav button').forEach(button => button.classList.toggle('active', button.dataset.route === target));
  if (pushHash) history.replaceState(null, '', `#${target}`);
  window.scrollTo({top: 0, behavior: 'smooth'});
}

$$('[data-route]').forEach(button => button.addEventListener('click', () => routeTo(button.dataset.route)));
window.addEventListener('hashchange', () => routeTo(location.hash.slice(1), false));

function setupTilt(root = document) {
  $$('[data-tilt]', root).forEach(card => {
    if (card.dataset.tiltReady) return;
    card.dataset.tiltReady = '1';
    card.addEventListener('mousemove', event => {
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width - .5;
      const y = (event.clientY - box.top) / box.height - .5;
      card.style.transform = `rotateY(${x * 13}deg) rotateX(${-y * 11}deg) translateY(-5px)`;
    });
    card.addEventListener('mouseleave', () => card.style.transform = '');
  });
}

function renderTrends() {
  const grid = $('#trendGrid');
  grid.innerHTML = trendData.map((item, index) => `
    <article class="trend-card" data-route="community">
      <button class="trend-like">♡ ${item.likes}</button>
      <div class="trend-art"><div class="abstract-art" style="background:linear-gradient(145deg,${item.colors[0]},${item.colors[1]})"><b>${item.mark}</b></div></div>
      <div class="trend-body">
        <div class="trend-user"><span><i class="mini-avatar ${item.cls}">${item.avatar}</i>${item.user}</span><span>${index === 0 ? '本周热门' : '今日精选'}</span></div>
        <h3>${item.name}</h3><p>${item.text}</p>
      </div>
    </article>`).join('');
  $$('[data-route]', grid).forEach(button => button.addEventListener('click', () => routeTo(button.dataset.route)));
  $$('.trend-like', grid).forEach(button => button.addEventListener('click', event => { event.stopPropagation(); button.textContent = button.textContent.startsWith('♡') ? button.textContent.replace('♡','♥') : button.textContent.replace('♥','♡'); }));
}

function renderCommunity() {
  const feed = $('#communityFeed');
  feed.innerHTML = communityPosts.map((post, index) => `
    <article class="feed-card">
      <div class="feed-head"><div class="feed-user"><span class="mini-avatar ${post.cls}">${post.avatar}</span><div><b>${post.user}</b><small>南京师范大学 · ${post.time}</small></div></div><button class="more-button">•••</button></div>
      <p class="feed-copy">${post.text}</p>
      <div class="feed-media one"><div class="feed-image" style="background:linear-gradient(145deg,${post.colors[0]},${post.colors[1]})"><b>${post.mark}</b></div></div>
      <div class="feed-actions"><button data-like-post="${index}">♡ ${post.likes}</button><button>◯ ${post.comments}</button><button data-share-community="${index}">↗ 分享</button></div>
    </article>`).join('');
  $$('[data-like-post]', feed).forEach(button => button.addEventListener('click', () => {
    const liked = button.classList.toggle('liked');
    const base = communityPosts[Number(button.dataset.likePost)].likes;
    button.textContent = `${liked ? '♥' : '♡'} ${base + (liked ? 1 : 0)}`;
  }));
  $$('[data-share-community]', feed).forEach(button => button.addEventListener('click', () => toast('分享链接已复制（演示）')));
}

function setStep(step) {
  const n = Number(step);
  $$('.step-pane').forEach(pane => pane.classList.toggle('active', Number(pane.dataset.stepPane) === n));
  $$('.step').forEach(button => button.classList.toggle('active', Number(button.dataset.step) <= n));
  $('#stepNumber').textContent = String(n).padStart(2, '0');
  if (n === 3) updatePreview();
}

$$('[data-next-step]').forEach(button => button.addEventListener('click', () => {
  const target = Number(button.dataset.nextStep);
  if (target === 2 && !currentImage) toast('可先上传图片，也可直接体验建档流程');
  if (target === 3) {
    const name = $('#itemName').value.trim();
    const ip = $('#itemIP').value.trim();
    const story = $('#story').value.trim();
    if (!name || !ip || !story) { toast('请填写谷子名称、所属作品和羁绊故事'); return; }
  }
  setStep(target);
}));
$$('[data-prev-step]').forEach(button => button.addEventListener('click', () => setStep(button.dataset.prevStep)));
$$('.step').forEach(button => button.addEventListener('click', () => setStep(button.dataset.step)));

function readAndCompress(file, maxSide = 1200, quality = .84) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) { reject(new Error('请选择图片文件')); return; }
    if (file.size > 8 * 1024 * 1024) { reject(new Error('图片不能超过 8 MB')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const image = new Image();
      image.onerror = () => reject(new Error('图片格式无法识别'));
      image.onload = () => {
        let {width, height} = image;
        const scale = Math.min(1, maxSide / Math.max(width, height));
        width = Math.round(width * scale); height = Math.round(height * scale);
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f4eff8'; ctx.fillRect(0, 0, width, height); ctx.drawImage(image, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function showUploadedImage(src, scan = true) {
  currentImage = src;
  const preview = $('#uploadPreview');
  preview.src = src; preview.style.display = 'block';
  $('#uploadPlaceholder').style.display = 'none';
  $('#previewVisual').innerHTML = `<img src="${src}" alt="谷子预览">`;
  if (scan) {
    $('#uploadZone').classList.add('scanning');
    setTimeout(() => $('#uploadZone').classList.remove('scanning'), 1800);
  }
  updatePreview();
}

$('#imageInput').addEventListener('change', async event => {
  const file = event.target.files?.[0]; if (!file) return;
  try { showUploadedImage(await readAndCompress(file)); toast('图片已导入，正在生成数字外观'); }
  catch (error) { toast(error.message); }
});

$('#demoScan').addEventListener('click', () => {
  showUploadedImage(svgArt('绊', 'DEMO GUZI', ['#dbc9ff','#ffb8d7','#fff']));
  $('#itemName').value = '星光纪念限定吧唧';
  $('#itemIP').value = '幻想星旅';
  $('#character').value = '三月';
  $('#itemType').value = '徽章 / 吧唧';
  $('#condition').value = '近全新';
  $('#buyDate').value = '2025-05-21';
  $('#price').value = '59';
  $('#story').value = '第一次参加同人展时遇见了它。那天排了很久的队，但拿到手的瞬间觉得所有等待都值得。它后来陪我度过了备考和比赛准备的日子。';
  $('#quote').value = '喜欢不是短暂的热闹，而是长久的认真。';
  $('#tags').value = '首发入手, 漫展回忆, 本命';
  $('#storyCounter').textContent = $('#story').value.length;
  updatePreview();
  toast('已完成模拟识别并自动填写档案');
});

['itemName','itemIP','character','buyDate','price','story','quote','tags'].forEach(id => $(`#${id}`).addEventListener('input', updatePreview));
$('#story').addEventListener('input', event => $('#storyCounter').textContent = event.target.value.length);

$$('.theme-option').forEach(button => button.addEventListener('click', () => {
  selectedTheme = button.dataset.theme;
  $$('.theme-option').forEach(item => item.classList.toggle('active', item === button));
  updatePreview();
}));

function draftItem() {
  return {
    id: String(Date.now()), name: $('#itemName').value.trim() || '你的专属电子谷子', ip: $('#itemIP').value.trim() || '未分类作品',
    character: $('#character').value.trim(), type: $('#itemType').value, condition: $('#condition').value, buyDate: $('#buyDate').value,
    price: Number($('#price').value || 0), story: $('#story').value.trim(), quote: $('#quote').value.trim(),
    tags: $('#tags').value.split(/[,，]/).map(x => x.trim()).filter(Boolean), image: currentImage, createdAt: new Date().toISOString(), theme: selectedTheme, history: []
  };
}

function updatePreview() {
  const item = draftItem();
  const card = $('#previewCard');
  card.className = `bond-card preview-card theme-${selectedTheme}`;
  $('#previewName').textContent = item.name;
  $('#previewQuote').textContent = `“${item.quote || item.story.slice(0, 42) || '每一份喜欢，都值得被认真记录。'}”`;
  $('#previewDate').textContent = item.buyDate ? `相遇于 ${formatDate(item.buyDate)}` : '等待相遇';
  $('#previewLevel').textContent = levelFor(item);
  $('#previewRarity').textContent = rarityFor(item);
  $('#estimatedLevel').textContent = levelFor(item);
  $('#estimatedCode').textContent = codeFor(item);
  if (currentImage && !$('#previewVisual img')) $('#previewVisual').innerHTML = `<img src="${currentImage}" alt="谷子预览">`;
}

$('#creatorForm').addEventListener('submit', async event => {
  event.preventDefault();
  const item = draftItem();
  if (!item.name || item.name === '你的专属电子谷子' || !item.ip || item.ip === '未分类作品' || !item.story) { toast('请完整填写谷子名称、所属作品和羁绊故事'); setStep(2); return; }
  try {
    if (window.guziBondCloud?.isSignedIn()) {
      toast('正在保存到专属云仓…');
      const saved = await window.guziBondCloud.saveItem(item);
      archive.unshift(saved);
    } else {
      archive.unshift(item);
    }
    latestCreatedId = item.id; saveArchive();
    $('#successModal').classList.add('open'); $('#successModal').setAttribute('aria-hidden','false');
  } catch (error) { toast(error.message || '云端保存失败，请稍后重试'); }
});

function resetCreator() {
  $('#creatorForm').reset(); currentImage = ''; selectedTheme = 'nebula';
  $('#uploadPreview').style.display = 'none'; $('#uploadPreview').removeAttribute('src'); $('#uploadPlaceholder').style.display = '';
  $('#previewVisual').innerHTML = '<div class="empty-art"><span>谷</span><small>等待扫描</small></div>';
  $$('.theme-option').forEach(item => item.classList.toggle('active', item.dataset.theme === 'nebula'));
  $('#storyCounter').textContent = '0'; setStep(1); updatePreview();
}

$('#successVault').addEventListener('click', () => { $('#successModal').classList.remove('open'); routeTo('vault'); resetCreator(); });
$('#successShare').addEventListener('click', () => { $('#successModal').classList.remove('open'); openShare(latestCreatedId); });

function filteredArchive() {
  const query = $('#vaultSearch').value.trim().toLowerCase();
  const type = $('#vaultType').value;
  const sort = $('#vaultSort').value;
  const result = archive.filter(item => {
    const haystack = [item.name,item.ip,item.character,item.story,(item.tags || []).join(' ')].join(' ').toLowerCase();
    return (type === 'all' || item.type === type) && (!query || haystack.includes(query));
  });
  result.sort((a,b) => sort === 'bond' ? bondScore(b)-bondScore(a) : sort === 'days' ? daysTogether(b)-daysTogether(a) : sort === 'price' ? b.price-a.price : new Date(b.createdAt)-new Date(a.createdAt));
  return result;
}

function renderVault() {
  const grid = $('#vaultGrid');
  const list = filteredArchive();
  grid.className = `vault-grid${vaultView === 'list' ? ' list-view' : ''}`;
  grid.innerHTML = list.map(item => `
    <article class="vault-item">
      <button class="vault-menu" data-delete="${item.id}" title="删除">×</button>
      <div class="vault-thumb">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : '<span class="vault-placeholder">谷</span>'}<span class="vault-badge">${levelFor(item)}</span></div>
      <div class="vault-body"><small>${escapeHtml(item.ip)} · ${codeFor(item)}</small><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.story)}</p>
        <div class="vault-meta"><span>${escapeHtml(item.type)}</span><span>陪伴 ${daysTogether(item).toLocaleString()} 天</span></div>
        <div class="bond-progress"><div><i style="width:${bondScore(item)}%"></i></div><span><b>羁绊值 ${bondScore(item)}</b><b>${rarityFor(item)}</b></span></div>
        <div class="vault-actions"><button data-detail="${item.id}">查看档案</button><button data-share="${item.id}">分享</button></div>
      </div>
    </article>`).join('');
  $('#vaultEmpty').classList.toggle('show', archive.length === 0);
  if (archive.length > 0 && list.length === 0) grid.innerHTML = '<div class="empty-panel panel show" style="grid-column:1/-1"><div class="empty-glyph">⌕</div><h3>没有找到匹配的藏品</h3><p>换一个关键词或筛选条件试试。</p></div>';
  $$('[data-detail]', grid).forEach(button => button.addEventListener('click', () => openDetail(button.dataset.detail)));
  $$('[data-share]', grid).forEach(button => button.addEventListener('click', () => openShare(button.dataset.share)));
  $$('[data-delete]', grid).forEach(button => button.addEventListener('click', async () => {
    if (!confirm('确认删除这件藏品及其羁绊档案吗？')) return;
    const item = archive.find(entry => entry.id === button.dataset.delete);
    try {
      if (window.guziBondCloud?.isSignedIn()) await window.guziBondCloud.deleteItem(item);
      archive = archive.filter(entry => entry.id !== button.dataset.delete); saveArchive(); toast('藏品已从谷仓移除');
    } catch (error) { toast(error.message || '删除失败，请稍后重试'); }
  }));
}

['vaultSearch','vaultType','vaultSort'].forEach(id => $(`#${id}`).addEventListener(id === 'vaultSearch' ? 'input' : 'change', renderVault));
$$('[data-view]').forEach(button => button.addEventListener('click', () => { vaultView = button.dataset.view; $$('[data-view]').forEach(x => x.classList.toggle('active', x === button)); renderVault(); }));

function openDetail(id) {
  const item = archive.find(entry => entry.id === id); if (!item) return;
  $('#detailContent').innerHTML = `<div class="detail-layout">
    <div class="detail-art">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : '<span class="vault-placeholder">谷</span>'}</div>
    <div class="detail-copy"><span class="detail-code">${escapeHtml(item.ip)} · ${codeFor(item)}</span><h2>${escapeHtml(item.name)}</h2><span class="detail-level">${rarityFor(item)} · ${levelFor(item)} · 羁绊值 ${bondScore(item)}</span>
      <div class="detail-table"><div><span>本命角色</span><b>${escapeHtml(item.character || '未记录')}</b></div><div><span>谷子类型</span><b>${escapeHtml(item.type)}</b></div><div><span>当前品相</span><b>${escapeHtml(item.condition)}</b></div><div><span>购入价格</span><b>${formatMoney(item.price)}</b></div><div><span>相遇日期</span><b>${formatDate(item.buyDate)}</b></div><div><span>累计陪伴</span><b>${daysTogether(item).toLocaleString()} 天</b></div></div>
      <div class="detail-story">${escapeHtml(item.story)}${item.quote ? `<blockquote>“${escapeHtml(item.quote)}”</blockquote>` : ''}</div>
      <div class="detail-actions"><button class="button primary" data-modal-share="${item.id}">生成分享海报</button><button class="button ghost" data-go-inherit="${item.id}">发起羁绊传承</button></div>
      <h3 class="history-title">羁绊时间线</h3>${(item.history || []).length ? item.history.map(h => `<div class="history-entry"><b>${escapeHtml(h.date)}</b><br>${escapeHtml(h.message)}<br>养护手记：${escapeHtml(h.care || '无')}</div>`).join('') : '<div class="history-entry">尚未发生流转，这段羁绊仍由你继续书写。</div>'}
    </div></div>`;
  $('#detailModal').classList.add('open'); $('#detailModal').setAttribute('aria-hidden','false');
  $('[data-modal-share]').addEventListener('click', event => { closeDetail(); openShare(event.currentTarget.dataset.modalShare); });
  $('[data-go-inherit]').addEventListener('click', event => { closeDetail(); routeTo('inherit'); $('#inheritItem').value = event.currentTarget.dataset.goInherit; updatePassPreview(); });
}
function closeDetail() { $('#detailModal').classList.remove('open'); $('#detailModal').setAttribute('aria-hidden','true'); }
$$('[data-close-modal]').forEach(x => x.addEventListener('click', closeDetail));

function renderMuseum() {
  const wall = $('#museumWall');
  wall.innerHTML = archive.map((item,index) => `<article class="museum-piece" style="--rotation:${rotations[index % rotations.length]}" data-museum-detail="${item.id}">
    <div class="museum-art">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : '<span>谷</span>'}</div><h3>${escapeHtml(item.name)}</h3><blockquote>“${escapeHtml(item.quote || item.story.slice(0,50))}”</blockquote><div class="museum-plaque"><span>${escapeHtml(item.ip)}</span><span>${levelFor(item)}</span></div></article>`).join('');
  $('#museumEmpty').classList.toggle('show', archive.length === 0);
  $$('[data-museum-detail]', wall).forEach(item => item.addEventListener('click', () => openDetail(item.dataset.museumDetail)));
}

function renderInheritanceSelect() {
  const select = $('#inheritItem');
  const current = select.value;
  select.innerHTML = `<option value="">${archive.length ? '请选择谷仓中的藏品' : '请先在谷仓中录入藏品'}</option>` + archive.map(item => `<option value="${item.id}">${escapeHtml(item.name)} · ${codeFor(item)}</option>`).join('');
  if (archive.some(item => item.id === current)) select.value = current;
}

function seededBits(seed, count = 81) {
  let n = [...String(seed)].reduce((sum,char) => sum + char.charCodeAt(0), 0) || 7;
  return Array.from({length:count}, (_,index) => { n = (n * 9301 + 49297 + index) % 233280; return n / 233280 > .52; });
}

function renderIdentityCode(seed) {
  const box = $('#identityCode'); box.innerHTML = '';
  seededBits(seed).forEach(on => { const cell = document.createElement('i'); if (!on) cell.style.opacity = '0'; box.appendChild(cell); });
}

function updatePassPreview() {
  const item = archive.find(entry => entry.id === $('#inheritItem').value);
  const message = $('#inheritMessage').value.trim(); const care = $('#careTip').value.trim();
  $('#passCode').textContent = item ? `NO. ${codeFor(item)}` : 'NO. ———';
  $('#passName').textContent = item?.name || '请选择一件谷子';
  $('#passMessage').textContent = `“${message || '被认真珍惜过的物品，会带着温度继续旅行。'}”`;
  $('#passCare').textContent = care || '等待填写';
  $('#passOwner').textContent = $('#anonymous').checked ? '一位前任谷主' : (window.guziBondOwnerLabel || '嘉嘉');
  $('#passDate').textContent = item ? new Date().toLocaleDateString('zh-CN').replaceAll('/','.') : '—';
  $('#passImage').innerHTML = item?.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}">` : '<span>♡</span>';
  renderIdentityCode(item?.id || 'GUZIBOND');
}
['inheritItem','inheritMessage','careTip'].forEach(id => $(`#${id}`).addEventListener(id === 'inheritItem' ? 'change' : 'input', updatePassPreview));
$('#anonymous').addEventListener('change', updatePassPreview);

$('#inheritForm').addEventListener('submit', async event => {
  event.preventDefault();
  const item = archive.find(entry => entry.id === $('#inheritItem').value);
  const message = $('#inheritMessage').value.trim();
  if (!item || !message) { toast('请选择藏品并填写传承寄语'); return; }
  item.history = item.history || [];
  item.history.push({date:new Date().toISOString().slice(0,10), message, care:$('#careTip').value.trim()});
  try {
    if (window.guziBondCloud?.isSignedIn()) await window.guziBondCloud.saveItem(item, { uploadImage: false });
    saveArchive(); updatePassPreview(); toast('羁绊传承卡已生成并写入档案');
  } catch (error) { item.history.pop(); updatePassPreview(); toast(error.message || '云端保存失败'); }
});

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = [...String(text)]; let line = ''; let lines = 0;
  for (let index=0; index<chars.length; index++) {
    const test = line + chars[index];
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y); line = chars[index]; y += lineHeight; lines++;
      if (lines >= maxLines - 1) { line += chars.slice(index + 1).join(''); break; }
    } else line = test;
  }
  if (line && lines < maxLines) { let out = line; while (ctx.measureText(out).width > maxWidth && out.length > 1) out = out.slice(0,-1); if (out !== line) out = `${out.slice(0,-1)}…`; ctx.fillText(out, x, y); }
  return y;
}

function drawCoverImage(ctx, image, x, y, w, h) {
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale, dh = image.height * scale;
  ctx.drawImage(image, x + (w-dw)/2, y + (h-dh)/2, dw, dh);
}

function loadImage(src) { return new Promise((resolve,reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = reject; image.src = src; }); }

async function drawSharePoster(item) {
  const canvas = $('#shareCanvas'); const ctx = canvas.getContext('2d');
  const gradients = {nebula:['#261743','#71499a','#e3619e'],sakura:['#582d49','#c75c8c','#ffadb9'],aqua:['#13384f','#17758e','#50d4da'],ember:['#482218','#a64b31','#efb15b']};
  const colors = gradients[item.theme] || gradients.nebula;
  const bg = ctx.createLinearGradient(0,0,900,1200); bg.addColorStop(0,colors[0]); bg.addColorStop(.52,colors[1]); bg.addColorStop(1,colors[2]);
  ctx.fillStyle = bg; ctx.fillRect(0,0,900,1200);
  ctx.fillStyle = 'rgba(255,255,255,.09)'; ctx.beginPath(); ctx.arc(90,100,250,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(850,1040,280,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle='rgba(255,255,255,.25)';ctx.lineWidth=2;roundRect(ctx,46,46,808,1108,38);ctx.stroke();
  ctx.fillStyle='#fff';ctx.font='800 34px sans-serif';ctx.fillText('谷绊',74,102);ctx.font='500 15px sans-serif';ctx.fillStyle='rgba(255,255,255,.7)';ctx.fillText('GUZI BOND · 我的羁绊纪念',160,98);
  ctx.fillStyle='rgba(255,255,255,.92)';roundRect(ctx,82,158,736,650,34);ctx.fill();
  if (item.image) { try { const image = await loadImage(item.image); drawCoverImage(ctx,image,112,188,676,590); } catch {} }
  ctx.fillStyle='rgba(255,255,255,.14)';roundRect(ctx,82,838,130,42,21);ctx.fill();ctx.fillStyle='#fff';ctx.font='800 17px sans-serif';ctx.fillText(`${rarityFor(item)} · ${levelFor(item)}`,105,866);
  ctx.font='800 43px sans-serif';ctx.fillStyle='#fff';wrapText(ctx,item.name,82,939,730,53,2);
  ctx.font='400 20px serif';ctx.fillStyle='rgba(255,255,255,.76)';wrapText(ctx,`“${item.quote || item.story}”`,82,1024,730,31,3);
  ctx.font='600 16px sans-serif';ctx.fillStyle='rgba(255,255,255,.64)';ctx.fillText(`谷主 · ${window.guziBondOwnerLabel || '嘉嘉'}     ${codeFor(item)}     陪伴 ${daysTogether(item)} 天`,82,1122);
  ctx.textAlign='right';ctx.font='700 14px sans-serif';ctx.fillText('扫码进入我的本命展厅  ↗',818,1122);ctx.textAlign='left';
}

function roundRect(ctx,x,y,w,h,r){ctx.beginPath();ctx.roundRect ? ctx.roundRect(x,y,w,h,r) : ctx.rect(x,y,w,h);}

async function openShare(id) {
  const item = archive.find(entry => entry.id === id) || archive[0]; if (!item) { toast('请先生成一件电子谷子'); return; }
  $('#shareModal').dataset.itemId = item.id;
  await drawSharePoster(item);
  $('#shareModal').classList.add('open'); $('#shareModal').setAttribute('aria-hidden','false');
}
function closeShare() { $('#shareModal').classList.remove('open'); $('#shareModal').setAttribute('aria-hidden','true'); }
$$('[data-close-share]').forEach(x => x.addEventListener('click', closeShare));
$('#downloadPoster').addEventListener('click', () => {
  const link = document.createElement('a'); const item = archive.find(x => x.id === $('#shareModal').dataset.itemId);
  link.download = `${item?.name || '谷绊纪念'}-分享海报.png`; link.href = $('#shareCanvas').toDataURL('image/png'); link.click(); toast('纪念海报已下载');
});
$('#copyShareText').addEventListener('click', async () => {
  const item = archive.find(x => x.id === $('#shareModal').dataset.itemId); const text = `我在「谷绊」为 ${item?.name || '我的谷子'} 建立了专属羁绊档案。收藏的不只是谷子，也是与本命共同走过的时间。`;
  try { await navigator.clipboard.writeText(text); toast('分享文案已复制'); } catch { toast('当前浏览器不支持自动复制'); }
});

$('#shareMuseum').addEventListener('click', () => openShare(archive[0]?.id));

$('#downloadPass').addEventListener('click', async () => {
  const item = archive.find(entry => entry.id === $('#inheritItem').value); if (!item) { toast('请先选择一件谷子'); return; }
  const canvas = document.createElement('canvas'); canvas.width=900;canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff9ef';ctx.fillRect(0,0,900,1200);ctx.strokeStyle='#d3b48a';ctx.lineWidth=3;roundRect(ctx,35,35,830,1130,12);ctx.stroke();roundRect(ctx,52,52,796,1096,8);ctx.stroke();
  ctx.textAlign='center';ctx.fillStyle='#9e6a81';ctx.font='700 18px sans-serif';ctx.fillText('BOND INHERITANCE CERTIFICATE',450,98);ctx.fillStyle='#4f3a45';ctx.font='800 42px sans-serif';ctx.fillText('谷绊 · 羁绊传承证明',450,155);
  if(item.image){try{const image=await loadImage(item.image);ctx.save();ctx.beginPath();ctx.arc(450,380,180,0,Math.PI*2);ctx.clip();ctx.fillStyle='#f0dfeb';ctx.fillRect(270,200,360,360);drawCoverImage(ctx,image,270,200,360,360);ctx.restore();}catch{}}
  ctx.fillStyle='#b2738e';ctx.font='700 16px sans-serif';ctx.fillText(codeFor(item),450,610);ctx.fillStyle='#4f3a45';ctx.font='800 37px sans-serif';ctx.fillText(item.name,450,665);
  ctx.font='400 22px serif';ctx.fillStyle='#765d69';wrapText(ctx,`“${$('#inheritMessage').value.trim() || '被认真珍惜过的物品，会带着温度继续旅行。'}”`,160,735,580,36,4);
  ctx.strokeStyle='#e4d4c1';ctx.beginPath();ctx.moveTo(120,875);ctx.lineTo(780,875);ctx.stroke();ctx.textAlign='left';ctx.font='600 17px sans-serif';ctx.fillStyle='#9c7f8c';ctx.fillText(`前任谷主：${$('#anonymous').checked?'一位前任谷主':'嘉嘉'}`,125,920);ctx.textAlign='right';ctx.fillText(`传承时间：${new Date().toLocaleDateString('zh-CN')}`,775,920);
  ctx.textAlign='center';ctx.font='700 16px sans-serif';ctx.fillStyle='#a36d84';ctx.fillText('养护手记',450,985);ctx.font='400 17px sans-serif';ctx.fillStyle='#75636b';wrapText(ctx,$('#careTip').value.trim() || '请继续认真珍惜它。',170,1022,560,28,3);
  ctx.font='500 13px sans-serif';ctx.fillStyle='#aa969e';ctx.fillText('实物在流转，记忆在传承 · GUZI BOND',450,1120);
  const link=document.createElement('a');link.download=`${item.name}-羁绊传承卡.png`;link.href=canvas.toDataURL('image/png');link.click();toast('传承卡已下载');
});

function renderProfile() {
  const timeline = $('#profileTimeline');
  const entries = archive.flatMap(item => [{date:item.buyDate || item.createdAt.slice(0,10), title:`与「${item.name}」相遇`, text:`${item.ip} · ${item.type}`}].concat((item.history || []).map(h => ({date:h.date,title:`「${item.name}」新增传承记录`,text:h.message})))).sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,8);
  timeline.innerHTML = entries.map(entry => `<div class="timeline-item"><small>${formatDate(entry.date)}</small><h4>${escapeHtml(entry.title)}</h4><p>${escapeHtml(entry.text)}</p></div>`).join('') || '<div class="timeline-item"><h4>等待第一段羁绊</h4><p>生成第一件电子谷子后，时间线会从这里开始。</p></div>';
}

function renderAll() {
  const total = archive.length;
  const totalDays = archive.reduce((sum,item) => sum + daysTogether(item),0);
  const totalValue = archive.reduce((sum,item) => sum + Number(item.price || 0),0);
  const ipCount = new Set(archive.map(item => item.ip).filter(Boolean)).size;
  const highest = archive.length ? [...archive].sort((a,b)=>bondScore(b)-bondScore(a))[0] : null;
  $('#profileCount').textContent = `${total} 件藏品`; $('#heroArchiveCount').textContent=total; $('#heroBondDays').textContent=totalDays.toLocaleString(); $('#heroStoryCount').textContent=archive.filter(x=>x.story).length;
  $('#statTotal').textContent=total; $('#statValue').textContent=formatMoney(totalValue); $('#statDays').textContent=totalDays.toLocaleString(); $('#statLevel').textContent=highest ? levelFor(highest) : '待点亮';
  $('#museumTotal').textContent=total; $('#museumIPCount').textContent=ipCount; $('#profileStatItems').textContent=total; $('#profileStatDays').textContent=totalDays.toLocaleString(); $('#profileStatIPs').textContent=ipCount;
  renderVault(); renderMuseum(); renderInheritanceSelect(); renderProfile(); updatePassPreview();
}

$('#themeToggle').addEventListener('click', () => {
  const light = document.body.classList.toggle('light'); localStorage.setItem(THEME_KEY, light ? 'light' : 'dark'); toast(light ? '已切换为明亮模式' : '已切换为沉浸模式');
});
if (localStorage.getItem(THEME_KEY) === 'light') document.body.classList.add('light');

$('#publishMock').addEventListener('click', () => toast('正式上线后可在此发布谷子动态'));
window.addEventListener('keydown', event => { if (event.key === 'Escape') { closeDetail(); closeShare(); $('#successModal').classList.remove('open'); } });

renderTrends(); renderCommunity(); renderAll(); setupTilt(); updatePreview();
routeTo(location.hash.slice(1) || 'discover', false);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('./sw.js').catch(()=>{});
