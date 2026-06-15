/* ============================================
   几何窗口拼图 — 核心應用邏輯 v2
   新增：觸屏拖拽、URL分享、本地存储、撤销、空白模板、编号
   ============================================ */

// ==================== 状态管理 ====================
const state = {
  activeTab: 'design',
  design: {
    rows: 3, cols: 3, shape: 'square', palette: 'vivid',
    difficulty: 'medium', allowRotation: true,
  },
  puzzle: null,
  play: {
    moves: 0, correct: 0, timer: 0, timerInterval: null,
    pieces: [], slots: [],
    history: [], // 撤销历史 [{pieceId, slotId, wasCorrect}]
  },
};

// ==================== 配色方案 ====================
const PALETTES = {
  vivid:  ['#FF6B6B','#4ECDC4','#FFE66D','#A78BFA','#FF8A5C','#45B7D1','#96CEB4','#FFC3A0','#D4A5A5','#9B59B6','#3498DB','#E74C3C','#2ECC71','#F39C12','#1ABC9C','#E67E22','#E17055','#00CEC9','#FDCB6E','#6C5CE7','#FD79A8','#00B894','#E84393','#0984E3','#FAB1A0','#81ECEC','#FFEAA7','#B2BEC3','#636E72','#DFE6E9','#74B9FF','#55EFC4'],
  pastel: ['#FFB3BA','#BAFFC9','#BAE1FF','#E8BAFF','#FFD9B3','#B3F0FF','#D4F0C0','#F0D9FF','#FFE0B2','#B2DFDB','#F8BBD0','#C8E6C9','#BBDEFB','#E1BEE7','#FFE0B2','#B3E5FC','#FFCCBC','#C8E6C9','#B3E5FC','#F0F4C3','#FFE082','#CE93D8','#80CBC4','#EF9A9A','#A5D6A7','#90CAF9','#F48FB1','#FFCC80','#BCAAA4','#B0BEC5','#80DEEA','#C5E1A5'],
  bold:   ['#E63946','#1D3557','#F4A261','#2A9D8F','#264653','#E76F51','#E9C46A','#287271','#6D597A','#B56576','#EAAC8B','#355070','#B5838D','#E5989B','#52796F','#9C89B8','#F25F5C','#247BA0','#70C1B3','#F3FFBD','#50514F','#FFE066','#2EC4B6','#E71D36','#011627','#FF9F1C','#8AC926','#1982C4','#6A4C93','#FF595E','#FFCA3A','#8AC926'],
  mono:   ['#222222','#444444','#666666','#888888','#AAAAAA','#CCCCCC','#333333','#555555','#777777','#999999','#BBBBBB','#2A2A2A','#4A4A4A','#6A6A6A','#8A8A8A','#A0A0A0','#1A1A1A','#3A3A3A','#5A5A5A','#7A7A7A','#9A9A9A','#B0B0B0','#2E2E2E','#4E4E4E','#6E6E6E','#8E8E8E','#AEAEAE','#C0C0C0','#1E1E1E','#3E3E3E','#5E5E5E','#7E7E7E'],
};

const DIFFICULTY_PRESETS = {
  easy:   { rows: 2, cols: 2, rotation: false },
  medium: { rows: 3, cols: 3, rotation: true },
  hard:   { rows: 4, cols: 4, rotation: true },
  expert: { rows: 5, cols: 4, rotation: true },
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  // 尝试从 URL hash 加载关卡
  const loaded = loadFromHash();
  initTabs();
  initDesignControls();
  initPlayControls();
  initPrintControls();
  initSaveControls();
  if (!loaded) generatePuzzle();
});

