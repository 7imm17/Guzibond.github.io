import { cloudbaseConfig, isCloudbaseConfigured } from './cloudbase-config.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const modal = $('#authModal');
const form = $('#authForm');
const message = $('#authMessage');
const submit = $('#authSubmit');
const demoNote = $('#authDemoNote');
let mode = 'login';
let auth = null;

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
  const current = auth?.currentUser;
  const raw = loginState?.user || loginState?.data?.user || current || null;
  if (!raw) return null;
  return {
    ...raw,
    email: raw.email || raw.mail || raw.userInfo?.email || '',
    username: raw.username || raw.name || raw.nickName || ''
  };
}

function applyLoginState(loginState) {
  const user = normalizeUser(loginState);
  window.guziBondUI?.setAuthUser(user);
  $('#accountEmail').textContent = user?.email || user?.username || '已登录谷主';
  if (user) closeModal();
}

function readableError(error) {
  const text = error?.message || error?.error_description || String(error || '操作失败');
  if (/password/i.test(text)) return '密码不正确，或密码不符合强度要求。';
  if (/user.*not.*found|not.*exist/i.test(text)) return '没有找到这个账号，请先注册。';
  if (/already|exist|registered/i.test(text)) return '该邮箱已经注册，请直接登录。';
  if (/verify|verification/i.test(text)) return '请先前往邮箱完成验证，再返回登录。';
  return text;
}

$('#authEntry').addEventListener('click', () => openModal('login'));
$$('[data-close-auth]').forEach(button => button.addEventListener('click', closeModal));
$$('[data-auth-tab]').forEach(button => button.addEventListener('click', () => switchMode(button.dataset.authTab)));

$('#accountMenuButton').addEventListener('click', () => {
  if (!auth?.currentUser) { openModal('login'); return; }
  $('#accountPopover').classList.toggle('is-hidden');
});

form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!auth) {
    showMessage('请先在 cloudbase-config.js 中填写 CloudBase 环境 ID。', 'error');
    return;
  }
  const email = $('#authEmail').value.trim();
  const password = $('#authPassword').value;
  if (!email || password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    showMessage('请输入有效邮箱；密码至少 8 位，并同时包含字母和数字。', 'error');
    return;
  }
  if (mode === 'register' && password !== $('#authConfirm').value) {
    showMessage('两次输入的密码不一致。', 'error');
    return;
  }
  setBusy(true);
  try {
    if (mode === 'register') {
      await auth.signUpWithEmailAndPassword(email, password);
      window.guziBondUI?.toast('注册邮件已发送');
      switchMode('login');
      $('#authEmail').value = email;
      showMessage('验证邮件已发送，请激活账号后返回登录。', 'success');
    } else {
      const result = await auth.signInWithEmailAndPassword(email, password);
      applyLoginState(result);
      window.guziBondUI?.toast('欢迎回来，云端谷仓已解锁');
    }
  } catch (error) {
    showMessage(readableError(error), 'error');
  } finally {
    setBusy(false);
  }
});

$('#forgotPassword').addEventListener('click', async () => {
  const email = $('#authEmail').value.trim();
  if (!auth) { showMessage('请先配置 CloudBase 环境 ID。', 'error'); return; }
  if (!email) { showMessage('请先填写需要找回的邮箱。', 'error'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    showMessage('密码重置邮件已发送，请检查邮箱。', 'success');
  } catch (error) { showMessage(readableError(error), 'error'); }
});

$('#signOutButton').addEventListener('click', async () => {
  if (!auth) return;
  try {
    await auth.signOut();
    $('#accountPopover').classList.add('is-hidden');
    applyLoginState(null);
    window.guziBondUI?.toast('已安全退出登录');
  } catch (error) { window.guziBondUI?.toast(readableError(error)); }
});

document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });

if (isCloudbaseConfigured()) {
  try {
    const app = window.cloudbase.init(cloudbaseConfig);
    auth = app.auth();
    demoNote.textContent = '已连接云端身份服务；登录状态会安全保存在当前设备。';
    const initialState = await auth.getLoginState();
    applyLoginState(initialState);
    auth.onLoginStateChanged(state => applyLoginState(state));
  } catch (error) {
    demoNote.textContent = '云端连接失败，请检查环境 ID、安全域名和认证设置。';
    showMessage(readableError(error), 'error');
  }
} else {
  demoNote.textContent = '当前为本地演示模式；填写 CloudBase 环境 ID 后即可启用真实账号。';
  window.guziBondUI?.setAuthUser(null);
}
