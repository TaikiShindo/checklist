/**
 * 機種変更ログイン情報管理アプリ
 * app.js — メインロジック
 */

// ===========================
// Constants & State
// ===========================
const STORAGE_KEY = 'kishine_apps_v1';
const API_KEY_STORAGE = 'kishine_gemini_key';
const API_MODEL_STORAGE = 'kishine_gemini_model';

// 利用可能なGeminiモデル一覧
const GEMINI_MODELS = [
  { value: 'gemini-2.0-flash',       label: 'Gemini 2.0 Flash（最新・推奨）' },
  { value: 'gemini-1.5-flash',       label: 'Gemini 1.5 Flash（安定版）' },
  { value: 'gemini-1.5-flash-8b',    label: 'Gemini 1.5 Flash-8B（軽量・無料枠多め）' },
  { value: 'gemini-1.5-pro',         label: 'Gemini 1.5 Pro（高精度）' },
];

const CATEGORIES = ['SNS', '金融', 'ショッピング', 'エンタメ', '仕事', 'その他'];

const CATEGORY_ICONS = {
  'SNS': '📱',
  '金融': '💰',
  'ショッピング': '🛒',
  'エンタメ': '🎮',
  '仕事': '💼',
  'その他': '📦',
};

let state = {
  apps: [],          // { id, name, category, loginId, password, memo, completed, createdAt }
  editingId: null,   // currently editing app id (null = add new)
  filterCat: 'all',
  searchQuery: '',
  uploadedImageBase64: null,
  uploadedImageFile: null,
};

// ===========================
// LocalStorage
// ===========================
function saveApps() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.apps));
}

function loadApps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state.apps = JSON.parse(raw);
  } catch (e) {
    state.apps = [];
  }
}

function saveApiKey(key) {
  localStorage.setItem(API_KEY_STORAGE, key);
}

function loadApiKey() {
  return localStorage.getItem(API_KEY_STORAGE) || '';
}

function saveModel(model) {
  localStorage.setItem(API_MODEL_STORAGE, model);
}

function loadModel() {
  return localStorage.getItem(API_MODEL_STORAGE) || 'gemini-1.5-flash';
}