// ==================== 标签页切换 ====================
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tabName}`).classList.add('active');
      state.activeTab = tabName;
      if (tabName === 'print') renderPrintPreview();
      if (tabName === 'play') initPlayMode();
    });
  });
}

// ==================== 设计控制 ====================
function initDesignControls() {
  document.querySelectorAll('.diff-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const level = btn.dataset.level;
      state.design.difficulty = level;
      const preset = DIFFICULTY_PRESETS[level];
      state.design.rows = preset.rows;
      state.design.cols = preset.cols;
      state.design.allowRotation = preset.rotation;
      syncDesignUI();
      generatePuzzle();
      updateHash();
    });
  });

  document.getElementById('rowsSlider').addEventListener('input', (e) => {
    state.design.rows = parseInt(e.target.value);
    document.getElementById('rowsVal').textContent = e.target.value;
    updateHash();
    generatePuzzle();
  });
  document.getElementById('colsSlider').addEventListener('input', (e) => {
    state.design.cols = parseInt(e.target.value);
    document.getElementById('colsVal').textContent = e.target.value;
    updateHash();
    generatePuzzle();
  });

  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.design.shape = btn.dataset.shape;
      updateHash();
      generatePuzzle();
    });
  });

  document.querySelectorAll('.color-preset').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.design.palette = btn.dataset.palette;
      updateHash();
      generatePuzzle();
    });
  });

  document.getElementById('allowRotation').addEventListener('change', (e) => {
    state.design.allowRotation = e.target.checked;
    updateHash();
    generatePuzzle();
  });

  document.getElementById('btnRandomize').addEventListener('click', () => {
    randomizeDesign();
    generatePuzzle();
    updateHash();
  });

  document.getElementById('btnReset').addEventListener('click', () => {
    state.design = { rows: 3, cols: 3, shape: 'square', palette: 'vivid', difficulty: 'medium', allowRotation: true };
    syncDesignUI();
    generatePuzzle();
    updateHash();
  });

  document.getElementById('btnGenerate').addEventListener('click', () => {
    generatePuzzle();
    updateHash();
  });
}

function syncDesignUI() {
  document.getElementById('rowsSlider').value = state.design.rows;
  document.getElementById('colsSlider').value = state.design.cols;
  document.getElementById('rowsVal').textContent = state.design.rows;
  document.getElementById('colsVal').textContent = state.design.cols;
  document.getElementById('allowRotation').checked = state.design.allowRotation;
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  const diffBtn = document.querySelector(`.diff-btn[data-level="${state.design.difficulty}"]`);
  if (diffBtn) diffBtn.classList.add('active');
  document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
  const shapeBtn = document.querySelector(`.shape-btn[data-shape="${state.design.shape}"]`);
  if (shapeBtn) shapeBtn.classList.add('active');
  document.querySelectorAll('.color-preset').forEach(b => b.classList.remove('active'));
  const paletteBtn = document.querySelector(`.color-preset[data-palette="${state.design.palette}"]`);
  if (paletteBtn) paletteBtn.classList.add('active');
  const diffMap = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
  document.getElementById('diffLabel').textContent = diffMap[state.design.difficulty] || '中等';
}

function randomizeDesign() {
  const shapes = ['square','circle','triangle','hexagon','diamond','star'];
  const palettes = ['vivid','pastel','bold','mono'];
  const levels = ['easy','medium','hard','expert'];
  const level = levels[Math.floor(Math.random() * levels.length)];
  const preset = DIFFICULTY_PRESETS[level];
  state.design.shape = shapes[Math.floor(Math.random() * shapes.length)];
  state.design.palette = palettes[Math.floor(Math.random() * palettes.length)];
  state.design.difficulty = level;
  state.design.rows = preset.rows;
  state.design.cols = preset.cols;
  state.design.allowRotation = preset.rotation;
  syncDesignUI();
}

// ==================== URL Hash 分享 ====================
function updateHash() {
  const d = state.design;
  const hash = `rows=${d.rows}&cols=${d.cols}&shape=${d.shape}&palette=${d.palette}&rotation=${d.allowRotation ? 1 : 0}`;
  window.location.hash = hash;
}

function loadFromHash() {
  const hash = window.location.hash.slice(1);
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  const rows = parseInt(params.get('rows'));
  const cols = parseInt(params.get('cols'));
  const shape = params.get('shape');
  const palette = params.get('palette');
  const rotation = params.get('rotation');
  if (!rows || !cols || !shape || !palette) return false;
  state.design.rows = rows;
  state.design.cols = cols;
  state.design.shape = shape;
  state.design.palette = palette;
  state.design.allowRotation = rotation === '1';
  // 自动匹配难度
  for (const [level, preset] of Object.entries(DIFFICULTY_PRESETS)) {
    if (preset.rows === rows && preset.cols === cols && preset.rotation === state.design.allowRotation) {
      state.design.difficulty = level;
      break;
    }
  }
  syncDesignUI();
  generatePuzzle();
  return true;
}

// ==================== 储存与加载 ====================
function initSaveControls() {
  document.getElementById('btnSaveDesign').addEventListener('click', saveDesign);
  document.getElementById('btnLoadDesign').addEventListener('click', toggleLoadList);
  document.getElementById('btnShareLink').addEventListener('click', shareLink);
  document.getElementById('btnBlankTemplate').addEventListener('click', openBlankTemplate);
}

function saveDesign() {
  if (!state.puzzle) return;
  const designs = JSON.parse(localStorage.getItem('puzzle_designs') || '[]');
  const name = `${state.design.rows}×${state.design.cols} ${state.design.shape} ${state.design.palette}`;
  const d = state.design;
  designs.push({
    name,
    design: { rows: d.rows, cols: d.cols, shape: d.shape, palette: d.palette, allowRotation: d.allowRotation },
    savedAt: new Date().toISOString(),
  });
  // 最多保留 20 个
  if (designs.length > 20) designs.shift();
  localStorage.setItem('puzzle_designs', JSON.stringify(designs));
  showToast('關卡已存储！');
}

function toggleLoadList() {
  const list = document.getElementById('savedList');
  if (list.style.display === 'none' || !list.style.display) {
    const designs = JSON.parse(localStorage.getItem('puzzle_designs') || '[]');
    if (designs.length === 0) {
      showToast('尚無存储的關卡');
      return;
    }
    list.innerHTML = designs.map((item, i) => `
      <div class="saved-item" data-index="${i}">
        <div>
          <div class="saved-name">${item.name}</div>
          <div class="saved-meta">${new Date(item.savedAt).toLocaleDateString()}</div>
        </div>
        <button class="saved-delete" data-index="${i}">✕</button>
      </div>
    `).join('');
    list.style.display = 'block';

    // 点击加载
    list.querySelectorAll('.saved-item').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.classList.contains('saved-delete')) return;
        const idx = parseInt(el.dataset.index);
        loadDesign(idx);
      });
    });
    // 删除
    list.querySelectorAll('.saved-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.index);
        deleteDesign(idx);
      });
    });
  } else {
    list.style.display = 'none';
  }
}

function loadDesign(index) {
  const designs = JSON.parse(localStorage.getItem('puzzle_designs') || '[]');
  if (!designs[index]) return;
  const d = designs[index].design;
  state.design.rows = d.rows;
  state.design.cols = d.cols;
  state.design.shape = d.shape;
  state.design.palette = d.palette;
  state.design.allowRotation = d.allowRotation;
  // 匹配难度
  state.design.difficulty = 'medium';
  for (const [level, preset] of Object.entries(DIFFICULTY_PRESETS)) {
    if (preset.rows === d.rows && preset.cols === d.cols && preset.rotation === d.allowRotation) {
      state.design.difficulty = level; break;
    }
  }
  syncDesignUI();
  generatePuzzle();
  updateHash();
  document.getElementById('savedList').style.display = 'none';
  showToast('關卡已载入！');
}

function deleteDesign(index) {
  const designs = JSON.parse(localStorage.getItem('puzzle_designs') || '[]');
  designs.splice(index, 1);
  localStorage.setItem('puzzle_designs', JSON.stringify(designs));
  toggleLoadList();
  toggleLoadList(); // 刷新列表
}

function shareLink() {
  updateHash();
  const url = window.location.href;
  navigator.clipboard.writeText(url).then(() => {
    showToast('分享链接已复制到剪貼簿！');
  }).catch(() => {
    // fallback
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('分享链接已复制！');
  });
}

function showToast(msg) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2200);
}

// ==================== 空白模板 ====================
function openBlankTemplate() {
  const rows = state.design.rows;
  const cols = state.design.cols;
  const win = window.open('', '_blank', 'width=800,height=600');
  const cellW = Math.floor(500 / cols);
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>空白拼图模板</title>
    <style>
      @page { size: A4; margin: 10mm; }
      body { font-family: sans-serif; margin: 20px; }
      h1 { text-align: center; font-size: 20px; color: #6366F1; }
      .sub { text-align: center; color: #666; font-size: 12px; margin-bottom: 16px; }
      .board { display: grid; grid-template-columns: repeat(${cols}, ${cellW}px); grid-template-rows: repeat(${rows}, ${cellW}px); gap: 2px; margin: 0 auto 24px; width: fit-content; border: 2px solid #333; }
      .cell { border: 1px dashed #999; display: flex; align-items: center; justify-content: center; font-size: 11px; color: #BBB; }
      .pieces-title { font-size: 14px; font-weight: 600; margin-bottom: 8px; color: #666; }
      .pieces { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; }
      .piece-card { width: ${cellW - 4}px; height: ${cellW - 4}px; border: 2px dashed #CCC; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 10px; color: #CCC; }
      .note { margin-top: 20px; font-size: 11px; color: #999; text-align: center; border-top: 1px dashed #DDD; padding-top: 12px; }
      @media print { body { margin: 0; } }
    </style></head><body>
    <h1>几何窗口拼图 — 空白模板</h1>
    <div class="sub">${rows}×${cols} 网格 | 請自行繪製圖案</div>
    <div class="board">${Array(rows*cols).fill('<div class="cell"></div>').join('')}</div>
    <div class="pieces-title">可裁剪拼图塊：</div>
    <div class="pieces">${Array(rows*cols).fill(`<div class="piece-card"></div>`).join('')}</div>
    <div class="note">操作说明：在空白模板上繪製圖案後，沿虛線剪下拼图塊進行配對挑戰。</div>
    <script>setTimeout(() => window.print(), 600);<\/script>
    </body></html>
  `);
  win.document.close();
}

