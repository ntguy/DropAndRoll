import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, healAction } from './EnemyActions.js';

export class HotfixEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Hotfix', maxHealth: 75 });
        this.scalingBurnValue = 1;
        this.moves = [
            {
                key: 'apply_burn',
                label: () => `Burn ${this.scalingBurnValue + 3}`,
                createActions: () => [burnAction(this.scalingBurnValue + 3)]
            },
            {
                key: 'heal_attack',
                label: 'Heal 10 + Attack 5',
                actions: [
                    healAction(10),
                    attackAction(5)
                ]
            },
            {
                key: 'burn_defend_loop',
                label: () => `Burn ${this.scalingBurnValue} + Defend 10`,
                createActions: () => {
                    const increment = this.isNightmare ? 2 : 1;
                    this.scalingBurnValue += increment;
                    return [
                        burnAction(this.scalingBurnValue),
                        defendAction(10)
                    ];
                }
            }
        ];
    }
}
