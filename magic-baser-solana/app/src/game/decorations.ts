// Decoration system with collisions and interactions
// Manages barrels, columns, coffins, and other dungeon objects

import { getSpriteLoader } from './spriteLoader';

export type DecorationType =
  | 'barrel'
  | 'column'
  | 'coffin'
  | 'table'
  | 'crate'
  | 'bones'
  | 'skull'
  | 'torch_wall'
  | 'torch_stand'
  | 'crack'
  | 'puddle'
  | 'moss_patch'
  | 'cobweb';

export interface Decoration {
  id: number;
  x: number;
  y: number;
  type: DecorationType;
  variant: number;        // For types with multiple sprites
  hp: number;
  maxHp: number;
  destroyed: boolean;
  hasCollision: boolean;  // Whether player/enemies collide with it
  width: number;
  height: number;
  dropGold: number;       // Gold drop on destruction
  dropHp: number;         // Chance to drop HP (0-100)
  spawnEnemy: boolean;    // Can spawn enemy on destruction (coffins)
}

// Decoration configuration
interface DecorationConfig {
  width: number;
  height: number;
  hasCollision: boolean;
  destructible: boolean;
  hp: number;
  dropGold: [number, number];  // [min, max]
  dropHpChance: number;        // 0-100
  spawnEnemyChance: number;    // 0-100
  variants: number;
  spawnWeight: number;         // Weight for random spawning
}

const DECORATION_CONFIGS: Record<DecorationType, DecorationConfig> = {
  barrel: {
    width: 32,
    height: 32,
    hasCollision: true,
    destructible: true,
    hp: 20,
    dropGold: [5, 15],
    dropHpChance: 15,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 25,
  },
  column: {
    width: 32,
    height: 64,
    hasCollision: true,
    destructible: false,
    hp: 9999,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 2,
    spawnWeight: 15,
  },
  coffin: {
    width: 32,
    height: 48,
    hasCollision: true,
    destructible: true,
    hp: 30,
    dropGold: [10, 25],
    dropHpChance: 20,
    spawnEnemyChance: 30,
    variants: 1,
    spawnWeight: 12,
  },
  table: {
    width: 48,
    height: 32,
    hasCollision: true,
    destructible: true,
    hp: 25,
    dropGold: [3, 10],
    dropHpChance: 10,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 8,
  },
  crate: {
    width: 32,
    height: 32,
    hasCollision: true,
    destructible: true,
    hp: 15,
    dropGold: [8, 20],
    dropHpChance: 25,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 20,
  },
  bones: {
    width: 32,
    height: 24,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 2,
    spawnWeight: 15,
  },
  skull: {
    width: 24,
    height: 24,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 12,
  },
  torch_wall: {
    width: 24,
    height: 32,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 10,
  },
  torch_stand: {
    width: 24,
    height: 40,
    hasCollision: true,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 8,
  },
  crack: {
    width: 32,
    height: 32,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 2,
    spawnWeight: 10,
  },
  puddle: {
    width: 40,
    height: 32,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 8,
  },
  moss_patch: {
    width: 32,
    height: 32,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 10,
  },
  cobweb: {
    width: 32,
    height: 32,
    hasCollision: false,
    destructible: false,
    hp: 0,
    dropGold: [0, 0],
    dropHpChance: 0,
    spawnEnemyChance: 0,
    variants: 1,
    spawnWeight: 12,
  },
};

let nextDecorationId = 1;

// Create a decoration
export function createDecoration(type: DecorationType, x: number, y: number): Decoration {
  const config = DECORATION_CONFIGS[type];
  const variant = Math.floor(Math.random() * config.variants);

  return {
    id: nextDecorationId++,
    x,
    y,
    type,
    variant,
    hp: config.hp,
    maxHp: config.hp,
    destroyed: false,
    hasCollision: config.hasCollision,
    width: config.width,
    height: config.height,
    dropGold: Math.floor(Math.random() * (config.dropGold[1] - config.dropGold[0] + 1)) + config.dropGold[0],
    dropHp: Math.random() * 100 < config.dropHpChance ? 1 : 0,
    spawnEnemy: Math.random() * 100 < config.spawnEnemyChance,
  };
}

// Get random decoration type based on weights
export function getRandomDecorationType(): DecorationType {
  const types = Object.entries(DECORATION_CONFIGS);
  const totalWeight = types.reduce((sum, [, config]) => sum + config.spawnWeight, 0);

  let random = Math.random() * totalWeight;
  for (const [type, config] of types) {
    random -= config.spawnWeight;
    if (random <= 0) {
      return type as DecorationType;
    }
  }

  return 'barrel';
}

// Generate decorations for a chunk
export function generateChunkDecorations(
  chunkX: number,
  chunkY: number,
  chunkSize: number,
  tileSize: number
): Decoration[] {
  const decorations: Decoration[] = [];
  const chunkPixelSize = chunkSize * tileSize;

  // Seeded random for consistent decoration placement
  const seed = chunkX * 10000 + chunkY + 7777;
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  // Number of decorations (10-25 per chunk for denser dungeons)
  const count = Math.floor(random() * 16) + 10;

  for (let i = 0; i < count; i++) {
    const type = getRandomDecorationTypeSeeded(random);
    const config = DECORATION_CONFIGS[type];

    // Position within chunk (avoiding edges)
    const x = chunkX * chunkPixelSize + random() * (chunkPixelSize - config.width * 2) + config.width;
    const y = chunkY * chunkPixelSize + random() * (chunkPixelSize - config.height * 2) + config.height;

    // Check if position overlaps with existing decorations
    const overlaps = decorations.some(d => {
      const dx = Math.abs(d.x - x);
      const dy = Math.abs(d.y - y);
      return dx < (d.width + config.width) / 2 + 16 && dy < (d.height + config.height) / 2 + 16;
    });

    if (!overlaps) {
      const decoration = createDecoration(type, x, y);
      decoration.variant = Math.floor(random() * config.variants);
      decorations.push(decoration);
    }
  }

  return decorations;
}