// ==================== 拼图生成 ====================
function generatePuzzle() {
  const { rows, cols, shape, palette, allowRotation } = state.design;
  const colors = PALETTES[palette];
  const totalPieces = rows * cols;

  const pieceColors = [];
  for (let i = 0; i < totalPieces; i++) {
    pieceColors.push(colors[i % colors.length]);
  }
  shuffleArray(pieceColors);

  const pieces = [];
  for (let i = 0; i < totalPieces; i++) {
    const rotation = allowRotation ? Math.floor(Math.random() * 4) * 90 : 0;
    pieces.push({
      id: i, color: pieceColors[i], shape, rotation,
      correctRotation: rotation,
      row: Math.floor(i / cols), col: i % cols,
    });
  }

  state.puzzle = { rows, cols, shape, palette, allowRotation, pieces };
  drawPreview();

  const diffMap = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
  document.getElementById('diffLabel').textContent = diffMap[state.design.difficulty] || '中等';
}

function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ==================== 形状绘制 ====================
function drawShape(ctx, x, y, r, shape, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 2;
  ctx.beginPath();

  switch (shape) {
    case 'square':   ctx.rect(x - r, y - r, r * 2, r * 2); break;
    case 'circle':   ctx.arc(x, y, r, 0, Math.PI * 2); break;
    case 'triangle':
      ctx.moveTo(x, y - r);
      ctx.lineTo(x + r * Math.cos(Math.PI / 6), y + r * Math.sin(Math.PI / 6));
      ctx.lineTo(x - r * Math.cos(Math.PI / 6), y + r * Math.sin(Math.PI / 6));
      ctx.closePath(); break;
    case 'hexagon':
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        const px = x + r * Math.cos(a), py = y + r * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
    case 'diamond':
      ctx.moveTo(x, y - r); ctx.lineTo(x + r * 0.7, y);
      ctx.lineTo(x, y + r); ctx.lineTo(x - r * 0.7, y);
      ctx.closePath(); break;
    case 'star':
      for (let i = 0; i < 10; i++) {
        const a = (Math.PI / 5) * i - Math.PI / 2;
        const rad = i % 2 === 0 ? r : r * 0.4;
        const px = x + rad * Math.cos(a), py = y + rad * Math.sin(a);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath(); break;
  }

  ctx.fill();
  ctx.stroke();

  // 窗口效果 - 中央透明圆形
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 窗口边框
  ctx.beginPath();
  ctx.arc(x, y, r * 0.35, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

// ==================== 预览绘制 ====================
function drawPreview() {
  const canvas = document.getElementById('previewCanvas');
  const ctx = canvas.getContext('2d');
  const { rows, cols, pieces } = state.puzzle;
  const size = 400;
  const cellW = size / cols, cellH = size / rows, padding = 8;

  canvas.width = size; canvas.height = size;
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = '#CBD5E1'; ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(size, r * cellH); ctx.stroke(); }
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, size); ctx.stroke(); }

  pieces.forEach(piece => {
    const x = piece.col * cellW + cellW / 2;
    const y = piece.row * cellH + cellH / 2;
    const maxR = Math.min(cellW, cellH) / 2 - padding;
    ctx.save(); ctx.translate(x, y);
    if (piece.rotation) ctx.rotate((piece.rotation * Math.PI) / 180);
    drawShape(ctx, 0, 0, maxR, piece.shape, piece.color);
    ctx.restore();
  });
}

