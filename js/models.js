import { TYPES, COLORS, RULES, getRandomVelocity } from './utils.js';

/**
 * Glow effect for item collisions
 */
class Glow {
    constructor(x, y, fromType, toType) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.maxRadius = 40;
        this.alpha = 0.4;
        this.fadeSpeed = 0.03; // How quickly the glow fades out
        this.lifetime = 0; // Track how long the glow has existed
        this.maxLifetime = 45; // Maximum frames a glow can exist (about 0.75s at 60fps)
        
        // Handle variation types
        const fromKey = fromType.toUpperCase();
        const toKey = toType.toUpperCase();
        
        // Use colors from the current variation
        this.fromColor = COLORS[fromKey] || '#ffffff';
        this.toColor = COLORS[toKey] || '#ffffff';
    }

    update() {
        // Increase lifetime
        this.lifetime++;
        
        // Start fading out after a short delay 
        if (this.lifetime > 5) {
            this.alpha -= this.fadeSpeed;
        }
        
        // Allow the glow to grow slightly
        if (this.radius < this.maxRadius) {
            this.radius += 0.5;
        }
        
        // Return true if the glow should continue existing
        return this.alpha > 0 && this.lifetime < this.maxLifetime;
    }

    draw(ctx) {
        try {
            // Create a proper canvas gradient
            const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.radius);
            
            // Add color stops with proper color values
            gradient.addColorStop(0, this.addTransparency(this.fromColor, 0.7));
            gradient.addColorStop(0.5, this.addTransparency(this.toColor, 0.5));
            gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
            
            // Apply alpha
            ctx.globalAlpha = this.alpha;
            ctx.fillStyle = gradient;
            
            // Draw the glow
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Reset alpha
            ctx.globalAlpha = 1.0;
        } catch (e) {
            console.error('Error drawing glow:', e);
        }
    }
    
    // Helper method to add transparency to a color
    addTransparency(color, alpha) {
        if (color.startsWith('#')) {
            // Convert hex to rgb
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        } else if (color.startsWith('rgb')) {
            // Convert rgb to rgba
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        return color;
    }
}

/**
 * A game item (rock, paper, or scissors)
 */
class Item {
    constructor(type, x, y, size, speedMultiplier = 1) {
        // Validate all parameters
        if (!type) {
            console.warn('Item created with undefined type, using default');
            type = 'default'; // Fallback to a default type
        }
        
        // Ensure coordinates and size are finite numbers
        this.x = isFinite(x) ? x : 0;
        this.y = isFinite(y) ? y : 0;
        this.size = isFinite(size) && size > 0 ? size : 30; // Default size if invalid
        
        this.type = type;
        this.rotation = Math.random() * Math.PI * 2;
        this.speedMultiplier = isFinite(speedMultiplier) ? speedMultiplier : 1;
        this.speed = getRandomVelocity(this.speedMultiplier);
        this.rotationSpeed = (Math.random() - 0.5) * 0.1 * this.speedMultiplier;
        
        // Make mass proportional to size (square for 2D physics)
        this.mass = this.size * this.size / 900; // Normalized to make size=30 have mass=1
        
        // Store original speed for scaling
        this.originalSpeed = { 
            x: this.speed.x / this.speedMultiplier, 
            y: this.speed.y / this.speedMultiplier 
        };
        
        // Glow effect properties
        this.glowIntensity = 0.5; // Will be updated based on percentage
        this.glowSize = this.size * 1.5; // Slightly larger than the item
    }

    update(canvas) {
        // Validate canvas dimensions
        if (!canvas || !isFinite(canvas.width) || !isFinite(canvas.height)) {
            console.warn('Invalid canvas dimensions in Item.update');
            return;
        }
        
        // Ensure velocities don't get too extreme
        this.clampVelocity();
        
        // Move
        this.x += this.speed.x;
        this.y += this.speed.y;
        this.rotation += this.rotationSpeed;

        // Bounce off walls
        if (this.x < this.size || this.x > canvas.width - this.size) {
            this.speed.x *= -1;
            // Ensure the item stays within bounds
            this.x = Math.max(this.size, Math.min(this.x, canvas.width - this.size));
        }
        if (this.y < this.size || this.y > canvas.height - this.size) {
            this.speed.y *= -1;
            // Ensure the item stays within bounds
            this.y = Math.max(this.size, Math.min(this.y, canvas.height - this.size));
        }
    }
    
