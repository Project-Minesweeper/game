/*
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

const containerStyle = window.getComputedStyle(document.getElementById('container'));
canvas.width = parseFloat(containerStyle.width);
canvas.height = canvas.width;

const rows = 8;
const columns = 8;
const tileSize = canvas.width / rows;

const spritesId = ['0', '1', '2', '3', '4', '5', '6', '7', '8', 'covered', 'mine', 'flag']
let sprites = []

for (let i = 0; i < spritesId.length; i++) {
    sprites[i] = document.getElementById(spritesId[i])
}

let grid = []

for (let x = 0; x < rows; x++) {
    grid[x] = [];
    for (let y = 0; y < columns; y++) {
        grid[x][y] = 0;
        ctx.drawImage(sprites[1], tileSize * x, tileSize * y, tileSize, tileSize);
    }
}
/*

/* =====================
   CONFIG
===================== */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const containerStyle = window.getComputedStyle(document.getElementById('container'));
canvas.width = parseFloat(containerStyle.width);

const COLS = 10;
const ROWS = 20;
const MINES = 50;
const TILE_SIZE = canvas.width / COLS;
canvas.height = TILE_SIZE * ROWS;

/* =====================
   PARTICLE CONFIG
===================== */
const TILE_PARTICLE = {
  gravity: 0.35,
  bounce: 0.65,
  friction: 0.98,
  fadeSpeed: 0.005,
  initialUpward: -6,
  horizontalSpread: 10
};

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;

  Object.values(sounds).forEach(sound => {
    sound.muted = true;
    sound.play().then(() => {
      sound.pause();
      sound.currentTime = 0;
      sound.muted = false;
    }).catch(() => {});
  });

  audioUnlocked = true;
}

/* =====================
   IMAGES
===================== */
const images = {};
const imageNames = [
  "covered","flag","mine",
  "0","1","2","3","4","5","6","7","8"
];

imageNames.forEach(name => {
  const img = new Image();
  img.src = `${name}.png`;
  images[name] = img;
});

/* =====================
   PARTICLES
===================== */
const tileParticles = [];

function spawnTileParticle(cellX, cellY) {
  const size = TILE_SIZE;

  tileParticles.push({
    x: cellX * TILE_SIZE,
    y: cellY * TILE_SIZE,
    vx: (Math.random() - 0.5) * TILE_PARTICLE.horizontalSpread,
    vy: TILE_PARTICLE.initialUpward,
    alpha: 1,
    size
  });
}


function updateTileParticles() {
  for (let i = tileParticles.length - 1; i >= 0; i--) {
    const p = tileParticles[i];

    // Physics
    p.vy += TILE_PARTICLE.gravity;
    p.x += p.vx;
    p.y += p.vy;

    // Floor bounce
    if (p.y + p.size > canvas.height) {
      p.y = canvas.height - p.size;
      p.vy *= -TILE_PARTICLE.bounce;
      p.vx *= TILE_PARTICLE.friction;
    }

    // Wall bounce
    if (p.x < 0 || p.x + p.size > canvas.width) {
      p.vx *= -TILE_PARTICLE.bounce;
      p.x = Math.max(0, Math.min(canvas.width - p.size, p.x));
    }

    // Fade out
    p.alpha -= TILE_PARTICLE.fadeSpeed;
    if (p.alpha <= 0) tileParticles.splice(i, 1);
  }
}


function drawTileParticles() {
  for (const p of tileParticles) {
    ctx.globalAlpha = p.alpha;
    ctx.drawImage(
      images.covered,
      p.x,
      p.y,
      p.size,
      p.size
    );
    ctx.globalAlpha = 1;
  }
}


/* =====================
   DATA
===================== */
class Cell {
  constructor() {
    this.mine = false;
    this.revealed = false;
    this.flagged = false;
    this.neighbors = 0;
  }
}

const board = [];
let firstSwipe = true;

/* =====================
   NEIGHBORS
===================== */
const NEIGHBORS = [
  [-1,-1],[0,-1],[1,-1],
  [-1, 0],        [1, 0],
  [-1, 1],[0, 1],[1, 1]
];

function revealAllMines() {
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (board[x][y].mine) board[x][y].revealed = true;
    }
  }
}

function checkWin() {
  let revealedCount = 0;
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      const c = board[x][y];
      if (c.revealed && !c.mine) revealedCount++;
    }
  }
  return revealedCount === COLS * ROWS - MINES;
}

function resetGame() {
  board.length = 0;
  firstSwipe = true;
  init();
}


/* =====================
   INIT
===================== */
function init() {
  for (let x = 0; x < COLS; x++) {
    board[x] = [];
    for (let y = 0; y < ROWS; y++) {
      board[x][y] = new Cell();
    }
  }
  draw();
}

/* =====================
   MINES (SAFE FIRST SWIPE)
===================== */
function placeMinesSafe(sx, sy) {
  let placed = 0;
  while (placed < MINES) {
    const x = Math.floor(Math.random() * COLS);
    const y = Math.floor(Math.random() * ROWS);

    if (board[x][y].mine) continue;
    if (Math.abs(x - sx) <= 1 && Math.abs(y - sy) <= 1) continue;

    board[x][y].mine = true;
    placed++;
  }

  calculateNeighbors();
}

