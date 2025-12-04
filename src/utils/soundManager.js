// Sound Manager - Simplified for Android compatibility
// The key is to create and play audio ONLY after user interaction

class SoundManager {
  constructor() {
    this.bgMusic = null;
    this.audioContext = null;
    this.musicEnabled = true;
    this.sfxEnabled = true;
    this.vibrationEnabled = true;
    this.bgMusicVolume = 0.3;
    this.sfxVolume = 0.5;
    this.hasInteracted = false;
    
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

  // Call this on EVERY user click/tap
  onUserInteraction() {
    // Create audio context on first interaction
    if (!this.audioContext) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) {
          this.audioContext = new AC();
          console.log('Audio context created');
        }
      } catch (e) {
        console.warn('No AudioContext support');
      }
    }

    // Resume audio context if suspended (critical for Android)
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume().then(() => {
        console.log('Audio context resumed');
      }).catch(() => {});
    }

    // Create and start background music on first interaction
    if (!this.hasInteracted && this.musicEnabled) {
      this.hasInteracted = true;
      this.createAndPlayMusic();
    }
  }

  createAndPlayMusic() {
    if (this.bgMusic) return; // Already created
    
    try {
      this.bgMusic = new Audio('/sounds/background-music.mp3');
      this.bgMusic.loop = true;
      this.bgMusic.volume = this.bgMusicVolume;
      
      // For Android: load then play
      this.bgMusic.load();
      
      const playMusic = () => {
        if (this.musicEnabled && this.bgMusic) {
          this.bgMusic.play()
            .then(() => console.log('Music playing'))
            .catch(e => console.log('Music play failed:', e.message));
        }
      };

      // Try to play immediately
      playMusic();
      
      // Also try on canplaythrough event
      this.bgMusic.addEventListener('canplaythrough', playMusic, { once: true });
      
    } catch (e) {
      console.warn('Could not create music:', e);
    }
  }

  stopBackgroundMusic() {
    if (this.bgMusic) {
      this.bgMusic.pause();
      this.bgMusic.currentTime = 0;
    }
  }

  pauseBackgroundMusic() {
    if (this.bgMusic) this.bgMusic.pause();
  }

  resumeBackgroundMusic() {
    if (this.bgMusic && this.musicEnabled) {
      this.bgMusic.play().catch(() => {});
    }
  }

  setBgMusicVolume(vol) {
    this.bgMusicVolume = Math.max(0, Math.min(1, vol));
    if (this.bgMusic) this.bgMusic.volume = this.bgMusicVolume;
  }

  setSfxVolume(vol) {
    this.sfxVolume = Math.max(0, Math.min(1, vol));
  }

  setMusicEnabled(enabled) {
    this.musicEnabled = enabled;
    if (!enabled) this.pauseBackgroundMusic();
    else if (this.hasInteracted) this.resumeBackgroundMusic();
  }

  setSfxEnabled(enabled) {
    this.sfxEnabled = enabled;
  }

  setVibrationEnabled(enabled) {
    this.vibrationEnabled = enabled;
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

  vibrate(pattern = 'short') {
    if (!this.vibrationEnabled || !navigator.vibrate) return;
    
    const patterns = {
      short: 20,
      medium: 40,
      long: 80,
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

  playError() {
    this.playBeep(220, 0.15);
    this.vibrate('error');
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
      default: 600
    };
    this.playBeep(freqs[type] || freqs.default, 0.08);
  }
}

export const soundManager = new SoundManager();
export default soundManager;
