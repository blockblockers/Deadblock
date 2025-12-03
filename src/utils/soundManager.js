// Sound Manager for Deadblock
// Handles background music, sound effects, and haptic feedback
// Updated: Auto-plays sound on game initialization

class SoundManager {
  constructor() {
    this.bgMusic = null;
    this.bgMusicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.isInitialized = false;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.vibrationEnabled = true;
    this.hasUserInteracted = false;
    
    // Audio context for generating synth sounds
    this.audioContext = null;
    
    // Load saved settings
    this.loadSettings();
    
    // Set up auto-initialization on first user interaction
    this.setupAutoInit();
  }

  // Set up listeners for first user interaction to enable audio
  setupAutoInit() {
    const initOnInteraction = () => {
      if (!this.hasUserInteracted) {
        this.hasUserInteracted = true;
        this.init();
        
        // Auto-start background music if enabled
        if (this.musicEnabled) {
          this.startBackgroundMusic();
        }
      }
    };

    // Listen for various user interaction events
    const events = ['touchstart', 'mousedown', 'keydown', 'click'];
    events.forEach(event => {
      document.addEventListener(event, initOnInteraction, { once: false, passive: true });
    });
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

  // Save current settings to localStorage
  saveSettings() {
    try {
      const settings = {
        musicVolume: Math.round(this.bgMusicVolume * 100),
        sfxVolume: Math.round(this.sfxVolume * 100),
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        vibrationEnabled: this.vibrationEnabled
      };
      localStorage.setItem('deadblock-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save sound settings:', e);
    }
  }

  // Initialize audio context (must be called after user interaction)
  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      // Resume audio context if it's suspended (browser policy)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      this.isInitialized = true;
      console.log('Sound Manager initialized');
    } catch (e) {
      console.warn('Web Audio API not supported:', e);
    }
  }

  // Start background music
  startBackgroundMusic(musicPath = '/sounds/background-music.mp3') {
    if (!this.musicEnabled) return;
    
    // If music already exists and is playing, just ensure volume is correct
    if (this.bgMusic) {
      this.bgMusic.volume = this.bgMusicVolume;
      if (this.bgMusic.paused) {
        this.bgMusic.play().catch(() => {});
      }
      return;
    }

    // Create new audio element
    this.bgMusic = new Audio(musicPath);
    this.bgMusic.loop = true;
    this.bgMusic.volume = this.bgMusicVolume;
    
    // Handle load errors gracefully (file might not exist)
    this.bgMusic.onerror = () => {
      console.log('Background music file not found, continuing without music');
      this.bgMusic = null;
    };
    
    // Play with user interaction handling
    const playPromise = this.bgMusic.play();
    if (playPromise !== undefined) {
      playPromise.catch((error) => {
        // This is normal if user hasn't interacted yet
        console.log('Background music waiting for user interaction');
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
    this.saveSettings();
  }

  // Set SFX volume (0-1)
  setSfxVolume(volume) {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
  }

  // Enable/disable music
  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.pauseBackgroundMusic();
    } else if (this.hasUserInteracted) {
      this.startBackgroundMusic();
    }
    this.saveSettings();
  }

  // Enable/disable sound effects
  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  // Enable/disable vibration
  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
    this.saveSettings();
  }

  // Generate a cyberpunk-style click/blip sound
  playClickSound(type = 'default') {
    if (!this.sfxEnabled) return;
    
    // Auto-init if needed
    if (!this.audioContext) {
      this.init();
      if (!this.audioContext) return;
    }

    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const ctx = this.audioContext;
    const now = ctx.currentTime;

    // Create oscillator for the main tone
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    // Different sound profiles for different actions
    switch (type) {
      case 'select':
        // Higher pitched blip for piece selection
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.05);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        break;
        
      case 'rotate':
        // Swoosh sound for rotation
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);
        osc.type = 'triangle';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        break;
        
      case 'flip':
        // Reverse swoosh for flip
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.08);
        osc.type = 'triangle';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        break;
        
      case 'move':
        // Short blip for d-pad movement
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(550, now + 0.04);
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        break;
        
      case 'place':
        // Satisfying thunk for placing a piece
        osc.frequency.setValueAtTime(220, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.1);
        osc.type = 'square';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.35, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
        
      case 'confirm':
        // Two-tone confirmation beep
        osc.frequency.setValueAtTime(523, now); // C5
        osc.frequency.setValueAtTime(659, now + 0.1); // E5
        osc.type = 'sine';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now);
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.3, now + 0.1);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
        
      case 'cancel':
        // Descending tone for cancel
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(220, now + 0.15);
        osc.type = 'sawtooth';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        break;
        
      case 'win':
        // Victory fanfare
        this.playWinSound();
        return;
        
      case 'error':
        // Buzz for invalid action
        osc.frequency.setValueAtTime(150, now);
        osc.type = 'sawtooth';
        gainNode.gain.setValueAtTime(this.sfxVolume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        break;
        
      default:
        // Default click
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
    
    const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
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
  vibrate(pattern = 'short') {
    if (!this.vibrationEnabled || !navigator.vibrate) return;

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
        navigator.vibrate([30, 50, 30]); // Double tap pattern
        break;
      case 'error':
        navigator.vibrate([50, 30, 50, 30, 50]); // Error buzz pattern
        break;
      case 'win':
        navigator.vibrate([100, 50, 100, 50, 200]); // Victory pattern
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
