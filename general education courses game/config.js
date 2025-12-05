// 遊戲配置、單位數值與數值輔助工具，從 main.js 拆出

// ----------------------------------------------------
// 遊戲配置
// ----------------------------------------------------
export const CONFIG = {
    castleMaxHp: 6000,
    scoreRate: 15,
    enemySpawnRate: 2500,
    castleRange: 300,
    castleDamage: 25,
    castleFireRate: 1000,
    enemyEvolveInterval: 25,
    quizMinInterval: 0,    // 題目最短間隔秒（答題後 0～3 秒內再出題）
    quizMaxInterval: 3,    // 題目最長間隔秒
    wrongPenalty: 200,     // 答錯扣我方城堡血
    buffHealRate: 0.45,    // 答對回復比例
    swordRainDamageUnit: 180,
    swordRainDamageCastle: 250,
    // BOSS 配置
    bossCountdown: 30,     // BOSS 倒數秒數
    boss: {
        name: '魔王騎士',
        maxHp: 12000,
        atk: 400,
        flameAtk: 350,
        spawnHeightOffset: -120, // starting Y offset for from-sky drop (closer to ground)
        dropDuration: 900, // ms duration for drop visual
    }
};

export const UNITS = {
    infantry: { name: '步兵', cost: 50, hp: 400, atk: 40, range: 20, speed: 1.2, score: 50, baseEvolveCost: 100 },
    archer:   { name: '弓箭手', cost: 100, hp: 200, atk: 60, range: 180, speed: 1.0, score: 75, baseEvolveCost: 150 },
    cavalry:  { name: '騎兵', cost: 150, hp: 600, atk: 100, range: 20, speed: 2.7, score: 100, baseEvolveCost: 200 },
};

export const STATS_GROWTH = {
    hp: 1.8,
    atk: 1.8,
    range: 1.1,
    scale: 1.25,
    cost: 2.0
};

// ----------------------------------------------------
// 數值輔助
// ----------------------------------------------------
export function getUnitStats(type, level) {
    const base = UNITS[type];
    return {
        maxHp: base.hp * Math.pow(STATS_GROWTH.hp, level),
        atk: base.atk * Math.pow(STATS_GROWTH.atk, level),
        range: base.range * Math.pow(STATS_GROWTH.range, level),
        scale: 1 * Math.pow(STATS_GROWTH.scale, level)
    };
}

export function getEvolveCost(type, level) {
    return UNITS[type].baseEvolveCost * Math.pow(STATS_GROWTH.cost, level);
}

export function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}