// ==================== 打印功能 ====================
function initPrintControls() {
  document.getElementById('btnDownloadPDF').addEventListener('click', downloadPDF);
  document.getElementById('btnPrint').addEventListener('click', () => window.print());
}

function renderPrintPreview() {
  if (!state.puzzle) return;
  const { rows, cols, pieces, shape } = state.puzzle;
  const diffMap = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
  document.getElementById('printLevelLabel').textContent =
    `難度：${diffMap[state.design.difficulty] || '中等'} | ${rows}×${cols} 网格 | ${shape}`;

  // 绘制底板（正确答案）
  const printBoard = document.getElementById('printBoard');
  printBoard.innerHTML = '';
  const boardCanvas = document.createElement('canvas');
  boardCanvas.width = 400; boardCanvas.height = 400;
  boardCanvas.style.maxWidth = '100%';
  drawPuzzleBoard(boardCanvas.getContext('2d'), 400, 400, state.puzzle);
  printBoard.appendChild(boardCanvas);

  // 绘制可裁剪的拼图块（使用正确答案的旋转角度）
  const printPieces = document.getElementById('printPieces');
  printPieces.innerHTML = '';
  const pieceSize = Math.min(100, Math.floor(360 / Math.max(cols, 1)));
  const showNumbers = document.getElementById('includeNumbers').checked;

  pieces.forEach((piece, i) => {
    const pc = document.createElement('canvas');
    pc.width = pieceSize; pc.height = pieceSize;
    pc.style.position = 'relative';
    const pctx = pc.getContext('2d');

    // 白色背景 + 剪裁线
    pctx.fillStyle = '#FFF';
    pctx.fillRect(0, 0, pieceSize, pieceSize);
    pctx.setLineDash([4, 4]);
    pctx.strokeStyle = '#94A3B8'; pctx.lineWidth = 1;
    pctx.strokeRect(4, 4, pieceSize - 8, pieceSize - 8);
    pctx.setLineDash([]);

    // 使用 correctRotation 绘制正确朝向
    const r = pieceSize / 2 - 12;
    pctx.save(); pctx.translate(pieceSize / 2, pieceSize / 2);
    pctx.rotate((piece.correctRotation * Math.PI) / 180);
    drawShape(pctx, 0, 0, r, piece.shape, piece.color);
    pctx.restore();

    // 编号
    if (showNumbers) {
      pctx.fillStyle = 'rgba(0,0,0,0.5)';
      pctx.font = 'bold 12px sans-serif';
      pctx.fillText(`${i + 1}`, 6, 14);
    }

    // 包装在带编号的容器中
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'inline-block';
    wrapper.appendChild(pc);
    printPieces.appendChild(wrapper);
  });

  // 底板也加编号
  if (showNumbers) {
    const bctx = boardCanvas.getContext('2d');
    bctx.fillStyle = 'rgba(0,0,0,0.4)';
    bctx.font = 'bold 11px sans-serif';
    const cellW = 400 / cols, cellH = 400 / rows;
    pieces.forEach(piece => {
      bctx.fillText(`${piece.id + 1}`, piece.col * cellW + 4, piece.row * cellH + 14);
    });
  }
}

