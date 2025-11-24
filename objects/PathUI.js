import { PATH_NODE_TYPES } from '../systems/PathManager.js';
import { CONSTANTS } from '../constants.js';

const COLORS = {
    [PATH_NODE_TYPES.ENEMY]: 0xe74c3c,
    [PATH_NODE_TYPES.SHOP]: 0xf1c40f,
    [PATH_NODE_TYPES.INFIRMARY]: 0x27ae60,
    [PATH_NODE_TYPES.TOWER]: 0x5dade2,
    [PATH_NODE_TYPES.UPGRADE]: 0xf39c12,
    [PATH_NODE_TYPES.START]: 0xccccff,
    boss: 0x9b59b6,
    completed: 0x7f8c8d,
    whiteStroke: 0xffeeee,
    blackStroke: 0x111111
};

const ICONS = {
    [PATH_NODE_TYPES.ENEMY]: '⚔️',
    [PATH_NODE_TYPES.SHOP]: '🛒',
    [PATH_NODE_TYPES.INFIRMARY]: '⊕',
    [PATH_NODE_TYPES.TOWER]: '🎲',
    [PATH_NODE_TYPES.UPGRADE]: '✨',
    [PATH_NODE_TYPES.START]: '🏁',
    boss: '🔥'
};

const LAYOUT = {
    baseY: 160,
    columnSpacing: 210,
    rowSpacing: 140
};

const PATH_TEXTURE_SCALE = 1.4;
const GENERAL_TEXTURE_SCALE = 2;
const WALL_HIGHLIGHT_TEXTURE_KEY = 'wall_highlight_center';
const WALL_HIGHLIGHT_MIN_ALPHA = 0.8;
const WALL_HIGHLIGHT_MAX_ALPHA = 1;
const WALL_HIGHLIGHT_TWEEN_DURATION = 120;
const WALL_TORCH_TEXTURE_KEY = 'wall_torch';
const WALL_TORCH_ANIMATION_KEY = 'wall_torch_flicker';
const WALL_TORCH_FRAME_RATE = 8;
const PATH_DEPTHS = {
    outsideBackground: -5,
    background: 5,
    walls: -1, // grr healthbar
    connections: 7,
    nodes: 8
};

const PLAYER_DEPTH = 999;
// const PLAYER_MOVE_DURATION = 800;
const PLAYER_MOVE_SPEED = 0.4; // pixels per millisecond (~400 px/sec)
const PLAYER_WIGGLE_ANGLE = 14;
const PLAYER_WIGGLE_DURATION = 800;

const DRAG_THRESHOLD = 6;
const TOP_MARGIN = 80;
const BOTTOM_MARGIN = 80;
const WHEEL_SCROLL_MULTIPLIER = 1;
const SCROLL_INPUT_MULTIPLIER = 1;
const OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER = 0.25;
const FARTHEST_OUTSIDE_LAYER_MULTIPLIER = 0.6;
const OUTSIDE_BACKGROUND_LAYER_HORIZONTAL_OFFSETS = {
    outside_background_2: -350
};
const SPARKLE_TEXTURE_KEY = 'outside_star_sparkle';
const BIRD_TEXTURE_KEY = 'outside_bird_sprite';
const BAT_TEXTURE_KEY = 'outside_bat_sprite';
const BAT_ANIMATION_KEY = 'outside_bat_flap';
const BAT_FRAME_KEYS = [
    `${BAT_TEXTURE_KEY}_wing_up`,
    `${BAT_TEXTURE_KEY}_mid_up`,
    `${BAT_TEXTURE_KEY}_mid_down`,
    `${BAT_TEXTURE_KEY}_wing_down`
];
const BAT_FLAP_FRAME_RATE = 6;
const WORLD3_OUTSIDE_BACKGROUND_ORDER = [1, 3, 6, 8, 2, 4, 5, 7, 9];
const WORLD3_LAYER_TRIM_TOP = 30;
const WORLD3_BASE_SCALE = 0.65;
const WORLD3_FRONT_SCALE_BONUS = 0.01;
const WORLD3_SCROLL_MULTIPLIER = 0.4;
const WORLD3_MIN_SCROLL_FACTOR = 0;
const WORLD3_MAX_SCROLL_FACTOR = 1;
const WORLD3_MIN_VERTICAL_OFFSET_RATIO = 0.4;
const WORLD3_MAX_VERTICAL_OFFSET_RATIO = 0.5;
const WORLD3_BASELINE_ADJUSTMENT_RATIO = 0.5;
const WORLD3_TILE_OFFSET_RATIO = 0.08;
const WORLD3_TOP_STRETCH_INTENSITY = 0.55;
const WORLD3_BOTTOM_STRETCH_INTENSITY = 0.75;
const WORLD3_STRETCH_POWER = 2.4;
const WORLD3_STRETCH_SEGMENTS = 5;
const WORLD3_TRIMMED_LAYER_INDICES = new Set([3, 6, 8]);

function isNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
}

function clampNumber(value, min, max, fallback = min) {
    if (!isNumber(value)) {
        return fallback;
    }

    if (typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function') {
        return Phaser.Math.Clamp(value, min, max);
    }

    return Math.min(Math.max(value, min), max);
}

function formatNumberForKey(value) {
    if (!isNumber(value)) {
        return '0';
    }
    return String(Math.round(value * 1000));
}

function extractWorld3LayerIndex(key) {
    if (typeof key !== 'string') {
        return null;
    }

    const match = key.match(/world3_(\d+)/i);
    if (!match) {
        return null;
    }

    const parsed = Number(match[1]);
    return Number.isNaN(parsed) ? null : parsed;
}

function isWorld3BackgroundKey(key) {
    return typeof key === 'string' && key.toLowerCase().includes('world3');
}

function reorderWorld3LayerKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) {
        return [];
    }

    const unique = new Set();
    const keyedByIndex = new Map();
    keys.forEach(key => {
        if (typeof key !== 'string' || unique.has(key)) {
            return;
        }

        unique.add(key);
        const index = extractWorld3LayerIndex(key);
        if (index !== null && !keyedByIndex.has(index)) {
            keyedByIndex.set(index, key);
        }
    });

    const ordered = [];
    WORLD3_OUTSIDE_BACKGROUND_ORDER.forEach(orderIndex => {
        if (keyedByIndex.has(orderIndex)) {
            ordered.push(keyedByIndex.get(orderIndex));
            keyedByIndex.delete(orderIndex);
        }
    });

    keys.forEach(key => {
        if (!ordered.includes(key)) {
            ordered.push(key);
        }
    });

    return ordered;
}

function createStretchedTexture(scene, key, {
    trimTop = 0,
    trimBottom = 0,
    topIntensity = WORLD3_TOP_STRETCH_INTENSITY,
    bottomIntensity = WORLD3_BOTTOM_STRETCH_INTENSITY,
    stretchPower = WORLD3_STRETCH_POWER,
    segmentCount = WORLD3_STRETCH_SEGMENTS
} = {}) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    if (!scene.textures.exists(key)) {
        return null;
    }

    const texture = scene.textures.get(key);
    if (!texture || typeof texture.getSourceImage !== 'function') {
        return null;
    }

    const sourceImage = texture.getSourceImage();
    if (!sourceImage) {
        return null;
    }

    const sourceWidth = Math.max(1, Math.round(sourceImage.width || 1));
    const rawSourceHeight = Math.max(1, Math.round(sourceImage.height || 1));
    const safeTrimTop = clampNumber(trimTop, 0, rawSourceHeight - 1, 0);
    const safeTrimBottom = clampNumber(trimBottom, 0, rawSourceHeight - safeTrimTop - 1, 0);
    const availableHeight = Math.max(1, rawSourceHeight - safeTrimTop - safeTrimBottom);
    const segments = Math.max(1, Math.round(segmentCount));
    const topAmount = Math.max(0, topIntensity);
    const bottomAmount = Math.max(0, bottomIntensity);
    const power = Math.max(0.1, stretchPower);

    const segmentSourceHeights = [];
    const destHeights = [];
    let accumulatedHeight = 0;

    for (let index = 0; index < segments; index += 1) {
        const startRatio = index / segments;
        const endRatio = (index + 1) / segments;
        const startY = safeTrimTop + Math.floor(availableHeight * startRatio);
        const endY = safeTrimTop + Math.floor(availableHeight * endRatio);
        const segmentSourceHeight = Math.max(1, endY - startY);
        segmentSourceHeights.push({ startY, height: segmentSourceHeight });

        const midpoint = (index + 0.5) / segments;
        const topWeight = Math.pow(Math.max(0, 1 - midpoint), power);
        const bottomWeight = Math.pow(Math.max(0, midpoint), power);
        const localStretch = 1 + (topWeight * topAmount) + (bottomWeight * bottomAmount);
        const destHeight = Math.max(1, Math.round(segmentSourceHeight * localStretch));
        destHeights.push(destHeight);
        accumulatedHeight += destHeight;
    }

    const outputHeight = Math.max(1, Math.round(accumulatedHeight));
    const formattedKey = [
        safeTrimTop,
        safeTrimBottom,
        formatNumberForKey(topAmount),
        formatNumberForKey(bottomAmount),
        formatNumberForKey(power),
        segments,
        outputHeight
    ].join('_');
    const stretchedKey = `${key}__stretched_${formattedKey}`;

    if (scene.textures.exists(stretchedKey)) {
        const cachedTexture = scene.textures.get(stretchedKey);
        const cachedSource = cachedTexture && typeof cachedTexture.getSourceImage === 'function'
            ? cachedTexture.getSourceImage()
            : null;
        const cachedWidth = cachedSource && cachedSource.width ? cachedSource.width : sourceWidth;
        const cachedHeight = cachedSource && cachedSource.height ? cachedSource.height : outputHeight;
        return {
            key: stretchedKey,
            width: cachedWidth,
            height: cachedHeight
        };
    }

    if (typeof scene.textures.createCanvas !== 'function') {
        return null;
    }

    const canvasTexture = scene.textures.createCanvas(stretchedKey, sourceWidth, outputHeight);
    const context = canvasTexture && typeof canvasTexture.getContext === 'function'
        ? canvasTexture.getContext()
        : null;

    if (!context) {
        if (canvasTexture && typeof canvasTexture.destroy === 'function') {
            canvasTexture.destroy();
        }
        return null;
    }

    context.clearRect(0, 0, sourceWidth, outputHeight);

    let drawY = 0;
    segmentSourceHeights.forEach(({ startY, height }, index) => {
        const destHeight = destHeights[index];
        context.drawImage(
            sourceImage,
            0,
            startY,
            sourceWidth,
            height,
            0,
            drawY,
            sourceWidth,
            destHeight
        );
        drawY += destHeight;
    });

    if (typeof canvasTexture.refresh === 'function') {
        canvasTexture.refresh();
    }

    return {
        key: stretchedKey,
        width: sourceWidth,
        height: outputHeight
    };
}
function ensureBirdTexture(scene) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    if (scene.textures.exists(BIRD_TEXTURE_KEY)) {
        return BIRD_TEXTURE_KEY;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    const width = 28;
    const height = 16;
    const centerX = width / 2;
    const centerY = height / 2;
    const wingSpan = width * 0.85;
    const wingY = height * 0.4;

    graphics.clear();
    graphics.fillStyle(0xf5f5f5, 1);
    graphics.fillTriangle(
        centerX,
        centerY,
        centerX - wingSpan / 2,
        wingY,
        centerX - wingSpan * 0.15,
        centerY + height * 0.15
    );
    graphics.fillTriangle(
        centerX,
        centerY,
        centerX + wingSpan / 2,
        wingY,
        centerX + wingSpan * 0.15,
        centerY + height * 0.15
    );
    graphics.fillStyle(0xe8e8e8, 1);
    graphics.fillEllipse(centerX, centerY + height * 0.08, width * 0.18, height * 0.28);
    graphics.fillStyle(0xcfcfcf, 1);
    graphics.fillTriangle(
        centerX + width * 0.1,
        centerY + height * 0.1,
        centerX + width * 0.28,
        centerY + height * 0.05,
        centerX + width * 0.32,
        centerY + height * 0.18
    );

    graphics.generateTexture(BIRD_TEXTURE_KEY, width, height);
    graphics.destroy();

    return BIRD_TEXTURE_KEY;
}

