// moved visual and audio effect helpers here (do not import main state to avoid circular module dependency)
// effects reference shared state at runtime via window.state when needed

export function spawnCastleSpark(castleContainerEl, color = '#facc15') {
    const spark = document.createElement('div');
    spark.className = 'castle-spark';
    spark.style.position = 'absolute';
    spark.style.left = '50%';
    spark.style.transform = 'translateX(-50%)';
    spark.style.top = '-32px';
    spark.style.zIndex = 80;
    spark.style.pointerEvents = 'none';
    spark.style.width = '8px';
    spark.style.height = '8px';
    spark.style.borderRadius = '50%';
    spark.style.background = color;
    spark.style.boxShadow = `0 0 10px ${color}, 0 0 20px ${color}`;
    castleContainerEl.appendChild(spark);

    spark.animate([
        { transform: 'translateX(-50%) translateY(0) scale(0.6)', opacity: 1 },
        { transform: 'translateX(-50%) translateY(-30px) scale(1.6)', opacity: 0 }
    ], { duration: 700, easing: 'cubic-bezier(.2,.9,.2,1)' }).onfinish = () => spark.remove();
}

export function createProjectile(x1, y1, x2, y2, side, scale = 1) {
    const unitLayer = document.getElementById('unitLayer');
    const el = document.createElement('div');
    el.className = 'projectile';
    el.textContent = side === 'player' || side === 'castle' ? '🏹' : '🗡️';
    if(side === 'castle') el.textContent = '🏹';

    el.style.fontSize = (20 * scale) + 'px';
    el.style.left = x1 + 'px';
    el.style.top = y1 + 'px';
    unitLayer.appendChild(el);

    const dx = x2 - x1;
    const dy = y2 - y1;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI;
    el.style.transform = `rotate(${angle}deg)`;

    const anim = el.animate([
        { left: x1 + 'px', top: y1 + 'px', transform: `rotate(${angle}deg)` },
        { left: x2 + 'px', top: y2 + 'px', transform: `rotate(${angle}deg) scale(0.9)` }
    ], { duration: 300, easing: 'linear' });

    anim.onfinish = () => el.remove();
}

export function createDamagePopup(dmg, x, y) {
    const unitLayer = document.getElementById('unitLayer');
    const el = document.createElement('div');
    el.className = 'damage-popup';
    const textContent = typeof dmg === 'number' ? '-' + Math.floor(dmg) : dmg;
    el.textContent = textContent;
    el.style.left = (x + Math.random()*20 - 10) + 'px';
    el.style.top = (y - 30) + 'px';
    const fontSize = typeof dmg === 'number' ? Math.min(2, 1 + dmg / 200) + 'rem' : '1.5rem';
    el.style.fontSize = fontSize;
    unitLayer.appendChild(el);
    setTimeout(() => el.remove(), 800);
}

export function explodeCastle(castleEl) {
    if(!castleEl) return;
    castleEl.classList.add('exploding');
    const rect = castleEl.getBoundingClientRect();
    for(let i=0; i<30; i++) {
        const p = document.createElement('div');
        p.className = 'explosion-particle';
        const tx = (Math.random() - 0.5) * 300 + 'px';
        const ty = (Math.random() - 0.5) * 300 + 'px';
        p.style.setProperty('--tx', tx);
        p.style.setProperty('--ty', ty);
        p.style.left = (rect.width/2) + 'px';
        p.style.top = (rect.height/2) + 'px';
        castleEl.appendChild(p);
    }
}

