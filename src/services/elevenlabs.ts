import axios from 'axios';

const BASE_URL = 'https://api.elevenlabs.io/v1';

export const MODELS = [
  { id: 'eleven_multilingual_v2', name: 'Multilingual v2', costPer1k: 0.10 },
  { id: 'eleven_turbo_v2_5', name: 'Turbo v2.5 (Fast)', costPer1k: 0.05 },
  { id: 'eleven_turbo_v2', name: 'Turbo v2 (Fast)', costPer1k: 0.05 },
  { id: 'eleven_monolingual_v1', name: 'Monolingual v1', costPer1k: 0.10 },
];

export const OUTPUT_FORMATS = [
  { id: 'pcm_44100', name: 'WAV - 44.1kHz (Lossless/Best)' },
  { id: 'pcm_24000', name: 'WAV - 24.0kHz (High)' },
  { id: 'mp3_44100_192', name: 'MP3 - 192kbps (Highest)' },
  { id: 'mp3_44100_128', name: 'MP3 - 128kbps (Standard)' },
  { id: 'mp3_44100_96', name: 'MP3 - 96kbps (Light)' },
];

export const LANGUAGES = [
  { id: 'auto', name: 'Auto Detect' },
  { id: 'en', name: 'English' },
  { id: 'ru', name: 'Russian' },
  { id: 'es', name: 'Spanish' },
  { id: 'fr', name: 'French' },
  { id: 'de', name: 'German' },
  { id: 'it', name: 'Italian' },
  { id: 'pt', name: 'Portuguese' },
  { id: 'pl', name: 'Polish' },
  { id: 'hi', name: 'Hindi' },
];

export interface Voice {
  voice_id: string;
  name: string;
  preview_url: string;
}

export interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style: number;
  use_speaker_boost: boolean;
  speed: number;
}

export const getVoices = async (apiKey: string): Promise<Voice[]> => {
  try {
    const response = await axios.get(`${BASE_URL}/voices`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });
    return response.data.voices;
  } catch (error: any) {
    console.error('Error fetching voices:', error);
    if (error.response?.status === 401) {
      throw new Error('Invalid API Key. Please verify your ElevenLabs API key.');
    }
    throw new Error('Failed to connect to ElevenLabs API. Check your internet connection or API key.');
  }
};

export const getVoice = async (apiKey: string, voiceId: string): Promise<Voice> => {
  try {
    const response = await axios.get(`${BASE_URL}/voices/${voiceId}`, {
      headers: {
        'xi-api-key': apiKey,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching voice:', error);
    throw new Error('Failed to fetch voice. Invalid ID or API key.');
  }
};

export const generateAudio = async (
  apiKey: string,
  text: string,
  voiceId: string,
  modelId: string,
  settings: VoiceSettings,
  outputFormat: string
): Promise<Blob> => {
  try {
    const payload: any = {
      text,
      model_id: modelId,
      voice_settings: {
        stability: settings.stability,
        similarity_boost: settings.similarity_boost,
        style: settings.style,
        use_speaker_boost: settings.use_speaker_boost,
        // ElevenLabs API doesn't fully support speed everywhere, but if supported, it's passed here.
        speed: settings.speed,
      },
    };

    const response = await axios.post(
      `${BASE_URL}/text-to-speech/${voiceId}?output_format=${outputFormat}`,
      payload,
      {
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': outputFormat.startsWith('pcm') ? 'audio/pcm' : 'audio/mpeg',
        },
        responseType: 'blob',
      }
    );

    let blob = response.data;
    if (outputFormat.startsWith('pcm_')) {
      const sampleRate = parseInt(outputFormat.split('_')[1], 10);
      blob = await addWavHeader(blob, sampleRate);
    }

    return blob;
  } catch (error: any) {
    console.error('Error generating audio:', error);
    if (error.response?.data instanceof Blob) {
      // Parse blob error message
      const textError = await error.response.data.text();
      try {
        const jsonError = JSON.parse(textError);
        throw new Error(jsonError.detail.message || 'Error generating audio');
      } catch (e) {
        throw new Error(textError || 'Error generating audio');
      }
    }
    throw new Error('Failed to generate audio. Check your settings and quota.');
  }
};

const addWavHeader = async (pcmBlob: Blob, sampleRate: number): Promise<Blob> => {
  const pcmBuffer = await pcmBlob.arrayBuffer();
  const numChannels = 1; // ElevenLabs is mono
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.byteLength;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (view: DataView, offset: number, string: string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
  view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
  view.setUint16(22, numChannels, true); // NumChannels
  view.setUint32(24, sampleRate, true); // SampleRate
  view.setUint32(28, byteRate, true); // ByteRate
  view.setUint16(32, blockAlign, true); // BlockAlign
  view.setUint16(34, bitsPerSample, true); // BitsPerSample

  // data sub-chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true);

  // Write PCM data
  new Uint8Array(buffer, 44).set(new Uint8Array(pcmBuffer));

  return new Blob([view], { type: 'audio/wav' });
};
