import * as THREE from 'three';
import './style.css';
import { PersonaModel } from './persona';
import { PatchGenerator, type ResponseCategory } from './interaction';
import { VoiceController, isSpeechRecognitionSupported, type VoiceStatus } from './voice';

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private persona!: PersonaModel;

  constructor() {
    const appElement = document.getElementById('app');
    if (!appElement) return;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x242424);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.4, 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    appElement.appendChild(this.renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    this.scene.add(directionalLight);

    this.persona = new PersonaModel();
    this.scene.add(this.persona.mesh);

    this.initUI();
    this.animate();

    window.addEventListener('resize', () => this.onWindowResize());
  }

  private initUI() {
    const overlay = document.createElement('div');
    overlay.id = 'ui-overlay';
    overlay.innerHTML = `
      <div class="question">What is your first impression of this person's appearance?</div>
      <div class="button-container">
        <button id="btn-negative">Distant</button>
        <button id="btn-neutral">Calm</button>
        <button id="btn-positive">Friendly</button>
      </div>
      <div class="voice-container">
        <button id="btn-voice" type="button" aria-pressed="false" aria-describedby="voice-status">
          <span aria-hidden="true">🎙</span> Press and speak
        </button>
        <div id="voice-status" class="voice-status" data-state="ready" role="status" aria-live="polite">Ready</div>
        <div id="voice-transcript" class="voice-transcript" hidden></div>
      </div>
    `;
    document.body.appendChild(overlay);

    document.getElementById('btn-negative')!.addEventListener('click', () => this.addPatch('Negative'));
    document.getElementById('btn-neutral')!.addEventListener('click', () => this.addPatch('Neutral'));
    document.getElementById('btn-positive')!.addEventListener('click', () => this.addPatch('Positive'));

    this.initVoice();
  }

  private initVoice() {
    const micButton = document.getElementById('btn-voice') as HTMLButtonElement;
    const statusElement = document.getElementById('voice-status') as HTMLDivElement;
    const transcriptElement = document.getElementById('voice-transcript') as HTMLDivElement;

    const showStatus = (status: VoiceStatus, detail?: string) => {
      statusElement.dataset.state = status.toLowerCase().replace(/[^a-z]/g, '');
      statusElement.textContent = detail ? `${status} — ${detail}` : status;
    };

    const voice = new VoiceController({
      onStatus: (status, detail) => {
        showStatus(status, detail);
        if (status === 'Listening...') {
          transcriptElement.hidden = true;
          transcriptElement.textContent = '';
        }
        const listening = status === 'Listening...';
        micButton.classList.toggle('is-listening', listening);
        micButton.setAttribute('aria-pressed', String(listening));
      },
      onTranscript: (transcript) => {
        transcriptElement.hidden = false;
        transcriptElement.textContent = `"${transcript}"`;
      },
      onResult: (result) => this.addPatch(result.category),
    });

    if (!isSpeechRecognitionSupported()) {
      micButton.disabled = true;
      micButton.textContent = '🎙 Voice unavailable';
      showStatus('Error', 'Speech recognition is not supported in this browser. Use the buttons above.');
      return;
    }

    micButton.addEventListener('click', () => voice.toggle());
  }

  private addPatch(category: ResponseCategory) {
    const patch = PatchGenerator.createPatch(category);
    
    // For the prototype, we place it on the face (head)
    const headPos = this.persona.getRegionPosition('head');
    
    // Add some randomness to placement so they don't perfectly overlap
    patch.position.copy(headPos);
    patch.position.x += (Math.random() - 0.5) * 0.2;
    patch.position.y += (Math.random() - 0.5) * 0.2;
    patch.position.z += 0.18; // Slightly in front of the sphere

    // Random rotation for 'bandage' look
    patch.rotation.z = (Math.random() - 0.5) * Math.PI / 2;

    this.scene.add(patch);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}

new App();