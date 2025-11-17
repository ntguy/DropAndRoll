import { CONSTANTS } from '../constants.js';

const HEADER_BUTTON_WIDTH = 52;
const HEADER_BUTTON_BASE_COLOR = 0x1c2833;
const HEADER_BUTTON_HOVER_COLOR = 0x243547;
const HEADER_BUTTON_PRESS_COLOR = 0x16202b;
const HEADER_BUTTON_ALPHA = 0.95;

function createHeaderButton(scene, {
    label,
    x,
    onClick,
    fontSize = '28px'
}) {

    const HEADER_BUTTON_HEIGHT = CONSTANTS.HEADER_HEIGHT - 2;
    const headerY = CONSTANTS.HEADER_HEIGHT / 2;

    const button = scene.add.text(x, headerY, label, {
        fontSize,
        color: '#ecf0f1',
        align: 'center',
        forceNormalText: true
    }).setOrigin(0.5, 0.5);
    button.setScrollFactor(0);

    const background = scene.add.rectangle(
        button.x,
        button.y,
        HEADER_BUTTON_WIDTH,
        HEADER_BUTTON_HEIGHT,
        HEADER_BUTTON_BASE_COLOR,
        HEADER_BUTTON_ALPHA
    ).setOrigin(0.5, 0.5);
    background.setStrokeStyle(1, 0x0b141d, 0.7);
    background.setScrollFactor(0);

    const syncPosition = () => {
        background.setPosition(button.x, button.y);
    };

    const syncSize = () => {
        background.setSize(HEADER_BUTTON_WIDTH, HEADER_BUTTON_HEIGHT);
        background.setDisplaySize(HEADER_BUTTON_WIDTH, HEADER_BUTTON_HEIGHT);
        button.setData('buttonWidth', HEADER_BUTTON_WIDTH);
        button.setData('buttonHeight', HEADER_BUTTON_HEIGHT);
    };

    const syncDepth = () => {
        const depth = typeof button.depth === 'number' ? button.depth : 0;
        background.setDepth(depth - 1);
    };

    const syncVisibility = () => {
        background.setVisible(button.visible);
    };

    const syncScrollFactor = () => {
        const xFactor = typeof button.scrollFactorX === 'number' ? button.scrollFactorX : 1;
        const yFactor = typeof button.scrollFactorY === 'number' ? button.scrollFactorY : 1;
        background.setScrollFactor(xFactor, yFactor);
    };

    const syncAll = () => {
        syncSize();
        syncPosition();
        syncDepth();
        syncVisibility();
        syncScrollFactor();
    };

    syncAll();

    const patchMethod = (methodName, after) => {
        if (typeof button[methodName] !== 'function') {
            return;
        }
        const original = button[methodName].bind(button);
        button[methodName] = function patchedMethod(...args) {
            const result = original(...args);
            after();
            return result;
        };
    };

    patchMethod('setText', syncAll);
    patchMethod('setFontSize', syncAll);
    patchMethod('setStyle', syncAll);
    patchMethod('setX', syncPosition);
    patchMethod('setY', syncPosition);
    patchMethod('setScrollFactor', syncScrollFactor);
    patchMethod('setDepth', syncDepth);
    patchMethod('setVisible', syncVisibility);

    const applyBaseColor = color => {
        background.setFillStyle(color, HEADER_BUTTON_ALPHA);
    };

    const handlePointerOver = () => applyBaseColor(HEADER_BUTTON_HOVER_COLOR);
    const handlePointerOut = () => applyBaseColor(HEADER_BUTTON_BASE_COLOR);
    const handlePointerDown = () => applyBaseColor(HEADER_BUTTON_PRESS_COLOR);
    const handlePointerUp = pointer => {
        applyBaseColor(HEADER_BUTTON_HOVER_COLOR);
        if (typeof onClick === 'function') {
            onClick(pointer);
        }
    };

    background.setInteractive({ useHandCursor: true });
    background.on('pointerover', handlePointerOver);
    background.on('pointerout', handlePointerOut);
    background.on('pointerdown', handlePointerDown);
    background.on('pointerup', handlePointerUp);
    background.on('pointerupoutside', handlePointerOut);

    button.once('destroy', () => {
        background.destroy();
    });

    button.setData('backgroundRect', background);
    button.setData('refreshHeaderButtonMetrics', syncAll);

    return button;
}

