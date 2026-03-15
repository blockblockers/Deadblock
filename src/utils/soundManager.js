// soundManager.js - Complete audio management for Deadblock
// v7.12 - Seamless music looping using Web Audio API (no gaps)

class SoundManager {
  constructor() {
    this.audioContext = null;
    this.soundEnabled = this.loadSetting('soundEnabled', true);
    this.musicEnabled = this.loadSetting('musicEnabled', true);
    this.vibrationEnabled = this.loadSetting('vibrationEnabled', true);
    this.musicVolume = this.loadSetting('musicVolume', 0.3);
    this.soundVolume = this.loadSetting('soundVolume', 0.5);
    
    // Music - Web Audio API for seamless looping
    this.musicBuffer = null;
    this.musicSource = null;
    this.musicGainNode = null;
    this.isMusicPlaying = false;
    
    // Initialization state
    this.initialized = false;
    this.initPromise = null;
    this.musicLoaded = false;
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
    if (this.initPromise) return this.initPromise;
    if (this.initialized) return Promise.resolve();
    
    this.initPromise = this._doInit();
    return this.initPromise;
  }
  
  async _doInit() {
    try {
      // Create AudioContext only if not already created by the synchronous gesture handler
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      // Resume if suspended — don't await; the synchronous call in initOnInteraction
      // already triggered resume within the gesture context on Android Chrome browser.
      // Awaiting here would break the synchronous chain needed for Android browser audio.
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create music gain node
      this.musicGainNode = this.audioContext.createGain();
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
      this.musicGainNode.connect(this.audioContext.destination);
      
      this.initialized = true;
      
      // Load music buffer
      this.loadMusicBuffer();
      
      return true;
    } catch (e) {
      console.warn('[SoundManager] Failed to initialize:', e);
      return false;
    }
  }

  async loadMusicBuffer() {
    const musicPaths = [
      '/audio/background-music.mp3',
      '/sounds/background-music.mp3',
      '/music/background.mp3',
      '/audio/music.mp3'
    ];
    
    for (const path of musicPaths) {
      try {
        // console.log(`[SoundManager] Trying to load music from: ${path}`);
        const response = await fetch(path);
        
        if (!response.ok) continue;
        
        const arrayBuffer = await response.arrayBuffer();
        this.musicBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
        this.musicLoaded = true;
        
        // console.log(`[SoundManager] Music loaded from: ${path} (duration: ${this.musicBuffer.duration}s)`);
        
        if (this.musicEnabled && !this.isMusicPlaying) {
          this.startMusic();
        }
        
        return;
      } catch (e) {
        // console.log(`[SoundManager] Failed to load from ${path}`);
      }
    }
    
    // console.log('[SoundManager] No background music file found');
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.saveSetting('soundEnabled', this.soundEnabled);
    return this.soundEnabled;
  }

  toggleMusic() {
    this.musicEnabled = !this.musicEnabled;
    this.saveSetting('musicEnabled', this.musicEnabled);
    
    if (this.musicGainNode) {
      this.musicGainNode.gain.value = this.musicEnabled ? this.musicVolume : 0;
    }
    
    if (this.musicEnabled && !this.isMusicPlaying && this.musicBuffer) {
      this.startMusic();
    } else if (!this.musicEnabled && this.isMusicPlaying) {
      this.stopMusic();
    }
    
    return this.musicEnabled;
  }

  toggleVibration() {
    this.vibrationEnabled = !this.vibrationEnabled;
    this.saveSetting('vibrationEnabled', this.vibrationEnabled);
    return this.vibrationEnabled;
  }

  isSoundEnabled() { return this.soundEnabled; }
  isMusicEnabled() { return this.musicEnabled; }
  isVibrationEnabled() { return this.vibrationEnabled; }

  // SEAMLESS LOOPING with Web Audio API BufferSource
  startMusic() {
    if (!this.musicBuffer || this.isMusicPlaying) return;
    if (!this.audioContext) return;
    
    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }
      
      // Create new buffer source - Web Audio API loops seamlessly
      this.musicSource = this.audioContext.createBufferSource();
      this.musicSource.buffer = this.musicBuffer;
      this.musicSource.loop = true; // Seamless loop - no gap!
      this.musicSource.connect(this.musicGainNode);
      this.musicSource.start(0);
      
