import { loadVariations, displayErrorMessage } from './utils.js';
import { Game } from './game.js';

// Default game configuration
const defaultConfig = {
    itemCount: 5,
    speedMultiplier: 1,
    itemSize: 30,
    chartRefreshRate: 1,
    realtimeChart: false,
    motionBlur: false
};

// Make it available globally for other modules
window.defaultGameConfig = defaultConfig;

/**
 * Initialize the game with proper error handling
 */
function initializeGame() {
    try {
        // Clear existing game instance if any
        if (window.gameInstance) {
            console.log('Cleaning up existing game instance');
            window.gameInstance = null;
        }
        
        // Create game instance without automatically calling resize/adjustForScreenSize
        window.gameInstance = new Game(true); // Pass true to skip auto-start
        
        // Manually initialize the canvas size
        if (window.gameInstance.canvas) {
            const dpr = window.devicePixelRatio || 1;
            window.gameInstance.canvas.width = window.innerWidth * dpr;
            window.gameInstance.canvas.height = window.innerHeight * dpr;
            window.gameInstance.canvas.style.width = window.innerWidth + 'px';
            window.gameInstance.canvas.style.height = window.innerHeight + 'px';
            
            // Scale for high DPI displays
            if (window.gameInstance.ctx) {
                window.gameInstance.ctx.scale(dpr, dpr);
            }
        }
        
        // Now manually start the game
        window.gameInstance.startGame();
        console.log('Game initialized successfully!');
    } catch (err) {
        console.error('Failed to initialize game:', err);
        displayErrorMessage();
    }
}

// Start the game when the page loads
window.onload = async () => {
    try {
        // First load the variations from the JSON file
        await loadVariations();
        
        // Create a safer initialization
        initializeGame();
    } catch (error) {
        console.error('Error initializing game:', error);
        // Display a user-friendly error message
        displayErrorMessage();
    }
};

export { initializeGame }; 