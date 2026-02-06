import { LocalGameState } from "@/types";
import { SpriteCache, Particle, createParticles } from "./sprites";
import { Weapon, createWeapon, WeaponType, getWeaponChoices, WEAPON_UPGRADES } from "./weapons";
import { EnemyType, getEnemyStats, getRandomEnemyType, shouldSpawnBoss, getWaveConfig, applyEnemyBehavior, getEnemyBehavior, BehaviorType } from "./enemies";
import { ChunkManager, CHUNK_PIXEL_SIZE } from "./chunks";
import { getSpriteLoader, getEnemySpritePath, getCharacterSpritePath } from "./spriteLoader";

// Game constants
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PLAYER_SIZE = 32;
const WAVE_DURATION = 30000; // 30 seconds per wave

// Entity types
interface Vector2 {
  x: number;
  y: number;
}

interface Camera {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
}

interface Player {
  pos: Vector2;
  vel: Vector2;
  lastDir: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  invulnerable: boolean;
  invulnerableUntil: number;
  weapons: Weapon[];
  animFrame: number;
  animTime: number;
  characterId: string;
}

interface Enemy {
  id: number;
  type: EnemyType;
  pos: Vector2;
  vel: Vector2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  xpValue: number;
  goldValue: number;
  size: number;
  behavior: BehaviorType;
  animFrame: number;
  animTime: number;
  hitFlash: number;
}

interface Projectile {
  id: number;
  weaponType: WeaponType;
  pos: Vector2;
  vel: Vector2;
  damage: number;
  lifetime: number;
  pierce: number;
  hitEnemies: Set<number>;
  angle: number;
  orbitDistance?: number;
}

interface XPOrb {
  id: number;
  pos: Vector2;
  value: number;
  animFrame: number;
}

interface GoldCoin {
  id: number;
  pos: Vector2;
  value: number;
  animFrame: number;
}

// Game state
interface GameEngineState {
  player: Player;
  enemies: Enemy[];
  projectiles: Projectile[];
  xpOrbs: XPOrb[];
  goldCoins: GoldCoin[];
  particles: Particle[];
  wave: number;
  waveStartTime: number;
  lastEnemySpawn: number;
  weaponCooldowns: Map<WeaponType, number>;
  nextEntityId: number;
  keys: Set<string>;
  gameTime: number;
  xp: number;
  level: number;
  gold: number;
  kills: number;
  bossSpawnedThisWave: boolean;
  showLevelUp: boolean;
  levelUpChoices: { weapon: WeaponType; isUpgrade: boolean }[];
  paused: boolean;
  camera: Camera;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameEngineState;
  private animationFrame: number | null = null;
  private lastTime: number = 0;
  private onStateUpdate: (state: Partial<LocalGameState>) => void;
  private onKill?: () => void;
  private running: boolean = false;
  private spriteCache: SpriteCache;
  private chunkManager: ChunkManager;
  private spritesLoaded: boolean = false;
  private characterId: string = 'ignis';

  constructor(
    canvas: HTMLCanvasElement,
    onStateUpdate: (state: Partial<LocalGameState>) => void,
    onKill?: () => void,
    characterId?: string
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false; // Pixel art crisp rendering
    this.onStateUpdate = onStateUpdate;
    this.onKill = onKill;
    this.characterId = characterId || 'ignis';
    this.spriteCache = SpriteCache.getInstance();
    this.spriteCache.preloadAll();
    this.chunkManager = new ChunkManager();

    // Load sprites asynchronously
    this.loadSprites();

    // Initialize state
    this.state = this.createInitialState();

    // Setup input handlers
    this.setupInputHandlers();
  }

  private async loadSprites() {
    const loader = getSpriteLoader();
    try {
      await loader.preloadEssential();
      this.spritesLoaded = true;
      console.log('Essential sprites loaded');
      // Load rest in background
      loader.preloadAll();
    } catch (e) {
      console.warn('Some sprites failed to load, using fallbacks');
      this.spritesLoaded = true;
    }
  }

  public setCharacter(characterId: string) {
    this.characterId = characterId;
    this.state.player.characterId = characterId;
  }

