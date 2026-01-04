// soundManager.js - Complete audio management for Deadblock
// v7.11.2 - Better background music support with HTML5 Audio fallback

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.soundEnabled = this.loadSetting('soundEnabled', true);
    this.musicEnabled = this.loadSetting('musicEnabled', true);
    this.vibrationEnabled = this.loadSetting('vibrationEnabled', true);
    this.musicVolume = this.loadSetting('musicVolume', 0.3);
    this.soundVolume = this.loadSetting('soundVolume', 0.5);
    
    // Music - HTML5 Audio for better compatibility
    this.musicAudio = null;
    this.isMusicPlaying = false;
    
    // Web Audio API for sound effects
    this.musicGainNode = null;
    
    // Initialization state
    this.initialized = false;
    this.initPromise = null;
    this.musicInitialized = false;
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
      
      // Create music gain node for Web Audio
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
      this.musicGainNode.connect(this.audioContext.destination);
      
      this.initialized = true;
      console.log('[SoundManager] Audio context created');
      
      // Initialize music separately (don't block)
      this.initMusic();
      
      return true;
    } catch (e) {
      console.warn('[SoundManager] Failed to initialize:', e);
      return false;
    }
  }

  // Initialize background music using HTML5 Audio (more reliable for looping music)
  initMusic() {
    if (this.musicInitialized) return;
    
    // Try multiple paths for the music file
    const musicPaths = [
      '/audio/background-music.mp3',
      '/sounds/background-music.mp3',
      '/music/background.mp3',
      '/audio/music.mp3'
    ];
    
    // Try each path
    this.tryLoadMusic(musicPaths, 0);
  }
  
  tryLoadMusic(paths, index) {
    if (index >= paths.length) {
      console.log('[SoundManager] No background music file found at any path');
      return;
    }
    
    const path = paths[index];
    console.log(`[SoundManager] Trying to load music from: ${path}`);
    
    const audio = new Audio();
    audio.src = path;
    audio.loop = true;
    audio.volume = this.musicEnabled ? this.musicVolume : 0;
    audio.preload = 'auto';
    
    // On successful load
    audio.addEventListener('canplaythrough', () => {
      console.log(`[SoundManager] Music loaded successfully from: ${path}`);
      this.musicAudio = audio;
      this.musicInitialized = true;
      
      // Auto-start if music is enabled
      if (this.musicEnabled) {
        this.startMusic();
      }
    }, { once: true });
    
    // On error, try next path
    audio.addEventListener('error', (e) => {
      console.log(`[SoundManager] Failed to load music from ${path}:`, e.message || 'Not found');
      this.tryLoadMusic(paths, index + 1);
    }, { once: true });
    
    // Start loading
    audio.load();
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
    
    // Update HTML5 Audio volume
    if (this.musicAudio) {
      this.musicAudio.volume = this.musicEnabled ? this.musicVolume : 0;
    }
    
    // Start or stop music based on new state
    if (this.musicEnabled && !this.isMusicPlaying && this.musicAudio) {
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
  // MUSIC CONTROLS (using HTML5 Audio for better compatibility)
  // =========================================================================

  async startMusic() {
    if (!this.musicAudio || this.isMusicPlaying) return;
    
    try {
      this.musicAudio.volume = this.musicEnabled ? this.musicVolume : 0;
      await this.musicAudio.play();
      this.isMusicPlaying = true;
      console.log('[SoundManager] Music started');
    } catch (e) {
      // AutoPlay was prevented - will need user interaction
      console.log('[SoundManager] Music autoplay prevented, waiting for user interaction');
      
      // Add one-time event listener to start music on user interaction
      const startOnInteraction = async () => {
        try {
          await this.musicAudio.play();
          this.isMusicPlaying = true;
          console.log('[SoundManager] Music started after user interaction');
        } catch (err) {
          console.warn('[SoundManager] Still could not start music:', err);
        }
        // Remove listeners after first interaction
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
        document.removeEventListener('keydown', startOnInteraction);
      };
      
      document.addEventListener('click', startOnInteraction, { once: true });
      document.addEventListener('touchstart', startOnInteraction, { once: true });
      document.addEventListener('keydown', startOnInteraction, { once: true });
    }
  }

  stopMusic() {
    if (this.musicAudio) {
      this.musicAudio.pause();
      this.musicAudio.currentTime = 0;
    }
    this.isMusicPlaying = false;
    console.log('[SoundManager] Music stopped');
  }

  setMusicVolume(volume) {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSetting('musicVolume', this.musicVolume);
    
    if (this.musicAudio && this.musicEnabled) {
      this.musicAudio.volume = this.musicVolume;
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
