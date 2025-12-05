import { CONFIG, UNITS, STATS_GROWTH, getUnitStats, getEvolveCost, randInt } from './config.js';
import { QUIZ_QUESTIONS } from './quizData.js';
import * as Effects from './effects.js';
import * as Quiz from './quiz.js';

// 初始化圖示
lucide.createIcons();

// ----------------------------------------------------
// 題目資料（3 關共 15 題）
// ----------------------------------------------------
// removed QUIZ handling code here; moved to quiz.js
// removed function openRandomQuiz() {}
// removed function handleQuizAnswer() {}
// removed function handleQuizTimer() {}

// ----------------------------------------------------
// 特效與顯示（moved to effects.js）
// ----------------------------------------------------
// removed createProjectile() {}
// removed createDamagePopup() {}
// removed explodeCastle() {}
// removed spawnCastleSpark() {}
// removed applyCorrectBuff() {}
// removed applyWrongPenalty() {}
// removed triggerSwordRain() {}

// ----------------------------------------------------
// 遊戲狀態
// ----------------------------------------------------
let state = {
    running: false,
    score: 500,
    playerHp: CONFIG.castleMaxHp,
    enemyHp: CONFIG.castleMaxHp,
    units: [],
    playerLevels: { infantry: 0, archer: 0, cavalry: 0 },
    enemyLevels: { infantry: 0, archer: 0, cavalry: 0 },
    enemyTimer: CONFIG.enemyEvolveInterval,
    // boss timer and flag
    bossTimer: CONFIG.bossCountdown,
    bossSpawned: false,
    lastPlayerCastleAttack: 0,
    lastEnemyCastleAttack: 0,
    unitId: 0,
    // 題目狀態
    quiz: {
        showing: false,
        lastTime: 0,
        nextDelaySec: Math.floor(Math.random() * (CONFIG.quizMaxInterval - CONFIG.quizMinInterval + 1)) + CONFIG.quizMinInterval,
        answeredCount: 0,
        correctStreak: 0,
        usedIds: new Set()
    }
};

export { state }; // export shared state for modules that need it

// Expose to window so effects.js (which intentionally avoids importing main to prevent circular deps)
// can access the runtime state and configuration safely.
window.state = state;
window.CONFIG = CONFIG;

// global audio mute controller (accessible across modules)
window.audioMuted = false;
function setAudioMuted(muted) {
    window.audioMuted = !!muted;
    const audios = Array.from(document.querySelectorAll('audio'));
    audios.forEach(a => {
        try {
            a.muted = window.audioMuted;
        } catch (e) { /* ignore */ }
    });
    // update music button visual state if present
    const btn = document.getElementById('musicToggle');
    if (btn) {
        if (window.audioMuted) {
            btn.classList.remove('bg-purple-500');
            btn.classList.add('bg-gray-400');
            btn.innerHTML = '<i data-lucide="volume-x" class="w-3 h-3"></i>';
        } else {
            btn.classList.remove('bg-gray-400');
            btn.classList.add('bg-purple-500');
            btn.innerHTML = '<i data-lucide="volume-2" class="w-3 h-3"></i>';
        }
        // re-create icons after changing innerHTML
        try { lucide.createIcons(); } catch(e) {}
    }
}

const $ = id => document.getElementById(id);
const gameScreen = $('gameScreen');
const unitLayer = $('unitLayer');

// ----------------------------------------------------
// 單位 SVG
// ----------------------------------------------------
function getUnitSVG(type, level, side) {
    const color = side === 'player' ? '#3b82f6' : '#ef4444';
    const darker = side === 'player' ? '#1e40af' : '#991b1b';
    const skin = '#fcd34d';
    const isEvolved = level > 0;
    
    let body = '', weapon = '', helmet = '';

    body = `<rect x="15" y="25" width="20" height="20" rx="3" fill="${color}" stroke="#333" stroke-width="1.5"/>`;
    body += `<circle cx="25" cy="20" r="8" fill="${skin}" stroke="#333" stroke-width="1.5"/>`;

    if (type === 'infantry') {
        helmet = `<path d="M17 20 L33 20 L33 12 Q25 8 17 12 Z" fill="#9ca3af" stroke="#333"/>`;
        if(isEvolved) helmet += `<path d="M22 12 L28 12 L28 5 L22 5 Z" fill="${darker}"/>`;
        const swordLen = 15 + level * 2;
        weapon = `<rect x="30" y="25" width="4" height="${swordLen}" fill="#cbd5e1" stroke="#333"/><rect x="28" y="35" width="8" height="2" fill="#333"/>`; 
        body += `<rect x="10" y="28" width="10" height="15" rx="2" fill="${darker}" stroke="#333"/>`;
    } else if (type === 'archer') {
        helmet = `<path d="M17 20 Q25 10 33 20" fill="#4b5563" stroke="#333"/>`; 
        if(isEvolved) helmet = `<path d="M17 20 L33 20 L30 10 L20 10 Z" fill="#15803d" stroke="#333"/>`; 
        weapon = `<path d="M30 20 Q40 30 30 40" fill="none" stroke="#5c2b0e" stroke-width="2"/> <line x1="30" y1="30" x2="38" y2="30" stroke="#333"/>`; 
    } else if (type === 'cavalry') {
        body = `<path d="M10 45 L40 45 L45 30 L10 30 Z" fill="#78350f" stroke="#333"/> <circle cx="45" cy="28" r="5" fill="#78350f"/>`;
        body += `<rect x="20" y="20" width="15" height="15" fill="${color}" stroke="#333"/> <circle cx="27" cy="15" r="6" fill="#fcd34d" stroke="#333"/>`;
        helmet = `<path d="M22 15 L32 15 L32 8 L22 8 Z" fill="#9ca3af" stroke="#333"/>`;
        if(isEvolved) helmet += `<line x1="27" y1="8" x2="27" y2="3" stroke="${darker}" stroke-width="3"/>`;
        weapon = `<line x1="30" y1="25" x2="50" y2="25" stroke="#333" stroke-width="2"/> <polygon points="50,22 55,25 50,28" fill="#cbd5e1"/>`; 
    }

    return `<svg viewBox="0 0 50 50" class="unit-svg-container drop-shadow-md overflow-visible">
        ${body} ${helmet} ${weapon}
    </svg>`;
}

