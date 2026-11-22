import * as THREE from 'three';
import { ARButton } from 'three/addons/webxr/ARButton.js';
import './style.css';
import { PersonaModel } from './persona';
import { PatchGenerator, type ResponseCategory } from './interaction';
import { VoiceController, isSpeechRecognitionSupported, type VoiceStatus } from './voice';

// ARButton requests the 'local' reference space, whose origin sits at the viewer's head when
// the session starts. The floor is therefore derived from a typical eye height.
const AR_EYE_HEIGHT = 1.4;
const AR_MODEL_DISTANCE = 0.9; // meters in front of the user
const AR_MODEL_SCALE = 0.6;

class App {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private persona!: PersonaModel;
  private uiOverlay!: HTMLDivElement;
  private arExitButton!: HTMLButtonElement;
  private pendingARPlacement = false;

  constructor() {
    const appElement = document.getElementById('app');
    if (!appElement) return;

    this.scene = new THREE.Scene();
    // Transparent scene so the real-world passthrough stays visible in AR.
    // In flat mode the dark background comes from the page CSS instead.
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.set(0, 1.4, 2);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
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
    this.initAR();
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
      <div class="ar-container">
        <button id="btn-exit-ar" type="button" hidden>Exit AR</button>
        <div id="ar-status" class="ar-status" data-state="ready" role="status" aria-live="polite"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    this.uiOverlay = overlay;
    this.arExitButton = document.getElementById('btn-exit-ar') as HTMLButtonElement;

    document.getElementById('btn-negative')!.addEventListener('click', () => this.addPatch('Negative'));
    document.getElementById('btn-neutral')!.addEventListener('click', () => this.addPatch('Neutral'));
    document.getElementById('btn-positive')!.addEventListener('click', () => this.addPatch('Positive'));

    this.initVoice();
  }

  private initAR() {
    const arButton = ARButton.createButton(this.renderer, {
      optionalFeatures: ['local-floor', 'dom-overlay'],
      // Reuse the existing UI as the AR dom-overlay so it stays usable in the session.
      domOverlay: { root: this.uiOverlay },
    });
    document.body.appendChild(arButton);

    this.arExitButton.addEventListener('click', () => {
      void this.renderer.xr.getSession()?.end();
    });

    this.renderer.xr.addEventListener('sessionstart', () => {
      // The viewer pose is only valid on the first XR frame, so placement is deferred.
      this.pendingARPlacement = true;
      this.arExitButton.hidden = false;
    });

    this.renderer.xr.addEventListener('sessionend', () => {
      this.pendingARPlacement = false;
      this.arExitButton.hidden = true;
      this.resetPersonaPlacement();
      // ARButton hides the dom-overlay root when a session ends; restore the normal UI.
      this.uiOverlay.style.display = '';
    });

    void this.reportARSupport();
  }

  private async reportARSupport() {
    const status = document.getElementById('ar-status') as HTMLDivElement;
    const showFallback = (message: string) => {
      status.textContent = message;
      status.dataset.state = 'error';
    };

    if (!navigator.xr) {
      showFallback(
        'Immersive AR is not available: this browser has no WebXR support. Open the page in Meta Quest Browser (over HTTPS) on a Quest 2/3. The flat 3D view and buttons below still work.',
      );
      return;
    }

    try {
      const supported = await navigator.xr.isSessionSupported('immersive-ar');
      if (!supported) {
        showFallback(
          'This browser cannot start immersive AR. On Meta Quest 2, open the page in Quest Browser, allow camera/passthrough access, and reload. The flat 3D view and buttons below still work.',
        );
        return;
      }
      status.textContent = 'AR ready — press START AR.';
      status.dataset.state = 'ready';
    } catch {
      showFallback(
        'WebXR AR support could not be checked. On Meta Quest 2, serve the page over HTTPS and open it in Quest Browser. The flat 3D view and buttons below still work.',
      );
    }
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

    // Attach to the persona so patches follow it when it is placed in front of the user in AR.
    this.persona.mesh.add(patch);
  }

  private placePersonaInFrontOfUser(frame?: XRFrame) {
    const headPosition = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);

    const referenceSpace = this.renderer.xr.getReferenceSpace();
    const viewerPose = frame && referenceSpace ? frame.getViewerPose(referenceSpace) : null;

    if (viewerPose) {
      const { position, orientation } = viewerPose.transform;
      headPosition.set(position.x, position.y, position.z);
      forward.applyQuaternion(
        new THREE.Quaternion(orientation.x, orientation.y, orientation.z, orientation.w),
      );
    }

    forward.y = 0;
    if (forward.lengthSq() < 1e-6) forward.set(0, 0, -1);
    forward.normalize();

    const target = headPosition.clone().addScaledVector(forward, AR_MODEL_DISTANCE);

    this.persona.mesh.position.set(target.x, headPosition.y - AR_EYE_HEIGHT, target.z);
    this.persona.mesh.scale.setScalar(AR_MODEL_SCALE);
    // Face the user so the head and its patches are visible.
    this.persona.mesh.rotation.set(
      0,
      Math.atan2(headPosition.x - target.x, headPosition.z - target.z),
      0,
    );
  }

  private resetPersonaPlacement() {
    this.persona.mesh.position.set(0, 0, 0);
    this.persona.mesh.rotation.set(0, 0, 0);
    this.persona.mesh.scale.setScalar(1);
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate() {
    // setAnimationLoop is required for WebXR; requestAnimationFrame is paused while presenting.
    this.renderer.setAnimationLoop((_time, frame) => {
      if (this.pendingARPlacement) {
        this.pendingARPlacement = false;
        this.placePersonaInFrontOfUser(frame);
      }
      this.renderer.render(this.scene, this.camera);
    });
  }
}

new App();