// Sound Manager - With seamless audio looping using Web Audio API
// Uses AudioBufferSourceNode for gapless background music loops
// UPDATED: Added playPuzzleSolvedSound() and playGameOver() for weekly challenge notifications

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.musicBuffer = null;
    this.musicSource = null;
    this.musicGainNode = null;
    
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.vibrationEnabled = true;
    this.bgMusicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.hasInteracted = false;
    this.musicLoaded = false;
    this.musicPlaying = false;
    
    this.loadSettings();
  }

  loadSettings() {
    try {
      const saved = localStorage.getItem('deadblock-settings');
      if (saved) {
        const s = JSON.parse(saved);
        this.bgMusicVolume = (s.musicVolume ?? 30) / 100;
        this.sfxVolume = (s.sfxVolume ?? 50) / 100;
        this.musicEnabled = s.musicEnabled ?? true;
        this.sfxEnabled = s.sfxEnabled ?? true;
        this.vibrationEnabled = s.vibrationEnabled ?? true;
      }
    } catch (e) {}
  }

  // Initialize audio context (call on user interaction)
  initAudioContext() {
    if (this.audioContext) return this.audioContext;
    
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) {
        this.audioContext = new AC();
        
        // Create a gain node for music volume control
        this.musicGainNode = this.audioContext.createGain();
        this.musicGainNode.gain.value = this.bgMusicVolume;
        this.musicGainNode.connect(this.audioContext.destination);
        
        console.log('Audio context created');
      }
    } catch (e) {
      console.warn('No AudioContext support:', e);
    }
    
    return this.audioContext;
  }

  // Load music file into buffer (only needs to happen once)
  async loadMusicBuffer() {
    if (this.musicLoaded || this.musicBuffer) return;
    if (!this.audioContext) return;
    
    try {
      console.log('Loading music buffer...');
      const response = await fetch('/sounds/background-music.mp3');
      const arrayBuffer = await response.arrayBuffer();
      this.musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.musicLoaded = true;
      console.log('Music buffer loaded successfully');
    } catch (e) {
      console.warn('Could not load music buffer:', e);
    }
  }

  // Start seamless looping music
  startMusic() {
    if (!this.musicEnabled || !this.musicBuffer || !this.audioContext) return;
    if (this.musicPlaying) return;
    
    try {
      // Create a new buffer source (they can only be played once)
      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true;
      
      // Set loop points for seamless looping (entire buffer)
      this.musicSource.loopStart = 0;
      this.musicSource.loopEnd = this.musicBuffer.duration;
      
      // Connect to gain node for volume control
      this.musicSource.connect(this.musicGainNode);
      
      // Start playback
      this.musicSource.start(0);
      this.musicPlaying = true;
      
      console.log('Music started (seamless loop)');
    } catch (e) {
      console.warn('Could not start music:', e);
    }
  }

  // Stop music
  stopMusic() {
    if (this.musicSource && this.musicPlaying) {
      try {
        this.musicSource.stop();
      } catch (e) {}
      this.musicSource = null;
      this.musicPlaying = false;
    }
  }

  // Call this on EVERY user click/tap
  onUserInteraction() {
    // Create audio context on first interaction
    if (!this.audioContext) {
      this.initAudioContext();
    }

    // Resume audio context if suspended (critical for mobile)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('Audio context resumed');
        // Try to start music after resume
        if (this.hasInteracted && this.musicEnabled && !this.musicPlaying && this.musicBuffer) {
          this.startMusic();
        }
      }).catch(() => {});
    }

    // Load and start background music on first interaction
    if (!this.hasInteracted && this.musicEnabled) {
      this.hasInteracted = true;
      this.loadMusicBuffer().then(() => {
        this.startMusic();
      });
    }
  }

  // Legacy method names for compatibility
  createAndPlayMusic() {
    this.onUserInteraction();
  }

  stopBackgroundMusic() {
    this.stopMusic();
  }

  pauseBackgroundMusic() {
    this.stopMusic();
  }

  resumeBackgroundMusic() {
    if (this.musicEnabled && this.hasInteracted && this.musicBuffer) {
      this.startMusic();
    }
  }

  setBgMusicVolume(vol) {
    this.bgMusicVolume = Math.max(0, Math.min(1, vol));
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.bgMusicVolume;
    }
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  // Getter methods
  isSoundEnabled() {
    return this.sfxEnabled;
  }

  isMusicEnabled() {
    return this.musicEnabled;
  }

  isVibrationEnabled() {
    return this.vibrationEnabled;
  }

  setSoundEnabled(enabled) {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    this.saveSettings();
    if (!enabled) {
      this.stopMusic();
    } else if (this.hasInteracted && this.musicBuffer) {
      this.startMusic();
    }
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
    this.saveSettings();
  }

  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
    this.saveSettings();
  }

  // Save settings to localStorage
  saveSettings() {
    try {
      const settings = {
        musicVolume: this.bgMusicVolume * 100,
        sfxVolume: this.sfxVolume * 100,
        musicEnabled: this.musicEnabled,
        sfxEnabled: this.sfxEnabled,
        vibrationEnabled: this.vibrationEnabled
      };
      localStorage.setItem('deadblock-settings', JSON.stringify(settings));
    } catch (e) {
      console.warn('Could not save settings:', e);
    }
  }

  // Simple beep using AudioContext
  playBeep(freq = 440, duration = 0.1) {
    if (!this.sfxEnabled || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(this.sfxVolume * 0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start();
      osc.stop(this.audioContext.currentTime + duration);
    } catch (e) {}
  }

  // Play a tone with specific parameters (for melodies)
  playTone(freq, duration, startTime = 0) {
    if (!this.sfxEnabled || !this.audioContext) return;
    if (this.audioContext.state === 'suspended') return;

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.frequency.value = freq;
      osc.type = 'sine';
      
      const actualStartTime = this.audioContext.currentTime + startTime;
      gain.gain.setValueAtTime(this.sfxVolume * 0.25, actualStartTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actualStartTime + duration);
      
      osc.connect(gain);
      gain.connect(this.audioContext.destination);
      osc.start(actualStartTime);
      osc.stop(actualStartTime + duration);
    } catch (e) {}
  }

  vibrate(pattern = 'short') {
    if (!this.vibrationEnabled || !navigator.vibrate) return;
    
    const patterns = {
      short: 20,
      medium: 40,
      long: 80,
      soft: 15,
      confirm: [20, 40, 20],
      error: [40, 20, 40],
      win: [80, 40, 80, 40, 160]
    };
    
    navigator.vibrate(patterns[pattern] || 20);
  }

  // === Convenience methods ===
  
  playButtonClick() {
    this.onUserInteraction();
    this.playBeep(600, 0.08);
    this.vibrate('short');
  }

  playPieceSelect() {
    this.onUserInteraction();
    this.playBeep(880, 0.1);
    this.vibrate('short');
  }

  playPieceRotate() {
    this.playBeep(660, 0.08);
  }

  playPieceFlip() {
    this.playBeep(550, 0.08);
  }

  playPieceMove() {
    this.playBeep(440, 0.05);
  }

  playPiecePlace() {
    this.playBeep(523, 0.12);
    this.vibrate('medium');
  }

  playConfirm() {
    this.playBeep(700, 0.15);
    this.vibrate('confirm');
  }

  playCancel() {
    this.playBeep(330, 0.1);
  }

  playWin() {
    this.playBeep(880, 0.2);
    this.vibrate('win');
  }

  playLose() {
    this.playBeep(220, 0.3);
    this.vibrate('error');
  }

  playError() {
    this.playBeep(220, 0.15);
    this.vibrate('error');
  }

  playNotification() {
    this.playBeep(660, 0.1);
    this.vibrate('soft');
  }

  playSuccess() {
    this.playBeep(770, 0.15);
    this.vibrate('soft');
  }

  playInvalid() {
    this.playBeep(180, 0.2);
    this.vibrate('error');
  }

  // =====================================================
  // NEW: Weekly Challenge Sound Effects
  // =====================================================

  /**
   * Play celebratory sound when player wins weekly challenge puzzle
   * Ascending major arpeggio: C5 → E5 → G5 → C6
   */
  playPuzzleSolvedSound() {
    this.onUserInteraction();
    
    // Ascending celebratory tones (C major arpeggio)
    const notes = [
      { freq: 523, delay: 0 },      // C5
      { freq: 659, delay: 0.1 },    // E5
      { freq: 784, delay: 0.2 },    // G5
      { freq: 1047, delay: 0.3 }    // C6
    ];
    
    notes.forEach(note => {
      this.playTone(note.freq, 0.15, note.delay);
    });
    
    this.vibrate('win');
  }

  /**
   * Play game over sound when AI wins (player loses weekly challenge)
   * Descending minor progression: G4 → E4 → C4 → G3
   */
  playGameOver() {
    this.onUserInteraction();
    
    // Descending somber tones
    const notes = [
      { freq: 392, delay: 0 },      // G4
      { freq: 330, delay: 0.12 },   // E4
      { freq: 262, delay: 0.24 },   // C4
      { freq: 196, delay: 0.36 }    // G3
    ];
    
    notes.forEach(note => {
      this.playTone(note.freq, 0.2, note.delay);
    });
    
    this.vibrate('error');
  }

  // Generic playSound method - maps sound names to methods
  playSound(name) {
    this.onUserInteraction();
    switch (name) {
      case 'win':
        this.playWin();
        break;
      case 'lose':
        this.playLose();
        break;
      case 'error':
        this.playError();
        break;
      case 'notification':
        this.playNotification();
        break;
      case 'success':
        this.playSuccess();
        break;
      case 'invalid':
        this.playInvalid();
        break;
      case 'click':
        this.playButtonClick();
        break;
      case 'select':
        this.playPieceSelect();
        break;
      case 'place':
        this.playPiecePlace();
        break;
      case 'confirm':
        this.playConfirm();
        break;
      case 'cancel':
        this.playCancel();
        break;
      case 'puzzle-solved':
        this.playPuzzleSolvedSound();
        break;
      case 'game-over':
        this.playGameOver();
        break;
      default:
        this.playBeep(500, 0.1);
    }
  }

  playClickSound(type) {
    this.onUserInteraction();
    const freqs = {
      select: 880,
      rotate: 660,
      flip: 550,
      confirm: 700,
      cancel: 330,
      error: 220,
      place: 523,
      move: 440,
      success: 770,
      default: 600
    };
    this.playBeep(freqs[type] || freqs.default, 0.08);
  }
}

export const soundManager = new SoundManager();
export default soundManager;
