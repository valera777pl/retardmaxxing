// Procedural pixel art sprite generator
// Creates canvas-based sprites for the game

export interface SpriteSheet {
  image: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
}

// Color palettes
export const PALETTES = {
  player: ['#0f3460', '#1a5490', '#2980b9', '#5dade2'],
  enemy_basic: ['#8b0000', '#c0392b', '#e74c3c', '#ec7063'],
  enemy_fast: ['#4a235a', '#7d3c98', '#a569bd', '#d2b4de'],
  enemy_tank: ['#1c2833', '#2e4053', '#566573', '#808b96'],
  enemy_boss: ['#7d6608', '#b7950b', '#f1c40f', '#f9e79f'],
  projectile: ['#00d4ff', '#00ffff', '#88ffff', '#ffffff'],
  xp_orb: ['#006400', '#228b22', '#32cd32', '#90ee90'],
  gold_coin: ['#b8860b', '#daa520', '#ffd700', '#ffec8b'],
  explosion: ['#ff4500', '#ff6347', '#ffa500', '#ffff00'],
};

// Create a pixel art character sprite
export function createPlayerSprite(): SpriteSheet {
  const frameWidth = 32;
  const frameHeight = 32;
  const frameCount = 4; // idle animation frames

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  const colors = PALETTES.player;

  for (let frame = 0; frame < frameCount; frame++) {
    const offsetX = frame * frameWidth;
    const bobOffset = Math.sin(frame * Math.PI / 2) * 2;

    // Body
    ctx.fillStyle = colors[1];
    ctx.fillRect(offsetX + 10, 8 + bobOffset, 12, 16);

    // Head
    ctx.fillStyle = colors[2];
    ctx.fillRect(offsetX + 11, 4 + bobOffset, 10, 10);

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(offsetX + 13, 7 + bobOffset, 2, 2);
    ctx.fillRect(offsetX + 17, 7 + bobOffset, 2, 2);

    // Legs
    ctx.fillStyle = colors[0];
    const legOffset = frame % 2 === 0 ? 0 : 2;
    ctx.fillRect(offsetX + 11, 24 + bobOffset - legOffset, 4, 6);
    ctx.fillRect(offsetX + 17, 24 + bobOffset + legOffset, 4, 6);

    // Cape/cloak effect
    ctx.fillStyle = colors[3];
    ctx.fillRect(offsetX + 8, 10 + bobOffset, 3, 12);
    ctx.fillRect(offsetX + 21, 10 + bobOffset, 3, 12);
  }

  return { image: canvas, frameWidth, frameHeight, frameCount };
}

