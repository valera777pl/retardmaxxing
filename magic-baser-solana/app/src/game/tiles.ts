// Tile system for dungeon floor generation
// Uses PNG tile sprites with procedural pattern generation

import { getSpriteLoader } from './spriteLoader';

export const TILE_SIZE = 32;

export type TileType = 'stone_1' | 'stone_2' | 'stone_3' | 'stone_4' | 'stone_wet' | 'stone_moss';

// Tile weights for procedural generation
const TILE_WEIGHTS: Record<TileType, number> = {
  stone_1: 30,
  stone_2: 30,
  stone_3: 20,
  stone_4: 15,
  stone_wet: 3,
  stone_moss: 2,
};

// Get random tile type based on weights
export function getRandomTileType(): TileType {
  const totalWeight = Object.values(TILE_WEIGHTS).reduce((a, b) => a + b, 0);
  let random = Math.random() * totalWeight;

  for (const [type, weight] of Object.entries(TILE_WEIGHTS)) {
    random -= weight;
    if (random <= 0) {
      return type as TileType;
    }
  }

  return 'stone_1';
}

// Get tile sprite path
export function getTileSpritePath(type: TileType): string {
  // Map tile types to actual file names
  const fileNames: Record<TileType, string> = {
    stone_1: 'floor_stone_1',
    stone_2: 'floor_stone_2',
    stone_3: 'floor_stone_3',
    stone_4: 'floor_stone_4',
    stone_wet: 'floor_stone_wet',
    stone_moss: 'floor_stone_moss',
  };
  return `/sprites/tiles/${fileNames[type]}.png`;
}

// Generate a tile pattern for a chunk (16x16 tiles)
export function generateTilePattern(chunkX: number, chunkY: number, size: number = 16): TileType[][] {
  // Use chunk coordinates as seed for consistent regeneration
  const seed = chunkX * 10000 + chunkY;
  const random = seededRandom(seed);

  const tiles: TileType[][] = [];

  for (let y = 0; y < size; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < size; x++) {
      row.push(getWeightedTile(random));
    }
    tiles.push(row);
  }

  // Add clusters of special tiles for visual interest
  addTileClusters(tiles, random, 'stone_wet', 2, 3);
  addTileClusters(tiles, random, 'stone_moss', 1, 2);

  return tiles;
}

// Seeded random number generator for consistent chunk generation
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// Get tile based on weights with seeded random
function getWeightedTile(random: () => number): TileType {
  const totalWeight = Object.values(TILE_WEIGHTS).reduce((a, b) => a + b, 0);
  let r = random() * totalWeight;

  for (const [type, weight] of Object.entries(TILE_WEIGHTS)) {
    r -= weight;
    if (r <= 0) {
      return type as TileType;
    }
  }

  return 'stone_1';
}

// Add clusters of special tiles
function addTileClusters(
  tiles: TileType[][],
  random: () => number,
  type: TileType,
  minClusters: number,
  maxClusters: number
): void {
  const clusterCount = Math.floor(random() * (maxClusters - minClusters + 1)) + minClusters;

  for (let i = 0; i < clusterCount; i++) {
    const cx = Math.floor(random() * tiles[0].length);
    const cy = Math.floor(random() * tiles.length);
    const size = Math.floor(random() * 3) + 2;

    for (let dy = -size; dy <= size; dy++) {
      for (let dx = -size; dx <= size; dx++) {
        const x = cx + dx;
        const y = cy + dy;

        if (x >= 0 && x < tiles[0].length && y >= 0 && y < tiles.length) {
          // Distance-based probability for cluster shape
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= size && random() < 0.7) {
            tiles[y][x] = type;
          }
        }
      }
    }
  }
}

// Render tiles to an offscreen canvas for chunk caching
export function renderTilesToCanvas(
  tiles: TileType[][],
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
): void {
  const loader = getSpriteLoader();

  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tileType = tiles[y][x];
      const sprite = loader.get(getTileSpritePath(tileType));

      if (sprite) {
        ctx.drawImage(sprite, x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      } else {
        // Fallback: draw colored rectangle
        ctx.fillStyle = getTileFallbackColor(tileType);
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

        // Add slight border for tile definition
        ctx.strokeStyle = 'rgba(0,0,0,0.2)';
        ctx.strokeRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

// Fallback colors for when sprites aren't loaded
function getTileFallbackColor(type: TileType): string {
  switch (type) {
    case 'stone_1': return '#3a3a4a';
    case 'stone_2': return '#3e3e4e';
    case 'stone_3': return '#363646';
    case 'stone_4': return '#424252';
    case 'stone_wet': return '#2a3a4a';
    case 'stone_moss': return '#3a4a3a';
    default: return '#3a3a4a';
  }
}