function drawPuzzleBoard(ctx, w, h, puzzle) {
  const { rows, cols, pieces } = puzzle;
  const cellW = w / cols, cellH = h / rows, padding = 8;

  ctx.fillStyle = '#FFF'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#94A3B8'; ctx.lineWidth = 1;
  for (let r = 0; r <= rows; r++) { ctx.beginPath(); ctx.moveTo(0, r * cellH); ctx.lineTo(w, r * cellH); ctx.stroke(); }
  for (let c = 0; c <= cols; c++) { ctx.beginPath(); ctx.moveTo(c * cellW, 0); ctx.lineTo(c * cellW, h); ctx.stroke(); }

  pieces.forEach(piece => {
    const x = piece.col * cellW + cellW / 2;
    const y = piece.row * cellH + cellH / 2;
    const maxR = Math.min(cellW, cellH) / 2 - padding;
    ctx.save(); ctx.translate(x, y);
    if (piece.correctRotation) ctx.rotate((piece.correctRotation * Math.PI) / 180);
    drawShape(ctx, 0, 0, maxR, piece.shape, piece.color);
    ctx.restore();
  });
}

async function downloadPDF() {
  if (!state.puzzle) return;
  renderPrintPreview();

  const diffMap = { easy: '简单', medium: '中等', hard: '困难', expert: '专家' };
  const filename = `几何窗口拼图_${diffMap[state.design.difficulty]}_${state.design.rows}x${state.design.cols}`;

  const printPage = document.getElementById('printPage').cloneNode(true);
  const win = window.open('', '_blank', 'width=800,height=600');
  win.document.write(`
    <!DOCTYPE html><html><head><meta charset="UTF-8"><title>${filename}</title>
    <style>
      @page { size: A4; margin: 10mm; }
      body { font-family: sans-serif; margin: 0; padding: 0; }
      .print-page { padding: 20px; }
      .print-title { font-size: 22px; font-weight: 800; text-align: center; color: #6366F1; margin-bottom: 4px; }
      .print-subtitle { text-align: center; color: #64748B; margin-bottom: 20px; font-size: 13px; }
      .print-content { display: flex; flex-direction: column; gap: 20px; align-items: center; }
      .print-instructions { margin-top: 20px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 12px; color: #666; }
      canvas { max-width: 100%; }
    </style></head><body>
    ${printPage.outerHTML}
    <script>
      document.title = '${filename}';
      document.querySelectorAll('canvas').forEach(c => {
        const img = new Image(); img.src = c.toDataURL();
        c.parentNode.replaceChild(img, c);
      });
      setTimeout(() => window.print(), 500);
    <\/script></body></html>
  `);
  win.document.close();
}

// ==================== 游戏模式 ====================
function initPlayControls() {
  document.getElementById('btnUndo').addEventListener('click', undoLastMove);
  document.getElementById('btnShuffle').addEventListener('click', shufflePlayPieces);
  document.getElementById('btnHint').addEventListener('click', showHint);
  document.getElementById('btnPlayAgain').addEventListener('click', initPlayMode);
  document.getElementById('btnNewDesign').addEventListener('click', () => {
    document.getElementById('winModal').classList.remove('show');
    document.querySelector('.tab[data-tab="design"]').click();
  });
}

