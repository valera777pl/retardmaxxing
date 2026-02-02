// Weapon system for Magic Baser

export type WeaponType = 'magic_wand' | 'fireball' | 'lightning' | 'garlic' | 'knife' | 'bible';

export interface Weapon {
  type: WeaponType;
  name: string;
  description: string;
  level: number;
  maxLevel: number;
  damage: number;
  cooldown: number; // ms
  projectileSpeed: number;
  projectileCount: number;
  range: number;
  pierce: number; // how many enemies can hit
  area: number; // area of effect multiplier
}

export interface WeaponUpgrade {
  level: number;
  damage: number;
  cooldown: number;
  projectileCount: number;
  pierce: number;
  area: number;
  description: string;
}

// Base weapon definitions
export const WEAPONS: Record<WeaponType, Omit<Weapon, 'level'>> = {
  magic_wand: {
    type: 'magic_wand',
    name: 'Magic Wand',
    description: 'Shoots at nearest enemy',
    maxLevel: 8,
    damage: 10,
    cooldown: 400,
    projectileSpeed: 350,
    projectileCount: 1,
    range: 400,
    pierce: 1,
    area: 1,
  },
  fireball: {
    type: 'fireball',
    name: 'Fireball',
    description: 'Explosive magic',
    maxLevel: 8,
    damage: 20,
    cooldown: 1500,
    projectileSpeed: 200,
    projectileCount: 1,
    range: 500,
    pierce: 999,
    area: 1.5,
  },
  lightning: {
    type: 'lightning',
    name: 'Lightning Ring',
    description: 'Strikes random enemies',
    maxLevel: 8,
    damage: 15,
    cooldown: 800,
    projectileSpeed: 999,
    projectileCount: 1,
    range: 300,
    pierce: 1,
    area: 1,
  },
  garlic: {
    type: 'garlic',
    name: 'Garlic',
    description: 'Damages nearby enemies',
    maxLevel: 8,
    damage: 5,
    cooldown: 100,
    projectileSpeed: 0,
    projectileCount: 1,
    range: 60,
    pierce: 999,
    area: 1,
  },
  knife: {
    type: 'knife',
    name: 'Knife',
    description: 'Fires in move direction',
    maxLevel: 8,
    damage: 8,
    cooldown: 300,
    projectileSpeed: 500,
    projectileCount: 1,
    range: 600,
    pierce: 2,
    area: 1,
  },
  bible: {
    type: 'bible',
    name: 'King Bible',
    description: 'Orbits around you',
    maxLevel: 8,
    damage: 12,
    cooldown: 50,
    projectileSpeed: 200,
    projectileCount: 1,
    range: 80,
    pierce: 999,
    area: 1,
  },
};

