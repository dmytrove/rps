import { VARIATIONS, CURRENT_VARIATION, TYPES, COLORS, RULES, getRandomPosition, setVariation } from './utils.js';
import { Item, Glow } from './models.js';
import { AudioManager } from './audio-manager.js';
import { NotificationManager } from './notification-manager.js';
import { HistoryManager } from './history-manager.js';
import { ChartManager } from './chart-manager.js';
import { GraphManager } from './graph-manager.js';
import { createRulesSVG } from './rules-graph.js';

/**
 * Main Game class that handles the game logic
 */
class Game {
    constructor(skipAutoStart = false) {
        try {
            // Store global reference to this game instance for other components
            // IMPORTANT: Set this before creating any managers that might need it
            window.gameInstance = this;
            
            // Game elements
            this.canvas = document.getElementById('gameCanvas');
            if (!this.canvas) {
                console.error('Canvas element not found');
                return;
            }
            
            this.ctx = this.canvas.getContext('2d');
            if (!this.ctx) {
                console.error('Could not get 2D context from canvas');
                return;
            }
            
            // Game state
            this.items = [];
            this.glows = [];
            this.roundStartTime = null;
            this.lastFrameTime = 0;
            this.frameCount = 0;
            this.animationFrameId = null;
            this.isRunning = false;
            this.hasWinner = false;
            this.lastWinner = null;
            this.lastDistribution = '';
            
            // Initialize config with defaults
            this.config = {
                itemCount: 5,        // Number of items per type (not total)
                speedMultiplier: 1,
                itemSize: 30,
                chartRefreshRate: 1,
                realtimeChart: false,
                motionBlur: false,
                glowEnabled: false,
                randomVariation: false
            };
            
            // Set default variation
            this.currentVariation = CURRENT_VARIATION || Object.keys(VARIATIONS)[0];
            if (!this.currentVariation || !VARIATIONS[this.currentVariation]) {
                console.warn('No valid variation found, using the first available one');
                this.currentVariation = Object.keys(VARIATIONS)[0];
            }
            
            // Initialize managers
            this.audioManager = new AudioManager();
            this.notificationManager = new NotificationManager();
            this.historyManager = new HistoryManager();
            
            // Initialize chart manager for rules visualization
            this.chartManager = new ChartManager(this.currentVariation);
            
            // Create graph manager for the distribution chart
            this.graphManager = new GraphManager({
                realtimeCharting: this.config.realtimeChart,
                refreshRate: this.config.chartRefreshRate
            });
            
            // Set up event listeners
            this.setupEventListeners();
            
            // If not skipping auto-start, initialize UI and set screen size
            if (!skipAutoStart) {
                // Resize canvas and adjust for screen size
                this.resize();
                this.adjustForScreenSize();
                
                // Start the game
                this.startGame();
            }
            
            // Delay chart setup to ensure DOM is ready
            setTimeout(() => {
                // Setup the rules chart
                if (this.chartManager && typeof this.chartManager.setupChart === 'function') {
                    this.chartManager.setupChart();
                }
                
                // Setup the distribution graph
                if (this.graphManager && typeof this.graphManager.setupChart === 'function') {
                    this.graphManager.setupChart();
                }
            }, 500);
        } catch (error) {
            console.error('Error initializing game:', error);
        }
    }
    
