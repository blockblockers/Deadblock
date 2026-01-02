// soundManager.js - Complete audio management for Deadblock
// v7.11.1 - Fixed toggle functions, removed distorted ambient generator

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
    
    // Initialization state
    this.initialized = false;
    this.initPromise = null;
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
    // Return existing promise if already initializing
    if (this.initPromise) return this.initPromise;
    if (this.initialized) return Promise.resolve();
    
    this.initPromise = this._doInit();
    return this.initPromise;
  }
  
  async _doInit() {
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume if suspended (required for iOS/Chrome)
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      
      // Create music gain node
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
      this.musicGainNode.connect(this.audioContext.destination);
      
      this.initialized = true;
      console.log('Audio context created');
      
      // Try to load music file (don't block on failure)
      this.loadMusicBuffer().catch(() => {
        console.log('No background music file found - music disabled');
      });
      
      return true;
    } catch (e) {
      console.warn('[SoundManager] Failed to initialize:', e);
      return false;
    }
  }

  async loadMusicBuffer() {
    try {
      console.log('Loading music buffer...');
      const response = await fetch('/audio/background-music.mp3');
      if (!response.ok) {
        throw new Error('Music file not found');
      }
      const arrayBuffer = await response.arrayBuffer();
      this.musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      console.log('Music buffer loaded successfully');
      
      // Auto-start if music is enabled
      if (this.musicEnabled && !this.isMusicPlaying) {
        this.startMusic();
      }
    } catch (e) {
      console.log('Background music not available:', e.message);
      // Don't generate fallback - just disable music
      this.musicBuffer = null;
    }
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
    if (this.musicEnabled && !this.isMusicPlaying && this.musicBuffer) {
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

  async playSound(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!this.soundEnabled) return;
    
    // Initialize on first sound if needed
    if (!this.initialized) {
      await this.init();
    }
    
    if (!this.audioContext) return;
    
    // Resume audio context if suspended (user interaction requirement)
    if (this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
      } catch (e) {
        return;
      }
    }
    
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
      // Ignore sound errors silently
    }
  }

  // Game-specific sounds
  playPieceSelect() {
    this.playSound(440, 0.08, 'sine', 0.2);
    setTimeout(() => this.playSound(660, 0.08, 'sine', 0.15), 20);
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
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      setTimeout(() => this.playSound(freq, 0.2, 'sine', 0.3), i * 100);
    });
  }

  playLose() {
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
  const initOnInteraction = async () => {
    await soundManager.init();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
    document.removeEventListener('keydown', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
  document.addEventListener('keydown', initOnInteraction, { once: true });
}

export default soundManager;
