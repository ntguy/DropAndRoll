const GAME_WIDTH = 1100;
const HEADER_HEIGHT = 40;
const CONTENT_HEIGHT = 700;
const GAME_HEIGHT = CONTENT_HEIGHT + HEADER_HEIGHT;

import { SplashScene } from './SplashScene.js';
import { StartScene } from './StartScene.js';
import { GameScene } from './GameScene.js';

// Game configuration
export const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        expandParent: true,
    },
    backgroundColor: "#222",
    scene: [SplashScene, StartScene, GameScene],
    render: {
        pixelArt: true,
    }
};
