// Enemy types and spawning system

export type EnemyType = 'basic' | 'fast' | 'tank' | 'boss';

export interface EnemyDefinition {
  type: EnemyType;
  name: string;
  baseHp: number;
  baseDamage: number;
  baseSpeed: number;
  xpValue: number;
  goldValue: number;
  size: number;
  spawnWeight: number; // Higher = more common
  minWave: number; // First wave this enemy can appear
}

// Enemy definitions
export const ENEMY_TYPES: Record<EnemyType, EnemyDefinition> = {
  basic: {
    type: 'basic',
    name: 'Slime',
    baseHp: 30,
    baseDamage: 10,
    baseSpeed: 60,
    xpValue: 10,
    goldValue: 5,
    size: 24,
    spawnWeight: 60,
    minWave: 1,
  },
  fast: {
    type: 'fast',
    name: 'Bat',
    baseHp: 15,
    baseDamage: 8,
    baseSpeed: 120,
    xpValue: 15,
    goldValue: 8,
    size: 20,
    spawnWeight: 25,
    minWave: 2,
  },
  tank: {
    type: 'tank',
    name: 'Golem',
    baseHp: 100,
    baseDamage: 25,
    baseSpeed: 35,
    xpValue: 30,
    goldValue: 20,
    size: 32,
    spawnWeight: 10,
    minWave: 3,
  },
  boss: {
    type: 'boss',
    name: 'Demon Lord',
    baseHp: 500,
    baseDamage: 50,
    baseSpeed: 45,
    xpValue: 200,
    goldValue: 100,
    size: 48,
    spawnWeight: 0, // Bosses spawn on specific waves
    minWave: 5,
  },
};

// Scale enemy stats by wave
export function getEnemyStats(type: EnemyType, wave: number) {
  const def = ENEMY_TYPES[type];
  const waveMultiplier = 1 + (wave - 1) * 0.15;

  return {
    type,
    hp: Math.floor(def.baseHp * waveMultiplier),
    maxHp: Math.floor(def.baseHp * waveMultiplier),
    damage: Math.floor(def.baseDamage * waveMultiplier),
    speed: def.baseSpeed + wave * 3,
    xpValue: Math.floor(def.xpValue * (1 + wave * 0.1)),
    goldValue: Math.floor(def.goldValue * (1 + wave * 0.1)),
    size: def.size,
  };
}

// Get which enemy type to spawn based on wave and weights
export function getRandomEnemyType(wave: number): EnemyType {
  const available = Object.values(ENEMY_TYPES).filter(
    (e) => e.minWave <= wave && e.spawnWeight > 0
  );

  const totalWeight = available.reduce((sum, e) => sum + e.spawnWeight, 0);
  let random = Math.random() * totalWeight;

  for (const enemy of available) {
    random -= enemy.spawnWeight;
    if (random <= 0) {
      return enemy.type;
    }
  }

  return 'basic';
}

// Check if boss should spawn
export function shouldSpawnBoss(wave: number, bossSpawnedThisWave: boolean): boolean {
  return wave >= 5 && wave % 5 === 0 && !bossSpawnedThisWave;
}

// Wave configuration
export interface WaveConfig {
  wave: number;
  spawnInterval: number; // ms between spawns
  maxEnemies: number;
  bossWave: boolean;
}

export function getWaveConfig(wave: number): WaveConfig {
  return {
    wave,
    spawnInterval: Math.max(300, 800 - wave * 50),
    maxEnemies: 20 + wave * 5,
    bossWave: wave >= 5 && wave % 5 === 0,
  };
}

// Enemy behavior patterns
export type BehaviorType = 'chase' | 'charge' | 'circle' | 'teleport';

export function getEnemyBehavior(type: EnemyType): BehaviorType {
  switch (type) {
    case 'fast':
      return 'charge';
    case 'boss':
      return Math.random() > 0.5 ? 'circle' : 'chase';
    default:
      return 'chase';
  }
}

// Apply behavior to enemy movement
export function applyEnemyBehavior(
  enemy: { pos: { x: number; y: number }; vel: { x: number; y: number } },
  player: { pos: { x: number; y: number } },
  behavior: BehaviorType,
  speed: number,
  gameTime: number
): void {
  const dx = player.pos.x - enemy.pos.x;
  const dy = player.pos.y - enemy.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist === 0) return;

  switch (behavior) {
    case 'chase':
      enemy.vel.x = (dx / dist) * speed;
      enemy.vel.y = (dy / dist) * speed;
      break;

    case 'charge':
      // Fast enemies charge in straight lines
      if (Math.abs(enemy.vel.x) < 1 && Math.abs(enemy.vel.y) < 1) {
        enemy.vel.x = (dx / dist) * speed * 1.5;
        enemy.vel.y = (dy / dist) * speed * 1.5;
      }
      break;

    case 'circle':
      // Circle around player
      const angle = Math.atan2(dy, dx) + Math.PI / 2;
      const circleSpeed = speed * 0.8;
      enemy.vel.x = Math.cos(angle) * circleSpeed + (dx / dist) * speed * 0.3;
      enemy.vel.y = Math.sin(angle) * circleSpeed + (dy / dist) * speed * 0.3;
      break;

    case 'teleport':
      // Occasionally teleport closer
      if (Math.random() < 0.01 && dist > 200) {
        const teleportDist = dist * 0.5;
        enemy.pos.x += (dx / dist) * teleportDist;
        enemy.pos.y += (dy / dist) * teleportDist;
      }
      enemy.vel.x = (dx / dist) * speed;
      enemy.vel.y = (dy / dist) * speed;
      break;
  }
}
