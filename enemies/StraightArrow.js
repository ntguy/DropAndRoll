import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, healAction, lockAction } from './EnemyActions.js';

const STRAIGHT_PREFIX = 'Straight';

export class StraightArrowEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Straight Arrow', maxHealth: 120 });

        this.moves = [
            {
                key: 'straight_arrow_attack_lock',
                label: 'Focused Shot: Attack 15 + Lock 1 Die',
                actions: [attackAction(15), lockAction(1)]
            },
            {
                key: 'straight_arrow_double_lock',
                label: 'Pinning Volley: Lock 2 Dice',
                actions: [lockAction(2)]
            },
            {
                key: 'straight_arrow_heal',
                label: `Second Wind: Heal ${this.isNightmare ? 15 : 10}`,
                actions: [healAction(this.isNightmare ? 15 : 10)]
            },
            {
                key: 'straight_arrow_burn',
                label: 'Flaming Arrow: Burn 10',
                actions: [burnAction(10)]
            }
        ];
    }

    getStatusDescription() {
        return 'Status: Takes damage only from Straight combos.';
    }

    modifyIncomingAttack({ attackScore, attackResult }) {
        if (!attackResult || typeof attackResult.comboType !== 'string') {
            return 0;
        }

        return attackResult.comboType.startsWith(STRAIGHT_PREFIX) ? attackScore : 0;
    }

    onEncounterStart() {
        this.moveIndex = 0;
    }
}
