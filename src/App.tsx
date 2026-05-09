import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Download, Lock, Key, Activity, 
  Volume2, Mic2, AlertCircle, Cpu, Zap, FileAudio
} from 'lucide-react';
import { 
  getVoices, generateAudio, 
  MODELS, OUTPUT_FORMATS, LANGUAGES
} from './services/elevenlabs';
import type { Voice, VoiceSettings } from './services/elevenlabs';

function App() {
  // API Key State
  const [apiKey, setApiKey] = useState(() => localStorage.getItem('elevenlabs_api_key') || '');
  const [isKeySaved, setIsKeySaved] = useState(!!localStorage.getItem('elevenlabs_api_key'));
  
  // Voices & Models State
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState('');
  const [customVoiceId, setCustomVoiceId] = useState('');
  const [useCustomVoiceId, setUseCustomVoiceId] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [selectedFormat, setSelectedFormat] = useState(OUTPUT_FORMATS[0].id);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0].id);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voicesError, setVoicesError] = useState('');

  // Voice Settings State
  const [settings, setSettings] = useState<VoiceSettings>({
    stability: 0.5,
    similarity_boost: 0.75,
    style: 0.0,
    use_speaker_boost: true,
    speed: 1.0
  });

  // Text & Generation State
  const [text, setText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [generateError, setGenerateError] = useState('');

  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (isKeySaved && apiKey) {
      fetchVoicesList();
    }
  }, [isKeySaved]);

  const fetchVoicesList = async () => {
    setIsLoadingVoices(true);
    setVoicesError('');
    try {
      const fetchedVoices = await getVoices(apiKey);
      const drewsVoice = { voice_id: 'PdSH3mOO4UIY0uOj5QWx', name: 'Drews (Custom)', preview_url: '' };
      // Filter out Drews if it's already in the fetched list to avoid duplicates
      const updatedVoices = [drewsVoice, ...fetchedVoices.filter((v: Voice) => v.voice_id !== 'PdSH3mOO4UIY0uOj5QWx')];
      
      setVoices(updatedVoices);
      if (!selectedVoiceId) {
        setSelectedVoiceId('PdSH3mOO4UIY0uOj5QWx');
      }
    } catch (err: any) {
      setVoicesError(err.message);
      setIsKeySaved(false); // Reset key if invalid
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSaveKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('elevenlabs_api_key', apiKey.trim());
      setIsKeySaved(true);
    }
  };

  const handleRemoveKey = () => {
    localStorage.removeItem('elevenlabs_api_key');
    setApiKey('');
    setIsKeySaved(false);
    setVoices([]);
    setAudioUrl(null);
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setGenerateError('Please enter some text to generate audio.');
      return;
    }
    
    const activeVoiceId = useCustomVoiceId ? customVoiceId : selectedVoiceId;
    if (!activeVoiceId) {
      setGenerateError('Please select or enter a valid Voice ID.');
      return;
    }

    setIsGenerating(true);
    setGenerateError('');
    setAudioUrl(null);

    try {
      const blob = await generateAudio(
        apiKey,
        text,
        activeVoiceId,
        selectedModel,
        settings,
        selectedFormat
      );
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);
    } catch (err: any) {
      setGenerateError(err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const calculateCost = () => {
    const model = MODELS.find(m => m.id === selectedModel);
    if (!model) return 0;
    return (text.length / 1000) * model.costPer1k;
  };

  return (
    <div className="container animate-fade-in">
      <header>
        <h1 className="text-gradient" style={{ fontSize: '2rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
          <Zap size={32} color="var(--accent-primary)" />
          Liquid Voice Synthesizer
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Next-Generation AI Audio Generation Powered by ElevenLabs</p>
      </header>

      {!isKeySaved ? (
        <div className="glass-panel" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
          <Lock size={48} color="var(--accent-secondary)" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ marginBottom: '1rem' }}>Secure API Connection</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', fontSize: '0.9rem' }}>
            Your API key is stored securely in your browser's local storage and is sent directly to the ElevenLabs API. 
            It is never sent to any other servers.
          </p>
          {voicesError && (
            <div style={{ color: 'var(--danger)', marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255, 51, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 51, 102, 0.2)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={20} /> {voicesError}
            </div>
          )}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input 
              type="password" 
              className="glass-input" 
              placeholder="Enter your ElevenLabs API Key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSaveKey()}
            />
            <button className="glass-button primary" onClick={handleSaveKey} disabled={isLoadingVoices}>
              {isLoadingVoices ? <Activity className="animate-spin" size={18} /> : <Key size={18} />} 
              {isLoadingVoices ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      ) : (
        <div className="app-grid">
          {/* Left Sidebar - Settings */}
          <div className="glass-panel" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                <Settings size={18} color="var(--accent-primary)" /> Configuration
              </h2>
              <button className="glass-button" onClick={handleRemoveKey} style={{ padding: '4px 10px', fontSize: '0.8rem' }}>
                Disconnect
              </button>
            </div>

            {voicesError && (
              <div style={{ color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                <AlertCircle size={16} /> {voicesError}
              </div>
            )}

            <div style={{ marginBottom: '1rem' }}>
              <label className="slider-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Model</label>
              <div style={{ position: 'relative' }}>
                <Cpu size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                <select 
                  className="glass-input" 
                  style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', fontSize: '0.85rem' }}
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                >
                  {MODELS.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name} (${model.costPer1k}/1k chars)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="slider-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Voice Selection</label>
              
              <div className="toggle-switch" style={{ marginBottom: '0.75rem' }}>
                <input 
                  type="checkbox" 
                  id="custom-voice-toggle" 
                  checked={useCustomVoiceId}
                  onChange={(e) => setUseCustomVoiceId(e.target.checked)}
                />
                <label htmlFor="custom-voice-toggle" className="toggle-slider" style={{ transform: 'scale(0.8)', transformOrigin: 'left' }}></label>
                <span className="toggle-label" style={{ fontSize: '0.8rem' }}>Custom Voice ID</span>
              </div>

              {useCustomVoiceId ? (
                <input 
                  type="text" 
                  className="glass-input" 
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  placeholder="Enter Voice ID" 
                  value={customVoiceId}
                  onChange={(e) => setCustomVoiceId(e.target.value)}
                />
              ) : (
                <div style={{ position: 'relative' }}>
                  <Mic2 size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-muted)' }} />
                  <select 
                    className="glass-input" 
                    style={{ paddingLeft: '32px', padding: '8px 12px 8px 32px', fontSize: '0.85rem' }}
                    value={selectedVoiceId}
                    onChange={(e) => setSelectedVoiceId(e.target.value)}
                    disabled={isLoadingVoices}
                  >
                    {isLoadingVoices ? <option>Loading voices...</option> : null}
                    {voices.map(voice => (
                      <option key={voice.voice_id} value={voice.voice_id}>{voice.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label className="slider-label" style={{ display: 'block', marginBottom: '4px', fontSize: '0.85rem' }}>Language (Visual)</label>
              <select 
                className="glass-input" 
                style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.id} value={lang.id}>{lang.name}</option>
                ))}
              </select>
            </div>

            <div style={{ borderTop: '1px solid var(--glass-border)', margin: '1rem 0' }}></div>

            <h3 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Voice Settings</h3>

            <div className="slider-container" style={{ marginBottom: '0.75rem' }}>
              <div className="slider-header" style={{ marginBottom: '0.25rem', fontSize: '0.8rem' }}>
                <span className="slider-label">Stability</span>
                <span className="slider-value">{settings.stability.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={settings.stability} 
                onChange={(e) => setSettings({...settings, stability: parseFloat(e.target.value)})}
              />
            </div>

            <div className="slider-container">
              <div className="slider-header">
                <span className="slider-label">Similarity Boost</span>
                <span className="slider-value">{settings.similarity_boost.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={settings.similarity_boost} 
                onChange={(e) => setSettings({...settings, similarity_boost: parseFloat(e.target.value)})}
              />
            </div>

            <div className="slider-container">
              <div className="slider-header">
                <span className="slider-label">Style Exaggeration</span>
                <span className="slider-value">{settings.style.toFixed(2)}</span>
              </div>
              <input 
                type="range" min="0" max="1" step="0.01" 
                value={settings.style} 
                onChange={(e) => setSettings({...settings, style: parseFloat(e.target.value)})}
              />
            </div>

            <div className="slider-container">
              <div className="slider-header">
                <span className="slider-label">Speed</span>
                <span className="slider-value">{settings.speed.toFixed(2)}x</span>
              </div>
              <input 
                type="range" min="0.5" max="2" step="0.05" 
                value={settings.speed} 
                onChange={(e) => setSettings({...settings, speed: parseFloat(e.target.value)})}
              />
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>Speed is model-dependent.</p>
            </div>

            <div className="toggle-switch" style={{ marginTop: '1rem', marginBottom: '0' }}>
              <input 
                type="checkbox" 
                id="speaker-boost" 
                checked={settings.use_speaker_boost}
                onChange={(e) => setSettings({...settings, use_speaker_boost: e.target.checked})}
              />
              <label htmlFor="speaker-boost" className="toggle-slider" style={{ transform: 'scale(0.8)', transformOrigin: 'left' }}></label>
              <span className="toggle-label" style={{ fontSize: '0.8rem' }}>Speaker Boost</span>
            </div>

          </div>

          {/* Right Main Area */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
            
            <div className="glass-panel" style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.1rem' }}>
                  <FileAudio size={18} color="var(--accent-secondary)" /> Text Input
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Format:</label>
                  <select 
                    className="glass-input" 
                    style={{ padding: '6px 30px 6px 12px', fontSize: '0.875rem', width: 'auto' }}
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value)}
                  >
                    {OUTPUT_FORMATS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <textarea 
                className="glass-input" 
                style={{ flex: 1, minHeight: '150px', resize: 'none', marginBottom: '1rem', lineHeight: '1.5', fontSize: '0.9rem' }}
                placeholder="Enter the text you want to synthesize here..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.3)', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                <div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>Characters</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{text.length}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '4px' }}>Estimated Cost</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--accent-primary)' }}>
                    ${calculateCost().toFixed(4)}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.7rem', marginTop: '4px' }}>
                    *Based on standard API rate
                  </div>
                </div>
              </div>

              {generateError && (
                <div style={{ color: 'var(--danger)', marginTop: '1rem', padding: '1rem', background: 'rgba(255, 51, 102, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 51, 102, 0.2)' }}>
                  <AlertCircle size={16} style={{ verticalAlign: 'text-bottom', marginRight: '8px' }} />
                  {generateError}
                </div>
              )}

              <button 
                className="glass-button primary" 
                style={{ width: '100%', marginTop: '1rem', padding: '12px', fontSize: '1rem' }}
                onClick={handleGenerate}
                disabled={isGenerating || !text.trim()}
              >
                {isGenerating ? (
                  <><Activity className="animate-spin" size={20} /> Generating...</>
                ) : (
                  <><Zap size={20} /> Generate Voiceover</>
                )}
              </button>
            </div>

            {/* Audio Player Panel */}
            {audioUrl && (
              <div className="glass-panel animate-fade-in" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '1rem' }}>
                    <Volume2 size={18} color="var(--success)" /> Audio Ready
                  </h3>
                  <a href={audioUrl} download={`voiceover_${new Date().getTime()}.${selectedFormat.includes('mp3') ? 'mp3' : 'wav'}`} style={{ textDecoration: 'none' }}>
                    <button className="glass-button" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                      <Download size={14} /> Download
                    </button>
                  </a>
                </div>
                
                <audio 
                  ref={audioRef}
                  controls 
                  src={audioUrl} 
                  style={{ width: '100%', outline: 'none' }} 
                  autoPlay
                />
              </div>
            )}

          </div>
        </div>
      )}

      {/* Decorative Glow Elements */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>
    </div>
  );
}

export default App;
