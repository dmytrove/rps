// Global Variables
let VARIATIONS = {}; // Will be loaded from variations.json
let CURRENT_VARIATION = 'classic';
let TYPES = {};
let COLORS = {};
let RULES = [];

// Load variations from JSON file
async function loadVariations() {
    try {
        const response = await fetch('variations.json');
        if (!response.ok) {
            throw new Error('Failed to load variations');
        }
        VARIATIONS = await response.json();
        
        // Set default variation
        setVariation(CURRENT_VARIATION);
        
        console.log('Variations loaded successfully:', Object.keys(VARIATIONS).length);
    } catch (error) {
        console.error('Error loading variations:', error);
        // Fallback to classic variation if loading fails
        VARIATIONS = {
            classic: {
                name: "Classic RPS",
                types: {
                    ROCK: '🪨',
                    PAPER: '📄',
                    SCISSORS: '✂️'
                },
                colors: {
                    ROCK: '#ef4444',
                    PAPER: '#3b82f6',
                    SCISSORS: '#22c55e'
                },
                rules: [
                    { winner: 'rock', loser: 'scissors' },
                    { winner: 'scissors', loser: 'paper' },
                    { winner: 'paper', loser: 'rock' }
                ]
            }
        };
        setVariation('classic');
    }
}

// Helper functions
const getRandomPosition = (canvas, padding) => ({
    x: Math.random() * (canvas.width - padding * 2) + padding,
    y: Math.random() * (canvas.height - padding * 2) + padding
});

const getRandomVelocity = (speedMultiplier = 1) => ({
    x: (Math.random() - 0.5) * 2 * speedMultiplier,
    y: (Math.random() - 0.5) * 2 * speedMultiplier
});

function setVariation(variationKey) {
    if (VARIATIONS[variationKey]) {
        CURRENT_VARIATION = variationKey;
        TYPES = VARIATIONS[variationKey].types;
        COLORS = VARIATIONS[variationKey].colors;
        RULES = VARIATIONS[variationKey].rules;
        console.log(`Variation set to: ${VARIATIONS[variationKey].name}`);
    } else {
        console.error(`Variation ${variationKey} not found`);
    }
}

// Display a user-friendly error message
function displayErrorMessage() {
    document.body.innerHTML = `
        <div style="display: flex; justify-content: center; align-items: center; height: 100vh; text-align: center; background: #1a1e2d; color: white;">
            <div>
                <h2>⚠️ Oops! Something went wrong</h2>
                <p>We couldn't initialize the game properly. Please try refreshing the page.</p>
                <button onclick="location.reload()" style="background: #4a5568; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; margin-top: 20px;">Refresh Page</button>
            </div>
        </div>
    `;
}

// Export the utility functions and variables
export { 
    VARIATIONS, 
    CURRENT_VARIATION, 
    TYPES, 
    COLORS, 
    RULES, 
    loadVariations, 
    getRandomPosition, 
    getRandomVelocity, 
    setVariation,
    displayErrorMessage 
}; 