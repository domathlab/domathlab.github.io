/* ============================================
   数和谜题 (Kakuro) — 关卡浏览与下载 v3
   题库来源: grandgames.net (GitHub: Snow-Hoe/sudoku-database)
   ============================================ */

// ==================== 状态管理 ====================
const state = {
  showAnswer: true,
  compactMode: false,
  puzzles: [],       // 已加载的关卡
  allPuzzles: [],    // 题库全部关卡
  selectedIndex: -1,
  filterSize: 'all',
  filterDifficulty: 'all',
  loading: false,
};

// ==================== 初始化 ====================
document.addEventListener('DOMContentLoaded', () => {
  initControls();
  loadPuzzleBank();
});

async function loadPuzzleBank() {
  state.loading = true;
  showToast('正在加载题库...');
  try {
    const resp = await fetch('puzzles.json');
    const data = await resp.json();
    state.allPuzzles = data.puzzles.map(p => convertPuzzle(p));
    state.puzzles = [...state.allPuzzles];
    
    // 更新过滤选项
    updateFilterOptions();
    
    if (state.puzzles.length > 0) {
      state.selectedIndex = 0;
      updatePuzzleList();
      renderPreview();
      showToast(`已加载 ${state.puzzles.length} 个关卡`);
    } else {
      showToast('题库为空，请先运行 fetch_puzzles.py');
    }
  } catch (err) {
    showToast('加载题库失败：' + err.message);
    console.error(err);
  }
  state.loading = false;
}

/**
 * 将 JSON 题库格式转为内部格式
 */
function convertPuzzle(json) {
  const rows = json.rows;
  const cols = json.cols;
  
  const layout = json.cellTypes.map(row => 
    row.map(t => t === 'white' ? 'white' : t === 'clue' ? 'clue' : 'wall')
  );
  
  const puzzle = json.cellTypes.map((row, r) =>
    row.map((t, c) => {
      if (t === 'white') return json.given[r][c] || 0;
      return null;
    })
  );
  
  // 构建 clues 数组（渲染需要）
  const clues = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cl = json.clues[r][c];
      if (cl) {
        clues.push({
          r, c,
          acrossSum: cl.across,
          downSum: cl.down
        });
      }
    }
  }
  
  // 使用 Python 端预求解的答案（如果有）
  const solution = json.solution || Array.from({ length: rows }, () => Array(cols).fill(null));
  const hasSolution = !!json.solution;
  
  const difficultyMap = {
    easy: 'easy',
    medium: 'medium', 
    hard: 'hard',
    very_hard: 'hard',
    super_hard: 'hard'
  };
  
  return {
    id: json.id,
    source: json.source,
    url: json.url,
    rows, cols,
    layout,
    solution,
    puzzle,
    clues,
    difficulty: difficultyMap[json.difficulty] || 'medium',
    originalDifficulty: json.difficulty,
    hasSolution,
  };
}

function initControls() {
  document.getElementById('showAnswer').addEventListener('change', (e) => {
    state.showAnswer = e.target.checked;
    renderPreview();
  });
  document.getElementById('compactMode').addEventListener('change', (e) => {
    state.compactMode = e.target.checked;
    renderPreview();
  });

  document.getElementById('puzzleSelect').addEventListener('change', (e) => {
    state.selectedIndex = parseInt(e.target.value);
    renderPreview();
  });

  document.getElementById('filterSize').addEventListener('change', (e) => {
    state.filterSize = e.target.value;
    applyFilters();
  });
  document.getElementById('filterDifficulty').addEventListener('change', (e) => {
    state.filterDifficulty = e.target.value;
    applyFilters();
  });

  document.getElementById('btnRefresh').addEventListener('click', () => {
    loadPuzzleBank();
  });
  document.getElementById('btnDownloadPuzzle').addEventListener('click', downloadPDF);
  document.getElementById('btnPrintPuzzle').addEventListener('click', printPuzzle);
}

function applyFilters() {
  state.puzzles = state.allPuzzles.filter(p => {
    if (state.filterSize !== 'all') {
      const [w, h] = state.filterSize.split('x').map(Number);
      if (p.rows !== h || p.cols !== w) return false;
    }
    if (state.filterDifficulty !== 'all') {
      if (p.originalDifficulty !== state.filterDifficulty) return false;
    }
    return true;
  });
  
  if (state.puzzles.length > 0) {
    state.selectedIndex = 0;
  } else {
    state.selectedIndex = -1;
  }
  updatePuzzleList();
  renderPreview();
}

