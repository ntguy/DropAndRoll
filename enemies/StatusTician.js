import { BaseEnemy } from './BaseEnemy.js';
import {
    attackAction,
    burnAction,
    defendAction,
    healAction,
    lockAction,
    nullifyAction,
    setMaxDicePerZoneAction,
    weakenAction
} from './EnemyActions.js';

const DEFAULT_MAX_DICE_PER_ZONE = 6;
const BASIC_COUNT = 1;
const BASIC_PLUS_COUNT = 2;
const ULTRA_DEFENSE_PER_REROLL = 2;
const BARRAGE_INITIAL_ATTACK = 10;
const BARRAGE_INITIAL_DEFEND = 10;
const CONTROL_EFFECT_COUNT = 1;

const BASIC_EFFECT_CONFIGS = {
    lock: {
        actionFactory: lockAction,
        buildDescription: (count) => `Lock ${formatDieCount(count)} per turn`
    },
    nullify: {
        actionFactory: nullifyAction,
        buildDescription: (count) => `Nullify ${formatDieCount(count)} per turn`
    },
    weaken: {
        actionFactory: weakenAction,
        buildDescription: (count) => `Weaken ${formatDieCount(count)} per turn`
    }
};

const BASIC_EFFECT_IDS = Object.keys(BASIC_EFFECT_CONFIGS);

const ULTRA_STATUS_DEFINITIONS = {
    defense_per_reroll: {
        id: 'defense_per_reroll',
        description: 'Gains 2 Defense per rerolled die.'
    },
    only_straights: {
        id: 'only_straights',
        description: 'Can only be damaged by Straights.'
    },
    destroy_non_combo: {
        id: 'destroy_non_combo',
        description: 'Dice outside a combo are destroyed for a turn.'
    },
    max_four_dice: {
        id: 'max_four_dice',
        description: 'Max 4 Dice per zone.'
    }
};

const ULTRA_STATUS_IDS = Object.keys(ULTRA_STATUS_DEFINITIONS);

function formatDieCount(count) {
    const safeCount = Math.max(0, count || 0);
    return `${safeCount} ${safeCount === 1 ? 'Die' : 'Dice'}`;
}

function chooseRandom(array) {
    if (!Array.isArray(array) || array.length === 0) {
        return null;
    }
    const index = Math.floor(Math.random() * array.length);
    return array[index];
}

