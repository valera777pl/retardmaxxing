// Chunk-based infinite map system
// Manages 16x16 tile chunks around the player

import { TileType, TILE_SIZE, generateTilePattern, renderTilesToCanvas } from './tiles';
import { Decoration, generateChunkDecorations, renderDecoration, checkDecorationCollision, damageDecoration, DecorationDamageResult } from './decorations';

export const CHUNK_SIZE = 16;  // 16x16 tiles per chunk
export const CHUNK_PIXEL_SIZE = CHUNK_SIZE * TILE_SIZE;  // 512 pixels

export interface Chunk {
  x: number;  // Chunk coordinates (not pixel)
  y: number;
  tiles: TileType[][];
  decorations: Decoration[];
  offscreenCanvas: HTMLCanvasElement | null;
  rendered: boolean;
}

export class ChunkManager {
  private chunks: Map<string, Chunk> = new Map();
  private renderDistance: number = 2;  // Chunks in each direction to keep loaded

  constructor() {
    // Initialize with center chunk
    this.getOrCreateChunk(0, 0);
  }

  // Get chunk key for map
  private getChunkKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  // Get chunk at coordinates, creating if needed
  getOrCreateChunk(chunkX: number, chunkY: number): Chunk {
    const key = this.getChunkKey(chunkX, chunkY);
    let chunk = this.chunks.get(key);

    if (!chunk) {
      chunk = this.generateChunk(chunkX, chunkY);
      this.chunks.set(key, chunk);
    }

    return chunk;
  }

  // Generate a new chunk
  private generateChunk(chunkX: number, chunkY: number): Chunk {
    const tiles = generateTilePattern(chunkX, chunkY, CHUNK_SIZE);
    const decorations = generateChunkDecorations(chunkX, chunkY, CHUNK_SIZE, TILE_SIZE);

    return {
      x: chunkX,
      y: chunkY,
      tiles,
      decorations,
      offscreenCanvas: null,
      rendered: false,
    };
  }

  // Render chunk tiles to offscreen canvas for performance
  renderChunkToCanvas(chunk: Chunk): void {
    if (chunk.rendered && chunk.offscreenCanvas) return;

    // Create offscreen canvas
    const canvas = document.createElement('canvas');
    canvas.width = CHUNK_PIXEL_SIZE;
    canvas.height = CHUNK_PIXEL_SIZE;
    const ctx = canvas.getContext('2d')!;

    // Render tiles
    renderTilesToCanvas(chunk.tiles, ctx);

    chunk.offscreenCanvas = canvas;
    chunk.rendered = true;
  }

  // Update active chunks based on player position
  updateActiveChunks(playerX: number, playerY: number): void {
    const playerChunkX = Math.floor(playerX / CHUNK_PIXEL_SIZE);
    const playerChunkY = Math.floor(playerY / CHUNK_PIXEL_SIZE);

    // Generate chunks around player
    for (let dy = -this.renderDistance; dy <= this.renderDistance; dy++) {
      for (let dx = -this.renderDistance; dx <= this.renderDistance; dx++) {
        const chunk = this.getOrCreateChunk(playerChunkX + dx, playerChunkY + dy);
        // Pre-render chunk
        if (!chunk.rendered) {
          this.renderChunkToCanvas(chunk);
        }
      }
    }

    // Clean up distant chunks (keep memory reasonable)
    const maxDistance = this.renderDistance + 2;
    const toRemove: string[] = [];

    for (const [key, chunk] of this.chunks) {
      const dx = Math.abs(chunk.x - playerChunkX);
      const dy = Math.abs(chunk.y - playerChunkY);
      if (dx > maxDistance || dy > maxDistance) {
        toRemove.push(key);
      }
    }

    for (const key of toRemove) {
      this.chunks.delete(key);
    }
  }

