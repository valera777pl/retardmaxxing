import { LocalGameState } from "@/types";
import { SpriteCache, Particle, createParticles } from "./sprites";
import { Weapon, createWeapon, WeaponType, getWeaponChoices, WEAPON_UPGRADES } from "./weapons";
import { EnemyType, getEnemyStats, getRandomEnemyType, shouldSpawnBoss, getWaveConfig, applyEnemyBehavior, getEnemyBehavior, BehaviorType } from "./enemies";

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
  angle: number; // for bible rotation
  orbitDistance?: number; // for bible
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

  constructor(
    canvas: HTMLCanvasElement,
    onStateUpdate: (state: Partial<LocalGameState>) => void,
    onKill?: () => void
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.onStateUpdate = onStateUpdate;
    this.onKill = onKill;
    this.spriteCache = SpriteCache.getInstance();
    this.spriteCache.preloadAll();

    // Initialize state
    this.state = this.createInitialState();

    // Setup input handlers
    this.setupInputHandlers();
  }

  private createInitialState(): GameEngineState {
    return {
      player: {
        pos: { x: CANVAS_WIDTH / 2, y: CANVAS_HEIGHT / 2 },
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
    };
  }

  private setupInputHandlers() {
    window.addEventListener("keydown", (e) => {
      this.state.keys.add(e.key.toLowerCase());

      // Handle level up choices with 1, 2, 3
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
    // Only reset state if it's a fresh start (no kills yet)
    if (this.state.kills === 0 && this.state.gameTime === 0) {
      this.state = this.createInitialState();
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

    // Update animations
    this.updateAnimations(dt);

    // Update player movement
    this.updatePlayer(dt);

    // Spawn enemies
    this.spawnEnemies();

    // Update enemies
    this.updateEnemies(dt);

    // Fire weapons
    this.fireWeapons();

    // Update projectiles
    this.updateProjectiles(dt);

    // Check collisions
    this.checkCollisions();

    // Collect pickups
    this.collectPickups();

    // Update particles
    this.updateParticles(dt);

    // Check wave progression
    this.checkWaveProgression();

    // Check level up
    this.checkLevelUp();

    // Update external state
    this.syncExternalState();
  }

  private updateAnimations(dt: number) {
    // Player animation
    this.state.player.animTime += dt;
    if (this.state.player.animTime > 0.15) {
      this.state.player.animFrame = (this.state.player.animFrame + 1) % 4;
      this.state.player.animTime = 0;
    }

    // Enemy animations
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

    // Pickup animations
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

    // Movement
    player.vel.x = 0;
    player.vel.y = 0;

    if (keys.has("w") || keys.has("arrowup")) player.vel.y = -1;
    if (keys.has("s") || keys.has("arrowdown")) player.vel.y = 1;
    if (keys.has("a") || keys.has("arrowleft")) player.vel.x = -1;
    if (keys.has("d") || keys.has("arrowright")) player.vel.x = 1;

    // Normalize diagonal movement
    const len = Math.sqrt(player.vel.x ** 2 + player.vel.y ** 2);
    if (len > 0) {
      player.vel.x /= len;
      player.vel.y /= len;
      player.lastDir = { x: player.vel.x, y: player.vel.y };
    }

    // Apply movement
    player.pos.x += player.vel.x * player.speed * dt;
    player.pos.y += player.vel.y * player.speed * dt;

    // Clamp to bounds
    player.pos.x = Math.max(
      PLAYER_SIZE / 2,
      Math.min(CANVAS_WIDTH - PLAYER_SIZE / 2, player.pos.x)
    );
    player.pos.y = Math.max(
      PLAYER_SIZE / 2,
      Math.min(CANVAS_HEIGHT - PLAYER_SIZE / 2, player.pos.y)
    );

    // Update invulnerability
    if (player.invulnerable && Date.now() > player.invulnerableUntil) {
      player.invulnerable = false;
    }
  }

  private spawnEnemies() {
    const now = Date.now();
    const config = getWaveConfig(this.state.wave);

    // Check boss spawn
    if (shouldSpawnBoss(this.state.wave, this.state.bossSpawnedThisWave)) {
      this.spawnEnemy('boss');
      this.state.bossSpawnedThisWave = true;
    }

    // Regular enemy spawns
    if (now - this.state.lastEnemySpawn > config.spawnInterval &&
        this.state.enemies.length < config.maxEnemies) {
      const enemyType = getRandomEnemyType(this.state.wave);
      this.spawnEnemy(enemyType);
      this.state.lastEnemySpawn = now;
    }
  }

  private spawnEnemy(type: EnemyType) {
    const side = Math.floor(Math.random() * 4);
    let x, y;
    const stats = getEnemyStats(type, this.state.wave);

    switch (side) {
      case 0: // Top
        x = Math.random() * CANVAS_WIDTH;
        y = -stats.size;
        break;
      case 1: // Right
        x = CANVAS_WIDTH + stats.size;
        y = Math.random() * CANVAS_HEIGHT;
        break;
      case 2: // Bottom
        x = Math.random() * CANVAS_WIDTH;
        y = CANVAS_HEIGHT + stats.size;
        break;
      default: // Left
        x = -stats.size;
        y = Math.random() * CANVAS_HEIGHT;
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

    for (const enemy of enemies) {
      applyEnemyBehavior(enemy, player, enemy.behavior, enemy.speed, this.state.gameTime);
      enemy.pos.x += enemy.vel.x * dt;
      enemy.pos.y += enemy.vel.y * dt;
    }
  }

  private fireWeapons() {
    const now = Date.now();

    for (const weapon of this.state.player.weapons) {
      const lastFire = this.state.weaponCooldowns.get(weapon.type) || 0;
      if (now - lastFire < weapon.cooldown) continue;

      this.state.weaponCooldowns.set(weapon.type, now);

      switch (weapon.type) {
        case 'magic_wand':
          this.fireMagicWand(weapon);
          break;
        case 'fireball':
          this.fireFireball(weapon);
          break;
        case 'lightning':
          this.fireLightning(weapon);
          break;
        case 'garlic':
          this.applyGarlic(weapon);
          break;
        case 'knife':
          this.fireKnife(weapon);
          break;
        case 'bible':
          this.updateBible(weapon);
          break;
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
        // Push enemy away
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

    // Ensure correct number of bibles
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

    // Update bible positions
    for (let i = 0; i < existingBibles.length; i++) {
      const bible = existingBibles[i];
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
    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];

      // Skip bible position update (handled in updateBible)
      if (proj.weaponType !== 'bible') {
        proj.pos.x += proj.vel.x * dt;
        proj.pos.y += proj.vel.y * dt;
      }

      proj.lifetime -= dt;

      // Remove if expired or out of bounds (except bible)
      if (proj.weaponType !== 'bible') {
        if (
          proj.lifetime <= 0 ||
          proj.pos.x < -50 ||
          proj.pos.x > CANVAS_WIDTH + 50 ||
          proj.pos.y < -50 ||
          proj.pos.y > CANVAS_HEIGHT + 50
        ) {
          this.state.projectiles.splice(i, 1);
        }
      }
    }
  }

  private checkCollisions() {
    const { player, enemies, projectiles } = this.state;

    // Projectile vs Enemy
    for (let i = projectiles.length - 1; i >= 0; i--) {
      const proj = projectiles[i];

      for (let j = enemies.length - 1; j >= 0; j--) {
        const enemy = enemies[j];

        // Skip if already hit this enemy
        if (proj.hitEnemies.has(enemy.id)) continue;

        const dx = proj.pos.x - enemy.pos.x;
        const dy = proj.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        const hitRadius = proj.weaponType === 'fireball' ? 30 : 15;

        if (dist < (hitRadius + enemy.size) / 2) {
          enemy.hp -= proj.damage;
          enemy.hitFlash = 0.15;
          proj.hitEnemies.add(enemy.id);

          // Particles
          this.state.particles.push(...createParticles(enemy.pos.x, enemy.pos.y, 'hit'));

          // Check pierce
          if (proj.hitEnemies.size >= proj.pierce && proj.weaponType !== 'bible') {
            projectiles.splice(i, 1);
          }

          if (enemy.hp <= 0) {
            // Death particles
            this.state.particles.push(...createParticles(enemy.pos.x, enemy.pos.y, 'death'));

            // Drop XP and gold
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

            // Trigger instant transaction on kill
            this.onKill?.();
          }

          break;
        }
      }
    }

    // Enemy vs Player
    if (!player.invulnerable) {
      for (const enemy of enemies) {
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < (PLAYER_SIZE + enemy.size) / 2) {
          player.hp -= enemy.damage;
          player.invulnerable = true;
          player.invulnerableUntil = Date.now() + 1000;

          // Knockback
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

    // Collect XP
    for (let i = xpOrbs.length - 1; i >= 0; i--) {
      const orb = xpOrbs[i];
      const dx = player.pos.x - orb.pos.x;
      const dy = player.pos.y - orb.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Magnet effect
      if (dist < magnetRadius && dist > 0) {
        orb.pos.x += (dx / dist) * 5;
        orb.pos.y += (dy / dist) * 5;
      }

      if (dist < collectRadius) {
        this.state.xp += orb.value;
        xpOrbs.splice(i, 1);
      }
    }

    // Collect Gold
    for (let i = goldCoins.length - 1; i >= 0; i--) {
      const coin = goldCoins[i];
      const dx = player.pos.x - coin.pos.x;
      const dy = player.pos.y - coin.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Magnet effect
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

      // Show level up choices
      this.state.showLevelUp = true;
      this.state.levelUpChoices = getWeaponChoices(this.state.player.weapons);

      // Add level up particles
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
      // Upgrade existing weapon
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
      // Add new weapon
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

  private render() {
    const { ctx, state } = this;

    // Clear canvas
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw grid
    ctx.strokeStyle = "#16213e";
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    // Draw garlic aura if active
    const garlicWeapon = state.player.weapons.find(w => w.type === 'garlic');
    if (garlicWeapon) {
      ctx.fillStyle = 'rgba(100, 255, 100, 0.1)';
      ctx.beginPath();
      ctx.arc(state.player.pos.x, state.player.pos.y, garlicWeapon.range * garlicWeapon.area, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw particles (behind everything)
    for (const p of state.particles) {
      ctx.globalAlpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Draw XP orbs
    this.renderPickups();

    // Draw enemies
    this.renderEnemies();

    // Draw projectiles
    this.renderProjectiles();

    // Draw player
    this.renderPlayer();

    // Draw HUD
    this.renderHUD();

    // Draw level up screen
    if (state.showLevelUp) {
      this.renderLevelUpScreen();
    }
  }

  private renderPickups() {
    const { ctx, state } = this;

    // XP Orbs
    for (const orb of state.xpOrbs) {
      const floatOffset = Math.sin(state.gameTime * 5 + orb.id) * 3;
      ctx.fillStyle = '#00ff88';
      ctx.beginPath();
      ctx.moveTo(orb.pos.x, orb.pos.y - 6 + floatOffset);
      ctx.lineTo(orb.pos.x + 6, orb.pos.y + floatOffset);
      ctx.lineTo(orb.pos.x, orb.pos.y + 6 + floatOffset);
      ctx.lineTo(orb.pos.x - 6, orb.pos.y + floatOffset);
      ctx.closePath();
      ctx.fill();
    }

    // Gold coins
    for (const coin of state.goldCoins) {
      const floatOffset = Math.sin(state.gameTime * 4 + coin.id) * 2;
      ctx.fillStyle = '#ffd700';
      ctx.beginPath();
      ctx.arc(coin.pos.x, coin.pos.y + floatOffset, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffec8b';
      ctx.beginPath();
      ctx.arc(coin.pos.x, coin.pos.y + floatOffset, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderEnemies() {
    const { ctx, state } = this;

    for (const enemy of state.enemies) {
      // Hit flash effect
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

      // Draw enemy body
      if (enemy.type === 'boss') {
        // Boss is larger and more detailed
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Horns
        ctx.fillStyle = enemy.hitFlash > 0 ? '#ffffff' : '#b7950b';
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x - 15, enemy.pos.y - 20);
        ctx.lineTo(enemy.pos.x - 10, enemy.pos.y - 35);
        ctx.lineTo(enemy.pos.x - 5, enemy.pos.y - 20);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(enemy.pos.x + 15, enemy.pos.y - 20);
        ctx.lineTo(enemy.pos.x + 10, enemy.pos.y - 35);
        ctx.lineTo(enemy.pos.x + 5, enemy.pos.y - 20);
        ctx.fill();

        // Glowing eyes
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(enemy.pos.x - 12, enemy.pos.y - 8, 6, 6);
        ctx.fillRect(enemy.pos.x + 6, enemy.pos.y - 8, 6, 6);
      } else {
        ctx.beginPath();
        ctx.arc(enemy.pos.x, enemy.pos.y, enemy.size / 2, 0, Math.PI * 2);
        ctx.fill();

        // Eyes
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(enemy.pos.x - 6, enemy.pos.y - 4, 3, 3);
        ctx.fillRect(enemy.pos.x + 3, enemy.pos.y - 4, 3, 3);
      }

      // Health bar
      const hpPercent = enemy.hp / enemy.maxHp;
      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.pos.x - 15, enemy.pos.y - enemy.size / 2 - 8, 30, 4);
      ctx.fillStyle = enemy.type === 'boss' ? '#f1c40f' : '#e74c3c';
      ctx.fillRect(enemy.pos.x - 15, enemy.pos.y - enemy.size / 2 - 8, 30 * hpPercent, 4);
    }
  }

  private renderProjectiles() {
    const { ctx, state } = this;

    for (const proj of state.projectiles) {
      switch (proj.weaponType) {
        case 'magic_wand':
          ctx.fillStyle = '#00d4ff';
          ctx.beginPath();
          ctx.arc(proj.pos.x, proj.pos.y, 6, 0, Math.PI * 2);
          ctx.fill();
          // Glow
          ctx.fillStyle = 'rgba(0, 212, 255, 0.3)';
          ctx.beginPath();
          ctx.arc(proj.pos.x, proj.pos.y, 10, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'fireball':
          ctx.fillStyle = '#ff6347';
          ctx.beginPath();
          ctx.arc(proj.pos.x, proj.pos.y, 12, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffa500';
          ctx.beginPath();
          ctx.arc(proj.pos.x, proj.pos.y, 8, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(proj.pos.x, proj.pos.y, 4, 0, Math.PI * 2);
          ctx.fill();
          break;

        case 'knife':
          ctx.fillStyle = '#c0c0c0';
          ctx.save();
          ctx.translate(proj.pos.x, proj.pos.y);
          ctx.rotate(proj.angle);
          ctx.fillRect(-8, -2, 16, 4);
          ctx.fillStyle = '#808080';
          ctx.fillRect(-8, -2, 6, 4);
          ctx.restore();
          break;

        case 'bible':
          ctx.fillStyle = '#f5deb3';
          ctx.save();
          ctx.translate(proj.pos.x, proj.pos.y);
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
    const { player } = state;

    // Invulnerability flash
    if (player.invulnerable && Math.floor(state.gameTime * 10) % 2 === 0) {
      ctx.globalAlpha = 0.5;
    }

    // Body
    ctx.fillStyle = '#0f3460';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y, PLAYER_SIZE / 2, 0, Math.PI * 2);
    ctx.fill();

    // Face
    ctx.fillStyle = '#5dade2';
    ctx.beginPath();
    ctx.arc(player.pos.x, player.pos.y - 4, PLAYER_SIZE / 3, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(player.pos.x - 6, player.pos.y - 8, 4, 4);
    ctx.fillRect(player.pos.x + 2, player.pos.y - 8, 4, 4);

    ctx.globalAlpha = 1;

    // Health bar
    const hpPercent = player.hp / player.maxHp;
    ctx.fillStyle = "#333";
    ctx.fillRect(player.pos.x - 20, player.pos.y - 26, 40, 6);
    ctx.fillStyle = hpPercent > 0.3 ? '#00ff88' : '#ff4444';
    ctx.fillRect(player.pos.x - 20, player.pos.y - 26, 40 * hpPercent, 6);
  }

  private renderHUD() {
    const { ctx, state } = this;

    // Background panel
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(5, 5, 150, 140);

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 14px monospace";
    ctx.fillText(`Wave: ${state.wave}`, 15, 25);
    ctx.fillText(`Level: ${state.level}`, 15, 45);
    ctx.fillText(`XP: ${state.xp}`, 15, 65);
    ctx.fillText(`Gold: ${state.gold}`, 15, 85);
    ctx.fillText(`Kills: ${state.kills}`, 15, 105);
    ctx.fillText(`Time: ${Math.floor(state.gameTime)}s`, 15, 125);

    // Weapons display
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(CANVAS_WIDTH - 160, 5, 155, 25 + state.player.weapons.length * 20);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('Weapons:', CANVAS_WIDTH - 150, 20);

    state.player.weapons.forEach((w, i) => {
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '11px monospace';
      ctx.fillText(`${w.name} Lv.${w.level}`, CANVAS_WIDTH - 150, 40 + i * 20);
    });
  }

  private renderLevelUpScreen() {
    const { ctx, state } = this;

    // Dim background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Title
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LEVEL UP!', CANVAS_WIDTH / 2, 100);

    ctx.fillStyle = '#ffffff';
    ctx.font = '16px monospace';
    ctx.fillText(`Level ${state.level}`, CANVAS_WIDTH / 2, 130);

    // Choices
    const choiceWidth = 200;
    const choiceHeight = 150;
    const startX = CANVAS_WIDTH / 2 - (state.levelUpChoices.length * choiceWidth + (state.levelUpChoices.length - 1) * 20) / 2;

    state.levelUpChoices.forEach((choice, i) => {
      const x = startX + i * (choiceWidth + 20);
      const y = 180;

      // Box
      ctx.fillStyle = '#2a2a4e';
      ctx.fillRect(x, y, choiceWidth, choiceHeight);
      ctx.strokeStyle = '#5dade2';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, choiceWidth, choiceHeight);

      // Key hint
      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 20px monospace';
      ctx.fillText(`[${i + 1}]`, x + choiceWidth / 2, y + 30);

      // Weapon name
      const weaponDef = choice.isUpgrade
        ? state.player.weapons.find(w => w.type === choice.weapon)
        : { name: choice.weapon.replace('_', ' ').toUpperCase(), level: 0 };

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(
        choice.isUpgrade ? `${weaponDef?.name || choice.weapon}` : choice.weapon.replace('_', ' '),
        x + choiceWidth / 2,
        y + 60
      );

      // Level/New indicator
      ctx.fillStyle = choice.isUpgrade ? '#00ff88' : '#ff6347';
      ctx.font = '12px monospace';
      ctx.fillText(
        choice.isUpgrade ? `Lv.${(weaponDef?.level || 0) + 1}` : 'NEW!',
        x + choiceWidth / 2,
        y + 85
      );

      // Description
      ctx.fillStyle = '#aaaaaa';
      ctx.font = '11px monospace';
      if (choice.isUpgrade && weaponDef) {
        const nextLevel = (weaponDef.level || 0) + 1;
        const upgrade = WEAPON_UPGRADES[choice.weapon][nextLevel - 1];
        ctx.fillText(upgrade?.description || '', x + choiceWidth / 2, y + 110);
      }
    });

    ctx.textAlign = 'left';
  }
}
