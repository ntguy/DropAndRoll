import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, healAction } from './EnemyActions.js';

export class SlapperEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Slapper', maxHealth: 50 });

        this._sequence = [
            { type: 'attack', value: 10 },
            { type: 'heal' },
            { type: 'attack', value: 15 },
            { type: 'heal' }
        ];
        this._seqIndex = 0;
        this._healAmount = 10;
    }

    getNextMove() {
        const entry = this._sequence[this._seqIndex];

        let move;
        if (entry.type === 'attack') {
            move = {
                key: `attack${entry.value}`,
                label: `Attack for ${entry.value}`,
                actions: [attackAction(entry.value)]
            };
        } else {
            move = {
                key: `heal${this._healAmount}`,
                label: `Heal ${this._healAmount}`,
                actions: [healAction(this._healAmount)]
            };
            const increment = this.isNightmare ? 4 : 2;
            this._healAmount += increment;
        }

        this._seqIndex = (this._seqIndex + 1) % this._sequence.length;

        return {
            key: move.key,
            label: move.label,
            actions: move.actions.map(action => ({ ...action }))
        };
    }
}