export function applyCorrectBuff() {
    const allies = window.state.units.filter(u => u.side === 'player' && !u.dead);
    const healAmountForCastle = Math.floor((window.CONFIG ? window.CONFIG.castleMaxHp : 2000) * 0.05);

    // play the glowing SFX (uses the <audio id="startPulseSfx"> asset if present)
    try {
        const glowSfx = document.getElementById('startPulseSfx');
        if (glowSfx) {
            glowSfx.currentTime = 0;
            // respect global mute flag if available
            glowSfx.muted = !!window.audioMuted;
            glowSfx.volume = 0.9;
            glowSfx.play().catch(()=>{});
        }
    } catch(e) { /* ignore audio errors */ }

    allies.forEach(u => {
        u.healPercent((window.CONFIG && window.CONFIG.buffHealRate) || 0.35);
        u.el.classList.add('unit-buff');
        u.el.style.transition = 'transform 0.25s ease, box-shadow 0.25s ease';
        u.el.style.transform += ' translateY(-4px) scale(1.06)';
        u.el.style.filter = 'drop-shadow(0 6px 18px rgba(250,250,150,0.9))';
        setTimeout(() => {
            if (u.el) {
                u.el.classList.remove('unit-buff');
                u.el.style.transform = u.el.style.transform.replace(' translateY(-4px) scale(1.06)', '');
                u.el.style.filter = '';
            }
        }, 1200);
    });

    const playerCastleContainer = document.getElementById('playerCastleContainer');
    if (playerCastleContainer) {
        for (let i = 0; i < 6; i++) {
            setTimeout(() => spawnCastleSpark(playerCastleContainer, i % 2 === 0 ? '#fff59d' : '#fca5a5'), i * 80);
        }
        const castleEl = document.getElementById('playerCastle');
        if (castleEl) {
            castleEl.classList.add('castle-hit');
            castleEl.style.transition = 'filter 0.5s, transform 0.5s';
            castleEl.style.filter = 'drop-shadow(0 0 18px rgba(250,235,104,0.9))';
            castleEl.style.transform = 'translateY(-6px) scale(1.02)';
            setTimeout(() => {
                castleEl.style.filter = '';
                castleEl.style.transform = '';
                castleEl.classList.remove('castle-hit');
            }, 900);
        }

        if (window.state) {
            window.state.playerHp = Math.min((window.CONFIG ? window.CONFIG.castleMaxHp : 2000), (window.state.playerHp || 0) + healAmountForCastle);
            // UI update is performed by main update functions
        }
    }

    if (allies.length === 0 && window.state) {
        window.state.playerHp = Math.min((window.CONFIG ? window.CONFIG.castleMaxHp : 2000), (window.state.playerHp || 0) + 200 + healAmountForCastle);
    }
}

export function applyWrongPenalty() {
    if (window.state) {
        window.state.playerHp -= (window.CONFIG ? window.CONFIG.wrongPenalty : 200);
    }
    createDamagePopup((window.CONFIG ? window.CONFIG.wrongPenalty : 200), 60, 300);
    const castle = document.getElementById('playerCastle');
    if (castle) {
        castle.classList.add('castle-hit');
        setTimeout(() => castle.classList.remove('castle-hit'), 400);
    }
}

export function triggerSwordRain() {
    const gameScreen = document.getElementById('gameScreen');
    const width = gameScreen.clientWidth;
    const swordsCount = 18;

    // play looping sword-rain SFX for the duration of the visual effect
    try {
        const sfx = document.getElementById('swordRainSfx');
        if (sfx) {
            sfx.currentTime = 0;
            sfx.loop = true;
            sfx.volume = 0.85;
            sfx.play().catch(()=>{});
        }
        // ensure stop after a short buffer (max animation ~900ms)
        setTimeout(() => {
            if (sfx) {
                try { sfx.pause(); sfx.currentTime = 0; sfx.loop = false; } catch(e){ }
            }
        }, 1200);
    } catch(e) {
        // ignore audio errors
    }

    for (let i = 0; i < swordsCount; i++) {
        const span = document.createElement('div');
        span.className = 'sword-rain';
        span.textContent = '⚔️';
        const startX = Math.floor(Math.random() * (width - 40));
        span.style.left = `${startX}px`;
        document.getElementById('unitLayer').appendChild(span);
        span.animate(
            [
                { transform: `translateY(0) rotate(0deg)` },
                { transform: `translateY(${gameScreen.clientHeight}px) rotate(20deg)` }
            ],
            { duration: 500 + Math.random()*200, easing: 'linear', delay: Math.random()*200 }
        ).onfinish = () => span.remove();
    }

    // damage enemies
    if (window.state) {
        window.state.units.forEach(u => {
            if (u.side === 'enemy' && !u.dead) {
                u.takeDamage((window.CONFIG ? window.CONFIG.swordRainDamageUnit : 180));
            }
        });
        window.state.enemyHp -= (window.CONFIG ? window.CONFIG.swordRainDamageCastle : 250);
    }
    createDamagePopup((window.CONFIG ? window.CONFIG.swordRainDamageCastle : 250), document.getElementById('gameScreen').clientWidth - 60, 280);

    // ensure UI reflects castle damage and check for game over immediately
    try {
        if (typeof window.updateCastleUI === 'function') window.updateCastleUI();
        if (typeof window.checkGameOver === 'function') window.checkGameOver();
    } catch (e) { /* ignore */ }
}

