// ---------- 1. Image → Sprite ----------
function loadImage(file, canvas) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve(null);
    const img = new Image();
    const ctx = canvas.getContext('2d');
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
      resolve(canvas.toDataURL());
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- 2. Fighter class ----------
class Fighter {
  constructor({name, side, spriteUrl, isAI = false}) {
    this.name = name;
    this.side = side;               // 'left' or 'right'
    this.isAI = isAI;
    this.health = 100;
    this.x = side === 'left' ? 150 : 550;
    this.y = 220;
    this.width = 80;
    this.height = 160;
    this.velocity = 0;
    this.sprite = new Image();
    this.sprite.src = spriteUrl;
    this.attackCooldown = 0;
  }

  draw(ctx) {
    ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
  }

  update(arena, opponent) {
    // gravity
    this.y += this.velocity;
    if (this.y + this.height > arena.height - 50) {
      this.y = arena.height - 50 - this.height;
      this.velocity = 0;
    } else this.velocity += 0.8;

    // AI simple logic
    if (this.isAI && this.attackCooldown === 0) {
      const dist = Math.abs(this.x - opponent.x);
      if (dist > 120) {
        this.x += this.side === 'left' ? 4 : -4;
      } else {
        this.attack(opponent);
      }
    }

    if (this.attackCooldown > 0) this.attackCooldown--;
  }

  attack(opponent) {
    if (this.attackCooldown > 0) return;
    const dist = Math.abs(this.x + this.width/2 - (opponent.x + opponent.width/2));
    if (dist < 90) {
      opponent.health -= 12;
      this.attackCooldown = 30;
    }
  }
}

// ---------- 3. Game loop ----------
let p1, p2, animationId;

function initGame(p1Url, p2Url) {
  const arena = document.getElementById('arena');
  const ctx = arena.getContext('2d');

  p1 = new Fighter({name:'P1', side:'left', spriteUrl: p1Url});
  p2 = new Fighter({name:'P2', side:'right', spriteUrl: p2Url || 'default-p2.png', isAI: !p2Url});

  function animate() {
    ctx.clearRect(0,0,arena.width,arena.height);
    // floor
    ctx.fillStyle = '#444';
    ctx.fillRect(0, arena.height-50, arena.width, 50);

    p1.update(arena, p2);
    p2.update(arena, p1);
    p1.draw(ctx);
    p2.draw(ctx);

    document.getElementById('p1-health').textContent = `P1: ${Math.max(p1.health,0)}`;
    document.getElementById('p2-health').textContent = `P2: ${Math.max(p2.health,0)}`;

    if (p1.health <= 0 || p2.health <= 0) {
      cancelAnimationFrame(animationId);
      setTimeout(() => alert(`${p1.health <= 0 ? 'P2' : 'P1'} WINS!`), 100);
      document.getElementById('game').classList.add('hidden');
      document.getElementById('setup').classList.remove('hidden');
      return;
    }
    animationId = requestAnimationFrame(animate);
  }
  animate();
}

// ---------- 4. Controls ----------
const keys = {};
window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup',   e => keys[e.key.toLowerCase()] = false);

function handleInput() {
  if (!p1 || p1.health <= 0) return;

  // P1 controls: A/D = left/right, W = jump, S = punch
  if (keys['a']) p1.x -= 5;
  if (keys['d']) p1.x += 5;
  if (keys['w'] && p1.y + p1.height >= arena.height - 50) p1.velocity = -18;
  if (keys['s']) p1.attack(p2);

  // P2 human controls (if present): Arrow keys + Enter
  if (p2 && !p2.isAI) {
    if (keys['arrowleft']) p2.x -= 5;
    if (keys['arrowright']) p2.x += 5;
    if (keys['arrowup'] && p2.y + p2.height >= arena.height - 50) p2.velocity = -18;
    if (keys['enter']) p2.attack(p1);
  }

  // keep fighters inside arena
  p1.x = Math.max(0, Math.min(p1.x, arena.width - p1.width));
  if (p2) p2.x = Math.max(0, Math.min(p2.x, arena.width - p2.width));
}

// ---------- 5. UI wiring ----------
document.getElementById('start').addEventListener('click', async () => {
  const p1File = document.getElementById('p1-upload').files[0];
  const p2File = document.getElementById('p2-upload').files[0];

  const p1Canvas = document.getElementById('p1-canvas');
  const p2Canvas = document.getElementById('p2-canvas');

  const p1Url = await loadImage(p1File, p1Canvas) || 'default-p1.png';
  const p2Url = await loadImage(p2File, p2Canvas);

  document.getElementById('setup').classList.add('hidden');
  document.getElementById('game').classList.remove('hidden');

  initGame(p1Url, p2Url);
  setInterval(handleInput, 1000/60);
});

// Optional fallback sprites (base64 tiny images)
const defaultP1 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
document.getElementById('p1-canvas').src = defaultP1;