// ----------------------------------------------------
// 單位類別
// ----------------------------------------------------
class Unit {
    constructor(type, side) {
        this.id = ++state.unitId;
        this.type = type;
        this.side = side;
        this.level = side === 'player' ? state.playerLevels[type] : state.enemyLevels[type];
        const stats = getUnitStats(type, this.level);
        const baseData = UNITS[type];

        this.maxHp = stats.maxHp;
        this.hp = this.maxHp;
        this.atk = stats.atk;
        this.range = stats.range;
        this.scale = stats.scale;
        this.speed = baseData.speed;
        this.scoreVal = baseData.score * (1 + this.level * 0.5);

        // place all units on a consistent battlefield horizontal line so they fight face-to-face
        // align fight line relative to the green ground area at bottom
        const groundHeight = Math.floor(gameScreen.clientHeight * 0.25); // matches ground div height in index.html
        const battlefieldY = gameScreen.clientHeight - groundHeight - 48; // slightly above ground
        this.x = side === 'player' ? 140 : gameScreen.clientWidth - 140; // keep units near but not overlapping castles
        this.y = battlefieldY + (Math.random() * 6 - 3); // tiny jitter to avoid perfect stacking but same level
        this.baseWidth = 40; // unit visual base size (scaled by level)

        this.lastAtk = 0;
        this.atkSpeed = 1000;
        this.target = null;
        this.dead = false;

        this.createEl();
    }

    createEl() {
        this.el = document.createElement('div');
        this.el.className = `unit ${this.side} pointer-events-auto`;
        this.updateSize();
        this.renderContent();
        unitLayer.appendChild(this.el);
        this.updatePos();
    }

    updateSize() {
        const size = this.baseWidth * this.scale;
        this.el.style.width = size + 'px';
        this.el.style.height = size + 'px';
    }

    renderContent() {
        this.el.innerHTML = `
            ${getUnitSVG(this.type, this.level, this.side)}
            <div class="absolute -top-3 w-full h-1.5 bg-gray-700 border border-white rounded overflow-hidden">
                <div class="hp-fill w-full h-full ${this.side === 'player' ? 'bg-green-500' : 'bg-red-500'} transition-all duration-200"></div>
            </div>
        `;
    }

    upgrade() {
        // Safely handle special unit types (like Boss) that don't exist in UNITS
        if (this.type === 'boss') {
            // Boss uses CONFIG.boss values; refresh hp/atk from CONFIG if available
            if (window.CONFIG && window.CONFIG.boss) {
                this.maxHp = window.CONFIG.boss.maxHp;
                this.hp = this.maxHp;
                this.atk = window.CONFIG.boss.atk;
                // flameAtk is boss-specific; preserve if present
                this.flameAtk = window.CONFIG.boss.flameAtk || this.flameAtk;
                // update visual hp bar if present
                const bar = this.el && this.el.querySelector('.hp-fill');
                if (bar) bar.style.width = '100%';
            }
            return;
        }

        // For normal unit types, fallback to config-based stats
        try {
            this.level = this.side === 'player' ? state.playerLevels[this.type] : state.enemyLevels[this.type];
            const stats = getUnitStats(this.type, this.level);
            if (!stats || typeof stats.maxHp === 'undefined') {
                // If stats lookup failed, avoid throwing and keep existing stats
                return;
            }
            this.maxHp = stats.maxHp;
            this.hp = this.maxHp;
            this.atk = stats.atk;
            this.range = stats.range;
            this.scale = stats.scale;
            this.updateSize();
            this.renderContent();
        } catch (e) {
            // defensive: do not allow upgrade to crash the game
            console.warn('Upgrade skipped for', this.type, e);
        }
    }

    updatePos() {
        // Avoid applying a forced scaleX for boss units so Boss GIF can control facing;
        // keep scale behavior for normal enemy units.
        const flip = (this.side === 'enemy' && this.type !== 'boss') ? ' scaleX(-1)' : '';
        this.el.style.transform = `translate(${this.x}px, ${this.y}px)${flip}`;
        this.el.style.zIndex = Math.floor(this.y);
    }

    takeDamage(amt) {
        this.hp -= amt;
        Effects.createDamagePopup(amt, this.x, this.y);
        // play hurt sound when a player-side unit is damaged
        if (this.side === 'player') {
            Effects.playHurtSfx();
        }
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        this.el.querySelector('.hp-fill').style.width = `${pct}%`;
        if (this.hp <= 0 && !this.dead) {
            this.dead = true;
            try { Effects.playDeathSfx(); } catch(e) {}
            this.el.remove();
            state.units = state.units.filter(u => u !== this);
            if (this.side === 'enemy') {
                state.score += this.scoreVal;
                updateUI();
            }
        }
    }

    healPercent(p) {
        this.hp = Math.min(this.maxHp, this.hp + this.maxHp * p);
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        const bar = this.el.querySelector('.hp-fill');
        if (bar) bar.style.width = `${pct}%`;
    }

