// Script to handle modal tab navigation
document.addEventListener('DOMContentLoaded', function() {
    // Make modal draggable
    makeDraggable();
    
    // Handle tab navigation
    setupTabNavigation();
    
    // Handle direct tab opening
    setupTabOpeners();
    
    // Set up auto-refresh for charts
    setupChartRefresh();
    
    // Handle modal for mobile devices
    setupMobileModal();
});

// Make the modal draggable
function makeDraggable() {
    const modalElement = document.querySelector('#settingsModal .modal-content');
    let isDragging = false;
    let currentX;
    let currentY;
    let initialX;
    let initialY;
    let xOffset = 0;
    let yOffset = 0;
    
    // Check if we're on a mobile device
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    
    // Don't make modal draggable on mobile
    if (isMobile) {
        document.querySelector('.draggable-modal')?.classList.remove('draggable-modal');
        return;
    }
    
    // Set up drag handlers only on desktop
    const dragStart = function(e) {
        // Only allow dragging from the header
        if (!e.target.closest('.modal-header')) return;
        
        const evt = e.type === "touchstart" ? e.touches[0] : e;
        initialX = evt.clientX - xOffset;
        initialY = evt.clientY - yOffset;
        
        isDragging = true;
    };
    
    const drag = function(e) {
        if (!isDragging) return;
        e.preventDefault();
        
        const evt = e.type === "touchmove" ? e.touches[0] : e;
        currentX = evt.clientX - initialX;
        currentY = evt.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        setTranslate(currentX, currentY, modalElement);
    };
    
    const dragEnd = function() {
        initialX = currentX;
        initialY = currentY;
        isDragging = false;
    };
    
    const setTranslate = function(xPos, yPos, el) {
        el.style.transform = `translate3d(${xPos}px, ${yPos}px, 0)`;
    };
    
    if (modalElement) {
        modalElement.addEventListener("mousedown", dragStart, false);
        modalElement.addEventListener("touchstart", dragStart, { passive: true });
        
        document.addEventListener("mousemove", drag, false);
        document.addEventListener("touchmove", drag, { passive: false });
        
        document.addEventListener("mouseup", dragEnd, false);
        document.addEventListener("touchend", dragEnd, false);
    }
}

// Setup tab navigation
function setupTabNavigation() {
    const settingsModal = document.getElementById('settingsModal');
    if (!settingsModal) return;

    // Add listeners for tab events
    const tabs = document.querySelectorAll('button[data-bs-toggle="tab"]');
    tabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function(event) {
            // If this is the variations tab, ensure the game instance updates the rules graph
            if (this.id === 'variations-tab' && window.gameInstance) {
                // First let the tab become fully visible
                setTimeout(() => {
                    // Try both direct update and through chartManager
                    window.gameInstance.updateRulesGraph(window.gameInstance.currentVariation);
                    
                    if (window.gameInstance.chartManager) {
                        window.gameInstance.chartManager.handleTabChange('variations');
                    }
                    
                    console.log('Tab change handler refreshed variations graph');
                }, 250);
            }
        });
    });
    
    // When the modal is shown, activate the stored tab
    settingsModal.addEventListener('shown.bs.modal', function() {
        const activeTabId = this.getAttribute('data-active-tab');
        if (activeTabId) {
            const tab = document.querySelector(`#${activeTabId}`);
            if (tab) {
                const bsTab = new bootstrap.Tab(tab);
                bsTab.show();
            }
        }
    });
}

// Setup tab openers
function setupTabOpeners() {
    // Handle direct navigation to specific tabs
    const settingsModal = document.getElementById('settingsModal');
    
    document.querySelectorAll('[data-bs-toggle="modal"][data-bs-tab]').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-bs-tab');
            
            // Store the tab ID to be activated when the modal is shown
            settingsModal.setAttribute('data-active-tab', tabId);
            
            setTimeout(() => {
                const tab = document.querySelector(`#${tabId}`);
                if (tab) {
                    const bsTab = new bootstrap.Tab(tab);
                    bsTab.show();
                }
            }, 100);
        });
    });
}

// Setup auto-refresh for chart
function setupChartRefresh() {
    // Handle chart refresh logic from the original code
    const realtimeToggle = document.getElementById('realtimeToggle');
    const refreshBadge = document.querySelector('.refresh-control .badge');
    
    if (realtimeToggle && window.gameInstance) {
        realtimeToggle.addEventListener('change', function() {
            window.gameInstance.config.realtimeChart = this.checked;
            
            // Set refresh rate based on toggle:
            // - When checked (RT): set to 60 (realtime/60fps)
            // - When unchecked (1s): set to 1 (once per second)
            const refreshRate = this.checked ? 60 : 1;
            window.gameInstance.config.chartRefreshRate = refreshRate;
            
            // Apply the settings to the GraphManager
            if (window.gameInstance.graphManager) {
                window.gameInstance.graphManager.config.realtimeCharting = this.checked;
                window.gameInstance.graphManager.config.refreshRate = refreshRate;
                console.log(`Real-time charting set to: ${this.checked}, refresh rate: ${refreshRate}`);
                
                // Reset the update timer to ensure immediate effect
                window.gameInstance.graphManager.lastUpdateTime = Date.now();
            }
            
            // Update the badge text
            if (refreshBadge) {
                refreshBadge.textContent = this.checked ? 'RT' : '1s';
            }
        });
        
        // Initialize the toggle with the current setting
        if (window.gameInstance.config) {
            realtimeToggle.checked = window.gameInstance.config.realtimeChart || false;
            
            // Update badge on initialization
            if (refreshBadge) {
                refreshBadge.textContent = realtimeToggle.checked ? 'RT' : '1s';
            }
        }
    }
}

// Setup mobile-specific modal behavior
function setupMobileModal() {
    const modal = document.getElementById('settingsModal');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || 
                    (window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
    
    if (modal && isMobile) {
        // Ensure modal doesn't allow dragging on mobile
        modal.querySelector('.modal-dialog')?.classList.remove('draggable-modal');
        modal.querySelector('.modal-dialog')?.classList.add('mobile-friendly-modal');
        
        // Fix for iOS Safari address bar issues
        window.addEventListener('resize', () => {
            // Set modal max-height based on viewport
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.style.maxHeight = `${window.innerHeight * 0.7}px`;
            }
        });
        
        // Trigger resize on modal open to set proper heights
        modal.addEventListener('shown.bs.modal', () => {
            window.dispatchEvent(new Event('resize'));
        });
    }
}
