/* =====================
   CONFIG
===================== */
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const containerStyle = window.getComputedStyle(document.getElementById('container'));
canvas.width = parseFloat(containerStyle.width);

const COLS = 10;
const ROWS = 12;
const MINES = 20;
const TILE_SIZE = canvas.width / COLS;
canvas.height = TILE_SIZE * ROWS;

let sounds = {};

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
    const particleImage = p.image || images.covered;
    ctx.drawImage(
      particleImage,
      p.x,
      p.y,
      p.size,
      p.size
    );
    ctx.globalAlpha = 1;
  }
}

function spawnCanvasParticles(count = 120, image = null) {
  for (let i = 0; i < count; i++) {
    tileParticles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * TILE_PARTICLE.horizontalSpread * 2,
      vy: TILE_PARTICLE.initialUpward * (0.6 + Math.random() * 1.4),
      alpha: 1,
      size: TILE_SIZE * (0.5 + Math.random() * 1.2),
      image: image
    });
  }
}

/* =====================
   CAMERA SHAKE
===================== */
const cameraShake = {
  intensity: 0,
  duration: 0,
  elapsed: 0
};

function triggerCameraShake(intensity, duration) {
  cameraShake.intensity = intensity;
  cameraShake.duration = duration;
  cameraShake.elapsed = 0;
}

function updateCameraShake() {
  if (cameraShake.elapsed >= cameraShake.duration) {
    cameraShake.intensity = 0;
    return { x: 0, y: 0 };
  }
  cameraShake.elapsed += 16; // approx. 60fps delta
  const offset = Math.random() - 0.5;
  const shake = cameraShake.intensity * offset;
  return {
    x: shake,
    y: shake
  };
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
   SCORE SYSTEM
===================== */
let scoreDisplay = 0;
let scoreTarget = 0;
let scoreAnimating = false;
const scoreElement = document.getElementById('score');
const SCORE_PER_TILE = 5;

function initScore() {
  scoreDisplay = parseInt(localStorage.getItem('minesweeperScore') || '0');
  scoreTarget = scoreDisplay;
  updateScoreDisplay();
}

function updateScoreDisplay() {
  scoreElement.textContent = Math.floor(scoreDisplay);
}

function addScore(amount) {
  scoreTarget += amount;
  saveScore();
  triggerScoreBulge();
  animateScore();
}

function animateScore() {
  if (scoreAnimating) return;
  scoreAnimating = true;

  const frameRate = 60;
  const duration = 0.5; // seconds
  const frames = Math.ceil(frameRate * duration);
  const perFrame = (scoreTarget - scoreDisplay) / frames;
  let currentFrame = 0;
  let lastTickFrame = 0;
  const tickInterval = 4; // play score sound every 4 frames

  function step() {
    currentFrame++;
    scoreDisplay += perFrame;

    // Play score tick sound at intervals
    if (currentFrame - lastTickFrame >= tickInterval) {
      playScoreTick();
      lastTickFrame = currentFrame;
    }

    if (currentFrame >= frames) {
      scoreDisplay = scoreTarget;
      scoreAnimating = false;
    }

    updateScoreDisplay();

    if (scoreAnimating) {
      requestAnimationFrame(step);
    }
  }

  step();
}

function triggerScoreBulge() {
  scoreElement.classList.remove('bulge');
  // Trigger reflow to restart animation
  void scoreElement.offsetWidth;
  scoreElement.classList.add('bulge');
}

function saveScore() {
  localStorage.setItem('minesweeperScore', Math.floor(scoreTarget).toString());
}

function resetScore() {
  scoreDisplay = 0;
  scoreTarget = 0;
  saveScore();
  updateScoreDisplay();
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

function reveal(x, y, isInitial = false) {
  // stack entries: [x, y, isInitialForThisEntry]
  const stack = [[x, y, !!isInitial]];
  let tilesRevealed = 0;

  while (stack.length) {
    const [cx, cy, initial] = stack.pop();
    const cell = board[cx][cy];

    if (cell.revealed || cell.flagged) continue;
    cell.revealed = true;
    tilesRevealed++;

    // spawn a particle for every auto-revealed tile (but avoid duplicating
    // the particle for the original tile if the caller already spawned one)
    if (!initial) spawnTileParticle(cx, cy);

    if (cell.neighbors === 0 && !cell.mine) {
      for (const [dx, dy] of NEIGHBORS) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (inBounds(nx, ny)) stack.push([nx, ny, false]);
      }
    }
  }

  // Add score for each tile revealed (only on initial touch reveal, not on chord auto-reveals)
  if (isInitial && tilesRevealed > 0) {
    addScore(tilesRevealed * SCORE_PER_TILE);
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

  // Safe to reveal - count tiles and add score
  let chordTilesRevealed = 0;
  for (const [hx, hy] of hidden) {
    // Use a modified reveal that counts but doesn't trigger score (we'll do it once for chord)
    const tempStack = [[hx, hy, false]];
    while (tempStack.length) {
      const [cx, cy, initial] = tempStack.pop();
      const c = board[cx][cy];
      if (c.revealed || c.flagged) continue;
      c.revealed = true;
      chordTilesRevealed++;
      
      // spawn particles for every chord-revealed tile (except initial)
      if (!initial) spawnTileParticle(cx, cy);
      
      if (c.neighbors === 0 && !c.mine) {
        for (const [dx, dy] of NEIGHBORS) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (inBounds(nx, ny)) tempStack.push([nx, ny, false]);
        }
      }
    }
  }
  
  // Add score once for the entire chord action
  if (chordTilesRevealed > 0) {
    addScore(chordTilesRevealed * SCORE_PER_TILE);
  }
}



/* =====================
   TOUCH INPUT
===================== */
let touchStartX = 0;
let touchStartY = 0;

canvas.addEventListener("touchstart", e => {
  e.preventDefault();  
  unlockAudio();
  const t = e.touches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
}, {passive: false});

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
    playSound('flag', { pitch: getRandomPitch(), volume: 1.0 });
  }
}