    update(now) {
        if (this.dead) return;

        const enemyCastleX = this.side === 'player' ? gameScreen.clientWidth - 80 : 80;
        // determine closest enemy unit target (unchanged selection logic)
        let target = null;
        let minDist = Infinity;

        state.units.forEach(u => {
            if (u.side !== this.side && !u.dead) {
                const dist = Math.abs(u.x - this.x);
                if (dist < minDist && (this.type !== 'archer' || dist < 300)) {
                    minDist = dist;
                    target = u;
                }
            }
        });

        // compute distance to castle
        let distToCastle = Math.abs(this.x - enemyCastleX);
        let attacking = false;

        if (target) {
            // prioritize engaging the unit: move towards target until in range (archer keeps distance)
            const dirToTarget = Math.sign(target.x - this.x) || 1;
            const distToTarget = Math.abs(target.x - this.x);

            if (this.type === 'archer') {
                // archers keep at their ideal range (slightly less than their max range) to attack from distance
                const idealRange = Math.min(this.range * 0.9, 220);
                if (distToTarget <= this.range && distToTarget >= idealRange * 0.6) {
                    attacking = true;
                    if (now - this.lastAtk > this.atkSpeed) {
                        this.attack(target);
                        this.lastAtk = now;
                    }
                } else if (distToTarget > this.range) {
                    // move closer to get into firing range
                    this.x += this.speed * 0.6 * dirToTarget;
                    this.el.classList.add('walking');
                } else if (distToTarget < idealRange * 0.6) {
                    // step back a bit so archer regains distance
                    this.x -= this.speed * 0.8 * dirToTarget;
                    this.el.classList.add('walking');
                }
            } else {
                // melee units run straight toward their target and attack when in range
                if (distToTarget <= this.range) {
                    attacking = true;
                    if (now - this.lastAtk > this.atkSpeed) {
                        this.attack(target);
                        this.lastAtk = now;
                    }
                } else {
                    this.x += this.speed * dirToTarget;
                    this.el.classList.add('walking');
                }
            }
        } else if (distToCastle <= this.range) {
            attacking = true;
            if (now - this.lastAtk > this.atkSpeed) {
                this.attackCastle();
                this.lastAtk = now;
            }
        } else {
            // no unit target -> proceed toward enemy castle (keep previous behavior)
            const enemyDir = this.side === 'player' ? 1 : -1;
            this.x += this.speed * enemyDir;
            this.el.classList.add('walking');
        }

        // clamp units so they never pass the left/right castle bounds (keep them on the battlefield)
        const leftLimit = 80; // safe area to avoid overlapping left castle
        const rightLimit = Math.max(120, gameScreen.clientWidth - 80); // safe area to avoid overlapping right castle
        this.x = Math.max(leftLimit, Math.min(this.x, rightLimit));

        if (attacking) {
            this.el.classList.remove('walking');
            if(now - this.lastAtk < 300) this.el.classList.add('attacking');
            else this.el.classList.remove('attacking');
        }

        this.updatePos();
    }

    attack(target) {
        if(this.type === 'archer') {
            Effects.createProjectile(this.x, this.y + 20, target.x, target.y + 20, this.side, this.scale);
            setTimeout(() => target.takeDamage(this.atk), 300);
        } else {
            // play melee sword SFX for close attacks
            Effects.playSwordSfx();
            target.takeDamage(this.atk);
        }
    }

    attackCastle() {
        const targetX = this.side === 'player' ? gameScreen.clientWidth - 50 : 50;
        if(this.type === 'archer') {
            Effects.createProjectile(this.x, this.y + 20, targetX, 300, this.side, this.scale);
        }
        
        if (this.side === 'player') {
            // melee attackers should produce sword sound when hitting castle too
            if (this.type !== 'archer') Effects.playSwordSfx();
            state.enemyHp -= this.atk;
            Effects.createDamagePopup(this.atk, targetX, 300);
        } else {
            if (this.type !== 'archer') Effects.playSwordSfx();
            state.playerHp -= this.atk;
            Effects.createDamagePopup(this.atk, targetX, 300);
        }
        updateCastleUI();
        checkGameOver();
    }
}

// Boss class: heavy-armored mounted paladin/dread knight with special attacks and GIF animations
class Boss extends Unit {
    constructor() {
        // create as enemy heavy unit
        super('infantry', 'enemy'); // base type to reuse properties; we'll override stats
        this.type = 'boss';
        this.id = 'boss-' + Date.now();
        this.maxHp = CONFIG.boss.maxHp;
        this.hp = this.maxHp;
        this.atk = CONFIG.boss.atk;
        this.flameAtk = CONFIG.boss.flameAtk;
        this.range = 40;
        this.speed = 0.8;    // slightly faster to close gaps to units
        this.scale = 3.0;    // larger visual scale
        this.scoreVal = 2000;
        this.spawned = false;
        this.el && this.el.remove(); // remove the default created element
        this.createBossEl();
    }