function initPlayMode() {
  if (!state.puzzle) return;
  document.getElementById('winModal').classList.remove('show');
  if (state.play.timerInterval) clearInterval(state.play.timerInterval);

  state.play.moves = 0; state.play.correct = 0; state.play.timer = 0;
  state.play.pieces = []; state.play.slots = []; state.play.history = [];

  document.getElementById('moveCount').textContent = '0';
  document.getElementById('timerDisplay').textContent = '00:00';
  document.getElementById('totalPieces').textContent = state.puzzle.pieces.length;
  document.getElementById('correctCount').textContent = `0/${state.puzzle.pieces.length}`;

  // 创建槽位（底板）
  const boardEl = document.getElementById('playBoard');
  boardEl.innerHTML = '';
  const slotSize = Math.min(80, Math.floor(320 / Math.max(state.puzzle.cols, state.puzzle.rows)));

  state.puzzle.pieces.forEach(piece => {
    const slot = document.createElement('div');
    slot.className = 'piece-slot';
    slot.dataset.pieceId = piece.id;
    slot.dataset.correctRotation = piece.correctRotation;
    slot.style.width = slotSize + 'px';
    slot.style.height = slotSize + 'px';

    // 半透明提示图案
    const hintCanvas = document.createElement('canvas');
    hintCanvas.width = slotSize; hintCanvas.height = slotSize;
    const hctx = hintCanvas.getContext('2d');
    hctx.globalAlpha = 0.2;
    hctx.save(); hctx.translate(slotSize / 2, slotSize / 2);
    hctx.rotate((piece.correctRotation * Math.PI) / 180);
    drawShape(hctx, 0, 0, slotSize / 2 - 6, piece.shape, piece.color);
    hctx.restore(); hctx.globalAlpha = 1;
    slot.appendChild(hintCanvas);
    boardEl.appendChild(slot);

    state.play.slots.push({
      id: piece.id, correctPieceId: piece.id, correctRotation: piece.correctRotation,
      element: slot, filled: false,
    });
  });

  // 创建拼图块（打乱顺序，随机旋转）
  const piecesEl = document.getElementById('playPieces');
  piecesEl.innerHTML = '';
  const shuffled = [...state.puzzle.pieces];
  shuffleArray(shuffled);

  shuffled.forEach(piece => {
    const displayRotation = state.design.allowRotation
      ? Math.floor(Math.random() * 4) * 90 : piece.correctRotation;

    const pieceCanvas = document.createElement('canvas');
    pieceCanvas.width = slotSize; pieceCanvas.height = slotSize;
    const pctx = pieceCanvas.getContext('2d');
    const r = slotSize / 2 - 8;
    pctx.save(); pctx.translate(slotSize / 2, slotSize / 2);
    pctx.rotate((displayRotation * Math.PI) / 180);
    drawShape(pctx, 0, 0, r, piece.shape, piece.color);
    pctx.restore();

    const dragPiece = document.createElement('div');
    dragPiece.className = 'drag-piece';
    dragPiece.draggable = true;
    dragPiece.dataset.pieceId = piece.id;
    dragPiece.dataset.rotation = displayRotation;
    dragPiece.style.width = slotSize + 'px';
    dragPiece.style.height = slotSize + 'px';
    dragPiece.appendChild(pieceCanvas);
    piecesEl.appendChild(dragPiece);

    state.play.pieces.push({
      id: piece.id, color: piece.color, shape: piece.shape,
      rotation: displayRotation, correctRotation: piece.correctRotation,
      element: dragPiece, canvas: pieceCanvas, placed: false,
    });

    // 桌面拖拽
    dragPiece.addEventListener('dragstart', handleDragStart);
    dragPiece.addEventListener('dragend', handleDragEnd);
    // 点击旋转
    dragPiece.addEventListener('click', (e) => handlePieceClick(e, piece.id));
    // 触屏拖拽
    dragPiece.addEventListener('touchstart', handleTouchStart, { passive: false });
    dragPiece.addEventListener('touchmove', handleTouchMove, { passive: false });
    dragPiece.addEventListener('touchend', handleTouchEnd);
  });

  // 槽位事件
  document.querySelectorAll('.piece-slot').forEach(slot => {
    slot.addEventListener('dragover', handleDragOver);
    slot.addEventListener('dragleave', handleDragLeave);
    slot.addEventListener('drop', handleDrop);
  });

  startTimer();
}

// ==================== 触屏拖拽支持 ====================
let touchDragData = null;
let touchGhost = null;

function handleTouchStart(e) {
  const piece = e.target.closest('.drag-piece');
  if (!piece || piece.classList.contains('placed')) return;
  e.preventDefault();

  touchDragData = {
    pieceId: parseInt(piece.dataset.pieceId),
    element: piece,
    startX: e.touches[0].clientX,
    startY: e.touches[0].clientY,
  };
  piece.classList.add('dragging');
}