// SWIPE DOWN = DIG / CHORD
if (dy > 0) {
  spawnTileParticle(x, y);

  if (!cell.revealed && !cell.flagged) {
  playSound('dig', { pitch: getRandomPitch() , volume: 1.5});
  triggerCameraShake(10, 100); // weak shake on dig
  console.log(AudioEngine.ctx?.state);

    if (cell.mine) {
      playSound('mine', { pitch: getRandomPitch() });
      triggerCameraShake(20, 300); // strong shake on mine

      revealAllMines();
      // halve score (no decimals), persist and show bulge
      scoreTarget = Math.floor(scoreTarget / 2);
      scoreDisplay = scoreTarget;
      saveScore();
      updateScoreDisplay();
      triggerScoreBulge();

      // particle explosion across the canvas and immediate reset
      spawnCanvasParticles(160, images.mine);
      resetGame();
      return;
    }

    reveal(x, y, true);
  } 
  else if (cell.revealed) {
    playSound('dig', { pitch: getRandomPitch(), volume: 1.5 });
    triggerCameraShake(10, 100); // weak shake on chord dig
    chord(x, y);
  }
}

  if (checkWin()) {
    revealAllMines();
    triggerCameraShake(20, 400); // strong shake on win
    playSound('win');
    playSound('mine');
    // celebratory burst with flag particles and immediate reset
    spawnCanvasParticles(200, images.flag);
    resetGame();
  }
});