    createBossEl() {
        this.el = document.createElement('div');
        this.el.className = `unit ${this.side} boss pointer-events-auto`;
        this.updateSize();
        // boss visuals use your GIF assets; choose facing by side (enemy faces left)
        const faceRight = this.side === 'player' ? true : false;
        // keep explicit file paths for right/left variants
        // use project assets (absolute paths) and preload them so GIF animations run reliably
        this._gifLeft = '/向左攻擊圖.gif';
        this._gifRight = '/向右攻擊圖.gif';
        this._flameLeft = '/向左噴火圖.gif';
        this._flameRight = '/向右噴火圖.gif';

        // preload GIFs to avoid flicker on first switch
        try {
            [this._gifLeft, this._gifRight, this._flameLeft, this._flameRight].forEach(src => {
                const imgPre = new Image();
                imgPre.src = src;
            });
        } catch (e) {
            // ignore preload errors
        }

        // composite boss HTML
        // default to left-facing (enemy) or right-facing (player) on spawn
        const defaultGif = faceRight ? this._gifRight : this._gifLeft;

        this.el.innerHTML = `
            <div style="position:relative; width:100%; height:100%; display:flex; align-items:center; justify-content:center;">
                <img id="bossImg-${this.id}" src="${defaultGif}" style="width:100%; height:100%; object-fit:contain; mix-blend-mode:screen; filter: drop-shadow(0 10px 20px rgba(0,0,0,0.6));" />
                <div style="position:absolute; inset:0; pointer-events:none;">
                    <!-- glowing eyes / weapon overlay -->
                    <div style="position:absolute; left:50%; top:28%; transform:translateX(-50%); width:40%; height:10%; background:linear-gradient(90deg, rgba(255,255,180,0.9), rgba(255,120,120,0.9)); filter:blur(8px); opacity:0.9; border-radius:50%; mix-blend-mode:screen;"></div>
                </div>
            </div>
            <div class="absolute -top-3 w-full h-1.5 bg-gray-700 border border-white rounded overflow-hidden">
                <div class="hp-fill w-full h-full bg-purple-700 transition-all duration-200"></div>
            </div>
        `;
        unitLayer.appendChild(this.el);
        // position initially off-screen above and then drop
        this.x = Math.floor(gameScreen.clientWidth / 2);
        this.y = 0 + CONFIG.boss.spawnHeightOffset;
        // initialize previous x for facing/movement detection
        this.prevX = this.x;
        this.updatePos();
    }

    // override update size to reflect boss scale
    updateSize() {
        const size = this.baseWidth * (this.scale || 2);
        this.el && (this.el.style.width = size + 'px');
        this.el && (this.el.style.height = size + 'px');
    }

    // custom spawn animation (from sky drop -> shake + flash)
    spawnDrop() {
        if (this.spawned) return;
        this.spawned = true;
        // animate drop
        const targetY = gameScreen.clientHeight - Math.floor(gameScreen.clientHeight * 0.25) - 120;
        const startY = CONFIG.boss.spawnHeightOffset;
        const dur = CONFIG.boss.dropDuration;
        const start = performance.now();
        const dropAnim = (now) => {
            const t = Math.min(1, (now - start) / dur);
            const eased = t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t; // eased-ish
            this.y = startY + (targetY - startY) * eased;
            this.updatePos();
            if (t < 1) requestAnimationFrame(dropAnim);
            else {
                // land effects: screen shake 1s + flash 1s
                Effects.screenShake(1000, 10);
                Effects.screenFlash(1000);
                // slight landing step
                this.el.classList.add('attacking');
                setTimeout(() => this.el.classList.remove('attacking'), 400);
                // announce
                Effects.showNotify(`⚔️ BOSS ${CONFIG.boss.name} 降臨！`, 'warning');
            }
        };
        requestAnimationFrame(dropAnim);
    }

    // override update to implement boss behavior: melee swing and periodic flame cone
    update(now) {
        if (this.dead) return;
        // store previous x to determine facing
        const prevX = this.prevX || this.x;

        // basic AI: find nearest player unit; if within melee range, swing; else move toward player castle slowly
        let target = null;
        let minDist = Infinity;
        state.units.forEach(u => {
            if (u.side !== this.side && !u.dead) {
                const dist = Math.abs(u.x - this.x);
                if (dist < minDist) {
                    minDist = dist;
                    target = u;
                }
            }
        });

        if (target && minDist <= 220) {
            // approach and attack: melee swing when close
            const dir = Math.sign(target.x - this.x) || 1;
            if (minDist > 60) {
                this.x += this.speed * dir;
                this.el.classList.add('walking');
            } else {
                this.el.classList.remove('walking');
                if (now - this.lastAtk > 1200) {
                    // choose melee or flame randomly (flame is ranged AOE)
                    if (Math.random() < 0.35) {
                        this.flameAttack(target);
                    } else {
                        this.meleeAttack(target);
                    }
                    this.lastAtk = now;
                }
            }
        } else {
            // If there are any alive player units anywhere, seek the nearest one (boss prioritizes units).
            const anyPlayers = state.units.some(u => u.side === 'player' && !u.dead);
            if (anyPlayers) {
                // find nearest alive player unit and move toward it
                let nearest = null;
                let nd = Infinity;
                state.units.forEach(u => {
                    if (u.side === 'player' && !u.dead) {
                        const d = Math.abs(u.x - this.x);
                        if (d < nd) { nd = d; nearest = u; }
                    }
                });
                if (nearest) {
                    const dirToNearest = Math.sign(nearest.x - this.x) || -1;
                    if (nd > 60) {
                        this.x += this.speed * dirToNearest;
                        this.el.classList.add('walking');
                    } else {
                        // if already close enough, attempt attacks via the existing attack timing
                        if (now - this.lastAtk > 1200) {
                            if (Math.random() < 0.35) this.flameAttack(nearest);
                            else this.meleeAttack(nearest);
                            this.lastAtk = now;
                        }
                    }
                }
            } else {
                // no player units alive -> move toward player's castle
                const enemyDir = -1; // boss is enemy so moves left
                this.x += this.speed * enemyDir;
                this.el.classList.add('walking');
            }
        }

        // determine facing toward the primary target (if available) and set correct gif
        const img = this.el.querySelector(`#bossImg-${this.id}`);
        if (img) {
            if (target) {
                const dir = Math.sign(target.x - this.x) || -1;
                img.src = (dir >= 0) ? this._gifRight : this._gifLeft;
            } else {
                // revert to facing based on current movement/prevX after attack
                const moveDelta = this.x - prevX;
                if (moveDelta > 0.5) {
                    // moving right -> show right-facing static attack/frame
                    img.src = this._gifRight;
                } else if (moveDelta < -0.5) {
                    // moving left -> show left-facing
                    img.src = this._gifLeft;
                }
            }
        }

        // clamp on battlefield
        const leftLimit = 80;
        const rightLimit = Math.max(120, gameScreen.clientWidth - 80);
        this.x = Math.max(leftLimit, Math.min(this.x, rightLimit));
        this.updatePos();

        // store prevX for next frame
        this.prevX = this.x;
    }