function updateFilterOptions() {
  // 统计所有尺寸和难度
  const sizes = new Set();
  const diffs = new Set();
  for (const p of state.allPuzzles) {
    sizes.add(`${p.cols}x${p.rows}`);
    diffs.add(p.originalDifficulty);
  }
  
  const sizeSelect = document.getElementById('filterSize');
  sizeSelect.innerHTML = '<option value="all">全部尺寸</option>' +
    [...sizes].sort().map(s => `<option value="${s}">${s}</option>`).join('');
  
  const diffSelect = document.getElementById('filterDifficulty');
  const diffLabels = { easy: '简单', medium: '中等', hard: '困难', very_hard: '非常困难' };
  diffSelect.innerHTML = '<option value="all">全部难度</option>' +
    [...diffs].sort().map(d => `<option value="${d}">${diffLabels[d] || d}</option>`).join('');
}

// ==================== 关卡管理 ====================
function updatePuzzleList() {
  const select = document.getElementById('puzzleSelect');
  const list = document.getElementById('puzzleList');
  const countDisplay = document.getElementById('puzzleCount');

  if (countDisplay) {
    countDisplay.textContent = `${state.puzzles.length} 个关卡`;
  }

  if (state.puzzles.length === 0) {
    select.innerHTML = '<option value="">— 无匹配关卡 —</option>';
    list.innerHTML = '<p class="empty-hint">尝试调整过滤条件，或点击刷新重新加载题库</p>';
    return;
  }

  const diffLabels = { easy: '简单', medium: '中等', hard: '困难', very_hard: '非常困难' };

  select.innerHTML = state.puzzles.map((p, i) => {
    const diffLabel = diffLabels[p.originalDifficulty] || p.difficulty;
    let whiteCells = 0;
    for (let r = 0; r < p.rows; r++)
      for (let c = 0; c < p.cols; c++)
        if (p.layout[r][c] === 'white') whiteCells++;
    const sel = i === state.selectedIndex ? ' selected' : '';
    return `<option value="${i}"${sel}>#${p.id} — ${p.cols}×${p.rows} ${diffLabel} (${whiteCells}格)</option>`;
  }).join('');

  // 只显示前20个，避免列表过长
  const showPuzzles = state.puzzles.slice(0, 20);
  list.innerHTML = showPuzzles.map((p, i) => {
    // i 是 showPuzzles 的索引，需要映射回 state.puzzles 的索引
    const realIndex = state.puzzles.indexOf(p);
    const diffLabel = diffLabels[p.originalDifficulty] || p.difficulty;
    let whiteCells = 0;
    for (let r = 0; r < p.rows; r++)
      for (let c = 0; c < p.cols; c++)
        if (p.layout[r][c] === 'white') whiteCells++;
    return `
      <div class="puzzle-item ${realIndex === state.selectedIndex ? 'active' : ''}" data-index="${realIndex}">
        <span class="puzzle-name">#${p.id}</span>
        <span class="puzzle-meta">${p.cols}×${p.rows} | ${diffLabel}</span>
        <span class="puzzle-meta">${p.clues.length}提示/${whiteCells}格</span>
      </div>`;
  }).join('');

  if (state.puzzles.length > 20) {
    list.innerHTML += `<p class="empty-hint" style="margin-top:8px;">...还有 ${state.puzzles.length - 20} 个关卡，请使用过滤条件缩小范围</p>`;
  }

  list.querySelectorAll('.puzzle-item').forEach(item => {
    item.addEventListener('click', () => {
      state.selectedIndex = parseInt(item.dataset.index);
      updatePuzzleList();
      renderPreview();
    });
  });
}

