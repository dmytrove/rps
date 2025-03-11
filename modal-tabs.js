// Script to handle modal tab navigation
document.addEventListener('DOMContentLoaded', function() {
    // More reliable device detection
    const isMobileDevice = detectMobileDevice();
    
    // Ensure Bootstrap is properly loaded
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded. Loading essential functionality...');
        setupBasicModalFunctionality();
    } else {
        // Only make modal draggable on non-mobile devices
        if (!isMobileDevice) {
            makeDraggable();
        }
        
        // Handle tab navigation
        setupTabNavigation();
        
        // Handle direct tab opening
        setupTabOpeners();
        
        // Set up auto-refresh for charts
        setupChartRefresh();
    }
    
    // Handle modal for mobile devices - this should work regardless of Bootstrap
    setupMobileModal(isMobileDevice);
    
    // Handle viewport resizing and orientation changes
    handleViewportChanges();
    
    // Add touch-friendly event handlers
    enhanceTouchInteractions();
});

// Better mobile device detection
function detectMobileDevice() {
    // Check for touch capability
    const hasTouch = 'ontouchstart' in window || 
                     navigator.maxTouchPoints > 0 ||
                     navigator.msMaxTouchPoints > 0;
                     
    // Check for mobile user agent
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // Check viewport size
    const isSmallViewport = window.matchMedia('(max-width: 768px)').matches;
    
    // Device is likely mobile if it has touch capability AND (has mobile UA OR small viewport)
    return hasTouch && (isMobileUA || isSmallViewport);
}

// Fallback for essential modal functionality if Bootstrap is not loaded
function setupBasicModalFunctionality() {
    // Get modal elements
    const modal = document.getElementById('settingsModal');
    const closeButtons = document.querySelectorAll('[data-bs-dismiss="modal"]');
    const modalOpeners = document.querySelectorAll('[data-bs-toggle="modal"]');
    
    if (!modal) return;
    
    // Add click handlers to open modal
    modalOpeners.forEach(opener => {
        opener.addEventListener('click', function() {
            modal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Handle tab activation if specified
            const tabId = this.getAttribute('data-bs-tab');
            if (tabId) {
                const tabButtons = document.querySelectorAll('.nav-link');
                const tabContents = document.querySelectorAll('.tab-pane');
                
                // Deactivate all tabs
                tabButtons.forEach(btn => btn.classList.remove('active'));
                tabContents.forEach(content => {
                    content.classList.remove('show');
                    content.classList.remove('active');
                });
                
                // Activate the selected tab
                const selectedTab = document.getElementById(tabId);
                if (selectedTab) {
                    selectedTab.classList.add('active');
                    const targetId = selectedTab.getAttribute('data-bs-target');
                    const targetContent = document.querySelector(targetId);
                    if (targetContent) {
                        targetContent.classList.add('show');
                        targetContent.classList.add('active');
                    }
                }
            }
        });
    });
    
    // Add click handlers to close modal
    closeButtons.forEach(button => {
        button.addEventListener('click', function() {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        });
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    });
}

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
function setupMobileModal(isMobile) {
    const modal = document.getElementById('settingsModal');
    
    if (!modal) return;
    
    const modalDialog = modal.querySelector('.modal-dialog');
    
    if (isMobile) {
        // Ensure modal doesn't allow dragging on mobile
        modalDialog?.classList.remove('draggable-modal');
        modalDialog?.classList.add('mobile-friendly-modal');
        
        // Apply mobile-specific styles directly to ensure they work
        if (modalDialog) {
            modalDialog.style.maxWidth = '95%';
            modalDialog.style.margin = '0.5rem auto';
            modalDialog.style.width = 'auto';
        }
        
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.borderRadius = '0.5rem';
            // Ensure backdrop filter works on GitHub Pages
            modalContent.style.backgroundColor = '#1a1f2c';
            modalContent.style.backgroundColor = 'rgba(26, 31, 44, 0.95)';
            modalContent.style.backdropFilter = 'blur(15px)';
            modalContent.style.webkitBackdropFilter = 'blur(15px)';
        }
        
        // Optimize touch scrolling
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.style.webkitOverflowScrolling = 'touch';
        }
        
        // Enhance UI for touch devices
        enhanceTouchFriendlyUI();
    }
    
    // Fix for iOS Safari address bar issues
    window.addEventListener('resize', () => {
        updateModalHeight(modal);
    });
    
    // Trigger resize on modal open to set proper heights
    if (typeof bootstrap !== 'undefined') {
        modal.addEventListener('shown.bs.modal', () => {
            updateModalHeight(modal);
            
            // Wait a moment for animations to complete
            setTimeout(() => {
                updateModalHeight(modal);
            }, 300);
        });
    } else {
        // Fallback for when Bootstrap is not available
        const modalOpeners = document.querySelectorAll('[data-bs-toggle="modal"]');
        modalOpeners.forEach(opener => {
            opener.addEventListener('click', () => {
                setTimeout(() => {
                    updateModalHeight(modal);
                }, 300);
            });
        });
    }
}

