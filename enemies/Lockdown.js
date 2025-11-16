import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, lockAction, weakenAction } from './EnemyActions.js';

export class LockdownEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Lockdown', maxHealth: 150 });

        this.baseDefensePerReroll = 1;
        this.defensePerReroll = this.baseDefensePerReroll;
        this.currentDefenseBonus = 0;
        this.baseBurnValue = this.isNightmare ? 6 : 8;
        this.burnValueIncrement = this.isNightmare ? 4 : 2;
        this.currentBurnValue = this.baseBurnValue;

        const createMove = ({ key, title, components, actions, createActions }) => {
            const baseComponents = Array.isArray(components)
                ? components.map(component => ({ ...component }))
                : [];

            const moveConfig = {
                key,
                intentTitle: title,
                intentComponents: baseComponents,
                label: () => this.composeMoveLabel(title, baseComponents, { includeDefenseBonus: false })
            };

            if (typeof createActions === 'function') {
                moveConfig.createActions = createActions;
            } else {
                moveConfig.actions = Array.isArray(actions) ? actions : [];
            }

            return moveConfig;
        };

        const ironCurtainMove = createMove({
                key: 'lockdown_guarded_blow',
                title: 'Iron Curtain',
                components: [
                    { type: 'defend', value: 5 },
                    { type: 'attack', value: 15 }
                ],
                actions: [defendAction(5), attackAction(15)]
            });

        const suppressionMove = createMove({
                key: 'lockdown_suppress',
                title: 'Suppression Protocol',
                components: [
                    { type: 'defend', value: 5 },
                    { type: 'lock', value: 2 },
                    { type: 'weaken', value: 2 }
                ],
                actions: [defendAction(5), lockAction(2), weakenAction(2)]
            });

        const thermalShieldComponents = [
            { type: 'defend', value: 5 },
            { type: 'burn', value: this.currentBurnValue }
        ];

        const thermalShieldMove = createMove({
                key: 'lockdown_heat',
                title: 'Thermal Shield',
                components: thermalShieldComponents,
                createActions: () => {
                    const burnValue = this.currentBurnValue;
                    this.currentBurnValue += this.burnValueIncrement;
                    return [defendAction(5), burnAction(burnValue)];
                }
            });

        this.thermalShieldComponents = thermalShieldMove.intentComponents;

        const totalControlMove = createMove({
                key: 'lockdown_escalate',
                title: 'Total Control',
                components: [
                    { type: 'defend', value: 8 },
                    { type: 'attack', value: 8 },
                    { type: 'lock', value: this.isNightmare ? 2 : 1 },
                    { type: 'weaken', value: 1 }
                ],
                createActions: () => {
                    this.defensePerReroll += 1;
                    return [defendAction(10), lockAction(this.isNightmare ? 2 : 1), weakenAction(1)];
                }
            });

        this.moves = [
            ironCurtainMove,
            suppressionMove,
            thermalShieldMove,
            totalControlMove
        ];
    }

    onEncounterStart() {
        this.defensePerReroll = this.baseDefensePerReroll;
        this.moveIndex = 0;
        this.currentDefenseBonus = 0;
        this.currentBurnValue = this.baseBurnValue;
        this.updateThermalShieldIntent();
    }

    getStatusDescription() {
        const value = Math.max(0, this.defensePerReroll);
        return `Status: Gains ${value} Defense per rerolled die.`;
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

        if (!enemyManager || count <= 0) {
            return;
        }

        if (isInitialRoll) {
            return;
        }

        if (scene && scene.rollsRemaining === scene.rollsRemainingAtTurnStart) {
            return;
        }

        const gained = count * Math.max(0, this.defensePerReroll);
        if (gained > 0 && typeof enemyManager.addEnemyBlock === 'function') {
            enemyManager.addEnemyBlock(gained);
            this.currentDefenseBonus += gained;
        }
    }

    getNextMove() {
        this.currentDefenseBonus = 0;
        this.updateThermalShieldIntent();
        return super.getNextMove();
    }

    updateThermalShieldIntent() {
        if (!Array.isArray(this.thermalShieldComponents)) {
            return;
        }

        const burnComponent = this.thermalShieldComponents.find(component => component?.type === 'burn');
        if (burnComponent) {
            burnComponent.value = this.currentBurnValue;
        }
    }

    composeMoveLabel(title, components, { includeDefenseBonus = true } = {}) {
        const { description } = this.buildIntentLabelData(title, components, { includeDefenseBonus });
        return description;
    }

    buildIntentLabelData(title, components, { includeDefenseBonus = true } = {}) {
        const safeTitle = title || 'Move';
        const list = Array.isArray(components) ? components : [];

        let baseDefenseTotal = 0;
        list.forEach(component => {
            if (component && component.type === 'defend') {
                baseDefenseTotal += typeof component.value === 'number' ? component.value : 0;
            }
        });

        const defenseBonus = includeDefenseBonus ? Math.max(0, this.currentDefenseBonus || 0) : 0;
        const parts = [];
        let defendAdded = false;

        const formatCount = (count, singular, plural) => {
            const value = typeof count === 'number' ? count : 0;
            const noun = value === 1 ? singular : plural;
            return `${value} ${noun}`;
        };

        list.forEach(component => {
            if (!component) {
                return;
            }

            const value = typeof component.value === 'number'
                ? component.value
                : (typeof component.count === 'number' ? component.count : 0);

            switch (component.type) {
                case 'defend': {
                    if (defendAdded) {
                        break;
                    }
                    const totalDefense = baseDefenseTotal + defenseBonus;
                    parts.push(`Defend ${totalDefense}`);
                    defendAdded = true;
                    break;
                }
                case 'attack':
                    parts.push(`Attack ${value}`);
                    break;
                case 'burn':
                    parts.push(`Burn ${value}`);
                    break;
                case 'lock':
                    parts.push(`Lock ${formatCount(value, 'Die', 'Dice')}`);
                    break;
                case 'weaken':
                    parts.push(`Weaken ${formatCount(value, 'Die', 'Dice')}`);
                    break;
                default:
                    if (component.label) {
                        parts.push(component.label);
                    }
                    break;
            }
        });

        const description = parts.length > 0
            ? `${safeTitle}: ${parts.join(' + ')}`
            : safeTitle;

        return {
            description,
            baseDefenseTotal,
            defenseBonus
        };
    }

    getIntentDescription(move) {
        const components = Array.isArray(move.intentComponents) ? move.intentComponents : [];
        const title = move.intentTitle || 'Move';
        const { description } = this.buildIntentLabelData(title, components, { includeDefenseBonus: true });

        return description;
    }
}