// ==================== 渲染预览 ====================
function renderPreview() {
  const emptyState = document.getElementById('emptyState');
  const previewContent = document.getElementById('previewContent');
  const answerWrapper = document.getElementById('answerWrapper');

  if (state.puzzles.length === 0 || state.selectedIndex < 0) {
    emptyState.style.display = 'flex';
    previewContent.style.display = 'none';
    return;
  }

  emptyState.style.display = 'none';
  previewContent.style.display = 'block';
  answerWrapper.style.display = state.showAnswer ? 'block' : 'none';

  const puzzle = state.puzzles[state.selectedIndex];
  if (!puzzle) return;

  const cellSize = state.compactMode ? 36 : 44;
  const canvasW = puzzle.cols * cellSize + 1;
  const canvasH = puzzle.rows * cellSize + 1;

  // 绘制题目
  const qCanvas = document.getElementById('questionCanvas');
  qCanvas.width = canvasW;
  qCanvas.height = canvasH;
  qCanvas.style.width = canvasW + 'px';
  qCanvas.style.height = canvasH + 'px';
  drawGrid(qCanvas.getContext('2d'), puzzle, cellSize, 'question');

  // 绘制答案（如果有解）
  const aCanvas = document.getElementById('answerCanvas');
  aCanvas.width = canvasW;
  aCanvas.height = canvasH;
  aCanvas.style.width = canvasW + 'px';
  aCanvas.style.height = canvasH + 'px';
  
  if (puzzle.hasSolution) {
    drawGrid(aCanvas.getContext('2d'), puzzle, cellSize, 'answer');
    answerWrapper.querySelector('.board-label').textContent = '答案';
    aCanvas.style.display = 'block';
  } else {
    // 无答案时显示提示
    const ctx = aCanvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasW, canvasH);
    ctx.fillStyle = '#94A3B8';
    ctx.font = '14px -apple-system, "Noto Sans SC", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('答案需自行求解', canvasW / 2, canvasH / 2);
    answerWrapper.querySelector('.board-label').textContent = '答案（待求解）';
    aCanvas.style.display = 'block';
  }

  // 更新信息
  let whiteCount = 0;
  for (let r = 0; r < puzzle.rows; r++)
    for (let c = 0; c < puzzle.cols; c++)
      if (puzzle.layout[r][c] === 'white') whiteCount++;

  const diffLabels = { easy: '简单', medium: '中等', hard: '困难', very_hard: '非常困难' };
  const diffLabel = diffLabels[puzzle.originalDifficulty] || puzzle.difficulty;
  document.getElementById('infoSize').textContent = `${puzzle.cols}×${puzzle.rows}`;
  document.getElementById('infoDifficulty').textContent = diffLabel;
  document.getElementById('infoClues').textContent = `提示数：${puzzle.clues.length}`;
  document.getElementById('infoCells').textContent = `空格：${whiteCount}`;
  document.getElementById('infoSource').textContent = `来源：${puzzle.source} #${puzzle.id}`;
}

/**
 * 绘制数和谜题网格
 */