      this.isMusicPlaying = true;
      // console.log('[SoundManager] Music started (seamless Web Audio loop)');
    } catch (e) {
      console.warn('[SoundManager] Failed to start music:', e);
      
      // Auto-start on user interaction
      const startOnInteraction = () => {
        this.startMusic();
        document.removeEventListener('click', startOnInteraction);
        document.removeEventListener('touchstart', startOnInteraction);
      };
      
      document.addEventListener('click', startOnInteraction, { once: true });
      document.addEventListener('touchstart', startOnInteraction, { once: true });
    }
  }

  stopMusic() {
    if (this.musicSource) {
      try {
        this.musicSource.stop();
        this.musicSource.disconnect();
      } catch (e) {}
      this.musicSource = null;
    }
    this.isMusicPlaying = false;
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

  // Sound effects
  async playSound(frequency, duration = 0.1, type = 'sine', volume = 0.3) {
    if (!this.soundEnabled) return;
    
    if (!this.initialized) await this.init();
    if (!this.audioContext) return;
    
    if (this.audioContext.state === 'suspended') {
      try { await this.audioContext.resume(); } catch (e) { return; }
    }
    
    try {
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();
      
      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
      
      const adjustedVolume = volume * this.soundVolume;
      gainNode.gain.setValueAtTime(adjustedVolume, this.audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      oscillator.start(this.audioContext.currentTime);
      oscillator.stop(this.audioContext.currentTime + duration);
    } catch (e) {}
  }

  async playChord(frequencies, duration = 0.15, type = 'sine', volume = 0.2) {
    if (!this.soundEnabled) return;
    for (const freq of frequencies) {
      this.playSound(freq, duration, type, volume / frequencies.length);
    }
  }

  // Game sounds
  playButtonClick() { this.playSound(800, 0.05, 'sine', 0.15); }
  playClickSound(type) { this.playSound(800, 0.05, 'sine', 0.15); } // Alias for playButtonClick
  playPieceSelect() { this.playChord([523, 659], 0.1, 'sine', 0.2); }
  playPiecePlace() { this.playChord([392, 523, 659], 0.15, 'sine', 0.25); }
  playPieceRotate() { this.playSound(600, 0.05, 'sine', 0.1); }
  playPieceFlip() { this.playSound(700, 0.05, 'sine', 0.1); }
  
  playConfirm() {
    setTimeout(() => this.playSound(523, 0.1, 'sine', 0.2), 0);
    setTimeout(() => this.playSound(659, 0.1, 'sine', 0.2), 50);
    setTimeout(() => this.playSound(784, 0.15, 'sine', 0.25), 100);
  }
  
  playInvalid() { this.playChord([200, 250], 0.2, 'sawtooth', 0.15); }
  
  playWin() {
    setTimeout(() => this.playChord([523, 659, 784], 0.2, 'sine', 0.3), 0);
    setTimeout(() => this.playChord([587, 740, 880], 0.2, 'sine', 0.3), 200);
    setTimeout(() => this.playChord([659, 784, 988], 0.3, 'sine', 0.35), 400);
  }
  
  playLose() {
    setTimeout(() => this.playChord([392, 494, 587], 0.2, 'sine', 0.25), 0);
    setTimeout(() => this.playChord([349, 440, 523], 0.2, 'sine', 0.25), 200);
    setTimeout(() => this.playChord([294, 370, 440], 0.4, 'sine', 0.2), 400);
  }
  
  playGameOver() {
    // Alias - plays win or lose based on context, but default to a neutral sound
    setTimeout(() => this.playChord([440, 554, 659], 0.2, 'sine', 0.25), 0);
    setTimeout(() => this.playChord([392, 494, 587], 0.3, 'sine', 0.2), 250);
  }
  
  playPuzzleSolvedSound() {
    // Celebratory sound for puzzle completion
    setTimeout(() => this.playChord([523, 659, 784], 0.15, 'sine', 0.3), 0);
    setTimeout(() => this.playChord([587, 740, 880], 0.15, 'sine', 0.3), 150);
    setTimeout(() => this.playChord([659, 784, 988], 0.2, 'sine', 0.35), 300);
    setTimeout(() => this.playChord([784, 988, 1175], 0.3, 'sine', 0.4), 450);
  }
  
  playRotate() { this.playSound(600, 0.05, 'sine', 0.1); }
  playFlip() { this.playSound(700, 0.05, 'sine', 0.1); }
  playMove() { this.playSound(400, 0.03, 'sine', 0.08); }
  playNotification() {
    setTimeout(() => this.playSound(880, 0.1, 'sine', 0.2), 0);
    setTimeout(() => this.playSound(1100, 0.15, 'sine', 0.25), 100);
  }
  playMessageReceived() { this.playChord([659, 880], 0.1, 'sine', 0.2); }
  playCountdown() { this.playSound(440, 0.1, 'sine', 0.2); }
  playCountdownFinal() { this.playChord([880, 1100], 0.2, 'sine', 0.3); }

  // Vibration
  vibrate(pattern = [50]) {
    if (!this.vibrationEnabled || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (e) {}
  }
  
  vibrateShort() { this.vibrate([30]); }
  vibrateMedium() { this.vibrate([50]); }
  vibrateLong() { this.vibrate([100]); }
  vibratePattern(pattern) { this.vibrate(pattern); }
  vibrateError() { this.vibrate([50, 50, 50]); }
  vibrateSuccess() { this.vibrate([30, 30, 100]); }
}

export const soundManager = new SoundManager();

// Auto-initialize on first user interaction
// v7.31: Android Chrome browser requires AudioContext creation AND resume() to happen
// synchronously within the user gesture event handler. Any await before resume() breaks
// the gesture context and leaves the AudioContext suspended indefinitely (no sound).
// Fix: create the context and call resume() synchronously here, then let init() handle
// the rest (gain node, music buffer) asynchronously. _doInit() skips creation/resume
// if the context already exists.
if (typeof document !== 'undefined') {
  const initOnInteraction = () => {
    // Synchronous AudioContext bootstrap within gesture context
    try {
      if (!soundManager.audioContext) {
        soundManager.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (soundManager.audioContext.state === 'suspended') {
        soundManager.audioContext.resume(); // synchronous call — stays within gesture
      }
    } catch (e) {
      // Ignore — _doInit will try again
    }
    // Complete async setup (gain node, music buffer, etc.)
    soundManager.init();
    document.removeEventListener('click', initOnInteraction);
    document.removeEventListener('touchstart', initOnInteraction);
  };
  
  document.addEventListener('click', initOnInteraction, { once: true });
  document.addEventListener('touchstart', initOnInteraction, { once: true });
}

export default soundManager;
