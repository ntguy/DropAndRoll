import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, defendAction, healAction } from './EnemyActions.js';

const DAMAGE_LOCK_THRESHOLD = 20;
const LOCK_COUNT = 2;
const BASE_HEAL_AMOUNT = 0;
// runtime increment: compute per-instance inside createActions (this.isNightmare not available at module scope)

export class CounterlockEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Counterlock', maxHealth: 50 });

        this.healAmount = BASE_HEAL_AMOUNT;

        this.moves = [
            {
                key: 'counterlock_strike',
                label: 'Heavy Riposte: Attack 15',
                actions: [attackAction(15)]
            },
            {
                key: 'counterlock_recover',
                label: () => `Guarded Recovery: Heal ${this.healAmount} + Defend 5`,
                createActions: () => {
                    const increment = this.isNightmare ? 6 : 5;
                    this.healAmount += increment;
                    return [healAction(this.healAmount), defendAction(5)];
                }
            },
            {
                key: 'counterlock_counterstance',
                label: 'Counterstance: Attack 10 + Defend 10',
                actions: [attackAction(10), defendAction(10)]
            }
        ];
    }

    onEncounterStart() {
        this.healAmount = BASE_HEAL_AMOUNT;
        this.moveIndex = 0;
    }

    getStatusDescription() {
        return 'Status: Locks 2 dice if attacked for 20+.';
    }

    onPlayerDamageDealt({ totalDamage, previousTotal, scene }) {
        if (!scene || typeof scene.queueEnemyLocks !== 'function') {
            return;
        }

        const crossedThreshold = previousTotal < DAMAGE_LOCK_THRESHOLD && totalDamage >= DAMAGE_LOCK_THRESHOLD;
        if (!crossedThreshold || this.isDefeated()) {
            return;
        }

        scene.queueEnemyLocks(LOCK_COUNT);
    }
}