// Function to update modal height based on viewport
function updateModalHeight(modal) {
    if (!modal) return;
    
    // Get viewport height excluding virtual keyboard if possible
    const viewportHeight = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    
    // Set modal max-height based on viewport
    const modalBody = modal.querySelector('.modal-body');
    if (modalBody) {
        // Use 70% of viewport height for modal body
        modalBody.style.maxHeight = `${viewportHeight * 0.7}px`;
        modalBody.style.overflowY = 'auto';
    }
}

// Handle viewport and orientation changes
function handleViewportChanges() {
    // Handle orientation changes specifically
    window.addEventListener('orientationchange', () => {
        // Wait for the orientation change to complete
        setTimeout(() => {
            const modal = document.getElementById('settingsModal');
            updateModalHeight(modal);
            
            // Re-apply mobile styles if needed
            const isMobile = detectMobileDevice();
            setupMobileModal(isMobile);
        }, 300);
    });
    
    // Listen for visual viewport changes (handles keyboard appearance on mobile)
    if (window.visualViewport) {
        window.visualViewport.addEventListener('resize', () => {
            const modal = document.getElementById('settingsModal');
            updateModalHeight(modal);
        });
    }
}

// Enhance UI for touch-friendly interactions
function enhanceTouchFriendlyUI() {
    // Increase size of interactive elements for touch
    const touchTargets = document.querySelectorAll('.nav-link, .form-check-input, .btn-close');
    touchTargets.forEach(element => {
        const computedStyle = window.getComputedStyle(element);
        const currentPadding = parseInt(computedStyle.padding || '0', 10);
        
        // Only increase padding if it's not already large enough
        if (currentPadding < 10) {
            element.style.padding = '10px';
        }
    });
    
    // Improve tab navigation experience on touch
    const tabButtons = document.querySelectorAll('.nav-tabs .nav-link');
    tabButtons.forEach(button => {
        button.style.fontSize = '16px';
        button.style.padding = '12px 15px';
    });
}

// Add touch-specific event handlers
function enhanceTouchInteractions() {
    // Better handling for sliders
    const sliders = document.querySelectorAll('.form-range');
    sliders.forEach(slider => {
        // Provide visual feedback on touch
        slider.addEventListener('touchstart', () => {
            slider.style.opacity = '0.8';
        });
        
        slider.addEventListener('touchend', () => {
            slider.style.opacity = '1';
        });
    });
    
    // Better handling for buttons
    const buttons = document.querySelectorAll('.btn, .nav-link');
    buttons.forEach(button => {
        button.addEventListener('touchstart', () => {
            button.style.transform = 'scale(0.98)';
        });
        
        button.addEventListener('touchend', () => {
            button.style.transform = 'scale(1)';
        });
        
        // Clean up if touch moves away
        button.addEventListener('touchmove', () => {
            button.style.transform = 'scale(1)';
        });
    });
}
