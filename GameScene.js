import { CONSTANTS, COLORS } from './constants.js';
import { DIFFICULTY_PRESETS, DEFAULT_DIFFICULTY } from './DifficultyConfig.js';
import { createDie, snapToGrid } from './objects/Dice.js';
import {
    setupZones,
    ZONE_AREA_PADDING_X,
    ZONE_AREA_PADDING_TOP,
    ZONE_AREA_PADDING_BOTTOM,
    ZONE_LABEL_FONT_SIZE,
    ZONE_LABEL_OFFSET
} from './objects/DiceZone.js';
import { setupButtons, setupHealthBar, setupEnemyUI } from './objects/UI.js';
import { setTextButtonEnabled } from './objects/ui/ButtonStyles.js';
import { createMenuUI } from './objects/MenuUI.js';
import { createSettingsUI } from './objects/SettingsUI.js';
import { createHeaderUI } from './objects/HeaderUI.js';
import { InstructionsUI } from './objects/InstructionsUI.js';
import { BackpackUI } from './objects/BackpackUI.js';
import { COMBO_POINTS, evaluateCombo, scoreCombo } from './systems/ComboSystem.js';
import { EnemyManager } from './systems/EnemySystem.js';
import { GameOverManager } from './systems/GameOverSystem.js';
import { PathManager, PATH_NODE_TYPES } from './systems/PathManager.js';
import { PathUI } from './objects/PathUI.js';
import { InfirmaryUI } from './objects/InfirmaryUI.js';
import { ShopUI } from './objects/ShopUI.js';
import { TowerOfTenUI } from './objects/TowerOfTenUI.js';
import { RelicUIManager } from './objects/RelicUI.js';
import { BossRelicRewardUI } from './objects/BossRelicRewardUI.js';
import { buildRelicRegistry } from './relics/RelicRegistry.js';
import { resolveWildcardCombo } from './systems/WildcardLogic.js';
import { MAP_CONFIGS } from './maps/MapConfigs.js';
import { DiceUpgradeUI } from './objects/DiceUpgradeUI.js';
import { MAX_CUSTOM_DICE, SELECTABLE_CUSTOM_DICE_IDS, createDieBlueprint, getRandomCustomDieOptions, getCustomDieDefinitionById } from './dice/CustomDiceDefinitions.js';
import { computeDieContribution, doesDieActAsWildcardForCombo } from './dice/CustomDiceLogic.js';
import { DiceRewardUI } from './objects/DiceRewardUI.js';
import { playDiceRollSounds } from './utils/SoundHelpers.js';
import { VictoryScreen } from './systems/VictoryScreen.js';
import { createModal, destroyModal } from './objects/ui/ModalComponents.js';
import { populateContainerWithPoints } from './systems/InstructionsRenderer.js';

const SHOP_RELIC_COUNT = 3;
const BOSS_RELIC_CHOICE_COUNT = 2;
const BOSS_BONUS_REWARD_ID = 'boss-capacity-bonus';

const HAND_AREA_PADDING_X = 31;
const HAND_AREA_PADDING_Y = 38;
const HAND_AREA_BACKGROUND_ALPHA = 0.6;

