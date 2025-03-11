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
 * @param {boolean} skipAutoStart - Whether to skip auto-starting the game
 * @returns {Promise<Game|null>} The game instance or null if initialization failed
 */
async function initializeGame(skipAutoStart = true) {
    try {
        console.log('Initializing game...');
        
        // Clear existing game instance if any
        if (window.gameInstance) {
            console.log('Cleaning up existing game instance');
            
            // Properly clean up existing instance if possible
            if (typeof window.gameInstance.destroy === 'function') {
                window.gameInstance.destroy();
            }
            
            window.gameInstance = null;
        }
        
        console.log('Creating new Game instance');
        
        // Create game instance
        const game = new Game(skipAutoStart);
        
        // Allow time for DOM elements to be fully ready
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('Initializing game with initializeGame method');
        
        // Initialize using the proper method
        if (typeof game.initializeGame === 'function') {
            const success = game.initializeGame();
            
            if (success) {
                console.log('Game initialized successfully!');
                return game;
            } else {
                console.error('Game initialization returned false');
                throw new Error('Game initialization failed');
            }
        } else {
            console.warn('initializeGame method not found on Game instance, using fallback');
            
            // Use traditional initialization as fallback
            game.resize();
            if (!skipAutoStart) {
                game.startGame();
            }
            console.log('Game initialized with fallback method');
            return game;
        }
    } catch (err) {
        console.error('Failed to initialize game:', err);
        return null;
    }
}

// Start the game when the page loads
window.onload = async () => {
    try {
        console.log('Loading game resources...');
        
        // First load the variations from the JSON file
        await loadVariations();
        
        // Initialize the game
        const game = await initializeGame(true);
        
        if (game) {
            console.log('Game ready to play!');
        } else {
            console.error('Game initialization failed');
            displayErrorMessage();
        }
    } catch (error) {
        console.error('Error during game startup:', error);
        displayErrorMessage();
    }
};

export { initializeGame }; 