  private createInitialState(): GameEngineState {
    return {
      player: {
        pos: { x: CHUNK_PIXEL_SIZE / 2, y: CHUNK_PIXEL_SIZE / 2 },
        vel: { x: 0, y: 0 },
        lastDir: { x: 1, y: 0 },
        hp: 100,
        maxHp: 100,
        speed: 200,
        invulnerable: false,
        invulnerableUntil: 0,
        weapons: [createWeapon('magic_wand', 1)],
        animFrame: 0,
        animTime: 0,
        characterId: this.characterId,
      },
      enemies: [],
      projectiles: [],
      xpOrbs: [],
      goldCoins: [],
      particles: [],
      wave: 1,
      waveStartTime: Date.now(),
      lastEnemySpawn: 0,
      weaponCooldowns: new Map(),
      nextEntityId: 1,
      keys: new Set(),
      gameTime: 0,
      xp: 0,
      level: 1,
      gold: 0,
      kills: 0,
      bossSpawnedThisWave: false,
      showLevelUp: false,
      levelUpChoices: [],
      paused: false,
      camera: {
        x: CHUNK_PIXEL_SIZE / 2 - CANVAS_WIDTH / 2,
        y: CHUNK_PIXEL_SIZE / 2 - CANVAS_HEIGHT / 2,
        targetX: CHUNK_PIXEL_SIZE / 2 - CANVAS_WIDTH / 2,
        targetY: CHUNK_PIXEL_SIZE / 2 - CANVAS_HEIGHT / 2,
      },
    };
  }

  private setupInputHandlers() {
    window.addEventListener("keydown", (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
      this.state.keys.add(e.key.toLowerCase());

      if (this.state.showLevelUp && ['1', '2', '3'].includes(e.key)) {
        const idx = parseInt(e.key) - 1;
        if (idx < this.state.levelUpChoices.length) {
          this.selectLevelUpChoice(idx);
        }
      }
    });

    window.addEventListener("keyup", (e) => {
      this.state.keys.delete(e.key.toLowerCase());
    });
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    if (this.state.kills === 0 && this.state.gameTime === 0) {
      this.state = this.createInitialState();
      this.chunkManager.reset();
    }
    this.gameLoop(this.lastTime);
  }

  public resume() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  public stop() {
    this.running = false;
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  public reset() {
    this.stop();
    this.state = this.createInitialState();
    this.chunkManager.reset();
  }

  public setPlayerHp(hp: number, maxHp: number) {
    this.state.player.hp = hp;
    this.state.player.maxHp = maxHp;
  }

  private gameLoop = (currentTime: number) => {
    if (!this.running) return;

    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.state.paused && !this.state.showLevelUp) {
      this.update(deltaTime);
    }
    this.render();

    this.animationFrame = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number) {
    this.state.gameTime += dt;
    this.updateCamera(dt);
    this.chunkManager.updateActiveChunks(this.state.player.pos.x, this.state.player.pos.y);
    this.updateAnimations(dt);
    this.updatePlayer(dt);
    this.spawnEnemies();
    this.updateEnemies(dt);
    this.fireWeapons();
    this.updateProjectiles(dt);
    this.checkCollisions();
    this.collectPickups();
    this.updateParticles(dt);
    this.checkWaveProgression();
    this.checkLevelUp();
    this.syncExternalState();
  }

  private updateCamera(dt: number) {
    const { camera, player } = this.state;
    camera.targetX = player.pos.x - CANVAS_WIDTH / 2;
    camera.targetY = player.pos.y - CANVAS_HEIGHT / 2;
    const smoothing = 5;
    camera.x += (camera.targetX - camera.x) * smoothing * dt;
    camera.y += (camera.targetY - camera.y) * smoothing * dt;
  }

  private updateAnimations(dt: number) {
    this.state.player.animTime += dt;
    if (this.state.player.animTime > 0.15) {
      this.state.player.animFrame = (this.state.player.animFrame + 1) % 4;
      this.state.player.animTime = 0;
    }

    for (const enemy of this.state.enemies) {
      enemy.animTime += dt;
      if (enemy.animTime > 0.2) {
        enemy.animFrame = (enemy.animFrame + 1) % 2;
        enemy.animTime = 0;
      }
      if (enemy.hitFlash > 0) {
        enemy.hitFlash -= dt;
      }
    }

    const pickupAnimSpeed = 0.1;
    for (const orb of this.state.xpOrbs) {
      orb.animFrame = Math.floor(this.state.gameTime / pickupAnimSpeed) % 4;
    }
    for (const coin of this.state.goldCoins) {
      coin.animFrame = Math.floor(this.state.gameTime / pickupAnimSpeed) % 4;
    }
  }