    meleeAttack(target) {
        // determine facing toward target and set correct melee gif (use left/right attack gifs)
        const img = this.el.querySelector(`#bossImg-${this.id}`);
        const dir = target ? Math.sign(target.x - this.x) : -1;
        const attackGif = (dir >= 0) ? this._gifRight : this._gifLeft;
        if (img) {
            img.src = attackGif;
            // revert after attack animation; pick revert based on recent movement direction
            // keep attack GIF visible slightly longer for clearer animation
            setTimeout(()=> {
                const moveDelta = (this.prevX !== undefined) ? (this.x - this.prevX) : 0;
                const revertGif = (moveDelta > 0.5) ? this._gifRight : this._gifLeft;
                img.src = revertGif;
            }, 900);
        }
        Effects.playSwordSfx();
        setTimeout(()=> {
            if (target && !target.dead) target.takeDamage(this.atk);
        }, 320);
    }

    flameAttack(targetForDirection) {
        // determine facing toward the primary target (if available) and set correct flame gif (left/right flame variants)
        const img = this.el.querySelector(`#bossImg-${this.id}`);
        const dir = targetForDirection ? Math.sign(targetForDirection.x - this.x) : -1;
        const flameGif = (dir >= 0) ? this._flameRight : this._flameLeft;
        if (img) {
            img.src = flameGif;
            // revert after flame animation completes — leave flame GIF visible a bit longer for impact
            setTimeout(()=> {
                const moveDelta = (this.prevX !== undefined) ? (this.x - this.prevX) : 0;
                const revertGif = (moveDelta > 0.5) ? this._gifRight : this._gifLeft;
                img.src = revertGif;
            }, 1200);
        }

        // visual projectile / AOE: damage units in a cone in front (respect direction by checking relative X)
        state.units.forEach(u => {
            if (u.side === 'player' && !u.dead) {
                const dx = u.x - this.x;
                // only hit units roughly in front of the boss (same sign as dir) and within range
                if (Math.sign(dx) === Math.sign(dir) && Math.abs(dx) < 300) {
                    u.takeDamage(this.flameAtk);
                }
            }
        });
        // damage player castle as well
        state.playerHp -= this.flameAtk;
        updateCastleUI();
        Effects.createDamagePopup(this.flameAtk, 60, 300);
    }

    takeDamage(amt) {
        this.hp -= amt;
        Effects.createDamagePopup(amt, this.x, this.y);
        const pct = Math.max(0, (this.hp / this.maxHp) * 100);
        const bar = this.el.querySelector('.hp-fill');
        if (bar) bar.style.width = `${pct}%`;
        if (this.hp <= 0 && !this.dead) {
            this.dead = true;
            // play boss-death SFX and trigger explosion/visual impact
            try {
                // try specific boss death audio first
                const bossDeath = document.getElementById('bossDeathSfx');
                if (bossDeath) {
                    bossDeath.currentTime = 0;
                    bossDeath.muted = !!window.audioMuted;
                    bossDeath.volume = 0.95;
                    bossDeath.play().catch(()=>{});
                } else {
                    // fallback to generic death SFX
                    Effects.playDeathSfx();
                }
            } catch(e) { /* ignore audio errors */ }

            // Trigger the dedicated boss death visual/audio impact at boss position
            try {
                Effects.bossDeathEffect(this.x + (this.el ? (this.el.clientWidth/2) : 0), this.y + (this.el ? (this.el.clientHeight/2) : 0));
            } catch(e) { /* ignore */ }

            // remove boss element and apply impactful visual effects to the enemy castle
            this.el.remove();
            state.units = state.units.filter(u => u !== this);

            // NOTE: Do NOT explode the enemy castle here — castle should only collapse when its HP reaches zero.
            // Removed unconditional explosion on boss death to respect castle HP behavior.

            // notify and reward
            Effects.showNotify('魔王騎士已被擊潰！', 'success');
            state.score += this.scoreVal;
            updateUI();
            checkGameOver();
        }
    }
}

// ----------------------------------------------------
// 遊戲核心邏輯 (unchanged)
// ----------------------------------------------------
function spawnUnit(type, side) {
    if (side === 'player') {
        const cost = UNITS[type].cost;
        if (state.score < cost) {
            showNotify('金幣不足！');
            return;
        }
        state.score -= cost;
        updateUI();
    }
    state.units.push(new Unit(type, side));
}

function evolve(type) {
    const currentLevel = state.playerLevels[type];
    const cost = getEvolveCost(type, currentLevel);
    
    if(state.score < cost) {
        showNotify('金幣不足以進化！');
        return;
    }

    // 直接執行進化（移除確認跳窗）
    state.score -= cost;
    state.playerLevels[type]++;
    updateUI();
    showNotify(`${UNITS[type].name} 進化至 Lv.${state.playerLevels[type]}！戰力提升！`, 'success');

    state.units.forEach(u => {
        if(u.side === 'player' && u.type === type) {
            u.upgrade();
            Effects.createDamagePopup("EVOLVED!", u.x, u.y - 20);
        }
    });
}

function enemyEvolve() {
    state.enemyLevels.infantry++;
    state.enemyLevels.archer++;
    state.enemyLevels.cavalry++;
    
    showNotify("⚠️ 警告：敵軍勢力已全面進化！", 'warning');
    
    state.units.forEach(u => {
        if(u.side === 'enemy') {
            u.upgrade();
            Effects.createDamagePopup("UPGRADE!", u.x, u.y - 20);
        }
    });
}