function handleTouchMove(e) {
  if (!touchDragData) return;
  e.preventDefault();

  // 创建跟随手指的幽灵元素
  if (!touchGhost) {
    touchGhost = touchDragData.element.cloneNode(true);
    touchGhost.style.position = 'fixed';
    touchGhost.style.pointerEvents = 'none';
    touchGhost.style.zIndex = '9999';
    touchGhost.style.opacity = '0.85';
    touchGhost.style.transform = 'scale(1.05)';
    document.body.appendChild(touchGhost);
  }

  touchGhost.style.left = (e.touches[0].clientX - 40) + 'px';
  touchGhost.style.top = (e.touches[0].clientY - 40) + 'px';

  // 高亮下方槽位
  const elemBelow = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY);
  document.querySelectorAll('.piece-slot').forEach(s => s.classList.remove('highlight'));
  const slot = elemBelow?.closest('.piece-slot');
  if (slot && !slot.classList.contains('filled')) slot.classList.add('highlight');
}

function handleTouchEnd(e) {
  if (!touchDragData) return;

  // 移除幽灵
  if (touchGhost) { touchGhost.remove(); touchGhost = null; }

  touchDragData.element.classList.remove('dragging');

  // 查找手指下方的槽位
  const touch = e.changedTouches[0];
  const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
  const slot = elemBelow?.closest('.piece-slot');

  document.querySelectorAll('.piece-slot').forEach(s => s.classList.remove('highlight'));

  if (slot && !slot.classList.contains('filled')) {
    // 模拟 drop
    const pieceId = touchDragData.pieceId;
    processDrop(slot, pieceId);
  }

  touchDragData = null;
}

// ==================== 桌面拖拽 ====================
function handleDragStart(e) {
  const piece = e.target.closest('.drag-piece');
  if (!piece || piece.classList.contains('placed')) { e.preventDefault(); return; }
  e.dataTransfer.setData('text/plain', piece.dataset.pieceId);
  piece.classList.add('dragging');
}
function handleDragEnd(e) {
  e.target.closest('.drag-piece')?.classList.remove('dragging');
}
function handleDragOver(e) {
  e.preventDefault();
  const slot = e.target.closest('.piece-slot');
  if (slot && !slot.classList.contains('filled')) slot.classList.add('highlight');
}
function handleDragLeave(e) {
  e.target.closest('.piece-slot')?.classList.remove('highlight');
}

function handleDrop(e) {
  e.preventDefault();
  const slot = e.target.closest('.piece-slot');
  if (!slot) return;
  slot.classList.remove('highlight');
  if (slot.classList.contains('filled')) return;
  const pieceId = parseInt(e.dataTransfer.getData('text/plain'));
  processDrop(slot, pieceId);
}

// ==================== 统一放置处理 ====================
function processDrop(slot, pieceId) {
  if (isNaN(pieceId)) return;
  const slotPieceId = parseInt(slot.dataset.pieceId);
  const slotCorrectRotation = parseInt(slot.dataset.correctRotation) || 0;
  const pieceData = state.play.pieces.find(p => p.id === pieceId);
  if (!pieceData || pieceData.placed) return;

  state.play.moves++;
  document.getElementById('moveCount').textContent = state.play.moves;

  const isCorrectPosition = pieceId === slotPieceId;
  const isCorrectRotation = pieceData.rotation === slotCorrectRotation;
  const isCorrect = isCorrectPosition && isCorrectRotation;

  // 记录历史用于撤销
  state.play.history.push({ pieceId, slotId: slotPieceId, wasCorrect: isCorrect });

  if (isCorrect) {
    slot.classList.add('filled');
    pieceData.placed = true;
    pieceData.element.classList.add('placed');
    pieceData.element.draggable = false;

    const slotSize = parseInt(slot.style.width) || 80;
    const placedCanvas = document.createElement('canvas');
    placedCanvas.width = slotSize; placedCanvas.height = slotSize;
    const pctx = placedCanvas.getContext('2d');
    pctx.save(); pctx.translate(slotSize / 2, slotSize / 2);
    pctx.rotate((pieceData.correctRotation * Math.PI) / 180);
    drawShape(pctx, 0, 0, slotSize / 2 - 6, pieceData.shape, pieceData.color);
    pctx.restore();
    slot.innerHTML = '';
    slot.appendChild(placedCanvas);

    state.play.correct++;
    document.getElementById('correctCount').textContent = `${state.play.correct}/${state.puzzle.pieces.length}`;

    slot.style.transform = 'scale(1.1)';
    slot.style.transition = 'transform 0.2s';
    setTimeout(() => { slot.style.transform = 'scale(1)'; }, 200);

    if (state.play.correct === state.puzzle.pieces.length) {
      setTimeout(() => winGame(), 500);
    }
  } else {
    slot.style.animation = 'none';
    slot.offsetHeight;
    slot.style.animation = 'shake 0.3s ease';
    setTimeout(() => { slot.style.animation = ''; }, 300);
    if (!isCorrectPosition) {
      slot.style.borderColor = '#EF4444';
      setTimeout(() => { slot.style.borderColor = ''; }, 600);
    }
  }
}

