import { VARIATIONS, CURRENT_VARIATION } from './utils.js';

/**
 * Audio manager for game sounds
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.isMuted = false;
        this.isInitialized = false;
        
        // Sound profiles for different variations
        this.soundProfiles = {
            classic: {
                oscillatorType: 'sine',
                baseFrequency: 440, // A4
                secondFrequency: 523.25, // C5
                thirdFrequency: 329.63, // E4
                attackTime: 0.01,
                releaseTime: 0.3
            },
            elemental: {
                oscillatorType: 'triangle',
                baseFrequency: 392, // G4
                secondFrequency: 587.33, // D5
                thirdFrequency: 349.23, // F4
                attackTime: 0.02,
                releaseTime: 0.4
            },
            space: {
                oscillatorType: 'sawtooth',
                baseFrequency: 261.63, // C4
                secondFrequency: 349.23, // F4
                thirdFrequency: 440, // A4
                attackTime: 0.05,
                releaseTime: 0.5
            },
            weather: {
                oscillatorType: 'sine',
                baseFrequency: 293.66, // D4
                secondFrequency: 392, // G4
                thirdFrequency: 493.88, // B4
                attackTime: 0.03,
                releaseTime: 0.4
            },
            animals: {
                oscillatorType: 'square',
                baseFrequency: 329.63, // E4
                secondFrequency: 415.30, // G#4
                thirdFrequency: 523.25, // C5
                attackTime: 0.01,
                releaseTime: 0.2
            },
            food: {
                oscillatorType: 'triangle',
                baseFrequency: 349.23, // F4
                secondFrequency: 440, // A4
                thirdFrequency: 261.63, // C4
                attackTime: 0.02,
                releaseTime: 0.3
            },
            tech: {
                oscillatorType: 'sawtooth',
                baseFrequency: 493.88, // B4
                secondFrequency: 659.25, // E5
                thirdFrequency: 392, // G4
                attackTime: 0.01,
                releaseTime: 0.2
            },
            emotions: {
                oscillatorType: 'sine',
                baseFrequency: 392, // G4
                secondFrequency: 329.63, // E4
                thirdFrequency: 261.63, // C4
                attackTime: 0.05,
                releaseTime: 0.6
            }
        };
        
        // Set default profiles for variations not explicitly defined
        const defaultProfile = this.soundProfiles.classic;
        
        // Add default profiles for any missing variations
        Object.keys(VARIATIONS).forEach(key => {
            if (!this.soundProfiles[key]) {
                // Create a slightly modified version of the classic profile
                this.soundProfiles[key] = {
                    ...defaultProfile,
                    baseFrequency: defaultProfile.baseFrequency * (0.9 + Math.random() * 0.2),
                    oscillatorType: ['sine', 'triangle', 'square', 'sawtooth'][Math.floor(Math.random() * 4)]
                };
            }
        });
        
        // Defer audio context creation until user interaction
        document.addEventListener('click', () => {
            this.initAudioContext();
        }, { once: true });
    }
    
    initAudioContext() {
        if (this.isInitialized) return;
        
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Set volume to 30%
            this.masterGain.connect(this.audioContext.destination);
            this.isInitialized = true;
            console.log('AudioContext initialized successfully');
        } catch (e) {
            console.error('Failed to initialize AudioContext:', e);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        if (this.masterGain) {
            this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
        }
        return this.isMuted;
    }

    playCollisionSound(fromType, toType, isWin = true) {
        if (this.isMuted || !this.isInitialized) return;
        
        try {
            // Get sound profile for current variation
            const currentVariation = CURRENT_VARIATION;
            const soundProfile = this.soundProfiles[currentVariation] || this.soundProfiles.classic;
            
            // Create oscillator and gain node
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Get current variation details
            const variation = VARIATIONS[currentVariation];
            const types = Object.keys(variation.types).map(type => type.toLowerCase());
            
            // Set frequency based on transformation
            let frequency;
            
            if (isWin) {
                // Use indices in the types array to determine relationship
                const fromIndex = types.indexOf(fromType);
                const toIndex = types.indexOf(toType);
                
                if (fromIndex !== -1 && toIndex !== -1) {
                    // Calculate frequency based on the relationship
                    if ((fromIndex + 1) % types.length === toIndex) {
                        frequency = soundProfile.baseFrequency; // First relationship
                    } else if ((fromIndex + 2) % types.length === toIndex) {
                        frequency = soundProfile.secondFrequency; // Second relationship
                    } else {
                        frequency = soundProfile.thirdFrequency; // Third relationship
                    }
                } else {
                    // Fallback to default frequency
                    frequency = soundProfile.baseFrequency;
                }
            } else {
                // For ties, use a different frequency pattern - average of the frequencies
                frequency = (soundProfile.baseFrequency + soundProfile.secondFrequency) / 2;
                // Use a different oscillator type for ties
                oscillator.type = soundProfile.oscillatorType === 'sine' ? 'triangle' : 'sine';
            }
            
            // Set oscillator type based on variation (for wins)
            if (isWin) {
                oscillator.type = soundProfile.oscillatorType;
            }
            
            oscillator.frequency.value = frequency;
            
            // Setup envelope with variation-specific timings
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + soundProfile.attackTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + soundProfile.attackTime + soundProfile.releaseTime);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            // Play sound
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + soundProfile.attackTime + soundProfile.releaseTime);
        } catch (e) {
            console.error('Error playing collision sound:', e);
        }
    }
    
    playTieSound(typeA, typeB) {
        // Use the same method but with isWin=false to play a tie sound
        this.playCollisionSound(typeA, typeB, false);
    }
}

export { AudioManager }; 