    // Helper method to prevent extreme velocities
    clampVelocity() {
        // Calculate current velocity magnitude
        const velMagnitude = Math.sqrt(this.speed.x * this.speed.x + this.speed.y * this.speed.y);
        
        // Set a maximum velocity based on size and speed multiplier
        // Smaller items can move faster, larger items move slower
        const maxSpeed = 5 * this.speedMultiplier * (30 / Math.max(this.size, 10));
        
        // If velocity exceeds maximum, scale it down while preserving direction
        if (velMagnitude > maxSpeed && velMagnitude > 0) {
            const scaleFactor = maxSpeed / velMagnitude;
            this.speed.x *= scaleFactor;
            this.speed.y *= scaleFactor;
        }
        
        // Also set a minimum velocity to ensure items keep moving
        const minSpeed = 0.5 * this.speedMultiplier;
        if (velMagnitude < minSpeed && velMagnitude > 0) {
            const scaleFactor = minSpeed / velMagnitude;
            this.speed.x *= scaleFactor;
            this.speed.y *= scaleFactor;
        }
    }

    // Apply bounce physics with another item
    bounce(other) {
        // Calculate distance between centers
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Calculate combined radius with a small buffer to prevent sticking
        const minDistance = this.size + other.size;
        
        // If objects are too far apart, skip collision handling
        if (distance >= minDistance) {
            return;
        }
        
        // Calculate normal vector
        const nx = dx / distance;
        const ny = dy / distance;
        
        // Calculate relative velocity
        const vx = this.speed.x - other.speed.x;
        const vy = this.speed.y - other.speed.y;
        
        // Calculate relative velocity in terms of the normal direction
        const velocityAlongNormal = vx * nx + vy * ny;
        
        // Don't apply bounce if objects are moving away from each other
        if (velocityAlongNormal > 0) {
            return;
        }
        
        // Calculate bounce intensity (coefficient of restitution)
        // Use a lower restitution value for better stability
        const restitution = 0.8;
        
        // Calculate impulse scalar with improved mass-based calculations
        // When sizes differ, use appropriate mass-based physics
        const impulseScalar = -(1 + restitution) * velocityAlongNormal / 
                            (1/this.mass + 1/other.mass);
        
        // Apply impulse with mass considerations
        const impulseX = impulseScalar * nx;
        const impulseY = impulseScalar * ny;
        
        // Calculate velocity changes based on mass ratio
        const thisVelChange = 1 / this.mass;
        const otherVelChange = 1 / other.mass;
        
        // Update velocities proportionally to mass
        this.speed.x += impulseX * thisVelChange;
        this.speed.y += impulseY * thisVelChange;
        other.speed.x -= impulseX * otherVelChange;
        other.speed.y -= impulseY * otherVelChange;
        
        // Apply positional correction to prevent objects from sticking together
        const overlap = minDistance - distance;
        if (overlap > 0) {
            // Calculate position correction factor based on inverse mass ratio
            const totalInverseMass = thisVelChange + otherVelChange;
            if (totalInverseMass <= 0) return; // Handle infinite mass case
            
            // Calculate correction amount for each object
            const percent = 0.8; // Penetration percentage to correct
            const correction = (overlap * percent) / totalInverseMass;
            const correctionX = nx * correction;
            const correctionY = ny * correction;
            
            // Apply correction proportionally to mass
            this.x += correctionX * thisVelChange;
            this.y += correctionY * thisVelChange;
            other.x -= correctionX * otherVelChange;
            other.y -= correctionY * otherVelChange;
        }
        
        // Apply velocity dampening for more stable physics
        const dampingFactor = 0.99;
        this.speed.x *= dampingFactor;
        this.speed.y *= dampingFactor;
        other.speed.x *= dampingFactor;
        other.speed.y *= dampingFactor;
    }

    // Update glow intensity based on percentage
    updateGlowIntensity(percentage) {
        // Scale intensity from 0.2 to 0.8 based on percentage
        this.glowIntensity = 0.2 + (percentage * 0.6);
        
        // Also adjust the glow size based on percentage
        this.glowSize = this.size * (1.3 + (percentage * 0.7));
    }

