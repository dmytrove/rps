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
        
        // Sound character profiles for each type (rock/paper/scissors or equivalents)
        // These will be used to modify the base sounds for each type
        this.typeProfiles = {
            // First type (rock)
            0: {
                oscillatorMix: { type: 'square', amount: 0.3 },  // Add some square wave for crunchiness
                detuneMod: 1.0,                                  // Regular pitch
                attackMod: 1.2,                                  // Slightly longer attack
                releaseMod: 0.9,                                 // Slightly shorter release
                filterCutoff: 2000,                              // Lower filter cutoff for deeper sound
                pitchBend: { amount: 10, time: 0.1 }             // Slight downward pitch bend
            },
            // Second type (paper)
            1: {
                oscillatorMix: { type: 'triangle', amount: 0.4 }, // Add triangle wave for softness
                detuneMod: 1.05,                                  // Slightly higher pitch
                attackMod: 0.8,                                   // Faster attack
                releaseMod: 1.2,                                  // Longer release
                filterCutoff: 4000,                               // Higher filter cutoff for brighter sound
                pitchBend: { amount: -5, time: 0.15 }             // Slight upward pitch bend
            },
            // Third type (scissors)
            2: {
                oscillatorMix: { type: 'sawtooth', amount: 0.35 }, // Add saw wave for sharpness
                detuneMod: 0.95,                                   // Slightly lower pitch
                attackMod: 0.6,                                    // Very fast attack
                releaseMod: 0.7,                                   // Short release
                filterCutoff: 3000,                                // Medium filter cutoff
                pitchBend: { amount: 15, time: 0.05 }              // Quick pitch bend down
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
        // Listen for various user interactions to ensure audio can play
        const userInteractions = ['click', 'touchstart', 'keydown', 'touchend'];
        const initAudio = () => {
            this.initAudioContext();
            
            // Try to resume the audio context (needed for Chrome/Safari)
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    console.log('AudioContext resumed successfully');
                }).catch(err => {
                    console.warn('Could not resume AudioContext:', err);
                });
            }
            
            // Remove all event listeners once initialized
            userInteractions.forEach(eventType => {
                document.removeEventListener(eventType, initAudio);
            });
        };
        
        // Add all event listeners
        userInteractions.forEach(eventType => {
            document.addEventListener(eventType, initAudio, { once: false });
        });
        
        // Force a test sound at the earliest opportunity after user interaction
        setTimeout(() => {
            if (this.isInitialized) {
                this.playTestSound();
            }
        }, 1000);
        
        // Create sound pattern memory to make individual items sound unique
        this.soundMemory = new Map();
        
        // Create unique winning sound pattern varieties
        this.winPatterns = [
            { detune: 0, attackMod: 1, releaseMod: 1 },                 // Default
            { detune: 10, attackMod: 0.8, releaseMod: 1.2 },            // Slightly higher pitch, faster attack
            { detune: -10, attackMod: 1.2, releaseMod: 0.8 },           // Slightly lower pitch, slower attack
            { detune: 20, attackMod: 0.7, releaseMod: 1.3 },            // Higher pitch, quicker attack, longer release
            { detune: -20, attackMod: 1.3, releaseMod: 0.7 },           // Lower pitch, slower attack, shorter release
            { detune: 5, attackMod: 1.5, releaseMod: 1.5 },             // Slight detune, longer envelope
            { detune: -5, attackMod: 0.5, releaseMod: 0.5 },            // Slight detune down, shorter envelope
            { detune: 15, attackMod: 1, releaseMod: 1.5 },              // Higher pitch, normal attack, longer release
            { detune: -15, attackMod: 1, releaseMod: 0.5 }              // Lower pitch, normal attack, shorter release
        ];
    }
    
    initAudioContext() {
        if (this.isInitialized) return;
        
        try {
            // Create audio context with fallbacks for different browsers
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Log audio context state
            console.log('AudioContext created with state:', this.audioContext.state);
            
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = 0.3; // Set volume to 30%
            this.masterGain.connect(this.audioContext.destination);
            this.isInitialized = true;
            
            // Try to resume immediately (needed for some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
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
            
            // Get current variation details
            const variation = VARIATIONS[currentVariation];
            const types = Object.keys(variation.types).map(type => type.toLowerCase());
            
            if (isWin) {
                // Use indices in the types array to determine relationship
                const fromIndex = types.indexOf(fromType);
                const toIndex = types.indexOf(toType);
                
                if (fromIndex !== -1 && toIndex !== -1) {
                    // Generate a unique key for this collision
                    const collisionKey = `${fromType}-${toType}`;
                    
                    // If we don't have a pattern for this collision yet, assign one
                    if (!this.soundMemory.has(collisionKey)) {
                        // Assign a random pattern from our win patterns
                        const patternIndex = Math.floor(Math.random() * this.winPatterns.length);
                        this.soundMemory.set(collisionKey, this.winPatterns[patternIndex]);
                    }
                    
                    // Get the pattern for this collision
                    const pattern = this.soundMemory.get(collisionKey);
                    
                    // Get the type profile for the winner (toType)
                    // Find the index of the winning type in the current variation
                    const winnerTypeIndex = toIndex % 3; // Ensure it's 0, 1, or 2
                    const typeProfile = this.typeProfiles[winnerTypeIndex];
                    
                    // Calculate frequency based on the relationship
                    let baseFreq;
                    if ((fromIndex + 1) % types.length === toIndex) {
                        baseFreq = soundProfile.baseFrequency; // First relationship
                    } else if ((fromIndex + 2) % types.length === toIndex) {
                        baseFreq = soundProfile.secondFrequency; // Second relationship
                    } else {
                        baseFreq = soundProfile.thirdFrequency; // Third relationship
                    }
                    
                    // Apply type-specific detune modifier
                    const frequency = baseFreq * typeProfile.detuneMod;
                    
                    // Create primary oscillator
                    const oscillator1 = this.audioContext.createOscillator();
                    oscillator1.type = soundProfile.oscillatorType;
                    oscillator1.frequency.value = frequency;
                    
                    // Apply pattern detune
                    oscillator1.detune.value = pattern.detune;
                    
                    // Create secondary oscillator for mixing (adds character)
                    const oscillator2 = this.audioContext.createOscillator();
                    oscillator2.type = typeProfile.oscillatorMix.type;
                    oscillator2.frequency.value = frequency;
                    oscillator2.detune.value = pattern.detune + 5; // Slight detuning for richness
                    
                    // Create gain nodes
                    const gainNode1 = this.audioContext.createGain();
                    const gainNode2 = this.audioContext.createGain();
                    const mixerGain = this.audioContext.createGain();
                    
                    // Set gains for mixing
                    gainNode1.gain.value = 1 - typeProfile.oscillatorMix.amount;
                    gainNode2.gain.value = typeProfile.oscillatorMix.amount;
                    
                    // Create a filter for tone shaping
                    const filter = this.audioContext.createBiquadFilter();
                    filter.type = 'lowpass';
                    filter.frequency.value = typeProfile.filterCutoff;
                    filter.Q.value = 1;
                    
                    // Calculate modified attack and release times
                    const attackTime = soundProfile.attackTime * pattern.attackMod * typeProfile.attackMod;
                    const releaseTime = soundProfile.releaseTime * pattern.releaseMod * typeProfile.releaseMod;
                    
                    // Setup envelope
                    mixerGain.gain.setValueAtTime(0, this.audioContext.currentTime);
                    mixerGain.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + attackTime);
                    mixerGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + attackTime + releaseTime);
                    
                    // Add pitch bend if specified
                    if (typeProfile.pitchBend) {
                        const bendTime = this.audioContext.currentTime + typeProfile.pitchBend.time;
                        oscillator1.detune.setValueAtTime(pattern.detune, this.audioContext.currentTime);
                        oscillator1.detune.linearRampToValueAtTime(
                            pattern.detune + typeProfile.pitchBend.amount, 
                            bendTime
                        );
                        
                        oscillator2.detune.setValueAtTime(pattern.detune + 5, this.audioContext.currentTime);
                        oscillator2.detune.linearRampToValueAtTime(
                            pattern.detune + 5 + typeProfile.pitchBend.amount, 
                            bendTime
                        );
                    }
                    
                    // Connect nodes
                    oscillator1.connect(gainNode1);
                    oscillator2.connect(gainNode2);
                    gainNode1.connect(mixerGain);
                    gainNode2.connect(mixerGain);
                    mixerGain.connect(filter);
                    filter.connect(this.masterGain);
                    
                    // Play sound
                    oscillator1.start();
                    oscillator2.start();
                    
                    // Calculate full duration
                    const fullDuration = attackTime + releaseTime;
                    
                    // Stop oscillators
                    oscillator1.stop(this.audioContext.currentTime + fullDuration);
                    oscillator2.stop(this.audioContext.currentTime + fullDuration);
                }
            } else {
                // It's a tie - create a simpler sound
                // Create oscillator and gain node
                const oscillator = this.audioContext.createOscillator();
                const gainNode = this.audioContext.createGain();
                
                // For ties, use a different frequency pattern - average of the frequencies
                const frequency = (soundProfile.baseFrequency + soundProfile.secondFrequency) / 2;
                // Use a different oscillator type for ties
                oscillator.type = soundProfile.oscillatorType === 'sine' ? 'triangle' : 'sine';
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
            }
        } catch (e) {
            console.error('Error playing collision sound:', e);
        }
    }
    
    playTieSound(typeA, typeB) {
        // Use the same method but with isWin=false to play a tie sound
        this.playCollisionSound(typeA, typeB, false);
    }

    // Play a quick test sound to verify audio is working
    playTestSound() {
        if (this.isMuted || !this.isInitialized) return;
        
        try {
            // Create a very quiet, brief sound to test audio system
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            // Make it very quiet so it's not disturbing
            gainNode.gain.value = 0.01;
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 440;
            oscillator.connect(gainNode);
            gainNode.connect(this.masterGain);
            
            oscillator.start();
            oscillator.stop(this.audioContext.currentTime + 0.1);
            
            console.log('Test sound played');
        } catch (e) {
            console.error('Error playing test sound:', e);
        }
    }

    // Clean up resources
    dispose() {
        try {
            // Close the audio context if it exists
            if (this.audioContext && typeof this.audioContext.close === 'function') {
                this.audioContext.close().then(() => {
                    console.log('AudioContext closed successfully');
                }).catch(err => {
                    console.warn('Error closing AudioContext:', err);
                });
            }
            
            // Clear any event listeners or references
            this.audioContext = null;
            this.masterGain = null;
            this.isInitialized = false;
            this.soundMemory.clear();
            
            console.log('AudioManager resources cleaned up');
        } catch (e) {
            console.error('Error disposing AudioManager:', e);
        }
    }
}

export { AudioManager }; 