function drawGrid(ctx, puzzle, cellSize, mode) {
  const { rows, cols, layout, solution, puzzle: puzzleData, clues } = puzzle;
  const w = cols * cellSize;
  const h = rows * cellSize;

  // 建立 clue 查找表
  const clueMap = {};
  for (const cl of clues) {
    clueMap[`${cl.r},${cl.c}`] = cl;
  }

  // 背景
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, w + 1, h + 1);

  // 绘制每个格子
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cellSize;
      const y = r * cellSize;

      if (layout[r][c] === 'clue') {
        // === 黑色提示格（对角线分割） ===
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(x, y, cellSize, cellSize);

        const cl = clueMap[`${r},${c}`];

        // 绘制对角线
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + cellSize, y + cellSize);
        ctx.stroke();

        // 右上角：横向提示 (acrossSum)
        if (cl && cl.acrossSum !== null) {
          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.max(10, Math.floor(cellSize * 0.3));
          ctx.font = `bold ${fontSize}px -apple-system, "Noto Sans SC", sans-serif`;
          ctx.textAlign = 'right';
          ctx.textBaseline = 'top';
          ctx.fillText(cl.acrossSum, x + cellSize - 3, y + 3);
        }

        // 左下角：纵向提示 (downSum)
        if (cl && cl.downSum !== null) {
          ctx.fillStyle = '#FFFFFF';
          const fontSize = Math.max(10, Math.floor(cellSize * 0.3));
          ctx.font = `bold ${fontSize}px -apple-system, "Noto Sans SC", sans-serif`;
          ctx.textAlign = 'left';
          ctx.textBaseline = 'bottom';
          ctx.fillText(cl.downSum, x + 3, y + cellSize - 3);
        }

      } else if (layout[r][c] === 'wall') {
        // === 纯黑色格 ===
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(x, y, cellSize, cellSize);

      } else if (layout[r][c] === 'white') {
        // === 白色填空格 ===
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x, y, cellSize, cellSize);

        const val = mode === 'question' ? puzzleData[r][c] : solution[r][c];

        if (val !== null && val !== 0) {
          ctx.fillStyle = mode === 'answer' ? '#2563EB' : '#1E293B';
          const fontSize = Math.max(11, Math.floor(cellSize * 0.42));
          ctx.font = `bold ${fontSize}px -apple-system, "Noto Sans SC", sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(val, x + cellSize / 2, y + cellSize / 2 + 1);
        }
      }
    }
  }

  // 网格线
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  for (let r = 0; r <= rows; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * cellSize);
    ctx.lineTo(w, r * cellSize);
    ctx.stroke();
  }
  for (let c = 0; c <= cols; c++) {
    ctx.beginPath();
    ctx.moveTo(c * cellSize, 0);
    ctx.lineTo(c * cellSize, h);
    ctx.stroke();
  }

  // 外边框加粗
  ctx.strokeStyle = '#0F172A';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(0, 0, w, h);
}

// ==================== PDF 下载与打印 ====================
function renderPuzzleToCanvas(puzzle, cellSize, mode) {
  const canvas = document.createElement('canvas');
  canvas.width = puzzle.cols * cellSize + 1;
  canvas.height = puzzle.rows * cellSize + 1;
  drawGrid(canvas.getContext('2d'), puzzle, cellSize, mode);
  return canvas;
}

function downloadPDF() {
  if (state.selectedIndex < 0) {
    showToast('请先生成一个关卡');
    return;
  }
  const puzzle = state.puzzles[state.selectedIndex];
  if (!puzzle) return;

  const cellSize = state.compactMode ? 34 : 40;
  const diffLabels = { easy: '简单', medium: '中等', hard: '困难', very_hard: '非常困难' };
  const diffLabel = diffLabels[puzzle.originalDifficulty] || puzzle.difficulty;

  const qCanvas = renderPuzzleToCanvas(puzzle, cellSize, 'question');
  const qDataUrl = qCanvas.toDataURL();

  let answerHTML = '';
  if (state.showAnswer) {
    const aCanvas = renderPuzzleToCanvas(puzzle, cellSize, 'answer');
    const aDataUrl = aCanvas.toDataURL();
    answerHTML = `
      <div class="print-page">
        <div class="print-title">数和谜题 — 答案</div>
        <div class="print-subtitle">${puzzle.rows}×${puzzle.cols} | ${diffLabel}</div>
        <div class="print-board"><img src="${aDataUrl}" style="max-width:100%;" alt="答案"></div>
      </div>`;
  }

  const printHTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="UTF-8"><title>数和谜题 — ${puzzle.rows}×${puzzle.cols} ${diffLabel}</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans SC", sans-serif; color:#1E293B; }
  .print-page { page-break-after:always; padding:16px 0; }
  .print-page:last-child { page-break-after:auto; }
  .print-title { font-size:22px; font-weight:800; text-align:center; color:#6366F1; margin-bottom:4px; }
  .print-subtitle { text-align:center; color:#64748B; font-size:13px; margin-bottom:20px; }
  .print-board { text-align:center; }
  .print-instructions { margin-top:16px; padding-top:12px; border-top:1px dashed #CBD5E1; font-size:12px; color:#94A3B8; line-height:1.8; text-align:center; }
  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style></head>
<body>
  <div class="print-page">
    <div class="print-title">数和谜题 Kakuro</div>
    <div class="print-subtitle">${puzzle.cols}×${puzzle.rows} | 难度：${diffLabel} | ${puzzle.clues.length} 个提示</div>
    <div class="print-board"><img src="${qDataUrl}" style="max-width:100%;" alt="题目"></div>
    <div class="print-instructions">
      <p>🔢 规则：用数字 1-9 填满所有空白格</p>
      <p>↗ 右上角数字 = 右侧连续白色格之和（不能重复）</p>
      <p>↙ 左下角数字 = 下方连续白色格之和（不能重复）</p>
    </div>
  </div>
  ${answerHTML}
  <script>setTimeout(() => window.print(), 400);<\\/script>
</body></html>`;

  const blob = new Blob([printHTML], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
  showToast('已在新窗口打开，使用 Cmd+P 保存为 PDF');
}

function printPuzzle() {
  if (state.selectedIndex < 0) {
    showToast('请先生成一个关卡');
    return;
  }
  downloadPDF();
}

// ==================== Toast ====================
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  toast.style.animation = 'none';
  toast.offsetHeight;
  toast.style.animation = 'toastIn 0.3s ease, toastOut 0.3s ease 1.7s forwards';
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => { toast.style.display = 'none'; }, 2200);
}