function calculateNeighbors() {
  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      if (board[x][y].mine) continue;
      let count = 0;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (inBounds(nx, ny) && board[nx][ny].mine) count++;
      }
      board[x][y].neighbors = count;
    }
  }
}

/* =====================
   LOGIC
===================== */
function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function reveal(x, y) {
  const stack = [[x, y]];

  while (stack.length) {
    const [cx, cy] = stack.pop();
    const cell = board[cx][cy];

    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;

    if (cell.neighbors === 0 && !cell.mine) {
      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (inBounds(nx, ny)) stack.push([nx, ny]);
      }
    }
  }
}

function chord(x, y) {
  const cell = board[x][y];
  if (!cell.revealed || cell.neighbors === 0) return;

  let flags = 0;
  const hidden = [];

  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (!inBounds(nx, ny)) continue;

    const n = board[nx][ny];
    if (n.flagged) flags++;
    else if (!n.revealed) hidden.push([nx, ny]);
  }

  if (flags !== cell.neighbors) return;

  // 🔥 CHECK FOR MINES FIRST
  for (const [hx, hy] of hidden) {
    if (board[hx][hy].mine) {
      loseGame(hx, hy);
      return;
    }
  }

  // Safe to reveal
  hidden.forEach(([hx, hy]) => reveal(hx, hy));
}


/* =====================
   SOUNDS
===================== */
const sounds = {
  dig: new Audio("dig.mp3"),
  flag: new Audio("flag.mp3"),
  explode: new Audio("explode.mp3")
};

Object.values(sounds).forEach(s => {
  s.volume = 0.6;
  s.preload = "auto";
});


/* =====================
   TOUCH INPUT
===================== */
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", e => {

     unlockAudio();
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
});

canvas.addEventListener("touchend", e => {
  const t = e.changedTouches[0];
  const dx = t.clientX - touchStartX;
  const dy = t.clientY - touchStartY;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor((touchStartX - rect.left) / TILE_SIZE);
  const y = Math.floor((touchStartY - rect.top) / TILE_SIZE);
  if (!inBounds(x, y)) return;

  const cell = board[x][y];

  if (firstSwipe) {
    firstSwipe = false;
    placeMinesSafe(x, y);
  }

const absX = Math.abs(dx);
const absY = Math.abs(dy);

// Require vertical intent AFTER first swipe
if (!firstSwipe && (absY < 20 || absY < absX)) return;


// SWIPE UP = FLAG
if (dy < 0) {
  if (!cell.revealed) {
    cell.flagged = !cell.flagged;
    spawnTileParticle(x, y);
    sounds.flag.currentTime = 0;
    sounds.flag.play();
  }
}

// SWIPE DOWN = DIG / CHORD
if (dy > 0) {
  spawnTileParticle(x, y);

  if (!cell.revealed && !cell.flagged) {
    sounds.dig.currentTime = 0;
    sounds.dig.play();

    if (cell.mine) {
      sounds.explode.currentTime = 0;
      sounds.explode.play();

      revealAllMines();
      setTimeout(() => {
        alert("💥 Game Over");
        resetGame();
      }, 1000);
      return;
    }

    reveal(x, y);
  } 
  else if (cell.revealed) {
    sounds.dig.currentTime = 0;
    sounds.dig.play();
    chord(x, y);
  }
}

  if (checkWin()) {
    revealAllMines();
    setTimeout(() => {
      alert("🎉 You Win!");
      resetGame();
    }, 1000);
  }
});

function loseGame(x, y) {
  revealAllMines();
  spawnTileParticle(x, y);

  sounds.explode.currentTime = 0;
  sounds.explode.play();

  setTimeout(() => {
    alert("💥 Game Over");
    resetGame();
  }, 1000);
}


/* =====================
   DRAW
===================== */
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let x = 0; x < COLS; x++) {
    for (let y = 0; y < ROWS; y++) {
      drawCell(x, y);
    }
  }
}

function drawCell(x, y) {
  const cell = board[x][y];
  const px = x * TILE_SIZE;
  const py = y * TILE_SIZE;

  if (!cell.revealed) {
    ctx.drawImage(
      cell.flagged ? images.flag : images.covered,
      px, py, TILE_SIZE, TILE_SIZE
    );
    return;
  }

  if (cell.mine) {
    ctx.drawImage(images.mine, px, py, TILE_SIZE, TILE_SIZE);
  } else {
    ctx.drawImage(
      images[cell.neighbors],
      px, py, TILE_SIZE, TILE_SIZE
    );
  }
}

let lastTime = performance.now();

function loop(now) {
  const dt = now - lastTime;
  lastTime = now;

  draw();
  updateTileParticles();
  drawTileParticles();

  requestAnimationFrame(loop);
}


requestAnimationFrame(loop);


/* =====================
   START
===================== */
init();