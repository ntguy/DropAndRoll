const LETTER_PATTERNS = {
    D: [
        '11110',
        '10001',
        '10001',
        '10001',
        '11110'
    ],
    R: [
        '11110',
        '10001',
        '11110',
        '10100',
        '10010'
    ],
    O: [
        '01110',
        '10001',
        '10001',
        '10001',
        '01110'
    ],
    P: [
        '11110',
        '10001',
        '11110',
        '10000',
        '10000'
    ],
    L: [
        '10000',
        '10000',
        '10000',
        '10000',
        '11111'
    ],
    '+': [
        '00100',
        '00100',
        '11111',
        '00100',
        '00100'
    ]
};

export class StartScene extends Phaser.Scene {
    constructor() {
        super({ key: 'StartScene' });

        this.dieSize = 26;
        this.dieSpacing = 2;
        this.letterSpacing = 12;
        this.lineSpacing = this.dieSize * 0.8;
        this.titleDice = [];
        this.isTutorialEnabled = false;
        this.isHardModeEnabled = false;
        this.isNightmareModeEnabled = false;
        this.tutorialToggleContainer = null;
        this.tutorialToggleBox = null;
        this.tutorialToggleCheckmark = null;
        this.difficultyContainer = null;
        this.difficultyLabel = null;
        this.difficultyMinus = null;
        this.difficultyPlus = null;
    }

    preload() {
        this.load.audio('diceRoll', './audio/single-dice-roll.mp3');
        this.load.audio('multiDiceRoll', './audio/multi-dice-roll.mp3');
        this.load.audio('swoosh', './audio/swoosh.mp3');
        this.load.audio('chimeShort', './audio/chime-short.mp3');
        this.load.audio('chimeLong', './audio/chime-long.mp3');
        this.load.audio('tick', './audio/tick.mp3');
        this.load.audio('tock', './audio/tock.mp3');
        this.load.audio('towerOfTenEnter', './audio/ToT-enter.mp3');
        this.load.audio('towerOfTenWin', './audio/ToT-win.mp3');
        this.load.audio('towerOfTenBust', './audio/ToT-lose.mp3');
        this.load.audio('Map1Music', './audio/Map1Music.mp3');
        this.load.audio('Map2Music', './audio/Map2Music.mp3');
        this.load.audio('Map3Music', './audio/Map3Music.mp3');
        this.load.image('path_ladder', './sprites/Ladder-rotting.png');
        this.load.image('path_ladder_clean', './sprites/Ladder-clean.png');
        this.load.image('path_ladder_metal', './sprites/Ladder-metal.png');
        this.load.image('path_background', './sprites/Background.png');
        this.load.image('path_background_bright', './sprites/BackgroundBright.png');
        this.load.image('path_background_brightest', './sprites/BackgroundBrightest.png');
        this.load.image('outside_background_1', './sprites/Clouds 3/1.png');
        this.load.image('outside_background_2', './sprites/Clouds 3/2.png');
        this.load.image('outside_background_3', './sprites/Clouds 3/3.png');
        this.load.image('outside_background_4', './sprites/Clouds 3/4.png');
        this.load.image('outside_background_world2_1', './sprites/World2/1.png');
        this.load.image('outside_background_world2_2', './sprites/World2/2.png');
        this.load.image('outside_background_world2_3', './sprites/World2/3.png');
        this.load.image('outside_background_world2_4', './sprites/World2/4.png');
        this.load.image('outside_background_world3_1', './sprites/World3/1.png');
        this.load.image('outside_background_world3_2', './sprites/World3/2.png');
        this.load.image('outside_background_world3_3', './sprites/World3/3.png');
        this.load.image('outside_background_world3_4', './sprites/World3/4.png');
        this.load.image('outside_background_world3_5', './sprites/World3/5.png');
        this.load.image('outside_background_world3_6', './sprites/World3/6.png');
        this.load.image('outside_background_world3_7', './sprites/World3/7.png');
        this.load.image('outside_background_world3_8', './sprites/World3/8.png');
        this.load.image('outside_background_world3_9', './sprites/World3/9.png');
        this.load.image('wall', './sprites/Wall.png');
        this.load.image('wall2', './sprites/Wall2.png');
        this.load.image('wall_highlight_center', './sprites/BrightWallCenter.png');
        this.load.spritesheet('wall_torch', './sprites/spr_torch.png', {
            frameWidth: 21,
            frameHeight: 27
        });
        this.cameras.main.setBackgroundColor('#111118');
        this.load.bitmapFont('boldPixels', './BoldPixels/BoldPixels.png', './BoldPixels/BoldPixels.xml');
    }