function loseGame(x, y) {
  revealAllMines();
  spawnTileParticle(x, y);

  playSound('mine');
  triggerCameraShake(20, 400); // strong shake on chord mine
  // halve score (no decimals), save and show it with bulge
  scoreTarget = Math.floor(scoreTarget / 2);
  scoreDisplay = scoreTarget;
  saveScore();
  updateScoreDisplay();
  triggerScoreBulge();

  // global explosion and immediate reset
  spawnCanvasParticles(50, images.mine);
  resetGame();
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

  const shake = updateCameraShake();
  ctx.save();
  ctx.translate(shake.x, shake.y);

  draw();
  updateTileParticles();
  drawTileParticles();

  ctx.restore();

  requestAnimationFrame(loop);
}


requestAnimationFrame(loop);

/* =====================
   SOUND
===================== */

const AudioEngine = {
  ctx: null,
  master: null,
  unlocked: false,
  buffers: {},
  bgmSource: null
};

function unlockAudio() {
  if (AudioEngine.unlocked) return;

  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();

  AudioEngine.ctx = ctx;
  AudioEngine.master = ctx.createGain();
  AudioEngine.master.gain.value = 0.9;
  AudioEngine.master.connect(ctx.destination);

  ctx.resume().then(() => {
    console.log("🔊 Audio unlocked:", ctx.state);
    AudioEngine.unlocked = true;
    initSounds().then(() => playBackgroundMusic());
  });
}

function playSound(name, options = {}) {
  if (!AudioEngine.unlocked) return;
  if (!sounds[name]) return;
  const source = AudioEngine.ctx.createBufferSource();
  source.buffer = sounds[name];

  // default pitch
  let pitch = options.pitch ?? 1.0;
  // fallback for number as second arg
  if (typeof options === 'number') pitch = options;
  
  // volume can be passed as option (0-1 scale)
  let volume = options.volume ?? 1.0;

  source.playbackRate.value = pitch;
  
  // Create a gain node for per-sound volume control
  const gainNode = AudioEngine.ctx.createGain();
  gainNode.gain.value = volume;
  
  source.connect(gainNode);
  gainNode.connect(AudioEngine.master);
  source.start(0);
}

function playBackgroundMusic() {
  if (!AudioEngine.unlocked || !sounds.bgm) return;
  if (AudioEngine.bgmSource) return; // Already playing

  AudioEngine.bgmSource = AudioEngine.ctx.createBufferSource();
  AudioEngine.bgmSource.buffer = sounds.bgm;
  AudioEngine.bgmSource.loop = true;

  const bgmGain = AudioEngine.ctx.createGain();
  bgmGain.gain.value = 0.5;

  AudioEngine.bgmSource.connect(bgmGain);
  bgmGain.connect(AudioEngine.master);
  AudioEngine.bgmSource.start(0);
}

function playScoreTick() {
  if (!AudioEngine.unlocked || !sounds.score) return;
  const source = AudioEngine.ctx.createBufferSource();
  source.buffer = sounds.score;
  source.playbackRate.value = getRandomPitch(0.9, 1.1);

  const tickGain = AudioEngine.ctx.createGain();
  tickGain.gain.value = 0.7;

  source.connect(tickGain);
  tickGain.connect(AudioEngine.master);
  source.start(0);
}

function getRandomPitch(min = 0.95, max = 1.05) {
  return Math.random() * (max - min) + min;
}


async function loadSound(name, url) {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const buffer = await AudioEngine.ctx.decodeAudioData(arrayBuffer);
  AudioEngine.buffers[name] = buffer;
  return buffer;
}

async function loadAllSounds() {
  await Promise.all([
    loadSound("dig", "dig.mp3"),
    loadSound("flag", "flag.mp3"),
    loadSound("mine", "explode.mp3"),
    loadSound("bgm", "bgm.mp3"),
      loadSound("score", "score.mp3"),
      loadSound("win", "win.mp3")
  ]);
}

function initSounds() {
  // Load all sounds and then expose decoded buffers via `sounds`
  return (async () => {
    await loadAllSounds();
    sounds = AudioEngine.buffers;
  })();
}


/* =====================
   START
===================== */
initScore();
init();