function castleLogic(now) {
    if (now - state.lastPlayerCastleAttack > CONFIG.castleFireRate) {
        const target = state.units.find(u => u.side === 'enemy' && u.x < 100 + CONFIG.castleRange && !u.dead);
        if (target) {
            Effects.createProjectile(80, 250, target.x, target.y + 20, 'castle');
            state.lastPlayerCastleAttack = now;
            setTimeout(() => target.takeDamage(CONFIG.castleDamage), 300);
        }
    }
    if (now - state.lastEnemyCastleAttack > CONFIG.castleFireRate) {
        const target = state.units.find(u => u.side === 'player' && u.x > gameScreen.clientWidth - 100 - CONFIG.castleRange && !u.dead);
        if (target) {
            Effects.createProjectile(gameScreen.clientWidth - 80, 250, target.x, target.y + 20, 'castle');
            state.lastEnemyCastleAttack = now;
            setTimeout(() => target.takeDamage(CONFIG.castleDamage), 300);
        }
    }
}

function gameLoop() {
    if (!state.running) return;
    const now = Date.now();
    state.units.forEach(u => u.update(now));
    castleLogic(now);
    Quiz.handleQuizTimer(now, state, QUIZ_QUESTIONS, updateUI); // delegate to quiz module
    requestAnimationFrame(gameLoop);
}

// ----------------------------------------------------
// 題目系統 (moved to quiz.js; main delegates)
// ----------------------------------------------------
// removed handleQuizTimer() {}
// removed getRandomQuestion() {}
// removed openRandomQuiz() {}
// removed handleQuizAnswer() {}

// ----------------------------------------------------
// UI 更新 (mostly unchanged; some functions referenced by modules)
// ----------------------------------------------------
function updateUI() {
    $('scoreDisplay').textContent = Math.floor(state.score);
    
    ['infantry', 'archer', 'cavalry'].forEach(t => {
        const level = state.playerLevels[t];
        const nextCost = getEvolveCost(t, level);
        const stats = getUnitStats(t, level);
        const key = t.charAt(0).toUpperCase() + t.slice(1);
        $('cost' + key).textContent = Math.floor(nextCost);
        $('evolve' + key).disabled = state.score < nextCost;
        $('lv' + key).textContent = `Lv.${level}`;
        $('hp' + key).textContent = Math.floor(stats.maxHp);
    });
}

function updateCastleUI() {
    const pPct = Math.max(0, (state.playerHp / CONFIG.castleMaxHp) * 100);
    $('playerHpBar').style.width = pPct + '%';
    $('playerHpText').textContent = Math.max(0, Math.floor(state.playerHp)) + '/' + CONFIG.castleMaxHp;

    const ePct = Math.max(0, (state.enemyHp / CONFIG.castleMaxHp) * 100);
    $('enemyHpBar').style.width = ePct + '%';
    $('enemyHpText').textContent = Math.max(0, Math.floor(state.enemyHp)) + '/' + CONFIG.castleMaxHp;
}

// expose UI/update/check functions so effects can call them (used by triggerSwordRain and other effects)
window.updateCastleUI = updateCastleUI;
window.checkGameOver = checkGameOver;

function showNotify(msg, type='info') {
    return Effects.showNotify(msg, type);
}

function checkGameOver() {
    if (!state.running) return;

    if (state.playerHp <= 0 || state.enemyHp <= 0) {
        state.running = false;

        // Ensure any open quiz is closed so it won't overlap end modal
        Quiz.closeQuizUI();

        const gameOverModal = $('gameOverModal');
        const endTitle = $('endTitle');
        const endMessage = $('endMessage');

        // play appropriate end SFX
        try {
            // Pause and reset all audio elements to ensure only the final SFX plays
            const audios = Array.from(document.querySelectorAll('audio'));
            audios.forEach(a => {
                try {
                    a.pause();
                    a.currentTime = 0;
                } catch (e) { /* ignore */ }
            });

            const victory = document.getElementById('victorySfx');
            const defeat = document.getElementById('defeatSfx');
            if (state.playerHp > 0 && state.enemyHp <= 0) {
                if (victory) {
                    // play a short looping happy celebration, then stop after a few seconds
                    try {
                        victory.currentTime = 0;
                        victory.volume = 1.0;
                        victory.loop = true;
                        victory.play().catch(()=>{});
                        // keep it looping briefly for a continuous celebratory feel, then stop
                        setTimeout(() => {
                            try { victory.pause(); victory.currentTime = 0; victory.loop = false; } catch(e) {}
                        }, 3800);
                    } catch(e) { /* ignore audio errors */ }
                }
            } else {
                if (defeat) {
                    defeat.currentTime = 0;
                    defeat.volume = 1.0;
                    defeat.play().catch(()=>{});
                }
            }
        } catch(e) {
            // ignore audio errors
        }

        // Trigger castle collapse visuals & collapse SFX only if that castle's HP is zero or below
        try {
            if (state.enemyHp <= 0) {
                const enemyCastleEl = $('enemyCastle');
                if (enemyCastleEl) {
                    // play collapse SFX (use unit death SFX as collapse/崩潰 sound)
                    try {
                        const collapseSfx = document.getElementById('deathSfx');
                        if (collapseSfx) {
                            collapseSfx.currentTime = 0;
                            collapseSfx.muted = !!window.audioMuted;
                            collapseSfx.volume = 0.95;
                            collapseSfx.play().catch(()=>{});
                        }
                    } catch (e) {}
                    Effects.explodeCastle(enemyCastleEl);
                }
            }
            if (state.playerHp <= 0) {
                const playerCastleEl = $('playerCastle');
                if (playerCastleEl) {
                    try {
                        const collapseSfx = document.getElementById('deathSfx');
                        if (collapseSfx) {
                            collapseSfx.currentTime = 0;
                            collapseSfx.muted = !!window.audioMuted;
                            collapseSfx.volume = 0.95;
                            collapseSfx.play().catch(()=>{});
                        }
                    } catch (e) {}
                    Effects.explodeCastle(playerCastleEl);
                }
            }
        } catch(e) {
            // ignore visual errors
        }

        if (state.playerHp <= 0 && state.enemyHp <= 0) {
            endTitle.textContent = '平局';
            endMessage.textContent = '雙方城堡同時被摧毀，羅馬的命運仍舊懸而未決。';
        } else if (state.playerHp <= 0) {
            endTitle.textContent = 'DEFEAT';
            endMessage.textContent = '你未能守住羅馬，敵軍奪下城堡。下次用更精準的判斷捲土重來！';
        } else {
            endTitle.textContent = '勝利屬於你！';
            endMessage.innerHTML = ''
                + '<p class="mb-2">你完成了凱薩未能親眼看到的未來。你以智慧而非暴力、以選擇而非命令，帶領羅馬走向新的秩序。</p>'
                + '<p>🎉 過關成功！ 領袖魅力能凝聚人心，也可能危險。 唯有制度與理性，才能讓民主不被情緒帶走。</p>';
        }

        gameOverModal.classList.remove('hidden');

        // Removed forced castle explosion so enemy castle remains until its HP hits zero
        // Effects.explodeCastle(state.playerHp <= 0 ? $('playerCastle') : $('enemyCastle'));
    }
}

