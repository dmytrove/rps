/**
 * Rules Graph Generator
 * Provides functions to create SVG visualizations of game rules
 */

// Map of emoji icons for different game elements
const EMOJI_MAP = {
    'rock': '🪨',
    'paper': '📄',
    'scissors': '✂️',
    'lizard': '🦎',
    'spock': '🖖',
    'fire': '🔥',
    'water': '💧',
    'air': '💨',
    'earth': '🌍',
    'metal': '⚙️',
    'wood': '🌳',
    'sun': '☀️',
    'moon': '🌙',
    'monkey': '🐒',
    'ninja': '🥷',
    'robot': '🤖',
    'zombie': '🧟',
    'alien': '👽',
    'dinosaur': '🦖',
    'elder': '🧙‍♂️',
    'dragon': '🐉',
    'devil': '😈',
    'lightning': '⚡',
    'gun': '🔫',
    'human': '👤',
    'wolf': '🐺',
    'sponge': '🧽',
    'tree': '🌲',
    'bird': '🐦',
    'snake': '🐍',
    'axe': '🪓',
    'sword': '⚔️',
    'crown': '👑'
};

/**
 * Get emoji for the given item type
 * @param {string} type - The type of item
 * @param {Object} variationData - Optional variation data containing type emoji mapping
 * @returns {string} The emoji representing the type
 */
export function getEmojiForType(type, variationData = null) {
    // If variation data is provided, try to get emoji from there first
    if (variationData && variationData.types) {
        const upperType = type.toUpperCase();
        if (variationData.types[upperType]) {
            return variationData.types[upperType];
        }
    }
    
    // Fallback to predefined emoji map
    return EMOJI_MAP[type.toLowerCase()] || '❓';
}

/**
 * Get color for the given item type
 * @param {string} type - The type of item
 * @param {Object} variationData - Optional variation data containing type color mapping
 * @returns {string} The color for the type
 */
export function getColorForType(type, variationData = null) {
    // If variation data is provided with colors, use that
    if (variationData && variationData.colors) {
        const upperType = type.toUpperCase();
        if (variationData.colors[upperType]) {
            return variationData.colors[upperType];
        }
    }
    
    // Default colors based on type
    const defaultColors = {
        'rock': '#ef4444',      // Red
        'paper': '#3b82f6',     // Blue
        'scissors': '#22c55e',  // Green
        'fire': '#ef4444',      // Red
        'water': '#3b82f6',     // Blue
        'grass': '#22c55e',     // Green
        // Add more defaults as needed
    };
    
    return defaultColors[type.toLowerCase()] || '#2c3e50';  // Default dark blue
}

/**
 * Create an SVG representation of the rules
 * @param {Array} rules - The rules array containing winner, loser, and verb
 * @param {Object} variationData - Optional full variation data with types and colors
 * @returns {SVGElement} An SVG element visualizing the rules
 */