function drawBatFrame(graphics, width, height, {
    outerYOffset = 0,
    tipYOffset = 0,
    innerYOffset = 0,
    wingSpanScale = 1,
    bodyScaleY = 1,
    earTilt = 0
} = {}) {
    const centerX = width / 2;
    const centerY = height / 2;
    const wingSpan = width * 0.9 * wingSpanScale;
    const wingDepth = height * 0.55;
    const bodyWidth = width * 0.28;
    const bodyHeight = height * 0.6 * bodyScaleY;

    graphics.fillStyle(0x090909, 1);
    graphics.fillTriangle(
        centerX - wingSpan / 2,
        centerY + outerYOffset,
        centerX - wingSpan * 0.35,
        centerY - wingDepth + tipYOffset,
        centerX - bodyWidth / 2,
        centerY + wingDepth * 0.3 + innerYOffset
    );
    graphics.fillTriangle(
        centerX + wingSpan / 2,
        centerY + outerYOffset,
        centerX + wingSpan * 0.35,
        centerY - wingDepth + tipYOffset,
        centerX + bodyWidth / 2,
        centerY + wingDepth * 0.3 + innerYOffset
    );

    graphics.fillStyle(0x050505, 1);
    graphics.fillEllipse(centerX, centerY + height * 0.05, bodyWidth, bodyHeight);

    graphics.fillStyle(0x0c0c0c, 1);
    graphics.fillTriangle(
        centerX - bodyWidth * 0.4,
        centerY - bodyHeight * 0.45 - earTilt,
        centerX - bodyWidth * 0.1,
        centerY - bodyHeight * 0.95 - earTilt,
        centerX - bodyWidth * 0.1,
        centerY - bodyHeight * 0.25 - earTilt
    );
    graphics.fillTriangle(
        centerX + bodyWidth * 0.4,
        centerY - bodyHeight * 0.45 - earTilt,
        centerX + bodyWidth * 0.1,
        centerY - bodyHeight * 0.95 - earTilt,
        centerX + bodyWidth * 0.1,
        centerY - bodyHeight * 0.25 - earTilt
    );

    graphics.fillStyle(0x1a1a1a, 1);
    graphics.fillEllipse(centerX, centerY + height * 0.05, bodyWidth * 0.6, bodyHeight * 0.55);
}

function ensureBatTexture(scene) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    const allFramesExist = BAT_FRAME_KEYS.every(key => scene.textures.exists(key));

    if (!allFramesExist) {
        const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
        const width = 36;
        const height = 22;

        const frameConfigs = [
            {
                key: BAT_FRAME_KEYS[0],
                outerYOffset: -6,
                tipYOffset: -11,
                innerYOffset: -4.5,
                wingSpanScale: 0.82,
                earTilt: -0.45
            },
            {
                key: BAT_FRAME_KEYS[1],
                outerYOffset: -2,
                tipYOffset: -5,
                innerYOffset: -1.6,
                wingSpanScale: 0.9
            },
            {
                key: BAT_FRAME_KEYS[2],
                outerYOffset: 2.6,
                tipYOffset: 3.2,
                innerYOffset: 2.8,
                wingSpanScale: 1.04
            },
            {
                key: BAT_FRAME_KEYS[3],
                outerYOffset: 6.5,
                tipYOffset: 8.5,
                innerYOffset: 5.9,
                wingSpanScale: 1.12,
                earTilt: 0.35
            }
        ];

        frameConfigs.forEach(config => {
            graphics.clear();
            drawBatFrame(graphics, width, height, config);
            graphics.generateTexture(config.key, width, height);
        });

        graphics.destroy();
    }

    if (scene.anims && typeof scene.anims.exists === 'function' && !scene.anims.exists(BAT_ANIMATION_KEY)) {
        scene.anims.create({
            key: BAT_ANIMATION_KEY,
            frames: BAT_FRAME_KEYS.map(key => ({ key })),
            frameRate: BAT_FLAP_FRAME_RATE,
            repeat: -1,
            yoyo: true
        });
    }

    return BAT_FRAME_KEYS[1];
}

function ensureSparkleTexture(scene) {
    if (!scene || !scene.textures || typeof scene.textures.exists !== 'function') {
        return null;
    }

    if (scene.textures.exists(SPARKLE_TEXTURE_KEY)) {
        return SPARKLE_TEXTURE_KEY;
    }

    const graphics = scene.make.graphics({ x: 0, y: 0, add: false });
    const size = 12;
    const half = size / 2;
    const accent = size * 0.3;

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(half, half, half * 0.45);
    graphics.fillRect(half - accent / 2, half - half * 0.9, accent, size);
    graphics.fillRect(half - half * 0.9, half - accent / 2, size, accent);
    graphics.generateTexture(SPARKLE_TEXTURE_KEY, size, size);
    graphics.destroy();

    return SPARKLE_TEXTURE_KEY;
}

function blendColor(base, mix, amount = 0.5) {
    const clamped = Phaser.Math.Clamp(amount, 0, 1);
    const baseColor = Phaser.Display.Color.ValueToColor(base);
    const mixColor = Phaser.Display.Color.ValueToColor(mix);

    const r = Phaser.Math.Linear(baseColor.red, mixColor.red, clamped);
    const g = Phaser.Math.Linear(baseColor.green, mixColor.green, clamped);
    const b = Phaser.Math.Linear(baseColor.blue, mixColor.blue, clamped);

    return Phaser.Display.Color.GetColor(r, g, b);
}

export class PathUI {
    constructor(
        scene,
        pathManager,
        onSelect,
        {
            connectionTextureKey,
            wallTextureKey,
            backgroundTextureKey,
            outsideBackgroundLayerKeys,
            outsideBackgroundEffect,
            onPlayerArrive
        } = {}
    ) {
        this.scene = scene;
        this.pathManager = pathManager;
        this.onSelect = typeof onSelect === 'function' ? onSelect : () => {};
        this.connectionTextureKey = connectionTextureKey || 'path_ladder';
        this.wallTextureKey = wallTextureKey || null;
        this.backgroundTextureKey = backgroundTextureKey || 'path_background';
        const normalizedBackgroundKeys = Array.isArray(outsideBackgroundLayerKeys)
            ? outsideBackgroundLayerKeys.filter(key => typeof key === 'string' && key.length > 0)
            : [];
        this.usingWorld3Backgrounds = normalizedBackgroundKeys.some(isWorld3BackgroundKey);
        this.outsideBackgroundLayerKeys = this.usingWorld3Backgrounds
            ? reorderWorld3LayerKeys(normalizedBackgroundKeys)
            : normalizedBackgroundKeys;
        this.outsideBackgroundEffect = outsideBackgroundEffect || 'sparkles';
        this.outsideBackgroundScrollMultiplier = this.usingWorld3Backgrounds
            ? WORLD3_SCROLL_MULTIPLIER
            : OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER;

        this.outsideBackgroundContainer = scene.add.container(0, 0);
        this.outsideBackgroundContainer.setDepth(PATH_DEPTHS.outsideBackground);
        this.outsideBackgroundLayers = [];
        this.backgroundContainer = scene.add.container(0, 0);
        this.backgroundContainer.setDepth(PATH_DEPTHS.background);
        this.backgroundSprite = null;
        this.wallContainer = scene.add.container(0, 0);
        this.wallContainer.setDepth(PATH_DEPTHS.walls);
        this.wallSprites = [];
        this.wallHighlightSprites = [];
        this.wallHighlightTweens = [];
        this.wallTorchSprites = [];

        this.container = scene.add.container(0, 0);
        this.container.setDepth(PATH_DEPTHS.nodes);

    // callback fired when the player token finishes moving to a node
    this.onPlayerArrive = typeof onPlayerArrive === 'function' ? onPlayerArrive : null;

        this.connectionGraphics = scene.add.graphics();
        this.connectionGraphics.setDepth(PATH_DEPTHS.connections);

        this.connectionSpriteContainer = scene.add.container(0, 0);
        this.connectionSpriteContainer.setDepth(PATH_DEPTHS.connections);
        this.connectionSprites = [];

        this.nodeRefs = new Map();
        this.isActive = false;
        this.isDragging = false;
        this.dragPointerId = null;
        this.dragStartY = 0;
        this.scrollStartY = 0;
        this.scrollY = 0;
        this.minScrollY = 0;
        this.maxScrollY = 0;
        this.minContentY = 0;
        this.maxContentY = 0;
        this.isDestroyed = false;
        this.playerContainer = null;
        this.playerDieText = null;
        this.playerFaceTimer = null;
        this.playerLimbTweens = [];
        this.playerHoveredNodeId = null;
        this.playerAnchorNodeId = null;
        this.playerAnchorPosition = null;
        this.playerActiveRoute = null;
        this.playerMovementTween = null;
        this.playerPendingSegments = [];

        this.createNodes();
        this.createPlayerToken();
        this.createWalls();
        this.drawConnections();
        this.updateScrollBounds();
        this.applyScroll();
        this.setupInputHandlers();
        if (this.scene && this.scene.events) {
            this.scene.events.once('shutdown', this.destroy, this);
            this.scene.events.once('destroy', this.destroy, this);
        }
        this.hide();
    }

    getWallTexture() {
        if (!this.wallTextureKey) {
            return null;
        }

        const textures = this.scene && this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(this.wallTextureKey)) {
            return null;
        }