  private updatePlayer(dt: number) {
    const { player, keys } = this.state;
    const prevX = player.pos.x;
    const prevY = player.pos.y;

    player.vel.x = 0;
    player.vel.y = 0;

    if (keys.has("w") || keys.has("arrowup")) player.vel.y = -1;
    if (keys.has("s") || keys.has("arrowdown")) player.vel.y = 1;
    if (keys.has("a") || keys.has("arrowleft")) player.vel.x = -1;
    if (keys.has("d") || keys.has("arrowright")) player.vel.x = 1;

    const len = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (len > 0) {
      player.vel.x /= len;
      player.vel.y /= len;
      player.lastDir = { x: player.vel.x, y: player.vel.y };
    }

    player.pos.x += player.vel.x * player.speed * dt;
    player.pos.y += player.vel.y * player.speed * dt;

    const resolved = this.chunkManager.resolveCollision(
      player.pos.x,
      player.pos.y,
      PLAYER_SIZE / 2,
      prevX,
      prevY
    );
    player.pos.x = resolved.x;
    player.pos.y = resolved.y;

    if (player.invulnerable && Date.now() > player.invulnerableUntil) {
      player.invulnerable = false;
    }
  }

  private spawnEnemies() {
    const now = Date.now();
    const config = getWaveConfig(this.state.wave);

    if (shouldSpawnBoss(this.state.wave, this.state.bossSpawnedThisWave)) {
      this.spawnEnemy('boss');
      this.state.bossSpawnedThisWave = true;
    }

    if (now - this.state.lastEnemySpawn > config.spawnInterval &&
        this.state.enemies.length < config.maxEnemies) {
      const enemyType = getRandomEnemyType(this.state.wave);
      this.spawnEnemy(enemyType);
      this.state.lastEnemySpawn = now;
    }
  }

  private spawnEnemy(type: EnemyType) {
    const { camera } = this.state;
    const stats = getEnemyStats(type, this.state.wave);
    const side = Math.floor(Math.random() * 4);
    const spawnDistance = 100;
    let x, y;

    switch (side) {
      case 0:
        x = camera.x + Math.random() * CANVAS_WIDTH;
        y = camera.y - spawnDistance;
        break;
      case 1:
        x = camera.x + CANVAS_WIDTH + spawnDistance;
        y = camera.y + Math.random() * CANVAS_HEIGHT;
        break;
      case 2:
        x = camera.x + Math.random() * CANVAS_WIDTH;
        y = camera.y + CANVAS_HEIGHT + spawnDistance;
        break;
      default:
        x = camera.x - spawnDistance;
        y = camera.y + Math.random() * CANVAS_HEIGHT;
        break;
    }

    this.state.enemies.push({
      id: this.state.nextEntityId++,
      ...stats,
      pos: { x, y },
      vel: { x: 0, y: 0 },
      behavior: getEnemyBehavior(type),
      animFrame: 0,
      animTime: 0,
      hitFlash: 0,
    });
  }

