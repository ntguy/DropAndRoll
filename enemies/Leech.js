import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, healAction, nullifyAction } from './EnemyActions.js';

// compute counts at runtime per-instance (this.isNightmare not available at module scope)

export class LeechEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Leech', maxHealth: 88 });

        this.nullifyCount = this.isNightmare ? 3 : 2;

        this.moves = [
            {
                key: 'leech_burn_defend',
                label: 'Scalding Husk: Burn 10 + Defend 10',
                actions: [burnAction(10), defendAction(10)]
            },
            {
                key: 'leech_attack_heal_small',
                label: 'Siphon Strike: Attack 10 + Heal 5',
                actions: [attackAction(10), healAction(5)]
            },
            {
                key: 'leech_nullify',
                label: () => `Draining Embrace: Nullify ${this.nullifyCount} Dice`,
                createActions: () => [nullifyAction(this.nullifyCount)]
            },
            {
                key: 'leech_attack_heal_large',
                label: 'Gluttonous Feast: Attack 10 + Heal 10',
                createActions: () => {
                    const maxNullify = this.isNightmare ? 5 : 4;
                    this.nullifyCount = Math.min(maxNullify, this.nullifyCount + 1);
                    return [attackAction(10), healAction(10)];
                }
            }
        ];
    }

    onEncounterStart() {
        this.nullifyCount = BASE_NULLIFY_COUNT;
        this.moveIndex = 0;
    }

    getStatusDescription() {
        return 'Status: Nullify 1 Die per turn';
    }

    onTurnFinished({ scene }) {
        if (!scene || typeof scene.queueEnemyNullify !== 'function') {
            return;
        }

        scene.queueEnemyNullify(1);
    }
}
