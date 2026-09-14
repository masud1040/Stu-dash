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

// Clean consecutive duplicate phrases/words (e.g. STT stutter glitches)
export function cleanTranscriptDuplicates(text: string): string {
  if (!text) return '';
  
  // Normalize whitespace
  let cleaned = text.replace(/\s+/g, ' ').trim();
  
  // Remove immediate consecutive identical words (e.g., "আমি আমি আমি" -> "আমি", "বর্তমানে বর্তমানে" -> "বর্তমানে")
  // Works across English and Unicode / Bengali characters
  cleaned = cleaned.replace(/(\b[\p{L}\p{N}_-]+\b)(?:\s+\1\b)+/giu, '$1');
  
  // Also clean 2-word duplicate phrases (e.g., "আমি সাইফুল আমি সাইফুল" -> "আমি সাইফুল")
  cleaned = cleaned.replace(/(\b[\p{L}\p{N}_-]+\s+[\p{L}\p{N}_-]+\b)(?:\s+\1\b)+/giu, '$1');

  // Also clean 3-word duplicate phrases
  cleaned = cleaned.replace(/(\b[\p{L}\p{N}_-]+\s+[\p{L}\p{N}_-]+\s+[\p{L}\p{N}_-]+\b)(?:\s+\1\b)+/giu, '$1');

  return cleaned;
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
  recognizer.maxAlternatives = 1;

  // Set recognition language
  if (language === 'বাংলা' || language === 'bn' || language === 'bn-BD') {
    recognizer.lang = 'bn-BD';
  } else if (language === 'Banglish') {
    // For mixed speech in South Asia, bn-BD or en-IN/en-US can recognize mixed terms
    recognizer.lang = 'bn-BD';
  } else {
    recognizer.lang = 'en-US';
  }

  // Session-scoped state to track finalized text without repeats
  let sessionFinalTranscript = '';

  recognizer.onstart = () => {
    sessionFinalTranscript = '';
    handlers.onStart();
  };

  recognizer.onresult = (event: any) => {
    let interimTranscript = '';
    let newlyFinalized = '';

    // Loop ONLY over event.results starting from event.resultIndex to avoid repeating previous results!
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      const result = event.results[i];
      const text = result[0]?.transcript || '';
      
      if (result.isFinal) {
        newlyFinalized += (newlyFinalized ? ' ' : '') + text.trim();
      } else {
        interimTranscript += (interimTranscript ? ' ' : '') + text.trim();
      }
    }

    if (newlyFinalized) {
      sessionFinalTranscript = sessionFinalTranscript
        ? `${sessionFinalTranscript} ${newlyFinalized}`.trim()
        : newlyFinalized.trim();
    }

    // Combine current finalized session text with latest interim transcript
    const combined = [sessionFinalTranscript, interimTranscript]
      .filter(Boolean)
      .join(' ')
      .trim();

    const cleanedCombined = cleanTranscriptDuplicates(combined);

    handlers.onResult(
      cleanedCombined,
      Boolean(newlyFinalized),
      cleanTranscriptDuplicates(sessionFinalTranscript),
      interimTranscript
    );
  };

  recognizer.onerror = (event: any) => {
    let errorMsg = 'An error occurred during speech recognition.';
    if (event.error === 'not-allowed' || event.error === 'permission-denied') {
      errorMsg = 'Microphone permission was denied. Please allow microphone access in your browser or type your answer.';
    } else if (event.error === 'no-speech') {
      // no-speech is common during normal pauses; don't terminate or panic
      return;
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
