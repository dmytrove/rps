const TYPES = {
    ROCK: '🗿',
    PAPER: '📰',
    SCISSORS: '✂️'
};

class Glow {
    constructor(x, y, fromType, toType) {
        this.x = x;
        this.y = y;
        this.radius = 40;
        this.alpha = 1;
        this.fadeSpeed = 0.05;
        
        // Set color based on transformation type
        if (fromType === 'rock' && toType === 'paper') {
            this.color = '#3b82f6'; // Blue for paper winning
        } else if (fromType === 'paper' && toType === 'scissors') {
            this.color = '#22c55e'; // Green for scissors winning
        } else if (fromType === 'scissors' && toType === 'rock') {
            this.color = '#ef4444'; // Red for rock winning
        }
    }

    update() {
        this.alpha -= this.fadeSpeed;
        return this.alpha > 0;
    }

    draw(ctx) {
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
        gradient.addColorStop(0, `${this.color}${Math.round(this.alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, `${this.color}00`);
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

class Item {
    constructor(type, x, y, size, speedMultiplier = 1) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.size = size;
        this.rotation = Math.random() * Math.PI * 2;
        this.speed = {
            x: (Math.random() - 0.5) * 4 * speedMultiplier,
            y: (Math.random() - 0.5) * 4 * speedMultiplier
        };
        this.rotationSpeed = (Math.random() - 0.5) * 0.1 * speedMultiplier;
    }

    update(canvas) {
        // Move
        this.x += this.speed.x;
        this.y += this.speed.y;
        this.rotation += this.rotationSpeed;

        // Bounce off walls
        if (this.x < this.size || this.x > canvas.width - this.size) {
            this.speed.x *= -1;
        }
        if (this.y < this.size || this.y > canvas.height - this.size) {
            this.speed.y *= -1;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw using emojis instead of Font Awesome icons
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TYPES[this.type], 0, 0);
        
        ctx.restore();
    }

    getColor() {
        switch (this.type) {
            case 'rock': return '#ef4444';
            case 'paper': return '#3b82f6';
            case 'scissors': return '#22c55e';
            default: return 'white';
        }
    }

    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + other.size;
    }

    beats(other) {
        return (this.type === 'rock' && other.type === 'scissors') ||
               (this.type === 'paper' && other.type === 'rock') ||
               (this.type === 'scissors' && other.type === 'paper');
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.items = []; // Ensure items is initialized as an empty array first
        this.glowEffects = []; // Also initialize glowEffects early
        
        // Configuration
        this.config = {
            itemCount: 5,
            speedMultiplier: 1,
            itemSize: 30,
            chartRefreshRate: 1,
            realtimeChart: false
        };

        this.lastChartUpdate = 0;
        this.chartVisible = true;

        // Distribution tracking
        this.distributionData = {
            labels: [],
            rock: [],
            paper: [],
            scissors: []
        };
        
        this.roundStartTime = Date.now();
        this.roundHistory = [];
        this.initialDistribution = null;
        
        this.setupChart();
        this.setupControlsToggle();
        this.setupHistoryToggle();

        // Setup controls
        this.setupControls();
        
        // Setup Audio Context
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.setupAudio();
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.startRound();
        this.animate();
        this.isMuted = false;
        this.notificationTimeout = null;
    }

    setupControlsToggle() {
        const toggleBtn = document.getElementById('toggleControlsBtn');
        const controlsPanel = document.getElementById('controlsPanel');
        
        toggleBtn.addEventListener('click', () => {
            controlsPanel.classList.toggle('hidden');
            this.updateChartSize();
        });
        
        const toggleChartBtn = document.getElementById('toggleChartBtn');
        const graphContainer = document.getElementById('graphContainer');
        
        toggleChartBtn.addEventListener('click', () => {
            this.chartVisible = !this.chartVisible;
            graphContainer.classList.toggle('hidden', !this.chartVisible);
            this.updateChartSize();
            if (this.chartVisible && this.chart) {
                this.chart.update('none');
            }
        });
    }

    setupHistoryToggle() {
        const toggleHistoryBtn = document.getElementById('toggleHistoryBtn');
        const historyContainer = document.getElementById('historyContainer');
        
        toggleHistoryBtn.addEventListener('click', () => {
            historyContainer.classList.toggle('hidden');
            this.updateChartSize();
        });
    }

    updateChartSize() {
        if (this.chart) {
            this.chart.resize();
        }
    }

    setupChart() {
        const ctx = document.getElementById('distributionGraph').getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [
                    {
                        label: 'Rock',
                        borderColor: '#ef4444',
                        data: [],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Paper',
                        borderColor: '#3b82f6',
                        data: [],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 0
                    },
                    {
                        label: 'Scissors',
                        borderColor: '#22c55e',
                        data: [],
                        tension: 0.3,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        },
                        ticks: {
                            color: 'white',
                            stepSize: 1
                        }
                    },
                    x: {
                        type: 'linear',
                        display: true,
                        title: {
                            display: true,
                            text: 'Seconds',
                            color: 'white'
                        },
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: 'white',
                            maxRotation: 0,
                            callback: (value) => value.toFixed(1)
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: 'white',
                            boxWidth: 15
                        }
                    }
                }
            }
        });
    }

    setupControls() {
        // Item count control
        const itemCountInput = document.getElementById('itemCount');
        const itemCountValue = document.getElementById('itemCountValue');
        itemCountInput.addEventListener('input', () => {
            this.config.itemCount = parseInt(itemCountInput.value);
            itemCountValue.textContent = itemCountInput.value;
        });

        // Speed control
        const speedInput = document.getElementById('speedMultiplier');
        const speedValue = document.getElementById('speedValue');
        speedInput.addEventListener('input', () => {
            this.config.speedMultiplier = parseFloat(speedInput.value);
            speedValue.textContent = speedInput.value + 'x';
        });

        // Size control
        const sizeInput = document.getElementById('itemSize');
        const sizeValue = document.getElementById('sizeValue');
        sizeInput.addEventListener('input', () => {
            this.config.itemSize = parseInt(sizeInput.value);
            sizeValue.textContent = sizeInput.value;
        });

        // Chart refresh rate control
        const refreshRateInput = document.getElementById('chartRefreshRate');
        const refreshRateValue = document.getElementById('refreshRateValue');
        const realtimeToggle = document.getElementById('realtimeToggle');
        
        refreshRateInput.addEventListener('input', () => {
            this.config.chartRefreshRate = parseFloat(refreshRateInput.value);
            refreshRateValue.textContent = refreshRateInput.value + 's';
        });

        realtimeToggle.addEventListener('change', () => {
            this.config.realtimeChart = realtimeToggle.checked;
            if (realtimeToggle.checked) {
                refreshRateInput.disabled = true;
                refreshRateValue.textContent = 'realtime';
            } else {
                refreshRateInput.disabled = false;
                refreshRateValue.textContent = this.config.chartRefreshRate + 's';
            }
        });

        // Restart button
        const restartBtn = document.getElementById('restartBtn');
        restartBtn.addEventListener('click', () => this.startRound());

        // Mute button control
        const muteBtn = document.getElementById('muteBtn');
        muteBtn.addEventListener('click', () => {
            this.isMuted = !this.isMuted;
            const icon = muteBtn.querySelector('i');
            icon.className = this.isMuted ? 'fas fa-volume-mute text-xl' : 'fas fa-volume-up text-xl';
            
            if (this.masterGain) {
                this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
            }
        });
    }

    setupAudio() {
        // Create gain node to control volume
        this.masterGain = this.audioContext.createGain();
        this.masterGain.gain.value = 0.3; // Set volume to 30%
        this.masterGain.connect(this.audioContext.destination);
    }

    playCollisionSound(fromType, toType) {
        if (this.isMuted) return;
        
        // Create oscillator
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        
        // Set frequency based on transformation
        let frequency;
        if (fromType === 'rock' && toType === 'paper') frequency = 440; // A4
        else if (fromType === 'paper' && toType === 'scissors') frequency = 523.25; // C5
        else if (fromType === 'scissors' && toType === 'rock') frequency = 329.63; // E4
        
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        
        // Setup envelope
        gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
        
        // Connect nodes
        oscillator.connect(gainNode);
        gainNode.connect(this.masterGain);
        
        // Play sound
        oscillator.start();
        oscillator.stop(this.audioContext.currentTime + 0.3);
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    startRound() {
        // Clear chart data at start of round
        if (this.chart) {
            this.chart.data.labels = [];
            this.chart.data.datasets.forEach(dataset => {
                dataset.data = [];
            });
        }

        if (this.chart?.data.labels.length > 0) {
            // Mark the round end in the chart
            this.roundEndIndex = this.chart.data.labels.length - 1;
        }
        this.roundStartTime = Date.now();
        this.items = [];
        this.roundEndProcessed = false;
        
        const types = ['rock', 'paper', 'scissors'];
        const initialCounts = { rock: 0, paper: 0, scissors: 0 };
        
        types.forEach(type => {
            for (let i = 0; i < this.config.itemCount; i++) {
                const x = Math.random() * (this.canvas.width - 60) + 30;
                const y = Math.random() * (this.canvas.height - 60) + 30;
                this.items.push(new Item(type, x, y, this.config.itemSize, this.config.speedMultiplier));
                initialCounts[type]++;
            }
        });

        // Use Font Awesome icons for initial distribution
        this.initialDistribution = `
            <i class="fas fa-gem" style="color: #ef4444"></i>${initialCounts.rock}
            <i class="fas fa-file" style="color: #3b82f6"></i>${initialCounts.paper}
            <i class="fas fa-scissors" style="color: #22c55e"></i>${initialCounts.scissors}
        `;
    }

    addRoundToHistory(winner) {
        const duration = ((Date.now() - this.roundStartTime) / 1000).toFixed(1);
        const time = new Date().toLocaleTimeString();
        
        this.roundHistory.unshift({
            time,
            winner,
            duration,
            initialDistribution: this.initialDistribution
        });

        // Update the history table
        const tbody = document.getElementById('historyTableBody');
        const row = document.createElement('tr');
        row.className = 'border-bottom border-secondary';
        
        // Use Font Awesome icons with colors matching the game items
        const winnerIcon = winner === 'rock' ? 'fa-gem' : winner === 'paper' ? 'fa-file' : 'fa-scissors';
        const winnerColor = winner === 'rock' ? '#ef4444' : winner === 'paper' ? '#3b82f6' : '#22c55e';
        
        row.innerHTML = `
            <td>${time}</td>
            <td class="text-center">
                <i class="fas ${winnerIcon}" style="color: ${winnerColor}"></i>
            </td>
            <td class="text-center">${duration}s</td>
            <td class="text-end">${this.initialDistribution}</td>
        `;
        tbody.insertBefore(row, tbody.firstChild);
        
        // Keep only last 50 rounds
        if (this.roundHistory.length > 50) {
            this.roundHistory.pop();
            if (tbody.lastChild) {
                tbody.removeChild(tbody.lastChild);
            }
        }
    }

    showWinnerNotification(winner) {
        // Clear any existing notification
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }

        // Create or get notification element
        let notification = document.getElementById('winnerNotification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'winnerNotification';
            notification.className = 'position-fixed top-50 start-50 translate-middle ' +
                                  'bg-dark text-white px-4 py-3 rounded shadow-lg fs-3 ' +
                                  'opacity-0';
            notification.style.transition = 'opacity 0.5s';
            document.body.appendChild(notification);
        }

        // Set winner message with Font Awesome icon
        const icon = winner === 'rock' ? 'fa-gem' : winner === 'paper' ? 'fa-file' : 'fa-scissors';
        const color = winner === 'rock' ? '#ef4444' : winner === 'paper' ? '#3b82f6' : '#22c55e';
        notification.innerHTML = `
            <i class="fas ${icon}" style="color: ${color}"></i>
            ${winner.charAt(0).toUpperCase() + winner.slice(1)} wins!
            <i class="fas ${icon}" style="color: ${color}"></i>
        `;
        
        // Show notification
        notification.style.opacity = '1';
        
        // Hide after 2 seconds
        this.notificationTimeout = setTimeout(() => {
            notification.style.opacity = '0';
        }, 2000);
    }

    update() {
        if (!Array.isArray(this.items)) {
            this.items = []; // Safety check: ensure items is always an array
            return;
        }

        // Update positions
        this.items.forEach(item => {
            // Update item size
            item.size = this.config.itemSize;
            item.update(this.canvas);
        });

        // Update and filter out finished glow effects
        this.glowEffects = this.glowEffects.filter(glow => glow.update());

        // Check collisions
        for (let i = 0; i < this.items.length; i++) {
            for (let j = i + 1; j < this.items.length; j++) {
                const itemA = this.items[i];
                const itemB = this.items[j];

                if (itemA.collidesWith(itemB)) {
                    // Bounce effect with speed limit
                    const dx = itemB.x - itemA.x;
                    const dy = itemB.y - itemA.y;
                    const angle = Math.atan2(dy, dx);
                    const baseSpeed = 5;
                    const maxSpeed = 8;
                    const speed = Math.min(baseSpeed * this.config.speedMultiplier, maxSpeed);
                    
                    itemA.speed.x = -Math.cos(angle) * speed;
                    itemA.speed.y = -Math.sin(angle) * speed;
                    itemB.speed.x = Math.cos(angle) * speed;
                    itemB.speed.y = Math.sin(angle) * speed;

                    if (itemA.beats(itemB)) {
                        const oldType = itemB.type;
                        itemB.type = itemA.type;
                        this.playCollisionSound(oldType, itemB.type);
                        // Add glow effect at collision point
                        this.glowEffects.push(new Glow(
                            (itemA.x + itemB.x) / 2,
                            (itemA.y + itemB.y) / 2,
                            oldType,
                            itemB.type
                        ));
                    } else if (itemB.beats(itemA)) {
                        const oldType = itemA.type;
                        itemA.type = itemB.type;
                        this.playCollisionSound(oldType, itemA.type);
                        // Add glow effect at collision point
                        this.glowEffects.push(new Glow(
                            (itemA.x + itemB.x) / 2,
                            (itemA.y + itemB.y) / 2,
                            oldType,
                            itemA.type
                        ));
                    }
                }
            }
        }

        // Update distribution chart based on refresh rate or realtime setting
        const currentTime = Date.now();
        if (this.config.realtimeChart || currentTime - this.lastChartUpdate >= this.config.chartRefreshRate * 1000) {
            this.updateDistributionChart();
            this.lastChartUpdate = currentTime;
        }

        // Check if round is over (all items are the same type)
        if (this.items.length > 0) {
            const firstType = this.items[0].type;
            if (this.items.every(item => item.type === firstType) && !this.roundEndProcessed) {
                this.roundEndProcessed = true;
                this.addRoundToHistory(firstType);
                this.showWinnerNotification(firstType);
                setTimeout(() => this.startRound(), 2000);
            }
        }
    }

    updateDistributionChart() {
        if (!this.items || !Array.isArray(this.items)) {
            return;
        }

        const counts = {
            rock: this.items.filter(item => item.type === 'rock').length,
            paper: this.items.filter(item => item.type === 'paper').length,
            scissors: this.items.filter(item => item.type === 'scissors').length
        };

        const timeInSeconds = (Date.now() - this.roundStartTime) / 1000;
        
        // Add data points
        this.chart.data.datasets[0].data.push({x: timeInSeconds, y: counts.rock});
        this.chart.data.datasets[1].data.push({x: timeInSeconds, y: counts.paper});
        this.chart.data.datasets[2].data.push({x: timeInSeconds, y: counts.scissors});
        
        this.chart.update('none');
    }

    draw() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw glow effects first so they appear behind items
        this.glowEffects.forEach(glow => glow.draw(this.ctx));
        
        // Draw items
        this.items.forEach(item => item.draw(this.ctx));
    }

    animate() {
        this.update();
        this.draw();
        requestAnimationFrame(() => this.animate());
    }

    resetChartData() {
        if (this.chart) {
            // Only reset if the chart has more than 1000 data points
            if (this.chart.data.labels.length > 1000) {
                this.chart.data.labels = [];
                this.chart.data.datasets.forEach(dataset => {
                    dataset.data = [];
                });
                this.roundEndIndex = undefined;
            }
            this.chart.update();
        }
    }
}

// Start the game when the page loads
window.onload = () => new Game();