const enemyTimerEl = $('enemyTimer');

function startEnemyTimer() {
    setInterval(() => {
        if (!state.running) return;
        state.enemyTimer--;
        if (state.enemyTimer <= 0) {
            enemyEvolve();
            state.enemyTimer = CONFIG.enemyEvolveInterval;
        }
        // boss countdown
        if (!state.bossSpawned) {
            state.bossTimer--;
            if (state.bossTimer <= 0) {
                // spawn boss
                state.bossSpawned = true;
                const boss = new Boss();
                state.units.push(boss);
                // play boss spawn SFX (respect global mute)
                try {
                    const bossSfx = document.getElementById('bossSpawnSfx');
                    if (bossSfx) {
                        bossSfx.currentTime = 0;
                        bossSfx.muted = !!window.audioMuted;
                        bossSfx.volume = 0.95;
                        bossSfx.play().catch(()=>{});
                    }
                } catch(e) { /* ignore audio errors */ }
                boss.spawnDrop();
                // reset boss timer far in future to avoid respawn
                state.bossTimer = Math.max(999999, CONFIG.bossCountdown);
            }
        }
        if (enemyTimerEl) {
            enemyTimerEl.textContent = state.enemyTimer;
        }
        // (optionally show boss timer in same UI as enemyTimer by appending)
        const bossTimerEl = document.getElementById('enemyTimer');
        if (bossTimerEl) {
            // display as "evolve: Xs | BOSS: Ys" in same element (keeps UI compact)
            bossTimerEl.textContent = `${state.enemyTimer} / B:${state.bossSpawned ? '—' : state.bossTimer}`;
        }
    }, 1000);
}

function enemySpawnLoop() {
    if (!state.running) return;

    const types = ['infantry', 'archer', 'cavalry'];
    const type = types[randInt(0, types.length - 1)];
    spawnUnit(type, 'enemy');

    setTimeout(enemySpawnLoop, CONFIG.enemySpawnRate);
}

function setupControls() {
    const spawnInfantryBtn = $('spawnInfantry');
    const spawnArcherBtn = $('spawnArcher');
    const spawnCavalryBtn = $('spawnCavalry');

    const iconInfantry = $('iconInfantry');
    const iconArcher = $('iconArcher');
    const iconCavalry = $('iconCavalry');

    const evolveInfantryBtn = $('evolveInfantry');
    const evolveArcherBtn = $('evolveArcher');
    const evolveCavalryBtn = $('evolveCavalry');

    if (spawnInfantryBtn) spawnInfantryBtn.onclick = () => spawnUnit('infantry', 'player');
    if (spawnArcherBtn) spawnArcherBtn.onclick = () => spawnUnit('archer', 'player');
    if (spawnCavalryBtn) spawnCavalryBtn.onclick = () => spawnUnit('cavalry', 'player');

    // make icons also spawn units (same as pressing the spawn buttons)
    if (iconInfantry) iconInfantry.addEventListener('click', () => spawnUnit('infantry', 'player'));
    if (iconArcher) iconArcher.addEventListener('click', () => spawnUnit('archer', 'player'));
    if (iconCavalry) iconCavalry.addEventListener('click', () => spawnUnit('cavalry', 'player'));

    if (evolveInfantryBtn) evolveInfantryBtn.onclick = () => evolve('infantry');
    if (evolveArcherBtn) evolveArcherBtn.onclick = () => evolve('archer');
    if (evolveCavalryBtn) evolveCavalryBtn.onclick = () => evolve('cavalry');

    const restartButton = $('restartButton');
    if (restartButton) {
        restartButton.onclick = () => window.location.reload();
    }

    const musicToggle = $('musicToggle');
    const bgMusic = $('bgMusic');

    // initialize button state according to window.audioMuted
    if (musicToggle) {
        // ensure icon reflects current mute state
        if (window.audioMuted) {
            musicToggle.classList.remove('bg-purple-500');
            musicToggle.classList.add('bg-gray-400');
            musicToggle.innerHTML = '<i data-lucide="volume-x" class="w-3 h-3"></i>';
        } else {
            musicToggle.classList.remove('bg-gray-400');
            musicToggle.classList.add('bg-purple-500');
            musicToggle.innerHTML = '<i data-lucide="volume-2" class="w-3 h-3"></i>';
        }
        try { lucide.createIcons(); } catch(e) {}

        musicToggle.addEventListener('click', () => {
            // flip global mute state for all audio elements
            setAudioMuted(!window.audioMuted);

            // if unmuting and bgMusic exists, attempt to resume background music
            if (!window.audioMuted && bgMusic) {
                try {
                    bgMusic.play().catch(()=>{});
                } catch(e) {}
            }
        });
    }

    // ensure background music respects global mute on start
    if (bgMusic) {
        bgMusic.muted = window.audioMuted;
    }

    const startGameBtn = $('startGameBtn');
    const introModal = $('introModal');
    if (startGameBtn && introModal) {
        startGameBtn.addEventListener('click', () => {
            introModal.classList.add('hidden');
            if (!state.running) {
                state.running = true;
                startEnemyTimer();
                enemySpawnLoop();
                gameLoop();
            }
        });
    }
}

