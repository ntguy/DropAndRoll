import { BaseEnemy } from './BaseEnemy.js';
import { attackAction, burnAction, defendAction, lockAction } from './EnemyActions.js';

const INITIAL_BURN_DEFEND_VALUE = 0;

export class AuditorEnemy extends BaseEnemy {
    constructor() {
        super({ name: 'Auditor', maxHealth: 111 });

        this.statusActivated = false;
        this.statusActivationPending = false;
        this.activationMoveRemoved = false;
        this.burnDefendValue = INITIAL_BURN_DEFEND_VALUE;

        this.baseMoves = [
            {
                key: 'auditor_activate_status',
                label: 'Activate Status...',
                createActions: () => {
                    this.statusActivationPending = true;
                    if (!this.activationMoveRemoved) {
                        this.moves = this.moves.filter(move => move.key !== 'auditor_activate_status');
                        this.moveIndex = Math.max(0, this.moveIndex - 1);
                        this.activationMoveRemoved = true;
                    }
                    return [];
                }
            },
            {
                key: 'auditor_burn_defend',
                label: () => `Burn ${this.burnDefendValue} + Defend ${this.burnDefendValue}`,
                createActions: () => {
                    const scaling = this.isNightmare ? 6 : 4;
                    this.burnDefendValue += scaling;
                    return [burnAction(this.burnDefendValue), defendAction(this.burnDefendValue)];
                }
            },
            {
                key: 'auditor_lock_defend',
                label: 'Lock 1 Die + Defend 10',
                actions: [lockAction(1), defendAction(10)]
            },
            {
                key: 'auditor_attack',
                label: 'Attack 20',
                actions: [attackAction(20)]
            }
        ];

        this.moves = [...this.baseMoves];
    }

    onEncounterStart() {
        this.statusActivated = false;
        this.statusActivationPending = false;
        this.activationMoveRemoved = false;
        this.burnDefendValue = INITIAL_BURN_DEFEND_VALUE;
        this.moveIndex = 0;
        this.moves = [...this.baseMoves];
    }

    getStatusDescription(upcomingMove) {
        if (!this.statusActivated) {
            return '';
        }
        return 'Status: Dice outside a combo are destroyed for a turn.';
    }

    shouldDestroyDiceOutsideCombo() {
        return this.statusActivated;
    }

    onTurnFinished() {
        if (this.statusActivationPending) {
            this.statusActivationPending = false;
            this.statusActivated = true;
        }
    }
}