// ===========================
// Utility
// ===========================
function generateId() {
  return `app_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str || '';
  return d.innerHTML;
}

function maskPassword(pw) {
  if (!pw) return '';
  return '●'.repeat(Math.min(pw.length, 10));
}

// ===========================
// Toast Notifications
// ===========================
function showToast(msg, type = 'success', duration = 3000) {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${icons[type]}</span>
    <span class="toast-msg">${escapeHtml(msg)}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('hiding');
    toast.addEventListener('animationend', () => toast.remove());
  }, duration);
}

// ===========================
// Modal helpers
// ===========================
function openModal(id) {
  const el = document.getElementById(id);
  el.classList.add('open');
  // Trap focus inside modal
  const firstFocusable = el.querySelector('input, button, select, textarea');
  if (firstFocusable) setTimeout(() => firstFocusable.focus(), 300);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('open'));
}

// Close on overlay click
document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAllModals();
  });
});

// ===========================
// Render App Cards
// ===========================
function getFilteredApps() {
  return state.apps.filter(app => {
    const matchCat = state.filterCat === 'all' || app.category === state.filterCat;
    const matchSearch = !state.searchQuery ||
      app.name.toLowerCase().includes(state.searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });
}

function renderApps() {
  const grid = document.getElementById('apps-grid');
  const filtered = getFilteredApps();

  if (filtered.length === 0) {
    const emptyMsg = state.apps.length === 0
      ? `<span class="empty-icon">📱</span>
         <h2 class="empty-title">アプリがまだ登録されていません</h2>
         <p class="empty-desc">
           「＋ アプリ追加」ボタンで手動追加するか、<br>
           「📸 AI解析」ボタンでスクリーンショットから自動抽出しましょう。
         </p>`
      : `<span class="empty-icon">🔍</span>
         <h2 class="empty-title">該当するアプリが見つかりません</h2>
         <p class="empty-desc">検索条件を変えてみてください。</p>`;

    grid.innerHTML = `<div class="empty-state" role="status">${emptyMsg}</div>`;
    return;
  }

  grid.innerHTML = filtered.map((app, idx) => renderCard(app, idx)).join('');

  // Bind card events
  filtered.forEach(app => {
    // Checkbox
    const cb = document.getElementById(`check-${app.id}`);
    if (cb) {
      cb.addEventListener('change', () => {
        toggleComplete(app.id, cb.checked);
      });
    }
    // Edit
    const editBtn = document.getElementById(`edit-${app.id}`);
    if (editBtn) editBtn.addEventListener('click', () => openEditModal(app.id));
    // Delete
    const delBtn = document.getElementById(`delete-${app.id}`);
    if (delBtn) delBtn.addEventListener('click', () => deleteApp(app.id));
    // Password toggle
    const toggleBtn = document.getElementById(`toggle-pw-${app.id}`);
    const pwEl = document.getElementById(`pw-val-${app.id}`);
    if (toggleBtn && pwEl) {
      toggleBtn.addEventListener('click', () => {
        const showing = toggleBtn.dataset.showing === 'true';
        if (showing) {
          pwEl.textContent = maskPassword(app.password);
          pwEl.classList.add('password');
          toggleBtn.dataset.showing = 'false';
          toggleBtn.setAttribute('aria-label', 'パスワードを表示');
          toggleBtn.textContent = '👁️';
        } else {
          pwEl.textContent = app.password || '（未入力）';
          pwEl.classList.remove('password');
          toggleBtn.dataset.showing = 'true';
          toggleBtn.setAttribute('aria-label', 'パスワードを非表示');
          toggleBtn.textContent = '🙈';
        }
      });
    }
  });
}

function renderCard(app, idx) {
  const catIcon = CATEGORY_ICONS[app.category] || '📦';
  const pwDisplay = app.password ? maskPassword(app.password) : '（未入力）';
  const pwClass = app.password ? 'password' : 'empty';
  const idDisplay = app.loginId || '（未入力）';
  const idClass = app.loginId ? '' : 'empty';

  return `
    <div class="app-card${app.completed ? ' completed' : ''}" 
         role="listitem" 
         id="card-${app.id}"
         style="animation-delay: ${idx * 0.04}s">
      <div class="card-header">
        <input
          type="checkbox"
          class="card-check"
          id="check-${app.id}"
          ${app.completed ? 'checked' : ''}
          aria-label="${escapeHtml(app.name)}を確認済みにする"
        />
        <div class="card-info">
          <div class="card-app-name">${escapeHtml(app.name)}</div>
          <span class="card-category">${catIcon} ${escapeHtml(app.category)}</span>
        </div>
        <div class="card-actions">
          <button class="card-action-btn" id="edit-${app.id}" aria-label="${escapeHtml(app.name)}を編集" title="編集">✏️</button>
          <button class="card-action-btn delete" id="delete-${app.id}" aria-label="${escapeHtml(app.name)}を削除" title="削除">🗑️</button>
        </div>
      </div>
      <div class="card-fields">
        <div class="field-row">
          <span class="field-label">ID</span>
          <span class="field-value ${idClass}">${escapeHtml(idDisplay)}</span>
        </div>
        <div class="field-row">
          <span class="field-label">パスワード</span>
          <span class="field-value ${pwClass}" id="pw-val-${app.id}">${escapeHtml(pwDisplay)}</span>
          ${app.password ? `<button class="toggle-pw" id="toggle-pw-${app.id}" data-showing="false" aria-label="パスワードを表示">👁️</button>` : ''}
        </div>
        ${app.memo ? `<div class="card-memo" aria-label="メモ">${escapeHtml(app.memo)}</div>` : ''}
      </div>
    </div>
  `;
}

// ===========================
// Stats & Progress
// ===========================
function updateStats() {
  const total = state.apps.length;
  const completed = state.apps.filter(a => a.completed).length;
  const remaining = total - completed;
  const cats = new Set(state.apps.map(a => a.category)).size;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-completed').textContent = completed;
  document.getElementById('stat-remaining').textContent = remaining;
  document.getElementById('stat-categories').textContent = cats;
  document.getElementById('progress-pct').textContent = `${pct}%`;
  const bar = document.getElementById('progress-bar');
  bar.style.width = `${pct}%`;
  bar.parentElement.setAttribute('aria-valuenow', pct);

  // Category counts
  document.getElementById('count-all').textContent = state.apps.length;
  CATEGORIES.forEach(cat => {
    const key = { 'SNS': 'sns', '金融': 'finance', 'ショッピング': 'shopping', 'エンタメ': 'entertain', '仕事': 'work', 'その他': 'other' }[cat];
    const el = document.getElementById(`count-${key}`);
    if (el) el.textContent = state.apps.filter(a => a.category === cat).length;
  });
}

function fullRender() {
  updateStats();
  renderApps();
}

// ===========================
// CRUD Operations
// ===========================
function addApp(data) {
  const app = {
    id: generateId(),
    name: data.name.trim(),
    category: data.category || 'その他',
    loginId: data.loginId || '',
    password: data.password || '',
    memo: data.memo || '',
    completed: false,
    createdAt: new Date().toISOString(),
  };
  state.apps.push(app);
  saveApps();
  fullRender();
  showToast(`「${app.name}」を追加しました`);
}

function updateApp(id, data) {
  const idx = state.apps.findIndex(a => a.id === id);
  if (idx === -1) return;
  state.apps[idx] = {
    ...state.apps[idx],
    name: data.name.trim(),
    category: data.category || 'その他',
    loginId: data.loginId || '',
    password: data.password || '',
    memo: data.memo || '',
  };
  saveApps();
  fullRender();
  showToast(`「${state.apps[idx].name}」を更新しました`);
}

function deleteApp(id) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;
  if (!confirm(`「${app.name}」を削除しますか？`)) return;
  state.apps = state.apps.filter(a => a.id !== id);
  saveApps();
  fullRender();
  showToast(`「${app.name}」を削除しました`, 'info');
}

function toggleComplete(id, value) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;
  app.completed = value;
  saveApps();
  updateStats();
  // Update card class
  const card = document.getElementById(`card-${id}`);
  if (card) card.classList.toggle('completed', value);
}

// ===========================
// Modal: Add / Edit App
// ===========================
function openAddModal() {
  state.editingId = null;
  document.getElementById('modal-app-title').textContent = 'アプリを追加';
  document.getElementById('modal-app-save').textContent = '💾 保存する';
  clearAppForm();
  openModal('modal-app');
}

function openEditModal(id) {
  const app = state.apps.find(a => a.id === id);
  if (!app) return;
  state.editingId = id;
  document.getElementById('modal-app-title').textContent = 'アプリを編集';
  document.getElementById('modal-app-save').textContent = '💾 更新する';
  document.getElementById('input-app-name').value = app.name;
  document.getElementById('input-category').value = app.category;
  document.getElementById('input-id').value = app.loginId;
  document.getElementById('input-password').value = app.password;
  document.getElementById('input-memo').value = app.memo;
  openModal('modal-app');
}

function clearAppForm() {
  document.getElementById('input-app-name').value = '';
  document.getElementById('input-category').value = 'その他';
  document.getElementById('input-id').value = '';
  document.getElementById('input-password').value = '';
  document.getElementById('input-memo').value = '';
}

function saveAppModal() {
  const name = document.getElementById('input-app-name').value.trim();
  if (!name) {
    showToast('アプリ名を入力してください', 'error');
    document.getElementById('input-app-name').focus();
    return;
  }
  const data = {
    name,
    category: document.getElementById('input-category').value,
    loginId: document.getElementById('input-id').value.trim(),
    password: document.getElementById('input-password').value,
    memo: document.getElementById('input-memo').value.trim(),
  };
  if (state.editingId) {
    updateApp(state.editingId, data);
  } else {
    addApp(data);
  }
  closeModal('modal-app');
}

// ===========================
// Modal: Screenshot Analysis
// ===========================
function openScreenshotModal() {
  // Load saved API key & model
  const savedKey = loadApiKey();
  document.getElementById('input-api-key').value = savedKey;
  const savedModel = loadModel();
  document.getElementById('select-model').value = savedModel;
  // Reset state
  state.uploadedImageBase64 = null;
  state.uploadedImageFile = null;
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('extracted-result').style.display = 'none';
  document.getElementById('analyzing-state').style.display = 'none';
  document.getElementById('btn-analyze').style.display = 'none';
  document.getElementById('btn-add-extracted').style.display = 'none';
  document.getElementById('file-input').value = '';
  openModal('modal-screenshot');
}

async function analyzeScreenshot() {
  const apiKey = document.getElementById('input-api-key').value.trim();
  if (!apiKey) {
    showToast('Gemini API Keyを入力してください', 'error');
    return;
  }
  if (!state.uploadedImageBase64) {
    showToast('スクリーンショットを選択してください', 'error');
    return;
  }

  // モデルを取得
  const model = document.getElementById('select-model').value;

  // Save key & model
  saveApiKey(apiKey);
  saveModel(model);
  document.getElementById('settings-api-key').value = apiKey;

  // Show spinner
  document.getElementById('analyzing-state').style.display = 'block';
  document.getElementById('extracted-result').style.display = 'none';
  document.getElementById('btn-analyze').style.display = 'none';
  document.getElementById('btn-add-extracted').style.display = 'none';

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: state.uploadedImageMimeType || 'image/jpeg',
                  data: state.uploadedImageBase64,
                }
              },
              {
                text: `この画像はスマートフォンのアプリ一覧またはホーム画面のスクリーンショットです。
画像に含まれるすべてのアプリ名を日本語または英語で正確に抽出してください。
アプリ名のみをJSON配列形式で出力してください。例: ["LINE", "Twitter", "楽天市場", "Amazon"]
余計な説明は不要です。JSONのみ出力してください。`
              }
            ]
          }]
        })
      }
    );

    if (!response.ok) {
      const errData = await response.json();
      const rawMsg = errData.error?.message || `API Error: ${response.status}`;

      // クォータエラーを分かりやすく日本語化
      if (rawMsg.includes('Quota exceeded') || rawMsg.includes('quota')) {
        throw new Error(
          `無料枠の上限に達しました。\n` +
          `【対処法】\n` +
          `① 別のモデル（例: Gemini 1.5 Flash-8B）に切り替えてください\n` +
          `② Google Cloud で請求先アカウントを設定してください\n` +
          `③ しばらく待ってから再試行してください`
        );
      }
      if (rawMsg.includes('API_KEY_INVALID') || rawMsg.includes('invalid')) {
        throw new Error('APIキーが無効です。Google AI Studio で正しいキーを確認してください。');
      }
      throw new Error(rawMsg);
    }

    const result = await response.json();
    const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Parse JSON from response
    let apps = [];
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      apps = JSON.parse(jsonMatch[0]);
    } else {
      // Fallback: extract lines
      apps = text.split('\n').map(l => l.replace(/^[-•*]\s*/, '').trim()).filter(l => l.length > 0 && l.length < 50);
    }

    if (apps.length === 0) {
      throw new Error('アプリが検出できませんでした。別のスクリーンショットを試してください。');
    }

    // Show results
    document.getElementById('analyzing-state').style.display = 'none';
    document.getElementById('extracted-result').style.display = 'block';
    document.getElementById('btn-add-extracted').style.display = 'inline-flex';

    const list = document.getElementById('extracted-list');
    list.innerHTML = apps.map((name, i) => `
      <label class="extracted-item" for="ex-${i}">
        <input type="checkbox" id="ex-${i}" value="${escapeHtml(name)}" checked />
        <span>${escapeHtml(name)}</span>
      </label>
    `).join('');

    showToast(`${apps.length}件のアプリを検出しました（${model}）`, 'success');

  } catch (err) {
    document.getElementById('analyzing-state').style.display = 'none';
    document.getElementById('btn-analyze').style.display = 'inline-flex';
    // 改行を含むエラーメッセージをトースト表示
    const shortMsg = err.message.split('\n')[0];
    showToast(`エラー: ${shortMsg}`, 'error', 6000);
    // 詳細をコンソールとアラートで確認できるよう
    console.error('[Gemini API Error]', err.message);
    if (err.message.includes('無料枠')) {
      // 少し遅らせてアラート（トーストが見えるように）
      setTimeout(() => alert(
        '【Gemini APIエラー】\n\n' + err.message +
        '\n\n▶ モデルを「Gemini 1.5 Flash-8B」に変更して再試行してください。'
      ), 500);
    }
  }
}

function addExtractedApps() {
  const checkboxes = document.querySelectorAll('#extracted-list input[type="checkbox"]:checked');
  if (checkboxes.length === 0) {
    showToast('追加するアプリを選択してください', 'error');
    return;
  }
  let added = 0;
  checkboxes.forEach(cb => {
    const name = cb.value.trim();
    if (!name) return;
    // Skip duplicates
    const exists = state.apps.some(a => a.name.toLowerCase() === name.toLowerCase());
    if (!exists) {
      const app = {
        id: generateId(),
        name,
        category: 'その他',
        loginId: '',
        password: '',
        memo: '',
        completed: false,
        createdAt: new Date().toISOString(),
      };
      state.apps.push(app);
      added++;
    }
  });
  saveApps();
  fullRender();
  closeModal('modal-screenshot');
  showToast(`${added}件のアプリを追加しました（重複除外済み）`);
}

// ===========================
// File Upload
// ===========================
function handleFileSelect(file) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('画像ファイルを選択してください', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const dataUrl = e.target.result;
    const base64 = dataUrl.split(',')[1];
    state.uploadedImageBase64 = base64;
    state.uploadedImageMimeType = file.type;

    // Show preview
    const preview = document.getElementById('upload-preview');
    const img = document.getElementById('preview-img');
    img.src = dataUrl;
    preview.style.display = 'block';

    // Show analyze button
    document.getElementById('btn-analyze').style.display = 'inline-flex';
    document.getElementById('extracted-result').style.display = 'none';
    document.getElementById('btn-add-extracted').style.display = 'none';
  };
  reader.readAsDataURL(file);
}

// ===========================
// PDF Generation
// ===========================
function generatePDF() {
  if (state.apps.length === 0) {
    showToast('アプリが登録されていません', 'error');
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load Japanese font note: jsPDF doesn't support Japanese natively without plugin
  // Use Unicode-safe encoding for Japanese text
  // We'll use autoTable with a workaround

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

  // ---- Header ----
  // Background rect
  doc.setFillColor(10, 14, 26);
  doc.rect(0, 0, pageWidth, 35, 'F');

  // Gradient simulation (manual rects)
  for (let i = 0; i < 35; i++) {
    const ratio = i / 35;
    const r = Math.round(10 + ratio * (124 - 10));
    const g = Math.round(14 + ratio * (92 - 14));
    const b = Math.round(26 + ratio * (252 - 26));
    doc.setFillColor(r, g, b);
    doc.rect(0, i, pageWidth / 2, 1, 'F');
  }
  // Re-draw dark right half
  doc.setFillColor(10, 14, 26);
  doc.rect(pageWidth / 2, 0, pageWidth / 2, 35, 'F');

  doc.setTextColor(0, 229, 160);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Smartphone Migration', 14, 14);
  doc.text('Login Info Checklist', 14, 23);

  doc.setFontSize(9);
  doc.setTextColor(180, 180, 200);
  doc.text(`${today} | Total: ${state.apps.length} apps`, 14, 31);

  // ---- Summary Box ----
  const completed = state.apps.filter(a => a.completed).length;
  const pct = state.apps.length > 0 ? Math.round((completed / state.apps.length) * 100) : 0;

  doc.setFillColor(20, 25, 50);
  doc.roundedRect(14, 40, pageWidth - 28, 18, 3, 3, 'F');
  doc.setTextColor(0, 229, 160);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Progress: ${completed} / ${state.apps.length} confirmed (${pct}%)`, 18, 51);

  let y = 66;

  // ---- Category Sections ----
  const grouped = {};
  state.apps.forEach(app => {
    if (!grouped[app.category]) grouped[app.category] = [];
    grouped[app.category].push(app);
  });

  const catOrder = ['SNS', '金融', 'ショッピング', 'エンタメ', '仕事', 'その他'];
  const allCats = [...catOrder.filter(c => grouped[c]), ...Object.keys(grouped).filter(c => !catOrder.includes(c))];

  allCats.forEach(cat => {
    const apps = grouped[cat];
    if (!apps || apps.length === 0) return;

    // Check page space
    if (y > 240) {
      doc.addPage();
      y = 20;
    }

    // Category Header
    doc.setFillColor(30, 20, 60);
    doc.roundedRect(14, y, pageWidth - 28, 9, 2, 2, 'F');
    doc.setTextColor(167, 139, 250);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    const catLabel = `${CATEGORY_ICONS[cat] || ''} ${cat}  (${apps.length})`;
    doc.text(catLabel, 18, y + 6.2);
    y += 14;

    // Table
    const rows = apps.map(app => [
      app.completed ? '✓' : '○',
      app.name,
      app.loginId || '-',
      app.password || '-',
      app.memo || '-',
    ]);

    doc.autoTable({
      startY: y,
      head: [['確認', 'アプリ名', 'ID / メール', 'パスワード', 'メモ']],
      body: rows,
      theme: 'grid',
      headStyles: {
        fillColor: [15, 22, 41],
        textColor: [0, 229, 160],
        fontSize: 8,
        fontStyle: 'bold',
        cellPadding: 3,
      },
      bodyStyles: {
        fillColor: [18, 22, 40],
        textColor: [200, 210, 240],
        fontSize: 8,
        cellPadding: 3,
      },
      alternateRowStyles: {
        fillColor: [22, 28, 50],
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: 'auto' },
      },
      margin: { left: 14, right: 14 },
      styles: { overflow: 'linebreak', font: 'helvetica' },
      didDrawPage: (data) => {
        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(8);
        doc.setTextColor(100, 110, 140);
        doc.text(
          `Page ${data.pageNumber} / ${pageCount}  |  Smartphone Migration Checklist`,
          14,
          doc.internal.pageSize.getHeight() - 8
        );
      }
    });

    y = doc.lastAutoTable.finalY + 12;
  });

  // ---- Security Notice ----
  if (y < 260) {
    doc.setFillColor(10, 30, 20);
    doc.roundedRect(14, y, pageWidth - 28, 18, 3, 3, 'F');
    doc.setTextColor(0, 229, 160);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('⚠  This document contains sensitive information. Please handle it carefully and delete after use.', 18, y + 7);
    doc.text('⚠  このファイルには機密情報が含まれています。使用後は安全に削除してください。', 18, y + 13);
  }

  // Save
  const filename = `機種変更ログイン情報_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
  showToast('PDFをダウンロードしました', 'success');
}

// ===========================
// Settings Modal
// ===========================
function openSettingsModal() {
  document.getElementById('settings-api-key').value = loadApiKey();
  openModal('modal-settings');
}

function saveSettings() {
  const key = document.getElementById('settings-api-key').value.trim();
  saveApiKey(key);
  closeModal('modal-settings');
  showToast('設定を保存しました');
}

// Export JSON
function exportJSON() {
  const data = JSON.stringify(state.apps, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `kishine_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('JSONをエクスポートしました');
}

