import { VARIATIONS, CURRENT_VARIATION } from './utils.js';

/**
 * UI notification manager
 */
class NotificationManager {
    constructor() {
        this.notificationTimeout = null;
        this.notificationElement = null;
    }

    /**
     * Show a generic notification
     * @param {string} message - The message to display
     * @param {string} type - The type of notification (info, success, warning, error)
     */
    showNotification(message, type = 'info') {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }

        // Create or get notification element
        if (!this.notificationElement) {
            this.notificationElement = document.createElement('div');
            this.notificationElement.id = 'notification';
            this.notificationElement.className = 'position-fixed top-50 start-50 translate-middle ' +
                                  'bg-dark text-white px-4 py-3 rounded shadow-lg fs-3 ' +
                                  'opacity-0';
            this.notificationElement.style.transition = 'opacity 0.5s';
            document.body.appendChild(this.notificationElement);
        }
        
        // Set background color based on notification type
        let bgColor = 'bg-dark';
        switch (type) {
            case 'success':
                bgColor = 'bg-success';
                break;
            case 'warning':
                bgColor = 'bg-warning text-dark';
                break;
            case 'error':
                bgColor = 'bg-danger';
                break;
            case 'info':
            default:
                bgColor = 'bg-info text-dark';
                break;
        }
        
        // Update class to reflect notification type
        this.notificationElement.className = `position-fixed top-50 start-50 translate-middle ${bgColor} ` +
                             'px-4 py-3 rounded shadow-lg fs-3 opacity-0';
        
        // Set notification message
        this.notificationElement.textContent = message;
        
        // Show notification
        this.notificationElement.style.opacity = '1';
        
        // Hide after 2 seconds
        this.notificationTimeout = setTimeout(() => {
            this.notificationElement.style.opacity = '0';
        }, 2000);
    }

    showWinnerNotification(winner) {
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
            this.notificationTimeout = null;
        }

        // Create or get notification element
        if (!this.notificationElement) {
            this.notificationElement = document.createElement('div');
            this.notificationElement.id = 'winnerNotification';
            this.notificationElement.className = 'position-fixed top-50 start-50 translate-middle ' +
                                  'bg-dark text-white px-4 py-3 rounded shadow-lg fs-3 ' +
                                  'opacity-0';
            this.notificationElement.style.transition = 'opacity 0.5s';
            document.body.appendChild(this.notificationElement);
        }

        // Get the emoji from the current variation
        if (!winner) {
            console.warn('Winner is undefined in showWinnerNotification');
            return;
        }
        
        const winnerKey = winner.toUpperCase();
        const variation = VARIATIONS[CURRENT_VARIATION];
        let emoji = '❓';
        
        if (variation && variation.types[winnerKey]) {
            emoji = variation.types[winnerKey];
        }
        
        // Format the winner name nicely (capitalize first letter)
        const winnerName = winner.charAt(0).toUpperCase() + winner.slice(1);
        
        // Set winner message with emoji
        this.notificationElement.innerHTML = `
            ${emoji}
            ${winnerName} wins!
            ${emoji}
        `;
        
        // Show notification
        this.notificationElement.style.opacity = '1';
        
        // Hide after 2 seconds
        this.notificationTimeout = setTimeout(() => {
            this.notificationElement.style.opacity = '0';
        }, 2000);
    }
}

export { NotificationManager }; 