// play melee / sword sound effect (best-effort: use existing audio element or create new Audio)
export function playSwordSfx() {
    try {
        const el = document.getElementById('swordSfx');
        if (el) {
            el.currentTime = 0;
            el.play().catch(()=>{ /* ignore autoplay restrictions */ });
            return;
        }
        // fallback
        const s = new Audio('https://www.fesliyanstudios.com/play-mp3/4547');
        s.volume = 0.9;
        s.play().catch(()=>{});
    } catch(e) {
        // ignore
    }
}

// play short hurt / "ah" sound when player units or castle are damaged
export function playHurtSfx() {
    try {
        const el = document.getElementById('hurtSfx');
        if (el) {
            el.currentTime = 0;
            el.volume = 0.9;
            el.play().catch(()=>{ /* ignore autoplay restrictions */ });
            return;
        }
        const s = new Audio('https://www.fesliyanstudios.com/play-mp3/6615');
        s.volume = 0.9;
        s.play().catch(()=>{});
    } catch(e) {
        // ignore
    }
}

// play short correct / wrong feedback SFX using local assets if available
export function playCorrectSfx() {
    try {
        const el = document.getElementById('correctSfx');
        if (el) {
            el.currentTime = 0;
            el.volume = 1.0;
            el.play().catch(()=>{});
            return;
        }
        const s = new Audio('./答對音效.mp3');
        s.volume = 1.0;
        s.play().catch(()=>{});
    } catch(e) { /* ignore */ }
}

export function playWrongSfx() {
    try {
        const el = document.getElementById('wrongSfx');
        if (el) {
            el.currentTime = 0;
            el.volume = 1.0;
            el.play().catch(()=>{});
            return;
        }
        const s = new Audio('./答錯音效.mp3');
        s.volume = 1.0;
        s.play().catch(()=>{});
    } catch(e) { /* ignore */ }
}

// play unit death SFX
export function playDeathSfx() {
    try {
        const el = document.getElementById('deathSfx');
        if (el) {
            el.currentTime = 0;
            el.volume = 1.0;
            el.play().catch(()=>{});
            return;
        }
        const s = new Audio('./死亡音效.mp3');
        s.volume = 1.0;
        s.play().catch(()=>{});
    } catch(e) { /* ignore */ }
}