function init() {
    // populate castle SVGs from template to avoid duplicated markup and to allow easy theming
    const tmpl = document.getElementById('castleTemplate');
    if (tmpl) {
        const playerCastle = document.getElementById('playerCastle');
        const enemyCastle = document.getElementById('enemyCastle');
        if (playerCastle) {
            const clone = tmpl.content.cloneNode(true);
            // set player colors
            clone.querySelector('.castle-main').setAttribute('fill', '#3b82f6');
            clone.querySelector('.castle-main').setAttribute('stroke', '#1e3a8a');
            clone.querySelector('.castle-tower').setAttribute('fill', '#60a5fa');
            clone.querySelector('.castle-tower').setAttribute('stroke', '#1e3a8a');
            clone.querySelector('.castle-left').setAttribute('fill', '#60a5fa');
            clone.querySelector('.castle-left').setAttribute('stroke', '#1e3a8a');
            clone.querySelector('.castle-right').setAttribute('fill', '#60a5fa');
            clone.querySelector('.castle-right').setAttribute('stroke', '#1e3a8a');
            clone.querySelector('.castle-base').setAttribute('fill', '#1e3a8a');
            playerCastle.appendChild(clone);
        }
        if (enemyCastle) {
            const clone2 = tmpl.content.cloneNode(true);
            // set enemy colors
            clone2.querySelector('.castle-main').setAttribute('fill', '#ef4444');
            clone2.querySelector('.castle-main').setAttribute('stroke', '#7f1d1d');
            clone2.querySelector('.castle-tower').setAttribute('fill', '#f87171');
            clone2.querySelector('.castle-tower').setAttribute('stroke', '#7f1d1d');
            clone2.querySelector('.castle-left').setAttribute('fill', '#f87171');
            clone2.querySelector('.castle-left').setAttribute('stroke', '#7f1d1d');
            clone2.querySelector('.castle-right').setAttribute('fill', '#f87171');
            clone2.querySelector('.castle-right').setAttribute('stroke', '#7f1d1d');
            clone2.querySelector('.castle-base').setAttribute('fill', '#450a0a');
            enemyCastle.appendChild(clone2);
        }
    }

    updateUI();
    updateCastleUI();
    setupControls();

    // Title splash controls
    const titleModal = document.getElementById('titleModal');
    const titleStartBtn = document.getElementById('titleStartBtn');
    const skipTitleBtn = document.getElementById('skipTitleBtn');
    const titleSfx = document.getElementById('titleSfx');
    const startPulseSfx = document.getElementById('startPulseSfx');
    const introModal = document.getElementById('introModal');

    // simple sparkle animation injection
    const sparkParent = document.getElementById('titleSparkles');
    if (sparkParent) {
        for (let i = 0; i < 8; i++) {
            const sp = document.createElement('div');
            sp.textContent = '✦';
            sp.style.opacity = '0.9';
            sp.style.display = 'inline-block';
            sp.style.margin = '0 6px';
            sp.style.transform = `translateY(${Math.random()*6 - 3}px) scale(${0.9 + Math.random()*0.4})`;
            sp.style.transition = `transform ${800 + i*40}ms ease-in-out`;
            sparkParent.appendChild(sp);
            setInterval(() => {
                sp.style.transform = `translateY(${Math.random()*10 - 5}px) scale(${0.9 + Math.random()*0.4})`;
            }, 700 + i*60);
        }
    }

    function showIntroFromTitle() {
        if (titleModal) titleModal.classList.add('hidden');
        if (introModal) introModal.classList.remove('hidden');
        // play a short pulse SFX for transition
        if (startPulseSfx) {
            startPulseSfx.currentTime = 0;
            startPulseSfx.play().catch(()=>{});
        }

        // ensure background music starts (best-effort; user gesture may be required on some devices)
        const bgMusicEl = document.getElementById('bgMusic');
        if (bgMusicEl) {
            try {
                bgMusicEl.loop = true;
                bgMusicEl.volume = 0.42; // sensible default volume
                bgMusicEl.currentTime = 0;
                bgMusicEl.play().catch(() => { /* ignore autoplay restrictions */ });
            } catch (e) {
                // ignore
            }
        }
    }

    // auto-play title SFX (best-effort; user gesture may be required on some devices)
    if (titleSfx) {
        titleSfx.currentTime = 0;
        titleSfx.play().catch(()=>{ /* ignore autoplay restrictions */ });
    }

    if (titleStartBtn) {
        titleStartBtn.addEventListener('click', () => {
            // play small click and then show intro
            if (titleSfx) { titleSfx.pause(); titleSfx.currentTime = 0; }
            showIntroFromTitle();
        });
    }
    if (skipTitleBtn) {
        skipTitleBtn.addEventListener('click', () => {
            if (titleSfx) { titleSfx.pause(); titleSfx.currentTime = 0; }
            showIntroFromTitle();
        });
    }

    // keep original behavior: game loop starts when pressing '冒險開始' inside introModal
    // 遊戲從開場故事開始，按下「冒險開始」後才啟動循環
}

window.addEventListener('load', init);