    create() {
        const { width } = this.scale;
        this.titleDice.length = 0;

        const lines = ['DROP', '+', 'ROLL'];
        const titleY = 60;
        const letterHeight = this.getLetterHeight();

        lines.forEach((line, index) => {
            const lineWidth = this.getWordWidth(line);
            const startX = (width - lineWidth) / 2;
            const lineY = titleY + index * (letterHeight + this.lineSpacing);
            this.createDiceWord(line, startX, lineY);
        });

        const lastLineBottom = titleY + (lines.length - 1) * (letterHeight + this.lineSpacing) + letterHeight;
        const buttonY = lastLineBottom + this.dieSize * 3 + 44;

        const button = this.add.text(width / 2, buttonY, 'PLAY', {
            fontFamily: 'monospace',
            fontSize: '64px',
            color: '#f1c40f',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);

        this.createDifficultyControl(button);
        this.createTutorialToggleBelow(button);

        button.setInteractive({ useHandCursor: true })
            .on('pointerover', () => {
                button.setScale(1.1);
            })
            .on('pointerout', () => {
                button.setScale(1);
            })
            .on('pointerdown', () => {
                button.disableInteractive();
                const transitionDuration = 600;

                this.cameras.main.once('camerafadeoutcomplete', () => {
                    this.scene.start('GameScene', {
                        tutorialEnabled: this.isTutorialEnabled,
                        hardModeEnabled: this.isHardModeEnabled,
                        nightmareModeEnabled: this.isNightmareModeEnabled
                    });
                }, this);
        
                this.cameras.main.fadeOut(transitionDuration, 25, 25, 37);
            });
    }

    createDifficultyControl(button) {
        if (!button) {
            return;
        }

        const { x: bx, y: by } = button;
        const containerY = by - 56;

        const container = this.add.container(bx, containerY);

        const bg = this.add.rectangle(0, 0, 360, 56, 0x000000, 0)
            .setOrigin(0.5);

        const minus = this.add.text(-120, 0, '-', {
            fontFamily: 'monospace',
            fontSize: '64px',
            color: '#f1c40f'
        }).setOrigin(0.5);

        const label = this.add.text(0, 0, 'Normal', {
            fontFamily: 'monospace',
            fontSize: '32px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const plus = this.add.text(120, 0, '+', {
            fontFamily: 'monospace',
            fontSize: '64px',
            color: '#f1c40f'
        }).setOrigin(0.5);

        container.add(bg);
        container.add(minus);
        container.add(label);
        container.add(plus);

        // Use the text objects' local positions and display sizes for hit areas
        const minusHitW = Math.max(72, Math.ceil(minus.displayWidth + 12));
        const minusHitH = Math.max(56, Math.ceil(minus.displayHeight + 8));
        const plusHitW = Math.max(72, Math.ceil(plus.displayWidth + 12));
        const plusHitH = Math.max(56, Math.ceil(plus.displayHeight + 8));

        const minusHit = this.add.rectangle(minus.x, minus.y, minusHitW, minusHitH, 0x000000, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });
        const plusHit = this.add.rectangle(plus.x, plus.y, plusHitW, plusHitH, 0x000000, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        // add hit areas after so they receive pointer events, over the bg but under text visually
        container.add(minusHit);
        container.add(plusHit);

        minusHit.on('pointerdown', () => this.decreaseDifficulty());
        plusHit.on('pointerdown', () => this.increaseDifficulty());

        minusHit.on('pointerover', () => minus.setScale(1.2));
        minusHit.on('pointerout', () => minus.setScale(1));
        plusHit.on('pointerover', () => plus.setScale(1.2));
        plusHit.on('pointerout', () => plus.setScale(1));

        this.difficultyContainer = container;
        this.difficultyLabel = label;
        this.difficultyMinus = minusHit;
        this.difficultyPlus = plusHit;
        this.difficultyMinusText = minus;
        this.difficultyPlusText = plus;

        this.updateDifficultyUI();
    }
    increaseDifficulty() {
        if (!this.isHardModeEnabled && !this.isNightmareModeEnabled) {
            // Normal -> Hard
            this.isHardModeEnabled = true;
            this.isNightmareModeEnabled = false;
        } else if (this.isHardModeEnabled && !this.isNightmareModeEnabled) {
            // Hard -> Nightmare
            this.isNightmareModeEnabled = true;
            this.isHardModeEnabled = true; // ensure hard stays true
        }
        this.updateDifficultyUI();
    }

    decreaseDifficulty() {
        if (this.isNightmareModeEnabled) {
            // Nightmare -> Hard
            this.isNightmareModeEnabled = false;
            this.isHardModeEnabled = true;
        } else if (this.isHardModeEnabled && !this.isNightmareModeEnabled) {
            // Hard -> Normal
            this.isHardModeEnabled = false;
            this.isNightmareModeEnabled = false;
        }
        this.updateDifficultyUI();
    }

    updateDifficultyUI() {
        if (!this.difficultyLabel) return;

        let current = 'Normal';
        if (this.isNightmareModeEnabled) current = 'Nightmare';
        else if (this.isHardModeEnabled) current = 'Hard';
        this.difficultyLabel.setText(current);

        // set label color per difficulty
        const normalColor = '#f1c40f';
        const hardColor = '#ff8c00';
        const nightmareColor = '#ff3b3b';
        let labelColor = normalColor;
        if (this.isNightmareModeEnabled) labelColor = nightmareColor;
        else if (this.isHardModeEnabled) labelColor = hardColor;
        if (this.difficultyLabel && typeof this.difficultyLabel.setColor === 'function') {
            this.difficultyLabel.setColor(labelColor);
        } else if (this.difficultyLabel && this.difficultyLabel.setStyle) {
            this.difficultyLabel.setStyle({ color: labelColor });
        }

        const showPlus = !this.isNightmareModeEnabled;
        const showMinus = this.isHardModeEnabled || this.isNightmareModeEnabled;

        if (this.difficultyPlus) {
            if (showPlus) this.difficultyPlus.setInteractive({ useHandCursor: true });
            else this.difficultyPlus.disableInteractive();
        }
        if (this.difficultyMinus) {
            if (showMinus) this.difficultyMinus.setInteractive({ useHandCursor: true });
            else this.difficultyMinus.disableInteractive();
        }

        if (this.difficultyContainer) {
            if (this.difficultyPlusText) this.difficultyPlusText.setAlpha(showPlus ? 1 : 0.25);
            if (this.difficultyMinusText) this.difficultyMinusText.setAlpha(showMinus ? 1 : 0.25);
        }
    }

    setNightmareMode(enabled) {
        this.isNightmareModeEnabled = !!enabled;
        if (this.isNightmareModeEnabled) {
            this.isHardModeEnabled = true;
        }
        this.updateDifficultyUI();
    }

    createCheckboxToggle(button, labelText, { align = 'right', margin = 80, onToggle } = {}) {
        if (!button) {
            return null;
        }

        const checkboxSize = 32;
        const label = this.add.text(0, 0, labelText, {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);

        const labelWidth = label.displayWidth;
        const totalWidth = checkboxSize + 16 + labelWidth;
        const totalHeight = Math.max(checkboxSize, label.displayHeight) + 12;
        const leftEdge = -totalWidth / 2;

        const container = this.add.container(0, button.y);

        const hitArea = this.add.rectangle(0, 0, totalWidth + 12, totalHeight, 0x000000, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        const box = this.add.rectangle(leftEdge + checkboxSize / 2, 0, checkboxSize, checkboxSize, 0x000000, 0)
            .setStrokeStyle(3, 0xf1c40f, 0.85)
            .setOrigin(0.5);

        const checkmark = this.add.text(box.x + 2, box.y - 2, '✔', {
            fontFamily: 'monospace',
            fontSize: '32px',
            align: 'center',
            color: '#f1c40f'
        }).setOrigin(0.5);
        checkmark.setVisible(false);

        label.setPosition(leftEdge + checkboxSize + 16, 0);

        container.add(hitArea);
        container.add(box);
        container.add(checkmark);
        container.add(label);

        const offset = button.displayWidth / 2 + margin + totalWidth / 2;
        const containerX = align === 'left'
            ? button.x - offset
            : button.x + offset;
        container.setPosition(containerX, button.y);

        hitArea.on('pointerover', () => {
            box.setFillStyle(0xf1c40f, 0.15);
        });
        hitArea.on('pointerout', () => {
            box.setFillStyle(0x000000, 0);
        });
        hitArea.on('pointerdown', () => {
            if (typeof onToggle === 'function') {
                onToggle();
            }
        });

        return { container, box, checkmark };
    }

    createTutorialToggle(button) {
        const toggle = this.createCheckboxToggle(button, 'Tutorial', {
            align: 'right',
            onToggle: () => this.toggleTutorialCheckbox()
        });

        if (!toggle) {
            return;
        }

        this.tutorialToggleContainer = toggle.container;
        this.tutorialToggleBox = toggle.box;
        this.tutorialToggleCheckmark = toggle.checkmark;
        this.updateTutorialCheckbox();
    }

    createTutorialToggleBelow(button) {
        if (!button) return;

        // Reuse the checkbox builder but place it centered below the play button
        const container = this.add.container(button.x + 20, button.y + 68);

        const checkboxSize = 32;
        const label = this.add.text(0, 0, 'Tutorial', {
            fontFamily: 'monospace',
            fontSize: '28px',
            color: '#f1c40f',
            fontStyle: 'bold'
        }).setOrigin(0.5, 0.5);

        const box = this.add.rectangle(-80, 0, checkboxSize, checkboxSize, 0x000000, 0)
            .setStrokeStyle(3, 0xf1c40f, 0.85)
            .setOrigin(0.5);

        const checkmark = this.add.text(box.x + 2, box.y - 2, '✔', {
            fontFamily: 'monospace',
            fontSize: '32px',
            align: 'center',
            color: '#f1c40f'
        }).setOrigin(0.5);
        checkmark.setVisible(this.isTutorialEnabled);

        const hitArea = this.add.rectangle(0, 0, 220, 56, 0x000000, 0)
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true });

        hitArea.on('pointerdown', () => this.toggleTutorialCheckbox());
        hitArea.on('pointerover', () => box.setFillStyle(0xf1c40f, 0.12));
        hitArea.on('pointerout', () => box.setFillStyle(0x000000, 0));

        container.add(hitArea);
        container.add(box);
        container.add(checkmark);
        container.add(label);

        this.tutorialToggleContainer = container;
        this.tutorialToggleBox = box;
        this.tutorialToggleCheckmark = checkmark;
    }

    toggleTutorialCheckbox() {
        this.isTutorialEnabled = !this.isTutorialEnabled;
        this.updateTutorialCheckbox();
    }

    updateTutorialCheckbox() {
        if (this.tutorialToggleCheckmark) {
            this.tutorialToggleCheckmark.setVisible(this.isTutorialEnabled);
        }

        if (this.tutorialToggleBox) {
            const fillAlpha = this.isTutorialEnabled ? 0.2 : 0;
            this.tutorialToggleBox.setFillStyle(0xf1c40f, fillAlpha);
        }
    }


    getLetterHeight() {
        const sample = LETTER_PATTERNS.D;
        if (!sample || sample.length === 0) {
            return this.dieSize;
        }

        const rows = sample.length;
        return rows * (this.dieSize + this.dieSpacing) - this.dieSpacing;
    }

    getWordWidth(word) {
        let width = 0;
        for (const char of word) {
            const pattern = LETTER_PATTERNS[char];
            if (!pattern || pattern.length === 0) {
                continue;
            }
            const columns = pattern[0].length;
            width += columns * (this.dieSize + this.dieSpacing);
            width += this.letterSpacing;
        }
        return Math.max(0, width - this.letterSpacing);
    }

    createDiceWord(word, startX, startY) {
        let x = startX;
        for (const char of word) {
            x = this.createDiceLetter(char, x, startY);
        }
        return x;
    }

    createDiceLetter(char, startX, startY) {
        const pattern = LETTER_PATTERNS[char];
        if (!pattern || pattern.length === 0) {
            return startX + this.letterSpacing;
        }

        const columns = pattern[0].length;
        const rows = pattern.length;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < columns; col += 1) {
                if (pattern[row][col] !== '1') {
                    continue;
                }

                const x = startX + col * (this.dieSize + this.dieSpacing);
                const y = startY + row * (this.dieSize + this.dieSpacing);
                const die = this.createDiceSquare(x, y);
                this.titleDice.push(die);
            }
        }

