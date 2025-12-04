// Sound Manager for Deadblock - Simplified Version
// Handles background music, sound effects, and haptic feedback

class SoundManager {
  constructor() {
    this.bgMusic = null;
    this.bgMusicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.audioContext = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.vibrationEnabled = true;
    this.initialized = false;
    
    // Load saved settings
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('deadblock-settings');
      if (saved) {
        const settings = JSON.parse(saved);
        this.bgMusicVolume = (settings.musicVolume ?? 30) / 100;
        this.sfxVolume = (settings.sfxVolume ?? 50) / 100;
        this.musicEnabled = settings.musicEnabled ?? true;
        this.sfxEnabled = settings.sfxEnabled ?? true;
        this.vibrationEnabled = settings.vibrationEnabled ?? true;
      }
    } catch (e) {
      console.warn('Could not load sound settings');
    }
  }

  // Initialize audio - call this on ANY user interaction
  init() {
    if (this.initialized) return true;
    
    try {
      // Create audio context
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioContext = new AudioContext();
      }
      
      // Create and configure background music
      this.bgMusic = new Audio('/sounds/background-music.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.bgMusicVolume;
      
      this.initialized = true;
      console.log('Sound manager initialized');
      return true;
    } catch (e) {
      console.warn('Could not initialize audio:', e);
      return false;
    }
  }

  // Start background music - must be called from user interaction
  startBackgroundMusic() {
    if (!this.musicEnabled) return;
    if (!this.initialized) this.init();
    if (!this.bgMusic) return;
    
    // Resume audio context if suspended (required for mobile)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    this.bgMusic.volume = this.bgMusicVolume;
    
    const playPromise = this.bgMusic.play();
    if (playPromise) {
      playPromise.then(() => {
        console.log('Background music started');
      }).catch(e => {
        console.log('Music autoplay blocked:', e.message);
      });
    }
  }

  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  pauseBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  resumeBackgroundMusic() {
    if (this.bgMusic && this.musicEnabled) {
      this.bgMusic.play().catch(() => {});
    }
  }

  setBgMusicVolume(volume) {
    this.bgMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic) {
      this.bgMusic.volume = this.bgMusicVolume;
    }
  }

  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.pauseBackgroundMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
  }

  // Play a simple beep sound
  playClickSound(type = 'default') {
    if (!this.sfxEnabled) return;
    if (!this.initialized) this.init();
    if (!this.audioContext) return;

    // Resume context if needed
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    try {
      const ctx = this.audioContext;
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Different sounds for different actions
      switch (type) {
        case 'select':
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
          break;
        case 'rotate':
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
          break;
        case 'flip':
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
          break;
        case 'confirm':
          osc.frequency.setValueAtTime(523, now);
          osc.frequency.setValueAtTime(659, now + 0.1);
          break;
        case 'cancel':
          osc.frequency.setValueAtTime(330, now);
          osc.frequency.exponentialRampToValueAtTime(220, now + 0.1);
          break;
        case 'error':
          osc.frequency.setValueAtTime(150, now);
          break;
        default:
          osc.frequency.setValueAtTime(600, now);
          osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
      }

      osc.type = 'sine';
      gain.gain.setValueAtTime(this.sfxVolume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      // Ignore audio errors
    }
  }

  // Vibration
  vibrate(pattern = 'short') {
    if (!this.vibrationEnabled) return;
    if (!navigator.vibrate) return;

    switch (pattern) {
      case 'short': navigator.vibrate(30); break;
      case 'medium': navigator.vibrate(50); break;
      case 'long': navigator.vibrate(100); break;
      case 'confirm': navigator.vibrate([30, 50, 30]); break;
      case 'error': navigator.vibrate([50, 30, 50]); break;
      case 'win': navigator.vibrate([100, 50, 100, 50, 200]); break;
      default: navigator.vibrate(30);
    }
  }

  // Convenience methods
  playPieceSelect() {
    this.playClickSound('select');
    this.vibrate('short');
  }

  playPieceRotate() {
    this.playClickSound('rotate');
  }

  playPieceFlip() {
    this.playClickSound('flip');
  }

  playPieceMove() {
    this.playClickSound('default');
  }

  playPiecePlace() {
    this.playClickSound('default');
    this.vibrate('medium');
  }

  playConfirm() {
    this.playClickSound('confirm');
    this.vibrate('confirm');
  }

  playCancel() {
    this.playClickSound('cancel');
  }

  playWin() {
    this.playClickSound('confirm');
    this.vibrate('win');
  }

  playError() {
    this.playClickSound('error');
    this.vibrate('error');
  }

  // Main button click - initializes audio and starts music
  playButtonClick() {
    // Initialize on first click
    if (!this.initialized) {
      this.init();
    }
    
    // Try to start music
    if (this.musicEnabled && this.bgMusic) {
      this.startBackgroundMusic();
    }
    
    this.playClickSound('default');
    this.vibrate('short');
  }
}

// Export singleton
export const soundManager = new SoundManager();
export default soundManager;
