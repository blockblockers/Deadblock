// soundManager.js - Complete audio management for Deadblock
// v7.11 - Added toggle functions for Settings modal

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.soundEnabled = this.loadSetting('soundEnabled', true);
    this.musicEnabled = this.loadSetting('musicEnabled', true);
    this.vibrationEnabled = this.loadSetting('vibrationEnabled', true);
    this.musicVolume = this.loadSetting('musicVolume', 0.3);
    this.soundVolume = this.loadSetting('soundVolume', 0.5);
    
    // Music
    this.musicSource = null;
    this.musicBuffer = null;
    this.musicGainNode = null;
    this.isMusicPlaying = false;
    
    // Preloaded sounds
    this.sounds = {};
    
    // Initialize on first user interaction
    this.initialized = false;
  }

  loadSetting(key, defaultValue) {
    try {
      const value = localStorage.getItem(`deadblock_${key}`);
      if (value !== null) {
        return JSON.parse(value);
      }
    } catch (e) {
      console.warn(`[SoundManager] Failed to load setting ${key}:`, e);
    }
    return defaultValue;
  }

  saveSetting(key, value) {
    try {
      localStorage.setItem(`deadblock_${key}`, JSON.stringify(value));
    } catch (e) {
      console.warn(`[SoundManager] Failed to save setting ${key}:`, e);
    }
  }

  async init() {
    if (this.initialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume if suspended (required for iOS)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create music gain node
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
      this.musicGainNode.connect(this.audioContext.destination);
      
      this.initialized = true;
      console.log('Audio context created');
      
      // Load music buffer
      await this.loadMusicBuffer();
    } catch (e) {
      console.warn('[SoundManager] Failed to initialize:', e);
    }
  }

  async loadMusicBuffer() {
    try {
      console.log('Loading music buffer...');
      const response = await fetch('/audio/background-music.mp3');
      if (!response.ok) {
        // If no music file, generate a simple ambient loop
        this.musicBuffer = this.generateAmbientLoop();
        console.log('Generated ambient music');
      } else {
        const arrayBuffer = await response.arrayBuffer();
        this.musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        console.log('Music buffer loaded successfully');
      }
    } catch (e) {
      // Generate simple ambient music if loading fails
      this.musicBuffer = this.generateAmbientLoop();
      console.log('Generated ambient music (fallback)');
    }
  }

  generateAmbientLoop() {
    // Generate a simple ambient drone
    const sampleRate = this.audioContext.sampleRate;
    const duration = 8; // 8 second loop
    const buffer = this.audioContext.createBuffer(2, sampleRate * duration, sampleRate);
    
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < data.length; i++) {
        const t = i / sampleRate;
        // Layered sine waves for ambient feel
        const freq1 = 55 + (channel * 0.5); // Base frequency
        const freq2 = 82.5 + (channel * 0.3);
        const freq3 = 110;
        
        data[i] = (
          Math.sin(2 * Math.PI * freq1 * t) * 0.15 +
          Math.sin(2 * Math.PI * freq2 * t) * 0.1 +
          Math.sin(2 * Math.PI * freq3 * t) * 0.05 +
          // Add subtle modulation
          Math.sin(2 * Math.PI * freq1 * t * (1 + Math.sin(t * 0.5) * 0.02)) * 0.1
        ) * (0.8 + Math.sin(t * 0.3) * 0.2); // Volume modulation
      }
    }
    
    return buffer;
  }

  // =========================================================================
  // TOGGLE FUNCTIONS (for Settings modal)
  // =========================================================================

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.saveSetting('soundEnabled', this.soundEnabled);
    console.log('[SoundManager] Sound toggled:', this.soundEnabled);
    return this.soundEnabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.saveSetting('musicEnabled', this.musicEnabled);
    
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
    }
    
    // Start or stop music based on new state
    if (this.musicEnabled && !this.isMusicPlaying) {
      this.startMusic();
    } else if (!this.musicEnabled && this.isMusicPlaying) {
      this.stopMusic();
    }
    
    console.log('[SoundManager] Music toggled:', this.musicEnabled);
    return this.musicEnabled;
  }

  toggleVibration() {
    this.vibrationEnabled = !this.vibrationEnabled;
    this.saveSetting('vibrationEnabled', this.vibrationEnabled);
    console.log('[SoundManager] Vibration toggled:', this.vibrationEnabled);
    return this.vibrationEnabled;
  }

  // =========================================================================
  // GETTERS (for Settings modal to read current state)
  // =========================================================================

  isSoundEnabled() {
    return this.soundEnabled;
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  isVibrationEnabled() {
    return this.vibrationEnabled;
  }

  // =========================================================================
  // MUSIC CONTROLS
  // =========================================================================

  async startMusic() {
    if (!this.initialized) await this.init();
    if (!this.musicBuffer || this.isMusicPlaying) return;
    
    try {
      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true;
      this.musicSource.connect(this.musicGainNode);
      this.musicSource.start(0);
      this.isMusicPlaying = true;
      console.log('Music started (seamless loop)');
    } catch (e) {
      console.warn('[SoundManager] Failed to start music:', e);
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (e) {
        // Ignore errors if already stopped
      }
      this.musicSource = null;
    }
    this.isMusicPlaying = false;
    console.log('Music stopped');
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSetting('musicVolume', this.musicVolume);
    
    if (this.musicGainNode && this.musicEnabled) {
      this.musicGainNode.gain.value = this.musicVolume;
    }
  }

  setSoundVolume(volume) {
    this.soundVolume = Math.max(0, Math.min(1, volume));
    this.saveSetting('soundVolume', this.soundVolume);
  }

  // =========================================================================
  // SOUND EFFECTS
  // =========================================================================

  playSound(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!this.soundEnabled || !this.initialized || !this.audioContext) return;
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = frequency;
      
      gainNode.gain.value = volume * this.soundVolume;
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        this.audioContext.currentTime + duration
      );
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start();
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {
      // Ignore sound errors
    }
  }

  // Game-specific sounds
  playPieceSelect() {
    this.playSound(440, 0.08, 'sine', 0.2);
    this.playSound(660, 0.08, 'sine', 0.15);
  }

  playPieceDrop() {
    this.playSound(330, 0.12, 'sine', 0.25);
    setTimeout(() => this.playSound(440, 0.1, 'sine', 0.2), 50);
  }

  playPiecePlace() {
    this.playSound(523, 0.1, 'sine', 0.3);
    setTimeout(() => this.playSound(659, 0.1, 'sine', 0.25), 30);
    setTimeout(() => this.playSound(784, 0.15, 'sine', 0.2), 60);
  }

  playInvalidMove() {
    this.playSound(200, 0.15, 'sawtooth', 0.2);
    setTimeout(() => this.playSound(180, 0.15, 'sawtooth', 0.15), 100);
  }

  playRotate() {
    this.playSound(600, 0.05, 'sine', 0.15);
    setTimeout(() => this.playSound(700, 0.05, 'sine', 0.12), 30);
  }

  playFlip() {
    this.playSound(500, 0.05, 'sine', 0.15);
    setTimeout(() => this.playSound(400, 0.05, 'sine', 0.12), 30);
  }

  playButtonClick() {
    this.playSound(800, 0.05, 'sine', 0.15);
  }

  playClickSound(type = 'default') {
    switch (type) {
      case 'select':
        this.playSound(600, 0.05, 'sine', 0.15);
        break;
      case 'confirm':
        this.playSound(880, 0.08, 'sine', 0.2);
        break;
      case 'back':
        this.playSound(400, 0.05, 'sine', 0.15);
        break;
      default:
        this.playSound(700, 0.05, 'sine', 0.15);
    }
  }

  playWin() {
    // Victory fanfare
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSound(freq, 0.2, 'sine', 0.3), i * 100);
    });
  }

  playLose() {
    // Defeat sound
    this.playSound(300, 0.3, 'sine', 0.2);
    setTimeout(() => this.playSound(250, 0.3, 'sine', 0.18), 150);
    setTimeout(() => this.playSound(200, 0.4, 'sine', 0.15), 300);
  }

  playDraw() {
    this.playSound(440, 0.2, 'sine', 0.2);
    setTimeout(() => this.playSound(440, 0.2, 'sine', 0.2), 200);
  }

  playNotification() {
    this.playSound(880, 0.1, 'sine', 0.25);
    setTimeout(() => this.playSound(1100, 0.1, 'sine', 0.2), 80);
  }

  playAchievement() {
    // Achievement unlock fanfare
    const notes = [659, 784, 988, 1319];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSound(freq, 0.15, 'sine', 0.25), i * 80);
    });
  }

  playCountdown() {
    this.playSound(440, 0.1, 'sine', 0.3);
  }

  playCountdownFinal() {
    this.playSound(880, 0.2, 'sine', 0.35);
  }

  // =========================================================================
  // HAPTIC FEEDBACK
  // =========================================================================

  vibrate(pattern = 50) {
    if (!this.vibrationEnabled) return;
    
    try {
      if (navigator.vibrate) {
        navigator.vibrate(pattern);
      }
    } catch (e) {
      // Ignore vibration errors
    }
  }

  vibrateLight() {
    this.vibrate(30);
  }

  vibrateMedium() {
    this.vibrate(50);
  }

  vibrateHeavy() {
    this.vibrate([50, 30, 50]);
  }

  vibrateSuccess() {
    this.vibrate([30, 50, 30, 50, 100]);
  }

  vibrateError() {
    this.vibrate([100, 50, 100]);
  }
}

// Create singleton instance
export const soundManager = new SoundManager();

// Auto-initialize on first user interaction
if (typeof window !== 'undefined') {
  const initOnInteraction = () => {
    soundManager.init();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
  document.addEventListener('keydown', initOnInteraction, { once: true });
}

export default soundManager;
