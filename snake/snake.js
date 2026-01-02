// --- Polyfill for roundRect (for older browsers) ---
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
    r = Math.max(0, Math.min(r, Math.min(w, h) / 2));
    this.beginPath();
    this.moveTo(x + r, y);
    this.lineTo(x + w - r, y);
    this.quadraticCurveTo(x + w, y, x + w, y + r);
    this.lineTo(x + w, y + h - r);
    this.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.lineTo(x + r, y + h);
    this.quadraticCurveTo(x, y + h, x, y + h - r);
    this.lineTo(x, y + r);
    this.quadraticCurveTo(x, y, x + r, y);
    this.closePath();
  };
}

// --- Config ---
const TILE = 20;
const FOOD_MARGIN_TILES = 3; // ✅ keep food at least 3 tiles away from border

const css = getComputedStyle(document.documentElement);
const GRID_COLOR = css.getPropertyValue('--grid').trim() || '#333';
const BG_COLOR = css.getPropertyValue('--bg').trim() || '#1e1e1e';
const BORDER_RED = css.getPropertyValue('--border-red').trim() || '#e00000';
const FOOD_COLOR = css.getPropertyValue('--accent').trim() || '#dc3c3c';

const PALETTE = [
  [0, 200, 80],
  [0, 180, 220],
  [255, 180, 0],
  [180, 80, 200],
  [200, 70, 70],
  [80, 200, 160],
];

// --- DOM ---
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const pauseBtn = document.getElementById('pauseBtn');
const speedButtons = Array.from(document.querySelectorAll('#speed-buttons button'));

const pauseOverlay = document.getElementById('pauseOverlay');
const continueBtn = document.getElementById('continueBtn');
const exitBtn = document.getElementById('exitBtn');
const menuBtn = document.getElementById('menuBtn');

// --- Game state ---
let WIDTH = 0, HEIGHT = 0;
let snake = [];
let dir = { x: TILE, y: 0 };
let grow = 0;
let score = 0;
let paused = false;

const speeds = [
  { label: 'Slow', fps: 8 },
  { label: 'Normal', fps: 12 },
  { label: 'Fast', fps: 16 },
  { label: 'Insane', fps: 20 },
];

let currentSpeedIdx = 1; // Normal
let stepMs = 1000 / speeds[currentSpeedIdx].fps;
let accumulator = 0;
let lastTs = 0;

// Colors
let baseColor = PALETTE[0];
let bodyColor = darker(baseColor, 0.8);

// Food
let food = { x: 0, y: 0 };

// Tongue animation (ms)
let tongueUntilTs = 0;
const TONGUE_MS = 140; // how long tongue stays out after eating


// --- Helpers ---
function rgb(c) { return `rgb(${c[0]}, ${c[1]}, ${c[2]})`; }
function darker(c, factor = 0.8) {
  return [Math.round(c[0] * factor), Math.round(c[1] * factor), Math.round(c[2] * factor)];
}

function setPaused(state) {
  paused = state;
  pauseBtn.classList.toggle('active', paused);
  pauseOverlay.classList.toggle('show', paused);
  pauseOverlay.setAttribute('aria-hidden', String(!paused));
}

function sizeCanvas(reset = true) {
  // Keep canvas pixel size a multiple of TILE to align the grid
  const w = Math.floor(window.innerWidth / TILE) * TILE;
  const h = Math.floor(window.innerHeight / TILE) * TILE;

  canvas.width = WIDTH = Math.max(TILE * 10, w);
  canvas.height = HEIGHT = Math.max(TILE * 8, h);

  if (reset) hardReset();
}

function randomCell(marginTiles = 0) {
  const cols = (WIDTH / TILE) | 0;
  const rows = (HEIGHT / TILE) | 0;

  // Avoid breaking on tiny screens: clamp margin
  const maxMarginX = Math.floor((cols - 1) / 2);
  const maxMarginY = Math.floor((rows - 1) / 2);
  const m = Math.max(0, Math.min(marginTiles, maxMarginX - 1, maxMarginY - 1));

  const minCol = m;
  const maxCol = cols - 1 - m;
  const minRow = m;
  const maxRow = rows - 1 - m;

  const col = Math.floor(Math.random() * (maxCol - minCol + 1)) + minCol;
  const row = Math.floor(Math.random() * (maxRow - minRow + 1)) + minRow;

  return { x: col * TILE, y: row * TILE };
}

