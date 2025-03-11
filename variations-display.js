// Script to enhance the variations display
document.addEventListener('DOMContentLoaded', function() {
    // Wait for the game to be initialized
    const checkInterval = setInterval(() => {
        if (window.gameInstance) {
            clearInterval(checkInterval);
            setupVariationsDisplay();
        }
    }, 100);

    function setupVariationsDisplay() {
        // Get reference to the container and game
        const variationCardsContainer = document.getElementById('variationCardsContainer');
        const game = window.gameInstance;
        
        // Create variations cards when the tab is clicked
        const variationsTab = document.getElementById('variations-tab');
        if (variationsTab) {
            variationsTab.addEventListener('click', function() {
                if (variationCardsContainer && variationCardsContainer.children.length === 0) {
                    if (typeof game.createVariationCards === 'function') {
                        game.createVariationCards(variationCardsContainer);
                    }
                }
            });
        }
        
        // Create variation cards immediately after a short delay
        setTimeout(() => {
            if (variationCardsContainer && variationCardsContainer.children.length === 0) {
                if (typeof game.createVariationCards === 'function') {
                    game.createVariationCards(variationCardsContainer);
                    console.log('Variations cards created automatically');
                }
            }
        }, 500);
    }
});
