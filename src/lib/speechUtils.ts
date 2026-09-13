// Cross-browser Speech Recognition & Synthesis Helper

export interface SpeechRecognitionHandlers {
  onResult: (
    currentText: string,
    isFinal: boolean,
    sessionFinalTranscript?: string,
    sessionInterimTranscript?: string
  ) => void;
  onError: (error: string) => void;
  onStart: () => void;
  onEnd: () => void;
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function createSpeechRecognizer(
  language: string,
  handlers: SpeechRecognitionHandlers
) {
  if (!isSpeechRecognitionSupported()) {
    handlers.onError('Speech recognition is not supported in this browser. You can type your answer directly.');
    return null;
  }

  const SpeechRecognitionClass = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognizer = new SpeechRecognitionClass();

  recognizer.continuous = true;
  recognizer.interimResults = true;

  // Set recognition language
  if (language === 'বাংলা') {
    recognizer.lang = 'bn-BD';
  } else if (language === 'Banglish') {
    // Banglish works best with en-US or bn-BD depending on user preference
    recognizer.lang = 'en-US';
  } else {
    recognizer.lang = 'en-US';
  }

  recognizer.onstart = () => {
    handlers.onStart();
  };

  recognizer.onresult = (event: any) => {
    let sessionFinal = '';
    let sessionInterim = '';

    for (let i = 0; i < event.results.length; ++i) {
      const res = event.results[i];
      const text = res[0]?.transcript || '';
      if (res.isFinal) {
        sessionFinal += (sessionFinal ? ' ' : '') + text.trim();
      } else {
        sessionInterim += (sessionInterim ? ' ' : '') + text.trim();
      }
    }

    const currentText = [sessionFinal, sessionInterim].filter(Boolean).join(' ');
    handlers.onResult(
      currentText,
      Boolean(sessionFinal),
      sessionFinal,
      sessionInterim
    );
  };

  recognizer.onerror = (event: any) => {
    let errorMsg = 'An error occurred during speech recognition.';
    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser or type your answer.';
    } else if (event.error === 'no-speech') {
      errorMsg = 'No speech was detected. Please try speaking closer to your microphone or type your response.';
    } else if (event.error === 'audio-capture') {
      errorMsg = 'No microphone was found or microphone is busy.';
    } else if (event.error === 'network') {
      errorMsg = 'Network error occurred during speech recognition. You can continue typing manually.';
    }
    handlers.onError(errorMsg);
  };

  recognizer.onend = () => {
    handlers.onEnd();
  };

  return recognizer;
}

// Text-to-Speech Helper
export function speakText(
  text: string,
  language: string,
  onStart?: () => void,
  onEnd?: () => void,
  onError?: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onEnd) onEnd();
    return null;
  }

  // Cancel any ongoing speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  // Select voice if available
  const voices = window.speechSynthesis.getVoices();
  if (language === 'বাংলা') {
    utterance.lang = 'bn-BD';
    const bengaliVoice = voices.find(v => v.lang.startsWith('bn'));
    if (bengaliVoice) utterance.voice = bengaliVoice;
  } else {
    utterance.lang = 'en-US';
    const englishVoice = voices.find(v => v.lang === 'en-US' || v.lang.startsWith('en'));
    if (englishVoice) utterance.voice = englishVoice;
  }

  if (onStart) utterance.onstart = onStart;
  if (onEnd) utterance.onend = onEnd;
  if (onError) utterance.onerror = onError;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