    // Setup event listeners for game controls
    setupEventListeners() {
        try {
            // Resize handler
            window.addEventListener('resize', () => this.resize());
            
            // Mute button handler
            const muteBtn = document.getElementById('muteBtn');
            if (muteBtn) {
                muteBtn.addEventListener('click', () => {
                    const isMuted = this.audioManager.toggleMute();
                    const icon = muteBtn.querySelector('i');
                    if (icon) {
                        icon.className = isMuted ? 'fas fa-volume-mute' : 'fas fa-volume-up';
                    }
                });
            }
            
            // Variation selector handler
            const variationSelector = document.getElementById('variationSelector');
            if (variationSelector) {
                variationSelector.addEventListener('change', (e) => {
                    this.changeVariation(e.target.value);
                });
            }
            
            // Random variation toggle
            const randomVariationToggle = document.getElementById('randomVariationToggle');
            if (randomVariationToggle) {
                randomVariationToggle.checked = this.config.randomVariation;
                
                randomVariationToggle.addEventListener('change', (e) => {
                    this.config.randomVariation = e.target.checked;
                    
                    // If turning on random variation, disable variation selector
                    const variationSelector = document.getElementById('variationSelector');
                    if (variationSelector) {
                        variationSelector.disabled = e.target.checked;
                    }
                    
                    // Don't immediately switch to random variation
                    // The switch will happen on the next round start
                    if (e.target.checked) {
                        console.log('Random variation enabled - will apply on next round');
                        // Show message to user
                        this.showMessage('Random variation will apply on next round', 'info');
                    } else {
                        console.log('Random variation disabled');
                    }
                });
            }
            
            // Settings form handler
            const settingsForm = document.getElementById('settingsForm');
            if (settingsForm) {
                settingsForm.addEventListener('submit', (e) => {
                    e.preventDefault();
                    this.applySettings();
                });
            }
            
            // Menu buttons (settings, graph, history)
            const settingsBtn = document.getElementById('settingsBtn');
            const graphBtn = document.getElementById('graphBtn');
            const historyBtn = document.getElementById('historyBtn');
            
            // Function to set active tab
            const setActiveTab = (tabId) => {
                const tab = document.getElementById(tabId);
                if (tab) {
                    const tabInstance = new bootstrap.Tab(tab);
                    tabInstance.show();
                }
            };
            
            // Add click handlers for different buttons
            if (settingsBtn) {
                settingsBtn.addEventListener('click', () => setActiveTab('settings-tab'));
            }
            
            if (graphBtn) {
                graphBtn.addEventListener('click', () => {
                    setActiveTab('graph-tab');
                    
                    // Delay to ensure the tab is fully shown
                    setTimeout(() => {
                        // Check if chart needs to be initialized or reinitialized
                        if (this.chartManager && (this.chartManager.chartInitFailed || !this.chartManager.chart)) {
                            this.chartManager.setupChart();
                        }
                    }, 150);
                });
            }
            
            if (historyBtn) {
                historyBtn.addEventListener('click', () => setActiveTab('history-tab'));
            }
            
            // Listen for tab changes to reinitialize charts
            const tabLinks = document.querySelectorAll('[data-bs-toggle="tab"]');
            tabLinks.forEach(tabLink => {
                tabLink.addEventListener('shown.bs.tab', (event) => {
                    const targetTabId = event.target.getAttribute('data-bs-target')?.substring(1);
                    
                    // If we're showing the graph or variations tab, ensure chart is updated
                    if (targetTabId === 'graph' || targetTabId === 'variations') {
                        console.log(`Tab shown: ${targetTabId}`);
                        
                        // Use the window reference to ensure we have the right instance
                        const chartManager = window.chartManagerInstance || this.chartManager;
                        
                        if (chartManager) {
                            // Make sure the chart manager has a reference to the game
                            if (!chartManager.game && window.gameInstance) {
                                chartManager.game = window.gameInstance;
                            }
                            
                            // Small delay to ensure DOM is ready
                            setTimeout(() => {
                                if (targetTabId === 'graph') {
                                    // For graph tab
                                    chartManager.setupChart();
                                } else if (targetTabId === 'variations') {
                                    // For variations tab
                                    chartManager.generateSvgGraph(chartManager.variationKey);
                                }
                            }, 300);
                        } else {
                            console.error('Chart manager not available for tab change');
                        }
                    }
                });
            });
            
            // Setup auto-apply badge for settings that auto-apply
            this.setupAutoApplyBadge();

            // Add tab change event listener
            const tabs = document.querySelectorAll('a[data-bs-toggle="tab"]');
            tabs.forEach(tab => {
                tab.addEventListener('shown.bs.tab', (event) => {
                    const targetTabId = event.target.getAttribute('href').substring(1);
                    this.handleTabChange(targetTabId);
                });
            });
        } catch (error) {
            console.error('Error setting up event listeners:', error);
        }
    }
    
    // Handle window resize events
    resize() {
        const dpr = window.devicePixelRatio || 1;
        
        // Set canvas size
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        
        // Scale canvas for high DPI displays
        this.ctx.scale(dpr, dpr);
        
        // Adjust other UI elements based on screen size
        this.adjustForScreenSize();
    }
    
    // Adjust UI based on screen size
    adjustForScreenSize() {
        // Implement screen size adjustments here
    }
    
