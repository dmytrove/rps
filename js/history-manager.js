import { VARIATIONS, CURRENT_VARIATION, COLORS } from './utils.js';

/**
 * Manages the game round history
 */
class HistoryManager {
    constructor() {
        this.history = [];
        this.historyContainer = document.getElementById('historyContainer');
        this.roundCounter = 0;
    }
    
    addRound(winner, roundStartTime, initialDistribution) {
        this.roundCounter++;
        const duration = ((Date.now() - roundStartTime) / 1000).toFixed(1);
        const time = new Date().toLocaleTimeString();
        
        // Get current variation data
        const variation = VARIATIONS[CURRENT_VARIATION];
        const typeKeys = Object.keys(variation.types).map(key => key.toLowerCase());
        
        // Parse the distribution based on the current variation
        const distribution = {};
        
        // Extract numbers from initialDistribution
        const numbers = initialDistribution.match(/\d+/g) || [];
        
        // Map numbers to type keys
        typeKeys.forEach((type, index) => {
            distribution[type] = index < numbers.length ? numbers[index] : 0;
        });
        
        const roundInfo = {
            roundNumber: this.roundCounter,
            time,
            winner,
            duration,
            distribution,
            variation: CURRENT_VARIATION
        };
        
        this.history.unshift(roundInfo);
        this.updateHistoryTable(roundInfo);
        
        // Keep only last 50 rounds
        if (this.history.length > 50) {
            this.history.pop();
            const tbody = document.getElementById('historyTableBody');
            if (tbody && tbody.lastChild) {
                tbody.removeChild(tbody.lastChild);
            }
        }
    }
    
    updateHistoryTable(roundInfo) {
        const tbody = document.getElementById('historyTableBody');
        if (!tbody) return;
        
        const row = document.createElement('tr');
        row.className = 'border-bottom border-secondary';
        
        // Get the variation used for this round (or use current if not stored)
        const variationKey = roundInfo.variation || CURRENT_VARIATION;
        const variation = VARIATIONS[variationKey];
        
        // Get emoji for the winner
        if (!roundInfo.winner) {
            console.warn('Winner is undefined in updateHistoryTable for round', roundInfo.roundNumber);
            return;
        }
        
        const winnerType = roundInfo.winner.toUpperCase();
        let winnerEmoji = '❓';
        let winnerColor = '#6c757d'; // Default gray
        
        // Try to find the emoji and color in the correct variation
        if (variation && variation.types[winnerType]) {
            winnerEmoji = variation.types[winnerType];
            winnerColor = variation.colors[winnerType] || COLORS[winnerType] || winnerColor;
        }
        
        // Generate the pills HTML for initial distribution
        let initialPillsHTML = '<div class="d-flex flex-wrap gap-1 justify-content-center">';
        let hasAnyItems = false;
        
        // Add the distribution pills based on the variation
        if (variation) {
            Object.entries(variation.types).forEach(([typeKey, emoji]) => {
                const key = typeKey.toLowerCase();
                const count = roundInfo.distribution[key] || 0;
                
                // Only include types with counts > 0
                if (count > 0) {
                    hasAnyItems = true;
                    // Get the color for this type from the variation colors or COLORS object
                    const color = variation.colors[typeKey] || COLORS[typeKey] || '#6c757d';
                    
                    initialPillsHTML += `
                        <span class="badge rounded-pill" style="background-color: ${color}; color: white;">
                            ${emoji} ${count}
                        </span>
                    `;
                }
            });
        }
        
        // Close the flex container
        initialPillsHTML += '</div>';
        
        // If no items were added, show a placeholder
        if (!hasAnyItems) {
            initialPillsHTML = '<span class="text-muted">No data</span>';
        }
        
        // Extract time numbers only
        const timeNumbers = roundInfo.time.replace(/[^0-9:]/g, '');
        
        // Create the row HTML with round number, winner pill, time pill + duration, and initial distribution
        let rowHTML = `
            <td class="text-center">${roundInfo.roundNumber}</td>
            <td class="text-center">
                <span class="badge rounded-pill" style="background-color: ${winnerColor}; color: white;">
                    ${winnerEmoji}
                </span>
            </td>
            <td class="text-center">
                <span class="badge rounded-pill bg-secondary me-1">${timeNumbers}</span>
                <span>⏳ ${roundInfo.duration}s</span>
            </td>
            <td class="text-center initial-pills-cell">
                ${initialPillsHTML}
            </td>
        `;
        
        row.innerHTML = rowHTML;
        tbody.insertBefore(row, tbody.firstChild);
    }
}

export { HistoryManager }; 