  private updateEnemies(dt: number) {
    const { player, enemies } = this.state;

    for (let i = enemies.length - 1; i >= 0; i--) {
      const enemy = enemies[i];
      applyEnemyBehavior(enemy, player, enemy.behavior, enemy.speed, this.state.gameTime);
      enemy.pos.x += enemy.vel.x * dt;
      enemy.pos.y += enemy.vel.y * dt;

      const dx = enemy.pos.x - player.pos.x;
      const dy = enemy.pos.y - player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 1500) {
        enemies.splice(i, 1);
      }
    }
  }

  private fireWeapons() {
    const now = Date.now();

    for (const weapon of this.state.player.weapons) {
      const lastFire = this.state.weaponCooldowns.get(weapon.type) || 0;
      if (now - lastFire < weapon.cooldown) continue;

      this.state.weaponCooldowns.set(weapon.type, now);

      switch (weapon.type) {
        case 'magic_wand': this.fireMagicWand(weapon); break;
        case 'fireball': this.fireFireball(weapon); break;
        case 'lightning': this.fireLightning(weapon); break;
        case 'garlic': this.applyGarlic(weapon); break;
        case 'knife': this.fireKnife(weapon); break;
        case 'bible': this.updateBible(weapon); break;
      }
    }
  }

  private fireMagicWand(weapon: Weapon) {
    const targets = this.findNearestEnemies(weapon.projectileCount);
    for (const target of targets) {
      const dx = target.pos.x - this.state.player.pos.x;
      const dy = target.pos.y - this.state.player.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 0 && dist < weapon.range) {
        this.state.projectiles.push({
          id: this.state.nextEntityId++,
          weaponType: 'magic_wand',
          pos: { ...this.state.player.pos },
          vel: { x: (dx / dist) * weapon.projectileSpeed, y: (dy / dist) * weapon.projectileSpeed },
          damage: weapon.damage,
          lifetime: 2,
          pierce: weapon.pierce,
          hitEnemies: new Set(),
          angle: 0,
        });
      }
    }
  }

  private fireFireball(weapon: Weapon) {
    for (let i = 0; i < weapon.projectileCount; i++) {
      const angle = (Math.PI * 2 * i) / weapon.projectileCount + this.state.gameTime;
      this.state.projectiles.push({
        id: this.state.nextEntityId++,
        weaponType: 'fireball',
        pos: { ...this.state.player.pos },
        vel: { x: Math.cos(angle) * weapon.projectileSpeed, y: Math.sin(angle) * weapon.projectileSpeed },
        damage: weapon.damage,
        lifetime: 3,
        pierce: weapon.pierce,
        hitEnemies: new Set(),
        angle,
      });
    }
  }

  private fireLightning(weapon: Weapon) {
    const targets = this.findNearestEnemies(weapon.projectileCount);
    for (const target of targets) {
      const dist = Math.sqrt(
        (target.pos.x - this.state.player.pos.x) ** 2 +
        (target.pos.y - this.state.player.pos.y) ** 2
      );
      if (dist < weapon.range) {
        target.hp -= weapon.damage;
        target.hitFlash = 0.2;
        this.state.particles.push(...createParticles(target.pos.x, target.pos.y, 'hit'));
      }
    }
  }

  private applyGarlic(weapon: Weapon) {
    const garlicRadius = weapon.range * weapon.area;
    for (const enemy of this.state.enemies) {
      const dist = Math.sqrt(
        (enemy.pos.x - this.state.player.pos.x) ** 2 +
        (enemy.pos.y - this.state.player.pos.y) ** 2
      );
      if (dist < garlicRadius) {
        enemy.hp -= weapon.damage;
        const dx = enemy.pos.x - this.state.player.pos.x;
        const dy = enemy.pos.y - this.state.player.pos.y;
        if (dist > 0) {
          enemy.pos.x += (dx / dist) * 10;
          enemy.pos.y += (dy / dist) * 10;
        }
      }
    }
  }

  private fireKnife(weapon: Weapon) {
    const dir = this.state.player.lastDir;
    for (let i = 0; i < weapon.projectileCount; i++) {
      const spread = (i - (weapon.projectileCount - 1) / 2) * 0.2;
      const angle = Math.atan2(dir.y, dir.x) + spread;

      this.state.projectiles.push({
        id: this.state.nextEntityId++,
        weaponType: 'knife',
        pos: { ...this.state.player.pos },
        vel: { x: Math.cos(angle) * weapon.projectileSpeed, y: Math.sin(angle) * weapon.projectileSpeed },
        damage: weapon.damage,
        lifetime: 1.5,
        pierce: weapon.pierce,
        hitEnemies: new Set(),
        angle,
      });
    }
  }

  private updateBible(weapon: Weapon) {
    const existingBibles = this.state.projectiles.filter(p => p.weaponType === 'bible');

    while (existingBibles.length < weapon.projectileCount) {
      const angle = (Math.PI * 2 * existingBibles.length) / weapon.projectileCount;
      this.state.projectiles.push({
        id: this.state.nextEntityId++,
        weaponType: 'bible',
        pos: { ...this.state.player.pos },
        vel: { x: 0, y: 0 },
        damage: weapon.damage,
        lifetime: 999,
        pierce: 999,
        hitEnemies: new Set(),
        angle,
        orbitDistance: weapon.range * weapon.area,
      });
      existingBibles.push(this.state.projectiles[this.state.projectiles.length - 1]);
    }

    for (const bible of existingBibles) {
      bible.angle += 0.05;
      const dist = bible.orbitDistance || 80;
      bible.pos.x = this.state.player.pos.x + Math.cos(bible.angle) * dist;
      bible.pos.y = this.state.player.pos.y + Math.sin(bible.angle) * dist;
    }
  }

  private findNearestEnemies(count: number): Enemy[] {
    const sorted = [...this.state.enemies].sort((a, b) => {
      const distA = (a.pos.x - this.state.player.pos.x) ** 2 + (a.pos.y - this.state.player.pos.y) ** 2;
      const distB = (b.pos.x - this.state.player.pos.x) ** 2 + (b.pos.y - this.state.player.pos.y) ** 2;
      return distA - distB;
    });
    return sorted.slice(0, count);
  }

  private updateProjectiles(dt: number) {
    const { camera } = this.state;

    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];

      if (proj.weaponType !== 'bible') {
        proj.pos.x += proj.vel.x * dt;
        proj.pos.y += proj.vel.y * dt;
      }

      proj.lifetime -= dt;

      const results = this.chunkManager.damageDecorationAt(proj.pos.x, proj.pos.y, 10, proj.damage);
      for (const result of results) {
        if (result.goldDropped > 0) {
          this.state.goldCoins.push({
            id: this.state.nextEntityId++,
            pos: { x: proj.pos.x, y: proj.pos.y },
            value: result.goldDropped,
            animFrame: 0,
          });
        }
        if (result.destroyed && proj.weaponType !== 'bible') {
          proj.pierce--;
        }
      }

      if (proj.weaponType !== 'bible') {
        const outOfBounds =
          proj.pos.x < camera.x - 100 ||
          proj.pos.x > camera.x + CANVAS_WIDTH + 100 ||
          proj.pos.y < camera.y - 100 ||
          proj.pos.y > camera.y + CANVAS_HEIGHT + 100;

        if (proj.lifetime <= 0 || outOfBounds || proj.pierce <= 0) {
          this.state.projectiles.splice(i, 1);
        }
      }
    }
  }

  private checkCollisions() {
    const { player, enemies, projectiles } = this.state;

    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        if (proj.hitEnemies.has(enemy.id)) continue;

        const dx = proj.pos.x - enemy.pos.x;
        const dy = proj.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = proj.weaponType === 'fireball' ? 30 : 15;

        if (dist < (hitRadius + enemy.size) / 2) {
          enemy.hp -= proj.damage;
          enemy.hitFlash = 0.15;
          proj.hitEnemies.add(enemy.id);

          this.state.particles.push(...createParticles(enemy.pos.x, enemy.pos.y, 'hit'));

          if (proj.hitEnemies.size >= proj.pierce && proj.weaponType !== 'bible') {
            projectiles.splice(i, 1);
          }

          if (enemy.hp <= 0) {
            this.state.particles.push(...createParticles(enemy.pos.x, enemy.pos.y, 'death'));

            this.state.xpOrbs.push({
              id: this.state.nextEntityId++,
              pos: { ...enemy.pos },
              value: enemy.xpValue,
              animFrame: 0,
            });
            this.state.goldCoins.push({
              id: this.state.nextEntityId++,
              pos: { ...enemy.pos },
              value: enemy.goldValue,
              animFrame: 0,
            });

            enemies.splice(j, 1);
            this.state.kills++;
            this.onKill?.();
          }

          break;
        }
      }
    }

    if (!player.invulnerable) {
      for (const enemy of enemies) {
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (PLAYER_SIZE + enemy.size) / 2) {
          player.hp -= enemy.damage;
          player.invulnerable = true;
          player.invulnerableUntil = Date.now() + 1000;

          if (dist > 0) {
            player.pos.x += (dx / dist) * 30;
            player.pos.y += (dy / dist) * 30;
          }

          if (player.hp <= 0) {
            player.hp = 0;
            this.running = false;
          }
        }
      }
    }
  }

  private collectPickups() {
    const { player, xpOrbs, goldCoins } = this.state;
    const collectRadius = 60;
    const magnetRadius = 150;

    for (let i = xpOrbs.length - 1; i >= 0; i--) {
      const orb = xpOrbs[i];
      const dx = player.pos.x - orb.pos.x;
      const dy = player.pos.y - orb.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < magnetRadius && dist > 0) {
        orb.pos.x += (dx / dist) * 5;
        orb.pos.y += (dy / dist) * 5;
      }

      if (dist < collectRadius) {
        this.state.xp += orb.value;
        xpOrbs.splice(i, 1);
      }
    }

    for (let i = goldCoins.length - 1; i >= 0; i--) {
      const coin = goldCoins[i];
      const dx = player.pos.x - coin.pos.x;
      const dy = player.pos.y - coin.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < magnetRadius && dist > 0) {
        coin.pos.x += (dx / dist) * 4;
        coin.pos.y += (dy / dist) * 4;
      }

      if (dist < collectRadius) {
        this.state.gold += coin.value;
        goldCoins.splice(i, 1);
      }
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.state.particles.length - 1; i >= 0; i--) {
      const p = this.state.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      p.vx *= 0.95;
      p.vy *= 0.95;

      if (p.life <= 0) {
        this.state.particles.splice(i, 1);
      }
    }
  }

  private checkLevelUp() {
    const xpThresholds = [100, 250, 500, 1000, 2000, 4000, 8000, 16000, 32000, 64000];
    const newLevel = xpThresholds.filter((t) => this.state.xp >= t).length + 1;

    if (newLevel > this.state.level) {
      this.state.level = newLevel;
      this.state.player.maxHp += 10;
      this.state.player.hp = Math.min(
        this.state.player.hp + 20,
        this.state.player.maxHp
      );

      this.state.showLevelUp = true;
      this.state.levelUpChoices = getWeaponChoices(this.state.player.weapons);

      this.state.particles.push(...createParticles(
        this.state.player.pos.x,
        this.state.player.pos.y,
        'levelup'
      ));
    }
  }

  private selectLevelUpChoice(idx: number) {
    const choice = this.state.levelUpChoices[idx];
    if (!choice) return;

    if (choice.isUpgrade) {
      const weapon = this.state.player.weapons.find(w => w.type === choice.weapon);
      if (weapon && weapon.level < weapon.maxLevel) {
        const newLevel = weapon.level + 1;
        const upgrade = WEAPON_UPGRADES[weapon.type][newLevel - 1];
        weapon.level = newLevel;
        weapon.damage = upgrade.damage;
        weapon.cooldown = upgrade.cooldown;
        weapon.projectileCount = upgrade.projectileCount;
        weapon.pierce = upgrade.pierce;
        weapon.area = upgrade.area;
      }
    } else {
      this.state.player.weapons.push(createWeapon(choice.weapon, 1));
    }

    this.state.showLevelUp = false;
    this.state.levelUpChoices = [];
  }

  private checkWaveProgression() {
    if (Date.now() - this.state.waveStartTime > WAVE_DURATION) {
      this.state.wave++;
      this.state.waveStartTime = Date.now();
      this.state.bossSpawnedThisWave = false;
    }
  }

  private syncExternalState() {
    this.onStateUpdate({
      hp: this.state.player.hp,
      maxHp: this.state.player.maxHp,
      xp: this.state.xp,
      level: this.state.level,
      gold: this.state.gold,
      wave: this.state.wave,
      kills: this.state.kills,
      timeSurvived: Math.floor(this.state.gameTime),
      isDead: this.state.player.hp <= 0,
    });
  }

  // ==================== RENDERING ====================

  private render() {
    const { ctx, state } = this;
    const { camera } = state;

    ctx.imageSmoothingEnabled = false;

    // Clear canvas with dark background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Render chunk backgrounds (tiles)
    this.chunkManager.render(ctx, camera.x, camera.y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Render decorations
    this.chunkManager.renderDecorations(ctx, camera.x, camera.y, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw garlic aura
    const garlicWeapon = state.player.weapons.find(w => w.type === 'garlic');
    if (garlicWeapon) {
      const screenX = state.player.pos.x - camera.x;
      const screenY = state.player.pos.y - camera.y;
      ctx.fillStyle = 'rgba(100, 255, 100, 0.15)';
      ctx.beginPath();
      ctx.arc(screenX, screenY, garlicWeapon.range * garlicWeapon.area, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particles
    for (const p of state.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - camera.x, p.y - camera.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw pickups with sprites
    this.renderPickups();

    // Draw enemies with sprites
    this.renderEnemies();

    // Draw projectiles
    this.renderProjectiles();

    // Draw player with sprite
    this.renderPlayer();

    // Draw level up screen
    if (state.showLevelUp) {
      this.renderLevelUpScreen();
    }
  }

  private renderPickups() {
    const { ctx, state } = this;
    const { camera } = state;
    const loader = getSpriteLoader();

    // XP Orbs
    const xpSprite = loader.get('/sprites/effects/xp_gem.png');
    for (const orb of state.xpOrbs) {
      const screenX = orb.pos.x - camera.x;
      const screenY = orb.pos.y - camera.y;
      const floatOffset = Math.sin(state.gameTime * 5 + orb.id) * 3;

      if (xpSprite) {
        ctx.drawImage(xpSprite, screenX - 8, screenY - 8 + floatOffset, 16, 16);
      } else {
        // Fallback
        ctx.fillStyle = '#00ff88';
        ctx.beginPath();
        ctx.moveTo(screenX, screenY - 6 + floatOffset);
        ctx.lineTo(screenX + 6, screenY + floatOffset);
        ctx.lineTo(screenX, screenY + 6 + floatOffset);
        ctx.lineTo(screenX - 6, screenY + floatOffset);
        ctx.closePath();
        ctx.fill();
      }
    }

    // Gold coins
    const goldSprite = loader.get('/sprites/effects/gold_gem.png');
    for (const coin of state.goldCoins) {
      const screenX = coin.pos.x - camera.x;
      const screenY = coin.pos.y - camera.y;
      const floatOffset = Math.sin(state.gameTime * 4 + coin.id) * 2;

      if (goldSprite) {
        ctx.drawImage(goldSprite, screenX - 8, screenY - 8 + floatOffset, 16, 16);
      } else {
        // Fallback
        ctx.fillStyle = '#ffd700';
        ctx.beginPath();
        ctx.arc(screenX, screenY + floatOffset, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffec8b';
        ctx.beginPath();
        ctx.arc(screenX, screenY + floatOffset, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private renderEnemies() {
    const { ctx, state } = this;
    const { camera } = state;
    const loader = getSpriteLoader();

    for (const enemy of state.enemies) {
      const screenX = enemy.pos.x - camera.x;
      const screenY = enemy.pos.y - camera.y;

      // Skip if off screen
      if (screenX < -50 || screenX > CANVAS_WIDTH + 50 ||
          screenY < -50 || screenY > CANVAS_HEIGHT + 50) continue;

      const spritePath = getEnemySpritePath(enemy.type);
      const sprite = loader.get(spritePath);
      const size = enemy.size;

      if (sprite) {
        // Draw enemy sprite scaled to their size
        const drawSize = Math.max(size, 32);

        // Bobbing animation based on enemy id for variety
        const bobSpeed = enemy.type === 'fast' ? 15 : enemy.type === 'boss' ? 6 : 10;
        const bobAmount = enemy.type === 'boss' ? 3 : 2;
        const bobOffset = Math.sin(state.gameTime * bobSpeed + enemy.id) * bobAmount;

        // Face player direction
        const facingLeft = enemy.vel.x < 0;

        ctx.save();

        // Hit flash effect - draw sprite brighter
        if (enemy.hitFlash > 0) {
          ctx.globalAlpha = 0.6;
          ctx.filter = 'brightness(3)';
          if (facingLeft) {
            ctx.translate(screenX, screenY + bobOffset);
            ctx.scale(-1, 1);
            ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
          } else {
            ctx.drawImage(sprite, screenX - drawSize / 2, screenY - drawSize / 2 + bobOffset, drawSize, drawSize);
          }
          ctx.filter = 'none';
          ctx.globalAlpha = 1;
        }

        // Draw main sprite
        if (facingLeft) {
          ctx.translate(screenX, screenY + bobOffset);
          ctx.scale(-1, 1);
          ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
        } else {
          ctx.drawImage(sprite, screenX - drawSize / 2, screenY - drawSize / 2 + bobOffset, drawSize, drawSize);
        }

        ctx.restore();
      } else {
        // Fallback: colored circle
        if (enemy.hitFlash > 0) {
          ctx.fillStyle = '#ffffff';
        } else {
          switch (enemy.type) {
            case 'basic': ctx.fillStyle = '#e74c3c'; break;
            case 'fast': ctx.fillStyle = '#9b59b6'; break;
            case 'tank': ctx.fillStyle = '#566573'; break;
            case 'boss': ctx.fillStyle = '#f1c40f'; break;
          }
        }

        ctx.beginPath();
        ctx.arc(screenX, screenY, size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(screenX - 6, screenY - 4, 3, 3);
        ctx.fillRect(screenX + 3, screenY - 4, 3, 3);
      }

      // Health bar
      const hpPercent = enemy.hp / enemy.maxHp;
      ctx.fillStyle = "#333";
      ctx.fillRect(screenX - 15, screenY - size / 2 - 8, 30, 4);
      ctx.fillStyle = enemy.type === 'boss' ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(screenX - 15, screenY - size / 2 - 8, 30 * hpPercent, 4);
    }
  }

  private renderProjectiles() {
    const { ctx, state } = this;
    const { camera } = state;

    for (const proj of state.projectiles) {
      const screenX = proj.pos.x - camera.x;
      const screenY = proj.pos.y - camera.y;

      switch (proj.weaponType) {
        case 'magic_wand':
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 10, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'fireball':
          ctx.fillStyle = '#ff6347';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffa500';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(screenX, screenY, 4, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'knife':
          ctx.fillStyle = '#c0c0c0';
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate(proj.angle);
          ctx.fillRect(-8, -2, 16, 4);
          ctx.fillStyle = '#808080';
          ctx.fillRect(-8, -2, 6, 4);
          ctx.restore();
          break;

        case 'bible':
          ctx.fillStyle = '#f5deb3';
          ctx.save();
          ctx.translate(screenX, screenY);
          ctx.rotate(proj.angle * 2);
          ctx.fillRect(-8, -10, 16, 20);
          ctx.fillStyle = '#8b4513';
          ctx.fillRect(-6, -8, 12, 2);
          ctx.fillRect(-6, 6, 12, 2);
          ctx.restore();
          break;
      }
    }
  }

  private renderPlayer() {
    const { ctx, state } = this;
    const { player, camera } = state;
    const screenX = player.pos.x - camera.x;
    const screenY = player.pos.y - camera.y;
    const loader = getSpriteLoader();

    // Invulnerability flash
    if (player.invulnerable && Math.floor(state.gameTime * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    const spritePath = getCharacterSpritePath(player.characterId);
    const sprite = loader.get(spritePath);

    if (sprite) {
      // Draw character sprite (scaled up from 32x32 to 48x48 for visibility)
      const drawSize = 48;

      // Bobbing animation when moving
      const isMoving = player.vel.x !== 0 || player.vel.y !== 0;
      const bobOffset = isMoving ? Math.sin(state.gameTime * 12) * 2 : 0;

      // Flip sprite based on movement direction
      ctx.save();
      if (player.lastDir.x < 0) {
        ctx.translate(screenX, screenY + bobOffset);
        ctx.scale(-1, 1);
        ctx.drawImage(sprite, -drawSize / 2, -drawSize / 2, drawSize, drawSize);
      } else {
        ctx.drawImage(
          sprite,
          screenX - drawSize / 2,
          screenY - drawSize / 2 + bobOffset,
          drawSize,
          drawSize
        );
      }
      ctx.restore();
    } else {
      // Fallback: blue wizard circle
      ctx.fillStyle = '#0f3460';
      ctx.beginPath();
      ctx.arc(screenX, screenY, PLAYER_SIZE / 2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#5dade2';
      ctx.beginPath();
      ctx.arc(screenX, screenY - 4, PLAYER_SIZE / 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(screenX - 6, screenY - 8, 4, 4);
      ctx.fillRect(screenX + 2, screenY - 8, 4, 4);
    }

    ctx.globalAlpha = 1;

    // Health bar above player
    const hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = "#333";
    ctx.fillRect(screenX - 20, screenY - 30, 40, 6);
    ctx.fillStyle = hpPercent > 0.3 ? '#00ff88' : '#ff4444';
    ctx.fillRect(screenX - 20, screenY - 30, 40 * hpPercent, 6);
  }

  private renderLevelUpScreen() {
    const { ctx, state } = this;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 36px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, 80);

    ctx.fillStyle = '#ffffff';
    ctx.font = '18px "Press Start 2P", monospace';
    ctx.fillText(`Level ${state.level}`, CANVAS_WIDTH / 2, 115);

    // Choice boxes
    const choiceWidth = 220;
    const choiceHeight = 180;
    const gap = 25;
    const startX = CANVAS_WIDTH / 2 - (state.levelUpChoices.length * choiceWidth + (state.levelUpChoices.length - 1) * gap) / 2;

    state.levelUpChoices.forEach((choice, i) => {
      const x = startX + i * (choiceWidth + gap);
      const y = 160;

      // Box background
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(x, y, choiceWidth, choiceHeight);
      ctx.strokeStyle = '#5dade2';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, choiceWidth, choiceHeight);

      // Key hint
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 24px "Press Start 2P", monospace';
      ctx.fillText(`[${i + 1}]`, x + choiceWidth / 2, y + 35);

      const weaponDef = choice.isUpgrade
        ? state.player.weapons.find(w => w.type === choice.weapon)
        : { name: choice.weapon.replace('_', ' ').toUpperCase(), level: 0 };

      // Weapon name
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px "Press Start 2P", monospace';
      const displayName = choice.isUpgrade
        ? (weaponDef?.name || choice.weapon)
        : choice.weapon.replace('_', ' ');
      ctx.fillText(displayName, x + choiceWidth / 2, y + 75);

      // Level or NEW indicator
      ctx.fillStyle = choice.isUpgrade ? '#00ff88' : '#ff6347';
      ctx.font = '12px "Press Start 2P", monospace';
      ctx.fillText(
        choice.isUpgrade ? `Lv.${(weaponDef?.level || 0) + 1}` : 'NEW!',
        x + choiceWidth / 2,
        y + 105
      );

      // Description
      ctx.fillStyle = '#cccccc';
      ctx.font = '10px "Press Start 2P", monospace';
      if (choice.isUpgrade && weaponDef) {
        const nextLevel = (weaponDef.level || 0) + 1;
        const upgrade = WEAPON_UPGRADES[choice.weapon][nextLevel - 1];
        if (upgrade?.description) {
          ctx.fillText(upgrade.description, x + choiceWidth / 2, y + 140);
        }
      } else {
        ctx.fillText('Press to add', x + choiceWidth / 2, y + 140);
      }
    });

    // Instructions
    ctx.fillStyle = '#888888';
    ctx.font = '12px "Press Start 2P", monospace';
    ctx.fillText('Press 1, 2, or 3 to choose', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 50);

    ctx.textAlign = 'left';
  }
}