// Import JSON
function importJSON(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!Array.isArray(data)) throw new Error('形式が正しくありません');
      if (!confirm(`${data.length}件のデータをインポートします。既存データと統合しますか？`)) return;
      // Merge by id
      const existingIds = new Set(state.apps.map(a => a.id));
      let added = 0;
      data.forEach(app => {
        if (!existingIds.has(app.id)) {
          state.apps.push(app);
          added++;
        }
      });
      saveApps();
      fullRender();
      closeModal('modal-settings');
      showToast(`${added}件をインポートしました`);
    } catch (err) {
      showToast(`インポート失敗: ${err.message}`, 'error');
    }
  };
  reader.readAsText(file);
}

// Clear all
function clearAllData() {
  if (!confirm('すべてのデータを削除します。この操作は取り消せません。よろしいですか？')) return;
  state.apps = [];
  saveApps();
  fullRender();
  closeModal('modal-settings');
  showToast('すべてのデータを削除しました', 'info');
}

// ===========================
// Password Toggle Helpers
// ===========================
function bindPasswordToggle(btnId, inputId) {
  const btn = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const showing = input.type === 'text';
    input.type = showing ? 'password' : 'text';
    btn.textContent = showing ? '👁️' : '🙈';
    btn.setAttribute('aria-label', showing ? 'パスワードを表示' : 'パスワードを非表示');
  });
}

