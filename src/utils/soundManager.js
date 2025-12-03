// Sound Manager for Deadblock
// Handles background music, sound effects, and haptic feedback
// With Capacitor native haptics integration for iOS/Android

// Check if we're running in a Capacitor native app
const isNativeApp = typeof window !== 'undefined' && window.Capacitor !== undefined;

// Dynamically import Capacitor Haptics if available
let CapacitorHaptics = null;
if (isNativeApp) {
  import('@capacitor/haptics').then(module => {
    CapacitorHaptics = module.Haptics;
  }).catch(() => {
    console.log('Capacitor Haptics not available, using web fallback');
  });
}

class SoundManager {
  constructor() {
    this.bgMusic = null;
    this.bgMusicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.isInitialized = true;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.vibrationEnabled = true;
    
    // Audio context for generating synth sounds
    this.audioContext = null;
    
    // Load saved settings
    this.loadSettings();
  }

  // Load settings from localStorage
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
      console.warn('Could not load sound settings:', e);
    }
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  // Start background music
  startBackgroundMusic(musicPath = '/sounds/background-music.mp3') {
    if (!this.musicEnabled) return;
    
    if (this.bgMusic) {
      this.bgMusic.play().catch(() => {});
      return;
    }

    this.bgMusic = new Audio(musicPath);
    this.bgMusic.loop = true;
    this.bgMusic.volume = this.bgMusicVolume;
    
    // Play with user interaction handling
    const playPromise = this.bgMusic.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        console.log('Background music autoplay prevented:', error);
      });
    }
  }

  // Stop background music
  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  // Pause background music
  pauseBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
    }
  }

  // Resume background music
  resumeBackgroundMusic() {
    if (this.bgMusic && this.musicEnabled) {
      this.bgMusic.play().catch(() => {});
    }
  }

  // Set background music volume (0-1)
  setBgMusicVolume(volume) {
    this.bgMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.bgMusic) {
      this.bgMusic.volume = this.bgMusicVolume;
    }
  }

  // Set SFX volume (0-1)
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
  }

  // Enable/disable music
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.pauseBackgroundMusic();
    }
  }

  // Enable/disable sound effects
  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  // Enable/disable vibration
  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
  }

  // Generate a cyberpunk-style click/blip sound
  playClickSound(type = 'default') {
    if (!this.sfxEnabled) return;
    
    if (!this.audioContext) {
      this.init();
      if (!this.audioContext) return;
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for the main tone
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Different sound profiles for different actions
    switch (type) {
      case 'select':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        break;
        
      case 'rotate':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        osc.type = 'triangle';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        break;
        
      case 'flip':
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        osc.type = 'triangle';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        break;
        
      case 'move':
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.04);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        break;
        
      case 'place':
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        osc.type = 'square';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
        
      case 'confirm':
        osc.frequency.setValueAtTime(523, now);
        osc.frequency.setValueAtTime(659, now + 0.1);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
        
      case 'cancel':
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        osc.type = 'sawtooth';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
        
      case 'win':
        this.playWinSound();
        return;
        
      case 'error':
        osc.frequency.setValueAtTime(150, now);
        osc.type = 'sawtooth';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
        
      default:
        osc.frequency.setValueAtTime(700, now);
        osc.frequency.exponentialRampToValueAtTime(500, now + 0.05);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    }

    // Connect and play
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  }

  // Special win sound with multiple tones
  playWinSound() {
    if (!this.sfxEnabled || !this.audioContext) return;

    const ctx = this.audioContext;
    const now = ctx.currentTime;
    
    const notes = [523, 659, 784, 1047];
    const duration = 0.15;

    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.frequency.setValueAtTime(freq, now + i * duration);
      osc.type = 'sine';
      
      gain.gain.setValueAtTime(0, now + i * duration);
      gain.gain.linearRampToValueAtTime(this.sfxVolume * 0.3, now + i * duration + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * duration + duration);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * duration);
      osc.stop(now + i * duration + duration + 0.1);
    });
  }

  // Trigger haptic feedback (vibration)
  // Uses Capacitor native haptics on iOS/Android, falls back to web vibration API
  async vibrate(pattern = 'short') {
    if (!this.vibrationEnabled) return;

    // Try Capacitor native haptics first (better on iOS/Android)
    if (CapacitorHaptics) {
      try {
        switch (pattern) {
          case 'short':
            await CapacitorHaptics.impact({ style: 'light' });
            break;
          case 'medium':
            await CapacitorHaptics.impact({ style: 'medium' });
            break;
          case 'long':
            await CapacitorHaptics.impact({ style: 'heavy' });
            break;
          case 'confirm':
            await CapacitorHaptics.notification({ type: 'success' });
            break;
          case 'error':
            await CapacitorHaptics.notification({ type: 'error' });
            break;
          case 'win':
            await CapacitorHaptics.notification({ type: 'success' });
            // Add extra vibration for win
            setTimeout(() => CapacitorHaptics.impact({ style: 'heavy' }), 200);
            setTimeout(() => CapacitorHaptics.impact({ style: 'heavy' }), 400);
            break;
          default:
            await CapacitorHaptics.impact({ style: 'light' });
        }
        return; // Successfully used native haptics
      } catch (e) {
        // Fall through to web API
      }
    }

    // Fallback to web Vibration API
    if (!navigator.vibrate) return;

    switch (pattern) {
      case 'short':
        navigator.vibrate(30);
        break;
      case 'medium':
        navigator.vibrate(50);
        break;
      case 'long':
        navigator.vibrate(100);
        break;
      case 'confirm':
        navigator.vibrate([30, 50, 30]);
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30, 50]);
        break;
      case 'win':
        navigator.vibrate([100, 50, 100, 50, 200]);
        break;
      default:
        navigator.vibrate(30);
    }
  }

  // Combined sound and haptic for common actions
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
    this.playClickSound('move');
  }

  playPiecePlace() {
    this.playClickSound('place');
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
    this.playClickSound('win');
    this.vibrate('win');
  }

  playError() {
    this.playClickSound('error');
    this.vibrate('error');
  }

  playButtonClick() {
    this.playClickSound('default');
    this.vibrate('short');
  }
}

// Export singleton instance
export const soundManager = new SoundManager();
export default soundManager;
