// Sprite loading and caching system
// Loads PNG sprites from public/sprites/ directory

export interface LoadedSprite {
  image: HTMLImageElement;
  loaded: boolean;
  width: number;
  height: number;
}

class SpriteLoader {
  private cache: Map<string, LoadedSprite> = new Map();
  private loadPromises: Map<string, Promise<HTMLImageElement>> = new Map();

  // Load a single sprite
  async load(path: string): Promise<HTMLImageElement> {
    // Return cached image if available
    const cached = this.cache.get(path);
    if (cached?.loaded) {
      return cached.image;
    }

    // Return existing promise if already loading
    const existingPromise = this.loadPromises.get(path);
    if (existingPromise) {
      return existingPromise;
    }

    // Create new load promise
    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.cache.set(path, {
          image: img,
          loaded: true,
          width: img.width,
          height: img.height,
        });
        this.loadPromises.delete(path);
        resolve(img);
      };
      img.onerror = () => {
        console.warn(`Failed to load sprite: ${path}`);
        this.loadPromises.delete(path);
        reject(new Error(`Failed to load: ${path}`));
      };
      img.src = path;
    });

    this.loadPromises.set(path, promise);
    return promise;
  }

  // Get sprite synchronously (returns undefined if not loaded)
  get(path: string): HTMLImageElement | undefined {
    const cached = this.cache.get(path);
    return cached?.loaded ? cached.image : undefined;
  }

  // Check if sprite is loaded
  isLoaded(path: string): boolean {
    return this.cache.get(path)?.loaded ?? false;
  }

  // Preload all game sprites
  async preloadAll(): Promise<void> {
    const sprites = [
      // Characters
      '/sprites/characters/ignis.png',
      '/sprites/characters/gleisha.png',
      '/sprites/characters/lumen.png',
      '/sprites/characters/umbra.png',
      '/sprites/characters/nektra.png',
      '/sprites/characters/runika.png',
      '/sprites/characters/vitalis.png',
      '/sprites/characters/archon.png',

      // Mobs (actual files)
      '/sprites/mobs/bat.png',
      '/sprites/mobs/skeleton.png',
      '/sprites/mobs/ghost.png',
      '/sprites/mobs/zombie.png',
      '/sprites/mobs/spider.png',
      '/sprites/mobs/golem.png',
      '/sprites/mobs/dark_mage.png',
      '/sprites/mobs/necromorph.png',

      // Tiles (actual file names)
      '/sprites/tiles/floor_stone_1.png',
      '/sprites/tiles/floor_stone_2.png',
      '/sprites/tiles/floor_stone_3.png',
      '/sprites/tiles/floor_stone_4.png',
      '/sprites/tiles/floor_stone_wet.png',
      '/sprites/tiles/floor_stone_moss.png',

      // Decorations (actual file names)
      '/sprites/decorations/barrel.png',
      '/sprites/decorations/barrel_broken.png',
      '/sprites/decorations/barrel_cobweb.png',
      '/sprites/decorations/column.png',
      '/sprites/decorations/coffin.png',
      '/sprites/decorations/table.png',
      '/sprites/decorations/skull.png',
      '/sprites/decorations/torch_1.png',
      '/sprites/decorations/torch_2.png',
      '/sprites/decorations/torch_3.png',
      '/sprites/decorations/torch_4.png',
      '/sprites/decorations/cracks_1.png',
      '/sprites/decorations/cracks_2.png',
      '/sprites/decorations/cracks_3.png',
      '/sprites/decorations/puddle_water.png',
      '/sprites/decorations/puddle_poison.png',
      '/sprites/decorations/moss_1.png',
      '/sprites/decorations/moss_2.png',
      '/sprites/decorations/cobweb.png',

      // Effects (actual files)
      '/sprites/effects/xp_gem.png',
      '/sprites/effects/gold_gem.png',
      '/sprites/effects/hp_orb.png',
      '/sprites/effects/fire_trail_1.png',
      '/sprites/effects/fire_trail_2.png',
      '/sprites/effects/fire_trail_3.png',
      '/sprites/effects/ice_aura.png',
      '/sprites/effects/rune_flash.png',

      // UI Icons
      '/sprites/ui/icon_hp.png',
      '/sprites/ui/icon_damage.png',
      '/sprites/ui/icon_speed.png',
      '/sprites/ui/icon_gold.png',
      '/sprites/ui/icon_kills.png',
      '/sprites/ui/icon_time.png',
      '/sprites/ui/icon_wave.png',
      '/sprites/ui/icon_pickup.png',
      '/sprites/ui/icon_regen.png',
      '/sprites/ui/icon_projectile.png',
      '/sprites/ui/icon_magic_wand.png',
      '/sprites/ui/icon_fireball.png',
      '/sprites/ui/icon_lightning.png',
      '/sprites/ui/icon_knife.png',
      '/sprites/ui/icon_holy_water.png',
      '/sprites/ui/icon_bone_shield.png',
    ];

    const results = await Promise.allSettled(sprites.map(s => this.load(s)));

    const loaded = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Sprites loaded: ${loaded}/${sprites.length} (${failed} failed)`);
  }

  // Preload only essential sprites for faster initial load
  async preloadEssential(): Promise<void> {
    const essential = [
      // Characters (for selection screen)
      '/sprites/characters/ignis.png',
      '/sprites/characters/gleisha.png',
      '/sprites/characters/lumen.png',
      '/sprites/characters/umbra.png',
      '/sprites/characters/nektra.png',
      '/sprites/characters/runika.png',
      '/sprites/characters/vitalis.png',
      '/sprites/characters/archon.png',

      // Basic mobs
      '/sprites/mobs/skeleton.png',
      '/sprites/mobs/bat.png',
      '/sprites/mobs/zombie.png',
      '/sprites/mobs/ghost.png',
      '/sprites/mobs/spider.png',
      '/sprites/mobs/golem.png',
      '/sprites/mobs/dark_mage.png',

      // Basic tiles
      '/sprites/tiles/floor_stone_1.png',
      '/sprites/tiles/floor_stone_2.png',
      '/sprites/tiles/floor_stone_3.png',
      '/sprites/tiles/floor_stone_4.png',

      // Basic decorations
      '/sprites/decorations/barrel.png',
      '/sprites/decorations/column.png',
      '/sprites/decorations/coffin.png',
      '/sprites/decorations/skull.png',
      '/sprites/decorations/torch_1.png',

      // UI Icons
      '/sprites/ui/icon_hp.png',
      '/sprites/ui/icon_gold.png',
      '/sprites/ui/icon_kills.png',
      '/sprites/ui/icon_time.png',
      '/sprites/ui/icon_wave.png',

      // Effects
      '/sprites/effects/xp_gem.png',
      '/sprites/effects/gold_gem.png',
    ];

    await Promise.allSettled(essential.map(s => this.load(s)));
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    this.loadPromises.clear();
  }
}

// Singleton instance
let instance: SpriteLoader | null = null;

export function getSpriteLoader(): SpriteLoader {
  if (!instance) {
    instance = new SpriteLoader();
  }
  return instance;
}

// Enemy type to sprite mapping
export function getEnemySpritePath(type: string): string {
  const mapping: Record<string, string> = {
    basic: '/sprites/mobs/skeleton.png',
    fast: '/sprites/mobs/bat.png',
    tank: '/sprites/mobs/golem.png',
    boss: '/sprites/mobs/dark_mage.png',
  };
  return mapping[type] || '/sprites/mobs/skeleton.png';
}

// Character sprite path
export function getCharacterSpritePath(characterId: string): string {
  return `/sprites/characters/${characterId}.png`;
}

export { SpriteLoader };