// ===========================
// Event Bindings
// ===========================
function bindEvents() {
  // Header buttons
  document.getElementById('btn-add').addEventListener('click', openAddModal);
  document.getElementById('btn-screenshot').addEventListener('click', openScreenshotModal);
  document.getElementById('btn-pdf').addEventListener('click', generatePDF);
  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);

  // App modal
  document.getElementById('modal-app-close').addEventListener('click', () => closeModal('modal-app'));
  document.getElementById('modal-app-cancel').addEventListener('click', () => closeModal('modal-app'));
  document.getElementById('modal-app-save').addEventListener('click', saveAppModal);

  // App form — Enter key submit
  document.getElementById('modal-app').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      saveAppModal();
    }
  });

  // Password toggle in form
  bindPasswordToggle('toggle-input-pw', 'input-password');

  // Screenshot modal
  document.getElementById('modal-ss-close').addEventListener('click', () => closeModal('modal-screenshot'));
  document.getElementById('modal-ss-cancel').addEventListener('click', () => closeModal('modal-screenshot'));
  document.getElementById('btn-analyze').addEventListener('click', analyzeScreenshot);
  document.getElementById('btn-add-extracted').addEventListener('click', addExtractedApps);
  bindPasswordToggle('toggle-api-key', 'input-api-key');

  // File input
  const fileInput = document.getElementById('file-input');
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleFileSelect(file);
  });

  // Drag and drop
  const uploadZone = document.getElementById('upload-zone');
  uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadZone.classList.add('dragging');
  });
  uploadZone.addEventListener('dragleave', () => uploadZone.classList.remove('dragging'));
  uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadZone.classList.remove('dragging');
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  });

  // Settings modal
  document.getElementById('modal-settings-close').addEventListener('click', () => closeModal('modal-settings'));
  document.getElementById('modal-settings-cancel').addEventListener('click', () => closeModal('modal-settings'));
  document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  document.getElementById('btn-import-trigger').addEventListener('click', () => {
    document.getElementById('btn-import').click();
  });
  document.getElementById('btn-import').addEventListener('change', (e) => importJSON(e.target.files[0]));
  document.getElementById('btn-clear-all').addEventListener('click', clearAllData);
  bindPasswordToggle('toggle-settings-api-key', 'settings-api-key');

  // Search
  document.getElementById('search-input').addEventListener('input', (e) => {
    state.searchQuery = e.target.value;
    renderApps();
  });

  // Category tabs
  document.getElementById('category-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    document.querySelectorAll('.cat-tab').forEach(t => {
      t.classList.remove('active');
      t.setAttribute('aria-selected', 'false');
    });
    tab.classList.add('active');
    tab.setAttribute('aria-selected', 'true');
    state.filterCat = tab.dataset.cat;
    renderApps();
  });

  // Keyboard: ESC closes modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAllModals();
  });
}

// ===========================
// Initialize
// ===========================
function init() {
  loadApps();
  bindEvents();
  fullRender();
  // Load saved API key into settings
  document.getElementById('settings-api-key').value = loadApiKey();
}

document.addEventListener('DOMContentLoaded', init);
