import { VARIATIONS, CURRENT_VARIATION } from './utils.js';
import { createRulesSVG } from './rules-graph.js';

// Mapping of verbs to emoji
const VERB_TO_EMOJI = {
    "beats": "👊",
    "cuts": "✂️",
    "covers": "📜",
    "crushes": "💥",
    "smashes": "💪",
    "disproves": "🧠",
    "vaporizes": "💨",
    "burns": "🔥",
    "poisons": "☠️",
    "drowns": "💧",
    "eats": "🍽️"
};

/**
 * Manages the rules visualization SVG graph
 */
export class ChartManager {
    constructor(variationKey) {
        this.variationKey = variationKey;
        this.svgContainer = null;
        this.setupComplete = false;
        this.lastAttemptTime = 0;
        this.setupRetryDelay = 1000; // ms
    }

    /**
     * Set up the rules graph
     */
    setupChart() {
        // Target the SVG container - don't require the variations tab to be active
        this.svgContainer = document.getElementById('rulesGraph');
        if (!this.svgContainer) {
            console.warn('Rules graph container not found, will retry later');
            
            // Retry after a delay if container not found
            if (Date.now() - this.lastAttemptTime > this.setupRetryDelay) {
                this.lastAttemptTime = Date.now();
                setTimeout(() => this.setupChart(), this.setupRetryDelay);
            }
            return false;
        }

        // Clear any existing content
        this.svgContainer.innerHTML = '';
        
        // Generate the SVG graph
        this.generateSvgGraph(this.variationKey);
        this.setupComplete = true;
        console.log('Chart setup completed for variation:', this.variationKey);
        return true;
    }

