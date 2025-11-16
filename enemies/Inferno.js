import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, lockAction } from './EnemyActions.js';

export class InfernoEnemy extends BaseEnemy {
    constructor() {
        super({
            name: 'Inferno',
            maxHealth: 100,
            moves: [
                {
                    key: 'searing_combo',
                    label: 'Searing Combo: Attack 10 + Defend 10 + Burn 5',
                    actions: [
                        attackAction(10),
                        defendAction(10),
                        burnAction(5)
                    ]
                },
                {
                    key: 'lockdown_blaze',
                    label: 'Lockdown Blaze: Attack 6 + Defend 6 + Lock 2 Dice',
                    actions: [
                        attackAction(6),
                        defendAction(6),
                        lockAction(2)
                    ]
                },
                {
                    key: 'raging_flames',
                    label: 'Raging Flames: Burn 8',
                    actions: [
                        burnAction(8)
                    ]
                },
                {
                    key: 'molten_shield',
                    label: 'Molten Shield: Defend 15',
                    actions: [
                        defendAction(15)
                    ]
                }
            ]
        });
        // adjust health for nightmare mode if applicable
        if (this.isNightmare) {
            this.maxHealth = 125;
            this.baseMaxHealth = 125;
            this.health = Math.min(this.health, this.maxHealth);
        }
    }
}