export function createHeaderUI(scene) {
    if (scene.headerContainer) {
        scene.headerContainer.destroy(true);
        scene.headerContainer = null;
    }

    const headerWidth = scene.scale.width;
    const headerHeight = CONSTANTS.HEADER_HEIGHT;
    const buttonSpacing = 8;

    const container = scene.add.container(0, 0);
    container.setDepth(100);
    container.setScrollFactor(0);

    const background = scene.add.rectangle(
        headerWidth / 2,
        headerHeight / 2,
        headerWidth,
        headerHeight,
        0x101820,
        0.96
    ).setOrigin(0.5)
        .setStrokeStyle(1, 0xffffff, 0.12);
    background.setScrollFactor(0);
    container.add(background);

    const goldText = scene.add.bitmapText(
        CONSTANTS.UI_MARGIN,
        headerHeight / 2,
        'boldPixels',
        '',
        32
    ).setOrigin(0, 0.5);
    goldText.setTint(0xf1c40f);
    goldText.setScrollFactor(0);
    container.add(goldText);

    const mapTitleText = scene.add.text(headerWidth / 2, headerHeight / 2, '', {
        fontSize: '20px',
        color: '#ecf0f1'
    }).setOrigin(0.5, 0.5);
    mapTitleText.setScrollFactor(0);
    container.add(mapTitleText);

    // Speedrun timer (hidden by default)
    // Positioned left of the header buttons with an extra left offset to avoid collisions
    const SPEEDRUN_TIMER_OFFSET = 300; // px from right edge
    const speedrunTimerText = scene.add.text(headerWidth - CONSTANTS.UI_MARGIN - SPEEDRUN_TIMER_OFFSET, headerHeight / 2, '', {
        fontSize: '20px',
        color: '#f1c40f'
    }).setOrigin(0.5, 0.5).setVisible(false);
    speedrunTimerText.setScrollFactor(0);
    container.add(speedrunTimerText);

    const menuButton = createHeaderButton(scene, {
        label: '☰',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        onClick: () => scene.toggleMenu(),
        fontSize: '32px'
    });
    menuButton.setData('defaultFontSize', '32px');
    menuButton.setData('expandedFontSize', '32px');

    const backpackButton = createHeaderButton(scene, {
        label: '🎒',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        onClick: () => scene.toggleBackpack(),
        fontSize: '24px'
    });

    const settingsButton = createHeaderButton(scene, {
        label: '⚙',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        onClick: () => scene.toggleSettings(),
        fontSize: '32px'
    });
    settingsButton.setData('defaultFontSize', '32px');
    settingsButton.setData('expandedFontSize', '32px');

    const instructionsButton = createHeaderButton(scene, {
        label: '📘',
        x: headerWidth - CONSTANTS.UI_MARGIN,
        onClick: () => scene.toggleInstructions(),
        fontSize: '24px'
    });

    const layoutButtons = () => {
        const order = [menuButton, settingsButton, instructionsButton, backpackButton];
        order.forEach(button => {
            const refresh = button && button.getData('refreshHeaderButtonMetrics');
            if (typeof refresh === 'function') {
                refresh();
            }
        });

        let cursorX = headerWidth - CONSTANTS.UI_MARGIN;

        const positionButton = button => {
            if (!button) {
                return;
            }
            const targetY = headerHeight / 2;
            button.setY(targetY);
            const width = button.getData('buttonWidth') || button.width || 0;
            cursorX -= width / 2;
            button.setX(cursorX);
            const background = button.getData('backgroundRect');
            if (background) {
                background.setY(targetY);
                background.setX(cursorX);
            }
            cursorX -= width / 2 + buttonSpacing;
        };

        order.forEach(positionButton);
    };
    layoutButtons();

    const addButtonToContainer = button => {
        if (!button) {
            return;
        }
        const background = button.getData('backgroundRect');
        if (background) {
            container.add(background);
        }
        container.add(button);
    };

    addButtonToContainer(menuButton);
    addButtonToContainer(backpackButton);
    addButtonToContainer(settingsButton);
    addButtonToContainer(instructionsButton);

    scene.headerContainer = container;
    scene.menuButton = menuButton;
    scene.backpackButton = backpackButton;
    scene.settingsButton = settingsButton;
    scene.instructionsButton = instructionsButton;
    scene.layoutHeaderButtons = layoutButtons;
    scene.mapTitleText = mapTitleText;
    scene.goldText = goldText;
    scene.speedrunTimerText = speedrunTimerText;

    if (typeof scene.updateMapSkipButtonState === 'function') {
        scene.updateMapSkipButtonState();
    }
}