    // Draw the item with glow effect
    draw(ctx) {
        ctx.save();
        
        // Check if type is defined
        if (!this.type) {
            console.warn('Item type is undefined in Item.draw');
            ctx.restore();
            return;
        }
        
        // Get the game instance to check if glow is enabled
        const game = window.gameInstance;
        const glowEnabled = game ? game.config.glowEnabled : true;
        
        // Get color for the item
        const typeKey = this.type.toUpperCase();
        const color = COLORS[typeKey] || 'white';
        
        // Draw glow if enabled
        if (glowEnabled) {
            // Validate coordinates and sizes for gradient
            if (!isFinite(this.x) || !isFinite(this.y) || !isFinite(this.size) || !isFinite(this.glowSize)) {
                console.warn('Non-finite values detected in Item.draw:', 
                    'x:', this.x, 
                    'y:', this.y, 
                    'size:', this.size, 
                    'glowSize:', this.glowSize
                );
                ctx.restore();
                return;
            }
            
            // Create gradient for glow
            const gradient = ctx.createRadialGradient(
                this.x, this.y, this.size * 0.5,  // Inner circle
                this.x, this.y, this.glowSize     // Outer circle (glow radius)
            );
            
            // Convert color to rgba format for different opacity levels
            const baseColor = this.convertToRGBA(color, 1);
            const midColor = this.convertToRGBA(color, this.glowIntensity);
            const outerColor = this.convertToRGBA(color, 0);
            
            // Add color stops with proper transparency
            gradient.addColorStop(0, baseColor);
            gradient.addColorStop(0.5, midColor);
            gradient.addColorStop(1, outerColor);
            
            // Draw glow
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.glowSize, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Draw the emoji
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // Draw using emojis from the current variation
        ctx.font = `${this.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Get emoji for the current type from the current variation
        const emoji = TYPES[typeKey] || '❓';
        
        ctx.fillText(emoji, 0, 0);
        
        ctx.restore();
    }
    
    // Helper to convert various color formats to rgba
    convertToRGBA(color, alpha) {
        // If it's already rgba format
        if (color.startsWith('rgba')) {
            // Replace the alpha value
            return color.replace(/rgba\((.+?),.+?\)/, `rgba($1, ${alpha})`);
        }
        
        // If it's rgb format
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        
        // If it's a hex color
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // For named colors, just wrap in rgba
        return `rgba(255, 255, 255, ${alpha})`;
    }

    getColor() {
        const typeKey = this.type.toUpperCase();
        return COLORS[typeKey] || 'white';
    }

    collidesWith(other) {
        const dx = this.x - other.x;
        const dy = this.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < this.size + other.size;
    }

    beats(other) {
        // Use the rules from the current variation
        for (const rule of RULES) {
            // Convert both the rule and item types to uppercase for case-insensitive comparison
            const winnerType = rule.winner.toUpperCase();
            const loserType = rule.loser.toUpperCase();
            
            if (this.type.toUpperCase() === winnerType && other.type.toUpperCase() === loserType) {
                return true;
            }
        }
        return false;
    }

    // Update the speed multiplier for an existing item
    updateSpeedMultiplier(newMultiplier) {
        if (!isFinite(newMultiplier) || newMultiplier <= 0) return;
        
        // Calculate the ratio between new and old multiplier
        const ratio = newMultiplier / this.speedMultiplier;
        
        // Update the multiplier
        this.speedMultiplier = newMultiplier;
        
        // Scale the speed by the ratio
        this.speed.x = this.originalSpeed.x * newMultiplier;
        this.speed.y = this.originalSpeed.y * newMultiplier;
        
        // Also scale rotation speed
        this.rotationSpeed = this.rotationSpeed * ratio;
        
        console.log(`Updated item speed to multiplier: ${newMultiplier}`);
    }
    
    // Update the size of an existing item
    updateSize(newSize) {
        if (!isFinite(newSize) || newSize <= 0) return;
        
        // Store old size for ratio calculation
        const oldSize = this.size;
        const oldMass = this.mass;
        
        // Calculate velocity magnitude before size change
        const oldVelMagnitude = Math.sqrt(this.speed.x * this.speed.x + this.speed.y * this.speed.y);
        
        // Update size
        this.size = newSize;
        
        // Update related size-dependent properties
        this.glowSize = this.size * 1.5;
        
        // Update mass to be proportional to size squared (2D physics)
        this.mass = this.size * this.size / 900; // Normalized to make size=30 have mass=1
        
        // Ensure velocity magnitude stays the same by normalizing and rescaling
        if (oldVelMagnitude > 0) {
            // Normalize current velocity
            const normalizedX = this.speed.x / oldVelMagnitude;
            const normalizedY = this.speed.y / oldVelMagnitude;
            
            // Calculate new velocity that preserves momentum (p = mv)
            // For constant momentum: m1v1 = m2v2, so v2 = v1 * (m1/m2)
            // But we want to keep energy more constant, so we use a less aggressive scaling
            // Using a sqrt function gives a more natural feel for the physics
            const massRatio = Math.sqrt(oldMass / this.mass);
            const newVelMagnitude = oldVelMagnitude * massRatio;
            
            // Apply the new magnitude (preserving direction)
            this.speed.x = normalizedX * newVelMagnitude;
            this.speed.y = normalizedY * newVelMagnitude;
        }
        
        // Preserve original speed for future speed updates
        this.originalSpeed = {
            x: this.speed.x / this.speedMultiplier,
            y: this.speed.y / this.speedMultiplier
        };
        
        console.log(`Updated item size to: ${newSize}, mass to: ${this.mass.toFixed(2)}, adjusting velocity for physics consistency`);
    }
}

export { Glow, Item }; 