        return textures.get(this.wallTextureKey);
    }

    getBackgroundTexture() {
        if (!this.backgroundTextureKey) {
            return null;
        }

        const textures = this.scene && this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(this.backgroundTextureKey)) {
            return null;
        }

        return textures.get(this.backgroundTextureKey);
    }

    clearWallSprites() {
        this.clearWallTorchSprites();
        this.clearWallHighlightSprites();

        if (Array.isArray(this.wallSprites)) {
            this.wallSprites.forEach(sprite => {
                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallSprites.length = 0;
        } else {
            this.wallSprites = [];
        }

        if (this.wallContainer && typeof this.wallContainer.removeAll === 'function') {
            this.wallContainer.removeAll(false);
        }
    }

    clearWallHighlightSprites() {
        if (Array.isArray(this.wallHighlightTweens)) {
            this.wallHighlightTweens.forEach(tween => {
                if (!tween) {
                    return;
                }

                if (typeof tween.stop === 'function') {
                    tween.stop();
                }

                if (typeof tween.remove === 'function') {
                    tween.remove();
                }
            });

            this.wallHighlightTweens.length = 0;
        } else {
            this.wallHighlightTweens = [];
        }

        if (Array.isArray(this.wallHighlightSprites)) {
            this.wallHighlightSprites.forEach(sprite => {
                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallHighlightSprites.length = 0;
        } else {
            this.wallHighlightSprites = [];
        }
    }

    clearWallTorchSprites() {
        if (Array.isArray(this.wallTorchSprites)) {
            this.wallTorchSprites.forEach(sprite => {
                if (!sprite) {
                    return;
                }

                if (sprite.anims && typeof sprite.anims.stop === 'function') {
                    sprite.anims.stop();
                }

                if (typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });

            this.wallTorchSprites.length = 0;
        } else {
            this.wallTorchSprites = [];
        }
    }

    clearBackgroundSprite() {
        if (this.backgroundSprite && typeof this.backgroundSprite.destroy === 'function') {
            this.backgroundSprite.destroy();
        }

        this.backgroundSprite = null;

        if (this.backgroundContainer && typeof this.backgroundContainer.removeAll === 'function') {
            this.backgroundContainer.removeAll(false);
        }
    }

    clearOutsideBackgroundSprites() {
        if (Array.isArray(this.outsideBackgroundLayers)) {
            this.outsideBackgroundLayers.forEach(layer => {
                const sprite = layer && layer.sprite ? layer.sprite : null;
                const tween = layer && layer.tween ? layer.tween : null;
                if (tween && typeof tween.remove === 'function') {
                    tween.remove();
                }
                if (sprite && typeof sprite.destroy === 'function') {
                    sprite.destroy();
                }
            });
        }

        this.outsideBackgroundLayers = [];

        if (this.outsideBackgroundContainer && typeof this.outsideBackgroundContainer.removeAll === 'function') {
            this.outsideBackgroundContainer.removeAll(false);
        }
    }

    createWalls() {
        if (!this.wallContainer) {
            return;
        }

        this.clearWallSprites();
        this.clearBackgroundSprite();
        this.clearOutsideBackgroundSprites();

        const texture = this.getWallTexture();
        if (!texture || typeof texture.getSourceImage !== 'function') {
            return;
        }

        const sourceImage = texture.getSourceImage();
        if (!sourceImage) {
            return;
        }

        const nodes = this.pathManager.getNodes();
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return;
        }

        let minX = Number.POSITIVE_INFINITY;
        let maxX = Number.NEGATIVE_INFINITY;
        nodes.forEach(node => {
            const { x } = this.getNodePosition(node);
            minX = Math.min(minX, x);
            maxX = Math.max(maxX, x);
        });

        if (!Number.isFinite(minX) || !Number.isFinite(maxX)) {
            return;
        }

        const wallSourceWidth = Math.max(1, sourceImage.width || 1);
        const wallWidth = wallSourceWidth * GENERAL_TEXTURE_SCALE;
        const wallSourceHeight = Math.max(1, sourceImage.height || 1);
        const wallPieceHeight = wallSourceHeight * GENERAL_TEXTURE_SCALE;
        const wallHalfWidth = wallWidth / 2;
        const nodeHalfWidth = 28;
        const lateralPadding = 30;
        const offset = nodeHalfWidth + wallHalfWidth + lateralPadding;
        const leftX = minX - offset;
        const rightX = maxX + offset;

        const minContentY = Number.isFinite(this.minContentY) ? this.minContentY : 0;
        const maxContentY = Number.isFinite(this.maxContentY) ? this.maxContentY : 0;
        const top = minContentY - TOP_MARGIN;
        const bottom = maxContentY + BOTTOM_MARGIN;
        const height = Math.max(1, bottom - top);
        const centerY = (top + bottom) / 2;

        this.createOutsideBackgroundSprites({ top, bottom, height, centerY });

        const backgroundTexture = this.getBackgroundTexture();
        if (backgroundTexture && this.backgroundContainer) {
            const backgroundWidth = Math.max(1, rightX - leftX - wallWidth);
            if (backgroundWidth > 0) {
                const backgroundSprite = this.scene.add.tileSprite(
                    (leftX + rightX) / 2,
                    centerY,
                    backgroundWidth,
                    height,
                    this.backgroundTextureKey
                );
                backgroundSprite.setTileScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE); // apply uniform scaling
                backgroundSprite.setOrigin(0.5, 0.5);
                backgroundSprite.setDepth(PATH_DEPTHS.background);
                backgroundSprite.setPosition(Math.round(backgroundSprite.x), Math.round(backgroundSprite.y));
                this.backgroundContainer.add(backgroundSprite);
                this.backgroundSprite = backgroundSprite;
            }
        }

        const textures = this.scene && this.scene.textures;
        const hasHighlightTexture = textures
            && typeof textures.exists === 'function'
            && textures.exists(WALL_HIGHLIGHT_TEXTURE_KEY);
        const hasTorchTexture = textures
            && typeof textures.exists === 'function'
            && textures.exists(WALL_TORCH_TEXTURE_KEY);
        const torchAnimationReady = hasTorchTexture && this.ensureWallTorchAnimation();

        [leftX, rightX].forEach(x => {
            const sprite = this.scene.add.tileSprite(x, centerY, wallWidth, height, this.wallTextureKey);
            sprite.setOrigin(0.5, 0.5);
            sprite.setDepth(PATH_DEPTHS.walls);
            sprite.setTileScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
            sprite.setPosition(Math.round(sprite.x), Math.round(sprite.y));
            this.wallContainer.add(sprite);
            this.wallSprites.push(sprite);

            if ((!hasHighlightTexture && !torchAnimationReady)
                || !Number.isFinite(wallPieceHeight)
                || wallPieceHeight <= 0) {
                return;
            }

            const pieceCount = Math.max(0, Math.ceil(height / wallPieceHeight));
            for (let index = 2; index < pieceCount; index += 3) {
                const y = top + (index + 0.5) * wallPieceHeight;
                if (y < top || y > bottom) {
                    continue;
                }

                if (hasHighlightTexture) {
                    const highlightSprite = this.scene.add.sprite(x, y, WALL_HIGHLIGHT_TEXTURE_KEY);
                    highlightSprite.setOrigin(0.5, 0.5);
                    highlightSprite.setScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
                    highlightSprite.setDepth(PATH_DEPTHS.walls + 0.01);
                    highlightSprite.setAlpha(WALL_HIGHLIGHT_MAX_ALPHA);
                    highlightSprite.setPosition(Math.round(highlightSprite.x), Math.round(highlightSprite.y));
                    this.wallContainer.add(highlightSprite);
                    this.wallHighlightSprites.push(highlightSprite);

                    if (this.scene && this.scene.tweens && typeof this.scene.tweens.add === 'function') {
                        const tween = this.scene.tweens.add({
                            targets: highlightSprite,
                            alpha: {
                                from: WALL_HIGHLIGHT_MIN_ALPHA + (Math.random() * 0.2),
                                to: WALL_HIGHLIGHT_MAX_ALPHA
                            },
                            duration: WALL_HIGHLIGHT_TWEEN_DURATION,
                            yoyo: true,
                            repeat: -1,
                            ease: 'Sine.easeInOut'
                        });

                        this.wallHighlightTweens.push(tween);
                    }
                }

                if (torchAnimationReady) {
                    const torchSprite = this.scene.add.sprite(x, y, WALL_TORCH_TEXTURE_KEY, 0);
                    torchSprite.setOrigin(0.5, 0.5);
                    torchSprite.setScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE);
                    torchSprite.setDepth(PATH_DEPTHS.walls + 0.02);
                    torchSprite.setPosition(Math.round(torchSprite.x), Math.round(torchSprite.y));
                    this.wallContainer.add(torchSprite);
                    this.wallTorchSprites.push(torchSprite);

                    if (typeof torchSprite.play === 'function') {
                        torchSprite.play(WALL_TORCH_ANIMATION_KEY);
                        const randomProgress = typeof Phaser !== 'undefined'
                            && Phaser.Math
                            && typeof Phaser.Math.FloatBetween === 'function'
                                ? Phaser.Math.FloatBetween(0, 1)
                                : Math.random();
                        if (torchSprite.anims && typeof torchSprite.anims.setProgress === 'function') {
                            torchSprite.anims.setProgress(randomProgress);
                        }
                    }
                }
            }
        });
    }

    ensureWallTorchAnimation() {
        if (!this.scene || !this.scene.anims) {
            return false;
        }

        const anims = this.scene.anims;
        const animationAlreadyExists = (typeof anims.exists === 'function' && anims.exists(WALL_TORCH_ANIMATION_KEY))
            || (typeof anims.get === 'function' && anims.get(WALL_TORCH_ANIMATION_KEY));
        if (animationAlreadyExists) {
            return true;
        }

        const textures = this.scene.textures;
        if (!textures || typeof textures.exists !== 'function' || !textures.exists(WALL_TORCH_TEXTURE_KEY)) {
            return false;
        }

        const texture = textures.get(WALL_TORCH_TEXTURE_KEY);
        if (!texture) {
            return false;
        }

        const frameNames = typeof texture.getFrameNames === 'function'
            ? texture.getFrameNames(false)
            : Object.keys(texture.frames || {}).filter(name => name !== '__BASE');

        if (!Array.isArray(frameNames) || frameNames.length === 0) {
            return false;
        }

        if (typeof anims.create !== 'function') {
            return false;
        }

        const sortedFrameNames = [...frameNames].sort((a, b) => {
            const aNum = Number(a);
            const bNum = Number(b);
            if (Number.isNaN(aNum) || Number.isNaN(bNum)) {
                return String(a).localeCompare(String(b));
            }
            return aNum - bNum;
        });

        const frames = sortedFrameNames.map(frame => ({ key: WALL_TORCH_TEXTURE_KEY, frame }));

        anims.create({
            key: WALL_TORCH_ANIMATION_KEY,
            frames,
            frameRate: WALL_TORCH_FRAME_RATE,
            repeat: -1
        });

        return true;
    }

    createOutsideBackgroundSprites({ top, bottom, height, centerY }) {
        if (!this.outsideBackgroundContainer) {
            return;
        }

        this.clearOutsideBackgroundSprites();

        if (!Array.isArray(this.outsideBackgroundLayerKeys) || this.outsideBackgroundLayerKeys.length === 0) {
            return;
        }

        if (this.usingWorld3Backgrounds) {
            this.createWorld3OutsideBackgroundSprites({ top, bottom, height, centerY });
            return;
        }

        const textures = this.scene && this.scene.textures;
        const count = this.outsideBackgroundLayerKeys.length;
        const minFactor = 0.15;
        const maxFactor = 1;
        const defaultScale = 2;
        const baseScrollMultiplier = isNumber(this.outsideBackgroundScrollMultiplier)
            ? this.outsideBackgroundScrollMultiplier
            : OUTSIDE_BACKGROUND_SCROLL_MULTIPLIER;
        const baseX = this.scene && this.scene.scale ? this.scene.scale.width / 2 : 0;
        const defaultY = this.scene && this.scene.scale ? this.scene.scale.height / 2 : 0;
        const sceneHeight = this.scene && this.scene.scale ? this.scene.scale.height : 0;
        const spanHeight = Number.isFinite(height) ? height : sceneHeight;
        const spanTop = Number.isFinite(top)
            ? top
            : (Number.isFinite(centerY) ? centerY - spanHeight / 2 : defaultY - spanHeight / 2);
        const coverageHeight = Math.max(spanHeight, sceneHeight) + sceneHeight;
        const viewportHeight = Number.isFinite(sceneHeight) && sceneHeight > 0 ? sceneHeight : spanHeight;

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const lerp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Linear === 'function'
            ? Phaser.Math.Linear
            : (start, end, t) => start + (end - start) * t;

        this.outsideBackgroundLayerKeys.forEach((key, index) => {
            if (!key || !textures || typeof textures.exists !== 'function' || !textures.exists(key)) {
                return;
            }

            const t = count > 1 ? clamp(index / (count - 1), 0, 1) : 1;
            const baseScrollFactor = count > 1 ? lerp(minFactor, maxFactor, t) : maxFactor;
            const slowdownMultiplier = index === 0
                ? baseScrollMultiplier * FARTHEST_OUTSIDE_LAYER_MULTIPLIER
                : baseScrollMultiplier;
            const scrollFactor = baseScrollFactor * slowdownMultiplier;
            const texture = textures.get(key);
            const source = texture && typeof texture.getSourceImage === 'function' ? texture.getSourceImage() : null;
            const sourceWidth = source && source.width ? source.width : sceneHeight || 1;
            const sourceHeight = source && source.height ? source.height : sceneHeight || 1;
            const horizontalOffset = OUTSIDE_BACKGROUND_LAYER_HORIZONTAL_OFFSETS[key] || 0;

            if (index === 0) {
                const width = sourceWidth * defaultScale;
                const tileHeight = Math.max(coverageHeight, sourceHeight * defaultScale);
                const tileY = spanTop + tileHeight / 2;
                let tileFrameKey = null;

                if (texture && typeof texture.has === 'function' && typeof texture.add === 'function') {
                    const croppedHeight = Math.max(1, Math.floor(sourceHeight * 0.45));
                    const frameKey = `${key}_topHalf`;
                    if (!texture.has(frameKey)) {
                        texture.add(frameKey, 0, 0, 0, sourceWidth, croppedHeight);
                    }
                    if (texture.has(frameKey)) {
                        tileFrameKey = frameKey;
                    }
                }

                const tileSprite = this.scene.add.tileSprite(
                    baseX + horizontalOffset,
                    tileY,
                    width,
                    tileHeight,
                    key,
                    tileFrameKey || undefined
                );
                tileSprite.setOrigin(0.5, 0.5);
                tileSprite.setTileScale(defaultScale, defaultScale);
                tileSprite.setScrollFactor(0);
                const layerDepth = PATH_DEPTHS.outsideBackground + index * 0.01;
                tileSprite.setDepth(layerDepth);
                tileSprite.setPosition(Math.round(tileSprite.x), Math.round(tileSprite.y));

                this.outsideBackgroundContainer.add(tileSprite);

                this.outsideBackgroundLayers.push({
                    sprite: tileSprite,
                    baseY: tileSprite.y,
                    baseTileX: tileSprite.tilePositionX || 0,
                    baseTileY: tileSprite.tilePositionY || 0,
                    scrollFactor,
                    isTileSprite: true
                });

                if (this.outsideBackgroundEffect === 'birds') {
                    this.createOutsideBirds({
                        baseX,
                        coverageHeight,
                        tileWidth: width,
                        scrollFactor,
                        layerDepth
                    });
                } else if (this.outsideBackgroundEffect === 'bats') {
                    this.createOutsideBats({
                        baseX,
                        coverageHeight,
                        tileWidth: width,
                        scrollFactor,
                        layerDepth
                    });
                } else {
                    this.createOutsideSparkles({
                        baseX,
                        coverageHeight,
                        tileWidth: width,
                        scrollFactor,
                        layerDepth
                    });
                }
                return;
            }

            const spriteHeight = sourceHeight * defaultScale;
            const progress = count > 1 ? clamp(index / (count - 1), 0, 1) : 1;
            const minOffset = viewportHeight * 0.12;
            const maxOffset = viewportHeight * 0.45;
            const verticalOffset = lerp(minOffset, maxOffset, progress);
            const spriteY = spanTop + spriteHeight / 2 + verticalOffset - 100;
            const sprite = this.scene.add.image(baseX + horizontalOffset, spriteY, key);
            sprite.setOrigin(0.5, 0.5);
            sprite.setScale(defaultScale);
            sprite.setScrollFactor(0);
            sprite.setDepth(PATH_DEPTHS.outsideBackground + index * 0.01);
            sprite.setPosition(Math.round(sprite.x), Math.round(sprite.y));

            this.outsideBackgroundContainer.add(sprite);

            this.outsideBackgroundLayers.push({
                sprite,
                baseY: sprite.y,
                scrollFactor
            });
        });
    }

    createWorld3OutsideBackgroundSprites({ top, bottom, height, centerY }) {
        if (!Array.isArray(this.outsideBackgroundLayerKeys) || this.outsideBackgroundLayerKeys.length === 0) {
            return;
        }

        const scene = this.scene;
        const textures = scene && scene.textures;
        if (!textures || typeof textures.exists !== 'function') {
            return;
        }

        const count = this.outsideBackgroundLayerKeys.length;
        const baseX = scene && scene.scale ? scene.scale.width / 2 : 0;
        const sceneHeight = scene && scene.scale ? scene.scale.height : 0;
        const spanHeight = Number.isFinite(height) ? height : sceneHeight;
        const spanTop = Number.isFinite(top)
            ? top
            : (Number.isFinite(centerY) ? centerY - spanHeight / 2 : -spanHeight / 2);
        const viewportHeight = sceneHeight > 0 ? sceneHeight : spanHeight;
        const coverageHeight = Math.max(spanHeight, sceneHeight) + viewportHeight * 0.85;
        const baselineOffset = viewportHeight * WORLD3_BASELINE_ADJUSTMENT_RATIO;
        const tileOffset = viewportHeight * WORLD3_TILE_OFFSET_RATIO;
        const minOffset = viewportHeight * WORLD3_MIN_VERTICAL_OFFSET_RATIO;
        const maxOffset = viewportHeight * WORLD3_MAX_VERTICAL_OFFSET_RATIO;
        const baseScrollMultiplier = isNumber(this.outsideBackgroundScrollMultiplier)
            ? this.outsideBackgroundScrollMultiplier
            : WORLD3_SCROLL_MULTIPLIER;
        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const lerp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Linear === 'function'
            ? Phaser.Math.Linear
            : (start, end, t) => start + (end - start) * t;

        this.outsideBackgroundLayerKeys.forEach((key, index) => {
            if (!key || !textures.exists(key)) {
                return;
            }

            const texture = textures.get(key);
            if (!texture || typeof texture.getSourceImage !== 'function') {
                return;
            }

            const sourceImage = texture.getSourceImage();
            if (!sourceImage) {
                return;
            }

            const layerNumber = extractWorld3LayerIndex(key);
            const shouldTrimTop = layerNumber !== null && WORLD3_TRIMMED_LAYER_INDICES.has(layerNumber);
            const trimTop = shouldTrimTop ? WORLD3_LAYER_TRIM_TOP : 0;
            const stretched = createStretchedTexture(scene, key, { trimTop });

            let displayKey = key;
            let displayWidth = Math.max(1, sourceImage.width || 1);
            let displayHeight = Math.max(1, sourceImage.height || 1);
            let cropTop = trimTop;
            let applyCrop = trimTop > 0;

            if (stretched && stretched.key && textures.exists(stretched.key)) {
                displayKey = stretched.key;
                displayWidth = Math.max(1, stretched.width || displayWidth);
                displayHeight = Math.max(1, stretched.height || displayHeight);
                cropTop = 0;
                applyCrop = false;
            } else if (applyCrop) {
                displayHeight = Math.max(1, displayHeight - trimTop);
            }

            const progress = count > 1 ? clamp(index / (count - 1), 0, 1) : 1;
            const scale = WORLD3_BASE_SCALE + progress * WORLD3_FRONT_SCALE_BONUS;
            const baseScrollFactor = count > 1
                ? lerp(WORLD3_MIN_SCROLL_FACTOR, WORLD3_MAX_SCROLL_FACTOR, progress)
                : WORLD3_MAX_SCROLL_FACTOR;
            const slowdownMultiplier = index === 0
                ? baseScrollMultiplier * FARTHEST_OUTSIDE_LAYER_MULTIPLIER
                : baseScrollMultiplier;
            const scrollFactor = baseScrollFactor * slowdownMultiplier;
            const verticalOffset = lerp(minOffset, maxOffset, progress);
            const depth = PATH_DEPTHS.outsideBackground + index * 0.01;

            if (index === 0) {
                const tileWidth = displayWidth * scale;
                const tileHeight = Math.max(coverageHeight, displayHeight * scale);
                const tileY = spanTop + tileHeight / 2 - baselineOffset + tileOffset;
                const tileSprite = scene.add.tileSprite(
                    baseX,
                    tileY,
                    tileWidth,
                    tileHeight,
                    displayKey
                );
                tileSprite.setOrigin(0.5, 0.5);
                tileSprite.setTileScale(scale, scale);
                tileSprite.setScrollFactor(0);
                tileSprite.setDepth(depth);
                tileSprite.setPosition(Math.round(tileSprite.x), Math.round(tileSprite.y));

                this.outsideBackgroundContainer.add(tileSprite);
                this.outsideBackgroundLayers.push({
                    sprite: tileSprite,
                    baseY: tileSprite.y,
                    baseTileX: tileSprite.tilePositionX || 0,
                    baseTileY: tileSprite.tilePositionY || 0,
                    scrollFactor
                });
                if (this.outsideBackgroundEffect === 'birds') {
                    this.createOutsideBirds({
                        baseX,
                        coverageHeight,
                        tileWidth,
                        scrollFactor,
                        layerDepth: depth
                    });
                } else if (this.outsideBackgroundEffect === 'bats') {
                    this.createOutsideBats({
                        baseX,
                        coverageHeight,
                        tileWidth,
                        scrollFactor,
                        layerDepth: depth
                    });
                } else {
                    this.createOutsideSparkles({
                        baseX,
                        coverageHeight,
                        tileWidth,
                        scrollFactor,
                        layerDepth: depth
                    });
                }
                return;
            }

            const spriteHeight = displayHeight * scale;
            const spriteY = spanTop + spriteHeight / 2 + verticalOffset - baselineOffset;
            const sprite = scene.add.image(baseX, spriteY, displayKey);
            sprite.setOrigin(0.5, 0.5);
            if (applyCrop && typeof sprite.setCrop === 'function') {
                sprite.setCrop(0, cropTop, displayWidth, displayHeight);
            }
            sprite.setScale(scale);
            sprite.setScrollFactor(0);
            sprite.setDepth(depth);
            sprite.setPosition(Math.round(sprite.x), Math.round(sprite.y));

            this.outsideBackgroundContainer.add(sprite);
            this.outsideBackgroundLayers.push({
                sprite,
                baseY: sprite.y,
                scrollFactor
            });
        });
    }

    createOutsideBirds({ baseX, coverageHeight, tileWidth, scrollFactor, layerDepth }) {
        const scene = this.scene;
        if (!scene || !this.outsideBackgroundContainer) {
            return;
        }

        const textureKey = ensureBirdTexture(scene);
        if (!textureKey) {
            return;
        }

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const random = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.FloatBetween === 'function'
            ? Phaser.Math.FloatBetween
            : (min, max) => min + Math.random() * (max - min);
        const between = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function'
            ? Phaser.Math.Between
            : (min, max) => Math.floor(min + Math.random() * (max - min + 1));

        const safeCoverage = Number.isFinite(coverageHeight) && coverageHeight > 0
            ? coverageHeight
            : ((scene.scale && scene.scale.height) || 0);
        const width = Number.isFinite(tileWidth) && tileWidth > 0
            ? tileWidth
            : (scene.scale && scene.scale.width) || 0;
        const halfWidth = width / 2;
        const minY = CONSTANTS.HEADER_HEIGHT;
        const maxY = safeCoverage * 0.2;
        const birdCount = 20;

        for (let i = 0; i < birdCount; i += 1) {
            const offsetX = random(-halfWidth, halfWidth);
            const y = clamp(random(minY, maxY), minY, maxY);
            const bird = scene.add.image(baseX + offsetX, y, textureKey);
            const baseScale = random(0.45, 0.85);
            const facingDirection = random(0, 1) < 0.5 ? -1 : 1;
            const depth = layerDepth + 0.001 + i * 0.0001;
            const travelDistance = random(140, 400);
            const verticalDrift = random(6, 50);
            const duration = between(5000, 9000);
            const delay = between(0, 3000);

            const setFacing = direction => {
                const clampedDirection = direction < 0 ? -1 : 1;
                bird.setScale(baseScale * clampedDirection, baseScale * 0.9);
            };

            setFacing(facingDirection);

            bird.setScrollFactor(0);
            bird.setDepth(depth);
            bird.setAlpha(random(0.65, 0.95));

            this.outsideBackgroundContainer.add(bird);

            const tween = scene.tweens.add({
                targets: bird,
                x: bird.x + travelDistance * facingDirection,
                y: bird.y + verticalDrift,
                duration,
                yoyo: true,
                repeat: -1,
                delay,
                ease: 'Sine.easeInOut',
                onYoyo: () => setFacing(-facingDirection),
                onRepeat: () => setFacing(facingDirection)
            });

            bird.once('destroy', () => {
                if (tween && typeof tween.remove === 'function') {
                    tween.remove();
                }
            });

            this.outsideBackgroundLayers.push({
                sprite: bird,
                baseY: bird.y,
                scrollFactor: Math.max(0.04, scrollFactor * 0.15),
                tween
            });
        }
    }

    createOutsideBats({ baseX, coverageHeight, tileWidth, scrollFactor, layerDepth }) {
        const scene = this.scene;
        if (!scene || !this.outsideBackgroundContainer) {
            return;
        }

        const textureKey = ensureBatTexture(scene);
        if (!textureKey) {
            return;
        }

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const random = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.FloatBetween === 'function'
            ? Phaser.Math.FloatBetween
            : (min, max) => min + Math.random() * (max - min);
        const between = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function'
            ? Phaser.Math.Between
            : (min, max) => Math.floor(min + Math.random() * (max - min + 1));

        const safeCoverage = Number.isFinite(coverageHeight) && coverageHeight > 0
            ? coverageHeight
            : ((scene.scale && scene.scale.height) || 0);
        const width = Number.isFinite(tileWidth) && tileWidth > 0
            ? tileWidth
            : (scene.scale && scene.scale.width) || 0;
        const halfWidth = width / 2;
        const minY = CONSTANTS.HEADER_HEIGHT * 4;
        const maxY = safeCoverage * 0.3;
        const verticalJitter = safeCoverage * 0.06;
        const batCount = 18;
        const horizontalRange = halfWidth * 0.6;

        for (let i = 0; i < batCount; i += 1) {
            const offsetX = random(-halfWidth, halfWidth);
            const y = clamp(random(minY, maxY), minY, maxY);
            const bat = scene.add.sprite(baseX + offsetX, y, textureKey);
            const minScale = 0.40;
            const maxScale = 0.70;
            const baseScale = 0.55;
            const facingDirection = random(0, 1) < 0.5 ? -1 : 1;
            const depth = layerDepth + 0.001 + i * 0.0001;
            let isDestroyed = false;
            const tweenHolder = {
                flight: null,
                flutter: null,
                remove() {
                    isDestroyed = true;
                    if (this.flight && typeof this.flight.remove === 'function') {
                        this.flight.remove();
                    }
                    if (this.flutter && typeof this.flutter.remove === 'function') {
                        this.flutter.remove();
                    }
                    this.flight = null;
                    this.flutter = null;
                }
            };

            const flightState = { x: bat.x, y: bat.y, angle: 0 };
            const flutterState = { offset: 0 };

            const updateSpriteTransform = () => {
                if (isDestroyed) {
                    return;
                }

                bat.setPosition(flightState.x, flightState.y + flutterState.offset);
                bat.setAngle(flightState.angle);
            };

            const batScale = random(minScale, maxScale);

            const setFacing = direction => {
                const clampedDirection = direction < 0 ? -1 : 1;
                bat.setScale(batScale * clampedDirection, batScale * 0.8);
            };

            const flapTimeScale = random(0.92, 1.08);
            const canPlayAnimation = bat.anims
                && typeof bat.anims.play === 'function'
                && scene.anims
                && typeof scene.anims.exists === 'function'
                && scene.anims.exists(BAT_ANIMATION_KEY);

            if (canPlayAnimation) {
                bat.anims.play(BAT_ANIMATION_KEY);
                bat.anims.timeScale = flapTimeScale;
            }

            const flutterAmplitude = random(4, 7) * baseScale;
            const flutterDuration = Math.max(140, Math.round(1000 / BAT_FLAP_FRAME_RATE));
            flutterState.offset = random(-flutterAmplitude, flutterAmplitude);

            if (scene.tweens && typeof scene.tweens.add === 'function') {
                tweenHolder.flutter = scene.tweens.add({
                    targets: flutterState,
                    offset: {
                        from: -flutterAmplitude,
                        to: flutterAmplitude
                    },
                    duration: flutterDuration,
                    ease: 'Sine.easeInOut',
                    yoyo: true,
                    repeat: -1,
                    onUpdate: updateSpriteTransform
                });

                if (tweenHolder.flutter) {
                    tweenHolder.flutter.timeScale = flapTimeScale;
                }
            }

            flightState.angle = random(-10, 10);
            updateSpriteTransform();

            const startErraticFlight = () => {
                if (isDestroyed || !scene || !scene.tweens) {
                    return;
                }

                const targetX = baseX + random(-horizontalRange, horizontalRange);
                const baseTargetY = random(minY, maxY);
                const targetY = clamp(
                    baseTargetY + random(-verticalJitter, verticalJitter) * 0.25,
                    minY,
                    maxY
                );
                const newDirection = targetX >= flightState.x ? 1 : -1;
                const angleTarget = random(-14, 14);
                const deltaX = Math.abs(targetX - flightState.x);
                const deltaY = Math.abs(targetY - flightState.y);
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const maxDistance = Math.max(1, horizontalRange * 1.2);
                const distanceRatio = clamp(distance / maxDistance, 0, 1);
                const minDuration = 4000;
                const maxDuration = 9000;
                const duration = minDuration + (maxDuration - minDuration) * distanceRatio;
                const hold = between(100, 2200);
                const repeatDelay = between(400, 2000);

                setFacing(newDirection);

                const tween = scene.tweens.add({
                    targets: flightState,
                    x: targetX,
                    y: targetY,
                    angle: angleTarget,
                    duration,
                    ease: 'Sine.easeInOut',
                    hold,
                    yoyo: true,
                    repeat: 0,
                    repeatDelay,
                    onUpdate: updateSpriteTransform,
                    onYoyo: () => {
                        setFacing(-newDirection);
                        flightState.angle = random(-8, 8);
                        updateSpriteTransform();
                    },
                    onComplete: () => {
                        tweenHolder.flight = null;
                        if (!isDestroyed) {
                            startErraticFlight();
                        }
                    }
                });

                tween.timeScale = random(0.86, 0.97);
                tweenHolder.flight = tween;
            };

            setFacing(facingDirection);
            bat.setScrollFactor(0);
            bat.setDepth(depth);

            bat.setAlpha(batScale + 0.1);

            this.outsideBackgroundContainer.add(bat);

            bat.once('destroy', () => {
                isDestroyed = true;
                tweenHolder.remove();
            });

            startErraticFlight();

            this.outsideBackgroundLayers.push({
                sprite: bat,
                baseY: bat.y,
                scrollFactor: Math.max(0.06, scrollFactor * 0.2),
                tween: tweenHolder
            });
        }
    }

    createOutsideSparkles({ baseX, coverageHeight, tileWidth, scrollFactor, layerDepth }) {
        const scene = this.scene;
        if (!scene || !this.outsideBackgroundContainer) {
            return;
        }

        const textureKey = ensureSparkleTexture(scene);
        if (!textureKey) {
            return;
        }

        const clamp = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Clamp === 'function'
            ? Phaser.Math.Clamp
            : (value, min, max) => Math.min(Math.max(value, min), max);
        const random = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.FloatBetween === 'function'
            ? Phaser.Math.FloatBetween
            : (min, max) => min + Math.random() * (max - min);
        const between = typeof Phaser !== 'undefined' && Phaser.Math && typeof Phaser.Math.Between === 'function'
            ? Phaser.Math.Between
            : (min, max) => Math.floor(min + Math.random() * (max - min + 1));

        const safeCoverage = Number.isFinite(coverageHeight) && coverageHeight > 0
            ? coverageHeight
            : ((scene.scale && scene.scale.height) || 0);
        const width = Number.isFinite(tileWidth) && tileWidth > 0
            ? tileWidth
            : (scene.scale && scene.scale.width) || 0;
        const halfWidth = width / 2;
        const minY = CONSTANTS.HEADER_HEIGHT;
        const maxY = safeCoverage * 0.3;
        const sparkleCount = 50;

        for (let i = 0; i < sparkleCount; i += 1) {
            const offsetX = random(-halfWidth, halfWidth);
            const y = clamp(random(minY, maxY), minY, maxY);
            const sparkle = scene.add.image(baseX + offsetX, y, textureKey);
            const baseScale = random(0.2, 0.5);
            sparkle.setScale(baseScale);
            sparkle.setScrollFactor(0);
            sparkle.setDepth(layerDepth + 0.001);
            sparkle.setAlpha(random(0.2, 0.8));
            if (scene.sys && scene.sys.game && Phaser.BlendModes) {
                sparkle.setBlendMode(Phaser.BlendModes.ADD);
            }

            this.outsideBackgroundContainer.add(sparkle);

            const tween = scene.tweens.add({
                targets: sparkle,
                alpha: { from: random(0.1, 0.4), to: 1 },
                scale: { from: baseScale * 0.75, to: baseScale * 1.1 },
                duration: between(900, 1600),
                yoyo: true,
                repeat: -1,
                delay: between(0, 1200),
                ease: 'Sine.easeInOut'
            });

            sparkle.once('destroy', () => {
                if (tween && typeof tween.remove === 'function') {
                    tween.remove();
                }
            });

            this.outsideBackgroundLayers.push({
                sprite: sparkle,
                baseY: sparkle.y,
                scrollFactor: Math.max(0.04, scrollFactor * 0.15),
                tween
            });
        }
    }

    getNodePosition(node) {
        const columnIndex = typeof node.column === 'number' ? node.column : 1;
        const offsetFromCenter = (columnIndex - 1) * LAYOUT.columnSpacing;
        const centerX = this.scene.scale.width / 2;
        const x = centerX + offsetFromCenter;
        
        // Handle negative rows (START node at row -1)
        const rowOffset = (node.row || 0) + 1; // Shift everything down by 1 to accommodate START
        const y = LAYOUT.baseY + rowOffset * LAYOUT.rowSpacing;
        
        return { x, y };
    }

    createNodes() {
        const nodes = this.pathManager.getNodes();
        let minY = Number.POSITIVE_INFINITY;
        let maxY = Number.NEGATIVE_INFINITY;
        const torchAnimationReady = this.ensureWallTorchAnimation();

        nodes.forEach(node => {
            const { x, y } = this.getNodePosition(node);
            const container = this.scene.add.container(x, y);
            const isBoss = node.isBoss;
            const typeKey = isBoss ? 'boss' : node.type;
            const color = COLORS[typeKey] || COLORS.whiteStroke;
            const icon = isBoss ? ICONS.boss : ICONS[node.type];

            const torchSprite = torchAnimationReady
                ? this.scene.add.sprite(0, 32, WALL_TORCH_TEXTURE_KEY, 0)
                    .setScale(GENERAL_TEXTURE_SCALE, GENERAL_TEXTURE_SCALE)
                    .setOrigin(0.5, 0.5)
                    .setDepth(-1)
                : null;

            if (torchSprite && typeof torchSprite.play === 'function') {
                torchSprite.play(WALL_TORCH_ANIMATION_KEY);
                const randomProgress = typeof Phaser !== 'undefined'
                    && Phaser.Math
                    && typeof Phaser.Math.FloatBetween === 'function'
                        ? Phaser.Math.FloatBetween(0, 1)
                        : Math.random();
                if (torchSprite.anims && typeof torchSprite.anims.setProgress === 'function') {
                    torchSprite.anims.setProgress(randomProgress);
                }
            }

            const cube = this.scene.add.rectangle(0, 0, 56, 56, color, 1)
                .setStrokeStyle(3, COLORS.whiteStroke, 0.9)
                .setInteractive({ useHandCursor: true });

            // hover handlers: preview player movement when hovering selectable nodes
            cube.on('pointerover', () => {
                if (!this.isNodeSelectable(node.id)) {
                    return;
                }
                cube.setStrokeStyle(4, COLORS.whiteStroke, 1);
                this.playerHoveredNodeId = node.id;
                this.handleNodeHover(node.id);
            });

            cube.on('pointerout', () => {
                if (this.playerHoveredNodeId === node.id) {
                    this.playerHoveredNodeId = null;
                }
                this.updateState();
                this.handleNodeHoverEnd(node.id);
            });

            const iconText = this.scene.add.text(0, 0, icon || '?', {
                fontSize: '32px',
                color: '#000000',
                padding: CONSTANTS.EMOJI_TEXT_PADDING,
                forceNormalText: true
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(0, 50, node.label || '', {
                fontSize: '18px',
                color: '#ffffff'
            }).setOrigin(0.5);

            if (torchSprite) {
                container.add(torchSprite);
            }
            container.add([cube, iconText, labelText]);
            this.container.add(container);

            cube.on('pointerup', pointer => {
                if (!this.isNodeSelectable(node.id)) {
                    return;
                }

                const distance = Phaser.Math.Distance.Between(
                    pointer.downX,
                    pointer.downY,
                    pointer.upX,
                    pointer.upY
                );

                if (distance > DRAG_THRESHOLD) {
                    return;
                }

                // Queue movement if not already moving
                if (!this.isPlayerMoving()) {
                    this.queuePlayerMovementTo(node.id);
                }

                // Play click sound
                try {
                    if (this.scene && this.scene.sound && typeof this.scene.sound.play === 'function') {
                        this.scene.sound.play('tick', { volume: 0.4 });
                    }
                } catch (e) {
                    // ignore sound errors
                }

                // Lock in: disable all node interactivity so pointer events can't change the destination
                this._lockNodeInteractivity();

                // Register the pending arrival target
                this._pendingArrivalNodeId = node.id;

                // Clear any previous arrival checker
                if (this.scene && this.scene.events && this._arrivalTickFn) {
                    this.scene.events.off('update', this._arrivalTickFn, this);
                    this._arrivalTickFn = null;
                }

                // Arrival checker: polls until player reaches the target node
                const arrivalChecker = () => {
                    if (!this.scene) {
                        return;
                    }

                    const pendingId = this._pendingArrivalNodeId;
                    if (!pendingId) {
                        return;
                    }

                    const currentPos = this.getPlayerPosition();
                    const targetNode = this.pathManager ? this.pathManager.getNode(pendingId) : null;
                    if (!targetNode) {
                        this._pendingArrivalNodeId = null;
                        this._unlockNodeInteractivity();
                        if (this._arrivalTickFn) {
                            this.scene.events.off('update', this._arrivalTickFn, this);
                            this._arrivalTickFn = null;
                        }
                        return;
                    }

                    const targetPos = this.getNodePosition(targetNode);
                    const arrived = Phaser.Math.Distance.Between(currentPos.x, currentPos.y, targetPos.x, targetPos.y) <= 1.0;

                    if (!arrived) {
                        return;
                    }

                    // Arrived: unlock and fire the node action
                    this._pendingArrivalNodeId = null;
                    this._unlockNodeInteractivity();
                    if (this._arrivalTickFn) {
                        this.scene.events.off('update', this._arrivalTickFn, this);
                        this._arrivalTickFn = null;
                    }

                    if (typeof this.onPlayerArrive === 'function') {
                        try {
                            this.onPlayerArrive(targetNode);
                        } catch (err) {
                            console.error('onPlayerArrive handler error', err);
                        }
                    } else if (typeof this.onSelect === 'function') {
                        try {
                            this.onSelect(targetNode);
                        } catch (err) {
                            console.error('onSelect handler error', err);
                        }
                    }
                };

                if (this.scene && this.scene.events) {
                    this._arrivalTickFn = arrivalChecker;
                    this.scene.events.on('update', arrivalChecker, this);
                }
            });

            this.nodeRefs.set(node.id, {
                node,
                container,
                cube,
                torchSprite,
                iconText,
                labelText,
                isBoss
            });

            const top = y - 40;
            const bottom = y + 40 + 24;
            minY = Math.min(minY, top);
            maxY = Math.max(maxY, bottom);
        });

        if (nodes.length > 0) {
            this.minContentY = minY;
            this.maxContentY = maxY;
        } else {
            this.minContentY = 0;
            this.maxContentY = 0;
        }
    }

    createPlayerToken() {
        if (!this.scene || !this.container) {
            return;
        }

        this.destroyPlayerToken();

        const anchorInfo = this.calculateAnchorInfoFromState();
        const anchorPosition = anchorInfo.anchorPosition || this.getFallbackAnchorPosition();
        const startX = Math.round(anchorPosition.x);
        const startY = Math.round(anchorPosition.y);

        this.playerAnchorNodeId = anchorInfo.anchorNode ? anchorInfo.anchorNode.id : null;
        this.playerAnchorPosition = { ...anchorPosition };

        const container = this.scene.add.container(startX, startY);
        container.setDepth(PLAYER_DEPTH);

        const dieBody = this.scene.add.rectangle(0, 0, 36, 36, 0xccccb5, 1);
        dieBody.setStrokeStyle(3, 0x000000, 2);

        const faceText = this.scene.add.text(0, 2, ':)', {
            fontSize: '32px',
            color: '#111111',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        faceText.setAngle(90);

        const limbColor = 0xccccb5;
        const limbAlpha = 1;
        const leftArm = this.scene.add.rectangle(-18, -6, 16, 6, limbColor, limbAlpha);
        const rightArm = this.scene.add.rectangle(18, -6, 16, 6, limbColor, limbAlpha);
        const leftLeg = this.scene.add.rectangle(-12, 18, 7, 16, limbColor, limbAlpha);
        const rightLeg = this.scene.add.rectangle(12, 18, 7, 16, limbColor, limbAlpha);
        leftArm.setStrokeStyle(3, 0x000000, 2);
        rightArm.setStrokeStyle(3, 0x000000, 2);
        leftLeg.setStrokeStyle(3, 0x000000, 2);
        rightLeg.setStrokeStyle(3, 0x000000, 2);


        leftArm.setOrigin(0.85, 0.5);
        rightArm.setOrigin(0.15, 0.5);
        leftLeg.setOrigin(0.5, 0);
        rightLeg.setOrigin(0.5, 0);

        leftArm.setAngle(-10);
        rightArm.setAngle(10);
        leftLeg.setAngle(2);
        rightLeg.setAngle(-2);

        container.add([leftLeg, rightLeg, leftArm, rightArm, dieBody, faceText]);
        this.container.add(container);
        if (typeof this.container.bringToTop === 'function') {
            this.container.bringToTop(container);
        }

        this.playerContainer = container;
        this.playerDieText = faceText;

        this.playerLimbTweens = [];
        const limbs = [leftArm, rightArm, leftLeg, rightLeg];
        limbs.forEach((limb, index) => {
            if (!limb || !this.scene || !this.scene.tweens) {
                return;
            }
            const direction = index % 2 === 0 ? 1 : -1;
            const tween = this.scene.tweens.add({
                targets: limb,
                angle: limb.angle + direction * PLAYER_WIGGLE_ANGLE,
                duration: PLAYER_WIGGLE_DURATION,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1,
                delay: index * 90
            });
            this.playerLimbTweens.push(tween);
        });

        this.playerHoveredNodeId = null;
        this.playerActiveRoute = {
            anchorNodeId: this.playerAnchorNodeId,
            targetNodeId: null,
            totalDistance: 0
        };

        container.setVisible(false);
    }

    calculateAnchorInfoFromState() {
        const currentNode = this.getCurrentPlayerNode();
        if (currentNode) {
            return {
                anchorNode: currentNode,
                anchorPosition: this.getNodePosition(currentNode)
            };
        }

        if (this.playerAnchorNodeId && this.pathManager) {
            const anchorNode = this.pathManager.getNode(this.playerAnchorNodeId);
            if (anchorNode) {
                return {
                    anchorNode,
                    anchorPosition: this.getNodePosition(anchorNode)
                };
            }
        }

        return {
            anchorNode: null,
            anchorPosition: this.playerAnchorPosition || this.getFallbackAnchorPosition()
        };
    }

    getCurrentPlayerNode() {
        if (!this.pathManager) {
            return null;
        }

        const getCurrentId = typeof this.pathManager.getCurrentNodeId === 'function'
            ? this.pathManager.getCurrentNodeId.bind(this.pathManager)
            : null;
        const currentId = getCurrentId ? getCurrentId() : null;
        if (currentId) {
            const node = this.pathManager.getNode(currentId);
            if (node) {
                return node;
            }
        }

        const nodes = this.pathManager.getNodes();
        const completedNodes = Array.isArray(nodes)
            ? nodes.filter(node => node && typeof node.id === 'string'
                && typeof this.pathManager.isNodeCompleted === 'function'
                && this.pathManager.isNodeCompleted(node.id))
            : [];
        return this.getDeepestNode(completedNodes);
    }

    getDeepestNode(nodes) {
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return null;
        }

        return nodes.reduce((best, node) => {
            if (!node) {
                return best;
            }

            if (!best) {
                return node;
            }

            const bestRow = Number.isFinite(best.row) ? best.row : -Infinity;
            const nodeRow = Number.isFinite(node.row) ? node.row : -Infinity;
            if (nodeRow > bestRow) {
                return node;
            }
            if (nodeRow === bestRow) {
                const bestCol = Number.isFinite(best.column) ? best.column : 0;
                const nodeCol = Number.isFinite(node.column) ? node.column : 0;
                return nodeCol < bestCol ? node : best;
            }
            return best;
        }, null);
    }

    getFallbackAnchorPosition() {
        const centerX = this.scene && this.scene.scale ? this.scene.scale.width / 2 : 0;
        const nodes = this.pathManager ? this.pathManager.getNodes() : [];
        if (!Array.isArray(nodes) || nodes.length === 0) {
            return { x: centerX, y: LAYOUT.baseY };
        }

        let minRow = Number.POSITIVE_INFINITY;
        nodes.forEach(node => {
            if (!node) {
                return;
            }
            const row = Number.isFinite(node.row) ? node.row : 0;
            if (row < minRow) {
                minRow = row;
            }
        });

        const firstRowNodes = nodes.filter(node => Number.isFinite(node?.row) && node.row === minRow);
        if (firstRowNodes.length === 0) {
            return { x: centerX, y: LAYOUT.baseY };
        }

        let sumX = 0;
        let sampleY = 0;
        firstRowNodes.forEach(node => {
            const pos = this.getNodePosition(node);
            sumX += pos.x;
            sampleY = pos.y;
        });

        const averageX = sumX / firstRowNodes.length;
        // const offsetY = LAYOUT.rowSpacing * 0.5;
        return {
            x: averageX,
            y: sampleY,
        };
    }

    destroyPlayerToken() {
        if (Array.isArray(this.playerLimbTweens) && this.scene && this.scene.tweens) {
            this.playerLimbTweens.forEach(tween => {
                if (!tween) {
                    return;
                }
                if (typeof tween.stop === 'function') {
                    tween.stop();
                }
                this.scene.tweens.remove(tween);
            });
        }
        this.playerLimbTweens = [];

        if (this.playerContainer) {
            this.playerContainer.destroy(true);
            this.playerContainer = null;
        }

        this.playerDieText = null;
        this.playerAnchorNodeId = null;
        this.playerAnchorPosition = null;
        this.playerActiveRoute = null;
    }

    getPlayerPosition() {
        if (!this.playerContainer) {
            return { x: 0, y: 0 };
        }
        return { x: this.playerContainer.x, y: this.playerContainer.y };
    }

    setPlayerPosition(position) {
        if (!this.playerContainer || !position) {
            return;
        }
        this.playerContainer.setPosition(Math.round(position.x), Math.round(position.y));
    }

    isPlayerMoving() {
        return !!(this.playerMovementTween || (Array.isArray(this.playerPendingSegments) && this.playerPendingSegments.length > 0));
    }

    stopPlayerMovement() {
        if (this.playerMovementTween) {
            this.playerMovementTween.stop();
            if (this.scene && this.scene.tweens) {
                this.scene.tweens.remove(this.playerMovementTween);
            }
            this.playerMovementTween = null;
        }

        if (Array.isArray(this.playerPendingSegments)) {
            this.playerPendingSegments.length = 0;
        } else {
            this.playerPendingSegments = [];
        }
    }

    playPlayerSegments(segments = []) {
        if (!Array.isArray(segments) || segments.length === 0 || !this.scene || !this.playerContainer) {
            this.stopPlayerMovement();
            return;
        }

        const filtered = segments.filter(segment => segment && segment.to && Number.isFinite(segment.duration) && segment.duration > 0);
        if (filtered.length === 0) {
            this.stopPlayerMovement();
            return;
        }

        this.stopPlayerMovement(false);
        this.playerPendingSegments = filtered.slice();

        const advance = () => {
            if (!Array.isArray(this.playerPendingSegments) || this.playerPendingSegments.length === 0) {
                this.playerMovementTween = null;
                this.playerPendingSegments = [];
                return;
            }

            const segment = this.playerPendingSegments.shift();
            if (!segment || !segment.to) {
                advance();
                return;
            }

            this.playerMovementTween = this.scene.tweens.add({
                targets: this.playerContainer,
                x: segment.to.x,
                y: segment.to.y,
                duration: Math.max(0, Math.round(segment.duration)),
                ease: 'Linear',
                onComplete: () => {
                    this.playerMovementTween = null;
                    advance();
                }
            });
        };

        advance();
    }

    getAnchorNodeForNode(nodeId) {
        if (!this.pathManager || !nodeId) {
            return this.getCurrentPlayerNode();
        }

        const nodes = this.pathManager.getNodes();
        if (!Array.isArray(nodes)) {
            return this.getCurrentPlayerNode();
        }

        const parents = nodes.filter(candidate => candidate
            && candidate.id !== nodeId
            && Array.isArray(candidate.connections)
            && candidate.connections.includes(nodeId));
        if (parents.length === 0) {
            return this.getCurrentPlayerNode();
        }

        const completedParents = parents.filter(parent => typeof parent.id === 'string'
            && typeof this.pathManager.isNodeCompleted === 'function'
            && this.pathManager.isNodeCompleted(parent.id));
        if (completedParents.length > 0) {
            return this.getDeepestNode(completedParents);
        }

        const currentId = typeof this.pathManager.getCurrentNodeId === 'function'
            ? this.pathManager.getCurrentNodeId()
            : null;
        if (currentId) {
            const currentParent = parents.find(parent => parent.id === currentId);
            if (currentParent) {
                return currentParent;
            }
        }

        return this.getDeepestNode(parents);
    }

    getAnchorInfoForNode(nodeId) {
        const anchorNode = this.getAnchorNodeForNode(nodeId);
        const anchorPosition = anchorNode
            ? this.getNodePosition(anchorNode)
            : this.getFallbackAnchorPosition();
        return { anchorNode, anchorPosition };
    }

    queuePlayerMovementTo(nodeId) {
        if (!this.playerContainer || !this.pathManager || !nodeId) {
            return;
        }

        const node = this.pathManager.getNode(nodeId);
        if (!node) {
            return;
        }

        const targetPosition = this.getNodePosition(node);
        const anchorInfo = this.getAnchorInfoForNode(nodeId);
        const anchorPosition = anchorInfo.anchorPosition || this.getFallbackAnchorPosition();
        const anchorNodeId = anchorInfo.anchorNode ? anchorInfo.anchorNode.id : null;
        const currentPosition = this.getPlayerPosition();
        const previousRoute = this.playerActiveRoute;
        const distanceToAnchor = Phaser.Math.Distance.Between(currentPosition.x, currentPosition.y, anchorPosition.x, anchorPosition.y);
        const anchorToTargetDistance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, targetPosition.x, targetPosition.y);

        const segments = [];
        if (distanceToAnchor > 0.5) {
            let baseDistance = anchorToTargetDistance;
            if (previousRoute && previousRoute.anchorNodeId === anchorNodeId && Number.isFinite(previousRoute.totalDistance) && previousRoute.totalDistance > 0) {
                baseDistance = previousRoute.totalDistance;
            }
            if (!Number.isFinite(baseDistance) || baseDistance <= 0) {
                baseDistance = distanceToAnchor;
            }
            const durationToAnchor = Math.max(1, Math.round(distanceToAnchor / PLAYER_MOVE_SPEED));
            segments.push({ to: { x: anchorPosition.x, y: anchorPosition.y }, duration: durationToAnchor });
        }

        const distance = Phaser.Math.Distance.Between(anchorPosition.x, anchorPosition.y, targetPosition.x, targetPosition.y);
        const duration = Math.max(1, Math.round(distance / PLAYER_MOVE_SPEED));
        segments.push({ to: { x: targetPosition.x, y: targetPosition.y }, duration });
        
        this.playerAnchorNodeId = anchorNodeId;
        this.playerAnchorPosition = { ...anchorPosition };
        this.playerHoveredNodeId = nodeId;
        this.playerActiveRoute = {
            anchorNodeId,
            targetNodeId: nodeId,
            totalDistance: anchorToTargetDistance
        };

        this.playPlayerSegments(segments);
        if (this.playerContainer) {
            this.playerContainer.setVisible(true);
            if (this.container && typeof this.container.bringToTop === 'function') {
                this.container.bringToTop(this.playerContainer);
            }
        }
    }

    movePlayerToAnchor() {
        const info = this.calculateAnchorInfoFromState();
        const anchorPosition = info.anchorPosition || this.getFallbackAnchorPosition();
        const anchorNodeId = info.anchorNode ? info.anchorNode.id : this.playerAnchorNodeId;
        const currentPosition = this.getPlayerPosition();
        const distanceToAnchor = Phaser.Math.Distance.Between(currentPosition.x, currentPosition.y, anchorPosition.x, anchorPosition.y);

        if (distanceToAnchor <= 0.5) {
            this.stopPlayerMovement();
            this.setPlayerPosition(anchorPosition);
            this.playerAnchorNodeId = anchorNodeId || null;
            this.playerAnchorPosition = { ...anchorPosition };
            this.playerActiveRoute = {
                anchorNodeId: anchorNodeId || null,
                targetNodeId: null,
                totalDistance: 0
            };
            return;
        }

        let baseDistance = distanceToAnchor;
        if (this.playerActiveRoute && this.playerActiveRoute.anchorNodeId === anchorNodeId && Number.isFinite(this.playerActiveRoute.totalDistance) && this.playerActiveRoute.totalDistance > 0) {
            baseDistance = this.playerActiveRoute.totalDistance;
        }
        const duration = Math.max(1, Math.round(distanceToAnchor / PLAYER_MOVE_SPEED));

        this.playerAnchorNodeId = anchorNodeId || null;
        this.playerAnchorPosition = { ...anchorPosition };
        this.playerActiveRoute = {
            anchorNodeId: anchorNodeId || null,
            targetNodeId: null,
            totalDistance: baseDistance
        };

        this.playPlayerSegments([{ to: { x: anchorPosition.x, y: anchorPosition.y }, duration }]);
    }

    handleNodeHover(nodeId) {
        if (!this.isActive || !nodeId || !this.playerContainer) {
            return;
        }
        // If a node has already been clicked and we're waiting for arrival, ignore other hovers.
        // Allow hovering the same node but prevent changing hovered node to a different one.
        if (this._pendingArrivalNodeId) {
            if (this._pendingArrivalNodeId === nodeId) {
                this.playerHoveredNodeId = nodeId;
            }
            return;
        }

        if (this.playerHoveredNodeId === nodeId) {
            return;
        }

        // If player is currently moving, do not change their movement on hover/click.
        // This prevents pointerover/pointerup during travel from restarting or altering the token's route.
        if (this.isPlayerMoving()) {
            // still update hovered id so UI can reflect hover state, but don't queue movement
            this.playerHoveredNodeId = nodeId;
            return;
        }

        this.queuePlayerMovementTo(nodeId);
    }

    handleNodeHoverEnd(nodeId) {
        if (!nodeId || this.playerHoveredNodeId !== nodeId) {
            return;
        }

        this.playerHoveredNodeId = null;
        this.movePlayerToAnchor();
    }

    updatePlayerAnchorFromState() {
        if (!this.playerContainer) {
            return;
        }

        const info = this.calculateAnchorInfoFromState();
        this.playerAnchorNodeId = info.anchorNode ? info.anchorNode.id : null;
        this.playerAnchorPosition = info.anchorPosition ? { ...info.anchorPosition } : null;

        if (!this.isPlayerMoving() && !this.playerHoveredNodeId && info.anchorPosition) {
            this.setPlayerPosition(info.anchorPosition);
        }
    }

    drawConnections() {
        this.connectionGraphics.clear();

        this.clearConnectionSprites();

        const textureKey = this.connectionTextureKey || 'path_ladder';
        const ladderTexture = this.scene.textures && this.scene.textures.get(textureKey);
        const sourceImage = ladderTexture && ladderTexture.getSourceImage ? ladderTexture.getSourceImage() : null;

        if (!sourceImage) {
            // Fallback: draw simple lines if the texture is unavailable.
            this.connectionGraphics.lineStyle(3, 0xffffff, 0.12);

            const nodes = this.pathManager.getNodes();
            nodes.forEach(node => {
                const fromPos = this.getNodePosition(node);
                (node.connections || []).forEach(connectionId => {
                    const target = this.pathManager.getNode(connectionId);
                    if (!target) {
                        return;
                    }
                    const toPos = this.getNodePosition(target);
                    this.connectionGraphics.lineBetween(fromPos.x, fromPos.y, toPos.x, toPos.y);
                });
            });
            return;
        }

        const ladderHeight = Math.max(1, sourceImage.height || 1);
        const scaledLadderHeight = ladderHeight * PATH_TEXTURE_SCALE;
        const halfHeight = scaledLadderHeight / 2;
        const processed = new Set();
        const nodes = this.pathManager.getNodes();

        nodes.forEach(node => {
            const fromPos = this.getNodePosition(node);
            (node.connections || []).forEach(connectionId => {
                const target = this.pathManager.getNode(connectionId);
                if (!target) {
                    return;
                }

                const keyParts = [node.id, connectionId];
                if (keyParts.every(part => typeof part !== 'undefined')) {
                    keyParts.sort();
                    const key = keyParts.join('::');
                    if (processed.has(key)) {
                        return;
                    }
                    processed.add(key);
                }

                const toPos = this.getNodePosition(target);
                const dx = toPos.x - fromPos.x;
                const dy = toPos.y - fromPos.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance === 0) {
                    return;
                }

                const angle = Phaser.Math.Angle.Between(fromPos.x, fromPos.y, toPos.x, toPos.y) - Math.PI / 2;
                const step = scaledLadderHeight;
                const unitX = dx / distance;
                const unitY = dy / distance;

                const fromRow = Number.isFinite(node?.row) ? node.row : 0;
                const toRow = Number.isFinite(target?.row) ? target.row : 0;
                let downwardNodeId = null;

                if (toRow > fromRow && target?.id) {
                    downwardNodeId = target.id;
                } else if (fromRow > toRow && node?.id) {
                    downwardNodeId = node.id;
                }

                const addSegmentAtOffset = offset => {
                    const x = fromPos.x + unitX * offset;
                    const y = fromPos.y + unitY * offset;
                    const segment = this.scene.add.image(x, y, textureKey);
                    segment.setOrigin(0.5, 0.5);
                    segment.setDepth(PATH_DEPTHS.connections);
                    segment.setRotation(angle);
                    segment.setScale(PATH_TEXTURE_SCALE);
                    segment.setPosition(Math.round(segment.x), Math.round(segment.y));

                    this.connectionSpriteContainer.add(segment);
                    this.connectionSprites.push({
                        sprite: segment,
                        nodeAId: node?.id || null,
                        nodeBId: target?.id || null,
                        downwardNodeId
                    });
                };

                if (distance <= step) {
                    addSegmentAtOffset(distance / 2);
                    return;
                }

                const segmentCount = Math.max(1, Math.floor(distance / step));
                const remainder = distance - segmentCount * step;
                let offset = halfHeight + remainder / 2;

                for (let i = 0; i < segmentCount; i++) {
                    if (offset > distance - halfHeight) {
                        offset = distance - halfHeight;
                    }
                    addSegmentAtOffset(offset);
                    offset += step;
                }
            });
        });

        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const testingMode = this.isTestingModeActive();
        this.updateConnectionSpriteAlphas(availableIds, testingMode);
    }

    clearConnectionSprites() {
        if (!Array.isArray(this.connectionSprites)) {
            return;
        }

        this.connectionSprites.forEach(entry => {
            const sprite = entry && entry.sprite ? entry.sprite : entry;
            if (sprite && typeof sprite.destroy === 'function') {
                sprite.destroy();
            }
        });
        this.connectionSprites.length = 0;
    }

    isTestingModeActive() {
        return !!(this.scene && this.scene.testingModeEnabled);
    }

    isNodeSelectable(nodeId) {
        if (!nodeId) {
            return false;
        }

        if (this.isTestingModeActive()) {
            return this.nodeRefs.has(nodeId);
        }

        const availableIds = this.pathManager.getAvailableNodeIds();
        return availableIds.includes(nodeId);
    }

    updateState() {
        const availableIds = new Set(this.pathManager.getAvailableNodeIds());
        const testingMode = this.isTestingModeActive();

        this.nodeRefs.forEach(({ node, cube, iconText, labelText, torchSprite, isBoss }) => {
            const typeKey = isBoss ? 'boss' : node.type;
            const baseColor = COLORS[typeKey] || COLORS.whiteStroke;
            const isCompleted = this.pathManager.isNodeCompleted(node.id);
            const isAvailable = availableIds.has(node.id);

            let fillColor = baseColor;
            let strokeWidth = 4;
            let strokeAlpha = 1;
            let strokeColor = COLORS.blackStroke;
            let iconAlpha = 1;
            let labelAlpha = 1;
            let interactive = false;

            if (isCompleted) {
                fillColor = blendColor(baseColor, 0x1f2a30, 0.55);
                strokeWidth = 2;
                iconAlpha = 0.6;
                labelAlpha = 0.65;
                strokeColor = COLORS.whiteStroke;
                if (testingMode) {
                    interactive = true;
                    strokeWidth = 3;
                }
            } else if (isAvailable || testingMode) {
                interactive = true;
                if (testingMode && !isAvailable) {
                    strokeColor = COLORS.whiteStroke;
                }
            } else {
                fillColor = blendColor(baseColor, 0x90a4ae, 0.6);
                strokeWidth = 2;
                strokeAlpha = 0.5;
                iconAlpha = 0.8;
                labelAlpha = 0.8;
            }

            // If this node is currently hovered, ensure hover visuals override the computed style
            if (this.playerHoveredNodeId === node.id) {
                strokeColor = COLORS.whiteStroke;
                strokeWidth = Math.max(3, strokeWidth);
                strokeAlpha = 1;
            }

            cube.setFillStyle(fillColor, 1);
            cube.setAlpha(1);
            iconText.setAlpha(iconAlpha);
            labelText.setAlpha(labelAlpha);
            if (torchSprite && typeof torchSprite.setAlpha === 'function') {
                torchSprite.setAlpha(iconAlpha);
            }
            cube.setStrokeStyle(strokeWidth, strokeColor, strokeAlpha);

            if (interactive) {
                cube.setInteractive({ useHandCursor: true });
            } else {
                cube.disableInteractive();
            }
        });

        this.updateConnectionSpriteAlphas(availableIds, testingMode);
        this.updatePlayerAnchorFromState();
    }

    updateConnectionSpriteAlphas(availableIds, testingMode) {
        if (!Array.isArray(this.connectionSprites) || this.connectionSprites.length === 0) {
            return;
        }

        const availableSet = availableIds instanceof Set
            ? availableIds
            : new Set(Array.isArray(availableIds) ? availableIds : []);
        const isTesting = typeof testingMode === 'boolean'
            ? testingMode
            : this.isTestingModeActive();
        const currentNodeId = typeof this.pathManager?.getCurrentNodeId === 'function'
            ? this.pathManager.getCurrentNodeId()
            : null;
        const isNodeCompletedFn = typeof this.pathManager?.isNodeCompleted === 'function'
            ? nodeId => this.pathManager.isNodeCompleted(nodeId)
            : () => false;

        this.connectionSprites.forEach(entry => {
            if (!entry || !entry.sprite || typeof entry.sprite.setAlpha !== 'function') {
                return;
            }

            const { sprite, downwardNodeId } = entry;

            if (!downwardNodeId) {
                sprite.setAlpha(1);
                return;
            }

            const isSelectable = isTesting
                ? this.nodeRefs.has(downwardNodeId)
                : availableSet.has(downwardNodeId);
            const isCompleted = isNodeCompletedFn(downwardNodeId);
            const isCurrent = currentNodeId === downwardNodeId;

            if (isSelectable || isCompleted || isCurrent) {
                sprite.setAlpha(0.9);
            } else {
                sprite.setAlpha(0.3);
            }
        });
    }

    show() {
        this.isActive = true;
        this.updateScrollBounds();
        this.applyScroll();
        if (this.backgroundContainer) {
            this.backgroundContainer.setVisible(true);
        }
        if (this.wallContainer) {
            this.wallContainer.setVisible(true);
        }
        this.container.setVisible(true);
        this.connectionGraphics.setVisible(true);
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.setVisible(true);
        }
        if (this.playerContainer) {
            this.playerContainer.setVisible(true);
            this.playerContainer.setDepth(PLAYER_DEPTH);
            if (this.container && typeof this.container.bringToTop === 'function') {
                this.container.bringToTop(this.playerContainer);
            }
        }
        this.updatePlayerAnchorFromState();
    }

    hide() {
        this.isActive = false;
        this.isDragging = false;
        this.dragPointerId = null;
        if (this.backgroundContainer) {
            this.backgroundContainer.setVisible(false);
        }
        if (this.wallContainer) {
            this.wallContainer.setVisible(false);
        }
        this.container.setVisible(false);
        this.connectionGraphics.setVisible(false);
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.setVisible(false);
        }
        if (this.playerContainer) {
            this.playerContainer.setVisible(false);
        }
        this.stopPlayerMovement();
        this.playerHoveredNodeId = null;
    }

    setupInputHandlers() {
        if (!this.scene || !this.scene.input) {
            return;
        }

        this.scene.input.on('wheel', this.handleWheel, this);
        this.scene.input.on('pointerdown', this.handlePointerDown, this);
        this.scene.input.on('pointermove', this.handlePointerMove, this);
        this.scene.input.on('pointerup', this.handlePointerUp, this);
        this.scene.input.on('pointerupoutside', this.handlePointerUp, this);
    }

    // Disable interactivity on all node cubes to lock in the queued movement.
    // This prevents pointerover/pointerout events from changing the player's destination.
    _lockNodeInteractivity() {
        try {
            if (this.nodeRefs && typeof this.nodeRefs.forEach === 'function') {
                this.nodeRefs.forEach(ref => {
                    try {
                        const cube = ref && ref.cube;
                        if (cube && typeof cube.disableInteractive === 'function') {
                            cube.disableInteractive();
                        }
                    } catch (err) {
                        // ignore per-node errors
                    }
                });
            }
        } catch (e) {
            // ignore
        }
    }

    // Re-enable interactivity on selectable node cubes after arrival.
    // This allows hover preview movement to work again.
    _unlockNodeInteractivity() {
        try {
            if (this.nodeRefs && typeof this.nodeRefs.forEach === 'function') {
                this.nodeRefs.forEach(ref => {
                    try {
                        const cube = ref && ref.cube;
                        const node = ref && ref.node;
                        if (!cube || !node) {
                            return;
                        }
                        const id = node.id;
                        if (this.isNodeSelectable(id) && typeof cube.setInteractive === 'function') {
                            cube.setInteractive({ useHandCursor: true });
                        }
                    } catch (err) {
                        // ignore per-node errors
                    }
                });
            }
        } catch (e) {
            // ignore
        }
    }

    handleWheel(pointer, gameObjects, deltaX, deltaY) {
        if (!this.isActive) {
            return;
        }

        const scrollDeltaY = typeof deltaY === 'number' ? deltaY : 0;
        const delta = -scrollDeltaY * WHEEL_SCROLL_MULTIPLIER * SCROLL_INPUT_MULTIPLIER;
        this.setScrollY(this.scrollY + delta);
    }

    handlePointerDown(pointer) {
        if (!this.isActive || !pointer.isDown) {
            return;
        }

        if (pointer.pointerType === 'mouse' && !pointer.leftButtonDown()) {
            return;
        }

        this.isDragging = true;
        this.dragPointerId = pointer.id;
        this.dragStartY = pointer.y;
        this.scrollStartY = this.scrollY;
    }

    handlePointerMove(pointer) {
        if (!this.isActive || !this.isDragging || pointer.id !== this.dragPointerId) {
            return;
        }

        const deltaY = pointer.y - this.dragStartY;
        this.setScrollY(this.scrollStartY + deltaY * SCROLL_INPUT_MULTIPLIER);
    }

    handlePointerUp(pointer) {
        if (pointer && pointer.id !== this.dragPointerId) {
            return;
        }

        this.isDragging = false;
        this.dragPointerId = null;
    }

    setScrollY(offset) {
        const clamped = Phaser.Math.Clamp(offset, this.minScrollY, this.maxScrollY);
        this.scrollY = clamped;
        this.applyScroll();
    }

    applyScroll() {
        this.container.y = this.scrollY;
        this.connectionGraphics.y = this.scrollY;
        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.y = this.scrollY;
        }
        if (this.backgroundContainer) {
            this.backgroundContainer.y = this.scrollY;
        }
        if (this.wallContainer) {
            this.wallContainer.y = this.scrollY;
        }
        if (Array.isArray(this.outsideBackgroundLayers) && this.outsideBackgroundLayers.length > 0) {
            this.outsideBackgroundLayers.forEach(layer => {
                if (!layer || !layer.sprite) {
                    return;
                }

                const factor = Number.isFinite(layer.scrollFactor) ? layer.scrollFactor : 1;

                if (layer.isTileSprite && typeof layer.sprite.setTilePosition === 'function') {
                    const baseTileX = Number.isFinite(layer.baseTileX) ? layer.baseTileX : 0;
                    const baseTileY = Number.isFinite(layer.baseTileY) ? layer.baseTileY : 0;
                    const tileOffset = baseTileY - this.scrollY * factor;
                    layer.sprite.setTilePosition(baseTileX, tileOffset);
                    const baseY = Number.isFinite(layer.baseY) ? layer.baseY : layer.sprite.y;
                    layer.sprite.y = Math.round(baseY);
                    return;
                }

                const baseY = Number.isFinite(layer.baseY) ? layer.baseY : layer.sprite.y;
                const newY = baseY + this.scrollY * factor;
                layer.sprite.y = Math.round(newY);
            });
        }
    }

    updateScrollBounds() {
        const viewHeight = this.scene.scale.height;
        const contentTop = this.minContentY;
        const contentBottom = this.maxContentY;

        let min = viewHeight - BOTTOM_MARGIN - contentBottom;
        let max = TOP_MARGIN - contentTop;

        if (min > max) {
            const midpoint = (min + max) / 2;
            min = midpoint;
            max = midpoint;
        }

        this.minScrollY = min;
        this.maxScrollY = max;

        if (this.scrollY < this.minScrollY || this.scrollY > this.maxScrollY) {
            this.setScrollY(Phaser.Math.Clamp(this.scrollY, this.minScrollY, this.maxScrollY));
        } else {
            this.applyScroll();
        }
    }

    destroy() {
        if (this.isDestroyed) {
            return;
        }

        this.isDestroyed = true;
        this.hide();

        if (this.scene && this.scene.input) {
            this.scene.input.off('wheel', this.handleWheel, this);
            this.scene.input.off('pointerdown', this.handlePointerDown, this);
            this.scene.input.off('pointermove', this.handlePointerMove, this);
            this.scene.input.off('pointerup', this.handlePointerUp, this);
            this.scene.input.off('pointerupoutside', this.handlePointerUp, this);
        }

        if (this.scene && this.scene.events) {
            this.scene.events.off('shutdown', this.destroy, this);
            this.scene.events.off('destroy', this.destroy, this);
        }

        this.clearConnectionSprites();
        this.clearWallSprites();
        this.clearBackgroundSprite();
        this.clearOutsideBackgroundSprites();

        if (this.outsideBackgroundContainer) {
            this.outsideBackgroundContainer.destroy(true);
            this.outsideBackgroundContainer = null;
        }
        if (this.backgroundContainer) {
            this.backgroundContainer.destroy(true);
            this.backgroundContainer = null;
        }
        if (this.wallContainer) {
            this.wallContainer.destroy(true);
            this.wallContainer = null;
        }

        if (this.connectionSpriteContainer) {
            this.connectionSpriteContainer.destroy(true);
            this.connectionSpriteContainer = null;
        }

        if (this.connectionGraphics) {
            this.connectionGraphics.destroy();
            this.connectionGraphics = null;
        }

        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }

        this.stopPlayerMovement();
        this.destroyPlayerToken();

        this.nodeRefs.clear();
    }
}
