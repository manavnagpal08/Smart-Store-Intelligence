// Web Audio API Dual-Frequency Siren & Speech Synthesizer Floor PA Dispatcher

let audioCtx: AudioContext | null = null;
let sirenOscillator1: OscillatorNode | null = null;
let sirenOscillator2: OscillatorNode | null = null;
let sirenGainNode: GainNode | null = null;
let sirenInterval: any = null;

export const playAudioChime = (type: 'beep' | 'warning' | 'panic' = 'beep') => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);

    const now = audioCtx.currentTime;

    if (type === 'warning') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.3);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.1);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.25);
      osc.start(now);
      osc.stop(now + 0.25);
    }
  } catch (err) {
    console.warn('Web Audio Playback failed:', err);
  }
};

export const startLockdownSiren = () => {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    if (sirenOscillator1) return; // already active

    sirenGainNode = audioCtx.createGain();
    sirenGainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
    sirenGainNode.connect(audioCtx.destination);

    sirenOscillator1 = audioCtx.createOscillator();
    sirenOscillator1.type = 'sawtooth';
    sirenOscillator1.frequency.setValueAtTime(600, audioCtx.currentTime);
    sirenOscillator1.connect(sirenGainNode);
    sirenOscillator1.start();

    let high = false;
    sirenInterval = setInterval(() => {
      if (sirenOscillator1 && audioCtx) {
        high = !high;
        const targetFreq = high ? 960 : 540;
        sirenOscillator1.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
      }
    }, 400);
  } catch (err) {
    console.warn('Failed to start lockdown siren:', err);
  }
};

export const stopLockdownSiren = () => {
  try {
    if (sirenInterval) {
      clearInterval(sirenInterval);
      sirenInterval = null;
    }
    if (sirenOscillator1) {
      sirenOscillator1.stop();
      sirenOscillator1.disconnect();
      sirenOscillator1 = null;
    }
    if (sirenGainNode) {
      sirenGainNode.disconnect();
      sirenGainNode = null;
    }
  } catch (err) {
    console.warn('Failed to stop siren:', err);
  }
};

export const speakFloorAnnouncement = (text: string, priority = false): Promise<void> => {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      console.warn('Speech synthesis not supported on this browser.');
      resolve();
      return;
    }

    if (priority) {
      window.speechSynthesis.cancel(); // Interrupt existing speech
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick crisp English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find(v => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();

    window.speechSynthesis.speak(utterance);
  });
};