function getRandomDecorationTypeSeeded(random: () => number): DecorationType {
  const types = Object.entries(DECORATION_CONFIGS);
  const totalWeight = types.reduce((sum, [, config]) => sum + config.spawnWeight, 0);

  let r = random() * totalWeight;
  for (const [type, config] of types) {
    r -= config.spawnWeight;
    if (r <= 0) {
      return type as DecorationType;
    }
  }

  return 'barrel';
}

// Get sprite path for decoration
export function getDecorationSpritePath(decoration: Decoration): string {
  const { type, variant, destroyed } = decoration;

  // Handle destroyed variants
  if (destroyed) {
    switch (type) {
      case 'barrel': return '/sprites/decorations/barrel_broken.png';
      case 'crate': return '/sprites/decorations/barrel_broken.png'; // Use barrel_broken as fallback
      case 'coffin': return '/sprites/decorations/coffin.png';
      case 'column': return '/sprites/decorations/column.png';
    }
  }

  // Map decoration types to actual file names
  switch (type) {
    case 'barrel': return '/sprites/decorations/barrel.png';
    case 'column': return '/sprites/decorations/column.png';
    case 'coffin': return '/sprites/decorations/coffin.png';
    case 'table': return '/sprites/decorations/table.png';
    case 'crate': return '/sprites/decorations/barrel.png'; // Use barrel as fallback
    case 'bones': return '/sprites/decorations/skull.png';
    case 'skull': return '/sprites/decorations/skull.png';
    case 'torch_wall': return `/sprites/decorations/torch_${(variant % 4) + 1}.png`;
    case 'torch_stand': return `/sprites/decorations/torch_${(variant % 4) + 1}.png`;
    case 'crack': return `/sprites/decorations/cracks_${(variant % 3) + 1}.png`;
    case 'puddle': return '/sprites/decorations/puddle_water.png';
    case 'moss_patch': return `/sprites/decorations/moss_${(variant % 2) + 1}.png`;
    case 'cobweb': return '/sprites/decorations/cobweb.png';
    default: return '/sprites/decorations/barrel.png';
  }
}

// Render decoration
export function renderDecoration(
  ctx: CanvasRenderingContext2D,
  decoration: Decoration,
  cameraX: number,
  cameraY: number
): void {
  const loader = getSpriteLoader();
  const sprite = loader.get(getDecorationSpritePath(decoration));

  const screenX = decoration.x - cameraX - decoration.width / 2;
  const screenY = decoration.y - cameraY - decoration.height / 2;

  if (sprite) {
    ctx.drawImage(sprite, screenX, screenY, decoration.width, decoration.height);
  } else {
    // Fallback rendering
    ctx.fillStyle = getDecorationFallbackColor(decoration.type, decoration.destroyed);
    ctx.fillRect(screenX, screenY, decoration.width, decoration.height);
  }

  // Draw HP bar for destructible decorations
  if (!decoration.destroyed && decoration.maxHp > 0 && decoration.hp < decoration.maxHp) {
    const barWidth = decoration.width;
    const barHeight = 4;
    const barX = screenX;
    const barY = screenY - 8;
    const hpPercent = decoration.hp / decoration.maxHp;

    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = '#ff8844';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
  }
}

function getDecorationFallbackColor(type: DecorationType, destroyed: boolean): string {
  if (destroyed) return '#4a3a2a';

  switch (type) {
    case 'barrel': return '#8B4513';
    case 'column': return '#696969';
    case 'coffin': return '#4a3a2a';
    case 'table': return '#6b4423';
    case 'crate': return '#8B7355';
    case 'bones': return '#f5f5dc';
    case 'skull': return '#fffaf0';
    case 'torch_wall':
    case 'torch_stand': return '#ff6600';
    case 'crack': return '#2a2a2a';
    case 'puddle': return '#2a4a6a';
    case 'moss_patch': return '#3a5a3a';
    case 'cobweb': return '#dcdcdc';
    default: return '#4a4a4a';
  }
}

// Check collision with decoration
export function checkDecorationCollision(
  x: number,
  y: number,
  radius: number,
  decoration: Decoration
): boolean {
  if (!decoration.hasCollision || decoration.destroyed) return false;

  // Simple AABB collision with circle
  const closestX = Math.max(decoration.x - decoration.width / 2, Math.min(x, decoration.x + decoration.width / 2));
  const closestY = Math.max(decoration.y - decoration.height / 2, Math.min(y, decoration.y + decoration.height / 2));

  const dx = x - closestX;
  const dy = y - closestY;

  return (dx * dx + dy * dy) < (radius * radius);
}

// Damage decoration
export interface DecorationDamageResult {
  destroyed: boolean;
  goldDropped: number;
  hpDropped: boolean;
  spawnEnemy: boolean;
}

export function damageDecoration(decoration: Decoration, damage: number): DecorationDamageResult {
  if (decoration.destroyed || decoration.maxHp === 0) {
    return { destroyed: false, goldDropped: 0, hpDropped: false, spawnEnemy: false };
  }

  decoration.hp -= damage;

  if (decoration.hp <= 0) {
    decoration.destroyed = true;
    decoration.hasCollision = false;

    return {
      destroyed: true,
      goldDropped: decoration.dropGold,
      hpDropped: decoration.dropHp > 0,
      spawnEnemy: decoration.spawnEnemy,
    };
  }

  return { destroyed: false, goldDropped: 0, hpDropped: false, spawnEnemy: false };
}