function hardReset() {
  snake = [{
    x: Math.floor(WIDTH / 2 / TILE) * TILE,
    y: Math.floor(HEIGHT / 2 / TILE) * TILE
  }];
  dir = { x: TILE, y: 0 };
  grow = 0;
  score = 0;
  scoreEl.textContent = score;
  setColorByScore(score);
  food = spawnFood();
  setPaused(false);
}

function spawnFood() {
  let p;
  do { p = randomCell(FOOD_MARGIN_TILES); }   // ✅ margin applied
  while (snake.some(s => s.x === p.x && s.y === p.y));
  return p;
}

function setColorByScore(s) {
  const idx = Math.floor(s / 3) % PALETTE.length;
  baseColor = PALETTE[idx];
  bodyColor = darker(baseColor, 0.8);
}

function changeDir(nx, ny) {
  // Prevent direct reverse
  if (nx === -dir.x && ny === -dir.y) return;
  dir = { x: nx, y: ny };
}

function collideWall(h) {
  return h.x < 0 || h.x >= WIDTH || h.y < 0 || h.y >= HEIGHT;
}

function collideSelf(h) {
  return snake.slice(1).some(p => p.x === h.x && p.y === h.y);
}

// --- Drawing ---
function drawGrid() {
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke();
  }
}

function drawRect(x, y, color, radius = 4) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x, y, TILE, TILE, radius);
  ctx.fill();
}

function drawHead() {
  const h = snake[0];
  drawRect(h.x, h.y, rgb(baseColor), 6);

    // 👅 Tongue (show briefly after eating)
  if (performance.now() < tongueUntilTs) {
    const dx = Math.sign(dir.x);
    const dy = Math.sign(dir.y);

    // Tongue starts near center/front of head
    const cx = h.x + TILE / 2;
    const cy = h.y + TILE / 2;

    // Tongue length + thickness
    const len = TILE * 0.55;
    const thick = Math.max(2, (TILE * 0.14) | 0);

    // End point based on direction
    const ex = cx + dx * len;
    const ey = cy + dy * len;

    ctx.strokeStyle = '#ff4d6d';
    ctx.lineWidth = thick;
    ctx.lineCap = 'round';

    // Main tongue line
    ctx.beginPath();
    ctx.moveTo(cx + dx * (TILE * 0.18), cy + dy * (TILE * 0.18));
    ctx.lineTo(ex, ey);
    ctx.stroke();

    // Tiny fork at the end
    const fork = TILE * 0.18;
    const px = -dy; // perpendicular vector
    const py = dx;

    ctx.lineWidth = Math.max(2, thick - 1);
    ctx.beginPath();
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex + px * fork, ey + py * fork);
    ctx.moveTo(ex, ey);
    ctx.lineTo(ex - px * fork, ey - py * fork);
    ctx.stroke();
  }


  const dx = Math.sign(dir.x);
  const dy = Math.sign(dir.y);

  const eyeR = Math.max(2, (TILE / 6) | 0);
  const pupilR = Math.max(1, (TILE / 10) | 0);

  let e1, e2, pupilOffset;
  if (dx === 1) { // right
    e1 = { x: h.x + TILE * 0.65, y: h.y + TILE * 0.35 };
    e2 = { x: h.x + TILE * 0.65, y: h.y + TILE * 0.65 };
    pupilOffset = { x: eyeR / 2, y: 0 };
  } else if (dx === -1) { // left
    e1 = { x: h.x + TILE * 0.35, y: h.y + TILE * 0.35 };
    e2 = { x: h.x + TILE * 0.35, y: h.y + TILE * 0.65 };
    pupilOffset = { x: -eyeR / 2, y: 0 };
  } else if (dy === -1) { // up
    e1 = { x: h.x + TILE * 0.35, y: h.y + TILE * 0.35 };
    e2 = { x: h.x + TILE * 0.65, y: h.y + TILE * 0.35 };
    pupilOffset = { x: 0, y: -eyeR / 2 };
  } else { // down
    e1 = { x: h.x + TILE * 0.35, y: h.y + TILE * 0.65 };
    e2 = { x: h.x + TILE * 0.65, y: h.y + TILE * 0.65 };
    pupilOffset = { x: 0, y: eyeR / 2 };
  }

  ctx.fillStyle = 'white';
  for (const e of [e1, e2]) {
    ctx.beginPath(); ctx.arc(e.x, e.y, eyeR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(e.x + pupilOffset.x, e.y + pupilOffset.y, pupilR, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white';
  }
}

function drawBody() {
  for (let i = 1; i < snake.length; i++) {
    drawRect(snake[i].x, snake[i].y, rgb(bodyColor), 4);
  }
}

function drawFood() {
  drawRect(food.x, food.y, FOOD_COLOR, 4);
}

function drawBorder() {
  ctx.strokeStyle = BORDER_RED;
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, WIDTH - 6, HEIGHT - 6);
}