// ==================== 撤销功能 ====================
function undoLastMove() {
  if (state.play.history.length === 0) return;
  const last = state.play.history.pop();
  const pieceData = state.play.pieces.find(p => p.id === last.pieceId);
  if (!pieceData) return;

  if (last.wasCorrect) {
    // 撤销正确放置
    const slot = state.play.slots.find(s => s.id === last.slotId);
    if (slot) {
      slot.filled = false;
      slot.element.classList.remove('filled');
      slot.element.innerHTML = '';
      // 恢复提示图案
      const slotSize = parseInt(slot.element.style.width) || 80;
      const hintCanvas = document.createElement('canvas');
      hintCanvas.width = slotSize; hintCanvas.height = slotSize;
      const hctx = hintCanvas.getContext('2d');
      hctx.globalAlpha = 0.2;
      hctx.save(); hctx.translate(slotSize / 2, slotSize / 2);
      hctx.rotate((slot.correctRotation * Math.PI) / 180);
      drawShape(hctx, 0, 0, slotSize / 2 - 6, state.puzzle.pieces[last.slotId].shape, state.puzzle.pieces[last.slotId].color);
      hctx.restore(); hctx.globalAlpha = 1;
      slot.element.appendChild(hintCanvas);
    }
    pieceData.placed = false;
    pieceData.element.classList.remove('placed');
    pieceData.element.draggable = true;
    state.play.correct = Math.max(0, state.play.correct - 1);
  }

  state.play.moves = Math.max(0, state.play.moves - 1);
  document.getElementById('moveCount').textContent = state.play.moves;
  document.getElementById('correctCount').textContent = `${state.play.correct}/${state.puzzle.pieces.length}`;
}

// ==================== 旋转 ====================
function handlePieceClick(e, pieceId) {
  if (!state.design.allowRotation) return;
  const pieceData = state.play.pieces.find(p => p.id === pieceId);
  if (!pieceData || pieceData.placed) return;

  pieceData.rotation = (pieceData.rotation + 90) % 360;
  state.play.moves++;
  document.getElementById('moveCount').textContent = state.play.moves;

  const size = pieceData.canvas.width;
  const pctx = pieceData.canvas.getContext('2d');
  pctx.clearRect(0, 0, size, size);
  const r = size / 2 - 8;
  pctx.save(); pctx.translate(size / 2, size / 2);
  pctx.rotate((pieceData.rotation * Math.PI) / 180);
  drawShape(pctx, 0, 0, r, pieceData.shape, pieceData.color);
  pctx.restore();
}

function shufflePlayPieces() {
  const piecesEl = document.getElementById('playPieces');
  const children = Array.from(piecesEl.children).filter(c => !c.classList.contains('placed'));
  shuffleArray(children);
  children.forEach(c => piecesEl.appendChild(c));
  state.play.moves++;
  document.getElementById('moveCount').textContent = state.play.moves;
}

function showHint() {
  const unplacedPiece = state.play.pieces.find(p => !p.placed);
  if (!unplacedPiece) return;
  unplacedPiece.element.style.boxShadow = '0 0 0 4px #F59E0B, 0 0 20px rgba(245,158,11,.4)';
  setTimeout(() => { unplacedPiece.element.style.boxShadow = ''; }, 1500);
  const targetSlot = state.play.slots.find(s => s.id === unplacedPiece.id);
  if (targetSlot?.element) {
    targetSlot.element.classList.add('highlight');
    setTimeout(() => { targetSlot.element.classList.remove('highlight'); }, 1500);
  }
  state.play.moves++;
  document.getElementById('moveCount').textContent = state.play.moves;
}

function startTimer() {
  if (state.play.timerInterval) clearInterval(state.play.timerInterval);
  state.play.timer = 0;
  document.getElementById('timerDisplay').textContent = '00:00';
  state.play.timerInterval = setInterval(() => {
    state.play.timer++;
    const m = Math.floor(state.play.timer / 60).toString().padStart(2, '0');
    const s = (state.play.timer % 60).toString().padStart(2, '0');
    document.getElementById('timerDisplay').textContent = `${m}:${s}`;
  }, 1000);
}

function winGame() {
  if (state.play.timerInterval) clearInterval(state.play.timerInterval);
  const m = Math.floor(state.play.timer / 60).toString().padStart(2, '0');
  const s = (state.play.timer % 60).toString().padStart(2, '0');
  document.getElementById('winMoves').textContent = state.play.moves;
  document.getElementById('winTime').textContent = `${m}:${s}`;
  document.getElementById('winModal').classList.add('show');

  // 保存成绩到 localStorage
  const records = JSON.parse(localStorage.getItem('puzzle_records') || '[]');
  records.push({
    date: new Date().toISOString(),
    difficulty: state.design.difficulty,
    rows: state.design.rows, cols: state.design.cols,
    moves: state.play.moves, time: state.play.timer,
  });
  if (records.length > 20) records.shift();
  localStorage.setItem('puzzle_records', JSON.stringify(records));
}

// ==================== shake 动画 ====================
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-6px); }
    75% { transform: translateX(6px); }
  }
`;
document.head.appendChild(shakeStyle);