  // Get visible chunks for rendering
  getVisibleChunks(
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ): Chunk[] {
    const startChunkX = Math.floor(cameraX / CHUNK_PIXEL_SIZE);
    const startChunkY = Math.floor(cameraY / CHUNK_PIXEL_SIZE);
    const endChunkX = Math.floor((cameraX + viewportWidth) / CHUNK_PIXEL_SIZE);
    const endChunkY = Math.floor((cameraY + viewportHeight) / CHUNK_PIXEL_SIZE);

    const visible: Chunk[] = [];

    for (let cy = startChunkY; cy <= endChunkY; cy++) {
      for (let cx = startChunkX; cx <= endChunkX; cx++) {
        const chunk = this.getOrCreateChunk(cx, cy);
        if (!chunk.rendered) {
          this.renderChunkToCanvas(chunk);
        }
        visible.push(chunk);
      }
    }

    return visible;
  }

  // Render all visible chunks
  render(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    const visibleChunks = this.getVisibleChunks(cameraX, cameraY, viewportWidth, viewportHeight);

    // Render chunk backgrounds
    for (const chunk of visibleChunks) {
      if (chunk.offscreenCanvas) {
        const screenX = chunk.x * CHUNK_PIXEL_SIZE - cameraX;
        const screenY = chunk.y * CHUNK_PIXEL_SIZE - cameraY;
        ctx.drawImage(chunk.offscreenCanvas, screenX, screenY);
      }
    }
  }

  // Render all decorations in visible chunks
  renderDecorations(
    ctx: CanvasRenderingContext2D,
    cameraX: number,
    cameraY: number,
    viewportWidth: number,
    viewportHeight: number
  ): void {
    const visibleChunks = this.getVisibleChunks(cameraX, cameraY, viewportWidth, viewportHeight);

    // Collect and sort decorations by Y for proper depth ordering
    const allDecorations: Decoration[] = [];
    for (const chunk of visibleChunks) {
      allDecorations.push(...chunk.decorations.filter(d => !d.destroyed || d.type !== 'crack'));
    }

    // Sort by Y position for depth
    allDecorations.sort((a, b) => a.y - b.y);

    // Render
    for (const decoration of allDecorations) {
      renderDecoration(ctx, decoration, cameraX, cameraY);
    }
  }

  // Get all decorations with collision in area
  getDecorationCollisions(
    x: number,
    y: number,
    radius: number
  ): Decoration[] {
    const chunkX = Math.floor(x / CHUNK_PIXEL_SIZE);
    const chunkY = Math.floor(y / CHUNK_PIXEL_SIZE);

    const decorations: Decoration[] = [];

    // Check current and adjacent chunks
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this.chunks.get(this.getChunkKey(chunkX + dx, chunkY + dy));
        if (chunk) {
          for (const decoration of chunk.decorations) {
            if (checkDecorationCollision(x, y, radius, decoration)) {
              decorations.push(decoration);
            }
          }
        }
      }
    }

    return decorations;
  }

  // Damage decoration and return result
  damageDecorationAt(x: number, y: number, radius: number, damage: number): DecorationDamageResult[] {
    const collisions = this.getDecorationCollisions(x, y, radius);
    const results: DecorationDamageResult[] = [];

    for (const decoration of collisions) {
      const result = damageDecoration(decoration, damage);
      if (result.destroyed || result.goldDropped > 0) {
        results.push(result);
      }
    }

    return results;
  }

  // Check if position collides with any solid decoration
  hasCollision(x: number, y: number, radius: number): boolean {
    return this.getDecorationCollisions(x, y, radius).length > 0;
  }

  // Get nearest non-colliding position
  resolveCollision(
    x: number,
    y: number,
    radius: number,
    prevX: number,
    prevY: number
  ): { x: number; y: number } {
    const collisions = this.getDecorationCollisions(x, y, radius);

    if (collisions.length === 0) {
      return { x, y };
    }

    // Simple resolution: push out of collision
    let newX = x;
    let newY = y;

    for (const decoration of collisions) {
      const dx = x - decoration.x;
      const dy = y - decoration.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0) {
        const overlap = radius + Math.max(decoration.width, decoration.height) / 2 - dist;
        if (overlap > 0) {
          newX += (dx / dist) * overlap;
          newY += (dy / dist) * overlap;
        }
      }
    }

    // If still colliding, use previous position
    if (this.hasCollision(newX, newY, radius)) {
      return { x: prevX, y: prevY };
    }

    return { x: newX, y: newY };
  }

  // Reset all chunks
  reset(): void {
    this.chunks.clear();
    this.getOrCreateChunk(0, 0);
  }
}