    // Setup auto-apply badge for settings that auto-apply
    setupAutoApplyBadge() {
        const autoApplyElements = document.querySelectorAll('.auto-apply');
        
        autoApplyElements.forEach(element => {
            const formGroup = element.closest('.form-group');
            
            // Skip if there's no parent form-group
            if (!formGroup) return;
            
            // Create badge if it doesn't exist
            let badge = formGroup.querySelector('.auto-apply-badge');
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'badge auto-apply-badge';
                badge.textContent = 'Auto';
                badge.style.position = 'absolute';
                badge.style.right = '0';
                badge.style.top = '0';
                badge.style.backgroundColor = '#4CAF50';
                badge.style.color = 'white';
                badge.style.padding = '2px 6px';
                badge.style.borderRadius = '3px';
                badge.style.fontSize = '0.7em';
                
                formGroup.style.position = 'relative';
                formGroup.appendChild(badge);
            }
            
            // Add event listener for auto-apply - directly apply on input without delay
            element.addEventListener('input', () => {
                // Collect settings from this input element
                const settings = {};
                const id = element.id;
                
                // Convert value to the appropriate type (number for numeric inputs)
                let value = element.type === 'checkbox' ? element.checked : element.value;
                if (element.type === 'number' || (element.type === 'text' && !isNaN(value))) {
                    value = parseFloat(value);
                }
                
                // Add to settings object
                settings[id] = value;
                
                // Apply the collected settings immediately, except for itemCount
                // which needs an explicit "Apply" button click to take effect
                this.applySettings(settings);
            });
        });
    }
    
    // Apply settings from the settings object
    applySettings(settings) {
        // Ensure settings is an object to prevent "Cannot convert undefined or null to object" error
        settings = settings || {};
        
        // Track if we need to force a canvas reset
        let resetCanvasNeeded = false;
        
        // Map any toggle ID to their corresponding config property
        const idToConfigMap = {
            'motionBlurToggle': 'motionBlur',
            'glowEnabledToggle': 'glowEnabled',
            'realtimeToggle': 'realtimeChart',
            'randomVariationToggle': 'randomVariation'
        };
        
        // Convert IDs to their config property names if needed
        const mappedSettings = {};
        for (const [key, value] of Object.entries(settings)) {
            const configKey = idToConfigMap[key] || key;
            mappedSettings[configKey] = value;
            
            // If we're turning off motion blur, we need to reset the canvas
            if (configKey === 'motionBlur' && this.config.motionBlur === true && value === false) {
                resetCanvasNeeded = true;
            }
        }
        
        // Track if itemCount was changed - it needs a round restart to take effect
        let itemCountChanged = false;
        
        // Apply each setting if it exists
        for (const [key, value] of Object.entries(mappedSettings)) {
            if (key in this.config) {
                // Track if itemCount is changing
                if (key === 'itemCount' && this.config[key] !== value) {
                    itemCountChanged = true;
                }
                
                // Update the config value
                this.config[key] = value;
                
                // Immediately apply certain settings to existing items
                if (key === 'speedMultiplier' || key === 'itemSize') {
                    this.applySettingToItems(key, value);
                }
            }
        }
        
        // If we turned off motion blur, force a complete canvas reset
        if (resetCanvasNeeded && this.ctx) {
            console.log('Motion blur disabled, resetting canvas');
            // Simply clear the canvas without additional fillRect
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // After clearing, we need to force a redraw
            this.draw();
        }
        
        // Update real-time charting configuration for graph manager
        if (this.graphManager) {
            if ('realtimeChart' in mappedSettings) {
                // Map the realtimeChart config to the GraphManager's realtimeCharting property
                this.graphManager.config.realtimeCharting = mappedSettings.realtimeChart;
            }
            
            if ('chartRefreshRate' in mappedSettings) {
                this.graphManager.config.refreshRate = mappedSettings.chartRefreshRate;
            }
        }
        
        // Update UI to reflect new settings
        this.updateUIFromConfig();
        
        console.log('Applied settings:', mappedSettings);
    }
    
    // Apply a setting to all existing items
    applySettingToItems(settingName, value) {
        if (!this.items || this.items.length === 0) return;
        
        switch (settingName) {
            case 'speedMultiplier':
                // Update speed multiplier for all items
                this.items.forEach(item => {
                    try {
                        // Try to use the updateSpeedMultiplier method if available
                        if (typeof item.updateSpeedMultiplier === 'function') {
                            item.updateSpeedMultiplier(value);
                        } else {
                            // Fallback for older items that don't have the method
                            console.log('Item does not have updateSpeedMultiplier method, using direct update');
                            // Calculate a scale factor based on default multiplier of 1
                            const scaleFactor = value;
                            // Apply speed directly
                            item.speed = {
                                x: (item.speed.x / Math.abs(item.speed.x)) * 2 * scaleFactor,
                                y: (item.speed.y / Math.abs(item.speed.y)) * 2 * scaleFactor
                            };
                        }
                    } catch (err) {
                        console.error('Error updating item speed:', err);
                    }
                });
                break;
                
            case 'itemSize':
                // First check for overlaps after size change to avoid physics issues
                const canvasWidth = this.canvas.width;
                const canvasHeight = this.canvas.height;
                const spaceBuffer = 5; // Small buffer to prevent immediate collisions
                
                // Update size for all items
                this.items.forEach(item => {
                    try {
                        // Store original position
                        const originalX = item.x;
                        const originalY = item.y;
                        
                        // Try to use the updateSize method if available
                        if (typeof item.updateSize === 'function') {
                            item.updateSize(value);
                        } else {
                            // Fallback to direct size update
                            console.log('Item does not have updateSize method, using direct update');
                            item.size = value;
                            // Also update glow size to maintain proportions
                            if (item.glowSize) {
                                item.glowSize = value * 1.5;
                            }
                        }
                        
                        // Make sure item stays within canvas bounds after size change
                        const maxX = canvasWidth - item.size;
                        const maxY = canvasHeight - item.size;
                        
                        if (item.x < item.size) item.x = item.size + spaceBuffer;
                        if (item.x > maxX) item.x = maxX - spaceBuffer;
                        if (item.y < item.size) item.y = item.size + spaceBuffer;
                        if (item.y > maxY) item.y = maxY - spaceBuffer;
                    } catch (err) {
                        console.error('Error updating item size:', err);
                    }
                });
                
                // After all items are updated, check for and resolve any overlaps
                this.resolveOverlapsAfterSizeChange();
                break;
        }
    }
    
    // Resolve any overlaps that might occur after changing item sizes
    resolveOverlapsAfterSizeChange() {
        if (!this.items || this.items.length < 2) return;
        
        // This is a simple approach to move overlapping items apart
        // without affecting their velocity
        const iterations = 3; // Multiple iterations may be needed for complex overlaps
        
        for (let iter = 0; iter < iterations; iter++) {
            let overlapsFound = false;
            
            // Check each pair of items
            for (let i = 0; i < this.items.length; i++) {
                for (let j = i + 1; j < this.items.length; j++) {
                    const itemA = this.items[i];
                    const itemB = this.items[j];
                    
                    // Check if they overlap
                    const dx = itemB.x - itemA.x;
                    const dy = itemB.y - itemA.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = itemA.size + itemB.size;
                    
                    // If they overlap, move them apart
                    if (distance < minDistance) {
                        overlapsFound = true;
                        
                        // Calculate unit vector
                        const nx = dx / distance;
                        const ny = dy / distance;
                        
                        // Calculate overlap amount
                        const overlap = (minDistance - distance) / 2 + 1; // Add a small buffer
                        
                        // Move items apart (in opposite directions)
                        itemA.x -= nx * overlap;
                        itemA.y -= ny * overlap;
                        itemB.x += nx * overlap;
                        itemB.y += ny * overlap;
                    }
                }
            }
            
            // If no overlaps were found in this iteration, we can stop
            if (!overlapsFound) break;
        }
        
        // Final pass to ensure all items are within canvas bounds
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        
        this.items.forEach(item => {
            const maxX = canvasWidth - item.size;
            const maxY = canvasHeight - item.size;
            
            item.x = Math.max(item.size, Math.min(item.x, maxX));
            item.y = Math.max(item.size, Math.min(item.y, maxY));
        });
    }
    
    // Get description for a variation
    getVariationDescription(variationKey) {
        if (!VARIATIONS[variationKey]) {
            return 'Unknown variation';
        }
        
        const variation = VARIATIONS[variationKey];
        
        // Return the description if it exists, otherwise generate a simple one
        if (variation.description) {
            return variation.description;
        }
        
        // Generate a simple description based on the types and rules
        const typesList = Object.entries(variation.types)
            .map(([key, emoji]) => `${emoji} ${key.toLowerCase()}`)
            .join(', ');
        
        // Count the rules
        const rulesCount = variation.rules ? variation.rules.length : 0;
        
        return `${variation.name}: ${typesList}. Contains ${rulesCount} rules.`;
    }
    
    // Change to a different variation
    changeVariation(variationKey) {
        // If the variation doesn't exist, return
        if (!VARIATIONS[variationKey]) return;
        
        // Update global variation state
        setVariation(variationKey);
        
        // Set the current variation
        this.currentVariation = variationKey;
        
        // Update the rules graph using the chart manager
        if (this.chartManager) {
            this.chartManager.changeVariation(variationKey);
        }
        
        // Also update the rules graph display in the UI
        this.updateRulesGraph(variationKey);
        
        // Force a redraw of the rules graph with a slight delay to ensure DOM updates
        setTimeout(() => {
            const rulesGraph = document.getElementById('rulesGraph');
            if (rulesGraph) {
                // Clear and redraw
                rulesGraph.innerHTML = '';
                this.updateRulesGraph(variationKey);
                
                // Log for debugging
                console.log('Rules graph forcibly redrawn for variation:', variationKey);
            }
        }, 100);
        
        // Update the variation selector in the UI
        const variationSelector = document.getElementById('variationSelector');
        if (variationSelector) {
            variationSelector.value = variationKey;
        }
        
        // Start a new round with the new variation
        this.startRound();
    }
    
    // Select a random variation from available variations
    selectRandomVariation(skipRoundStart = false) {
        // Get all available variation keys
        const variationKeys = Object.keys(VARIATIONS);
        
        // If there are no variations, return
        if (variationKeys.length === 0) return;
        
        // Get current variation key to avoid selecting the same one
        const currentKey = CURRENT_VARIATION;
        
        // Filter out the current variation if there are multiple variations
        let availableKeys = variationKeys;
        if (variationKeys.length > 1) {
            availableKeys = variationKeys.filter(key => key !== currentKey);
        }
        
        // Select a random variation key
        const randomIndex = Math.floor(Math.random() * availableKeys.length);
        const randomVariationKey = availableKeys[randomIndex];
        
        // Update the global variation without restarting the round
        setVariation(randomVariationKey);
        
        // Update UI elements
        this.updateVariationEmojis(randomVariationKey, document.getElementById('variationEmojis'));
        this.updateRulesGraph(randomVariationKey);
        
        // Get variation description
        const description = this.getVariationDescription(randomVariationKey);
        
        // Update description in UI
        const descriptionElement = document.getElementById('variationDescription');
        if (descriptionElement) {
            descriptionElement.textContent = description;
        }
        
        // Update history table header
        this.updateHistoryTableHeader(randomVariationKey);
        
        // Recreate chart for the new variation
        if (this.chartManager) {
            this.chartManager.recreateChart();
        }
        
        // Recreate graph for the new variation
        if (this.graphManager) {
            this.graphManager.recreateChart();
        }
        
        // Update the UI to show the selected variation
        const variationSelector = document.getElementById('variationSelector');
        if (variationSelector) {
            variationSelector.value = randomVariationKey;
        }
        
        console.log(`Randomly selected variation: ${randomVariationKey}`);
        
        // Only start a new round if not skipping round start
        if (!skipRoundStart) {
            // Get variation name for notification
            const variationName = VARIATIONS[randomVariationKey].name || randomVariationKey;
            
            // Show notification of variation change
            if (this.notificationManager && typeof this.notificationManager.showNotification === 'function') {
                this.notificationManager.showNotification(`Switched to ${variationName} variation!`, 'info');
            }
            
            // Start a new round with the new variation
            this.startRound();
        }
    }
    
    // Start a new round
    startRound() {
        // Check if random variation is enabled and switch to a random variation
        // Use a temporary variable to avoid toggling random variation within selectRandomVariation
        const isRandomVariation = this.config.randomVariation;
        
        if (isRandomVariation) {
            console.log('Random variation enabled - selecting new variation for this round');
            
            // Select a random variation at the start of the round
            // Pass true to skip starting another round (which would cause recursion)
            this.selectRandomVariation(true); 
        }
        
        // Clear any existing items and glows
        this.items = [];
        this.glowIntensities = {};
        
        // Reset round start time
        this.roundStartTime = Date.now();
        
        // Reset winner state
        this.hasWinner = false;
        this.lastWinner = null;
        
        // Get the current variation
        const variation = VARIATIONS[this.currentVariation];
        if (!variation) {
            console.error(`Variation ${this.currentVariation} not found`);
            return;
        }
        
        // Create items based on the current variation
        const types = [...new Set(variation.rules.flatMap(rule => 
            [rule.winner.toUpperCase(), rule.loser.toUpperCase()]
        ))];
        
        // Create item types array from the variation data
        const itemTypes = types.map(type => {
            return {
                type: type,
                emoji: variation.types[type] || '❓',
                color: variation.colors?.[type] || '#999999'
            };
        });
        
        // Use the itemCount directly as the number of items per type
        const itemsPerType = this.config.itemCount;
        
        // Initialize a string to track the initial distribution
        let initialDistribution = '';
        
        // Create items for each type
        for (const type of types) {
            const itemType = itemTypes.find(item => item.type === type);
            if (!itemType) continue;
            
            // Add to the initial distribution string
            initialDistribution += `${itemType.emoji}×${itemsPerType} `;
            
            // Create the items
            for (let i = 0; i < itemsPerType; i++) {
                this.items.push(new Item(
                    itemType.type,
                    Math.random() * this.canvas.width,
                    Math.random() * this.canvas.height,
                    this.config.itemSize,
                    this.config.speedMultiplier
                ));
            }
        }
        
        // Store the initial distribution for history
        this.lastDistribution = initialDistribution.trim();
        
        // Reset the distribution graph
        if (this.graphManager) {
            this.graphManager.resetChart();
            // Create datasets based on current items
            this.graphManager.createDatasets(this.items);
        }
        
        // Show notification
        if (this.notificationManager && typeof this.notificationManager.showNotification === 'function') {
            this.notificationManager.showNotification('New Round Started!', 'info');
        }
        
        console.log(`Started new round with ${this.items.length} items (${types.length} types)`);
    }
    
    // Main animation loop
    animate(timestamp = 0) {
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        this.frameCount++;
        
        // Update game state
        this.update();
        
        // Draw the game
        this.draw();
        
        // Continue animation loop
        this.animationFrameId = requestAnimationFrame((t) => this.animate(t));
    }
    
    // Update game state
    update() {
        // Make sure canvas is valid
        if (!this.canvas || !this.ctx) {
            console.warn('Invalid canvas in Game.update');
            return;
        }
        
        // Update all items
        for (let i = 0; i < this.items.length; i++) {
            this.items[i].update(this.canvas);
        }
        
        // Handle collisions
        this.handleCollisions();
        
        // Check if round has ended (only one type left)
        this.checkRoundEnd();
        
        // Update glow intensities
        this.updateGlowIntensities();
        
        // Update graph data using the GraphManager instead of ChartManager
        if (this.graphManager) {
            this.graphManager.updateDistribution(this.items, this.roundStartTime);
        }
    }
    
    // Update glow intensities based on percentage of each type
    updateGlowIntensities() {
        // Count items by type
        const counts = {};
        const totalItems = this.items.length;
        
        // Initialize counts
        this.items.forEach(item => {
            counts[item.type] = (counts[item.type] || 0) + 1;
        });
        
        // Update glow intensity for each item based on its type's percentage
        this.items.forEach(item => {
            const percentage = counts[item.type] / totalItems;
            item.updateGlowIntensity(percentage);
        });
    }
    
    // Handle collisions between items
    handleCollisions() {
        for (let i = 0; i < this.items.length; i++) {
            for (let j = i + 1; j < this.items.length; j++) {
                const itemA = this.items[i];
                const itemB = this.items[j];
                
                if (itemA.collidesWith(itemB)) {
                    // Apply bounce physics for all colliding items
                    itemA.bounce(itemB);
                    
                    // If they are different types, check for type transformation
                    if (itemA.type !== itemB.type) {
                        this.resolveCollision(itemA, itemB);
                    }
                }
            }
        }
    }
    
    // Resolve a collision between two items
    resolveCollision(itemA, itemB) {
        // Determine which item beats the other
        let winner, loser;
        
        if (itemA.beats(itemB)) {
            winner = itemA;
            loser = itemB;
            // Transform the loser to the winner's type
            this.transformItem(loser, winner.type, winner, loser);
        } else if (itemB.beats(itemA)) {
            winner = itemB;
            loser = itemA;
            // Transform the loser to the winner's type
            this.transformItem(loser, winner.type, winner, loser);
        } else {
            // It's a tie - neither beats the other
            // Play a tie sound
            this.audioManager.playTieSound(itemA.type, itemB.type);
            
            // Create a neutral glow effect at the collision point
            const glow = new Glow(
                (itemA.x + itemB.x) / 2,
                (itemA.y + itemB.y) / 2,
                itemA.type,
                itemB.type
            );
            this.glows.push(glow);
        }
    }
    
    // Transform an item to a new type
    transformItem(item, newType, winner, loser) {
        // Validate the new type
        if (!newType) {
            console.warn('Attempted to transform item to undefined type');
            return;
        }
        
        // Create a glow effect at the collision point
        const glow = new Glow(
            (winner.x + loser.x) / 2,
            (winner.y + loser.y) / 2,
            loser.type,
            winner.type
        );
        this.glows.push(glow);
        
        // Play a win sound for the collision
        this.audioManager.playCollisionSound(loser.type, winner.type, true);
        
        // Change the item's type
        item.type = newType;
    }
    
    // Check if the round has ended
    checkRoundEnd() {
        // If there are no items, don't check for a winner
        if (this.items.length === 0) {
            return;
        }
        
        // If there's only one type left, we have a winner
        const types = new Set(this.items.map(item => item.type));
        
        if (types.size === 1) {
            // Get the winning type
            const winnerType = this.items[0].type;
            
            // Make sure winnerType is valid
            if (!winnerType) {
                console.warn('Winner type is undefined in checkRoundEnd');
                return;
            }
            
            // Set winner state
            this.hasWinner = true;
            this.lastWinner = winnerType;
            
            // Show notification
            this.notificationManager.showWinnerNotification(winnerType);
            
            // Add round to history
            this.historyManager.addRound(winnerType, this.roundStartTime, this.lastDistribution);
            
            // Start a new round after a delay
            setTimeout(() => {
                // If random variation is enabled, a new variation will be selected
                // in the startRound method
                this.startRound();
            }, 3000);
        }
    }
    
    // Draw the game
    draw() {
        // Clear canvas with or without motion blur
        if (this.config.motionBlur) {
            // Apply motion blur effect by keeping a semi-transparent background
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        } else {
            // Completely clear the canvas for no motion blur
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // No need to fill with transparent color as clearRect already handles this properly
        }
        
        // Draw items
        this.items.forEach(item => item.draw(this.ctx));
        
        // Draw glows only if enabled
        if (this.config.glowEnabled) {
            this.glows.forEach(glow => glow.draw(this.ctx));
        }
    }
    
    // Initialize variation display in UI
    initializeVariationDisplay() {
        // Create variation cards
        const container = document.getElementById('variationCardsContainer');
        if (container) {
            this.createVariationCards(container);
        }
        
        // Update rules graph after a short delay to ensure DOM is ready
        setTimeout(() => {
            // Update rules graph for current variation
            this.updateRulesGraph(CURRENT_VARIATION);
            
            // Ensure the graph tab is properly initialized when switching tabs
            const graphTab = document.getElementById('variations-tab');
            if (graphTab) {
                graphTab.addEventListener('shown.bs.tab', () => {
                    // Re-render graph when tab is shown
                    this.updateRulesGraph(CURRENT_VARIATION);
                });
            }
        }, 100);
        
        // Setup event listener for variation changes
        const variationButtons = document.querySelectorAll('.variation-select-btn');
        variationButtons.forEach(button => {
            button.addEventListener('click', () => {
                const variation = button.getAttribute('data-variation');
                if (variation) {
                    this.changeVariation(variation);
                }
            });
        });
    }
    
    // Update emojis display for a variation
    updateVariationEmojis(variationKey, container) {
        if (!container) return;
        
        const variation = VARIATIONS[variationKey];
        if (!variation) return;
        
        // Clear container
        container.innerHTML = '';
        
        // Add emoji for each type
        Object.entries(variation.types).forEach(([type, emoji]) => {
            const emojiSpan = document.createElement('span');
            emojiSpan.textContent = emoji;
            emojiSpan.className = 'variation-emoji';
            emojiSpan.style.fontSize = '1.5rem';
            emojiSpan.style.margin = '0 0.25rem';
            container.appendChild(emojiSpan);
        });
    }
    
    // Update rules graph for a variation
    updateRulesGraph(variationKey) {
        const rulesGraph = document.getElementById('rulesGraph');
        if (!rulesGraph) return;
        
        const variation = VARIATIONS[variationKey];
        if (!variation) return;
        
        // Clear previous graph
        rulesGraph.innerHTML = '';
        
        // Debug log
        console.log(`updateRulesGraph called for variation ${variationKey}:`, {
            types: variation.types,
            rules: variation.rules
        });
        
        try {
            // Get the container dimensions
            const containerRect = rulesGraph.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = Math.max(containerRect.height, 300); // Ensure minimum height
            
            console.log('Container dimensions:', containerWidth, 'x', containerHeight);
            
            // Use the imported createRulesSVG function from rules-graph.js
            // Pass the full variation data, not just the rules
            const svg = createRulesSVG(variation.rules, variation);
            
            // Update dimensions to fit the container
            // Use 100% width to fill the container horizontally
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            
            // Set viewBox to maintain proportions while filling the available space
            // Start viewBox at (0,0) with appropriate width and height
            svg.setAttribute('viewBox', '0 0 800 600');
            
            // Remove any fixed sizing styles
            svg.style.margin = '0';
            svg.style.maxWidth = 'none';
            svg.style.maxHeight = 'none';
            
            // Add the SVG to the container
            rulesGraph.appendChild(svg);
            
            // Debug log
            console.log('Rules graph SVG created and appended successfully');
            
        } catch (error) {
            console.error('Error creating rules graph:', error);
            rulesGraph.innerHTML = '<div class="alert alert-danger">Error displaying rules graph</div>';
        }
    }
    
    // Update history table header for a variation
    updateHistoryTableHeader(variationKey) {
        const thead = document.getElementById('historyTableHead');
        if (!thead) return;
        
        const variation = VARIATIONS[variationKey];
        if (!variation) return;
        
        // Get winner header cell
        const winnerCell = thead.querySelector('th:nth-child(2)');
        if (winnerCell) {
            winnerCell.textContent = 'Winner';
        }
    }
    
    // Main function to start the game
    startGame() {
        try {
            // Make sure we have a valid config
            if (!this.config) {
                console.warn('Config is undefined in startGame, creating default');
                this.config = window.defaultGameConfig || {
                    itemCount: 5,
                    speedMultiplier: 1,
                    itemSize: 30,
                    chartRefreshRate: 1,
                    realtimeChart: false,
                    motionBlur: false
                };
            }
            
            // Update UI elements based on config
            this.updateUIFromConfig();
            
            // Start the game loop
            this.startRound();
            this.animate();
        } catch(error) {
            console.error('Error starting game:', error);
        }
    }
    
    // Update UI elements based on current config
    updateUIFromConfig() {
        try {
            // If no config is available, don't attempt to update UI
            if (!this.config) {
                console.warn('No config available to update UI');
                return;
            }
            
            // Update input elements with current config values
            const itemCountInput = document.getElementById('itemCount');
            const speedInput = document.getElementById('speedMultiplier');
            const sizeInput = document.getElementById('itemSize');
            const chartRefreshInput = document.getElementById('chartRefreshRate');
            const realtimeChartInput = document.getElementById('realtimeToggle');
            const motionBlurInput = document.getElementById('motionBlurToggle');
            const glowEnabledInput = document.getElementById('glowEnabledToggle');
            const randomVariationToggle = document.getElementById('randomVariationToggle');
            
            // Set input values from config
            if (itemCountInput) itemCountInput.value = this.config.itemCount;
            if (speedInput) speedInput.value = this.config.speedMultiplier;
            if (sizeInput) sizeInput.value = this.config.itemSize;
            if (chartRefreshInput) chartRefreshInput.value = this.config.chartRefreshRate;
            if (realtimeChartInput) realtimeChartInput.checked = this.config.realtimeChart;
            if (motionBlurInput) motionBlurInput.checked = this.config.motionBlur;
            if (glowEnabledInput) glowEnabledInput.checked = this.config.glowEnabled;
            if (randomVariationToggle) {
                randomVariationToggle.checked = this.config.randomVariation;
                
                // If random variation is enabled, disable the variation selector
                const variationSelector = document.getElementById('variationSelector');
                if (variationSelector) {
                    variationSelector.disabled = this.config.randomVariation;
                }
            }
            
            // Update item count display
            const itemCountValue = document.getElementById('itemCountValue');
            if (itemCountValue) {
                itemCountValue.textContent = this.config.itemCount;
                // Add per type label for clarity
                itemCountValue.setAttribute('title', `${this.config.itemCount} items per type`);
            }
            
            // Update speed display
            const speedValue = document.getElementById('speedValue');
            if (speedValue) speedValue.textContent = this.config.speedMultiplier + 'x';
            
            // Update size display
            const sizeValue = document.getElementById('sizeValue');
            if (sizeValue) sizeValue.textContent = this.config.itemSize;
            
            // Update chart/graph configurations
            if (this.graphManager && typeof this.graphManager.updateConfig === 'function') {
                this.graphManager.updateConfig({
                    realtimeChart: this.config.realtimeChart,
                    chartRefreshRate: this.config.chartRefreshRate
                });
            }
        } catch (error) {
            console.error('Error updating UI from config:', error);
        }
    }
    
    // Create variation cards for display in UI
    createVariationCards(container) {
        if (!container) {
            console.warn('No container provided for variation cards');
            return;
        }
        
        // Clear existing cards
        container.innerHTML = '';
        
        try {
            // Create a card for each variation
            Object.entries(VARIATIONS).forEach(([key, variation]) => {
                // Create card element
                const card = document.createElement('div');
                card.className = 'variation-card';
                card.dataset.variation = key;
                
                // Highlight current variation
                if (key === CURRENT_VARIATION) {
                    card.classList.add('active');
                }
                
                // Get the emoji symbols for this variation
                const emojis = Object.values(variation.types).join(' ');
                
                // Create card content
                card.innerHTML = `
                    <div class="card-emojis">${emojis}</div>
                    <div class="card-name">${variation.name}</div>
                `;
                
                // Add click handler to switch variations
                card.addEventListener('click', () => {
                    this.changeVariation(key);
                    
                    // Update active state on all cards
                    document.querySelectorAll('.variation-card').forEach(c => {
                        c.classList.toggle('active', c.dataset.variation === key);
                    });
                });
                
                // Add card to container
                container.appendChild(card);
            });
        } catch (error) {
            console.error('Error creating variation cards:', error);
        }
    }

    // Resize the canvas to fill browser window
    resizeCanvas() {
        if (!this.canvas) return;
        
        this.canvas.width = this.canvas.parentElement.clientWidth || window.innerWidth;
        this.canvas.height = window.innerHeight - 60; // Subtract for navbar
        
        // Adjust chart and graph dimensions
        if (this.chartManager && typeof this.chartManager.adjustDimensions === 'function') {
            this.chartManager.adjustDimensions();
        }
        
        if (this.graphManager && typeof this.graphManager.adjustDimensions === 'function') {
            this.graphManager.adjustDimensions();
        }
    }

    // Handle tab changes
    handleTabChange(tabId) {
        // Notify managers of tab change
        if (this.chartManager) {
            this.chartManager.handleTabChange(tabId);
        }
        
        if (this.graphManager) {
            this.graphManager.handleTabChange(tabId);
        }
    }
}

export { Game }; 