// Upgrade paths for each weapon
export const WEAPON_UPGRADES: Record<WeaponType, WeaponUpgrade[]> = {
  magic_wand: [
    { level: 1, damage: 10, cooldown: 400, projectileCount: 1, pierce: 1, area: 1, description: 'Base' },
    { level: 2, damage: 15, cooldown: 380, projectileCount: 1, pierce: 1, area: 1, description: '+5 damage' },
    { level: 3, damage: 15, cooldown: 350, projectileCount: 2, pierce: 1, area: 1, description: '+1 projectile' },
    { level: 4, damage: 20, cooldown: 350, projectileCount: 2, pierce: 1, area: 1, description: '+5 damage' },
    { level: 5, damage: 20, cooldown: 300, projectileCount: 2, pierce: 2, area: 1, description: '+1 pierce' },
    { level: 6, damage: 25, cooldown: 300, projectileCount: 3, pierce: 2, area: 1, description: '+1 projectile' },
    { level: 7, damage: 30, cooldown: 280, projectileCount: 3, pierce: 2, area: 1.2, description: '+Area' },
    { level: 8, damage: 35, cooldown: 250, projectileCount: 4, pierce: 3, area: 1.2, description: 'MAX' },
  ],
  fireball: [
    { level: 1, damage: 20, cooldown: 1500, projectileCount: 1, pierce: 999, area: 1.5, description: 'Base' },
    { level: 2, damage: 30, cooldown: 1400, projectileCount: 1, pierce: 999, area: 1.6, description: '+10 damage' },
    { level: 3, damage: 30, cooldown: 1200, projectileCount: 2, pierce: 999, area: 1.7, description: '+1 projectile' },
    { level: 4, damage: 40, cooldown: 1200, projectileCount: 2, pierce: 999, area: 1.8, description: '+10 damage' },
    { level: 5, damage: 40, cooldown: 1000, projectileCount: 2, pierce: 999, area: 2.0, description: '+Area' },
    { level: 6, damage: 50, cooldown: 1000, projectileCount: 3, pierce: 999, area: 2.0, description: '+1 projectile' },
    { level: 7, damage: 60, cooldown: 900, projectileCount: 3, pierce: 999, area: 2.2, description: '+10 damage' },
    { level: 8, damage: 80, cooldown: 800, projectileCount: 4, pierce: 999, area: 2.5, description: 'MAX' },
  ],
  lightning: [
    { level: 1, damage: 15, cooldown: 800, projectileCount: 1, pierce: 1, area: 1, description: 'Base' },
    { level: 2, damage: 20, cooldown: 750, projectileCount: 1, pierce: 1, area: 1, description: '+5 damage' },
    { level: 3, damage: 20, cooldown: 700, projectileCount: 2, pierce: 1, area: 1, description: '+1 strike' },
    { level: 4, damage: 25, cooldown: 650, projectileCount: 2, pierce: 1, area: 1.2, description: '+Area' },
    { level: 5, damage: 30, cooldown: 600, projectileCount: 3, pierce: 1, area: 1.2, description: '+1 strike' },
    { level: 6, damage: 35, cooldown: 550, projectileCount: 3, pierce: 2, area: 1.3, description: '+1 chain' },
    { level: 7, damage: 40, cooldown: 500, projectileCount: 4, pierce: 2, area: 1.4, description: '+1 strike' },
    { level: 8, damage: 50, cooldown: 400, projectileCount: 5, pierce: 3, area: 1.5, description: 'MAX' },
  ],
  garlic: [
    { level: 1, damage: 5, cooldown: 100, projectileCount: 1, pierce: 999, area: 1, description: 'Base' },
    { level: 2, damage: 6, cooldown: 100, projectileCount: 1, pierce: 999, area: 1.1, description: '+Area' },
    { level: 3, damage: 7, cooldown: 90, projectileCount: 1, pierce: 999, area: 1.2, description: '+Damage' },
    { level: 4, damage: 8, cooldown: 90, projectileCount: 1, pierce: 999, area: 1.3, description: '+Area' },
    { level: 5, damage: 9, cooldown: 80, projectileCount: 1, pierce: 999, area: 1.4, description: '+Damage' },
    { level: 6, damage: 10, cooldown: 80, projectileCount: 1, pierce: 999, area: 1.5, description: '+Area' },
    { level: 7, damage: 12, cooldown: 70, projectileCount: 1, pierce: 999, area: 1.6, description: '+Damage' },
    { level: 8, damage: 15, cooldown: 60, projectileCount: 1, pierce: 999, area: 2.0, description: 'MAX' },
  ],
  knife: [
    { level: 1, damage: 8, cooldown: 300, projectileCount: 1, pierce: 2, area: 1, description: 'Base' },
    { level: 2, damage: 10, cooldown: 280, projectileCount: 1, pierce: 2, area: 1, description: '+Damage' },
    { level: 3, damage: 10, cooldown: 260, projectileCount: 2, pierce: 2, area: 1, description: '+1 knife' },
    { level: 4, damage: 12, cooldown: 240, projectileCount: 2, pierce: 3, area: 1, description: '+1 pierce' },
    { level: 5, damage: 14, cooldown: 220, projectileCount: 3, pierce: 3, area: 1, description: '+1 knife' },
    { level: 6, damage: 16, cooldown: 200, projectileCount: 3, pierce: 4, area: 1, description: '+1 pierce' },
    { level: 7, damage: 18, cooldown: 180, projectileCount: 4, pierce: 4, area: 1, description: '+1 knife' },
    { level: 8, damage: 22, cooldown: 150, projectileCount: 5, pierce: 5, area: 1, description: 'MAX' },
  ],
  bible: [
    { level: 1, damage: 12, cooldown: 50, projectileCount: 1, pierce: 999, area: 1, description: 'Base' },
    { level: 2, damage: 14, cooldown: 50, projectileCount: 2, pierce: 999, area: 1, description: '+1 bible' },
    { level: 3, damage: 16, cooldown: 50, projectileCount: 2, pierce: 999, area: 1.1, description: '+Damage' },
    { level: 4, damage: 18, cooldown: 50, projectileCount: 3, pierce: 999, area: 1.2, description: '+1 bible' },
    { level: 5, damage: 20, cooldown: 50, projectileCount: 3, pierce: 999, area: 1.3, description: '+Damage' },
    { level: 6, damage: 22, cooldown: 50, projectileCount: 4, pierce: 999, area: 1.4, description: '+1 bible' },
    { level: 7, damage: 25, cooldown: 50, projectileCount: 4, pierce: 999, area: 1.5, description: '+Damage' },
    { level: 8, damage: 30, cooldown: 50, projectileCount: 5, pierce: 999, area: 1.8, description: 'MAX' },
  ],
};

// Create a weapon instance
export function createWeapon(type: WeaponType, level: number = 1): Weapon {
  const base = WEAPONS[type];
  const upgrade = WEAPON_UPGRADES[type][level - 1];

  return {
    ...base,
    level,
    damage: upgrade.damage,
    cooldown: upgrade.cooldown,
    projectileCount: upgrade.projectileCount,
    pierce: upgrade.pierce,
    area: upgrade.area,
  };
}

// Get random weapons for level up choice
export function getWeaponChoices(
  currentWeapons: Weapon[],
  count: number = 3
): { weapon: WeaponType; isUpgrade: boolean }[] {
  const choices: { weapon: WeaponType; isUpgrade: boolean }[] = [];
  const allTypes = Object.keys(WEAPONS) as WeaponType[];

  // Prioritize upgrades for existing weapons
  const upgradeable = currentWeapons.filter(w => w.level < w.maxLevel);
  for (const w of upgradeable) {
    if (choices.length < count) {
      choices.push({ weapon: w.type, isUpgrade: true });
    }
  }

  // Add new weapons if needed
  const owned = new Set(currentWeapons.map(w => w.type));
  const available = allTypes.filter(t => !owned.has(t));

  while (choices.length < count && available.length > 0) {
    const idx = Math.floor(Math.random() * available.length);
    choices.push({ weapon: available[idx], isUpgrade: false });
    available.splice(idx, 1);
  }

  return choices.slice(0, count);
}