const TUTORIAL_CONFIG = {
    'game-start': { title: 'Welcome to Drop + Roll!',
        modal: { width: 700, height: 360 },
        points: [
            {
                text: 'Drop through multiple maps, battling monsters and growing your collection of dice.',
            },
            {
                text: 'Choose your path wisely to power up between battles.',
            }
        ] 
    },
    'first-battle': { title: 'Battles',
        modal: { width: 800, height: 500 },
        points: [
            {
                text: 'At the start of each battle, roll all your dice to form your opening hand.',
                keywords: [{ phrase: 'roll', color: COLORS.KEYWORD_COLOR }]
            },
            {
                text: 'Your goal: form combos to place in the Defend and Attack zones.',
                keywords: [
                    { phrase: 'combos', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'Defend', color: COLORS.DEFENSE_COLOR },
                    { phrase: 'Attack', color: COLORS.ATTACK_COLOR }
                ]
            },
            {
                text: 'Click on dice to highlight which you want to re-roll. You have 2 re-rolls per turn.',
                keywords: [
                    { phrase: '2 re-rolls', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'Defend (🛡️)', color: COLORS.DEFENSE_COLOR },
                    { phrase: 'Attack (⚔️)', color: COLORS.ATTACK_COLOR }
                ]
            },
            {
                text: 'Under the enemy HP bar, you can see what move they will take on this turn.',
            },
            {
                text: 'Press Resolve to play your turn.',
                keywords: [{ phrase: 'Resolve', color: COLORS.KEYWORD_COLOR }]
            }
        ]
     },
    'first-zone-placement': { title: 'Zone Scoring',
        modal: { width: 800, height: 400 },
        points: [
            {
                text: `A Zone's Total is equal to Face Value plus any Combo Bonus.`,
                keywords: [
                    { phrase: 'Total', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'Face Value', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'Combo Bonus', color: COLORS.KEYWORD_COLOR }
                ]
            },
            {
                text: 'Face Value: adds the sum of all die faces placed within a zone.',
                keywords: [{ phrase: 'Face Value', color: COLORS.KEYWORD_COLOR }]
            },
            {
                text: 'Combo Bonus: extra points for patterns, especially complex ones. Check the menu (☰) for exact values.',
                keywords: [{ phrase: 'Combo Bonus', color: COLORS.KEYWORD_COLOR }]
            }
        ]
    },
    'first-enemy-defeated': { title: 'Collecting Dice',
        modal: { width: 640, height: 600 },
        points: [
            {
                text: 'Choose a special die after each battle to improve your hand.',
                keywords: [{ phrase: 'special die', color: COLORS.KEYWORD_COLOR }]
            },
            {
                text: 'Carry up to 6 dice. Discard within your pack 🎒 to make room for new finds.',
                keywords: [
                    { phrase: '6', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'pack', color: COLORS.KEYWORD_COLOR },
                ]            
            },
            {
                text: 'Open your pack at any time for a reminder of dice effects.',
            }
        ]
    },
    'first-boss-defeated': { title: 'Boss Rewards',
        modal: { width: 700, height: 360 },
        points: [
            {
                text: 'After defeating a boss, you heal for half of your missing HP.',
                keywords: [{ phrase: 'heal', color: COLORS.KEYWORD_COLOR }]
            },
            {
                text: 'Bosses drop the most powerful relics in the game. Choose wisely!',
                keywords: [
                    { phrase: 'relics', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'curse-lock': { title: 'Curse: Lock',
        modal: { width: 800, height: 360 },
        points: [
            {
                text: 'Enemies can inflict a variety of curses upon your dice, such as lock.',
                keywords: [
                    { phrase: 'curses', color: COLORS.CURSE_COLOR },
                    { phrase: 'lock', color: COLORS.CURSE_COLOR },
                ]  
            },
            {
                text: 'A locked die cannot be re-rolled.',
                keywords: [
                    { phrase: 'locked', color: COLORS.CURSE_COLOR },
                ]  
            },
            {
                text: 'Curses are cleansed if the die is not used (e.g. not placed in a zone) for a turn.',
                keywords: [
                    { phrase: 'cleansed', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'curse-weaken': { title: 'Curse: Weaken',
        modal: { width: 800, height: 300 },
        points: [
            {
                text: 'A weakened die contributes no points to the face value of a zone.',
                keywords: [
                    { phrase: 'weakened', color: COLORS.CURSE_COLOR },
                ]  
            },
            {
                text: 'Curses are cleansed if the die is not used (e.g. not placed in a zone) for a turn.',
                keywords: [
                    { phrase: 'cleansed', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'curse-nullify': { title: 'Curse: Nullify',
        modal: { width: 800, height: 300 },
        points: [
            {
                text: 'A nullified die loses any special effects, acting as a standard die.',
                keywords: [
                    { phrase: 'nullified', color: COLORS.CURSE_COLOR },
                ]  
            },
            {
                text: 'Curses are cleansed if the die is not used (e.g. not placed in a zone) for a turn.',
                keywords: [
                    { phrase: 'cleansed', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'status-effects': { title: 'Status Effects',
        modal: { width: 800, height: 300 },
        points: [
            {
                text: 'Some enemies have permanent status effects.',
                keywords: [
                    { phrase: 'status', color: COLORS.KEYWORD_COLOR },
                ]  
            },
            {
                text: 'Pay attention! You may need to adjust your battle strategy.',
                keywords: [
                    { phrase: 'Pay attention!', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'curse-burn': { title: 'Burn',
        modal: { width: 700, height: 360 },
        points: [
            {
                text: `Burn deals damage every turn, and will not fade on it's own.`,
                keywords: [
                    { phrase: 'Burn', color: COLORS.KEYWORD_COLOR },
                ]  
            },
            {
                text: 'Some dice and relics can cleanse burn from you, or even inflict it on enemies.',
                keywords: [
                    { phrase: 'cleanse', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'inflict', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     },
    'wild-power': { title: 'Wild',
        modal: { width: 800, height: 360 },
        points: [
            {
                text: 'A wild die will morph its face value to create the highest scoring combo possible.',
                keywords: [
                    { phrase: 'wild', color: COLORS.ATTACK_COLOR },
                    { phrase: 'morph', color: COLORS.KEYWORD_COLOR },
                ]  
            },
            {
                text: `The die's original Face Value, shown as a number when it has morphed, is still used for the Face Value portion of scoring.`,
                keywords: [
                    { phrase: 'original', color: COLORS.KEYWORD_COLOR },
                    { phrase: 'Face Value', color: COLORS.KEYWORD_COLOR },
                ]            
            },
        ]
     }
};

const TUTORIAL_MODAL_DIMENSIONS = { width: 800, height: 500 };
const TUTORIAL_MODAL_MARGIN = 32;
const TUTORIAL_CLOSE_BUTTON = { width: 140, height: 48 };

const CHAIN_REACTOR_BONUS_OVERRIDES = {
    'Pair': 3,
    'Two Pair': 7,
    'Three of a Kind': 7,
    'Straight Tri': 7,
    'Four of a Kind': 12,
    'Straight Quad': 12,
    'Full House': 18,
    'Straight Penta': 18,
    'Five of a Kind': 18,
    'Fuller House': 25,
    'Triples Pair': 25,
    'Straight Sex': 25,
    'YAHTZEE': 30
};

function getRandomIndexExclusive(maxExclusive) {
    if (!Number.isFinite(maxExclusive) || maxExclusive <= 0) {
        return 0;
    }

    if (typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function') {
        return Phaser.Math.Between(0, maxExclusive - 1);
    }

    return Math.floor(Math.random() * maxExclusive);
}

function shuffleArray(items) {
    if (!Array.isArray(items)) {
        return [];
    }

    if (typeof Phaser !== 'undefined'
        && Phaser.Utils
        && Phaser.Utils.Array
        && typeof Phaser.Utils.Array.Shuffle === 'function') {
        return Phaser.Utils.Array.Shuffle([...items]);
    }

    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        const temp = result[i];
        result[i] = result[j];
        result[j] = temp;
    }

    return result;
}

export class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });

        // Game state
        this.dice = [];
        this.defaultMaxDicePerZone = CONSTANTS.DICE_PER_SET;
        this.maxDicePerZone = this.defaultMaxDicePerZone;
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingAtTurnStart = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.hardModeEnabled = false;
        this.nightmareModeEnabled = false;
        this.difficultyKey = DEFAULT_DIFFICULTY;
        const initialDifficulty = DIFFICULTY_PRESETS[this.difficultyKey]
            || DIFFICULTY_PRESETS[DEFAULT_DIFFICULTY]
            || { playerMaxHealth: 100 };
        this.playerMaxHealth = typeof initialDifficulty.playerMaxHealth === 'number'
            ? initialDifficulty.playerMaxHealth
            : 100;
        this.playerHealth = this.playerMaxHealth;
        this.healthBar = null;
        this.enemyManager = null;
        this.enemyHealthBar = null;
        this.enemyIntentText = null;
        this.enemyStatusText = null;
        this.enemyBurnText = null;
        this.enemyBurnGlowTween = null;
        this.upcomingEnemyMove = null;
        this.isResolving = false;
        this.playerBlockValue = 0;
        this.playerBurn = 0;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;
        this.pendingCrowdControlPlan = null;
        this.temporarilyDestroyedDice = [];
        this.timeBombStates = new Map();
        this.medicineDieStates = new Map();
        this.cometDieStates = new Map();
        this.chargerDieStates = new Map();
        this.chargerZoneBonuses = { attack: 0, defend: 0 };
        this.activeTimeBombResolveBonus = 0;
        this.gameOverManager = null;
        this.victoryScreen = null;
        this.sfxIcon = null;
        this.musicIcon = null;
        this.sfxSlider = null;
        this.musicSlider = null;
        this.sfxVolume = CONSTANTS.DEFAULT_SFX_VOLUME;
        this.musicVolume = CONSTANTS.DEFAULT_MUSIC_VOLUME;
        this.sfxVolumeBeforeMute = this.sfxVolume;
        this.musicVolumeBeforeMute = this.musicVolume;
        this.isGameOver = false;
        this.testingModeEnabled = false;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.playerGold = 0;
        this.goldText = null;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.handAreaBackground = null;
        this.activeFacilityUI = null;
        this.defendPreviewText = null;
        this.attackPreviewText = null;
        this.defendComboText = null;
        this.attackComboText = null;
        this.comboListTexts = [];
        this.comboListOrder = [];
        this.pendingPostCombatTransition = false;

        this.customDiceLoadout = [];
        this.diceRewardUI = null;

        this.relicUI = new RelicUIManager(this);

        this.resetRelicState();
        this.resetMenuState();

        this.relicPools = { general: [], boss: [] };

        this.backgroundMusic = null;
        this.currentMusicKey = null;
        this.bossRelicRewardUI = null;
        this.bossRelicBonusClaimed = false;
        this.bossRelicBonusExtraChoicePending = false;
        this.additionalRelicSlots = 0;

        this.maps = Array.isArray(MAP_CONFIGS) ? [...MAP_CONFIGS] : [];
        this.currentMapIndex = -1;
        this.currentMapConfig = null;

        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;
        this.pendingCrowdControlPlan = null;

        this.mapTitleText = null;
        this.mapSkipButton = null;
        this.isMapViewActive = false;
        this.isFirstCombatTurn = false;
        this.modalInputLockCount = 0;
        this.previousInputTopOnly = null;
        this.tutorialEnabled = false;
        this.shownTutorialKeys = new Set();
        this.tutorialQueue = [];
        this.activeTutorialModal = null;
    }

    getDifficultyConfig() {
        const presets = DIFFICULTY_PRESETS || {};
        const fallbackKey = DEFAULT_DIFFICULTY;
        const fallback = presets[fallbackKey] || { playerMaxHealth: 100, mapRewards: {} };
        return presets[this.difficultyKey] || fallback;
    }

    applyDifficultySettings() {
        const presets = DIFFICULTY_PRESETS || {};
        const requestedKey = this.hardModeEnabled ? 'hard' : DEFAULT_DIFFICULTY;
        if (Object.prototype.hasOwnProperty.call(presets, requestedKey)) {
            this.difficultyKey = requestedKey;
        } else {
            this.difficultyKey = DEFAULT_DIFFICULTY;
        }

        const difficulty = this.getDifficultyConfig();
        const maxHealth = typeof difficulty.playerMaxHealth === 'number'
            ? difficulty.playerMaxHealth
            : 100;
        this.playerMaxHealth = maxHealth;
        this.playerHealth = this.playerMaxHealth;
    }

    buildEnemySequence(sequence, config) {
        if (!Array.isArray(sequence)) {
            return [];
        }

        const builtSequence = sequence.map(entry => ({ ...entry }));
        const difficulty = this.getDifficultyConfig();
        const rewardsByMap = difficulty && difficulty.mapRewards;
        if (!this.hardModeEnabled || !rewardsByMap) {
            return builtSequence;
        }

        const mapId = config && typeof config.id === 'string' ? config.id : null;
        const rewards = mapId ? rewardsByMap[mapId] : null;
        if (!Array.isArray(rewards)) {
            return builtSequence;
        }

        builtSequence.forEach((entry, index) => {
            if (typeof rewards[index] === 'number') {
                entry.rewardGold = rewards[index];
            }
        });

        return builtSequence;
    }

    acquireModalInputLock() {
        if (!this.input) {
            return;
        }

        if (!Number.isFinite(this.modalInputLockCount)) {
            this.modalInputLockCount = 0;
        }

        if (this.modalInputLockCount === 0) {
            this.previousInputTopOnly = typeof this.input.topOnly === 'boolean'
                ? this.input.topOnly
                : true;
        }

        this.modalInputLockCount += 1;
        this.input.setTopOnly(true);
    }

    releaseModalInputLock() {
        if (!this.input) {
            return;
        }

        if (!Number.isFinite(this.modalInputLockCount)) {
            this.modalInputLockCount = 0;
        }

        this.modalInputLockCount = Math.max(0, this.modalInputLockCount - 1);

        if (this.modalInputLockCount === 0) {
            const restoreTopOnly = typeof this.previousInputTopOnly === 'boolean'
                ? this.previousInputTopOnly
                : true;
            this.input.setTopOnly(restoreTopOnly);
            this.previousInputTopOnly = null;
        }
    }

    resetRelicState() {
        this.relicCatalog = [];
        this.relics = [];
        this.ownedRelicIds = new Set();
        this.currentShopRelics = null;
        this.relicPools = { general: [], boss: [] };
        this.additionalRelicSlots = 0;
        this.bossRelicBonusClaimed = false;
        this.bossRelicBonusExtraChoicePending = false;
        this.destroyBossRelicRewardUI();
        this.hasBlockbusterRelic = false;
        this.hasFamilyRelic = false;
        this.familyHealPerFullHouse = 0;
        this.rerollDefensePerDie = 0;
        this.rerollDefenseBonus = 0;
        this.hasWildOneRelic = false;
        this.cleanseCursesOnLongStraights = false;
        this.hasRainRelic = false;
        this.playerBurnReductionPerTurn = 0;
        this.hasPerfectBalanceRelic = false;
        this.perfectBalanceZoneBonus = 0;
        this.rollCarryoverEnabled = false;
        this.prepperFirstTurnBonusRolls = 0;
        this.prepperCarryoverRolls = 0;
        this.hasChainReactorRelic = false;
        this.hasBatteryIncludedRelic = false;
        this.batteryDieState = null;
        this.medicineDieStates = new Map();
        this.cometDieStates = new Map();
        this.chargerDieStates = new Map();
        this.chargerZoneBonuses = { attack: 0, defend: 0 };
        this.currentHandSlotCount = CONSTANTS.DICE_PER_SET;
        this.refreshHandSlotCount();
        this.updateComboListDisplay();
        if (this.relicUI) {
            this.relicUI.reset();
        }
        this.refreshBackpackContents();
    }

    destroyBossRelicRewardUI() {
        if (this.bossRelicRewardUI && typeof this.bossRelicRewardUI.destroy === 'function') {
            this.bossRelicRewardUI.destroy();
        }
        this.bossRelicRewardUI = null;
    }

    updateBossRelicRewardCapacity() {
        if (this.bossRelicRewardUI && typeof this.bossRelicRewardUI.updateCapacity === 'function') {
            this.bossRelicRewardUI.updateCapacity(this.getRelicCapacityState());
        }
    }

    resetMenuState() {
        if (this.instructionsUI && typeof this.instructionsUI.destroy === 'function') {
            this.instructionsUI.destroy();
        }
        if (this.backpackUI && typeof this.backpackUI.destroy === 'function') {
            this.backpackUI.destroy();
        }
        this.menuButton = null;
        this.menuPanel = null;
        this.menuCloseButton = null;
        this.sfxIcon = null;
        this.musicIcon = null;
        this.sfxSlider = null;
        this.musicSlider = null;
        this.testingModeButton = null;
        this.isMenuOpen = false;
        this.settingsButton = null;
        this.settingsPanel = null;
        this.settingsCloseButton = null;
        this.isSettingsOpen = false;
        this.instructionsButton = null;
        this.instructionsUI = null;
        this.isInstructionsOpen = false;
        this.backpackButton = null;
        this.backpackUI = null;
        this.isBackpackOpen = false;
        this.headerContainer = null;
        this.layoutHeaderButtons = null;
        this.comboListTexts = [];
        this.comboListOrder = [];
    }

    init(data) {
        this.destroyFacilityUI();
        const defaultSfx = CONSTANTS.DEFAULT_SFX_VOLUME;
        const defaultMusic = CONSTANTS.DEFAULT_MUSIC_VOLUME;
        if (data && typeof data.sfxVolume === 'number') {
            this.sfxVolume = this.clampVolume(data.sfxVolume, defaultSfx);
        } else if (data && typeof data.isMuted === 'boolean') {
            this.sfxVolume = data.isMuted ? 0 : defaultSfx;
        } else {
            this.sfxVolume = defaultSfx;
        }

        if (data && typeof data.musicVolume === 'number') {
            this.musicVolume = this.clampVolume(data.musicVolume, defaultMusic);
        } else if (data && typeof data.isMusicMuted === 'boolean') {
            this.musicVolume = data.isMusicMuted ? 0 : defaultMusic;
        } else {
            this.musicVolume = defaultMusic;
        }
        this.tutorialEnabled = !!(data && data.tutorialEnabled);
        this.hardModeEnabled = !!(data && data.hardModeEnabled);
        this.nightmareModeEnabled = !!(data && data.nightmareModeEnabled);
        this.speedrunEnabled = !!(data && data.speedrunEnabled);
        this.applyDifficultySettings();
        this.shownTutorialKeys = new Set();
        this.tutorialQueue = [];
        this.activeTutorialModal = null;
        this.testingModeEnabled = data && typeof data.testingModeEnabled === 'boolean'
            ? data.testingModeEnabled
            : false;
        this.isGameOver = false;
        this.gameOverManager = null;
        this.pathManager = null;
        this.pathUI = null;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.pendingPostCombatTransition = false;
        this.playerGold = 0;
        this.nodeMessage = null;
        this.nodeMessageTween = null;
        this.zoneVisuals = [];
        this.activeFacilityUI = null;
        this.customDiceLoadout = [];
        this.timeBombStates = new Map();
        this.diceRewardUI = null;
        this.resetRelicState();
        this.resetMenuState();
        this.defendPreviewText = null;
        this.attackPreviewText = null;
        this.defendComboText = null;
        this.attackComboText = null;
        this.comboListTexts = [];

        this.maps = Array.isArray(MAP_CONFIGS) ? [...MAP_CONFIGS] : [];
        this.currentMapIndex = -1;
        this.currentMapConfig = null;
        this.currentZoneBackgroundTextureKey = null;

        this.mapTitleText = null;

        this.stopBackgroundMusic();
        this.backgroundMusic = null;
        this.currentMusicKey = null;
    }
    
    create() {
        this.cameras.main.fadeIn(500, 25, 25, 37);
        this.dice = [];
        this.lockedDice = new Set();
        this.pendingLockCount = 0;
        this.weakenedDice = new Set();
        this.pendingWeakenCount = 0;
        this.nullifiedDice = new Set();
        this.pendingNullifyCount = 0;
        this.pendingCrowdControlPlan = null;
        this.rollsRemaining = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.rollsRemainingAtTurnStart = CONSTANTS.DEFAULT_MAX_ROLLS;
        this.playerBlockValue = 0;
        this.playerBurn = 0;
        this.playerHealth = this.playerMaxHealth;
        this.playerBurnText = null;
        this.playerBurnGlowTween = null;
        this.enemyBurnText = null;
        this.enemyBurnGlowTween = null;
        this.playerGold = 0;
        this.currentPathNodeId = null;
        this.inCombat = false;
        this.pendingPostCombatTransition = false;
        this.customDiceLoadout = [];
        this.diceRewardUI = null;
        this.resetRelicState();
        const registry = buildRelicRegistry();
        this.relicCatalog = Array.isArray(registry?.all) ? registry.all : [];
        this.relicPools = {
            general: Array.isArray(registry?.pools?.general) ? registry.pools.general : [],
            boss: Array.isArray(registry?.pools?.boss) ? registry.pools.boss : []
        };
        this.resetMenuState();

        if (this.events && typeof this.events.once === 'function') {
            this.events.once('shutdown', () => {
                this.stopBackgroundMusic();
            });
            this.events.once('destroy', () => {
                this.stopBackgroundMusic();
            });
        }

        this.cameras.main.setBounds(0, -CONSTANTS.HEADER_HEIGHT, this.scale.width, this.scale.height + CONSTANTS.HEADER_HEIGHT);
        this.cameras.main.setScroll(0, -CONSTANTS.HEADER_HEIGHT);
        createHeaderUI(this);
        this.updateGoldUI();

        // --- Dice arrays for zones ---
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(this.getMaxDicePerZone()).fill(null);
        this.attackSlots = Array(this.getMaxDicePerZone()).fill(null);

        // --- Zones ---
        setupZones(this);
        if (!this.zoneVisuals) {
            this.zoneVisuals = [];
        }

        this.createHandAreaBackground();

        this.createZonePreviewTexts();

        // --- Buttons ---
        setupButtons(this);
        this.updateRollButtonState();
        createMenuUI(this);
        createSettingsUI(this);
        this.instructionsUI = new InstructionsUI(this);
        this.backpackUI = new BackpackUI(this);
        this.refreshBackpackContents();
        this.updateBackpackButtonLabel();
        this.relicUI.createShelf();

        this.applyTestingModeStartingResources();

        // --- Health bar ---
        this.healthBar = setupHealthBar(this);
        this.updateHealthUI();

        this.updateMapTitleText();

        this.playerBurnText = this.add.text(0, 0, '', {
            fontSize: '20px',
            color: '#ffb347',
            fontStyle: 'bold'
        }).setVisible(false);
        this.updateBurnUI();

        // --- Enemy ---
        this.enemyManager = new EnemyManager();
        const initialEnemy = this.enemyManager.getCurrentEnemy();
        this.enemyHealthBar = setupEnemyUI(this, initialEnemy ? initialEnemy.name : '???');
        this.enemyIntentText = this.enemyHealthBar.intentText;
        this.enemyStatusText = this.enemyHealthBar.statusText;
        this.enemyBurnText = this.enemyHealthBar.burnText;
        if (this.enemyStatusText) {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
        }
        this.updateEnemyBurnUI();
        const mapLoaded = this.loadMap(0);
        if (!mapLoaded) {
            const fallbackBackgroundTextureKey = this.getBackgroundTextureKeyForConfig(null);
            this.pathManager = new PathManager({
                allowUpgradeNodes: true,
                upgradeNodeMinEnemyIndex: 1
            });
            this.pathUI = new PathUI(
                this,
                this.pathManager,
                () => {},
                {
                    connectionTextureKey: this.getPathTextureKeyForConfig(null),
                    wallTextureKey: this.getWallTextureKeyForConfig(null),
                    backgroundTextureKey: fallbackBackgroundTextureKey,
                    outsideBackgroundEffect: null,
                    onPlayerArrive: node => this.handlePathNodeSelection(node)
                }
            );
            this.updateZoneBackgroundTexture(fallbackBackgroundTextureKey);
            this.updateEnemyHealthUI();
            this.prepareNextEnemyMove();
        }

        this.refreshVolumeUI();

        this.gameOverManager = new GameOverManager(this);
        this.gameOverManager.create();

        this.victoryScreen = new VictoryScreen(this);
        this.victoryScreen.create();

        // Speedrun timer state
        this._speedrunStartTime = null;
        this._speedrunElapsed = 0;
        this._speedrunRunning = false;
        if (this.speedrunEnabled) {
            this.startSpeedrunTimer();
        }

        // --- Roll counter ---
        this.rollsRemainingText = this.add.text(110, CONSTANTS.BUTTONS_Y, `${CONSTANTS.DEFAULT_MAX_ROLLS}`, {
            fontSize: "32px",
            color: "#fff"
        }).setOrigin(0.5);

        if (typeof this.layoutBattleButtons === 'function') {
            this.layoutBattleButtons();
        }

        this.enterMapState();
        this.triggerTutorialEvent('game-start');
    }

    createZonePreviewTexts() {
        const zoneWidth = this.getZoneWidth({ includePadding: true });
        const defendLeftX = (this.defendZoneCenter ? this.defendZoneCenter.x : 200) - zoneWidth / 2 + 16;
        const attackLeftX = (this.attackZoneCenter ? this.attackZoneCenter.x : 600) - zoneWidth / 2 + 16;
        const comboLineOffset = 350;

        if (!this.defendPreviewText) {
            this.defendPreviewText = this.add.text(defendLeftX, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '32px',
                color: '#3498db',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        if (!this.defendComboText) {
            this.defendComboText = this.add.text(defendLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '20px',
                color: '#3498db',
                align: 'right'
            }).setOrigin(1, 0.5);
        }

        if (!this.attackPreviewText) {
            this.attackPreviewText = this.add.text(attackLeftX, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '32px',
                color: '#e74c3c',
                align: 'left'
            }).setOrigin(0, 0.5);
        }

        if (!this.attackComboText) {
            this.attackComboText = this.add.text(attackLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y, '', {
                fontSize: '20px',
                color: '#e74c3c',
                align: 'right'
            }).setOrigin(1, 0.5);
        }

        if (this.defendPreviewText) {
            this.defendPreviewText.setPosition(defendLeftX, CONSTANTS.RESOLVE_TEXT_Y);
        }

        if (this.defendComboText) {
            this.defendComboText.setPosition(defendLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y);
        }

        if (this.attackPreviewText) {
            this.attackPreviewText.setPosition(attackLeftX, CONSTANTS.RESOLVE_TEXT_Y);
        }

        if (this.attackComboText) {
            this.attackComboText.setPosition(attackLeftX + comboLineOffset, CONSTANTS.RESOLVE_TEXT_Y);
        }

        this.updateZonePreviewText();
    }

    getMaxDicePerZone() {
        const base = Number.isFinite(this.maxDicePerZone)
            ? Math.max(1, Math.floor(this.maxDicePerZone))
            : this.defaultMaxDicePerZone;
        return Math.min(CONSTANTS.DICE_PER_SET, base);
    }

    getZoneWidth({ includePadding = false } = {}) {
        const baseWidth = CONSTANTS.DEFAULT_ZONE_WIDTH;
        const ratio = this.getMaxDicePerZone() / CONSTANTS.DICE_PER_SET;
        const clampedWidth = Math.max(180, baseWidth * ratio);
        return includePadding ? clampedWidth + 16 : clampedWidth;
    }

    getZoneHeight() {
        return 90;
    }

    resetZoneConstraints() {
        this.maxDicePerZone = this.defaultMaxDicePerZone;
        this.syncZoneSlotsWithMax();
        this.updateZoneVisualLayout();
        this.createZonePreviewTexts();
    }

    setMaxDicePerZone(maxDice) {
        const clamped = Math.max(1, Math.min(CONSTANTS.DICE_PER_SET, Math.floor(Number(maxDice) || 0)));
        const previous = this.getMaxDicePerZone();

        if (clamped === previous) {
            return;
        }

        this.maxDicePerZone = clamped;
        this.syncZoneSlotsWithMax();
        this.updateZoneVisualLayout();
        this.createZonePreviewTexts();
    }

    syncZoneSlotsWithMax() {
        this.adjustZoneForMax('defend');
        this.adjustZoneForMax('attack');
    }

    adjustZoneForMax(zoneType) {
        const slotsKey = zoneType === 'defend' ? 'defendSlots' : 'attackSlots';
        const diceKey = zoneType === 'defend' ? 'defendDice' : 'attackDice';
        const maxSlots = this.getMaxDicePerZone();

        if (!Array.isArray(this[slotsKey])) {
            this[slotsKey] = Array(maxSlots).fill(null);
        }

        if (!Array.isArray(this[diceKey])) {
            this[diceKey] = [];
        }

        const slots = this[slotsKey];
        const diceList = this[diceKey];

        if (slots.length > maxSlots) {
            const removed = slots.splice(maxSlots);
            const diceToEject = removed.filter(die => !!die);

            if (diceToEject.length > 0) {
                const keptDice = diceList.filter(die => !diceToEject.includes(die));
                diceList.length = 0;
                keptDice.forEach(die => diceList.push(die));

                diceToEject.forEach(die => {
                    if (!die) {
                        return;
                    }
                    snapToGrid(die, this.dice, this);
                });
            }
        } else if (slots.length < maxSlots) {
            while (slots.length < maxSlots) {
                slots.push(null);
            }
        }

        this.layoutZoneDice(zoneType);
    }

    layoutZoneDice(zoneType) {
        const slots = zoneType === 'defend' ? this.defendSlots : this.attackSlots;
        const center = zoneType === 'defend' ? this.defendZoneCenter : this.attackZoneCenter;

        if (!Array.isArray(slots) || !center) {
            return;
        }

        const zoneWidth = this.getZoneWidth();
        const spacing = slots.length > 0 ? zoneWidth / slots.length : zoneWidth;

        slots.forEach((die, index) => {
            if (!die) {
                return;
            }

            die.x = center.x - zoneWidth / 2 + spacing / 2 + index * spacing;
            die.y = center.y;
            die.setDepth(2);
            die.currentZone = zoneType;
            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }
        });

        const diceKey = zoneType === 'defend' ? 'defendDice' : 'attackDice';
        if (Array.isArray(this[diceKey])) {
            const orderedDice = slots.filter(die => !!die);
            const diceList = this[diceKey];
            diceList.length = 0;
            orderedDice.forEach(die => diceList.push(die));
        }
    }

    handleDiePlacedInZone() {
        this.triggerTutorialEvent('first-zone-placement');
    }

    updateZoneVisualLayout() {
        const zoneWidthWithPadding = this.getZoneWidth({ includePadding: true });
        const zoneHeight = this.getZoneHeight();

        if (this.defendZone) {
            this.defendZone.setSize(zoneWidthWithPadding, zoneHeight);
        }
        if (this.attackZone) {
            this.attackZone.setSize(zoneWidthWithPadding, zoneHeight);
        }

        if (this.defendZoneBackground) {
            this.defendZoneBackground.setSize(zoneWidthWithPadding, zoneHeight);
            this.defendZoneBackground.setDisplaySize(zoneWidthWithPadding, zoneHeight);
        }
        if (this.attackZoneBackground) {
            this.attackZoneBackground.setSize(zoneWidthWithPadding, zoneHeight);
            this.attackZoneBackground.setDisplaySize(zoneWidthWithPadding, zoneHeight);
        }

        if (this.defendZoneRect) {
            this.defendZoneRect.setSize(zoneWidthWithPadding, zoneHeight);
        }
        if (this.attackZoneRect) {
            this.attackZoneRect.setSize(zoneWidthWithPadding, zoneHeight);
        }

        if (this.defendHighlight) {
            this.defendHighlight.setSize(zoneWidthWithPadding, zoneHeight);
        }
        if (this.attackHighlight) {
            this.attackHighlight.setSize(zoneWidthWithPadding, zoneHeight);
        }

        if (this.zoneAreaBackground && this.defendZoneCenter && this.attackZoneCenter) {
            const defendCenterX = this.defendZoneCenter.x;
            const attackCenterX = this.attackZoneCenter.x;
            const zoneAreaCenterX = (defendCenterX + attackCenterX) / 2;
            const zoneAreaWidth = Math.abs(attackCenterX - defendCenterX) + zoneWidthWithPadding + ZONE_AREA_PADDING_X * 2;

            const zoneCenterY = this.defendZoneCenter.y;
            const zoneTop = zoneCenterY - zoneHeight / 2;
            const zoneBottom = zoneCenterY + zoneHeight / 2;
            const zoneAreaTop = zoneTop - ZONE_LABEL_OFFSET - (ZONE_LABEL_FONT_SIZE / 2) - ZONE_AREA_PADDING_TOP;
            const zoneAreaBottom = zoneBottom + ZONE_AREA_PADDING_BOTTOM;
            const zoneAreaHeight = zoneAreaBottom - zoneAreaTop;
            const zoneAreaCenterY = zoneAreaTop + zoneAreaHeight / 2;

            this.zoneAreaBackground.setPosition(zoneAreaCenterX, zoneAreaCenterY + 10);
            this.zoneAreaBackground.setSize(zoneAreaWidth - 32, zoneAreaHeight + 30);
        }

        this.updateHandAreaBackground();

        this.layoutZoneDice('defend');
        this.layoutZoneDice('attack');
    }

    createHandAreaBackground() {
        if (!Array.isArray(this.zoneVisuals)) {
            this.zoneVisuals = [];
        }

        if (this.handAreaBackground && this.handAreaBackground.destroy) {
            this.zoneVisuals = this.zoneVisuals.filter(visual => visual !== this.handAreaBackground);
            this.handAreaBackground.destroy();
            this.handAreaBackground = null;
        }

        const background = this.add.rectangle(0, 0, 10, 10, 0x000000, HAND_AREA_BACKGROUND_ALPHA)
            .setOrigin(0.5);
        background.setStrokeStyle(4, 0x000000, 1);
        background.setDepth(-2);

        this.handAreaBackground = background;
        this.zoneVisuals.push(background);
        this.updateHandAreaBackground();
    }

    updateHandAreaBackground() {
        if (!this.handAreaBackground || !this.handAreaBackground.scene) {
            return;
        }

        const layout = this.getHandSlotLayout({ totalSlots: this.getHandSlotCount() }) || {};
        const slotCount = Math.max(1, Number.isFinite(layout.totalSlots) ? Math.floor(layout.totalSlots) : this.getHandSlotCount());
        const spacing = Number.isFinite(layout.spacing) ? layout.spacing : CONSTANTS.SLOT_SPACING;
        const startX = Number.isFinite(layout.startX) ? layout.startX : CONSTANTS.SLOT_START_X;
        const totalWidth = CONSTANTS.DIE_SIZE + (slotCount - 1) * spacing;
        const centerX = startX + ((slotCount - 1) * spacing) / 2;
        const centerY = CONSTANTS.GRID_Y + HAND_AREA_PADDING_Y / 2 + 5;
        const width = totalWidth + HAND_AREA_PADDING_X * 2;
        const height = CONSTANTS.DIE_SIZE + HAND_AREA_PADDING_Y * 2;

        this.handAreaBackground.setPosition(centerX, centerY);
        this.handAreaBackground.setSize(width, height);
        this.handAreaBackground.setDisplaySize(width, height);
    }

    getBaseHandSlotCount() {
        const base = CONSTANTS.DICE_PER_SET;
        return base + (this.isBatteryDieAvailable() ? 1 : 0);
    }

    getHandSlotCount() {
        const count = Number.isFinite(this.currentHandSlotCount)
            ? this.currentHandSlotCount
            : this.getBaseHandSlotCount();
        return Math.max(1, Math.floor(count));
    }

    setHandSlotCount(count, { relayout = true } = {}) {
        const sanitized = Math.max(1, Math.floor(Number(count) || CONSTANTS.DICE_PER_SET));
        if (this.currentHandSlotCount === sanitized) {
            return;
        }

        this.currentHandSlotCount = sanitized;

        this.updateHandAreaBackground();

        if (relayout) {
            this.layoutHandDice({ animate: true });
        }
    }

    refreshHandSlotCount() {
        this.setHandSlotCount(this.getBaseHandSlotCount(), { relayout: true });
    }

    getHandSlotLayout({ totalSlots } = {}) {
        const spacing = CONSTANTS.SLOT_SPACING;
        const baseCenter = CONSTANTS.SLOT_START_X + ((CONSTANTS.DICE_PER_SET - 1) * spacing) / 2;
        const slotCount = Number.isFinite(totalSlots)
            ? Math.max(1, Math.floor(totalSlots))
            : this.getHandSlotCount();
        const startX = baseCenter - ((slotCount - 1) * spacing) / 2;
        return {
            startX,
            spacing,
            totalSlots: slotCount,
            centerX: baseCenter
        };
    }

    layoutHandDice({ animate = false } = {}) {
        if (!Array.isArray(this.dice) || this.dice.length === 0) {
            return;
        }

        const layout = this.getHandSlotLayout();
        const startX = layout.startX;
        const spacing = layout.spacing;

        this.dice.forEach((die, index) => {
            if (!die) {
                return;
            }

            const targetX = startX + index * spacing;
            const targetY = CONSTANTS.GRID_Y;

            if (animate && this.tweens) {
                this.tweens.add({
                    targets: die,
                    x: targetX,
                    y: targetY,
                    duration: 200,
                    ease: 'Power2'
                });
            } else {
                die.x = targetX;
                die.y = targetY;
            }

            die.slotIndex = index;
        });

        this.updateHandAreaBackground();
    }

    isBatteryDieAvailable() {
        if (!this.hasBatteryIncludedRelic || !this.batteryDieState || !this.batteryDieState.blueprint) {
            return false;
        }

        const uses = Number.isFinite(this.batteryDieState.usesRemaining)
            ? this.batteryDieState.usesRemaining
            : 0;
        return uses > 0;
    }

    getBatteryDieUsesRemaining() {
        if (!this.batteryDieState) {
            return 0;
        }
        const uses = Number.isFinite(this.batteryDieState.usesRemaining)
            ? this.batteryDieState.usesRemaining
            : 0;
        return Math.max(0, uses);
    }

    toggleMenu() {
        if (!this.menuPanel) {
            return;
        }

        if (this.isMenuOpen) {
            this.closeMenu();
        } else {
            this.openMenu();
        }
    }

    openMenu() {
        if (this.isMenuOpen) {
            return;
        }

        this.closeSettings();
        this.closeInstructions();
        this.closeBackpack();
        this.isMenuOpen = true;
        if (this.menuPanel) {
            this.menuPanel.setVisible(true);
            this.menuPanel.setDepth(80);
        }

        this.updateMenuButtonLabel();
    }

    closeMenu() {
        this.isMenuOpen = false;
        if (this.menuPanel) {
            this.menuPanel.setVisible(false);
        }

        this.updateMenuButtonLabel();
    }

    updateMenuButtonLabel() {
        if (!this.menuButton) {
            return;
        }

        const suffix = this.isMenuOpen ? '✕' : '☰';
        this.menuButton.setText(`${suffix}`);
        const targetFontSize = suffix === '✕'
            ? this.menuButton.getData('defaultFontSize') || '32px'
            : this.menuButton.getData('expandedFontSize') || this.menuButton.getData('defaultFontSize') || '32px';
        const parsedMenuFontSize = typeof targetFontSize === 'string'
            ? parseInt(targetFontSize, 10)
            : targetFontSize;
        if (Number.isFinite(parsedMenuFontSize)) {
            this.menuButton.setFontSize(parsedMenuFontSize);
        }
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleSettings() {
        if (!this.settingsPanel) {
            return;
        }

        if (this.isSettingsOpen) {
            this.closeSettings();
        } else {
            this.openSettings();
        }
    }

    openSettings() {
        if (this.isSettingsOpen) {
            return;
        }

        this.closeMenu();
        this.closeInstructions();
        this.closeBackpack();
        this.isSettingsOpen = true;
        if (this.settingsPanel) {
            this.settingsPanel.setVisible(true);
            this.settingsPanel.setDepth(80);
        }

        this.updateSettingsButtonLabel();
        this.updateSfxVolumeUI();
        this.updateMusicVolumeUI();
        this.updateTestingModeButtonState();
    }

    closeSettings() {
        this.isSettingsOpen = false;
        if (this.settingsPanel) {
            this.settingsPanel.setVisible(false);
        }

        this.updateSettingsButtonLabel();
    }

    updateSettingsButtonLabel() {
        if (!this.settingsButton) {
            return;
        }

        const suffix = this.isSettingsOpen ? '✕' : '⚙';
        this.settingsButton.setText(`${suffix}`);
        const targetFontSize = suffix === '✕'
            ? this.settingsButton.getData('defaultFontSize') || '32px'
            : this.settingsButton.getData('expandedFontSize') || this.settingsButton.getData('defaultFontSize') || '32px';
        const parsedSettingsFontSize = typeof targetFontSize === 'string'
            ? parseInt(targetFontSize, 10)
            : targetFontSize;
        if (Number.isFinite(parsedSettingsFontSize)) {
            this.settingsButton.setFontSize(parsedSettingsFontSize);
        }
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleInstructions() {
        if (!this.instructionsUI) {
            return;
        }

        if (this.isInstructionsOpen) {
            this.closeInstructions();
        } else {
            this.openInstructions();
        }
    }

    openInstructions() {
        if (this.isInstructionsOpen || !this.instructionsUI) {
            return;
        }

        this.closeMenu();
        this.closeSettings();
        this.closeBackpack();
        this.isInstructionsOpen = true;
        this.instructionsUI.open();
        this.updateInstructionsButtonLabel();
    }

    closeInstructions() {
        this.isInstructionsOpen = false;
        if (this.instructionsUI) {
            this.instructionsUI.close();
        }
        this.updateInstructionsButtonLabel();
    }

    updateInstructionsButtonLabel() {
        if (!this.instructionsButton) {
            return;
        }

        const suffix = this.isInstructionsOpen ? '✕' : '📘';
        this.instructionsButton.setText(`${suffix}`);
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    toggleBackpack() {
        if (!this.backpackUI) {
            return;
        }

        if (this.isBackpackOpen) {
            this.closeBackpack();
        } else {
            this.openBackpack();
        }
    }

    openBackpack() {
        if (this.isBackpackOpen || !this.backpackUI) {
            return;
        }

        this.closeMenu();
        this.closeSettings();
        this.closeInstructions();

        this.isBackpackOpen = true;
        this.backpackUI.open();
        this.updateBackpackButtonLabel();
    }

    closeBackpack() {
        if (this.backpackUI && this.isBackpackOpen) {
            this.backpackUI.close();
        } else if (this.backpackUI) {
            this.backpackUI.setVisible(false);
        }

        this.isBackpackOpen = false;
        this.updateBackpackButtonLabel();
    }

    updateBackpackButtonLabel() {
        if (!this.backpackButton) {
            return;
        }

        const suffix = this.isBackpackOpen ? '✕' : '🎒';
        this.backpackButton.setText(`${suffix}`);
        if (this.layoutHeaderButtons) {
            this.layoutHeaderButtons();
        }
    }

    refreshBackpackContents() {
        if (this.backpackUI) {
            this.backpackUI.refreshContent();
        }
        this.updateBossRelicRewardCapacity();
    }

    update() {
        // Update logic here
        if (this._speedrunRunning) {
            const now = Date.now();
            const elapsed = Math.max(0, Math.floor((now - (this._speedrunStartTime || now)) / 1000));
            this._speedrunElapsed = elapsed;
            if (this.speedrunTimerText && typeof this.speedrunTimerText.setText === 'function') {
                const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
                const ss = String(elapsed % 60).padStart(2, '0');
                this.speedrunTimerText.setText(`${mm}:${ss}`);
                this.speedrunTimerText.setVisible(true);
            }
        }
    }

    startSpeedrunTimer() {
        if (this._speedrunRunning) return;
        this._speedrunStartTime = Date.now();
        this._speedrunRunning = true;
        if (this.speedrunTimerText) {
            this.speedrunTimerText.setText('00:00');
            this.speedrunTimerText.setVisible(true);
        }
    }

    stopSpeedrunTimer() {
        if (!this._speedrunRunning) return;
        this._speedrunRunning = false;
        if (this.speedrunTimerText) {
            // leave final time visible
            // optionally hide later
        }
    }

    executeZoneEffects(effects, zone, { attackResult, defendResult } = {}) {
        if (!Array.isArray(effects)) {
            return;
        }

        effects.forEach(effect => {
            if (typeof effect === 'function') {
                effect({
                    scene: this,
                    zone,
                    attackResult,
                    defendResult
                });
            }
        });
    }

    getPerfectBalanceBonus({ zone, diceList } = {}) {
        if (!this.hasPerfectBalanceRelic || !zone) {
            return 0;
        }

        const currentCount = Array.isArray(diceList)
            ? diceList.filter(die => !!die).length
            : 0;

        let opposingDice = null;
        if (zone === 'defend') {
            opposingDice = this.attackDice;
        } else if (zone === 'attack') {
            opposingDice = this.defendDice;
        } else {
            return 0;
        }

        const opposingCount = Array.isArray(opposingDice)
            ? opposingDice.filter(die => !!die).length
            : 0;

        if (currentCount <= 0 || opposingCount <= 0 || currentCount !== opposingCount) {
            return 0;
        }

        const bonus = typeof this.perfectBalanceZoneBonus === 'number'
            ? this.perfectBalanceZoneBonus
            : 4;
        return bonus;
    }

    computeZoneScore(diceList, { zone } = {}) {
        const diceValues = Array.isArray(diceList)
            ? diceList.map(die => (die && typeof die.value === 'number') ? die.value : 0)
            : [];
        const rerollBonus = zone === 'defend' ? this.rerollDefenseBonus : 0; // Re-Roll with it relic bonus.

        const wildcardFlags = Array.isArray(diceList)
            ? diceList.map(die => {
                const dieWildcard = doesDieActAsWildcardForCombo(die);
                const relicWildcard = this.hasWildOneRelic && die && die.value === 1;
                return dieWildcard || relicWildcard;
            })
            : [];
        const wildcardIndices = wildcardFlags.reduce((indices, isWildcard, index) => {
            if (isWildcard) {
                indices.push(index);
            }
            return indices;
        }, []);
        const comboPointsTable = this.getComboPointsTable();
        const evaluateOptions = {
            overrideValues: [...diceValues]
        };
        if (wildcardIndices.length > 0) {
            evaluateOptions.resolveWildcards = (values, evaluator) => resolveWildcardCombo(values, evaluator, {
                wildcardIndices,
                comboPointsTable
            });
        }
        const comboInfo = evaluateCombo(diceList, evaluateOptions);
        const comboType = comboInfo.type;
        const assignments = Array.isArray(comboInfo.assignments) ? [...comboInfo.assignments] : [...diceValues];
        const contributions = Array.isArray(diceList)
            ? diceList.map(die => computeDieContribution(this, die, { zone, comboType }))
            : [];

        const baseContribution = contributions.reduce((sum, entry) => sum + (entry && entry.faceValueContribution ? entry.faceValueContribution : 0), 0);
        const comboBonusExtra = contributions.reduce((sum, entry) => sum + (entry && entry.comboBonusModifier ? entry.comboBonusModifier : 0), 0);

        const perfectBalanceBonus = this.getPerfectBalanceBonus({ zone, diceList });
        const chargerBonus = this.getChargerZoneBonus(zone);
        const baseWithoutCharger = baseContribution + rerollBonus + perfectBalanceBonus;
        const baseSum = baseWithoutCharger + chargerBonus;
        const comboBonus = scoreCombo(comboType, comboPointsTable) + comboBonusExtra;
        const preResolutionEffects = contributions.flatMap(entry => (entry && Array.isArray(entry.preResolutionEffects)) ? entry.preResolutionEffects : []);
        const postResolutionEffects = contributions.flatMap(entry => (entry && Array.isArray(entry.postResolutionEffects)) ? entry.postResolutionEffects : []);

        return {
            baseSum,
            comboBonus,
            comboType,
            total: baseSum + comboBonus,
            assignments,
            wildcardFlags,
            preResolutionEffects,
            postResolutionEffects,
            perfectBalanceBonus,
            chargerBonus,
            baseWithoutCharger
        };
    }

    getComboPointsTable() {
        const table = {};
        Object.keys(COMBO_POINTS).forEach(combo => {
            const baseValue = COMBO_POINTS[combo] || 0;
            let value = baseValue;

            if (this.hasChainReactorRelic) {
                if (Object.prototype.hasOwnProperty.call(CHAIN_REACTOR_BONUS_OVERRIDES, combo)) {
                    value = CHAIN_REACTOR_BONUS_OVERRIDES[combo];
                } else if (baseValue > 0) {
                    value = Math.round(baseValue * 1.25);
                }
            }

            table[combo] = Math.max(0, Math.round(value));
        });
        return table;
    }

    updateComboListDisplay() {
        if (!Array.isArray(this.comboListTexts) || this.comboListTexts.length === 0) {
            return;
        }

        const table = this.getComboPointsTable();
        const order = Array.isArray(this.comboListOrder) && this.comboListOrder.length === this.comboListTexts.length
            ? this.comboListOrder
            : Object.keys(table);

        order.forEach((combo, index) => {
            const textObj = this.comboListTexts[index];
            if (!textObj || typeof textObj.setText !== 'function') {
                return;
            }

            const points = Number.isFinite(table[combo]) ? table[combo] : 0;
            textObj.setText(`${combo}: ${points}`);
        });
    }

    applyRerollDefenseBonus(count) {
        // Re-Roll with it relic: accumulate bonus defense for each reroll.
        if (!this.rerollDefensePerDie || count <= 0) {
            return;
        }

        const gained = count * this.rerollDefensePerDie;
        this.rerollDefenseBonus += gained;
    }

    notifyEnemyOfRerolls(count) {
        if (!this.enemyManager || count <= 0) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (enemy && typeof enemy.onPlayerReroll === 'function') {
            enemy.onPlayerReroll({
                count,
                enemyManager: this.enemyManager,
                scene: this,
                isInitialRoll: false
            });
            this.refreshEnemyIntentText();
            this.updateEnemyStatusText();
        }
    }

    updateWildcardDisplays({
        defendAssignments,
        attackAssignments,
        defendWildcardFlags,
        attackWildcardFlags,
        defendComboType,
        attackComboType
    } = {}) {
        // Wild effects: keep dice visuals aligned with wildcard assignments.
        const diceSet = new Set([
            ...(Array.isArray(this.dice) ? this.dice : []),
            ...(Array.isArray(this.defendDice) ? this.defendDice : []),
            ...(Array.isArray(this.attackDice) ? this.attackDice : [])
        ]);

        const getWildcardStatus = (die, index, wildcardFlags) => {
            if (!die) {
                return false;
            }
            if (Array.isArray(wildcardFlags) && typeof wildcardFlags[index] === 'boolean') {
                if (wildcardFlags[index]) {
                    return true;
                }
            }
            const relicWildcard = this.hasWildOneRelic && die.value === 1;
            return relicWildcard || doesDieActAsWildcardForCombo(die);
        };

        const wildcardMap = new Map();

        const registerWildcardFlags = (diceList, wildcardFlags) => {
            if (!Array.isArray(diceList)) {
                return;
            }
            diceList.forEach((die, index) => {
                if (!die) {
                    return;
                }
                const isWildcard = getWildcardStatus(die, index, wildcardFlags);
                if (!wildcardMap.has(die)) {
                    wildcardMap.set(die, isWildcard);
                } else if (isWildcard) {
                    wildcardMap.set(die, true);
                }
            });
        };

        registerWildcardFlags(this.defendDice, defendWildcardFlags);
        registerWildcardFlags(this.attackDice, attackWildcardFlags);

        diceSet.forEach(die => {
            if (!die || typeof die.renderFace !== 'function') {
                return;
            }

            const isWildcard = wildcardMap.has(die)
                ? wildcardMap.get(die)
                : (this.hasWildOneRelic && die.value === 1) || doesDieActAsWildcardForCombo(die);
            const pipColor = isWildcard ? 0xcc1111 : 0x000000;
            die.renderFace(die.value, { pipColor, updateValue: false });
            die.wildAssignedValue = null;
            if (typeof die.hideWildBaseValueOverlay === 'function') {
                die.hideWildBaseValueOverlay();
            }
        });

        const applyAssignments = (diceList, assignments, wildcardFlags, comboType) => {
            if (!Array.isArray(diceList) || !Array.isArray(assignments)) {
                return;
            }

            const hasCombo = typeof comboType === 'string' && comboType !== 'No combo';

            diceList.forEach((die, index) => {
                if (!die || typeof die.renderFace !== 'function') {
                    return;
                }

                const isWildcard = getWildcardStatus(die, index, wildcardFlags);
                if (!isWildcard) {
                    return;
                }

                if (!hasCombo) {
                    return;
                }

                const assignedValue = assignments[index];
                if (typeof assignedValue !== 'number') {
                    return;
                }

                const boundedValue = Math.max(1, Math.min(6, assignedValue));
                // Wild visuals: show chosen wildcard value with red pips.
                die.renderFace(boundedValue, { pipColor: 0xcc1111, updateValue: false });
                die.wildAssignedValue = boundedValue;
                if (boundedValue !== die.value && typeof die.showWildBaseValueOverlay === 'function') {
                    die.showWildBaseValueOverlay(die.value);
                }
            });
        };

        applyAssignments(this.defendDice, defendAssignments, defendWildcardFlags, defendComboType);
        applyAssignments(this.attackDice, attackAssignments, attackWildcardFlags, attackComboType);
    }

    updateZonePreviewText() {
        const defendScore = this.computeZoneScore(this.defendDice || [], { zone: 'defend' });
        const attackScore = this.computeZoneScore(this.attackDice || [], { zone: 'attack' });

        const pendingTimeBombBonus = Number.isFinite(this.activeTimeBombResolveBonus)
            ? this.activeTimeBombResolveBonus
            : 0;
        if (pendingTimeBombBonus > 0) {
            attackScore.baseSum = (attackScore.baseSum || 0) + pendingTimeBombBonus;
            attackScore.total = (attackScore.total || 0) + pendingTimeBombBonus;
            attackScore.timeBombBonus = (attackScore.timeBombBonus || 0) + pendingTimeBombBonus;
        }

        this.updateWildcardDisplays({
            defendAssignments: defendScore.assignments,
            attackAssignments: attackScore.assignments,
            defendWildcardFlags: defendScore.wildcardFlags,
            attackWildcardFlags: attackScore.wildcardFlags,
            defendComboType: defendScore.comboType,
            attackComboType: attackScore.comboType
        });

        if (!this.defendPreviewText || !this.attackPreviewText) {
            return;
        }

        const formatScoreLine = score => {
            const baseWithoutCharger = Number.isFinite(score.baseWithoutCharger)
                ? score.baseWithoutCharger
                : ((score.baseSum || 0) - (score.chargerBonus || 0) - (score.timeBombBonus || 0));
            const breakdown = [`${baseWithoutCharger}`];
            if (Number.isFinite(score.chargerBonus) && score.chargerBonus > 0) {
                breakdown.push(`${score.chargerBonus}`);
            }
            if (Number.isFinite(score.timeBombBonus) && score.timeBombBonus > 0) {
                breakdown.push(`${score.timeBombBonus}`);
            }
            breakdown.push(`${score.comboBonus}`);
            const total = Number.isFinite(score.total)
                ? score.total
                : baseWithoutCharger + (score.chargerBonus || 0) + (score.timeBombBonus || 0) + (score.comboBonus || 0);
            return `${total}: ${breakdown.join('+')}`;
        };
        const formatComboLine = score => `${score.comboType}`;

        this.defendPreviewText.setText(formatScoreLine(defendScore));
        if (this.defendComboText) {
            this.defendComboText.setText(formatComboLine(defendScore));
        }

        this.attackPreviewText.setText(formatScoreLine(attackScore));
        if (this.attackComboText) {
            this.attackComboText.setText(formatComboLine(attackScore));
        }
    }

    rollDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        // Determine which sound to play
        let diceInPlay = this.getDiceInPlay();
        const diceSelectedCount = diceInPlay.filter(d => d.selected).length;
        const isFirstRoll = this.rollsRemaining === this.rollsRemainingAtTurnStart;

        playDiceRollSounds(this, {
            isFirstRoll,
            totalDice: diceInPlay.length,
            selectedCount: diceSelectedCount
        });

        // First roll → create dice
        if (isFirstRoll) {
            this.dice = [];
            const blueprints = this.getActiveDiceBlueprints();
            const slotCount = blueprints.length;
            blueprints.forEach((blueprint, index) => {
                const die = createDie(this, index, blueprint, slotCount);
                this.dice.push(die);
            });
            diceInPlay = this.getDiceInPlay();
        }

        // Roll dice (first roll = all dice, later rolls = only selected dice)
        let rerolledCount = 0;
        diceInPlay.forEach(d => {
            if (isFirstRoll || d.selected) {
                if (!isFirstRoll && d.selected) {
                    rerolledCount++;
                }
                d.roll();
                d.selected = false;
                d.updateVisualState();
            }
        });

        if (!isFirstRoll && rerolledCount > 0) {
            this.applyRerollDefenseBonus(rerolledCount);
            this.notifyEnemyOfRerolls(rerolledCount);
        }

        if (isFirstRoll) {
            this.applyCrowdControlPlan();
            this.applyPendingLocks();
            this.applyPendingWeaken();
            this.applyPendingNullify();
        }



        this.updateZonePreviewText();

        // Decrement rolls remaining
        this.rollsRemaining--;
        this.rollsRemainingText.setText(`${this.rollsRemaining}`);

        this.updateRollButtonState();

        // Enable sort button after the first roll
        setTextButtonEnabled(this.sortButton, true);
    }

    applyTestingModeStartingResources() {
        if (!this.testingModeEnabled) {
            return;
        }

        this.populateTestingModeDiceLoadout();
        this.grantTestingModeRelics(6);
    }

    populateTestingModeDiceLoadout() {
        if (!this.testingModeEnabled) {
            return;
        }

        const pool = Array.isArray(SELECTABLE_CUSTOM_DICE_IDS) ? [...SELECTABLE_CUSTOM_DICE_IDS] : [];
        if (pool.length === 0) {
            return;
        }

        const basePool = [...pool];
        const selections = [];
        let workingPool = [...basePool];

        while (selections.length < MAX_CUSTOM_DICE && workingPool.length > 0) {
            const index = getRandomIndexExclusive(workingPool.length);
            selections.push(workingPool.splice(index, 1)[0]);

            if (workingPool.length === 0 && selections.length < MAX_CUSTOM_DICE && basePool.length > 0) {
                workingPool = [...basePool];
            }
        }

        this.customDiceLoadout = [];
        selections.forEach(id => {
            this.addCustomDieToLoadout(id);
        });
    }

    grantTestingModeRelics(targetCount = 6) {
        if (!this.testingModeEnabled || typeof targetCount !== 'number' || targetCount <= 0) {
            return;
        }

        const unowned = typeof this.getUnownedRelics === 'function' ? this.getUnownedRelics() : [];
        const available = Array.isArray(unowned) ? [...unowned] : [];
        if (available.length === 0) {
            return;
        }

        const pool = [...available];
        const selections = [];

        while (selections.length < targetCount && pool.length > 0) {
            const index = getRandomIndexExclusive(pool.length);
            selections.push(pool.splice(index, 1)[0]);
        }

        let grantedAny = false;
        selections.forEach(relic => {
            if (this.grantRelicDirectly(relic, { skipUiUpdate: true })) {
                grantedAny = true;
            }
        });

        if (grantedAny && this.relicUI) {
            this.relicUI.updateDisplay();
        }
    }

    grantRelicDirectly(relic, { skipUiUpdate = false, ignoreCapacity = false } = {}) {
        if (!relic || !relic.id || this.ownedRelicIds.has(relic.id)) {
            return false;
        }

        if (!ignoreCapacity && this.isRelicCapacityFull()) {
            return false;
        }

        this.ownedRelicIds.add(relic.id);
        this.relics.push(relic);

        if (typeof relic.apply === 'function') {
            relic.apply(this);
        }
        if (relic.id === 'wild-one') {
            this.triggerTutorialEvent('wild-power');
        }

        if (!skipUiUpdate && this.relicUI) {
            this.relicUI.updateDisplay();
        }

        this.refreshBackpackContents();
        this.refreshShopInterface();

        return true;
    }

    discardRelicById(relicId) {
        if (!relicId || !this.ownedRelicIds.has(relicId)) {
            return false;
        }

        const ownedIndex = Array.isArray(this.relics)
            ? this.relics.findIndex(relic => relic && relic.id === relicId)
            : -1;

        const relic = ownedIndex !== -1 ? this.relics[ownedIndex] : null;

        if (ownedIndex !== -1) {
            this.relics = this.relics.filter((_, index) => index !== ownedIndex);
        }

        this.ownedRelicIds.delete(relicId);

        this.removeRelicEffects(relic || { id: relicId });

        if (this.relicUI) {
            this.relicUI.updateDisplay();
        }

        this.refreshBackpackContents();
        this.updateZonePreviewText();
        this.addGold(50);
        this.refreshShopInterface();

        return true;
    }

    removeRelicEffects(relic) {
        if (!relic || !relic.id) {
            return;
        }

        switch (relic.id) {
            case 'beefy':
                this.decreasePlayerMaxHealth(20);
                break;
            case 'family':
                this.hasFamilyRelic = false;
                this.familyHealPerFullHouse = 0;
                break;
            case 'reroll-with-it':
                this.rerollDefensePerDie = Math.max(0, (this.rerollDefensePerDie || 0) - 1);
                this.rerollDefenseBonus = 0;
                break;
            case 'wild-one':
                this.hasWildOneRelic = false;
                this.refreshActiveDiceVisuals();
                break;
            case 'unlocked-and-loaded':
                this.cleanseCursesOnLongStraights = false;
                break;
            case 'chain-reactor':
                this.hasChainReactorRelic = false;
                this.updateComboListDisplay();
                this.updateZonePreviewText();
                break;
            case 'battery-included':
                this.hasBatteryIncludedRelic = false;
                this.batteryDieState = null;
                this.refreshHandSlotCount();
                this.updateZonePreviewText();
                break;
            case 'blockbuster':
                this.hasBlockbusterRelic = false;
                break;
            case 'rain':
                this.hasRainRelic = false;
                this.playerBurnReductionPerTurn = 0;
                break;
            case 'perfect-balance':
                this.hasPerfectBalanceRelic = false;
                this.perfectBalanceZoneBonus = 0;
                break;
            case 'prepper':
                this.rollCarryoverEnabled = false;
                this.prepperFirstTurnBonusRolls = 0;
                this.prepperCarryoverRolls = 0;
                break;
            default:
                break;
        }
    }

    addCustomDieToLoadout(id, options = {}) {
        if (!id) {
            return false;
        }

        if (!Array.isArray(this.customDiceLoadout)) {
            this.customDiceLoadout = [];
        }

        if (this.customDiceLoadout.length >= MAX_CUSTOM_DICE) {
            this.updateDiceRewardHandState();
            return false;
        }

        const blueprint = createDieBlueprint(id, { isUpgraded: !!options.isUpgraded });
        this.customDiceLoadout = [...this.customDiceLoadout, blueprint];
        if (id === 'wild') {
            this.triggerTutorialEvent('wild-power');
        }
        this.refreshBackpackContents();
        this.updateDiceRewardHandState();
        return true;
    }

    upgradeCustomDieById(id) {
        if (!id || !Array.isArray(this.customDiceLoadout)) {
            return false;
        }

        let upgraded = false;
        this.customDiceLoadout = this.customDiceLoadout.map(entry => {
            if (!upgraded && entry.id === id && !entry.isUpgraded) {
                upgraded = true;
                return { ...entry, isUpgraded: true };
            }
            return { ...entry };
        });

        if (upgraded) {
            this.getDiceInPlay().forEach(die => {
                if (die && die.dieBlueprint && die.dieBlueprint.id === id) {
                    die.dieBlueprint = { ...die.dieBlueprint, isUpgraded: true };
                    if (typeof die.updateEmoji === 'function') {
                        die.updateEmoji();
                    }
                }
            });
            this.refreshBackpackContents();
        }

        return upgraded;
    }

    handleCustomDieSelection(id, definition) {
        const added = this.addCustomDieToLoadout(id);
        if (!added) {
            this.updateDiceRewardHandState();
            return false;
        }

        if (definition && (definition.name || definition.emoji)) {
            const label = [definition.emoji || '', definition.name || 'Die'].join(' ').trim();
            this.showNodeMessage(`Added ${label}`, '#f9e79f');
        }

        return true;
    }

    presentCustomDieReward() {
        if (this.diceRewardUI) {
            this.diceRewardUI.destroy();
            this.diceRewardUI = null;
        }

        const options = getRandomCustomDieOptions(this, 3);
        if (!Array.isArray(options) || options.length === 0) {
            this.requestEnterMapStateAfterCombat();
            return;
        }

        const capacityState = this.getDiceRewardCapacityState();
        this.diceRewardUI = new DiceRewardUI(this, {
            options,
            currentCount: capacityState.currentCount,
            maxCount: capacityState.maxCount,
            onSelect: (id, definition) => this.handleCustomDieSelection(id, definition),
            onSkip: () => true,
            onClose: () => {
                this.diceRewardUI = null;
                this.requestEnterMapStateAfterCombat();
            }
        });
        this.updateDiceRewardHandState();
    }

    applyPendingLocks() {
        if (this.pendingLockCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => !die.isLocked);
        if (availableDice.length === 0) {
            return;
        }

        const locksToApply = Math.min(this.pendingLockCount, availableDice.length);
        let remainingLocks = locksToApply;
        const candidates = [...availableDice];

        while (remainingLocks > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.lockDie(die)) {
                remainingLocks--;
            }
        }

        this.pendingLockCount = Math.max(0, this.pendingLockCount - locksToApply);
        this.updateRollButtonState();
    }

    applyPendingWeaken() {
        if (this.pendingWeakenCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => die && !this.weakenedDice.has(die));
        if (availableDice.length === 0) {
            return;
        }

        const weakenToApply = Math.min(this.pendingWeakenCount, availableDice.length);
        let remaining = weakenToApply;
        const candidates = [...availableDice];

        while (remaining > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.weakenDie(die)) {
                remaining--;
            }
        }

        this.pendingWeakenCount = Math.max(0, this.pendingWeakenCount - weakenToApply);
        this.updateZonePreviewText();
    }

    applyPendingNullify() {
        if (this.pendingNullifyCount <= 0 || this.dice.length === 0) {
            return;
        }

        const availableDice = this.dice.filter(die => this.isDieNullifyEligible(die));
        if (availableDice.length === 0) {
            this.pendingNullifyCount = 0;
            return;
        }

        const nullifyToApply = Math.min(this.pendingNullifyCount, availableDice.length);
        let remaining = nullifyToApply;
        let applied = 0;
        const candidates = [...availableDice];

        while (remaining > 0 && candidates.length > 0) {
            const index = Phaser.Math.Between(0, candidates.length - 1);
            const die = candidates.splice(index, 1)[0];
            if (this.nullifyDie(die)) {
                remaining--;
                applied++;
            }
        }

        this.pendingNullifyCount = Math.max(0, this.pendingNullifyCount - applied);
        if (this.pendingNullifyCount > 0) {
            const anyEligible = this.dice.some(die => this.isDieNullifyEligible(die));
            if (!anyEligible) {
                this.pendingNullifyCount = 0;
            }
        }
        this.updateZonePreviewText();
    }

    isDieNullifyEligible(die) {
        if (!die || this.nullifiedDice.has(die)) {
            return false;
        }

        const blueprint = die.dieBlueprint || null;
        if (!blueprint) {
            return false;
        }

        if (blueprint.batteryDie) {
            return false;
        }

        const blueprintId = typeof blueprint.id === 'string' ? blueprint.id : '';
        if (!blueprintId || blueprintId === 'standard') {
            return false;
        }

        if (blueprintId === 'medicine') {
            const state = this.getMedicineDieStateByUid(blueprint.uid);
            const usesRemaining = state && Number.isFinite(state.usesRemaining) ? state.usesRemaining : 0;
            if (usesRemaining <= 0) {
                return false;
            }
        }

        if (blueprintId === 'bomb') {
            const state = this.getTimeBombStateByUid(blueprint.uid);
            if (state) {
                const detonated = !!state.detonated;
                const countdown = Number.isFinite(state.countdown) ? state.countdown : 0;
                if (detonated || countdown <= 0) {
                    return false;
                }
            }
        }

        if (blueprintId === 'comet') {
            if (!this.hasCometTriggerAvailable(blueprint)) {
                return false;
            }
        }

        if (blueprintId === 'charger') {
            const state = this.ensureChargerDieState(blueprint);
            const remaining = state && Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : 0;
            if (remaining <= 0) {
                return false;
            }
        }

        return true;
    }

    lockDie(die) {
        if (!die || die.isLocked) {
            return false;
        }

        die.setLocked(true);
        this.lockedDice.add(die);
        return true;
    }

    weakenDie(die) {
        if (!die || die.isWeakened) {
            return false;
        }

        if (typeof die.setWeakened === 'function') {
            die.setWeakened(true);
        } else {
            die.isWeakened = true;
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
        }

        this.weakenedDice.add(die);
        return true;
    }

    nullifyDie(die) {
        if (!die || this.nullifiedDice.has(die)) {
            return false;
        }

        if (typeof die.setNullified === 'function') {
            die.setNullified(true);
        } else {
            die.isNullified = true;
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }
        }

        this.nullifiedDice.add(die);
        return true;
    }

    unlockAllDice() {
        const diceInPlay = this.getDiceInPlay();
        diceInPlay.forEach(die => {
            if (die && die.isLocked) {
                die.setLocked(false);
            }
        });
        this.lockedDice.clear();
    }

    cleanseAllDiceCurses() {
        this.unlockAllDice();
        this.clearAllWeakenedDice();
        this.clearAllNullifiedDice();
    }

    applyCrowdControlPlan() {
        const plan = this.pendingCrowdControlPlan;
        if (!plan) {
            return;
        }

        const lockCount = Number.isFinite(plan.lock) ? Math.max(0, Math.floor(plan.lock)) : 0;
        const nullifyCount = Number.isFinite(plan.nullify) ? Math.max(0, Math.floor(plan.nullify)) : 0;
        const weakenCount = Number.isFinite(plan.weaken) ? Math.max(0, Math.floor(plan.weaken)) : 0;

        if (lockCount <= 0 && nullifyCount <= 0 && weakenCount <= 0) {
            this.pendingCrowdControlPlan = null;
            return;
        }

        const diceInPlay = Array.isArray(this.dice) ? this.dice.filter(die => !!die) : [];
        if (diceInPlay.length === 0) {
            return;
        }

        const orderedDice = shuffleArray(diceInPlay);
        const assignedDice = new Set();

        const applyEffect = (count, applyFn) => {
            if (count <= 0) {
                return 0;
            }

            let applied = 0;
            for (let i = 0; i < orderedDice.length && applied < count; i += 1) {
                const die = orderedDice[i];
                if (!die || assignedDice.has(die)) {
                    continue;
                }

                if (applyFn(die)) {
                    assignedDice.add(die);
                    applied += 1;
                }
            }

            return applied;
        };

        const locksApplied = applyEffect(lockCount, die => this.lockDie(die));
        const nullifiedApplied = applyEffect(nullifyCount, die => {
            if (!this.isDieNullifyEligible(die)) {
                return false;
            }
            return this.nullifyDie(die);
        });
        const weakenedApplied = applyEffect(weakenCount, die => this.weakenDie(die));

        if (locksApplied > 0) {
            this.updateRollButtonState();
        }

        if (nullifiedApplied > 0 || weakenedApplied > 0) {
            this.updateZonePreviewText();
        }

        plan.lock = Math.max(0, plan.lock - locksApplied);
        plan.nullify = Math.max(0, plan.nullify - nullifiedApplied);
        plan.weaken = Math.max(0, plan.weaken - weakenedApplied);

        if (plan.lock <= 0 && plan.nullify <= 0 && plan.weaken <= 0) {
            this.pendingCrowdControlPlan = null;
        }
    }

    queueEnemyCrowdControl(action) {
        if (!action) {
            return;
        }

        const lockCount = Number.isFinite(action.lock) ? Math.max(0, Math.floor(action.lock)) : 0;
        const nullifyCount = Number.isFinite(action.nullify) ? Math.max(0, Math.floor(action.nullify)) : 0;
        const weakenCount = Number.isFinite(action.weaken) ? Math.max(0, Math.floor(action.weaken)) : 0;

        if (lockCount <= 0 && nullifyCount <= 0 && weakenCount <= 0) {
            return;
        }

        if (!this.pendingCrowdControlPlan) {
            this.pendingCrowdControlPlan = { lock: 0, nullify: 0, weaken: 0 };
        }

        this.pendingCrowdControlPlan.lock += lockCount;
        this.pendingCrowdControlPlan.nullify += nullifyCount;
        this.pendingCrowdControlPlan.weaken += weakenCount;
    }

    queueEnemyLocks(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingLockCount = Math.min(this.getHandSlotCount(), this.pendingLockCount + count);
    }

    clearDieWeaken(die) {
        if (!die || !this.weakenedDice.has(die)) {
            return;
        }

        const canUpdateVisuals = die && die.active && die.scene && die.scene.sys && die.scene.sys.isActive();

        if (typeof die.setWeakened === 'function' && canUpdateVisuals) {
            die.setWeakened(false);
        } else {
            die.isWeakened = false;
            if (typeof die.updateVisualState === 'function' && canUpdateVisuals) {
                die.updateVisualState();
            }
        }

        this.weakenedDice.delete(die);
    }

    clearAllWeakenedDice() {
        const dice = Array.from(this.weakenedDice);
        dice.forEach(die => this.clearDieWeaken(die));
        this.weakenedDice.clear();
        this.updateZonePreviewText();
    }

    queueEnemyWeaken(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingWeakenCount = Math.min(this.getHandSlotCount(), this.pendingWeakenCount + count);
    }

    clearDieNullify(die) {
        if (!die || !this.nullifiedDice.has(die)) {
            return;
        }

        const canUpdateVisuals = die && die.active && die.scene && die.scene.sys && die.scene.sys.isActive();

        if (typeof die.setNullified === 'function' && canUpdateVisuals) {
            die.setNullified(false);
        } else {
            die.isNullified = false;
            if (typeof die.updateVisualState === 'function' && canUpdateVisuals) {
                die.updateVisualState();
            }
            if (typeof die.updateFaceValueHighlight === 'function' && canUpdateVisuals) {
                die.updateFaceValueHighlight();
            }
        }

        this.nullifiedDice.delete(die);
    }

    clearAllNullifiedDice() {
        const dice = Array.from(this.nullifiedDice);
        dice.forEach(die => this.clearDieNullify(die));
        this.nullifiedDice.clear();
        this.updateZonePreviewText();
    }

    queueEnemyNullify(count) {
        if (!count || count <= 0) {
            return;
        }

        this.pendingNullifyCount = Math.min(this.getHandSlotCount(), this.pendingNullifyCount + count);
    }

    sortDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        this.playSound('swoosh', { volume: CONSTANTS.DEFAULT_SFX_VOLUME });
        this.dice.sort((a, b) => a.value - b.value);
        const layout = this.getHandSlotLayout({ totalSlots: this.getHandSlotCount() });
        const startX = layout.startX;
        const spacing = layout.spacing;
        this.dice.forEach((d, i) => {
            d.slotIndex = i;
            this.tweens.add({
                targets: d,
                x: startX + i * spacing,
                y: CONSTANTS.GRID_Y,
                duration: 200,
                ease: 'Power2'
            });
        });
    }

    async resolveDice() {
        if (!this.inCombat || this.isGameOver) {
            return;
        }

        if (this.isResolving) {
            return;
        }
        this.isResolving = true;

        this.disableAllInputs();

        const usedTimeBombUids = new Set();
        [...(this.defendDice || []), ...(this.attackDice || [])].forEach(die => {
            if (!die || !die.dieBlueprint) {
                return;
            }
            if (die.dieBlueprint.id === 'bomb' && die.dieBlueprint.uid) {
                usedTimeBombUids.add(die.dieBlueprint.uid);
            }
        });

        const nullifiedTimeBombUids = new Set();
        if (this.nullifiedDice && typeof this.nullifiedDice.forEach === 'function') {
            this.nullifiedDice.forEach(die => {
                if (!die || !die.dieBlueprint) {
                    return;
                }
                if (die.dieBlueprint.id === 'bomb' && die.dieBlueprint.uid) {
                    nullifiedTimeBombUids.add(die.dieBlueprint.uid);
                }
            });
        }

        const timeBombResolution = this.resolveTimeBombCountdowns({
            usedBlueprintUids: usedTimeBombUids,
            nullifiedBlueprintUids: nullifiedTimeBombUids
        }) || { totalBonus: 0, detonatedCount: 0 };

        const timeBombBonus = Number.isFinite(timeBombResolution.totalBonus)
            ? timeBombResolution.totalBonus
            : 0;
        this.activeTimeBombResolveBonus = timeBombBonus;

        let bombardAnimationPromise = null;
        if (timeBombBonus > 0) {
            this.updateZonePreviewText();
            bombardAnimationPromise = this.playTimeBombDetonationAnimation({
                detonatedCount: timeBombResolution.detonatedCount
            });
        }

        if (bombardAnimationPromise) {
            await bombardAnimationPromise;
        }

        // Play resolve sound effect
        this.playSound('chimeShort', { volume: 0.7 });
        this.playSound('chimeLong', {
            volume: 0.4,
            seek: 1.5,
            duration: 1,
            rate: 3
        });

        // Calculate scores
        const defendResult = this.computeZoneScore(this.defendDice || [], { zone: 'defend' });
        const attackResult = this.computeZoneScore(this.attackDice || [], { zone: 'attack' });

        this.updateBatteryDieUsage({ defendDice: this.defendDice, attackDice: this.attackDice });
        this.updateMedicineDieUsage({ defendDice: this.defendDice, attackDice: this.attackDice });
        const diceInPlayForCharger = this.getDiceInPlay();
        const unusedChargerDice = Array.isArray(diceInPlayForCharger)
            ? diceInPlayForCharger.filter(die => die && !this.defendDice.includes(die) && !this.attackDice.includes(die))
            : [];
        this.updateChargerDieUsage({ unusedDice: unusedChargerDice });

        if (timeBombBonus > 0) {
            attackResult.baseSum = (attackResult.baseSum || 0) + timeBombBonus;
            attackResult.total = (attackResult.total || 0) + timeBombBonus;
            attackResult.timeBombBonus = (attackResult.timeBombBonus || 0) + timeBombBonus;
        }

        const defendScore = defendResult.total;
        const attackScore = attackResult.total;

        this.executeZoneEffects(defendResult.preResolutionEffects, 'defend', { attackResult, defendResult });

        if (this.familyHealPerFullHouse > 0) {
            // Family relic: award healing for Full House combos.
            let healAmount = 0;
            if (defendResult.comboType === 'Full House') {
                healAmount += this.familyHealPerFullHouse;
            }
            if (attackResult.comboType === 'Full House') {
                healAmount += this.familyHealPerFullHouse;
            }
            if (healAmount > 0) {
                this.healPlayer(healAmount);
            }
        }

        if (this.cleanseCursesOnLongStraights) {
            // Straight Suds relic: trigger curse cleansing on long straights.
            const cleanseCombos = ['Straight Penta', 'Straight Sex'];
            if (cleanseCombos.includes(defendResult.comboType) || cleanseCombos.includes(attackResult.comboType)) {
                this.cleanseAllDiceCurses();
            }
        }

        this.updateZonePreviewText();

        const locksToCarryOver = Array.from(this.lockedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;
        const weakenedToCarryOver = Array.from(this.weakenedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;
        const nullifiedToCarryOver = Array.from(this.nullifiedDice).filter(die =>
            this.defendDice.includes(die) || this.attackDice.includes(die)
        ).length;

        const diceToResolve = this.getDiceInPlay();
        this.applyEnemyComboDestruction({ attackResult, defendResult });
        const finishResolution = () => {
            this.activeTimeBombResolveBonus = 0;
            if (locksToCarryOver > 0) {
                this.pendingLockCount = Math.min(this.getHandSlotCount(), this.pendingLockCount + locksToCarryOver);
            }
            if (weakenedToCarryOver > 0) {
                this.pendingWeakenCount = Math.min(this.getHandSlotCount(), this.pendingWeakenCount + weakenedToCarryOver);
            }
            if (nullifiedToCarryOver > 0) {
                this.pendingNullifyCount = Math.min(this.getHandSlotCount(), this.pendingNullifyCount + nullifiedToCarryOver);
            }
            this.lockedDice.clear();
            this.clearAllWeakenedDice();
            this.clearAllNullifiedDice();
            if (this.rollCarryoverEnabled) {
                this.prepperCarryoverRolls = Math.max(0, Math.floor(this.rollsRemaining));
            } else {
                this.prepperCarryoverRolls = 0;
            }
            this.resetGameState({ destroyDice: false });
            if (this.pendingPostCombatTransition) {
                this.disableAllInputs();
            } else {
                this.input.enabled = true;
                if (this.resolveButton) {
                    setTextButtonEnabled(this.resolveButton, true);
                }
            }
            this.isResolving = false;
            this.tryEnterMapStateAfterCombat();
        };

        this.processTurnOutcome({ attackScore, defendScore, attackResult, defendResult });

        this.executeZoneEffects(defendResult.postResolutionEffects, 'defend', { attackResult, defendResult });
        this.executeZoneEffects(attackResult.postResolutionEffects, 'attack', { attackResult, defendResult });

        if (diceToResolve.length === 0) {
            this.time.delayedCall(1000, finishResolution);
            return;
        }

        Promise.all(diceToResolve.map(die => {
            const target = this.getResolutionTarget(die);
            return this.animateDieResolution(die, target);
        })).then(finishResolution);
    }

    disableAllInputs() {
        this.input.enabled = false;

        if (this.rollButton) {
            setTextButtonEnabled(this.rollButton, false);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false);
        }
    }

    getActiveDiceBlueprints() {
        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        let blueprints = loadout.map(entry => ({
            id: entry.id,
            isUpgraded: !!entry.isUpgraded,
            uid: entry.uid
        }));

        const baseCount = CONSTANTS.DICE_PER_SET;
        while (blueprints.length < baseCount) {
            blueprints.push(createDieBlueprint('standard'));
        }

        blueprints = blueprints.slice(0, baseCount);

        blueprints.forEach(blueprint => {
            if (blueprint && blueprint.id === 'medicine') {
                this.ensureMedicineDieState(blueprint);
            }
            if (blueprint && blueprint.id === 'comet') {
                this.ensureCometDieState(blueprint);
            }
            if (blueprint && blueprint.id === 'charger') {
                this.ensureChargerDieState(blueprint);
            }
        });

        if (this.isBatteryDieAvailable() && this.batteryDieState && this.batteryDieState.blueprint) {
            blueprints.push(this.batteryDieState.blueprint);
        }

        const finalBlueprints = this.applyTemporaryDestructionToBlueprints(blueprints);
        const decoratedBlueprints = finalBlueprints.map(blueprint => this.decorateBlueprint(blueprint));
        this.currentHandSlotCount = Math.max(1, decoratedBlueprints.length);
        this.updateHandAreaBackground();
        return decoratedBlueprints;
    }

    initializeBatteryDieStateForEncounter() {
        if (!this.hasBatteryIncludedRelic) {
            this.batteryDieState = null;
            this.refreshHandSlotCount();
            return;
        }

        const blueprint = createDieBlueprint('standard');
        const sceneRef = this;
        const decoratedBlueprint = {
            ...blueprint,
            batteryDie: true,
            emojiOverride: '🔋',
            getLeftStatusLabel() {
                const usesRemaining = sceneRef.getBatteryDieUsesRemaining();
                if (usesRemaining <= 0) {
                    return '';
                }

                let color = '#ff7675';
                if (usesRemaining >= 3) {
                    color = '#2ecc71';
                } else if (usesRemaining === 2) {
                    color = '#f1c40f';
                }

                return {
                    text: `${usesRemaining}`,
                    color
                };
            }
        };

        this.batteryDieState = {
            blueprint: decoratedBlueprint,
            usesRemaining: 3
        };
        this.refreshHandSlotCount();
    }

    updateBatteryDieUsage({ defendDice = [], attackDice = [] } = {}) {
        if (!this.hasBatteryIncludedRelic || !this.batteryDieState || !this.batteryDieState.blueprint) {
            return;
        }

        const uses = Number.isFinite(this.batteryDieState.usesRemaining)
            ? this.batteryDieState.usesRemaining
            : 0;
        if (uses <= 0) {
            return;
        }

        const batteryUid = this.batteryDieState.blueprint.uid;
        if (!batteryUid) {
            return;
        }

        const defendList = Array.isArray(defendDice) ? defendDice : [];
        const attackList = Array.isArray(attackDice) ? attackDice : [];
        const combined = [...defendList, ...attackList];
        const wasUsed = combined.some(die => die && die.dieBlueprint && die.dieBlueprint.uid === batteryUid);

        if (!wasUsed) {
            return;
        }

        const nextUses = Math.max(0, uses - 1);
        if (nextUses === uses) {
            return;
        }

        this.batteryDieState.usesRemaining = nextUses;

        combined.forEach(die => {
            if (!die || !die.dieBlueprint || die.dieBlueprint.uid !== batteryUid) {
                return;
            }
            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }
        });

        this.refreshHandSlotCount();
    }

    resetChargerZoneBonuses() {
        if (!this.chargerZoneBonuses || typeof this.chargerZoneBonuses !== 'object') {
            this.chargerZoneBonuses = { attack: 0, defend: 0 };
            return;
        }

        this.chargerZoneBonuses.attack = 0;
        this.chargerZoneBonuses.defend = 0;
    }

    getChargerZoneBonus(zone) {
        if (!this.chargerZoneBonuses || typeof this.chargerZoneBonuses !== 'object') {
            return 0;
        }

        if (zone === 'attack') {
            return Number.isFinite(this.chargerZoneBonuses.attack) ? this.chargerZoneBonuses.attack : 0;
        }

        if (zone === 'defend') {
            return Number.isFinite(this.chargerZoneBonuses.defend) ? this.chargerZoneBonuses.defend : 0;
        }

        return 0;
    }

    initializeCometDieStatesForEncounter() {
        if (!this.cometDieStates || typeof this.cometDieStates.clear !== 'function') {
            this.cometDieStates = new Map();
        } else {
            this.cometDieStates.clear();
        }

        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        const activeEntries = loadout.slice(0, CONSTANTS.DICE_PER_SET);
        activeEntries.forEach(entry => {
            if (!entry || entry.id !== 'comet' || !entry.uid) {
                return;
            }

            this.cometDieStates.set(entry.uid, {
                triggersRemaining: 1,
                isUpgraded: !!entry.isUpgraded
            });
        });
    }

    ensureCometDieState(blueprint) {
        if (!blueprint || blueprint.id !== 'comet') {
            return null;
        }

        if (!(this.cometDieStates instanceof Map)) {
            this.cometDieStates = new Map();
        }

        const uid = blueprint.uid;
        if (!uid) {
            return null;
        }

        if (!this.cometDieStates.has(uid)) {
            this.cometDieStates.set(uid, {
                triggersRemaining: 1,
                isUpgraded: !!blueprint.isUpgraded
            });
        } else {
            const state = this.cometDieStates.get(uid);
            if (state) {
                state.isUpgraded = !!blueprint.isUpgraded;
                const remaining = Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : 1;
                state.triggersRemaining = Math.max(0, Math.min(remaining, 1));
            }
        }

        return this.cometDieStates.get(uid) || null;
    }

    getCometDieStateByUid(uid) {
        if (!uid || !(this.cometDieStates instanceof Map)) {
            return null;
        }

        return this.cometDieStates.get(uid) || null;
    }

    decorateCometBlueprint(blueprint) {
        if (!blueprint || blueprint.id !== 'comet') {
            return blueprint;
        }

        const uid = blueprint.uid;
        const sceneRef = this;

        if (!uid) {
            return { ...blueprint };
        }

        this.ensureCometDieState(blueprint);

        return {
            ...blueprint,
            getLeftStatusLabel({ die: providedDie } = {}) {
                const state = sceneRef.getCometDieStateByUid(uid);
                if (!state) {
                    return '';
                }

                const remaining = Number.isFinite(state.triggersRemaining)
                    ? Math.max(0, state.triggersRemaining)
                    : 0;

                if (remaining <= 0) {
                    const die = providedDie;
                    if (die) {
                        if (typeof die.setNullified === 'function') {
                            die.setNullified(true);
                        } else {
                            die.isNullified = true;
                            if (typeof die.updateVisualState === 'function') {
                                die.updateVisualState();
                            }
                            if (typeof die.updateFaceValueHighlight === 'function') {
                                die.updateFaceValueHighlight();
                            }
                        }
                    }
                    return '';
                }

                const color = '#ff7675';
                return {
                    text: `${remaining}`,
                    color
                };
            }
        };
    }

    hasCometTriggerAvailable(target) {
        if (!target) {
            return false;
        }

        const blueprint = target.id ? target : (target.dieBlueprint ? target.dieBlueprint : null);
        if (!blueprint || blueprint.id !== 'comet') {
            return false;
        }

        const state = this.ensureCometDieState(blueprint);
        if (!state) {
            return false;
        }

        const remaining = Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : 0;
        return remaining > 0;
    }

    resolveCometEffect({ die, burnAmount = 0, selfBurn = 0 } = {}) {
        if (!die || !die.dieBlueprint || die.dieBlueprint.id !== 'comet') {
            return;
        }

        const blueprint = die.dieBlueprint;
        const state = this.ensureCometDieState(blueprint);
        if (!state) {
            return;
        }

        const remaining = Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : 0;
        if (remaining <= 0) {
            return;
        }

        state.triggersRemaining = Math.max(0, remaining - 1);

        if (burnAmount > 0) {
            this.applyEnemyBurn(burnAmount);
        }

        if (selfBurn > 0) {
            this.applyPlayerBurn(selfBurn);
        }

        if (state.triggersRemaining <= 0) {
            if (die && typeof die.setNullified === 'function') {
                die.setNullified(true);
            } else if (die) {
                die.isNullified = true;
                if (typeof die.updateVisualState === 'function') {
                    die.updateVisualState();
                }
                if (typeof die.updateFaceValueHighlight === 'function') {
                    die.updateFaceValueHighlight();
                }
            }
        }

        if (typeof die.updateEmoji === 'function') {
            die.updateEmoji();
        }
        if (typeof die.updateFaceValueHighlight === 'function') {
            die.updateFaceValueHighlight();
        }
        if (typeof die.updateVisualState === 'function') {
            die.updateVisualState();
        }
    }

    initializeChargerDieStatesForEncounter() {
        if (!this.chargerDieStates || typeof this.chargerDieStates.clear !== 'function') {
            this.chargerDieStates = new Map();
        } else {
            this.chargerDieStates.clear();
        }

        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        const activeEntries = loadout.slice(0, CONSTANTS.DICE_PER_SET);
        activeEntries.forEach(entry => {
            if (!entry || entry.id !== 'charger' || !entry.uid) {
                return;
            }

            const maxTriggers = entry.isUpgraded ? 5 : 3;
            this.chargerDieStates.set(entry.uid, {
                triggersRemaining: maxTriggers,
                maxTriggers,
                isUpgraded: !!entry.isUpgraded,
                chargesUsed: 0
            });
        });
    }

    ensureChargerDieState(blueprint) {
        if (!blueprint || blueprint.id !== 'charger') {
            return null;
        }

        if (!(this.chargerDieStates instanceof Map)) {
            this.chargerDieStates = new Map();
        }

        const uid = blueprint.uid;
        if (!uid) {
            return null;
        }

        const maxTriggers = blueprint.isUpgraded ? 5 : 3;

        if (!this.chargerDieStates.has(uid)) {
            this.chargerDieStates.set(uid, {
                triggersRemaining: maxTriggers,
                maxTriggers,
                isUpgraded: !!blueprint.isUpgraded,
                chargesUsed: 0
            });
        } else {
            const state = this.chargerDieStates.get(uid);
            if (state) {
                state.isUpgraded = !!blueprint.isUpgraded;
                state.maxTriggers = maxTriggers;
                const remaining = Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : maxTriggers;
                state.triggersRemaining = Math.max(0, Math.min(remaining, maxTriggers));
                if (!Number.isFinite(state.chargesUsed)) {
                    state.chargesUsed = 0;
                }
            }
        }

        return this.chargerDieStates.get(uid) || null;
    }

    getChargerDieStateByUid(uid) {
        if (!uid || !(this.chargerDieStates instanceof Map)) {
            return null;
        }

        return this.chargerDieStates.get(uid) || null;
    }

    decorateChargerBlueprint(blueprint) {
        if (!blueprint || blueprint.id !== 'charger') {
            return blueprint;
        }

        const uid = blueprint.uid;
        const sceneRef = this;

        if (!uid) {
            return { ...blueprint };
        }

        this.ensureChargerDieState(blueprint);

        return {
            ...blueprint,
            getLeftStatusLabel({ die: providedDie } = {}) {
                const state = sceneRef.getChargerDieStateByUid(uid);
                if (!state) {
                    return '';
                }

                const remaining = Number.isFinite(state.triggersRemaining)
                    ? Math.max(0, state.triggersRemaining)
                    : 0;

                let color = '#95a5a6';
                if (remaining >= 3) {
                    color = '#2ecc71';
                } else if (remaining === 2) {
                    color = '#f1c40f';
                } else if (remaining === 1) {
                    color = '#ff7675';
                }

                if (remaining <= 0) {
                    const die = providedDie;
                    if (die) {
                        if (typeof die.setNullified === 'function') {
                            die.setNullified(true);
                        } else {
                            die.isNullified = true;
                            if (typeof die.updateVisualState === 'function') {
                                die.updateVisualState();
                            }
                            if (typeof die.updateFaceValueHighlight === 'function') {
                                die.updateFaceValueHighlight();
                            }
                        }
                    }
                    return '';
                }

                return {
                    text: `${remaining}`,
                    color
                };
            }
        };
    }

    applyChargerCharge(blueprint, { die } = {}) {
        if (!blueprint || blueprint.id !== 'charger') {
            return false;
        }

        const state = this.ensureChargerDieState(blueprint);
        if (!state) {
            return false;
        }

        const remaining = Number.isFinite(state.triggersRemaining) ? state.triggersRemaining : 0;
        if (remaining <= 0) {
            return false;
        }

        state.triggersRemaining = Math.max(0, remaining - 1);
        state.chargesUsed = Number.isFinite(state.chargesUsed) ? state.chargesUsed + 1 : 1;

        if (!this.chargerZoneBonuses || typeof this.chargerZoneBonuses !== 'object') {
            this.chargerZoneBonuses = { attack: 0, defend: 0 };
        }

        const currentAttack = Number.isFinite(this.chargerZoneBonuses.attack) ? this.chargerZoneBonuses.attack : 0;
        const currentDefend = Number.isFinite(this.chargerZoneBonuses.defend) ? this.chargerZoneBonuses.defend : 0;
        this.chargerZoneBonuses.attack = currentAttack + 1;
        this.chargerZoneBonuses.defend = currentDefend + 1;

        if (die) {
            if (state.triggersRemaining <= 0) {
                if (typeof die.setNullified === 'function') {
                    die.setNullified(true);
                } else {
                    die.isNullified = true;
                    if (typeof die.updateVisualState === 'function') {
                        die.updateVisualState();
                    }
                    if (typeof die.updateFaceValueHighlight === 'function') {
                        die.updateFaceValueHighlight();
                    }
                }
            }
            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }
            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
        }

        return true;
    }

    updateChargerDieUsage({ unusedDice = [] } = {}) {
        if (!(this.chargerDieStates instanceof Map) || this.chargerDieStates.size === 0) {
            return;
        }

        const diceList = Array.isArray(unusedDice) ? unusedDice : [];
        if (diceList.length === 0) {
            return;
        }

        let appliedCount = 0;

        diceList.forEach(die => {
            if (!die || !die.dieBlueprint || die.dieBlueprint.id !== 'charger') {
                return;
            }

            if (this.nullifiedDice && this.nullifiedDice.has(die)) {
                return;
            }

            if (this.applyChargerCharge(die.dieBlueprint, { die })) {
                appliedCount += 1;
            }
        });

        if (appliedCount > 0) {
            this.updateZonePreviewText();
        }
    }

    initializeMedicineDieStatesForEncounter() {
        if (!this.medicineDieStates || typeof this.medicineDieStates.clear !== 'function') {
            this.medicineDieStates = new Map();
        } else {
            this.medicineDieStates.clear();
        }

        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        const activeEntries = loadout.slice(0, CONSTANTS.DICE_PER_SET);
        activeEntries.forEach(entry => {
            if (!entry || entry.id !== 'medicine' || !entry.uid) {
                return;
            }
            this.medicineDieStates.set(entry.uid, {
                usesRemaining: 3,
                isUpgraded: !!entry.isUpgraded
            });
        });
    }

    ensureMedicineDieState(blueprint) {
        if (!blueprint || blueprint.id !== 'medicine') {
            return null;
        }

        if (!(this.medicineDieStates instanceof Map)) {
            this.medicineDieStates = new Map();
        }

        const uid = blueprint.uid;
        if (!uid) {
            return null;
        }

        if (!this.medicineDieStates.has(uid)) {
            this.medicineDieStates.set(uid, {
                usesRemaining: 3,
                isUpgraded: !!blueprint.isUpgraded
            });
        } else {
            const state = this.medicineDieStates.get(uid);
            if (state) {
                state.isUpgraded = !!blueprint.isUpgraded;
            }
        }

        return this.medicineDieStates.get(uid) || null;
    }

    getMedicineDieStateByUid(uid) {
        if (!uid || !(this.medicineDieStates instanceof Map)) {
            return null;
        }

        return this.medicineDieStates.get(uid) || null;
    }

    decorateMedicineBlueprint(blueprint) {
        if (!blueprint || blueprint.id !== 'medicine') {
            return blueprint;
        }

        const uid = blueprint.uid;
        const sceneRef = this;

        if (!uid) {
            return { ...blueprint };
        }

        this.ensureMedicineDieState(blueprint);

        return {
            ...blueprint,
            getLeftStatusLabel() {
                const stored = sceneRef.getMedicineDieStateByUid(uid);
                if (!stored) {
                    return '';
                }

                const usesRemaining = Number.isFinite(stored.usesRemaining)
                    ? Math.max(0, stored.usesRemaining)
                    : 0;

                let color = '#ff7675';
                if (usesRemaining >= 3) {
                    color = '#2ecc71';
                } else if (usesRemaining === 2) {
                    color = '#f1c40f';
                } else if (usesRemaining <= 0) {
                    color = '#95a5a6';
                }

                if (usesRemaining <= 0) {
                    return '';
                }

                return {
                    text: `${usesRemaining}`,
                    color
                };
            }
        };
    }

    decorateBlueprint(blueprint) {
        if (!blueprint) {
            return blueprint;
        }

        if (blueprint.id === 'medicine') {
            return this.decorateMedicineBlueprint(blueprint);
        }

        if (blueprint.id === 'comet') {
            return this.decorateCometBlueprint(blueprint);
        }

        if (blueprint.id === 'charger') {
            return this.decorateChargerBlueprint(blueprint);
        }

        return blueprint;
    }

    updateMedicineDieUsage({ defendDice = [], attackDice = [] } = {}) {
        if (!(this.medicineDieStates instanceof Map) || this.medicineDieStates.size === 0) {
            return;
        }

        const defendList = Array.isArray(defendDice) ? defendDice : [];
        const attackList = Array.isArray(attackDice) ? attackDice : [];
        const combined = [...defendList, ...attackList];

        combined.forEach(die => {
            if (!die || !die.dieBlueprint || die.dieBlueprint.id !== 'medicine') {
                return;
            }

            const blueprint = die.dieBlueprint;
            const state = this.ensureMedicineDieState(blueprint);
            if (!state) {
                return;
            }

            const currentUses = Number.isFinite(state.usesRemaining)
                ? state.usesRemaining
                : 0;

            if (currentUses <= 0) {
                if (typeof die.setNullified === 'function') {
                    die.setNullified(true);
                } else {
                    die.isNullified = true;
                    if (typeof die.updateVisualState === 'function') {
                        die.updateVisualState();
                    }
                    if (typeof die.updateFaceValueHighlight === 'function') {
                        die.updateFaceValueHighlight();
                    }
                }
                if (typeof die.updateEmoji === 'function') {
                    die.updateEmoji();
                }
                return;
            }

            const willUseEffect = !this.nullifiedDice.has(die) && die.value < 4;
            const newCurrentUses = willUseEffect ? currentUses - 1 : currentUses;
            const nextUses = Math.max(0, newCurrentUses);
            if (nextUses === currentUses) {
                return;
            }

            state.usesRemaining = nextUses;
            state.isUpgraded = !!blueprint.isUpgraded;

            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }

            if (nextUses <= 0) {
                if (typeof die.setNullified === 'function') {
                    die.setNullified(true);
                } else {
                    die.isNullified = true;
                    if (typeof die.updateVisualState === 'function') {
                        die.updateVisualState();
                    }
                    if (typeof die.updateFaceValueHighlight === 'function') {
                        die.updateFaceValueHighlight();
                    }
                }
            }
        });
    }

    initializeTimeBombStatesForEncounter() {
        if (!this.timeBombStates || typeof this.timeBombStates.clear !== 'function') {
            this.timeBombStates = new Map();
        } else {
            this.timeBombStates.clear();
        }

        let loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        if (loadout.length > 0) {
            let mutated = false;
            loadout = loadout.map(entry => {
                if (!entry) {
                    return entry;
                }
                if (entry.uid) {
                    return entry;
                }
                const { uid } = createDieBlueprint(entry.id, { isUpgraded: entry.isUpgraded });
                mutated = true;
                return { ...entry, uid };
            });
            if (mutated) {
                this.customDiceLoadout = loadout;
            }
        }

        const activeEntries = loadout.slice(0, CONSTANTS.DICE_PER_SET);
        activeEntries.forEach(entry => {
            if (!entry || entry.id !== 'bomb' || !entry.uid) {
                return;
            }
            this.timeBombStates.set(entry.uid, {
                countdown: 3,
                detonated: false,
                isUpgraded: !!entry.isUpgraded
            });
        });
    }

    getTimeBombStateByUid(uid) {
        if (!uid || !this.timeBombStates) {
            return null;
        }
        return this.timeBombStates.get(uid) || null;
    }

    getDieLeftStatusText(die) {
        if (!die || !die.dieBlueprint) {
            return '';
        }

        const blueprint = die.dieBlueprint;

        if (typeof blueprint.getLeftStatusLabel === 'function') {
            const label = blueprint.getLeftStatusLabel({ die, blueprint, scene: this });
            if (label && typeof label === 'object') {
                const { text } = label;
                if (typeof text === 'string' && text.length > 0) {
                    return label;
                }
                if (Number.isFinite(text)) {
                    return { ...label, text: `${text}` };
                }
                return '';
            }
            if (typeof label === 'string') {
                return label;
            }
            if (Number.isFinite(label)) {
                return `${label}`;
            }
        }

        if (blueprint.id !== 'bomb') {
            return '';
        }

        const state = this.getTimeBombStateByUid(blueprint.uid);
        if (!state || state.detonated) {
            return '';
        }

        const countdown = Number.isFinite(state.countdown) ? state.countdown : 0;
        if (countdown <= 0) {
            return '';
        }

        return `${countdown}`;
    }

    resolveTimeBombCountdowns({ usedBlueprintUids, nullifiedBlueprintUids } = {}) {
        if (!this.timeBombStates || this.timeBombStates.size === 0) {
            return { totalBonus: 0, detonatedCount: 0, detonatedStates: [] };
        }

        const usedSet = usedBlueprintUids instanceof Set
            ? usedBlueprintUids
            : new Set(Array.isArray(usedBlueprintUids) ? usedBlueprintUids : []);

        const nullifiedSet = nullifiedBlueprintUids instanceof Set
            ? nullifiedBlueprintUids
            : new Set(Array.isArray(nullifiedBlueprintUids) ? nullifiedBlueprintUids : []);

        let totalBonus = 0;
        let stateChanged = false;
        const detonatedStates = [];

        this.timeBombStates.forEach((state, uid) => {
            if (!state || state.detonated) {
                return;
            }

            if (usedSet.has(uid) || nullifiedSet.has(uid)) {
                return;
            }

            const currentCountdown = Number.isFinite(state.countdown) ? state.countdown : 3;
            const updatedCountdown = Math.max(0, currentCountdown - 1);
            if (updatedCountdown !== currentCountdown) {
                stateChanged = true;
            }
            state.countdown = updatedCountdown;

            if (state.countdown === 0 && !state.detonated) {
                state.detonated = true;
                stateChanged = true;
                const bonus = state.isUpgraded ? 30 : 20;
                totalBonus += bonus;
                detonatedStates.push({ uid, bonus });
            }
        });

        if (stateChanged) {
            this.getDiceInPlay().forEach(die => {
                if (!die) {
                    return;
                }
                if (typeof die.updateEmoji === 'function') {
                    die.updateEmoji();
                }
                if (typeof die.updateVisualState === 'function') {
                    die.updateVisualState();
                }
            });
        }

        return { totalBonus, detonatedCount: detonatedStates.length, detonatedStates };
    }

    playTimeBombDetonationAnimation({ detonatedCount = 1 } = {}) {
        if (!this.add || !this.tweens) {
            return Promise.resolve();
        }

        const label = detonatedCount > 1 ? `BOMBARD x${detonatedCount}` : 'BOMBARD';
        const centerX = this.cameras && this.cameras.main ? this.cameras.main.centerX : 0;
        const baseCenterY = this.cameras && this.cameras.main
            ? this.cameras.main.centerY
            : CONSTANTS.RESOLVE_TEXT_Y;
        const centerY = baseCenterY - 200;

        const text = this.add.text(centerX, centerY, label, {
            fontSize: '86px',
            fontStyle: 'bold',
            color: '#ff4d4d',
            stroke: '#000000',
            strokeThickness: 10,
            align: 'center'
        }).setOrigin(0.5);
        text.setDepth(2000);
        text.setScale(0.25);
        text.setAlpha(0);

        return new Promise(resolve => {
            const finish = () => {
                if (text && typeof text.destroy === 'function' && text.scene) {
                    text.destroy();
                }
                resolve();
            };

            let hasResolved = false;
            const completeOnce = () => {
                if (!hasResolved) {
                    hasResolved = true;
                    finish();
                }
            };

            const makeTimeline = () => {
                if (!this.tweens) {
                    return null;
                }
                if (typeof this.tweens.timeline === 'function') {
                    return this.tweens.timeline.bind(this.tweens);
                }
                if (typeof this.tweens.createTimeline === 'function') {
                    return this.tweens.createTimeline.bind(this.tweens);
                }
                return null;
            };

            const segments = [
                {
                    targets: text,
                    alpha: { from: 0, to: 1 },
                    scale: { from: 0.25, to: 1.15 },
                    duration: 350,
                    ease: 'Back.Out'
                },
                {
                    targets: text,
                    scale: 0.95,
                    duration: 160,
                    ease: 'Sine.InOut',
                    yoyo: true,
                    repeat: 1
                },
                {
                    targets: text,
                    duration: 220,
                    ease: 'Linear'
                },
                {
                    targets: text,
                    alpha: { from: 1, to: 0 },
                    scale: { to: 0.5 },
                    duration: 320,
                    ease: 'Quad.In'
                }
            ];

            const timelineFactory = makeTimeline();
            if (timelineFactory) {
                const timeline = timelineFactory({
                    onComplete: completeOnce
                });

                if (timeline && typeof timeline.add === 'function' && typeof timeline.play === 'function') {
                    segments.forEach(config => timeline.add(config));
                    timeline.play();
                } else {
                    completeOnce();
                }
            } else if (this.tweens && typeof this.tweens.add === 'function') {
                let index = 0;
                const playNext = () => {
                    if (index >= segments.length) {
                        completeOnce();
                        return;
                    }

                    const config = { ...segments[index] };
                    index += 1;
                    const previousComplete = config.onComplete;
                    config.onComplete = () => {
                        if (typeof previousComplete === 'function') {
                            previousComplete();
                        }
                        playNext();
                    };
                    this.tweens.add(config);
                };

                playNext();
            } else {
                completeOnce();
            }

            if (this.time && typeof this.time.delayedCall === 'function') {
                this.time.delayedCall(1800, () => {
                    if (hasResolved) {
                        return;
                    }
                    hasResolved = true;
                    finish();
                });
            }
        });
    }

    applyTemporaryDestructionToBlueprints(blueprints = []) {
        const list = Array.isArray(blueprints)
            ? blueprints.map(entry => ({ ...entry }))
            : [];

        if (!Array.isArray(this.temporarilyDestroyedDice) || this.temporarilyDestroyedDice.length === 0) {
            return list;
        }

        const workingBlueprints = [...list];
        const remainingEntries = [];

        this.temporarilyDestroyedDice.forEach(entry => {
            if (!entry || entry.turnsRemaining <= 0) {
                return;
            }

            const entryUid = entry.uid || (entry.blueprint && entry.blueprint.uid);
            const entryId = entry.blueprint ? entry.blueprint.id : null;
            const entryUpgrade = entry.blueprint ? !!entry.blueprint.isUpgraded : false;

            const matchIndex = workingBlueprints.findIndex(candidate => {
                if (!candidate) {
                    return false;
                }

                if (entryUid && candidate.uid) {
                    return candidate.uid === entryUid;
                }

                const candidateId = candidate.id;
                const candidateUpgrade = !!candidate.isUpgraded;
                return candidateId === entryId && candidateUpgrade === entryUpgrade;
            });

            entry.turnsRemaining = Math.max(0, (entry.turnsRemaining || 0) - 1);

            if (matchIndex !== -1) {
                workingBlueprints.splice(matchIndex, 1);
            }

            if (entry.turnsRemaining > 0 && (matchIndex !== -1 || entryUid)) {
                remainingEntries.push(entry);
            }
        });

        this.temporarilyDestroyedDice = remainingEntries;

        return workingBlueprints;
    }

    queueDiceDestructionForTurn(diceList = []) {
        if (!Array.isArray(diceList) || diceList.length === 0) {
            return;
        }

        if (!Array.isArray(this.temporarilyDestroyedDice)) {
            this.temporarilyDestroyedDice = [];
        }

        const existingByUid = new Map();
        this.temporarilyDestroyedDice.forEach(entry => {
            if (entry && entry.uid) {
                existingByUid.set(entry.uid, entry);
            }
        });

        diceList.forEach(die => {
            if (!die || !die.dieBlueprint) {
                return;
            }

            const blueprint = { ...die.dieBlueprint };
            const uid = blueprint.uid;

            if (uid && existingByUid.has(uid)) {
                const stored = existingByUid.get(uid);
                stored.turnsRemaining = 1;
                stored.blueprint = blueprint;
                return;
            }

            this.temporarilyDestroyedDice.push({
                uid: uid || null,
                blueprint,
                turnsRemaining: 1
            });

            if (uid) {
                existingByUid.set(uid, this.temporarilyDestroyedDice[this.temporarilyDestroyedDice.length - 1]);
            }
        });
    }

    applyEnemyComboDestruction({ attackResult, defendResult } = {}) {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || typeof enemy.shouldDestroyDiceOutsideCombo !== 'function') {
            return;
        }

        const shouldDestroy = enemy.shouldDestroyDiceOutsideCombo({
            scene: this,
            attackResult,
            defendResult
        });

        if (!shouldDestroy) {
            return;
        }

        const diceToDestroy = new Set();

        if (Array.isArray(this.dice)) {
            this.dice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (defendResult && defendResult.comboType === 'No combo' && Array.isArray(this.defendDice)) {
            this.defendDice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (attackResult && attackResult.comboType === 'No combo' && Array.isArray(this.attackDice)) {
            this.attackDice.forEach(die => {
                if (die) {
                    diceToDestroy.add(die);
                }
            });
        }

        if (diceToDestroy.size === 0) {
            return;
        }

        this.queueDiceDestructionForTurn(Array.from(diceToDestroy));

        if (typeof enemy.onDiceDestroyedOutsideCombo === 'function') {
            enemy.onDiceDestroyedOutsideCombo({
                scene: this,
                destroyedCount: diceToDestroy.size
            });
        }
    }

    refreshActiveDiceVisuals() {
        const diceInPlay = this.getDiceInPlay();
        diceInPlay.forEach(die => {
            if (!die) {
                return;
            }

            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }

            const value = typeof die.displayValue === 'number'
                ? die.displayValue
                : (typeof die.value === 'number' ? die.value : 1);

            if (typeof die.renderFace === 'function') {
                die.renderFace(value, { updateValue: true });
            } else if (typeof value === 'number') {
                die.value = value;
            }

            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }

            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }
        });
    }

    applyBlueprintToDie(die, blueprint) {
        if (!die || !blueprint) {
            return false;
        }

        const value = typeof die.displayValue === 'number'
            ? die.displayValue
            : (typeof die.value === 'number' ? die.value : 1);

        die.dieBlueprint = { ...blueprint };

        if (typeof die.renderFace === 'function') {
            die.renderFace(value || 1, { updateValue: true });
        } else {
            die.value = value || 1;
        }

        if (die.dieBlueprint && die.dieBlueprint.id === 'comet') {
            this.ensureCometDieState(die.dieBlueprint);
        }

        if (die.dieBlueprint && die.dieBlueprint.id === 'charger') {
            this.ensureChargerDieState(die.dieBlueprint);
        }

        if (typeof die.updateEmoji === 'function') {
            die.updateEmoji();
        }

        if (typeof die.updateFaceValueHighlight === 'function') {
            die.updateFaceValueHighlight();
        }

        if (typeof die.updateVisualState === 'function') {
            die.updateVisualState();
        }

        if (die.dieBlueprint && die.dieBlueprint.id === 'medicine') {
            const state = this.ensureMedicineDieState(die.dieBlueprint);
            const usesRemaining = state && Number.isFinite(state.usesRemaining)
                ? state.usesRemaining
                : 0;
            const shouldNullify = usesRemaining <= 0;

            if (typeof die.setNullified === 'function') {
                die.setNullified(shouldNullify);
            } else {
                die.isNullified = shouldNullify;
                if (typeof die.updateVisualState === 'function') {
                    die.updateVisualState();
                }
                if (typeof die.updateFaceValueHighlight === 'function') {
                    die.updateFaceValueHighlight();
                }
            }

            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }
        }

        if (die.dieBlueprint && die.dieBlueprint.id === 'comet') {
            if (typeof die.updateFaceValueHighlight === 'function') {
                die.updateFaceValueHighlight();
            }
            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }
        }

        if (die.dieBlueprint && die.dieBlueprint.id === 'charger') {
            if (typeof die.updateEmoji === 'function') {
                die.updateEmoji();
            }
        }

        return true;
    }

    replaceDiceWithStandard({ uid, blueprint } = {}) {
        const diceInPlay = this.getDiceInPlay();
        if (!Array.isArray(diceInPlay) || diceInPlay.length === 0) {
            return false;
        }

        const replacementBlueprint = createDieBlueprint('standard');
        let replaced = false;

        for (const die of diceInPlay) {
            if (!die || !die.dieBlueprint) {
                continue;
            }

            const matchesUid = uid && die.dieBlueprint.uid === uid;
            const matchesBlueprint = !uid && blueprint
                && die.dieBlueprint.id === blueprint.id
                && !!die.dieBlueprint.isUpgraded === !!blueprint.isUpgraded;

            if (!matchesUid && !matchesBlueprint) {
                continue;
            }

            const previousBlueprint = die.dieBlueprint ? { ...die.dieBlueprint } : null;
            this.applyBlueprintToDie(die, replacementBlueprint);
            if (previousBlueprint
                && previousBlueprint.id === 'bomb'
                && previousBlueprint.uid
                && this.timeBombStates instanceof Map) {
                this.timeBombStates.delete(previousBlueprint.uid);
            }
            if (previousBlueprint
                && previousBlueprint.id === 'medicine'
                && previousBlueprint.uid
                && this.medicineDieStates instanceof Map) {
                this.medicineDieStates.delete(previousBlueprint.uid);
            }
            if (previousBlueprint
                && previousBlueprint.id === 'comet'
                && previousBlueprint.uid
                && this.cometDieStates instanceof Map) {
                this.cometDieStates.delete(previousBlueprint.uid);
            }
            if (previousBlueprint
                && previousBlueprint.id === 'charger'
                && previousBlueprint.uid
                && this.chargerDieStates instanceof Map) {
                this.chargerDieStates.delete(previousBlueprint.uid);
            }
            replaced = true;
            break;
        }

        return replaced;
    }

    discardCustomDieAtIndex(index) {
        if (!Number.isInteger(index) || index < 0) {
            return false;
        }

        const loadout = Array.isArray(this.customDiceLoadout) ? [...this.customDiceLoadout] : [];
        if (index >= loadout.length) {
            return false;
        }

        const [removedBlueprint] = loadout.splice(index, 1);
        if (!removedBlueprint) {
            return false;
        }

        if (removedBlueprint.uid && this.timeBombStates instanceof Map) {
            this.timeBombStates.delete(removedBlueprint.uid);
        }
        if (removedBlueprint.uid && this.medicineDieStates instanceof Map) {
            this.medicineDieStates.delete(removedBlueprint.uid);
        }
        if (removedBlueprint.uid && this.cometDieStates instanceof Map) {
            this.cometDieStates.delete(removedBlueprint.uid);
        }
        if (removedBlueprint.uid && this.chargerDieStates instanceof Map) {
            this.chargerDieStates.delete(removedBlueprint.uid);
        }

        this.customDiceLoadout = loadout;

        this.refreshBackpackContents();

        this.replaceDiceWithStandard({ uid: removedBlueprint.uid, blueprint: removedBlueprint });

        this.updateZonePreviewText();
        this.updateDiceRewardHandState();

        return true;
    }

    getDiceRewardCapacityState() {
        const loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        return {
            currentCount: loadout.length,
            maxCount: MAX_CUSTOM_DICE
        };
    }

    updateDiceRewardHandState() {
        if (!this.diceRewardUI) {
            return;
        }

        const capacity = this.getDiceRewardCapacityState();
        this.diceRewardUI.updateCapacityState({
            currentCount: capacity.currentCount,
            maxCount: capacity.maxCount
        });
    }

    getDiceInPlay() {
        const combined = [...this.defendDice, ...this.attackDice, ...this.dice];
        return Array.from(new Set(combined));
    }

    getResolutionTarget(die) {
        if (this.defendDice.includes(die) && this.defendZoneCenter) {
            return this.defendZoneCenter;
        }

        if (this.attackDice.includes(die) && this.attackZoneCenter) {
            return this.attackZoneCenter;
        }

        if (this.defendZoneCenter && this.attackZoneCenter) {
            const midpoint = (this.defendZoneCenter.x + this.attackZoneCenter.x) / 2;
            return die.x < midpoint ? this.defendZoneCenter : this.attackZoneCenter;
        }

        return { x: die.x, y: die.y - 100 };
    }

    animateDieResolution(die, target) {
        return new Promise(resolve => {
            const upwardOffset = 180;

            die.disableInteractive();
            die.setDepth(10);
            if (typeof die.updateVisualState === 'function') {
                die.updateVisualState();
            }

            const inZone = this.defendDice.includes(die) || this.attackDice.includes(die);

            let fadeTween = null;

            const completeResolution = () => {
                if (fadeTween && fadeTween.isPlaying()) {
                    fadeTween.stop();
                }

                if (die.active) {
                    die.destroy();
                }

                resolve();
            };

            if (inZone) {
                // Move (launch) upward then complete
                const moveTarget = {
                    x: target.x,
                    y: target.y - upwardOffset
                };

                this.tweens.add({
                    targets: die,
                    ...moveTarget,
                    duration: 500,
                    ease: 'Cubic.easeOut',
                    onComplete: completeResolution
                });

                // Fade out in parallel
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 400,
                    delay: 100,
                    ease: 'Quad.easeIn'
                });
            } else {
                // Not in a zone — do not move, just fade (then destroy)
                fadeTween = this.tweens.add({
                    targets: die,
                    alpha: 0,
                    duration: 350,
                    ease: 'Quad.easeIn',
                    onComplete: completeResolution
                });
            }
        });
    }

    applyDamage(amount) {
        this.playerHealth = Math.max(0, this.playerHealth - amount);
        this.updateHealthUI();

        if (this.playerHealth === 0) {
            this.triggerGameOver();
        }
    }

    updateHealthUI() {
        if (!this.healthBar) {
            return;
        }

        this.animateHealthBar(this.healthBar, this.playerHealth, this.playerMaxHealth);
    }

    stopHealthBarTweens(bar) {
        if (!bar) {
            return;
        }

        ['textTween', 'barTween', 'damageTween'].forEach(key => {
            if (bar[key]) {
                bar[key].stop();
                this.tweens.remove(bar[key]);
                bar[key] = null;
            }
        });

        this.tryEnterMapStateAfterCombat();
    }

    animateHealthBar(bar, targetHealth, maxHealth) {
        if (!bar) {
            return;
        }

        const clampedTarget = Phaser.Math.Clamp(targetHealth, 0, maxHealth);
        const previousHealth = typeof bar.displayedHealth === 'number' ? bar.displayedHealth : clampedTarget;
        const duration = 1000;

        const targetRatio = maxHealth > 0 ? Phaser.Math.Clamp(clampedTarget / maxHealth, 0, 1) : 0;
        const previousRatio = maxHealth > 0 ? Phaser.Math.Clamp(previousHealth / maxHealth, 0, 1) : 0;
        const targetWidth = bar.barWidth * targetRatio;
        const previousWidth = bar.barWidth * previousRatio;

        const isDamage = clampedTarget < previousHealth;

        this.stopHealthBarTweens(bar);

        bar.barFill.setFillStyle(bar.fillColor ?? bar.barFill.fillColor);

        if (typeof bar.damageFill !== 'undefined') {
            bar.damageFill.setVisible(false);
            bar.damageFill.displayWidth = 0;
        }

        if (typeof bar.displayedHealth !== 'number') {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (previousHealth === clampedTarget) {
            bar.barFill.displayWidth = targetWidth;
            bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
            bar.displayedHealth = clampedTarget;
            this.updateBurnUI();
            return;
        }

        if (isDamage && bar.damageFill) {
            const differenceWidth = Math.max(0, previousWidth - targetWidth);
            bar.barFill.displayWidth = targetWidth;

            if (differenceWidth > 0) {
                bar.damageFill.setFillStyle(bar.damageColor ?? bar.damageFill.fillColor);
                bar.damageFill.x = bar.barFill.x + targetWidth;
                bar.damageFill.displayWidth = differenceWidth;
                bar.damageFill.displayHeight = bar.barHeight;
                bar.damageFill.setVisible(true);

                bar.damageTween = this.tweens.add({
                    targets: bar.damageFill,
                    displayWidth: 0,
                    duration,
                    ease: 'Linear',
                    onUpdate: () => {
                        bar.damageFill.x = bar.barFill.x + targetWidth;
                    },
                    onComplete: () => {
                        bar.damageFill.setVisible(false);
                        bar.damageFill.displayWidth = 0;
                        bar.damageTween = null;
                        this.tryEnterMapStateAfterCombat();
                    }
                });
            }
        } else {
            bar.barFill.displayWidth = previousWidth;
            bar.barTween = this.tweens.add({
                targets: bar.barFill,
                displayWidth: targetWidth,
                duration,
                ease: 'Linear',
                onComplete: () => {
                    bar.barTween = null;
                    this.tryEnterMapStateAfterCombat();
                }
            });
        }

        const textCounter = { value: previousHealth };
        bar.textTween = this.tweens.add({
            targets: textCounter,
            value: clampedTarget,
            duration,
            ease: 'Linear',
            onUpdate: () => {
                const displayValue = Math.round(textCounter.value);
                bar.displayedHealth = displayValue;
                bar.text.setText(`HP: ${displayValue}/${maxHealth}`);
                this.updateBurnUI();
            },
            onComplete: () => {
                bar.displayedHealth = clampedTarget;
                bar.text.setText(`HP: ${clampedTarget}/${maxHealth}`);
                this.updateBurnUI();
                bar.textTween = null;
                this.tryEnterMapStateAfterCombat();
            }
        });
    }

    isHealthBarAnimating(bar) {
        if (!bar) {
            return false;
        }

        const tweenKeys = ['barTween', 'damageTween', 'textTween'];
        return tweenKeys.some(key => {
            const tween = bar[key];
            return tween && tween.isPlaying;
        });
    }

    requestEnterMapStateAfterCombat() {
        this.pendingPostCombatTransition = true;
        this.tryEnterMapStateAfterCombat();
    }

    tryEnterMapStateAfterCombat() {
        if (!this.pendingPostCombatTransition) {
            return;
        }

        const animationsActive = this.isResolving
            || this.isHealthBarAnimating(this.enemyHealthBar)
            || this.isHealthBarAnimating(this.healthBar);

        if (animationsActive) {
            return;
        }

        if (this.diceRewardUI || this.bossRelicRewardUI) {
            return;
        }

        this.pendingPostCombatTransition = false;
        this.enterMapState();
    }

    getPathTextureKeyForConfig(config) {
        const defaultKey = 'path_ladder';

        if (!config || !config.pathTextureKey) {
            return defaultKey;
        }

        const textureKey = config.pathTextureKey;
        const textures = this.textures;

        if (textures && typeof textures.exists === 'function' && textures.exists(textureKey)) {
            return textureKey;
        }

        return defaultKey;
    }

    getWallTextureKeyForConfig(config) {
        const textures = this.textures;
        const defaultKey = 'wall';
        const candidates = [];

        if (config && config.wallTextureKey) {
            candidates.push(config.wallTextureKey);
        }

        candidates.push(defaultKey);

        for (const key of candidates) {
            if (!key) {
                continue;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                return key;
            }
        }

        return null;
    }

    getBackgroundTextureKeyForConfig(config) {
        const textures = this.textures;
        const defaultKey = 'path_background';
        const candidates = [];

        if (config && config.backgroundTextureKey) {
            candidates.push(config.backgroundTextureKey);
        }

        candidates.push(defaultKey);

        for (const key of candidates) {
            if (!key) {
                continue;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                return key;
            }
        }

        return null;
    }

    getZoneBackgroundTextureKey() {
        const textures = this.textures;
        const defaultKey = 'path_background';
        const seen = new Set();
        const candidates = [];

        if (typeof this.currentZoneBackgroundTextureKey === 'string') {
            candidates.push(this.currentZoneBackgroundTextureKey);
        }

        if (this.currentMapConfig && typeof this.currentMapConfig.backgroundTextureKey === 'string') {
            candidates.push(this.currentMapConfig.backgroundTextureKey);
        }

        candidates.push(defaultKey);

        for (const key of candidates) {
            if (!key || seen.has(key)) {
                continue;
            }
            seen.add(key);

            if (!textures || typeof textures.exists !== 'function') {
                return key;
            }

            if (textures.exists(key)) {
                return key;
            }
        }

        return null;
    }

    updateZoneBackgroundTexture(textureKey) {
        const textures = this.textures;
        const seen = new Set();
        const candidates = [];

        if (typeof textureKey === 'string') {
            candidates.push(textureKey);
        }

        if (this.currentMapConfig && typeof this.currentMapConfig.backgroundTextureKey === 'string') {
            candidates.push(this.currentMapConfig.backgroundTextureKey);
        }

        if (typeof this.currentZoneBackgroundTextureKey === 'string') {
            candidates.push(this.currentZoneBackgroundTextureKey);
        }

        candidates.push('path_background');

        let resolvedKey = null;

        for (const key of candidates) {
            if (!key || seen.has(key)) {
                continue;
            }
            seen.add(key);

            if (!textures || typeof textures.exists !== 'function') {
                resolvedKey = key;
                break;
            }

            if (textures.exists(key)) {
                resolvedKey = key;
                break;
            }
        }

        this.currentZoneBackgroundTextureKey = resolvedKey;

        const applyTexture = sprite => {
            if (!sprite || !resolvedKey || typeof sprite.setTexture !== 'function') {
                return;
            }

            const scaleX = typeof sprite.tileScaleX === 'number' ? sprite.tileScaleX : null;
            const scaleY = typeof sprite.tileScaleY === 'number' ? sprite.tileScaleY : null;
            sprite.setTexture(resolvedKey);
            if (scaleX !== null && scaleY !== null && typeof sprite.setTileScale === 'function') {
                sprite.setTileScale(scaleX, scaleY);
            }
        };

        applyTexture(this.defendZoneBackground);
        applyTexture(this.attackZoneBackground);
    }

    getOutsideBackgroundLayerKeysForConfig(config) {
        const textures = this.textures;
        const result = [];

        const addKeyIfAvailable = key => {
            if (!key) {
                return;
            }

            if (textures && typeof textures.exists === 'function' && textures.exists(key)) {
                if (!result.includes(key)) {
                    result.push(key);
                }
            }
        };

        if (config && Array.isArray(config.outsideBackgroundLayerKeys)) {
            config.outsideBackgroundLayerKeys.forEach(addKeyIfAvailable);
        }

        if (result.length === 0) {
            ['outside_background_1', 'outside_background_2', 'outside_background_3', 'outside_background_4']
                .forEach(addKeyIfAvailable);
        }

        return result;
    }

    loadMap(mapIndex = 0) {
        if (!Array.isArray(this.maps) || mapIndex < 0 || mapIndex >= this.maps.length) {
            return false;
        }

        const config = this.maps[mapIndex];
        this.currentMapIndex = mapIndex;
        this.currentMapConfig = config;
        this.updateMapTitleText();
        this.playBackgroundMusicForConfig(config);

        const enemyFactory = config && typeof config.createEnemies === 'function'
            ? config.createEnemies
            : null;
        const enemies = enemyFactory ? enemyFactory() : [];
        // Propagate nightmare flag into enemy instances so enemies can adapt behavior
        if (Array.isArray(enemies) && enemies.length > 0) {
            for (const e of enemies) {
                try {
                    if (e && typeof e === 'object') {
                        e.isNightmare = !!this.nightmareModeEnabled;
                    }
                } catch (err) {
                    // defensive: ignore any errors setting the flag
                }
            }
        }
        if (this.enemyManager && typeof this.enemyManager.setEnemies === 'function') {
            this.enemyManager.setEnemies(Array.isArray(enemies) ? enemies : []);
        }

        if (this.pathUI) {
            this.pathUI.destroy();
            this.pathUI = null;
        }

        let baseEnemySequence;
        if (config) {
            if (Array.isArray(config.enemySequence)) {
                baseEnemySequence = config.enemySequence;
            } else if (typeof config.createEnemySequence === 'function') {
                const generatedSequence = config.createEnemySequence();
                if (Array.isArray(generatedSequence)) {
                    baseEnemySequence = generatedSequence;
                }
            }
        }
        const enemySequence = this.buildEnemySequence(baseEnemySequence, config);

        const connectionTextureKey = this.getPathTextureKeyForConfig(config);
        const wallTextureKey = this.getWallTextureKeyForConfig(config);
        const backgroundTextureKey = this.getBackgroundTextureKeyForConfig(config);
        const outsideBackgroundLayerKeys = this.getOutsideBackgroundLayerKeysForConfig(config);
        const outsideBackgroundEffect = config && typeof config.outsideBackgroundEffect === 'string'
            ? config.outsideBackgroundEffect
            : null;

        this.updateZoneBackgroundTexture(backgroundTextureKey);

        this.pathManager = new PathManager({
            enemySequence,
            allowUpgradeNodes: true,
            upgradeNodeMinEnemyIndex: 1
        });
        this.pathUI = new PathUI(
            this,
            this.pathManager,
            // keep original onSelect as a no-op (we'll trigger real selection on arrival)
            () => {},
            {
                connectionTextureKey,
                wallTextureKey,
                backgroundTextureKey,
                outsideBackgroundLayerKeys,
                outsideBackgroundEffect,
                onPlayerArrive: node => this.handlePathNodeSelection(node)
            }
        );
        this.currentPathNodeId = null;

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            const mapLabel = config && config.displayName ? config.displayName : 'Map';
            this.enemyHealthBar.nameText.setText(`${mapLabel}: Choose a Node`);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();

        this.updateMapSkipButtonState();

        return true;
    }

    updateMapTitleText() {
        if (!this.mapTitleText) {
            return;
        }

        const label = this.currentMapConfig && this.currentMapConfig.displayName
            ? this.currentMapConfig.displayName
            : '';
        const hasLabel = label && label.length > 0;
        this.mapTitleText.setText(hasLabel ? `${label}` : '');
    }

    hasNextMap() {
        if (!Array.isArray(this.maps)) {
            return false;
        }

        const nextIndex = typeof this.currentMapIndex === 'number' ? this.currentMapIndex + 1 : 0;
        return nextIndex >= 0 && nextIndex < this.maps.length;
    }

    isOnFinalMap() {
        if (!Array.isArray(this.maps) || this.maps.length === 0) {
            return false;
        }

        if (!Number.isFinite(this.currentMapIndex)) {
            return false;
        }

        return this.currentMapIndex === this.maps.length - 1;
    }

    advanceToNextMapIfAvailable() {
        if (!this.hasNextMap()) {
            return false;
        }

        const nextIndex = (typeof this.currentMapIndex === 'number' ? this.currentMapIndex + 1 : 0);
        const nextConfig = this.maps[nextIndex];
        const loaded = this.loadMap(nextIndex);
        if (loaded && nextConfig && nextConfig.displayName) {
            this.showNodeMessage(`Entering ${nextConfig.displayName}`, '#ffffff');
        }
        if (loaded) {
            this.updateMapSkipButtonState();
        }
        return loaded;
    }

    handleMapSkipButtonPress() {
        if (!this.testingModeEnabled || !this.isMapViewActive) {
            return;
        }

        const advanced = this.advanceToNextMapIfAvailable();
        if (advanced) {
            this.enterMapState();
        } else {
            this.updateMapSkipButtonState();
        }
    }

    processTurnOutcome({ attackScore, defendScore, attackResult, defendResult }) {
        if (!this.enemyManager) {
            return;
        }

        this.playerBlockValue = defendScore;

        this.applyBurnTickDamage();
        if (this.isGameOver) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy) {
            this.handleAllEnemiesDefeated();
            this.playerBlockValue = 0;
            return;
        }

        if (this.enemyManager.isCurrentEnemyDefeated()) {
            this.playerBlockValue = 0;
            this.handleEnemyDefeat();
            return;
        }

        let effectiveAttackScore = attackScore;
        if (enemy && typeof enemy.modifyIncomingAttack === 'function') {
            const modified = enemy.modifyIncomingAttack({
                attackScore,
                defendScore,
                attackResult,
                defendResult
            });
            if (typeof modified === 'number' && !Number.isNaN(modified)) {
                effectiveAttackScore = Math.max(0, modified);
            }
        }

        let totalDamageThisTurn = 0;
        const notifyEnemyDamageTaken = (amount, { source } = {}) => {
            if (!enemy || amount <= 0) {
                return;
            }

            const previousTotal = totalDamageThisTurn;
            totalDamageThisTurn += amount;

            if (typeof enemy.onPlayerDamageDealt === 'function') {
                enemy.onPlayerDamageDealt({
                    amount,
                    source: source || 'attack',
                    totalDamage: totalDamageThisTurn,
                    previousTotal,
                    scene: this,
                    enemyManager: this.enemyManager
                });
            }
        };

        this.enemyManager.primeUpcomingDefenses();
        this.executeZoneEffects(attackResult ? attackResult.preResolutionEffects : null, 'attack', { attackResult, defendResult });

        const burnResolution = this.applyEnemyBurnTickDamage();
        if (burnResolution && (burnResolution.damageDealt > 0 || burnResolution.blockedAmount > 0)) {
            if (this.enemyManager.isCurrentEnemyDefeated()) {
                this.playerBlockValue = 0;
                this.handleEnemyDefeat();
                return;
            }
            if (burnResolution.damageDealt > 0) {
                notifyEnemyDamageTaken(burnResolution.damageDealt, { source: 'burn' });
            }
        }

        const attackResolution = this.enemyManager.applyPlayerAttack(effectiveAttackScore, {
            applyBlockbuster: this.hasBlockbusterRelic
        });

        if (attackResolution && attackResolution.damageDealt > 0) {
            notifyEnemyDamageTaken(attackResolution.damageDealt, { source: 'attack' });
        }

        if (attackResolution && attackResolution.halvedBlock > 0) {
            this.refreshEnemyIntentText();
            this.updateEnemyStatusText();
        }
        this.updateEnemyHealthUI();
        this.updateEnemyBurnUI();

        if (this.enemyManager.isCurrentEnemyDefeated()) {
            this.playerBlockValue = 0;
            this.handleEnemyDefeat();
            return;
        }

        this.executeEnemyTurn();
    }

    updateEnemyHealthUI() {
        if (!this.enemyHealthBar) {
            return;
        }

        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        if (!enemy) {
            this.stopHealthBarTweens(this.enemyHealthBar);
            this.enemyHealthBar.barFill.displayWidth = 0;
            this.enemyHealthBar.text.setText('HP: 0/0');
            if (this.enemyHealthBar.damageFill) {
                this.enemyHealthBar.damageFill.setVisible(false);
                this.enemyHealthBar.damageFill.displayWidth = 0;
            }
            this.enemyHealthBar.displayedHealth = 0;
            this.updateEnemyBurnUI();
            return;
        }

        this.animateHealthBar(this.enemyHealthBar, enemy.health, enemy.maxHealth);
        this.updateEnemyBurnUI();
    }

    prepareNextEnemyMove() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.upcomingEnemyMove = null;
            if (this.enemyIntentText) {
                const hasPending = this.pathManager ? this.pathManager.hasPendingNodes() : false;
                this.enemyIntentText.setText(hasPending ? 'Select your next node' : 'All enemies defeated');
            }
            this.updateEnemyStatusText();
            return;
        }

        this.upcomingEnemyMove = this.enemyManager.prepareNextMove();
        this.refreshEnemyIntentText();
        this.updateEnemyStatusText();
    }

    getEnemyIntentDescription(enemy, move) {
        if (!move) {
            return '...';
        }

        if (enemy && typeof enemy.getIntentDescription === 'function') {
            const custom = enemy.getIntentDescription(move, {
                enemyManager: this.enemyManager,
                scene: this
            });
            if (typeof custom === 'string' && custom.trim().length > 0) {
                return custom;
            }
        }

        if (move && typeof move.getLabel === 'function') {
            const generated = move.getLabel();
            if (typeof generated === 'string' && generated.trim().length > 0) {
                return generated;
            }
        }

        if (move && typeof move.label === 'string' && move.label.trim().length > 0) {
            return move.label;
        }

        return '...';
    }

    refreshEnemyIntentText() {
        if (!this.enemyIntentText) {
            return;
        }

        const hasEnemyManager = !!this.enemyManager;
        const enemy = hasEnemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const isEnemyActive = hasEnemyManager && enemy && !this.enemyManager.isCurrentEnemyDefeated();

        if (!isEnemyActive) {
            const hasPending = this.pathManager ? this.pathManager.hasPendingNodes() : false;
            this.enemyIntentText.setText(hasPending ? 'Select your next node' : 'All enemies defeated');
            return;
        }

        const description = this.getEnemyIntentDescription(enemy, this.upcomingEnemyMove);
        if (this.upcomingEnemyMove) {
            this.upcomingEnemyMove.label = description;
        }
        this.enemyIntentText.setText(`${description}`);
    }

    updateEnemyStatusText() {
        if (!this.enemyStatusText) {
            return;
        }

        const hasEnemyManager = !!this.enemyManager;
        const enemy = hasEnemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const isEnemyActive = hasEnemyManager && enemy && !this.enemyManager.isCurrentEnemyDefeated();

        if (!isEnemyActive) {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
            return;
        }

        let statusDescription = '';
        if (enemy && typeof enemy.getStatusDescription === 'function') {
            statusDescription = enemy.getStatusDescription(this.upcomingEnemyMove) || '';
        }

        if (statusDescription) {
            this.enemyStatusText.setText(statusDescription);
            this.enemyStatusText.setVisible(true);
        } else {
            this.enemyStatusText.setText('');
            this.enemyStatusText.setVisible(false);
        }
    }

    executeEnemyTurn() {
        if (!this.enemyManager) {
            return;
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            return;
        }

        const move = this.enemyManager.consumeUpcomingMove();
        this.upcomingEnemyMove = null;

        if (!move) {
            this.prepareNextEnemyMove();
            this.playerBlockValue = 0;
            return;
        }

        for (const action of move.actions) {
            if (action.type === 'attack') {
                this.handleEnemyAttack(action.value);
            } else if (action.type === 'heal') {
                this.enemyManager.healCurrentEnemy(action.value);
                this.updateEnemyHealthUI();
            } else if (action.type === 'defend') {
                if (!action._preApplied) {
                    this.enemyManager.addEnemyBlock(action.value);
                }
            } else if (action.type === 'lock') {
                this.queueEnemyLocks(action.count || 1);
            } else if (action.type === 'weaken') {
                this.queueEnemyWeaken(action.count || 1);
            } else if (action.type === 'nullify') {
                this.queueEnemyNullify(action.count || 1);
            } else if (action.type === 'burn') {
                this.applyPlayerBurn(action.value);
            } else if (action.type === 'set_max_dice_per_zone') {
                this.setMaxDicePerZone(action.value);
                if (enemy && typeof enemy.onMaxDicePerZoneChanged === 'function') {
                    enemy.onMaxDicePerZoneChanged(action.value);
                }
            } else if (action.type === 'crowd_control') {
                this.queueEnemyCrowdControl(action);
            }

            if (this.isGameOver) {
                break;
            }
        }

        this.updateEnemyStatusText();

        if (this.isGameOver) {
            return;
        }

        if (enemy && typeof enemy.onTurnFinished === 'function' && !this.enemyManager.isCurrentEnemyDefeated()) {
            enemy.onTurnFinished({
                scene: this,
                enemyManager: this.enemyManager
            });
        }

        if (this.isGameOver) {
            return;
        }

        this.playerBlockValue = 0;

        if (!this.enemyManager.isCurrentEnemyDefeated()) {
            this.prepareNextEnemyMove();
        } else {
            this.handleEnemyDefeat();
        }
    }

    applyPlayerBurn(amount) {
        if (amount <= 0) {
            return;
        }

        this.playerBurn += amount;
        this.updateBurnUI();
    }

    applyBurnTickDamage() {
        if (this.playerBurn <= 0) {
            return;
        }

        this.handleEnemyAttack(this.playerBurn);
    }

    updateBurnUI() {
        if (!this.playerBurnText || !this.healthBar || !this.healthBar.text) {
            return;
        }

        const shouldShowBurn = this.playerBurn > 0 && this.inCombat;

        if (shouldShowBurn) {
            const bounds = this.healthBar.text.getBounds();
            const burnX = bounds.x + bounds.width + 20;
            const burnY = bounds.y + bounds.height / 2;
            this.playerBurnText.setPosition(burnX, burnY);
            this.playerBurnText.setOrigin(0, 0.5);
            this.playerBurnText.setText(`Burn ${this.playerBurn}`);
            this.playerBurnText.setVisible(true);

            if (!this.playerBurnGlowTween) {
                this.playerBurnGlowTween = this.tweens.add({
                    targets: this.playerBurnText,
                    alpha: { from: 0.7, to: 1 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.playerBurnText.setVisible(false);
            this.playerBurnText.setText('');

            if (this.playerBurnGlowTween) {
                this.playerBurnGlowTween.stop();
                this.playerBurnGlowTween.remove();
                this.playerBurnGlowTween = null;
            }

            this.playerBurnText.setAlpha(1);
            this.playerBurnText.setScale(1);
        }
    }

    reducePlayerBurn(amount) {
        if (!amount || amount <= 0 || this.playerBurn <= 0) {
            return 0;
        }

        const reduction = Math.min(this.playerBurn, Math.max(0, Math.floor(amount)));
        if (reduction <= 0) {
            return 0;
        }

        this.playerBurn -= reduction;
        this.updateBurnUI();
        return reduction;
    }

    resetPlayerBurn() {
        if (this.playerBurn !== 0) {
            this.playerBurn = 0;
        }
        this.updateBurnUI();
    }

    applyEnemyBurn(amount) {
        if (!this.enemyManager || amount <= 0) {
            return 0;
        }

        const applied = this.enemyManager.applyEnemyBurn(amount) || 0;
        this.updateEnemyBurnUI();
        return applied;
    }

    applyEnemyBurnTickDamage() {
        if (!this.enemyManager) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const enemy = this.enemyManager.getCurrentEnemy();
        if (!enemy || this.enemyManager.isCurrentEnemyDefeated()) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        const result = this.enemyManager.applyEnemyBurnTick();
        if (!result) {
            this.updateEnemyBurnUI();
            return { damageDealt: 0, blockedAmount: 0 };
        }

        if (result.blockedAmount > 0) {
            if (this.enemyManager && !this.enemyManager.isCurrentEnemyDefeated()) {
                this.refreshEnemyIntentText();
                this.updateEnemyStatusText();
            }
        }

        if (result.damageDealt > 0 || result.blockedAmount > 0) {
            this.updateEnemyHealthUI();
        }
        this.updateEnemyBurnUI();
        return result;
    }

    updateEnemyBurnUI() {
        if (!this.enemyBurnText || !this.enemyHealthBar || !this.enemyHealthBar.text) {
            return;
        }

        const burnValue = this.enemyManager ? this.enemyManager.getEnemyBurn() : 0;
        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        const enemyActive = this.inCombat && enemy && this.enemyManager && !this.enemyManager.isCurrentEnemyDefeated();
        const shouldShow = enemyActive && burnValue > 0;

        if (shouldShow) {
            const bounds = this.enemyHealthBar.text.getBounds();
            const burnX = bounds.x - 20;
            const burnY = bounds.y + bounds.height / 2;
            this.enemyBurnText.setPosition(burnX, burnY);
            this.enemyBurnText.setOrigin(1, 0.5);
            this.enemyBurnText.setText(`Burn ${burnValue}`);
            this.enemyBurnText.setVisible(true);

            if (!this.enemyBurnGlowTween) {
                this.enemyBurnGlowTween = this.tweens.add({
                    targets: this.enemyBurnText,
                    alpha: { from: 0.7, to: 1 },
                    duration: 800,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1
                });
            }
        } else {
            this.enemyBurnText.setVisible(false);
            this.enemyBurnText.setText('');

            if (this.enemyBurnGlowTween) {
                this.enemyBurnGlowTween.stop();
                this.enemyBurnGlowTween.remove();
                this.enemyBurnGlowTween = null;
            }

            this.enemyBurnText.setAlpha(1);
            this.enemyBurnText.setScale(1);
        }
    }

    resetEnemyBurn() {
        if (this.enemyManager && typeof this.enemyManager.resetEnemyBurn === 'function') {
            this.enemyManager.resetEnemyBurn();
        }
        this.updateEnemyBurnUI();
    }

    handleEnemyAttack(amount) {
        if (amount <= 0) {
            return;
        }

        const mitigated = Math.min(this.playerBlockValue, amount);
        this.playerBlockValue = Math.max(0, this.playerBlockValue - mitigated);
        const damage = Math.max(0, amount - mitigated);

        if (damage > 0) {
            this.applyDamage(damage);
        }
    }

    handlePathNodeSelection(node) {
        if (!node || !this.pathManager || this.inCombat || this.isResolving || this.isGameOver) {
            return;
        }

        this.pathManager.beginNode(node.id);
        this.currentPathNodeId = node.id;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        switch (node.type) {
            case PATH_NODE_TYPES.ENEMY:
                this.startCombatEncounter(node);
                break;
            case PATH_NODE_TYPES.SHOP:
                this.openShop();
                break;
            case PATH_NODE_TYPES.INFIRMARY:
                this.openInfirmary();
                break;
            case PATH_NODE_TYPES.TOWER:
                this.openTowerOfTen();
                break;
            case PATH_NODE_TYPES.UPGRADE:
                this.openDiceUpgrade();
                break;
            default:
                this.pathManager.completeCurrentNode();
                this.currentPathNodeId = null;
                this.enterMapState();
                break;
        }
    }

    startCombatEncounter(node) {
        if (!this.enemyManager) {
            return;
        }

        this.pendingPostCombatTransition = false;
        this.inCombat = true;
        this.triggerTutorialEvent('first-battle');
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.pendingLockCount = 0;
        this.lockedDice.clear();
        this.pendingWeakenCount = 0;
        this.weakenedDice.clear();
        this.pendingNullifyCount = 0;
        this.nullifiedDice.clear();
        this.pendingCrowdControlPlan = null;
        this.isFirstCombatTurn = true;
        this.prepperCarryoverRolls = 0;
        this.initializeBatteryDieStateForEncounter();
        this.resetZoneConstraints();
        this.resetChargerZoneBonuses();
        this.resetGameState({ destroyDice: true });
        this.initializeTimeBombStatesForEncounter();
        this.initializeMedicineDieStatesForEncounter();
        this.initializeCometDieStatesForEncounter();
        this.initializeChargerDieStatesForEncounter();
        this.resetEnemyBurn();
        this.setMapMode(false);
        let enemyIndex = node ? node.enemyIndex : -1;
        if (!Number.isFinite(enemyIndex) || enemyIndex < 0) {
            enemyIndex = 0;
        }

        const enemy = this.enemyManager.startEnemyEncounter(enemyIndex);
        if (enemy) {
            if (typeof enemy.onEncounterStart === 'function') {
                enemy.onEncounterStart();
            }
            const desiredMaxDice = typeof enemy.getCurrentMaxDicePerZone === 'function'
                ? enemy.getCurrentMaxDicePerZone()
                : (typeof enemy.getMaxDicePerZone === 'function' ? enemy.getMaxDicePerZone() : null);
            if (Number.isFinite(desiredMaxDice) && desiredMaxDice > 0) {
                this.setMaxDicePerZone(desiredMaxDice);
            }
            if (this.testingModeEnabled) {
                this.applyTestingModeToEnemy(enemy);
            } else {
                this.restoreEnemyBaseStats(enemy);
            }
        }
        this.evaluateTutorialEnemyTraits(enemy);
        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            const baseName = enemy ? enemy.name : '???';
            const displayName = node.isBoss ? `${baseName} (Boss)` : baseName;
            this.enemyHealthBar.nameText.setText(displayName);
        }

        this.updateEnemyHealthUI();
        this.prepareNextEnemyMove();
        this.updateEnemyStatusText();
        this.updateRollButtonState();

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, true);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        const messageText = node.isBoss ? 'Boss Encounter!' : 'Battle Start';
        this.showNodeMessage(messageText, node.isBoss ? '#ff8c69' : '#ffffff');
    }

    openShop() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();
        this.currentShopRelics = this.rollShopRelics(SHOP_RELIC_COUNT);

        this.activeFacilityUI = new ShopUI(this, {
            relics: this.getRelicShopState(),
            capacity: this.getRelicCapacityState(),
            onPurchase: relicId => this.handleShopPurchase(relicId),
            onClose: () => this.closeShop()
        });
    }

    getUpgradeableDiceOptions(count = 3) {
        const loadout = Array.isArray(this.customDiceLoadout) ? this.customDiceLoadout : [];
        const candidates = loadout
            .map((entry, index) => ({ ...entry, index }))
            .filter(entry => entry && !entry.isUpgraded);

        if (candidates.length === 0) {
            return [];
        }

        const shuffled = shuffleArray(candidates);
        const selection = shuffled.slice(0, Math.min(count, shuffled.length));

        return selection.map(entry => {
            const definition = getCustomDieDefinitionById(entry.id);
            return {
                uid: `${entry.index}-${entry.id}-${entry.isUpgraded ? 'u' : 'b'}`,
                id: entry.id,
                name: definition.name || entry.id || 'Die',
                emoji: definition.emoji || '',
                description: definition.description || '',
                upgradeDescription: definition.upgradeDescription
                    || definition.description
                    || ''
            };
        });
    }

    openDiceUpgrade() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        const options = this.getUpgradeableDiceOptions(3);
        if (options.length === 0) {
            this.showNodeMessage('All dice are already upgraded.', '#f9e79f');
            this.completeFacilityNode();
            return;
        }

        this.activeFacilityUI = new DiceUpgradeUI(this, {
            dice: options,
            onUpgrade: (selections, cost) => this.handleDiceUpgradeSelection(selections, cost),
            onClose: () => this.completeFacilityNode()
        });
    }

    handleDiceUpgradeSelection(selections = [], cost = 0) {
        if (!Array.isArray(selections) || selections.length === 0) {
            return false;
        }

        const totalCost = Number(cost) || 0;
        if (totalCost > 0 && !this.canAfford(totalCost)) {
            return false;
        }

        let upgradedCount = 0;
        const upgradedNames = [];

        selections.forEach(option => {
            if (!option || !option.id) {
                return;
            }

            const upgraded = this.upgradeCustomDieById(option.id);
            if (upgraded) {
                upgradedCount += 1;
                if (option.name) {
                    upgradedNames.push(option.name);
                } else {
                    const definition = getCustomDieDefinitionById(option.id);
                    if (definition && definition.name) {
                        upgradedNames.push(definition.name);
                    }
                }
            }
        });

        if (upgradedCount !== selections.length) {
            return false;
        }

        if (totalCost > 0) {
            const spent = this.spendGold(totalCost);
            if (spent !== totalCost) {
                return false;
            }
        }

        let message = '';
        if (upgradedNames.length === 1) {
            message = `Upgraded ${upgradedNames[0]}`;
        } else if (upgradedNames.length === 2) {
            message = `Upgraded ${upgradedNames[0]} & ${upgradedNames[1]}`;
        } else if (upgradedNames.length > 2) {
            const last = upgradedNames[upgradedNames.length - 1];
            const rest = upgradedNames.slice(0, -1).join(', ');
            message = `Upgraded ${rest} & ${last}`;
        } else {
            message = `Upgraded ${upgradedCount} dice`;
        }

        this.showNodeMessage(message, '#f1c40f');
        return true;
    }

    handleShopPurchase(relicId) {
        const relic = this.attemptPurchaseRelic(relicId);
        if (relic) {
            this.refreshShopInterface();
            return true;
        }
        return false;
    }

    refreshShopInterface() {
        if (this.activeFacilityUI instanceof ShopUI) {
            this.activeFacilityUI.updateRelics(
                this.getRelicShopState(),
                this.getRelicCapacityState()
            );
        }
    }

    getRelicShopState() {
        if (!Array.isArray(this.currentShopRelics)) {
            this.currentShopRelics = [];
        }

        return this.currentShopRelics.map(relic => ({
            id: relic.id,
            name: relic.name,
            description: relic.description,
            icon: relic.icon,
            cost: relic.cost,
            canAfford: this.playerGold >= relic.cost,
            owned: this.ownedRelicIds.has(relic.id)
        }));
    }

    getRelicCapacityState() {
        const currentCount = this.ownedRelicIds instanceof Set
            ? this.ownedRelicIds.size
            : (Array.isArray(this.relics) ? this.relics.length : 0);
        return {
            currentCount,
            maxCount: this.getRelicSlotLimit()
        };
    }

    getRelicSlotLimit() {
        const base = CONSTANTS.RELIC_MAX_SLOTS;
        const bonus = Number.isFinite(this.additionalRelicSlots) ? this.additionalRelicSlots : 0;
        const limit = base + bonus;
        return Math.max(0, Math.floor(limit));
    }

    increaseRelicSlotLimit(amount = 1) {
        if (!Number.isFinite(amount) || amount <= 0) {
            return this.getRelicSlotLimit();
        }

        if (!Number.isFinite(this.additionalRelicSlots)) {
            this.additionalRelicSlots = 0;
        }

        this.additionalRelicSlots += amount;
        this.onRelicSlotLimitChanged();
        return this.getRelicSlotLimit();
    }

    onRelicSlotLimitChanged() {
        if (this.relicUI) {
            this.relicUI.createShelf();
        }
        this.refreshBackpackContents();
        this.refreshShopInterface();
    }

    isRelicCapacityFull() {
        const limit = this.getRelicSlotLimit();
        if (limit <= 0) {
            return false;
        }
        const current = this.ownedRelicIds instanceof Set
            ? this.ownedRelicIds.size
            : (Array.isArray(this.relics) ? this.relics.length : 0);
        return current >= limit;
    }

    rollShopRelics(count = SHOP_RELIC_COUNT) {
        const available = this.getUnownedGeneralRelics();
        const pool = available.slice();
        const selections = [];

        while (selections.length < count && pool.length > 0) {
            const index = Phaser.Math.Between(0, pool.length - 1);
            selections.push(pool.splice(index, 1)[0]);
        }

        return selections;
    }

    getGeneralRelicPool() {
        return Array.isArray(this.relicPools?.general) ? this.relicPools.general : [];
    }

    getUnownedGeneralRelics() {
        const pool = this.getGeneralRelicPool();
        return pool.filter(relic => relic && relic.id && !this.ownedRelicIds.has(relic.id));
    }

    getBossRelicPool() {
        return Array.isArray(this.relicPools?.boss) ? this.relicPools.boss : [];
    }

    getUnownedBossRelics() {
        const pool = this.getBossRelicPool();
        return pool.filter(relic => relic && relic.id && !this.ownedRelicIds.has(relic.id));
    }

    rollBossRelicOptions(count = BOSS_RELIC_CHOICE_COUNT) {
        const available = this.getUnownedBossRelics();
        const pool = [...available];
        const selections = [];

        while (selections.length < count && pool.length > 0) {
            const index = getRandomIndexExclusive(pool.length);
            selections.push(pool.splice(index, 1)[0]);
        }

        return selections;
    }

    presentBossRelicReward() {
        this.destroyBossRelicRewardUI();

        const extraRelicChoices = this.bossRelicBonusExtraChoicePending ? 1 : 0;
        const relicChoiceCount = BOSS_RELIC_CHOICE_COUNT + extraRelicChoices;
        const relicChoices = this.rollBossRelicOptions(relicChoiceCount);
        const choices = relicChoices.map(relic => ({
            type: 'relic',
            id: relic.id,
            name: relic.name,
            description: relic.description,
            icon: relic.icon
        }));

        if (!this.bossRelicBonusClaimed) {
            choices.push({
                type: 'bonus',
                id: BOSS_BONUS_REWARD_ID,
                name: 'Golden Cache',
                description: 'Gain 100 gold and increase your relic capacity by 1.',
                icon: '💰'
            });
        }

        if (choices.length === 0) {
            this.requestEnterMapStateAfterCombat();
            return;
        }

        this.bossRelicRewardUI = new BossRelicRewardUI(this, {
            choices,
            capacity: this.getRelicCapacityState(),
            onSelect: choice => this.handleBossRelicRewardSelection(choice),
            onClose: () => {
                this.bossRelicRewardUI = null;
                this.requestEnterMapStateAfterCombat();
            }
        });
    }

    handleBossRelicRewardSelection(choice) {
        if (!choice) {
            return false;
        }

        if (choice.type === 'relic') {
            if (this.isRelicCapacityFull()) {
                return false;
            }

            const relic = this.relicCatalog.find(item => item.id === choice.id);
            if (!relic) {
                return false;
            }

            const granted = this.grantRelicDirectly(relic);
            if (granted) {
                this.bossRelicBonusExtraChoicePending = false;
                if (this.relicUI && typeof this.relicUI.showRelicDetails === 'function') {
                    this.relicUI.showRelicDetails(relic);
                }
                this.showNodeMessage(`Gained relic: ${relic.name}`, '#f9e79f');
                this.bossRelicRewardUI = null;
                this.requestEnterMapStateAfterCombat();
            }
            return granted;
        }

        if (choice.type === 'bonus' && choice.id === BOSS_BONUS_REWARD_ID) {
            if (this.bossRelicBonusClaimed) {
                return false;
            }

            this.bossRelicBonusClaimed = true;
            this.bossRelicBonusExtraChoicePending = true;
            this.addGold(100);
            this.increaseRelicSlotLimit(1);
            this.showNodeMessage('Relic capacity increased (+100 gold)', '#f9e79f');
            this.bossRelicRewardUI = null;
            this.requestEnterMapStateAfterCombat();
            return true;
        }

        return false;
    }

    getUnownedRelics() {
        return this.relicCatalog.filter(relic => !this.ownedRelicIds.has(relic.id));
    }

    closeShop() {
        this.destroyFacilityUI();
        this.currentShopRelics = null;

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    openInfirmary() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        const missing = Math.max(0, this.playerMaxHealth - this.playerHealth);
        const healFullCost = missing * 2; // Heal Full cost
        const canAffordFull = healFullCost > 0 && this.canAfford(healFullCost);

        this.activeFacilityUI = new InfirmaryUI(this, {
            healFullCost,
            canAffordFull,
            onHealHalf: () => this.handleInfirmaryChoice('half'),
            onIncreaseMax: () => this.handleInfirmaryChoice('max'),
            onHealFull: () => this.handleInfirmaryChoice('full')
        });
    }

    openTowerOfTen() {
        if (this.pathUI) {
            this.pathUI.hide();
        }

        this.destroyFacilityUI();

        this.playTowerOfTenEntrySound();

        this.activeFacilityUI = new TowerOfTenUI(this, {
            onComplete: result => this.handleTowerOfTenResult(result)
        });
    }

    playTowerOfTenEntrySound() {
        if (!this.sound || typeof this.sound.play !== 'function') {
            return;
        }
        this.playSound('towerOfTenEnter', { volume: 0.85 });
    }

    playTowerOfTenExitSound({ outcome, gold = 0 } = {}) {
        if (!this.sound || typeof this.sound.play !== 'function') {
            return;
        }

        if (outcome === 'cashout' && gold > 0) {
            this.playSound('towerOfTenWin', { volume: 0.9 });
        } else if (outcome === 'bust') {
            this.playSound('towerOfTenBust', { volume: 0.9 });
        }
    }

    triggerTutorialEvent(key) {
        if (!this.tutorialEnabled || !key) {
            return;
        }

        if (!Object.prototype.hasOwnProperty.call(TUTORIAL_CONFIG, key)) {
            return;
        }

        if (!(this.shownTutorialKeys instanceof Set)) {
            this.shownTutorialKeys = new Set();
        }

        if (this.shownTutorialKeys.has(key)) {
            return;
        }

        this.shownTutorialKeys.add(key);

        if (!Array.isArray(this.tutorialQueue)) {
            this.tutorialQueue = [];
        }

        const config = TUTORIAL_CONFIG[key];
        this.tutorialQueue.push({
            key,
            title: config.title,
            modal: config.modal && typeof config.modal === 'object' ? config.modal : undefined,
            points: Array.isArray(config.points) ? config.points : undefined,
            description: typeof config.description === 'string' ? config.description : undefined
        });
        this.processTutorialQueue();
    }

    processTutorialQueue() {
        if (!this.tutorialEnabled) {
            return;
        }

        if (this.activeTutorialModal) {
            return;
        }

        if (!Array.isArray(this.tutorialQueue) || this.tutorialQueue.length === 0) {
            return;
        }

        const step = this.tutorialQueue.shift();
        if (!step || !step.title) {
            this.processTutorialQueue();
            return;
        }

        this.showTutorialModal(step);
    }

    showTutorialModal(step) {
        if (!step || !step.title) {
            this.processTutorialQueue();
            return;
        }

        const modalWidth = (step.modal && Number.isFinite(step.modal.width)) ? Number(step.modal.width) : TUTORIAL_MODAL_DIMENSIONS.width;
        const modalHeight = (step.modal && Number.isFinite(step.modal.height)) ? Number(step.modal.height) : TUTORIAL_MODAL_DIMENSIONS.height;

        const modal = createModal(this, {
            width: modalWidth,
            height: modalHeight,
            title: step.title,
            panelAlpha: 1,
            depth: 200,
        });

        const contentContainer = this.add.container( 0, -modalHeight/2 + 90 );
        modal.container.add(contentContainer);
        populateContainerWithPoints(this, contentContainer, step.points || [{ text: step.description || '' }], { bodyWidth: modalWidth - 80 });

        this.acquireModalInputLock();

        const buttonWidth = TUTORIAL_CLOSE_BUTTON.width;
        const buttonHeight = TUTORIAL_CLOSE_BUTTON.height;
        const panelHalfWidth = modalWidth / 2;
        const panelHalfHeight = modalHeight / 2;
        const buttonX = panelHalfWidth - TUTORIAL_MODAL_MARGIN - buttonWidth / 2;
        const buttonY = panelHalfHeight - TUTORIAL_MODAL_MARGIN - buttonHeight / 2;

        const closeButton = this.add.rectangle(buttonX, buttonY, buttonWidth, buttonHeight, 0x271438, 0.95)
            .setOrigin(0.5)
            .setStrokeStyle(2, 0xf1c40f, 0.85)
            .setInteractive({ useHandCursor: true });
        const closeText = this.add.text(buttonX, buttonY, 'Close', {
            fontSize: '24px',
            color: '#f9e79f',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        closeButton.on('pointerover', () => {
            closeButton.setFillStyle(0x332040, 0.95);
        });
        closeButton.on('pointerout', () => {
            closeButton.setFillStyle(0x271438, 0.95);
        });
        closeButton.on('pointerdown', () => {
            this.closeTutorialModal();
        });

        modal.container.add(closeButton);
        modal.container.add(closeText);

        this.activeTutorialModal = { modal, closeButton, closeText };
    }

    closeTutorialModal() {
        if (!this.activeTutorialModal) {
            return;
        }

        const { modal, closeButton } = this.activeTutorialModal;
        if (closeButton && typeof closeButton.disableInteractive === 'function') {
            closeButton.disableInteractive();
        }
        if (modal) {
            destroyModal(modal);
        }
        this.activeTutorialModal = null;
        this.releaseModalInputLock();
        this.processTutorialQueue();
    }

    evaluateTutorialEnemyTraits(enemy) {
        if (!enemy) {
            return;
        }

        const flags = this.getEnemyEffectFlags(enemy);
        if (flags.hasLock) {
            this.triggerTutorialEvent('curse-lock');
        }
        if (flags.hasWeaken) {
            this.triggerTutorialEvent('curse-weaken');
        }
        if (flags.hasNullify) {
            this.triggerTutorialEvent('curse-nullify');
        }
        if (flags.hasBurn) {
            this.triggerTutorialEvent('curse-burn');
        }
        if (flags.hasStatus) {
            this.triggerTutorialEvent('status-effects');
        }
    }

    getEnemyEffectFlags(enemy) {
        const flags = {
            hasLock: false,
            hasWeaken: false,
            hasNullify: false,
            hasBurn: false,
            hasStatus: false
        };

        if (!enemy) {
            return flags;
        }

        const inspectComponent = (component) => {
            if (!component || typeof component.type !== 'string') {
                return;
            }

            switch (component.type) {
                case 'lock':
                    flags.hasLock = true;
                    break;
                case 'weaken':
                    flags.hasWeaken = true;
                    break;
                case 'nullify':
                    flags.hasNullify = true;
                    break;
                case 'burn':
                    flags.hasBurn = true;
                    break;
                case 'status':
                    flags.hasStatus = true;
                    break;
                default:
                    break;
            }
        };

        const inspectAction = (action) => {
            if (!action || typeof action.type !== 'string') {
                return;
            }

            switch (action.type) {
                case 'lock':
                    flags.hasLock = true;
                    break;
                case 'weaken':
                    flags.hasWeaken = true;
                    break;
                case 'nullify':
                    flags.hasNullify = true;
                    break;
                case 'burn':
                    flags.hasBurn = true;
                    break;
                case 'crowd_control': {
                    const lockCount = Number.isFinite(action.lock) ? action.lock : 0;
                    const weakenCount = Number.isFinite(action.weaken) ? action.weaken : 0;
                    const nullifyCount = Number.isFinite(action.nullify) ? action.nullify : 0;
                    if (lockCount > 0) {
                        flags.hasLock = true;
                    }
                    if (weakenCount > 0) {
                        flags.hasWeaken = true;
                    }
                    if (nullifyCount > 0) {
                        flags.hasNullify = true;
                    }
                    break;
                }
                case 'set_max_dice_per_zone':
                    flags.hasStatus = true;
                    break;
                default:
                    break;
            }
        };

        const moveLists = [];
        if (Array.isArray(enemy.moves)) {
            moveLists.push(enemy.moves);
        }
        if (Array.isArray(enemy.baseMoves)) {
            moveLists.push(enemy.baseMoves);
        }

        moveLists.forEach(list => {
            list.forEach(move => {
                if (!move) {
                    return;
                }

                const components = Array.isArray(move.intentComponents) ? move.intentComponents : [];
                components.forEach(component => inspectComponent(component));

                let actions = [];
                if (Array.isArray(move.actions)) {
                    actions = move.actions;
                } else if (typeof move.createActions === 'function') {
                    let previousPreviewState;
                    const hasPreviewSetter = enemy && typeof enemy.setPreviewingMoveActions === 'function';
                    const hasPreviewGetter = enemy && typeof enemy.isPreviewingMoveActions === 'function';

                    if (hasPreviewSetter) {
                        previousPreviewState = hasPreviewGetter ? enemy.isPreviewingMoveActions() : false;
                        enemy.setPreviewingMoveActions(true);
                    }

                    try {
                        const created = move.createActions({ isPreview: true });
                        if (Array.isArray(created)) {
                            actions = created;
                        }
                    } catch (e) {
                        // ignore errors from factory
                    } finally {
                        if (hasPreviewSetter) {
                            enemy.setPreviewingMoveActions(previousPreviewState);
                        }
                    }
                }
                actions.forEach(action => inspectAction(action));
            });
        });

        const statusDescription = this.safeGetEnemyStatusDescription(enemy);
        if (typeof enemy.getStatusDescription === 'function') {
            flags.hasStatus = true;
        }
        if (typeof statusDescription === 'string' && statusDescription.trim().length > 0) {
            const lower = statusDescription.toLowerCase();
            if (lower.includes('lock')) {
                flags.hasLock = true;
            }
            if (lower.includes('weaken')) {
                flags.hasWeaken = true;
            }
            if (lower.includes('nullify')) {
                flags.hasNullify = true;
            }
            if (lower.includes('burn')) {
                flags.hasBurn = true;
            }
        }

        return flags;
    }

    safeGetEnemyStatusDescription(enemy) {
        if (!enemy || typeof enemy.getStatusDescription !== 'function') {
            return '';
        }

        const tryGet = (arg) => {
            try {
                const result = enemy.getStatusDescription(arg);
                if (typeof result === 'string' && result.trim().length > 0) {
                    return result.trim();
                }
            } catch (error) {
                return '';
            }
            return '';
        };

        let description = tryGet(undefined);
        if (!description) {
            description = tryGet(this.upcomingEnemyMove || null);
        }
        return description || '';
    }

    handleInfirmaryChoice(selection) {
        let message = '';
        let color = '#2ecc71';

        if (selection === 'half') {
            const missing = this.playerMaxHealth - this.playerHealth;
            const healAmount = Math.ceil(missing / 2);
            const healed = this.healPlayer(healAmount);
            message = healed > 0 ? `Recovered ${healed} HP` : 'Already at full health';
        } else if (selection === 'max') {
            const increased = this.increasePlayerMaxHealthByPercent(0.1, { heal: false });
            if (increased > 0) {
                message = `Max HP +${increased}`;
            } else {
                message = 'Max HP unchanged';
            }
        } else if (selection === 'full') {
            const missing = this.playerMaxHealth - this.playerHealth;
            if (missing <= 0) {
                message = 'Already at full health';
            } else {
                const cost = missing * 2; // Heal Full cost
                if (cost > 0 && this.canAfford(cost)) {
                    const spent = this.spendGold(cost);
                    if (spent > 0) {
                        this.healPlayer(missing);
                        message = `Fully restored! (-${spent}g)`;
                        color = '#f1c40f';
                    }
                } else {
                    message = 'Not enough gold';
                    color = '#e74c3c';
                }
            }
        }

        this.destroyFacilityUI();

        if (message) {
            this.showNodeMessage(message, color);
        }

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }
        this.enterMapState();
    }

    handleTowerOfTenResult({ gold = 0, penalty = 0, total = 0, outcome = 'leave' } = {}) {
        this.destroyFacilityUI();

        this.playTowerOfTenExitSound({ outcome, gold });

        if (gold > 0) {
            this.addGold(gold);
        }

        if (penalty > 0) {
            this.spendGold(penalty);
        }

        let message = '';
        let color = '#5dade2';

        if (outcome === 'cashout' && gold > 0) {
            message = `Tower of Ten: Total ${total} - +${gold} gold`;
            color = '#f7c873';
        } else if (outcome === 'cashout') {
            message = `Tower of Ten: Total ${total} (0 gold)`;
        } else if (outcome === 'bust') {
            message = penalty > 0
                ? `Tower of Ten: Bust with ${total} (-${penalty} gold)`
                : `Tower of Ten: Bust with ${total}`;
            color = '#e74c3c';
        } else {
            message = 'Tower of Ten: You walk away.';
        }

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }
        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }

        if (message) {
            this.showNodeMessage(message, color);
        }

        this.enterMapState();
    }

    completeFacilityNode() {
        this.destroyFacilityUI();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }

        this.currentPathNodeId = null;
        if (this.pathUI) {
            this.pathUI.updateState();
        }

        this.enterMapState();
    }

    destroyFacilityUI() {
        this.closeBackpack();
        if (this.activeFacilityUI && typeof this.activeFacilityUI.destroy === 'function') {
            this.activeFacilityUI.destroy();
        }
        this.activeFacilityUI = null;
    }

    enterMapState() {
        this.pendingPostCombatTransition = false;
        this.input.enabled = true;
        let hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;

        this.destroyFacilityUI();

        this.inCombat = false;
        this.pendingCrowdControlPlan = null;
        this.updateRollButtonState();
        this.updateMapTitleText();
        this.updateEnemyBurnUI();

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false, { disabledAlpha: 0.3 });
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false, { disabledAlpha: 0.3 });
        }

        if (!hasPendingNodes) {
            const advanced = this.advanceToNextMapIfAvailable();
            if (advanced) {
                hasPendingNodes = this.pathManager ? this.pathManager.hasPendingNodes() : false;
            }
        }

        if (!hasPendingNodes) {
            if (this.pathUI) {
                this.pathUI.hide();
            }
            this.setMapMode(false);
            this.handleAllEnemiesDefeated();
            return;
        }

        this.setMapMode(true);

        if (this.pathUI) {
            this.pathUI.show();
            this.pathUI.updateState();
        }
    }

    healPlayer(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        const newHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        const healed = newHealth - this.playerHealth;
        if (healed > 0) {
            this.playerHealth = newHealth;
            this.updateHealthUI();
        }
        return healed;
    }

    increasePlayerMaxHealth(amount, { heal = true } = {}) {
        if (!amount || amount <= 0) {
            return 0;
        }

        this.playerMaxHealth += amount;
        if (heal) {
            this.playerHealth = Math.min(this.playerMaxHealth, this.playerHealth + amount);
        } else {
            this.playerHealth = Math.min(this.playerHealth, this.playerMaxHealth);
        }
        this.updateHealthUI();
        return amount;
    }

    decreasePlayerMaxHealth(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        const targetMax = Math.max(1, this.playerMaxHealth - amount);
        const reduced = this.playerMaxHealth - targetMax;
        if (reduced <= 0) {
            return 0;
        }

        this.playerMaxHealth = targetMax;
        if (this.playerHealth > this.playerMaxHealth) {
            this.playerHealth = this.playerMaxHealth;
        }
        this.updateHealthUI();
        return reduced;
    }

    increasePlayerMaxHealthByPercent(percent, { heal = false } = {}) {
        if (!percent || typeof percent !== 'number') {
            return 0;
        }

        const increase = Math.max(1, Math.round(this.playerMaxHealth * percent));
        this.increasePlayerMaxHealth(increase, { heal });
        return increase;
    }

    addGold(amount) {
        if (!amount || amount === 0) {
            return 0;
        }

        this.playerGold += amount;
        this.updateGoldUI();
        return amount;
    }

    spendGold(amount) {
        if (!amount || amount <= 0) {
            return 0;
        }

        if (this.playerGold < amount) {
            return 0;
        }

        this.playerGold -= amount;
        this.updateGoldUI();
        return amount;
    }

    canAfford(amount) {
        return typeof amount === 'number' && amount > 0 && this.playerGold >= amount;
    }

    updateGoldUI() {
        if (!this.goldText) {
            return;
        }

        this.goldText.setText(`Gold: ${this.playerGold}`);
    }

    attemptPurchaseRelic(relicId) {
        const relic = this.relicCatalog.find(item => item.id === relicId);
        if (!relic || this.ownedRelicIds.has(relic.id)) {
            return false;
        }

        if (this.isRelicCapacityFull()) {
            return false;
        }

        if (!this.canAfford(relic.cost)) {
            return false;
        }

        const spent = this.spendGold(relic.cost);
        if (spent <= 0) {
            return false;
        }

        this.ownedRelicIds.add(relic.id);
        this.relics.push(relic);
        if (typeof relic.apply === 'function') {
            relic.apply(this);
        }
        this.relicUI.updateDisplay();
        this.relicUI.showRelicDetails(relic);
        return relic;
    }

    showNodeMessage(message, color = '#ffffff') {
        if (!message) {
            return;
        }

        if (this.nodeMessageTween) {
            this.nodeMessageTween.stop();
            this.tweens.remove(this.nodeMessageTween);
            this.nodeMessageTween = null;
        }

        if (this.nodeMessage) {
            this.nodeMessage.destroy();
            this.nodeMessage = null;
        }

        this.nodeMessage = this.add.text(this.scale.width / 2, 60, message, {
            fontSize: '32px',
            color,
            fontStyle: 'bold',
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setDepth(30);

        this.nodeMessageTween = this.tweens.add({
            targets: this.nodeMessage,
            alpha: 0,
            duration: 1000,
            delay: 1200,
            onComplete: () => {
                if (this.nodeMessage) {
                    this.nodeMessage.destroy();
                    this.nodeMessage = null;
                }
                this.nodeMessageTween = null;
            }
        });
    }

    handleEnemyDefeat() {
        if (!this.enemyManager) {
            return;
        }

        const defeatedNodeId = this.currentPathNodeId;
        const defeatedNode = this.pathManager && defeatedNodeId
            ? this.pathManager.getNode(defeatedNodeId)
            : null;
        const defeatedIsBoss = !!(defeatedNode && defeatedNode.isBoss);
        if (defeatedIsBoss) {
            this.triggerTutorialEvent('first-boss-defeated');
        } else {
            this.triggerTutorialEvent('first-enemy-defeated');
        }

        let totalGoldReward = 0;
        if (defeatedNode && defeatedNode.rewardGold) {
            totalGoldReward += this.addGold(defeatedNode.rewardGold);
        }

        if (this.testingModeEnabled) {
            totalGoldReward += this.addGold(900);
        }

        if (totalGoldReward > 0) {
            this.showNodeMessage(`+${totalGoldReward} Gold`, '#f1c40f');
        }

        if (defeatedIsBoss) {
            const missing = this.playerMaxHealth - this.playerHealth;
            if (missing > 0) {
                const healAmount = Math.ceil(missing / 2);
                const healed = this.healPlayer(healAmount);
                if (healed > 0) {
                    this.showNodeMessage(`Recovered ${healed} HP`, '#2ecc71');
                }
            }
        }

        this.resetPlayerBurn();
        this.resetEnemyBurn();

        if (this.pathManager) {
            this.pathManager.completeCurrentNode();
        }

        this.currentPathNodeId = null;

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        this.enemyManager.clearCurrentEnemy();
        this.resetZoneConstraints();
        this.prepareNextEnemyMove();

        const defeatedFinalBoss = defeatedIsBoss
            && this.isOnFinalMap()
            && (!this.pathManager || !this.pathManager.hasPendingNodes());

        if (defeatedFinalBoss) {
            if (this.pathUI) {
                this.pathUI.hide();
            }
            this.triggerVictoryScreen();
            return;
        }

        if (defeatedIsBoss) {
            this.presentBossRelicReward();
            // If this is the boss on map 3 (index 2), stop the speedrun timer
            if (this.speedrunEnabled && typeof this.currentMapIndex === 'number' && this.currentMapIndex === 2) {
                this.stopSpeedrunTimer();
            }
            return;
        }

        this.presentCustomDieReward();
    }

    handleAllEnemiesDefeated() {
        this.upcomingEnemyMove = null;

        this.resetPlayerBurn();
        this.resetEnemyBurn();

        if (this.enemyHealthBar && this.enemyHealthBar.nameText) {
            this.enemyHealthBar.nameText.setText('All Enemies Defeated');
        }

        if (this.enemyIntentText) {
            this.enemyIntentText.setText('All enemies defeated');
        }
        this.updateEnemyStatusText();

        this.updateEnemyHealthUI();

        this.resetZoneConstraints();

        if (this.pathUI) {
            this.pathUI.hide();
        }
    }

    applyStartOfTurnEffects() {
        if (this.playerBurnReductionPerTurn > 0) {
            this.reducePlayerBurn(this.playerBurnReductionPerTurn);
        }
    }

    resetGameState({ destroyDice = true } = {}) {
        this.clearAllWeakenedDice();
        this.clearAllNullifiedDice();
        if (destroyDice) {
            this.getDiceInPlay().forEach(d => d.destroy());
            this.temporarilyDestroyedDice = [];
        }
        this.activeTimeBombResolveBonus = 0;
        this.dice = [];
        this.defendDice = [];
        this.attackDice = [];
        this.defendSlots = Array(this.getMaxDicePerZone()).fill(null);
        this.attackSlots = Array(this.getMaxDicePerZone()).fill(null);

        this.refreshHandSlotCount();

        this.playerBlockValue = 0;
        this.rerollDefenseBonus = 0;

        this.applyStartOfTurnEffects();

        const baseRolls = CONSTANTS.DEFAULT_MAX_ROLLS;
        let startingRolls = baseRolls;

        if (this.isFirstCombatTurn && this.prepperFirstTurnBonusRolls > 0) {
            startingRolls += this.prepperFirstTurnBonusRolls;
        }

        if (this.rollCarryoverEnabled && this.prepperCarryoverRolls > 0) {
            startingRolls += Math.max(0, Math.floor(this.prepperCarryoverRolls));
        }

        this.prepperCarryoverRolls = 0;
        this.isFirstCombatTurn = false;

        this.rollsRemaining = Math.max(0, Math.floor(startingRolls));
        this.rollsRemainingAtTurnStart = this.rollsRemaining;
        if (this.rollsRemainingText) {
            this.rollsRemainingText.setText(`${this.rollsRemaining}`);
        }

        // Enable roll button, disable sort button
        setTextButtonEnabled(this.rollButton, true);
        setTextButtonEnabled(this.sortButton, false);
        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, true);
        }

        this.lockedDice.clear();
        this.updateZonePreviewText();
    }

    updateMapSkipButtonState() {
        if (!this.mapSkipButton) {
            return;
        }

        const hasNextMap = this.hasNextMap();
        const shouldShow = this.testingModeEnabled && this.isMapViewActive && hasNextMap;

        this.mapSkipButton.setVisible(shouldShow);
        setTextButtonEnabled(this.mapSkipButton, shouldShow);

        const settingsBg = this.settingsBackground;
        if (settingsBg) {
            const baseHeight = Number.isFinite(this.settingsBackgroundBaseHeight)
                ? this.settingsBackgroundBaseHeight
                : settingsBg.height;
            const expandedHeight = Number.isFinite(this.settingsBackgroundExpandedHeight)
                ? this.settingsBackgroundExpandedHeight
                : baseHeight;
            const targetHeight = shouldShow ? expandedHeight : baseHeight;

            if (typeof settingsBg.setSize === 'function') {
                settingsBg.setSize(settingsBg.width, targetHeight);
            }
            if (typeof settingsBg.setDisplaySize === 'function') {
                settingsBg.setDisplaySize(settingsBg.width, targetHeight);
            }
        }

        if (typeof this.layoutHeaderButtons === 'function') {
            this.layoutHeaderButtons();
        }
    }

    setMapMode(isMapView) {
        this.isMapViewActive = !!isMapView;
        const showCombatUI = !isMapView;
        const setVisibility = (obj, visible) => {
            if (obj && typeof obj.setVisible === 'function') {
                obj.setVisible(visible);
            }
        };

        const applyToArray = (arr, visible) => {
            if (!arr || typeof arr.forEach !== 'function') {
                return;
            }
            arr.forEach(item => setVisibility(item, visible));
        };

        setVisibility(this.rollButton, showCombatUI);
        if (this.rollButton) {
            if (showCombatUI) {
                this.updateRollButtonState();
            } else {
                setTextButtonEnabled(this.rollButton, false);
            }
        }

        setVisibility(this.sortButton, showCombatUI);
        if (this.sortButton && !showCombatUI) {
            setTextButtonEnabled(this.sortButton, false);
        }

        setVisibility(this.resolveButton, showCombatUI);
        if (this.resolveButton && !showCombatUI) {
            setTextButtonEnabled(this.resolveButton, false);
        }

        setVisibility(this.rollsRemainingText, showCombatUI);

        if (this.menuButton) {
            setVisibility(this.menuButton, true);
        }

        if (this.settingsButton) {
            setVisibility(this.settingsButton, true);
        }

        if (this.menuPanel) {
            this.menuPanel.setVisible(this.isMenuOpen);
        }

        setVisibility(this.playerBurnText, showCombatUI && this.playerBurn > 0 && this.inCombat);
        const enemyBurnActive = this.enemyManager && typeof this.enemyManager.getEnemyBurn === 'function'
            ? this.enemyManager.getEnemyBurn() > 0
            : false;
        setVisibility(this.enemyBurnText, showCombatUI && this.inCombat && enemyBurnActive);

        applyToArray(this.zoneVisuals, showCombatUI);

        if (this.defendHighlight) {
            this.defendHighlight.setVisible(false);
        }
        if (this.attackHighlight) {
            this.attackHighlight.setVisible(false);
        }

        if (this.relicUI) {
            this.relicUI.setVisible(showCombatUI);
        }
        setVisibility(this.defendPreviewText, showCombatUI);
        setVisibility(this.attackPreviewText, showCombatUI);
        setVisibility(this.defendComboText, showCombatUI);
        setVisibility(this.attackComboText, showCombatUI);

        if (this.mapTitleText) {
            const hasText = this.mapTitleText.text && this.mapTitleText.text.length > 0;
            this.mapTitleText.setVisible(hasText);
        }

        if (this.enemyHealthBar) {
            const elements = ['barBg', 'barFill', 'text', 'nameText', 'intentText', 'statusText', 'burnText'];
            elements.forEach(key => {
                const element = this.enemyHealthBar[key];
                if (element) {
                    setVisibility(element, showCombatUI);
                }
            });
        }

        this.updateMapSkipButtonState();
    }
    
    updateRollButtonState() {
        if (!this.rollButton) {
            return;
        }

        if (!this.inCombat || this.isGameOver) {
            setTextButtonEnabled(this.rollButton, false);
            return;
        }

        // If no rolls left -> disabled
        if (this.rollsRemaining === 0) {
            setTextButtonEnabled(this.rollButton, false);
            return;
        }

        // First roll (before any rolls used) -> always enabled
        if (this.rollsRemaining === this.rollsRemainingAtTurnStart) {
            setTextButtonEnabled(this.rollButton, true);
            return;
        }

        // Otherwise: enable only if at least one die is selected
        const anySelected = this.getDiceInPlay().some(d => d.selected);
        setTextButtonEnabled(this.rollButton, anySelected);
    }

    clampVolume(value, fallback = 1) {
        const fallbackValue = Number.isFinite(fallback) ? fallback : 1;
        const numericValue = Number.isFinite(value) ? value : fallbackValue;
        const clampFn = (typeof Phaser !== 'undefined'
            && Phaser.Math
            && typeof Phaser.Math.Clamp === 'function')
            ? Phaser.Math.Clamp
            : (val, min, max) => Math.min(max, Math.max(min, val));
        return clampFn(numericValue, 0, 1);
    }

    refreshVolumeUI() {
        this.updateSfxVolumeUI();
        this.updateMusicVolumeUI();
    }

    updateSfxVolumeUI() {
        if (this.sfxIcon) {
            const isSilent = this.sfxVolume <= 0;
            this.sfxIcon.setText(isSilent ? '🔇' : '🔊');
            this.sfxIcon.setAlpha(isSilent ? 0.55 : 1);
        }

        if (this.sfxSlider && typeof this.sfxSlider.setValue === 'function') {
            this.sfxSlider.setValue(this.sfxVolume, { emit: false });
        }
    }

    updateMusicVolumeUI() {
        if (this.musicIcon) {
            const isSilent = this.musicVolume <= 0;
            this.musicIcon.setAlpha(isSilent ? 0.35 : 1);
        }

        if (this.musicSlider && typeof this.musicSlider.setValue === 'function') {
            this.musicSlider.setValue(this.musicVolume, { emit: false });
        }
    }

    setSfxVolume(value) {
        const clamped = this.clampVolume(value, CONSTANTS.DEFAULT_SFX_VOLUME);
        this.sfxVolume = clamped;
        if (clamped > 0) {
            this.sfxVolumeBeforeMute = clamped;
        }
        this.updateSfxVolumeUI();
    }

    toggleSfxMute() {
        if (this.sfxVolume <= 0) {
            const restore = Number.isFinite(this.sfxVolumeBeforeMute)
                ? this.sfxVolumeBeforeMute
                : CONSTANTS.DEFAULT_SFX_VOLUME;
            this.setSfxVolume(restore);
            return;
        }

        this.sfxVolumeBeforeMute = this.sfxVolume;
        this.setSfxVolume(0);
    }

    setMusicVolume(value) {
        const clamped = this.clampVolume(value, CONSTANTS.DEFAULT_MUSIC_VOLUME);
        this.musicVolume = clamped;
        if (clamped > 0) {
            this.musicVolumeBeforeMute = clamped;
        }
        this.updateBackgroundMusicState();
        this.updateMusicVolumeUI();
    }

    toggleMusicMute() {
        if (this.musicVolume <= 0) {
            const restore = Number.isFinite(this.musicVolumeBeforeMute)
                ? this.musicVolumeBeforeMute
                : CONSTANTS.DEFAULT_MUSIC_VOLUME;
            this.setMusicVolume(restore);
            return;
        }

        this.musicVolumeBeforeMute = this.musicVolume;
        this.setMusicVolume(0);
    }

    updateBackgroundMusicState() {
        if (!this.backgroundMusic) {
            return;
        }

        if (this.musicVolume <= 0) {
            if (this.backgroundMusic.isPlaying) {
                this.backgroundMusic.stop();
            }
            return;
        }

        if (typeof this.backgroundMusic.setLoop === 'function') {
            this.backgroundMusic.setLoop(true);
        }
        if (typeof this.backgroundMusic.setVolume === 'function') {
            this.backgroundMusic.setVolume(this.musicVolume);
        }
        if (!this.backgroundMusic.isPlaying) {
            this.backgroundMusic.play();
        }
    }

    playSound(key, config = {}) {
        if (!this.sound || typeof this.sound.play !== 'function') {
            return null;
        }

        const effectiveVolume = this.sfxVolume;
        if (effectiveVolume <= 0) {
            return null;
        }

        let configObject;
        if (config && typeof config === 'object' && !Array.isArray(config)) {
            configObject = { ...config };
        } else {
            configObject = {};
        }

        const baseVolume = typeof configObject.volume === 'number'
            ? configObject.volume
            : 1;
        const scaledVolume = this.clampVolume(baseVolume * effectiveVolume, baseVolume);
        if (scaledVolume <= 0) {
            return null;
        }

        configObject.volume = scaledVolume;
        return this.sound.play(key, configObject);
    }

    getMusicKeyForConfig(config) {
        if (!config || typeof config.musicKey !== 'string') {
            return null;
        }

        return config.musicKey;
    }

    playBackgroundMusicForConfig(config) {
        const musicKey = this.getMusicKeyForConfig(config);

        if (!musicKey) {
            this.stopBackgroundMusic();
            this.updateMusicVolumeUI();
            return;
        }

        if (this.backgroundMusic && this.currentMusicKey === musicKey) {
            this.updateBackgroundMusicState();
            this.updateMusicVolumeUI();
            return;
        }

        this.stopBackgroundMusic();

        let musicInstance = null;
        if (this.sound) {
            if (typeof this.sound.get === 'function') {
                musicInstance = this.sound.get(musicKey) || null;
            }

            if (!musicInstance && typeof this.sound.add === 'function') {
                musicInstance = this.sound.add(musicKey, { loop: true });
            }
        }

        if (!musicInstance) {
            this.backgroundMusic = null;
            this.currentMusicKey = null;
            this.updateMusicVolumeUI();
            return;
        }

        if (typeof musicInstance.setLoop === 'function') {
            musicInstance.setLoop(true);
        }

        this.backgroundMusic = musicInstance;
        this.currentMusicKey = musicKey;
        this.updateBackgroundMusicState();
        this.updateMusicVolumeUI();
    }

    stopBackgroundMusic() {
        const hasBackgroundMusic = this.backgroundMusic && typeof this.backgroundMusic.stop === 'function';
        if (hasBackgroundMusic && this.backgroundMusic.isPlaying) {
            this.backgroundMusic.stop();
        } else if (!hasBackgroundMusic && this.sound && typeof this.sound.stopByKey === 'function' && this.currentMusicKey) {
            this.sound.stopByKey(this.currentMusicKey);
        }
        this.backgroundMusic = null;
        this.currentMusicKey = null;
    }

    toggleTestingMode() {
        this.testingModeEnabled = !this.testingModeEnabled;
        this.updateTestingModeButtonState();

        if (this.testingModeEnabled) {
            this.applyTestingModeStartingResources();
        }

        if (this.pathUI) {
            this.pathUI.updateState();
        }

        const enemy = this.enemyManager ? this.enemyManager.getCurrentEnemy() : null;
        if (enemy) {
            if (this.testingModeEnabled) {
                this.applyTestingModeToEnemy(enemy);
            } else {
                this.restoreEnemyBaseStats(enemy);
            }
            this.updateEnemyHealthUI();
        }

        this.updateMapSkipButtonState();
    }

    updateTestingModeButtonState() {
        if (!this.testingModeButton) {
            return;
        }

        const statusText = this.testingModeEnabled ? 'Testing Mode: On' : 'Testing Mode: Off';
        this.testingModeButton.setText(statusText);
    }

    applyTestingModeToEnemy(enemy) {
        if (!enemy) {
            return;
        }

        const baseMax = typeof enemy.baseMaxHealth === 'number' && enemy.baseMaxHealth > 0
            ? enemy.baseMaxHealth
            : enemy.maxHealth;

        if (!enemy._testingModeApplied) {
            enemy._testingModePreviousHealth = Math.min(enemy.health, baseMax);
        }

        enemy.baseMaxHealth = baseMax;
        enemy.maxHealth = 1;
        enemy.health = Math.min(enemy.health, 1);
        enemy._testingModeApplied = true;
    }

    restoreEnemyBaseStats(enemy) {
        if (!enemy) {
            return;
        }

        const baseMax = typeof enemy.baseMaxHealth === 'number' && enemy.baseMaxHealth > 0
            ? enemy.baseMaxHealth
            : enemy.maxHealth;

        enemy.maxHealth = baseMax;

        if (enemy._testingModeApplied) {
            const previousHealth = typeof enemy._testingModePreviousHealth === 'number'
                ? enemy._testingModePreviousHealth
                : enemy.health;
            const clampedHealth = Math.max(0, Math.min(previousHealth, enemy.maxHealth));
            enemy.health = clampedHealth;
        } else if (this.testingModeEnabled) {
            enemy.health = Math.min(enemy.health, enemy.maxHealth);
        } else {
            enemy.health = enemy.maxHealth;
        }

        enemy._testingModeApplied = false;
        enemy._testingModePreviousHealth = null;
    }

    triggerVictoryScreen() {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;

        if (this.rollButton) {
            setTextButtonEnabled(this.rollButton, false);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false);
        }

        this.getDiceInPlay().forEach(die => die.disableInteractive());

        if (this.victoryScreen) {
            this.victoryScreen.show();
        }
        // Ensure speedrun timer stops when victory screen is shown
        if (this.speedrunEnabled) {
            this.stopSpeedrunTimer();
        }
    }

    triggerGameOver() {
        if (this.isGameOver) {
            return;
        }

        this.isGameOver = true;

        if (this.rollButton) {
            setTextButtonEnabled(this.rollButton, false);
        }

        if (this.sortButton) {
            setTextButtonEnabled(this.sortButton, false);
        }

        if (this.resolveButton) {
            setTextButtonEnabled(this.resolveButton, false);
        }

        this.getDiceInPlay().forEach(die => die.disableInteractive());

        if (this.gameOverManager) {
            this.gameOverManager.show(() => this.restartGame());
        }
    }

    restartGame() {
        if (this.gameOverManager) {
            this.gameOverManager.hide();
        }

        this.scene.restart({
            sfxVolume: this.sfxVolume,
            musicVolume: this.musicVolume,
            testingModeEnabled: this.testingModeEnabled
        });
    }
}
