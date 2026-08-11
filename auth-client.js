(async () => {
const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const modal = $('#authModal');
const form = $('#authForm');
const message = $('#authMessage');
const submit = $('#authSubmit');
const demoNote = $('#authDemoNote');
const COLLECTION = 'guzi_archives';
let mode = 'login';
let app = null;
let auth = null;
let db = null;
let currentUser = null;
let syncing = false;

function showMessage(text = '', kind = '') {
  message.textContent = text;
  message.className = `auth-message ${kind}`.trim();
}

function setBusy(busy) {
  submit.disabled = busy;
  submit.textContent = busy ? '请稍候…' : (mode === 'login' ? '登录' : '创建账号');
}

function openModal(nextMode = 'login') {
  switchMode(nextMode);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  requestAnimationFrame(() => $('#authEmail').focus());
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  showMessage();
}

function switchMode(nextMode) {
  mode = nextMode;
  $$('[data-auth-tab]').forEach(button => button.classList.toggle('active', button.dataset.authTab === mode));
  $('#confirmField').classList.toggle('is-hidden', mode !== 'register');
  $('#authConfirm').required = mode === 'register';
  $('#authPassword').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  $('#authTitle').textContent = mode === 'login' ? '登录你的专属谷仓' : '创建你的谷主身份';
  submit.textContent = mode === 'login' ? '登录' : '创建账号';
  $('#forgotPassword').classList.toggle('is-hidden', mode !== 'login');
  showMessage();
}

function normalizeUser(loginState) {
  const raw = loginState?.user || loginState?.data?.user || auth?.currentUser || null;
  if (!raw) return null;
  return {
    ...raw,
    uid: raw.uid || raw.id || raw.userInfo?.uid || raw.userInfo?.id || '',
    email: raw.email || raw.mail || raw.userInfo?.email || '',
    username: raw.username || raw.name || raw.nickName || ''
  };
}

function readableError(error) {
  const text = error?.message || error?.error_description || String(error || '操作失败');
  if (/collection.*not.*exist|DATABASE_COLLECTION_NOT_EXIST/i.test(text)) return '云数据库集合尚未创建，请按 README 创建 guzi_archives。';
  if (/permission|unauthor|auth/i.test(text)) return '没有访问权限，请检查登录状态和数据库安全规则。';
  if (/cors|domain|origin/i.test(text)) return '当前域名未加入 CloudBase 安全域名，请稍后重试。';
  if (/password/i.test(text)) return '密码不正确，或密码不符合强度要求。';
  if (/user.*not.*found|not.*exist/i.test(text)) return '没有找到这个账号，请先注册。';
  if (/already|exist|registered/i.test(text)) return '该邮箱已经注册，请直接登录。';
  if (/verify|verification/i.test(text)) return '请先前往邮箱完成验证，再返回登录。';
  return text;
}

function dataUrlToBlob(dataUrl) {
  const [header, content] = dataUrl.split(',');
  const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
  if (header.includes(';base64')) {
    const binary = atob(content);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(content)], { type: mime });
}

function safeCloudDocument(item, ownerId, imageFileId = item.imageFileId || '') {
  const { image, _id, isDemo, ...rest } = item;
  return {
    ...rest,
    id: String(item.id),
    ownerId,
    imageFileId,
    visibility: item.visibility || 'private',
    updatedAt: new Date().toISOString()
  };
}

async function uploadImage(item, uid) {
  if (!item.image?.startsWith('data:')) return item.imageFileId || '';
  const blob = dataUrlToBlob(item.image);
  const ext = blob.type.includes('png') ? 'png' : blob.type.includes('webp') ? 'webp' : blob.type.includes('svg') ? 'svg' : 'jpg';
  const cloudPath = `users/${uid}/guzi/${item.id}/cover.${ext}`;
  const result = await app.uploadFile({ cloudPath, filePath: blob });
  if (!result?.fileID) throw new Error('图片上传失败，未获得云端文件地址。');
  return result.fileID;
}

async function resolveImages(items) {
  const fileIds = [...new Set(items.map(item => item.imageFileId).filter(Boolean))];
  if (!fileIds.length) return items;
  try {
    const result = await app.getTempFileURL({ fileList: fileIds.map(fileID => ({ fileID, maxAge: 86400 })) });
    const urls = new Map((result.fileList || []).map(entry => [entry.fileID, entry.tempFileURL]));
    return items.map(item => ({ ...item, image: urls.get(item.imageFileId) || '' }));
  } catch { return items.map(item => ({ ...item, image: '' })); }
}

async function saveItem(item, { uploadImage: shouldUpload = true } = {}) {
  if (!currentUser?.uid) throw new Error('请先登录后再保存档案。');
  const imageFileId = shouldUpload ? await uploadImage(item, currentUser.uid) : (item.imageFileId || '');
  const payload = safeCloudDocument(item, currentUser.uid, imageFileId);
  await db.collection(COLLECTION).doc(String(item.id)).set(payload);
  return { ...item, imageFileId, ownerId: currentUser.uid, visibility: payload.visibility, updatedAt: payload.updatedAt };
}

async function deleteItem(item) {
  if (!currentUser?.uid || !item) throw new Error('请先登录后再删除档案。');
  await db.collection(COLLECTION).doc(String(item.id)).remove();
  if (item.imageFileId) {
    try { await app.deleteFile({ fileList: [item.imageFileId] }); } catch {}
  }
}

async function loadCloudArchive(uid) {
  const result = await db.collection(COLLECTION).where({ ownerId: uid }).limit(100).get();
  const records = Array.isArray(result?.data) ? result.data : [];
  const normalized = records.map(record => ({ ...record, id: String(record.id || record._id) }));
  const withImages = await resolveImages(normalized);
  return withImages.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

async function migrateLocalArchive(items) {
  const migrated = [];
  for (let index = 0; index < items.length; index++) {
    window.guziBondUI?.toast(`正在迁移第 ${index + 1}/${items.length} 件谷子…`);
    migrated.push(await saveItem(items[index]));
  }
  return migrated;
}

async function syncAfterLogin(user) {
  if (!user?.uid || syncing) return;
  syncing = true;
  window.guziBondUI?.setUserContext(user.uid);
  const cached = window.guziBondUI?.getUserCache(user.uid) || [];
  if (cached.length) window.guziBondUI?.setArchive(cached, { cache: false });
  try {
    let cloudItems = await loadCloudArchive(user.uid);
    const localItems = window.guziBondUI?.getMigratableLocalArchive() || [];
    if (!cloudItems.length && localItems.length) {
      const shouldMigrate = confirm(`检测到本机有 ${localItems.length} 件自己创建的谷子档案，是否迁移到云端谷仓？\n\n演示藏品不会被迁移。`);
      if (shouldMigrate) cloudItems = await migrateLocalArchive(localItems);
    }
    window.guziBondUI?.setArchive(cloudItems);
    window.guziBondUI?.toast(cloudItems.length ? `云端谷仓同步完成，共 ${cloudItems.length} 件` : '云端谷仓已连接，可以创建第一件谷子');
  } catch (error) {
    window.guziBondUI?.toast(readableError(error));
  } finally { syncing = false; }
}

async function applyLoginState(loginState) {
  const user = normalizeUser(loginState);
  currentUser = user;
  window.guziBondUI?.setAuthUser(user);
  $('#accountEmail').textContent = user?.email || user?.username || '已登录谷主';
  if (user) {
    closeModal();
    await syncAfterLogin(user);
  }
}

window.guziBondCloud = {
  isSignedIn: () => Boolean(currentUser?.uid),
  saveItem,
  deleteItem,
  reload: () => currentUser?.uid ? syncAfterLogin(currentUser) : Promise.resolve()
};

$('#authEntry').addEventListener('click', () => openModal('login'));
$$('[data-close-auth]').forEach(button => button.addEventListener('click', closeModal));
$$('[data-auth-tab]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.authTab)));

$('#accountMenuButton').addEventListener('click', () => {
  if (!currentUser) { openModal('login'); return; }
  $('#accountPopover').classList.toggle('is-hidden');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!auth) { showMessage('云端服务尚未初始化，请检查环境配置。', 'error'); return; }
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  if (!email || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    showMessage('请输入有效邮箱；密码至少 8 位，并同时包含字母和数字。', 'error'); return;
  }
  if (mode === 'register' && password !== $('#authConfirm').value) { showMessage('两次输入的密码不一致。', 'error'); return; }
  setBusy(true);
  try {
    if (mode === 'register') {
      await auth.signUpWithEmailAndPassword(email, password);
      window.guziBondUI?.toast('注册邮件已发送');
      switchMode('login'); $('#authEmail').value = email;
      showMessage('验证邮件已发送，请激活账号后返回登录。', 'success');
    } else {
      const result = await auth.signInWithEmailAndPassword(email, password);
      await applyLoginState(result);
      window.guziBondUI?.toast('欢迎回来，云端谷仓已解锁');
    }
  } catch (error) { showMessage(readableError(error), 'error'); }
  finally { setBusy(false); }
});

$('#forgotPassword').addEventListener('click', async () => {
  const email = $('#authEmail').value.trim();
  if (!auth) { showMessage('云端服务尚未初始化。', 'error'); return; }
  if (!email) { showMessage('请先填写需要找回的邮箱。', 'error'); return; }
  try { await auth.sendPasswordResetEmail(email); showMessage('密码重置邮件已发送，请检查邮箱。', 'success'); }
  catch (error) { showMessage(readableError(error), 'error'); }
});

$('#signOutButton').addEventListener('click', async () => {
  if (!auth) return;
  try {
    await auth.signOut();
    currentUser = null;
    $('#accountPopover').classList.add('is-hidden');
    window.guziBondUI?.setAuthUser(null);
    window.guziBondUI?.restoreGuestDemo();
    window.guziBondUI?.toast('已安全退出登录');
  } catch (error) { window.guziBondUI?.toast(readableError(error)); }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

if (window.isGuziBondCloudbaseConfigured()) {
  try {
    app = window.cloudbase.init(window.guziBondCloudbaseConfig);
    auth = app.auth({ persistence: 'local' });
    db = app.database();
    demoNote.textContent = '已连接谷绊云端；登录后档案与图片将同步到专属云仓。';
    const initialState = await auth.getLoginState();
    await applyLoginState(initialState);
    auth.onLoginStateChanged(async () => {
      const state = await auth.getLoginState();
      if (state && !currentUser) await applyLoginState(state);
      if (!state && currentUser) {
        currentUser = null;
        window.guziBondUI?.setAuthUser(null);
        window.guziBondUI?.restoreGuestDemo();
      }
    });
  } catch (error) {
    demoNote.textContent = '云端连接失败，请检查安全域名、认证方式和网络。';
    showMessage(readableError(error), 'error');
  }
} else {
  demoNote.textContent = '当前为本地演示模式；填写 CloudBase 环境 ID 后即可启用真实账号。';
  window.guziBondUI?.setAuthUser(null);
}
})().catch(error => {
  console.error('[GUZI BOND] CloudBase initialization failed:', error);
  const note = document.querySelector('#authDemoNote');
  if (note) note.textContent = '云端连接失败，请检查安全域名、认证方式和网络。';
});