export function createRulesSVG(rules, variationData = null) {
    try {
        if (!rules || !Array.isArray(rules) || rules.length === 0) {
            console.warn('Invalid rules for creating SVG:', rules);
            throw new Error('Invalid rules data');
        }
        
        // Create SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'rules-graph');
        svg.setAttribute('id', 'rules-svg-' + Date.now()); // Add unique ID for debugging
        
        // Get unique types from rules
        const types = [...new Set(rules.flatMap(rule => [rule.winner, rule.loser]))];
        
        // Debug log
        console.log('Creating rules SVG with types:', types);
        
        // Use dimensions that work well for scaling
        const centerX = 400;
        const centerY = 300;
        // Adjust radius based on the number of types (more types need more space)
        const radius = Math.min(280, Math.max(180, 250 - (types.length > 5 ? (types.length - 5) * 15 : 0)));
        
        console.log(`Using radius ${radius} for ${types.length} types`);
        
        const positions = {};
        
        // Start angle from top (negative Y-axis) for better layout
        const startAngle = -Math.PI / 2;
        
        types.forEach((type, index) => {
            const angle = startAngle + (index / types.length) * 2 * Math.PI;
            positions[type] = {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle)
            };
        });
        
        // Draw nodes (circles for each type)
        types.forEach(type => {
            const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
            nodeGroup.setAttribute('class', 'node');
            
            // Create the circle
            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('class', 'node-circle');
            circle.setAttribute('cx', positions[type].x);
            circle.setAttribute('cy', positions[type].y);
            circle.setAttribute('r', 40);
            circle.setAttribute('fill', getColorForType(type, variationData));
            circle.setAttribute('stroke', '#3498db');
            circle.setAttribute('stroke-width', 3);
            
            // Text for type name
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('class', 'node-name');
            text.setAttribute('x', positions[type].x);
            text.setAttribute('y', positions[type].y + 65);
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('fill', '#ecf0f1');
            text.textContent = type;
            
            // Emoji for type
            const emoji = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            emoji.setAttribute('class', 'node-emoji');
            emoji.setAttribute('x', positions[type].x);
            emoji.setAttribute('y', positions[type].y + 15);
            emoji.setAttribute('text-anchor', 'middle');
            emoji.setAttribute('font-size', '32px');
            emoji.textContent = getEmojiForType(type, variationData);
            
            nodeGroup.appendChild(circle);
            nodeGroup.appendChild(text);
            nodeGroup.appendChild(emoji);
            svg.appendChild(nodeGroup);
        });
        
        // Draw edges (arrows between circles)
        rules.forEach(rule => {
            const winner = rule.winner;
            const loser = rule.loser;
            const verb = rule.verb || 'beats';
            
            if (!positions[winner] || !positions[loser]) {
                console.warn(`Missing position for ${winner} or ${loser}`);
                return;
            }
            
            // Calculate path
            const startX = positions[winner].x;
            const startY = positions[winner].y;
            const endX = positions[loser].x;
            const endY = positions[loser].y;
            
            // Calculate direction vector
            const dx = endX - startX;
            const dy = endY - startY;
            const len = Math.sqrt(dx * dx + dy * dy);
            const normDx = dx / len;
            const normDy = dy / len;
            
            // Adjust start and end points to be on the circle's edge
            const startRadius = 45; // circle radius + padding
            const endRadius = 45;
            
            const adjustedStartX = startX + normDx * startRadius;
            const adjustedStartY = startY + normDy * startRadius;
            const adjustedEndX = endX - normDx * endRadius;
            const adjustedEndY = endY - normDy * endRadius;
            
            // Create path
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'rule-path');
            path.setAttribute('d', `M ${adjustedStartX} ${adjustedStartY} L ${adjustedEndX} ${adjustedEndY}`);
            path.setAttribute('stroke', '#e74c3c');
            path.setAttribute('stroke-width', 3);
            path.setAttribute('marker-end', 'url(#arrowhead)');
            path.setAttribute('fill', 'none');
            
            // Add a text label for the verb
            const midX = (adjustedStartX + adjustedEndX) / 2;
            const midY = (adjustedStartY + adjustedEndY) / 2;
            
            const textBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
            textBg.setAttribute('x', midX - 40);
            textBg.setAttribute('y', midY - 20);
            textBg.setAttribute('width', 80);
            textBg.setAttribute('height', 30);
            textBg.setAttribute('rx', 5);
            textBg.setAttribute('ry', 5);
            textBg.setAttribute('fill', 'rgba(44, 62, 80, 0.8)');
            
            const verbText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            verbText.setAttribute('class', 'verb-text');
            verbText.setAttribute('x', midX);
            verbText.setAttribute('y', midY);
            verbText.setAttribute('text-anchor', 'middle');
            verbText.setAttribute('dominant-baseline', 'middle');
            verbText.setAttribute('fill', '#ecf0f1');
            verbText.textContent = verb;
            
            svg.appendChild(textBg);
            svg.appendChild(path);
            svg.appendChild(verbText);
        });
        
        // Add arrow marker definition
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'arrowhead');
        marker.setAttribute('markerWidth', 10);
        marker.setAttribute('markerHeight', 7);
        marker.setAttribute('refX', 9);
        marker.setAttribute('refY', 3.5);
        marker.setAttribute('orient', 'auto');
        
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
        polygon.setAttribute('fill', '#e74c3c');
        
        marker.appendChild(polygon);
        defs.appendChild(marker);
        svg.appendChild(defs);
        
        return svg;
    } catch (error) {
        console.error('Error creating rules SVG:', error);
        
        // Create a fallback SVG with error message
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 0 800 600');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', 100);
        rect.setAttribute('y', 200);
        rect.setAttribute('width', 600);
        rect.setAttribute('height', 200);
        rect.setAttribute('fill', 'rgba(231, 76, 60, 0.2)');
        rect.setAttribute('rx', 10);
        rect.setAttribute('ry', 10);
        
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', 400);
        text.setAttribute('y', 300);
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('fill', '#ecf0f1');
        text.setAttribute('font-size', '24px');
        text.textContent = 'Unable to display rules graph';
        
        const subtext = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        subtext.setAttribute('x', 400);
        subtext.setAttribute('y', 340);
        subtext.setAttribute('text-anchor', 'middle');
        subtext.setAttribute('fill', '#ecf0f1');
        subtext.setAttribute('font-size', '16px');
        subtext.textContent = 'Try refreshing the page or selecting another variation';
        
        svg.appendChild(rect);
        svg.appendChild(text);
        svg.appendChild(subtext);
        
        return svg;
    }
} 