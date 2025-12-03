import { useState, useEffect } from 'react';
import { X, Volume2, VolumeX, Music, Smartphone, Vibrate } from 'lucide-react';
import { soundManager } from '../utils/soundManager';

const SettingsModal = ({ isOpen, onClose }) => {
  const [musicVolume, setMusicVolume] = useState(30);
  const [sfxVolume, setSfxVolume] = useState(50);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [sfxEnabled, setSfxEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);

  // Load saved settings on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('deadblock-settings');
    if (savedSettings) {
      const settings = JSON.parse(savedSettings);
      setMusicVolume(settings.musicVolume ?? 30);
      setSfxVolume(settings.sfxVolume ?? 50);
      setMusicEnabled(settings.musicEnabled ?? true);
      setSfxEnabled(settings.sfxEnabled ?? true);
      setVibrationEnabled(settings.vibrationEnabled ?? true);
      
      // Apply loaded settings
      soundManager.setBgMusicVolume(settings.musicVolume / 100);
      soundManager.setSfxVolume(settings.sfxVolume / 100);
      soundManager.setMusicEnabled(settings.musicEnabled ?? true);
      soundManager.setSfxEnabled(settings.sfxEnabled ?? true);
      soundManager.setVibrationEnabled(settings.vibrationEnabled ?? true);
    }
  }, []);

  // Save settings whenever they change
  const saveSettings = (newSettings) => {
    const settings = {
      musicVolume,
      sfxVolume,
      musicEnabled,
      sfxEnabled,
      vibrationEnabled,
      ...newSettings
    };
    localStorage.setItem('deadblock-settings', JSON.stringify(settings));
  };

  const handleMusicVolumeChange = (e) => {
    const value = parseInt(e.target.value);
    setMusicVolume(value);
    soundManager.setBgMusicVolume(value / 100);
    saveSettings({ musicVolume: value });
  };

  const handleSfxVolumeChange = (e) => {
    const value = parseInt(e.target.value);
    setSfxVolume(value);
    soundManager.setSfxVolume(value / 100);
    saveSettings({ sfxVolume: value });
  };

  const handleMusicToggle = () => {
    const newValue = !musicEnabled;
    setMusicEnabled(newValue);
    soundManager.setMusicEnabled(newValue);
    saveSettings({ musicEnabled: newValue });
    
    if (newValue) {
      soundManager.resumeBackgroundMusic();
    } else {
      soundManager.pauseBackgroundMusic();
    }
  };

  const handleSfxToggle = () => {
    const newValue = !sfxEnabled;
    setSfxEnabled(newValue);
    soundManager.setSfxEnabled(newValue);
    saveSettings({ sfxEnabled: newValue });
    
    // Play test sound if enabling
    if (newValue) {
      setTimeout(() => soundManager.playClickSound('select'), 100);
    }
  };

  const handleVibrationToggle = () => {
    const newValue = !vibrationEnabled;
    setVibrationEnabled(newValue);
    soundManager.setVibrationEnabled(newValue);
    saveSettings({ vibrationEnabled: newValue });
    
    // Test vibration if enabling
    if (newValue) {
      soundManager.vibrate('short');
    }
  };

  const handleClose = () => {
    soundManager.playButtonClick();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-slate-900/95 rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-[0_0_40px_rgba(168,85,247,0.3)] max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-purple-300 tracking-wide">SETTINGS</h2>
          <button 
            onClick={handleClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-6">
          {/* Music Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Music size={20} className="text-cyan-400" />
                <span className="text-cyan-300 font-semibold tracking-wide">MUSIC</span>
              </div>
              <button
                onClick={handleMusicToggle}
                className={`w-14 h-8 rounded-full transition-all duration-300 ${
                  musicEnabled 
                    ? 'bg-cyan-500 shadow-[0_0_15px_rgba(34,211,238,0.5)]' 
                    : 'bg-slate-700'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  musicEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            {/* Music Volume Slider */}
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-slate-500" />
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={handleMusicVolumeChange}
                disabled={!musicEnabled}
                className={`flex-1 h-2 rounded-full appearance-none cursor-pointer ${
                  musicEnabled 
                    ? 'bg-slate-700' 
                    : 'bg-slate-800 opacity-50'
                }`}
                style={{
                  background: musicEnabled 
                    ? `linear-gradient(to right, #22d3ee ${musicVolume}%, #334155 ${musicVolume}%)`
                    : '#1e293b'
                }}
              />
              <Volume2 size={16} className={musicEnabled ? 'text-cyan-400' : 'text-slate-600'} />
              <span className={`text-sm w-10 text-right ${musicEnabled ? 'text-cyan-300' : 'text-slate-600'}`}>
                {musicVolume}%
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Sound Effects Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Volume2 size={20} className="text-pink-400" />
                <span className="text-pink-300 font-semibold tracking-wide">SOUND EFFECTS</span>
              </div>
              <button
                onClick={handleSfxToggle}
                className={`w-14 h-8 rounded-full transition-all duration-300 ${
                  sfxEnabled 
                    ? 'bg-pink-500 shadow-[0_0_15px_rgba(236,72,153,0.5)]' 
                    : 'bg-slate-700'
                }`}
              >
                <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                  sfxEnabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </button>
            </div>
            
            {/* SFX Volume Slider */}
            <div className="flex items-center gap-3">
              <VolumeX size={16} className="text-slate-500" />
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVolume}
                onChange={handleSfxVolumeChange}
                disabled={!sfxEnabled}
                className={`flex-1 h-2 rounded-full appearance-none cursor-pointer ${
                  sfxEnabled 
                    ? 'bg-slate-700' 
                    : 'bg-slate-800 opacity-50'
                }`}
                style={{
                  background: sfxEnabled 
                    ? `linear-gradient(to right, #ec4899 ${sfxVolume}%, #334155 ${sfxVolume}%)`
                    : '#1e293b'
                }}
              />
              <Volume2 size={16} className={sfxEnabled ? 'text-pink-400' : 'text-slate-600'} />
              <span className={`text-sm w-10 text-right ${sfxEnabled ? 'text-pink-300' : 'text-slate-600'}`}>
                {sfxVolume}%
              </span>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-slate-700/50" />

          {/* Vibration Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate size={20} className="text-green-400" />
              <span className="text-green-300 font-semibold tracking-wide">VIBRATION</span>
            </div>
            <button
              onClick={handleVibrationToggle}
              className={`w-14 h-8 rounded-full transition-all duration-300 ${
                vibrationEnabled 
                  ? 'bg-green-500 shadow-[0_0_15px_rgba(74,222,128,0.5)]' 
                  : 'bg-slate-700'
              }`}
            >
              <div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${
                vibrationEnabled ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {/* Vibration Note */}
          <p className="text-xs text-slate-500 italic">
            Note: Vibration requires device support and may not work on all devices.
          </p>
        </div>
        
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="w-full mt-6 p-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold tracking-wide hover:from-purple-500 hover:to-pink-500 transition-all shadow-[0_0_20px_rgba(168,85,247,0.4)]"
        >
          DONE
        </button>
      </div>
    </div>
  );
};

export default SettingsModal;