// Create enemy sprite based on type
export function createEnemySprite(type: 'basic' | 'fast' | 'tank' | 'boss'): SpriteSheet {
  const sizes = {
    basic: { w: 24, h: 24 },
    fast: { w: 20, h: 20 },
    tank: { w: 32, h: 32 },
    boss: { w: 48, h: 48 },
  };

  const { w: frameWidth, h: frameHeight } = sizes[type];
  const frameCount = 2;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  const colors = PALETTES[`enemy_${type}`];

  for (let frame = 0; frame < frameCount; frame++) {
    const offsetX = frame * frameWidth;
    const pulse = frame === 0 ? 0 : 2;

    if (type === 'basic') {
      // Slime-like enemy
      ctx.fillStyle = colors[1];
      ctx.beginPath();
      ctx.ellipse(offsetX + 12, 16, 10 - pulse, 8 + pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(offsetX + 7, 12, 3, 3);
      ctx.fillRect(offsetX + 14, 12, 3, 3);
      ctx.fillStyle = '#000000';
      ctx.fillRect(offsetX + 8, 13, 2, 2);
      ctx.fillRect(offsetX + 15, 13, 2, 2);
    } else if (type === 'fast') {
      // Bat-like enemy
      ctx.fillStyle = colors[1];
      ctx.fillRect(offsetX + 7, 8, 6, 8);

      // Wings
      const wingSpread = frame === 0 ? 0 : 3;
      ctx.fillStyle = colors[2];
      ctx.fillRect(offsetX + 1, 6 - wingSpread, 6, 4);
      ctx.fillRect(offsetX + 13, 6 - wingSpread, 6, 4);

      // Eyes
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(offsetX + 8, 9, 2, 2);
      ctx.fillRect(offsetX + 11, 9, 2, 2);
    } else if (type === 'tank') {
      // Golem-like enemy
      ctx.fillStyle = colors[0];
      ctx.fillRect(offsetX + 6, 4, 20, 24);

      ctx.fillStyle = colors[1];
      ctx.fillRect(offsetX + 8, 6, 16, 20);

      // Face
      ctx.fillStyle = colors[2];
      ctx.fillRect(offsetX + 10, 10, 4, 4);
      ctx.fillRect(offsetX + 18, 10, 4, 4);

      // Cracks
      ctx.fillStyle = colors[3];
      ctx.fillRect(offsetX + 12, 18, 8, 2);
    } else if (type === 'boss') {
      // Demon boss
      ctx.fillStyle = colors[0];
      ctx.fillRect(offsetX + 8, 8, 32, 36);

      ctx.fillStyle = colors[1];
      ctx.fillRect(offsetX + 10, 10, 28, 32);

      // Horns
      ctx.fillStyle = colors[2];
      ctx.fillRect(offsetX + 8, 2, 6, 10);
      ctx.fillRect(offsetX + 34, 2, 6, 10);

      // Eyes (glowing)
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(offsetX + 16, 18 - pulse, 6, 6);
      ctx.fillRect(offsetX + 28, 18 - pulse, 6, 6);

      // Mouth
      ctx.fillStyle = '#000000';
      ctx.fillRect(offsetX + 18, 30, 12, 4);
    }
  }

  return { image: canvas, frameWidth, frameHeight, frameCount };
}

// Create projectile sprite
export function createProjectileSprite(type: 'bullet' | 'fireball' | 'lightning'): SpriteSheet {
  const frameWidth = 16;
  const frameHeight = 16;
  const frameCount = 2;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  for (let frame = 0; frame < frameCount; frame++) {
    const offsetX = frame * frameWidth;

    if (type === 'bullet') {
      // Energy bullet
      const colors = PALETTES.projectile;
      ctx.fillStyle = colors[frame];
      ctx.beginPath();
      ctx.arc(offsetX + 8, 8, 4, 0, Math.PI * 2);
      ctx.fill();

      // Glow effect
      ctx.fillStyle = colors[3];
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.arc(offsetX + 8, 8, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (type === 'fireball') {
      const colors = PALETTES.explosion;
      ctx.fillStyle = colors[frame];
      ctx.beginPath();
      ctx.arc(offsetX + 8, 8, 5 + frame, 0, Math.PI * 2);
      ctx.fill();

      // Inner flame
      ctx.fillStyle = colors[3];
      ctx.beginPath();
      ctx.arc(offsetX + 8, 8, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === 'lightning') {
      ctx.strokeStyle = '#ffff00';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(offsetX + 8, 2);
      ctx.lineTo(offsetX + 6 + frame * 2, 8);
      ctx.lineTo(offsetX + 10 - frame * 2, 8);
      ctx.lineTo(offsetX + 8, 14);
      ctx.stroke();
    }
  }

  return { image: canvas, frameWidth, frameHeight, frameCount };
}

// Create pickup sprites
export function createPickupSprite(type: 'xp' | 'gold' | 'health'): SpriteSheet {
  const frameWidth = 16;
  const frameHeight = 16;
  const frameCount = 4;

  const canvas = document.createElement('canvas');
  canvas.width = frameWidth * frameCount;
  canvas.height = frameHeight;
  const ctx = canvas.getContext('2d')!;

  const colors = type === 'xp' ? PALETTES.xp_orb :
                 type === 'gold' ? PALETTES.gold_coin :
                 ['#ff0000', '#ff4444', '#ff8888', '#ffffff'];

  for (let frame = 0; frame < frameCount; frame++) {
    const offsetX = frame * frameWidth;
    const floatOffset = Math.sin(frame * Math.PI / 2) * 2;

    if (type === 'xp') {
      // Diamond shape
      ctx.fillStyle = colors[frame % colors.length];
      ctx.beginPath();
      ctx.moveTo(offsetX + 8, 2 + floatOffset);
      ctx.lineTo(offsetX + 14, 8 + floatOffset);
      ctx.lineTo(offsetX + 8, 14 + floatOffset);
      ctx.lineTo(offsetX + 2, 8 + floatOffset);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'gold') {
      // Coin
      ctx.fillStyle = colors[0];
      ctx.beginPath();
      ctx.ellipse(offsetX + 8, 8 + floatOffset, 6, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = colors[2];
      ctx.beginPath();
      ctx.ellipse(offsetX + 8, 8 + floatOffset, 4, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // $ symbol
      ctx.fillStyle = colors[0];
      ctx.font = '8px monospace';
      ctx.fillText('$', offsetX + 5, 11 + floatOffset);
    } else {
      // Heart
      ctx.fillStyle = colors[frame % colors.length];
      ctx.beginPath();
      ctx.moveTo(offsetX + 8, 12 + floatOffset);
      ctx.bezierCurveTo(offsetX + 2, 8, offsetX + 2, 4, offsetX + 8, 6 + floatOffset);
      ctx.bezierCurveTo(offsetX + 14, 4, offsetX + 14, 8, offsetX + 8, 12 + floatOffset);
      ctx.fill();
    }
  }

  return { image: canvas, frameWidth, frameHeight, frameCount };
}

// Particle effect types
export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export function createParticles(x: number, y: number, type: 'hit' | 'death' | 'levelup'): Particle[] {
  const particles: Particle[] = [];
  const count = type === 'death' ? 20 : type === 'levelup' ? 30 : 8;

  const colors = type === 'hit' ? PALETTES.explosion :
                 type === 'death' ? PALETTES.enemy_basic :
                 PALETTES.gold_coin;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 50 + Math.random() * 100;

    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0.5 + Math.random() * 0.5,
      maxLife: 0.5 + Math.random() * 0.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 2 + Math.random() * 4,
    });
  }

  return particles;
}

// Sprite cache for performance
export class SpriteCache {
  private static instance: SpriteCache;
  private sprites: Map<string, SpriteSheet> = new Map();

  static getInstance(): SpriteCache {
    if (!SpriteCache.instance) {
      SpriteCache.instance = new SpriteCache();
    }
    return SpriteCache.instance;
  }

  getSprite(key: string, creator: () => SpriteSheet): SpriteSheet {
    if (!this.sprites.has(key)) {
      this.sprites.set(key, creator());
    }
    return this.sprites.get(key)!;
  }

  preloadAll() {
    this.getSprite('player', createPlayerSprite);
    this.getSprite('enemy_basic', () => createEnemySprite('basic'));
    this.getSprite('enemy_fast', () => createEnemySprite('fast'));
    this.getSprite('enemy_tank', () => createEnemySprite('tank'));
    this.getSprite('enemy_boss', () => createEnemySprite('boss'));
    this.getSprite('projectile_bullet', () => createProjectileSprite('bullet'));
    this.getSprite('projectile_fireball', () => createProjectileSprite('fireball'));
    this.getSprite('projectile_lightning', () => createProjectileSprite('lightning'));
    this.getSprite('pickup_xp', () => createPickupSprite('xp'));
    this.getSprite('pickup_gold', () => createPickupSprite('gold'));
    this.getSprite('pickup_health', () => createPickupSprite('health'));
  }
}