export class StatusTicianEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Status-tician', maxHealth: 250, moves: [] });

        this.defaultMaxDicePerZone = DEFAULT_MAX_DICE_PER_ZONE;

        // Instance-level scaling tweaks for Nightmare mode
        this._isNightmare = !!this.isNightmare;
        this._barrageBaseAttack = this._isNightmare ? (BARRAGE_INITIAL_ATTACK + 2) : BARRAGE_INITIAL_ATTACK;
        this._barrageBaseDefend = this._isNightmare ? (BARRAGE_INITIAL_DEFEND + 2) : BARRAGE_INITIAL_DEFEND;
        this._barrageIncrementSeries = this._isNightmare ? [3, 4] : [2, 3];
        this._controlEffectCount = this._isNightmare ? (CONTROL_EFFECT_COUNT + 1) : CONTROL_EFFECT_COUNT;

        this.resetEncounterState();
    }

    resetEncounterState() {
        this.moveIndex = 0;
        this.inBarrageMode = false;
        this.barrageMoveToggle = 0;
        this.barrageMoveCounter = 0;
        this.barrageLoopCount = 0;
        this.barrageAttackValue = this._barrageBaseAttack;
        this.barrageDefendValue = this._barrageBaseDefend;
        this.barrageIncrementSeries = Array.isArray(this._barrageIncrementSeries) ? [...this._barrageIncrementSeries] : [2, 3];
        this.barrageNextIncrementIndex = 0;

        this.activeBasicStatus = null;
        this.activeBasicEffectId = null;
        this.activeBasicTier = 'basic';

        this.activeUltraStatusIds = new Set();
        this.defensePerRerollValue = 0;
        this.onlyStraightsActive = false;
        this.destroyNonComboActive = false;
        this.currentMaxDiceTarget = null;
        this.lastAppliedMaxDiceValue = this.defaultMaxDicePerZone;
        this.pendingStatusChanges = [];

        this.setBasicStatus(this.chooseRandomBasicEffect(), 'basic');
        this.updateDerivedStatusEffects();

        this.moves = this.buildBaseMoves();
    }

    buildBaseMoves() {
        return [
            this.createGainUltraStatusMove(),
            this.createDefendBurnMove(20, 5),
            this.createAttackDefendControlMove(10, 10, 'status_tician_attack_block_control', 'Status Slam: Attack 10 + Defend 10 + Control 1 Die'),
            this.createHealCycleMove({
                key: 'status_tician_heal_cycle_minor',
                label: 'System Reboot: Heal 10 + Cycle Statuses',
                healValue: 10,
                getUltraCount: () => 1
            }),
            this.createDefendBurnMove(15, 8, true),
            this.createAttackControlMove(12, 'status_tician_attack_control', 'Vector Strike: Attack 12 + Control 1 Die'),
            this.createUpgradeBasicMove(),
            this.createDefendOnlyMove(25),
            this.createAttackDefendBurnMove(),
            this.createHealCycleMove({
                key: 'status_tician_heal_cycle_major',
                label: 'Total Recalibration: Heal 15 + Cycle Statuses',
                healValue: 15,
                getUltraCount: () => Math.max(1, this.activeUltraStatusIds.size || 1)
            }),
            this.createGainAdditionalUltraMove(),
            this.createEnterBarrageMove()
        ];
    }

    onEncounterStart() {
        this.resetEncounterState();
    }

    createGainUltraStatusMove() {
        return {
            key: 'status_tician_gain_ultra',
            label: 'Algorithm Upload: Gain a random Ultra Status',
            createActions: () => {
                this.queueStatusChange(() => this.addRandomUltraStatus({ excludeExisting: true }));
                return [];
            }
        };
    }

    createDefendBurnMove(defendValue, burnValue, invertOrder = false) {
        const defend = defendAction(defendValue);
        const burn = burnAction(burnValue);
        const actions = invertOrder ? [burn, defend] : [defend, burn];
        return {
            key: `status_tician_defend_burn_${defendValue}_${burnValue}_${invertOrder ? 'b' : 'a'}`,
            label: `Firewall Protocol: Defend ${defendValue} + Burn ${burnValue}`,
            actions
        };
    }

    createAttackDefendControlMove(attackValue, defendValue, key, label) {
        return {
            key,
            label,
            createActions: () => {
                const controlAction = this.createRandomControlAction(this._controlEffectCount || CONTROL_EFFECT_COUNT);
                return [
                    attackAction(attackValue),
                    defendAction(defendValue),
                    controlAction
                ];
            }
        };
    }

    createHealCycleMove({ key, label, healValue, getUltraCount }) {
        return {
            key,
            label,
            createActions: () => {
                this.queueStatusChange(() => {
                    this.cycleBasicStatus('basic', { ensureDifferent: true });
                    const countSource = typeof getUltraCount === 'function' ? getUltraCount() : 1;
                    const count = Math.max(1, Number.isFinite(countSource) ? Math.floor(countSource) : 1);
                    this.cycleUltraStatuses(count, { ensureDifferent: true });
                });
                return [healAction(healValue)];
            }
        };
    }

    createAttackControlMove(attackValue, key, label) {
        return {
            key,
            label,
            createActions: () => {
                const controlAction = this.createRandomControlAction(this._controlEffectCount || CONTROL_EFFECT_COUNT);
                return [
                    attackAction(attackValue),
                    controlAction
                ];
            }
        };
    }

    createUpgradeBasicMove() {
        return {
            key: 'status_tician_upgrade_basic',
            label: 'Status Upgrade: Replace Basic with Basic+ Status',
            createActions: () => {
                this.queueStatusChange(() => this.upgradeBasicStatus());
                return [];
            }
        };
    }

    createDefendOnlyMove(defendValue) {
        return {
            key: `status_tician_defend_${defendValue}`,
            label: `Shield Matrix: Defend ${defendValue}`,
            actions: [defendAction(defendValue)]
        };
    }

    createAttackDefendBurnMove() {
        return {
            key: 'status_tician_attack_defend_burn',
            label: 'Tri-Burst: Attack 5 + Defend 5 + Burn 5',
            actions: [attackAction(5), defendAction(5), burnAction(5)]
        };
    }

    createGainAdditionalUltraMove() {
        return {
            key: 'status_tician_gain_additional_ultra',
            label: 'Dual Uplink: Gain an additional Ultra Status',
            createActions: () => {
                this.queueStatusChange(() => this.addAdditionalUltraStatus());
                return [];
            }
        };
    }

    createEnterBarrageMove() {
        return {
            key: 'status_tician_enter_barrage',
            label: 'Barrage Initialization: Heal 20 + Enter Barrage Mode',
            createActions: () => {
                this.queueStatusChange(() => this.enterBarrageMode());
                return [healAction(20)];
            }
        };
    }

    getNextMove() {
        if (this.inBarrageMode) {
            const move = this.generateBarrageMove();
            return this.appendStatusActions(move);
        }

        const move = super.getNextMove();
        if (!move) {
            return null;
        }

        return this.appendStatusActions(move);
    }

    appendStatusActions(move) {
        if (!move) {
            return null;
        }

        const statusActions = this.buildStatusActions();
        if (statusActions.length > 0) {
            if (!Array.isArray(move.actions)) {
                move.actions = [];
            }
            move.actions.push(...statusActions);
        }

        return move;
    }

    queueStatusChange(change) {
        if (typeof change !== 'function') {
            return;
        }

        if (this.isPreviewingMoveActions && this.isPreviewingMoveActions()) {
            return;
        }

        if (!Array.isArray(this.pendingStatusChanges)) {
            this.pendingStatusChanges = [];
        }

        this.pendingStatusChanges.push(change);
    }

    applyQueuedStatusChanges() {
        if (!Array.isArray(this.pendingStatusChanges) || this.pendingStatusChanges.length === 0) {
            return;
        }

        const queuedChanges = this.pendingStatusChanges.slice();
        this.pendingStatusChanges.length = 0;

        let didMutate = false;
        for (const change of queuedChanges) {
            if (typeof change !== 'function') {
                continue;
            }

            const result = change();
            if (result !== false) {
                didMutate = true;
            }
        }

        if (didMutate) {
            this.updateDerivedStatusEffects();
        }
    }

    onTurnFinished() {
        this.applyQueuedStatusChanges();
    }

    buildStatusActions() {
        const actions = [];

        const targetMax = this.currentMaxDiceTarget != null
            ? this.currentMaxDiceTarget
            : this.defaultMaxDicePerZone;

        if (typeof targetMax === 'number' && targetMax > 0 && this.lastAppliedMaxDiceValue !== targetMax) {
            actions.push(setMaxDicePerZoneAction(targetMax));
            this.lastAppliedMaxDiceValue = targetMax;
        }

        if (this.activeBasicStatus && typeof this.activeBasicStatus.createAction === 'function') {
            const action = this.activeBasicStatus.createAction();
            if (action) {
                actions.push(action);
            }
        }

        return actions;
    }

    createRandomControlAction(count) {
        const options = [
            (value) => lockAction(value),
            (value) => nullifyAction(value),
            (value) => weakenAction(value)
        ];

        const factory = chooseRandom(options) || ((value) => lockAction(value));
        return factory(Math.max(1, count || 1));
    }

    upgradeBasicStatus() {
        const exclude = this.activeBasicEffectId ? [this.activeBasicEffectId] : [];
        const effectId = this.chooseRandomBasicEffect({ exclude });
        this.setBasicStatus(effectId, 'basicPlus');
    }

    cycleBasicStatus(tier = 'basic', { ensureDifferent = false } = {}) {
        const exclude = ensureDifferent && this.activeBasicEffectId ? [this.activeBasicEffectId] : [];
        const effectId = this.chooseRandomBasicEffect({ exclude });
        this.setBasicStatus(effectId, tier);
    }

    chooseRandomBasicEffect({ exclude = [] } = {}) {
        const excludeSet = new Set(Array.isArray(exclude) ? exclude : []);
        const candidates = BASIC_EFFECT_IDS.filter(id => !excludeSet.has(id));
        const pool = candidates.length > 0 ? candidates : BASIC_EFFECT_IDS;
        return chooseRandom(pool) || BASIC_EFFECT_IDS[0];
    }

    setBasicStatus(effectId, tier = 'basic') {
        if (!effectId || !BASIC_EFFECT_CONFIGS[effectId]) {
            this.activeBasicStatus = null;
            this.activeBasicEffectId = null;
            this.activeBasicTier = tier;
            return;
        }

        const config = BASIC_EFFECT_CONFIGS[effectId];
        const count = tier === 'basicPlus' ? BASIC_PLUS_COUNT : BASIC_COUNT;
        const description = typeof config.buildDescription === 'function'
            ? config.buildDescription(count)
            : '';

        this.activeBasicStatus = {
            id: effectId,
            tier,
            count,
            description,
            createAction: () => config.actionFactory(count)
        };

        this.activeBasicEffectId = effectId;
        this.activeBasicTier = tier;
    }

    addRandomUltraStatus({ excludeExisting = false } = {}) {
        if (excludeExisting && this.activeUltraStatusIds.size >= ULTRA_STATUS_IDS.length) {
            return false;
        }

        const exclude = excludeExisting ? Array.from(this.activeUltraStatusIds) : [];
        const [pick] = this.selectUniqueUltraStatuses(1, { exclude, ensureDifferent: excludeExisting });
        if (!pick) {
            return false;
        }

        this.activeUltraStatusIds.add(pick);
        this.updateDerivedStatusEffects();
        return true;
    }

    addAdditionalUltraStatus() {
        this.addRandomUltraStatus({ excludeExisting: true });
    }

    cycleUltraStatuses(count, { ensureDifferent = false } = {}) {
        const desiredCount = Math.max(1, Math.min(count || 1, ULTRA_STATUS_IDS.length));
        const exclude = ensureDifferent ? Array.from(this.activeUltraStatusIds) : [];
        const picks = this.selectUniqueUltraStatuses(desiredCount, { exclude, ensureDifferent });

        if (picks.length === 0) {
            return;
        }

        this.activeUltraStatusIds = new Set(picks);
        this.updateDerivedStatusEffects();
    }

    selectUniqueUltraStatuses(count, { exclude = [], ensureDifferent = false } = {}) {
        const safeCount = Math.max(1, Math.min(count || 1, ULTRA_STATUS_IDS.length));
        const excludeSet = new Set(Array.isArray(exclude) && ensureDifferent ? exclude : []);
        const used = new Set();
        const picks = [];

        while (picks.length < safeCount) {
            const candidates = ULTRA_STATUS_IDS.filter(id => !used.has(id) && (!ensureDifferent || !excludeSet.has(id)));

            if (candidates.length === 0) {
                const fallback = ULTRA_STATUS_IDS.filter(id => !used.has(id));
                if (fallback.length === 0) {
                    break;
                }
                const fallbackPick = chooseRandom(fallback);
                if (!fallbackPick) {
                    break;
                }
                used.add(fallbackPick);
                picks.push(fallbackPick);
                continue;
            }

            const choice = chooseRandom(candidates);
            if (!choice) {
                break;
            }
            used.add(choice);
            picks.push(choice);
        }

        if (picks.length === 0 && ULTRA_STATUS_IDS.length > 0) {
            picks.push(ULTRA_STATUS_IDS[0]);
        }

        return picks;
    }

    enterBarrageMode() {
        if (this.inBarrageMode) {
            return;
        }

        this.inBarrageMode = true;
        this.barrageMoveToggle = 0;
        this.barrageMoveCounter = 0;
        this.barrageLoopCount = 0;
        this.barrageAttackValue = BARRAGE_INITIAL_ATTACK;
        this.barrageDefendValue = BARRAGE_INITIAL_DEFEND;
        this.barrageIncrementSeries = [2, 3];
        this.barrageNextIncrementIndex = 0;
    }

    generateBarrageMove() {
        this.barrageMoveCounter += 1;
        const attackValue = this.barrageAttackValue;
        const defendValue = this.barrageDefendValue;

        if (this.barrageMoveToggle === 0) {
            const controlAction = this.createRandomControlAction(this._controlEffectCount || CONTROL_EFFECT_COUNT);
            const move = {
                key: `status_tician_barrage_strike_${this.barrageMoveCounter}`,
                label: `Barrage Strike: Attack ${attackValue} + Defend ${defendValue} + Control 1 Die`,
                actions: [
                    attackAction(attackValue),
                    defendAction(defendValue),
                    controlAction
                ]
            };
            this.barrageMoveToggle = 1;
            return move;
        }

        this.queueStatusChange(() => this.cycleAllStatuses({ ensureDifferent: true }));

        const move = {
            key: `status_tician_barrage_cycle_${this.barrageMoveCounter}`,
            label: `Barrage Recalibration: Attack ${attackValue} + Defend ${defendValue} + Cycle Statuses`,
            actions: [
                attackAction(attackValue),
                defendAction(defendValue)
            ]
        };

        this.barrageMoveToggle = 0;
        this.incrementBarrageValues();
        return move;
    }

    cycleAllStatuses({ ensureDifferent = false } = {}) {
        this.cycleBasicStatus('basic', { ensureDifferent });
        const count = Math.max(1, this.activeUltraStatusIds.size || 1);
        this.cycleUltraStatuses(count, { ensureDifferent });
    }

    incrementBarrageValues() {
        const increment = this.getNextBarrageIncrement();
        if (typeof increment === 'number' && increment > 0) {
            this.barrageAttackValue += increment;
            this.barrageDefendValue += increment;
        }
        this.barrageLoopCount += 1;
    }

    getNextBarrageIncrement() {
        if (this.barrageNextIncrementIndex < this.barrageIncrementSeries.length) {
            const value = this.barrageIncrementSeries[this.barrageNextIncrementIndex];
            this.barrageNextIncrementIndex += 1;
            return value;
        }

        const length = this.barrageIncrementSeries.length;
        if (length < 2) {
            return 1;
        }

        const nextValue = this.barrageIncrementSeries[length - 1] + this.barrageIncrementSeries[length - 2];
        this.barrageIncrementSeries.push(nextValue);
        this.barrageNextIncrementIndex += 1;
        return nextValue;
    }

    updateDerivedStatusEffects() {
        const activeIds = Array.from(this.activeUltraStatusIds);
        this.defensePerRerollValue = activeIds.includes('defense_per_reroll') ? ULTRA_DEFENSE_PER_REROLL : 0;
        this.onlyStraightsActive = activeIds.includes('only_straights');
        this.destroyNonComboActive = activeIds.includes('destroy_non_combo');
        this.currentMaxDiceTarget = activeIds.includes('max_four_dice') ? 4 : null;
    }

    getStatusDescription() {
        const lines = [];

        if (this.activeBasicStatus && this.activeBasicStatus.description) {
            const tierLabel = this.activeBasicTier === 'basicPlus' ? 'Basic+' : 'Basic';
            lines.push(`${tierLabel}: ${this.activeBasicStatus.description}`);
        }

        if (this.activeUltraStatusIds.size > 0) {
            const orderedIds = ULTRA_STATUS_IDS.filter(id => this.activeUltraStatusIds.has(id));
            orderedIds.forEach(id => {
                const description = ULTRA_STATUS_DEFINITIONS[id]?.description;
                if (description) {
                    lines.push(`Ultra: ${description}`);
                }
            });
        }

        return lines.join('\n');
    }

    onPlayerReroll(eventOrCount, legacyEnemyManager) {
        const event = (eventOrCount && typeof eventOrCount === 'object')
            ? eventOrCount
            : { count: eventOrCount, enemyManager: legacyEnemyManager };

        const {
            count = 0,
            enemyManager,
            isInitialRoll = false,
            scene = null
        } = event || {};

        if (!enemyManager || count <= 0 || this.defensePerRerollValue <= 0) {
            return;
        }

        if (isInitialRoll) {
            return;
        }

        if (scene && scene.rollsRemaining === scene.rollsRemainingAtTurnStart) {
            return;
        }

        const gained = count * this.defensePerRerollValue;
        if (gained > 0 && typeof enemyManager.addEnemyBlock === 'function') {
            enemyManager.addEnemyBlock(gained);
        }
    }

    modifyIncomingAttack({ attackScore, attackResult }) {
        if (!this.onlyStraightsActive) {
            return undefined;
        }

        if (!attackResult || typeof attackResult.comboType !== 'string') {
            return 0;
        }

        return attackResult.comboType.startsWith('Straight') ? attackScore : 0;
    }

    shouldDestroyDiceOutsideCombo() {
        return this.destroyNonComboActive;
    }

    getCurrentMaxDicePerZone() {
        if (this.currentMaxDiceTarget != null) {
            return this.currentMaxDiceTarget;
        }
        return this.defaultMaxDicePerZone;
    }

    onMaxDicePerZoneChanged(newValue) {
        if (Number.isFinite(newValue)) {
            this.lastAppliedMaxDiceValue = newValue;
        }
    }
}