        return startX + columns * (this.dieSize + this.dieSpacing) + this.letterSpacing;
    }

    createDiceSquare(x, y) {
        const container = this.add.container(x + this.dieSize / 2, y + this.dieSize / 2);
        const outlineColor = 0x111111;
        const backgroundColor = 0xccccb5;
        const pipColor = 0x111111;

        const rect = this.add.rectangle(0, 0, this.dieSize, this.dieSize, backgroundColor, 1);
        rect.setStrokeStyle(4, outlineColor, 0.9);
        rect.setOrigin(0.5);
        container.add(rect);

        const pipRadius = this.dieSize * 0.11;
        const offset = this.dieSize * 0.23;
        const pipPositions = {
            center: { x: 0, y: 0 },
            topLeft: { x: -offset, y: -offset },
            topCenter: { x: 0, y: -offset },
            topRight: { x: offset, y: -offset },
            middleLeft: { x: -offset, y: 0 },
            middleRight: { x: offset, y: 0 },
            bottomLeft: { x: -offset, y: offset },
            bottomCenter: { x: 0, y: offset },
            bottomRight: { x: offset, y: offset }
        };

        const pipLayouts = {
            1: ['center'],
            2: ['topLeft', 'bottomRight'],
            3: ['topLeft', 'center', 'bottomRight'],
            4: ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'],
            5: ['topLeft', 'topRight', 'center', 'bottomLeft', 'bottomRight'],
            6: ['topLeft', 'topRight', 'middleLeft', 'middleRight', 'bottomLeft', 'bottomRight']
        };

        const value = Phaser.Math.Between(1, 6);
        const layout = pipLayouts[value] || [];

        layout.forEach((key) => {
            const position = pipPositions[key];
            if (!position) {
                return;
            }
            const pip = this.add.circle(position.x, position.y, pipRadius, pipColor, 1);
            pip.setOrigin(0.5);
            container.add(pip);
        });

        const shadow = this.add.rectangle(6, 8, this.dieSize, this.dieSize, 0x000000, 0.15);
        shadow.setOrigin(0.5);
        shadow.setDepth(-1);
        container.addAt(shadow, 0);

        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            alpha: 1,
            duration: Phaser.Math.Between(800, 1800),
            delay: Phaser.Math.Between(0, 1000),
            ease: 'Sine.easeOut'
        });

        return container;
    }
}
