import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction } from './EnemyActions.js';

export class WallopEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Wallop', maxHealth: 99 });
        this._phaseIndex = 0;
        this._scalingAttackValue = 30;
    }

    getNextMove() {
        if (this._phaseIndex === 0) {
            this._phaseIndex += 1;
            return {
                key: 'wallop_opening_strike',
                label: 'Attack for 25 + Burn 4',
                actions: [attackAction(25), burnAction(4)]
            };
        }

        if (this._phaseIndex >= 1 && this._phaseIndex <= 3) {
            const countdown = 4 - this._phaseIndex;
            this._phaseIndex += 1;
            return {
                key: `wallop_guard_${countdown}`,
                label: `Defend for 15 (${countdown})`,
                actions: [defendAction(15)]
            };
        }

        const attackValue = this._scalingAttackValue;
        this._scalingAttackValue += this.isNightmare ? 7 : 5;
        return {
            key: `wallop_escalating_${attackValue}`,
            label: `Attack for ${attackValue}`,
            actions: [attackAction(attackValue)]
        };
    }
}
