import Sentiment from 'sentiment';
import type { ResponseCategory } from './interaction';

export type VoiceStatus = 'Ready' | 'Listening...' | 'Analysing...' | 'Result' | 'Error';

export interface VoiceResult {
  transcript: string;
  score: number;
  category: ResponseCategory;
}

export interface VoiceCallbacks {
  onStatus: (status: VoiceStatus, detail?: string) => void;
  onTranscript: (transcript: string) => void;
  onResult: (result: VoiceResult) => void;
}

const RECOGNITION_LANG = 'en-US';

const ERROR_MESSAGES: Record<string, string> = {
  'not-allowed': 'Microphone permission was denied. Allow microphone access and try again.',
  'service-not-allowed': 'Microphone access is blocked by the browser. Update the site settings and try again.',
  'audio-capture': 'No microphone was found. Check your device and try again.',
  'no-speech': 'No speech detected. Press and speak again.',
  network: 'Speech recognition needs a network connection. Check it and try again.',
  'language-not-supported': 'English (en-US) speech recognition is not supported in this browser.',
  aborted: 'Recording stopped. Press and speak again.',
};

// Minimal Web Speech API typings; TypeScript's DOM lib does not ship them.
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}

interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}

interface SpeechRecognitionResultListLike {
  readonly length: number;
  [index: number]: SpeechRecognitionResultLike;
}

interface SpeechRecognitionEventLike extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultListLike;
}

interface SpeechRecognitionErrorEventLike extends Event {
  readonly error: string;
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;

  const { SpeechRecognition, webkitSpeechRecognition } = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  return SpeechRecognition ?? webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

const sentiment = new Sentiment();

export function classifyTranscript(transcript: string): VoiceResult {
  const { score } = sentiment.analyze(transcript);
  const category: ResponseCategory = score > 0 ? 'Positive' : score < 0 ? 'Negative' : 'Neutral';

  return { transcript, score, category };
}

export class VoiceController {
  private readonly callbacks: VoiceCallbacks;
  private recognition: SpeechRecognitionLike | null = null;
  private active = false;
  private resolved = false;
  private stopRequested = false;

  constructor(callbacks: VoiceCallbacks) {
    this.callbacks = callbacks;
  }

  toggle(): void {
    if (this.active) {
      this.stop();
    } else {
      this.start();
    }
  }

  start(): void {
    // Never allow two recording sessions at the same time.
    if (this.active) return;

    const Recognition = getSpeechRecognitionConstructor();
    if (!Recognition) {
      this.callbacks.onStatus('Error', 'Speech recognition is not supported in this browser. Use the buttons below.');
      return;
    }

    const recognition = new Recognition();
    this.recognition = recognition;
    this.active = true;
    this.resolved = false;
    this.stopRequested = false;

    recognition.lang = RECOGNITION_LANG;
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (result.isFinal) transcript += result[0].transcript;
      }

      const text = transcript.trim();
      if (text) void this.process(recognition, text);
    };

    recognition.onerror = (event) => {
      if (this.resolved) return;
      this.resolved = true;
      this.release(recognition);
      this.callbacks.onStatus('Error', ERROR_MESSAGES[event.error] ?? 'Voice recognition failed. Press and speak again.');
    };

    recognition.onend = () => {
      if (this.resolved) return;
      this.resolved = true;
      const stoppedByUser = this.stopRequested;
      this.release(recognition);
      this.callbacks.onStatus(
        'Error',
        stoppedByUser ? 'Recording stopped. Press and speak again.' : 'No speech detected. Press and speak again.',
      );
    };

    this.callbacks.onStatus('Listening...');

    try {
      recognition.start();
    } catch {
      this.resolved = true;
      this.release(recognition);
      this.callbacks.onStatus('Error', 'Could not start the microphone. Press and speak again.');
    }
  }

  stop(): void {
    if (!this.active || !this.recognition) return;
    this.stopRequested = true;
    try {
      this.recognition.stop();
    } catch {
      // Recognition already stopped.
    }
  }

  private async process(recognition: SpeechRecognitionLike, transcript: string): Promise<void> {
    // Each recording is processed exactly once.
    if (this.resolved) return;
    this.resolved = true;
    this.release(recognition);

    this.callbacks.onTranscript(transcript);
    this.callbacks.onStatus('Analysing...');
    await new Promise((resolve) => setTimeout(resolve, 150));

    const result = classifyTranscript(transcript);
    this.callbacks.onResult(result);
    this.callbacks.onStatus('Result', `${result.category} (sentiment score ${result.score})`);
  }

  private release(recognition: SpeechRecognitionLike): void {
    recognition.onresult = null;
    recognition.onerror = null;
    recognition.onend = null;

    try {
      recognition.abort();
    } catch {
      // Recognition already stopped.
    }

    if (this.recognition === recognition) this.recognition = null;
    this.active = false;
  }
}
