export class SplashScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SplashScene' });
    }

    preload() {
        // Load the splash image first
        this.load.image('splash_bg', './sprites/splashLogo.png');

        // Start loading the rest of the game's assets in parallel.
        // Mirror the StartScene preload list sufficient for initial start.
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
        this.load.bitmapFont('boldPixels', './BoldPixels/BoldPixels.png', './BoldPixels/BoldPixels.xml');
    }

    create() {
        const { width, height } = this.scale;

        // match the StartScene background color
        this.cameras.main.setBackgroundColor('#111118');

        const bg = this.add.image(width / 2, height / 2, 'splash_bg');
        // triple the splash logo size
        bg.setScale(3);
        bg.setOrigin(0.5);
        bg.setAlpha(0);

        // Fade in, hold while loading, then fade out
        const fadeIn = 500;
        const hold = 1000;
        const fadeOut = 500;

        this.tweens.add({
            targets: bg,
            alpha: 1,
            duration: fadeIn,
            onComplete: () => {
                // Wait until loader is complete and the hold time has passed
                const finishIfReady = () => {
                    if (this.load.totalComplete === this.load.totalToLoad && this._holdDone) {
                        this.finishSplash(bg, fadeOut);
                    }
                };

                this.time.delayedCall(hold, () => {
                    this._holdDone = true;
                    finishIfReady();
                });

                this.load.on('complete', () => {
                    finishIfReady();
                }, this);
                // start the loader (preload already queued assets)
                this.load.start();
            }
        });
    }

    finishSplash(bg, fadeOut) {
        this.tweens.add({
            targets: bg,
            alpha: 0,
            duration: fadeOut,
            onComplete: () => {
                this.scene.start('StartScene');
            }
        });
    }
}
