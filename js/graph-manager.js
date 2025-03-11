import { VARIATIONS, CURRENT_VARIATION, COLORS } from './utils.js';

/**
 * Manages the distribution graph showing counts of each item type over time
 */
export class GraphManager {
    constructor(config = {}) {
        this.chart = null;
        this.datasets = [];
        this.labels = [];
        this.config = {
            realtimeCharting: config.realtimeCharting || true,
            refreshRate: config.refreshRate || 30
        };
        this.frameCount = 0;
        this.setupComplete = false;
        this.lastAttemptTime = 0;
        this.setupRetryDelay = 1000; // ms
        this.timeWindow = 10; // Default to 10 seconds window (in 10s chunks)
        this.lastUpdateTime = null;
    }

    /**
     * Set up the distribution chart
     * @returns {boolean} Whether setup was successful
     */
    setupChart() {
        console.log('Setting up distribution chart');
        
        try {
            // Only set up the chart if the graph tab is available
            const graphTab = document.getElementById('graph-tab');
            
            if (!graphTab) {
                console.warn('Graph tab not found, chart setup delayed');
                return false;
            }
            
            // Get the canvas element for the chart
            const chartCanvas = document.getElementById('distributionGraph');
            
            if (!chartCanvas) {
                console.warn('Chart canvas element not found');
                return false;
            }
            
            // Check if 2D context is available
            const ctx = chartCanvas.getContext('2d');
            
            if (!ctx) {
                console.warn('Could not get 2D context for chart canvas');
                return false;
            }
            
            // If there's already a chart, destroy it to prevent memory leaks
            if (this.chart && typeof this.chart === 'object') {
                console.log('Destroying existing chart instance');
                try {
                    this.chart.destroy();
                } catch (err) {
                    console.error('Error destroying existing chart:', err);
                }
                this.chart = null;
            }
            
            // Make sure we have default datasets if none exist
            if (!this.datasets || this.datasets.length === 0) {
                // Create empty default datasets
                this.datasets = [];
                this.labels = ['0'];
            }
            
            // Configure and create the chart
            this.chart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: this.labels,
                    datasets: this.datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false, // Disable animations for better performance
                    plugins: {
                        title: {
                            display: true,
                            text: 'Item Distribution Over Time',
                            font: {
                                size: 16
                            }
                        },
                        legend: {
                            position: 'top',
                            labels: {
                                usePointStyle: true,
                                font: {
                                    size: 14
                                }
                            }
                        },
                        tooltip: {
                            enabled: true
                        }
                    },
                    scales: {
                        x: {
                            title: {
                                display: true,
                                text: `Time (seconds) - Showing 0-${this.timeWindow}s`,
                                font: {
                                    size: 14
                                }
                            },
                            min: 0,
                            max: this.timeWindow,
                            ticks: {
                                maxRotation: 0,
                                callback: function(value, index, values) {
                                    // Only show integer values for seconds
                                    return parseFloat(value).toFixed(0);
                                }
                            }
                        },
                        y: {
                            title: {
                                display: true,
                                text: 'Count',
                                font: {
                                    size: 14
                                }
                            },
                            min: 0,
                            suggestedMax: 10,
                            ticks: {
                                precision: 0 // Only show integer values
                            }
                        }
                    }
                }
            });
            
            console.log('Distribution chart created successfully');
            this.setupComplete = true;
            return true;
        } catch (error) {
            console.error('Error setting up chart:', error);
            this.setupComplete = false;
            return false;
        }
    }

    /**
     * Create datasets for the chart based on current item types
     * @param {Array} items - The game items
     */
    createDatasets(items) {
        console.log('Creating datasets for', items?.length || 0, 'items');
        
        if (!items || items.length === 0) {
            console.warn('No items provided to createDatasets');
            return;
        }
        
        // Reset datasets
        this.datasets = [];
        this.labels = [];
        
        // Reset time window to initial 10 seconds
        this.timeWindow = 10;
        
        // Get unique item types
        const uniqueTypes = [...new Set(items.map(item => item.type))];
        console.log('Unique item types:', uniqueTypes);
        
        // Get the current variation to access colors and emojis
        const game = window.gameInstance;
        const variation = game ? VARIATIONS[game.currentVariation] : null;
        
        // Create a dataset for each type
        uniqueTypes.forEach(type => {
            // Get emoji and color from the variation data
            const emoji = variation?.types[type] || '?';
            const color = variation?.colors[type] || '#000000';
            
            console.log(`Creating dataset for ${type} with color ${color}`);
            
            this.datasets.push({
                label: `${emoji} ${type}`,
                data: [],
                borderColor: color,
                backgroundColor: this.hexToRgba(color, 0.2),
                tension: 0.4,
                pointRadius: 0,  // Remove points, keep only lines
                borderWidth: 2,
                fill: true
            });
        });
        
        // Count initial items
        const counts = {};
        items.forEach(item => {
            counts[item.type] = (counts[item.type] || 0) + 1;
        });
        
        // Add initial data point
        this.labels.push('0');
        this.datasets.forEach(dataset => {
            const type = dataset.label.split(' ')[1];
            dataset.data.push(counts[type] || 0);
        });
        
        // If chart exists, update it
        if (this.chart && typeof this.chart === 'object' && !this.chart.destroyed) {
            try {
                // Make sure we're using the initial window display
                if (this.chart.options && this.chart.options.scales && this.chart.options.scales.x) {
                    this.chart.options.scales.x.min = 0;
                    this.chart.options.scales.x.max = this.timeWindow;
                    this.chart.options.scales.x.title.text = `Time (seconds) - Showing 0-${this.timeWindow}s`;
                }
                
                this.chart.data.labels = this.labels;
                this.chart.data.datasets = this.datasets;
                this.chart.update();
                console.log('Chart updated with new datasets');
            } catch (err) {
                console.error('Error updating chart with datasets:', err);
                // If we encounter an error, try to recreate the chart
                this.setupComplete = false;
            }
        } else {
            console.warn('Chart not available when trying to update datasets');
            // If the chart isn't available, mark setup as incomplete to trigger recreation
            this.setupComplete = false;
        }
    }

    /**
     * Convert hex color to rgba for transparency
     * @param {string} hex - Hex color code
     * @param {number} alpha - Alpha value
     * @returns {string} - RGBA color string
     */
    hexToRgba(hex, alpha = 1) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    /**
     * Update the distribution chart based on current item counts
     * @param {Array} items - The current items in the game
     * @param {Number} elapsedTime - Elapsed time since the round started
     */
    updateDistribution(items, elapsedTime) {
        // If real-time charting is disabled, do nothing
        if (!this.config.realtimeCharting) return;
        
        // For 1-second updates (vs. real-time), we'll use a different approach
        // Store the last update time if it hasn't been set
        if (!this.lastUpdateTime) {
            this.lastUpdateTime = Date.now();
        }
        
        const now = Date.now();
        const timeSinceLastUpdate = now - this.lastUpdateTime;
        
        // Real-time mode uses frame-based updates, 1s mode uses time-based updates
        const isTimeForUpdate = 
            (this.config.refreshRate === 60) ? // 60 = real-time
            (this.frameCount % 30 === 0) :     // For real-time, update every 30 frames
            (timeSinceLastUpdate >= 1000);     // For 1s mode, update every 1000ms
        
        // Increment frame counter regardless
        this.frameCount++;
        
        // Only update if it's time
        if (!isTimeForUpdate) return;
        
        // If 1s mode and time to update, reset the last update time
        if (this.config.refreshRate !== 60 && timeSinceLastUpdate >= 1000) {
            this.lastUpdateTime = now;
        }
        
        // If setup is not complete, try to set up the chart
        if (!this.setupComplete) {
            // Don't try to setup too frequently to avoid console spam
            if (now - this.lastAttemptTime > 1000) { // Only try once per second
                this.lastAttemptTime = now;
                this.setupChart();
                
                // If setup is still not complete after this attempt, return early
                if (!this.setupComplete) {
                    return;
                }
                
                // If we just succeeded in setup, recreate datasets
                if (items && items.length > 0) {
                    this.createDatasets(items);
                }
            }
            return;
        }
        
        // Check that chart exists and the graph tab is active
        if (!this.chart || typeof this.chart !== 'object' || this.chart.destroyed) {
            console.warn('Chart not available for distribution update');
            this.setupComplete = false;
            return;
        }
        
        // Check if the graph tab pane is active (since we're using Bootstrap tabs)
        const graphTabPane = document.getElementById('graph');
        if (!graphTabPane || !graphTabPane.classList.contains('active')) {
            // No need to update if the tab is not visible
            return;
        }
        
        try {
            // Get exact time in seconds with one decimal place
            const timeSeconds = Math.round(elapsedTime / 100) / 10;
            
            // Update labels with current time
            const timeLabel = timeSeconds.toFixed(1); // Format with one decimal place
            this.labels.push(timeLabel);
            
            // Count items by type
            const counts = {};
            items.forEach(item => {
                counts[item.type] = (counts[item.type] || 0) + 1;
            });
            
            // Update each dataset with current counts
            this.datasets.forEach(dataset => {
                const type = dataset.label.split(' ')[1];
                dataset.data.push(counts[type] || 0);
            });
            
            // If we've exceeded our time window, expand it
            if (timeSeconds > this.timeWindow) {
                // Increase the time window by 10 seconds
                this.timeWindow += 10;
                console.log(`Expanding visible time window to ${this.timeWindow}s`);
                
                // Update the x-axis max value
                if (this.chart.options && this.chart.options.scales && this.chart.options.scales.x) {
                    this.chart.options.scales.x.max = this.timeWindow;
                    this.chart.options.scales.x.title.text = `Time (seconds) - Showing 0-${this.timeWindow}s`;
                }
            }
            
            // Update chart data and render
            if (this.chart && this.chart.data) {
                this.chart.data.labels = this.labels;
                this.chart.data.datasets = this.datasets;
                this.chart.update();
            } else {
                console.warn('Chart or chart data not available for update');
                this.setupComplete = false;
            }
        } catch (err) {
            console.error('Error updating chart distribution:', err);
            // If there's an error, mark setup as incomplete to trigger chart recreation
            this.setupComplete = false;
        }
    }

    /**
     * Reset the distribution chart
     */
    resetChart() {
        if (!this.chart) return;
        
        // Reset data
        this.labels = [];
        this.datasets.forEach(dataset => {
            dataset.data = [];
        });
        
        // Reset time window to initial 10 seconds
        this.timeWindow = 10;
        
        // Reset chart display
        if (this.chart.options.scales.x) {
            // Reset the x-axis title text
            this.chart.options.scales.x.title.text = 'Time (seconds) - Showing 0-10s';
            // Reset the window boundaries
            this.chart.options.scales.x.min = 0;
            this.chart.options.scales.x.max = this.timeWindow;
        }
        
        // Update chart
        this.chart.data.labels = this.labels;
        this.chart.update();
        
        console.log('Chart reset with time window restored to 10 seconds');
    }

    /**
     * Clean up the chart instance
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.setupComplete = false;
    }

    /**
     * Handle tab change events
     * @param {Event} event - The tab change event
     */
    handleTabChange(event) {
        // Save the event data for debugging
        const targetId = event && event.target ? event.target.id : (typeof event === 'string' ? event : null);
        console.log('Tab changed:', targetId);
        
        // If switching to the graph tab, recreate the chart
        const isGraphTabActive = 
            (targetId === 'graph-tab') || 
            (targetId === 'graph') ||
            (event && typeof event === 'string' && event === 'graph');
            
        if (isGraphTabActive) {
            console.log('Graph tab is now active, recreating chart');
            
            // Clear any existing chart to prevent memory leaks
            if (this.chart && typeof this.chart === 'object') {
                try {
                    console.log('Destroying existing chart before recreation');
                    this.chart.destroy();
                    this.chart = null;
                } catch (err) {
                    console.error('Error destroying chart during tab change:', err);
                }
            }
            
            // Reset the setup flag
            this.setupComplete = false;
            
            // Use setTimeout to ensure the DOM is ready
            setTimeout(() => {
                try {
                    // Try to set up the chart
                    const success = this.setupChart();
                    console.log('Chart setup ' + (success ? 'successful' : 'failed'));
                    
                    // If setup is successful and we have game items, recreate datasets
                    if (success && window.gameInstance && window.gameInstance.items && window.gameInstance.items.length > 0) {
                        console.log('Recreating datasets with current game items');
                        this.createDatasets(window.gameInstance.items);
                    }
                } catch (err) {
                    console.error('Error during delayed chart setup:', err);
                    this.setupComplete = false;
                }
            }, 250); // Slightly longer delay for DOM to be completely ready
        }
    }

    /**
     * Adjust chart dimensions when window is resized
     */
    adjustDimensions() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    /**
     * Update configuration
     * @param {Object} config - New configuration
     */
    updateConfig(config) {
        if (!config) return;
        
        // Update config properties
        if ('realtimeCharting' in config) {
            this.config.realtimeCharting = config.realtimeCharting;
        }
        
        if ('refreshRate' in config) {
            this.config.refreshRate = config.refreshRate;
        }
        
        console.log('GraphManager config updated:', this.config);
    }
} 