function drawScene() {
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  drawGrid();
  drawFood();
  drawBody();
  drawHead();
  drawBorder();
}

// --- Update & loop ---
function update() {
  if (paused) return;

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
  snake.unshift(head);

  if (grow > 0) { grow--; } else { snake.pop(); }

  if (collideWall(head) || collideSelf(head)) {
    hardReset();
    return;
  }

  if (head.x === food.x && head.y === food.y) {
    score++;
    scoreEl.textContent = score;
    grow++;
    setColorByScore(score);
    food = spawnFood();

    // 👅 Tongue out!
    tongueUntilTs = performance.now() + TONGUE_MS;
  }

}

function loop(ts) {
  if (!lastTs) lastTs = ts;
  const dt = ts - lastTs;
  lastTs = ts;

  accumulator += dt;
  while (accumulator >= stepMs) {
    update();
    accumulator -= stepMs;
  }

  drawScene();
  requestAnimationFrame(loop);
}

// --- UI wiring ---
pauseBtn.addEventListener('click', () => setPaused(!paused));

continueBtn.addEventListener('click', () => setPaused(false));

exitBtn.addEventListener('click', () => {
  hardReset();
  setPaused(false);
});

menuBtn.addEventListener('click', () => {
  // assumes main menu at site root
  window.location.href = '/';
});

// Click outside the card to continue
pauseOverlay.addEventListener('click', (e) => {
  if (e.target === pauseOverlay) setPaused(false);
});

speedButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    speedButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentSpeedIdx = Number(btn.dataset.speed);
    stepMs = 1000 / speeds[currentSpeedIdx].fps;
  });
});

document.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();

  if (k === ' ' || k === 'p') {
    setPaused(!paused);
    return;
  }

  if (paused) return;

  if (k === 'arrowup' || k === 'w') changeDir(0, -TILE);
  else if (k === 'arrowdown' || k === 's') changeDir(0, TILE);
  else if (k === 'arrowleft' || k === 'a') changeDir(-TILE, 0);
  else if (k === 'arrowright' || k === 'd') changeDir(TILE, 0);
  else if (k === '1' || k === '2' || k === '3' || k === '4') {
    currentSpeedIdx = Number(k) - 1;
    stepMs = 1000 / speeds[currentSpeedIdx].fps;
    speedButtons.forEach(b => b.classList.toggle('active', Number(b.dataset.speed) === currentSpeedIdx));
  }
});

// Optional: press "F" fullscreen toggle
document.addEventListener('keydown', (e) => {
  if (e.key.toLowerCase() === 'f') {
    const el = document.documentElement;
    if (!document.fullscreenElement && el.requestFullscreen) el.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  }
});

window.addEventListener('resize', () => sizeCanvas(true));

// --- Boot ---
sizeCanvas(true);
requestAnimationFrame(loop);

// --- Mobile swipe controls ---
let touchStartX = 0, touchStartY = 0;
const SWIPE_MIN = 18; // px threshold

canvas.style.touchAction = 'none'; // prevent scrolling while swiping

canvas.addEventListener('touchstart', (e) => {
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, { passive: true });

canvas.addEventListener('touchmove', (e) => {
  // prevent browser gestures/scroll
  e.preventDefault();
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  if (paused) return;
  const t = (e.changedTouches && e.changedTouches[0]) ? e.changedTouches[0] : null;
  if (!t) return;

  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  if (Math.abs(dx) < SWIPE_MIN && Math.abs(dy) < SWIPE_MIN) return;

  if (Math.abs(dx) > Math.abs(dy)) {
    // left/right
    if (dx > 0) changeDir(TILE, 0);
    else changeDir(-TILE, 0);
  } else {
    // up/down
    if (dy > 0) changeDir(0, TILE);
    else changeDir(0, -TILE);
  }
}, { passive: true });