// screen shake helper: translates the gameScreen root for duration (ms)
export function screenShake(duration = 1000, magnitude = 8) {
    try {
        const el = document.getElementById('gameScreen');
        if(!el) return;
        const start = performance.now();
        const frame = (now) => {
            const t = now - start;
            if (t >= duration) {
                el.style.transform = '';
                return;
            }
            const progress = 1 - t / duration;
            const x = (Math.random() * 2 - 1) * magnitude * progress;
            const y = (Math.random() * 2 - 1) * magnitude * progress;
            el.style.transform = `translate(${x}px, ${y}px)`;
            requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
    } catch(e) {}
}

// flash overlay helper: bright white flash over gameScreen
export function screenFlash(duration = 1000) {
    try {
        let overlay = document.getElementById('_screenFlashOverlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = '_screenFlashOverlay';
            overlay.style.position = 'absolute';
            overlay.style.inset = '0';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = 9999;
            overlay.style.background = 'rgba(255,255,255,0)';
            document.getElementById('gameScreen').appendChild(overlay);
        }
        overlay.style.transition = `background ${duration/2}ms ease`;
        overlay.style.background = 'rgba(255,255,255,0.95)';
        setTimeout(() => {
            overlay.style.background = 'rgba(255,255,255,0)';
        }, duration/2);
    } catch(e) {}
}

export function showNotify(msg, type='info') {
    const el = document.getElementById('notification');
    if(!el) return;
    el.textContent = msg;
    if(type === 'warning') {
        el.className = "absolute left-1/2 transform -translate-x-1/2 bg-red-100 border-l-4 border-red-500 text-red-700 p-2 md:p-4 rounded shadow-lg z-50 transition-opacity duration-300 font-bold text-base md:text-2xl whitespace-nowrap animate-bounce";
    } else if (type === 'success') {
        el.className = "absolute left-1/2 transform -translate-x-1/2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 md:p-4 rounded shadow-lg z-50 transition-opacity duration-300 font-bold text-base md:text-lg whitespace-nowrap";
    } else {
        el.className = "absolute left-1/2 transform -translate-x-1/2 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-2 md:p-4 rounded shadow-lg z-50 transition-opacity duration-300 font-bold text-base md:text-lg whitespace-nowrap";
    }
    el.style.top = 'auto';
    el.style.bottom = (window.innerHeight < 640 ? '180px' : '220px');
    el.style.opacity = '1';
    setTimeout(() => {
        el.style.opacity = '0';
    }, 1500);
}

// New: boss death impact effect (visual burst + shake + flash + big popup + play boss-death audio)
export function bossDeathEffect(x = null, y = null) {
    try {
        const unitLayer = document.getElementById('unitLayer');
        if (!unitLayer) return;

        // play boss death SFX if present
        try {
            const sfx = document.getElementById('bossDeathSfx');
            if (sfx) {
                sfx.currentTime = 0;
                sfx.muted = !!window.audioMuted;
                sfx.volume = 1.0;
                sfx.play().catch(()=>{});
            }
        } catch(e) {}

        // screen shake + flash
        screenShake(900, 14);
        screenFlash(900);

        // compute center position fallback to center of screen
        const gs = document.getElementById('gameScreen');
        const centerX = x !== null ? x : (gs.clientWidth / 2);
        const centerY = y !== null ? y : (gs.clientHeight / 2);

        // big damage popup
        createDamagePopup('魔王崩潰!', centerX, centerY - 40);

        // spawn many particles around the boss position
        const particleCount = 40;
        for (let i = 0; i < particleCount; i++) {
            const p = document.createElement('div');
            p.className = 'explosion-particle';
            // larger particles for boss explosion
            p.style.width = (8 + Math.random() * 16) + 'px';
            p.style.height = p.style.width;
            const angle = Math.random() * Math.PI * 2;
            const dist = 40 + Math.random() * 180;
            const tx = Math.cos(angle) * dist + 'px';
            const ty = Math.sin(angle) * dist + 'px';
            p.style.setProperty('--tx', tx);
            p.style.setProperty('--ty', ty);
            // position relative to unitLayer: convert world coordinates to layer coords
            // unitLayer is positioned absolute inset-0, so left/top correspond to viewport.
            p.style.left = (centerX - 10 + (Math.random()*16 - 8)) + 'px';
            p.style.top = (centerY - 10 + (Math.random()*16 - 8)) + 'px';
            p.style.background = (Math.random() < 0.5) ? '#ffb74d' : '#ff7043';
            p.style.borderRadius = '50%';
            p.style.zIndex = 999;
            unitLayer.appendChild(p);
            // remove after animation completes
            setTimeout(() => {
                try { p.remove(); } catch(e) {}
            }, 900 + Math.random()*200);
        }

        // small set of bright star bursts
        for (let j=0;j<6;j++){
            setTimeout(()=>{
                spawnCastleSpark(document.getElementById('enemyCastleContainer') || gs, '#fff4e6');
            }, j*80);
        }
    } catch(e) {
        // ignore errors in visual effects
        console.error(e);
    }
}