    /**
     * Generate the SVG graph for the rules
     * @param {string} variationKey - The key of the current variation
     */
    generateSvgGraph(variationKey) {
        if (!this.svgContainer) return;

        // Clear previous content
        this.svgContainer.innerHTML = '';
        
        // Get the rules for the current variation
        const variation = VARIATIONS[variationKey];
        if (!variation) {
            console.error(`Variation ${variationKey} not found`);
            return;
        }
        
        const rules = variation.rules;
        if (!rules || !Array.isArray(rules)) {
            console.error(`Rules for variation ${variationKey} not found or invalid`);
            return;
        }
        
        // Debug log the rules
        console.log(`Generating SVG for variation ${variationKey}:`, {
            types: variation.types,
            rules: rules
        });
        
        // Get unique item types
        const types = [...new Set(rules.flatMap(rule => [rule.winner, rule.loser]))];
        
        // Debug log types
        console.log(`Extracted types: ${types.join(', ')}`);
        
        // Set up dimensions
        const containerWidth = this.svgContainer.clientWidth;
        const containerHeight = Math.max(350, containerWidth * 0.6);
        
        // Create SVG element
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("width", containerWidth);
        svg.setAttribute("height", containerHeight);
        svg.setAttribute("viewBox", `0 0 ${containerWidth} ${containerHeight}`);
        
        // Define constants for positioning
        const centerX = containerWidth / 2;
        const centerY = containerHeight / 2;
        const radius = Math.min(centerX, centerY) * 0.7;
        
        // Calculate positions for each node
        const nodePositions = {};
        const angleStep = (2 * Math.PI) / types.length;
        
        types.forEach((type, index) => {
            const angle = index * angleStep;
            const x = centerX + radius * Math.cos(angle);
            const y = centerY + radius * Math.sin(angle);
            nodePositions[type] = { x, y, angle };
        });
        
        // Add relationships (edges)
        rules.forEach(rule => {
            const pos1 = nodePositions[rule.winner];
            const pos2 = nodePositions[rule.loser];
            
            if (!pos1 || !pos2) {
                console.error(`Position not found for ${rule.winner} or ${rule.loser}`);
                return;
            }
            
            // Draw the arrow
            const midX = (pos1.x + pos2.x) / 2;
            const midY = (pos1.y + pos2.y) / 2;
            
            // Adjust start and end points to not overlap with nodes
            const angle = Math.atan2(pos2.y - pos1.y, pos2.x - pos1.x);
            const nodeRadius = 40;
            
            const startX = pos1.x + nodeRadius * Math.cos(angle);
            const startY = pos1.y + nodeRadius * Math.sin(angle);
            
            const endX = pos2.x - nodeRadius * Math.cos(angle);
            const endY = pos2.y - nodeRadius * Math.sin(angle);
            
            // Create a path element for the arrow
            const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
            path.setAttribute("d", `M ${startX} ${startY} L ${endX} ${endY}`);
            path.setAttribute("stroke", "#666");
            path.setAttribute("stroke-width", "2");
            path.setAttribute("marker-end", "url(#arrowhead)");
            path.classList.add("rule-edge");
            svg.appendChild(path);
            
            // Create verb label
            const verb = rule.verb || "beats";
            
            // Convert verb to emoji if available
            const verbEmoji = VERB_TO_EMOJI[verb] || "";
            
            // Create the verb text
            const verbText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            verbText.setAttribute("x", midX);
            verbText.setAttribute("y", midY);
            verbText.setAttribute("text-anchor", "middle");
            verbText.setAttribute("dominant-baseline", "middle");
            verbText.setAttribute("fill", "#444");
            verbText.setAttribute("font-size", "14px");
            verbText.classList.add("verb-text");
            
            // If we have an emoji for the verb, use it
            if (verbEmoji) {
                verbText.textContent = verbEmoji;
                verbText.setAttribute("font-size", "18px");
            } else {
                verbText.textContent = verb;
            }
            
            // Add background to make text more readable
            const textBbox = verbText.getBBox ? verbText.getBBox() : { width: 40, height: 20 };
            const textBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            textBg.setAttribute("x", midX - textBbox.width / 2 - 5);
            textBg.setAttribute("y", midY - textBbox.height / 2 - 3);
            textBg.setAttribute("width", textBbox.width + 10);
            textBg.setAttribute("height", textBbox.height + 6);
            textBg.setAttribute("fill", "rgba(255, 255, 255, 0.8)");
            textBg.setAttribute("rx", "5");
            svg.appendChild(textBg);
            svg.appendChild(verbText);
        });
        
        // Add arrowhead marker definition
        const defs = document.createElementNS("http://www.w3.org/2000/svg", "defs");
        const marker = document.createElementNS("http://www.w3.org/2000/svg", "marker");
        marker.setAttribute("id", "arrowhead");
        marker.setAttribute("markerWidth", "10");
        marker.setAttribute("markerHeight", "7");
        marker.setAttribute("refX", "9");
        marker.setAttribute("refY", "3.5");
        marker.setAttribute("orient", "auto");
        
        const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        polygon.setAttribute("points", "0 0, 10 3.5, 0 7");
        polygon.setAttribute("fill", "#666");
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        // Add nodes (after edges so they appear on top)
        types.forEach(type => {
            const pos = nodePositions[type];
            
            // Get emoji and color for this type directly from the variation
            // Convert type to uppercase to match the keys in variation.types and variation.colors
            const upperType = type.toUpperCase();
            const emoji = variation.types[upperType] || "❓";
            const color = variation.colors?.[upperType] || "#999";
            
            // Debug log
            console.log(`Creating node for type '${type}', upperType: '${upperType}', emoji: ${emoji}, color: ${color}`);
            
            // Create node circle
            const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
            circle.setAttribute("cx", pos.x);
            circle.setAttribute("cy", pos.y);
            circle.setAttribute("r", "40");
            circle.setAttribute("fill", color);
            circle.setAttribute("stroke", "#333");
            circle.setAttribute("stroke-width", "2");
            circle.classList.add("node-circle");
            circle.setAttribute("data-type", type);
            svg.appendChild(circle);
            
            // Create emoji
            const emojiText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            emojiText.setAttribute("x", pos.x);
            emojiText.setAttribute("y", pos.y - 5);
            emojiText.setAttribute("text-anchor", "middle");
            emojiText.setAttribute("dominant-baseline", "middle");
            emojiText.setAttribute("font-size", "24px");
            emojiText.textContent = emoji;
            emojiText.classList.add("node-emoji");
            svg.appendChild(emojiText);
            
            // Create type name
            const typeText = document.createElementNS("http://www.w3.org/2000/svg", "text");
            typeText.setAttribute("x", pos.x);
            typeText.setAttribute("y", pos.y + 20);
            typeText.setAttribute("text-anchor", "middle");
            typeText.setAttribute("dominant-baseline", "middle");
            typeText.setAttribute("fill", "#fff");
            typeText.setAttribute("font-size", "14px");
            typeText.setAttribute("font-weight", "bold");
            typeText.setAttribute("stroke", "#000");
            typeText.setAttribute("stroke-width", "0.5px");
            typeText.textContent = type;
            typeText.classList.add("node-name");
            svg.appendChild(typeText);
        });
        
        // Append the SVG to the container
        this.svgContainer.appendChild(svg);
    }

    /**
     * Change the variation displayed in the rules graph
     * @param {string} variationKey - The key of the variation to display
     */
    changeVariation(variationKey) {
        this.variationKey = variationKey;
        
        // Only regenerate if setup is complete
        if (this.setupComplete) {
            console.log('Regenerating SVG graph for variation:', variationKey);
            this.generateSvgGraph(variationKey);
        } else {
            console.warn('Cannot regenerate SVG graph - setup not complete. Will try to set up now.');
            this.setupChart();
        }
    }

    /**
     * Clean up the SVG graph
     */
    destroy() {
        if (this.svgContainer) {
            this.svgContainer.innerHTML = '';
        }
        this.setupComplete = false;
    }

    /**
     * Handle tab changes
     * @param {string} tabId - The ID of the tab that was activated
     */
    handleTabChange(tabId) {
        if (tabId === 'variations') {
            // If the variations tab is shown, ensure the graph is set up
            console.log('Variations tab activated, setting up chart');
            
            // Set a slightly longer timeout to ensure DOM is ready
            setTimeout(() => {
                if (!this.setupComplete) {
                    this.setupChart();
                } else {
                    // If already set up, regenerate with current variation
                    this.generateSvgGraph(this.variationKey);
                    console.log('Chart regenerated for current variation:', this.variationKey);
                }
            }, 200);
        }
    }

    /**
     * Adjust SVG dimensions when window is resized
     */
    adjustDimensions() {
        if (this.setupComplete && this.svgContainer) {
            // Regenerate the graph to resize it
            this.generateSvgGraph(this.variationKey);
        }
    }
} 