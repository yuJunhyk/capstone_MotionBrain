// 프레임 소스 두 종류.
//  - HandTracker: 웹캠 + MediaPipe Hand Landmarker. 매 프레임 { t, present, landmarks, aspect, fps }
//  - KeyboardSource: 웹캠 없이 흐름을 보기 위한 데모. 매 프레임 { t, present, candidate, clarity, motion, fps }
// 두 소스 모두 onFrame(frame) 콜백 하나로 결과를 넘긴다.

import { CONFIG } from './config.js';

export class HandTracker {
  constructor(videoEl, onFrame) {
    this.video = videoEl;
    this.onFrame = onFrame;
    this.landmarker = null;
    this.raf = null;
    this.lastVideoTime = -1;
    this.fpsWindow = [];
    this.running = false;
  }

  async load(onProgress) {
    onProgress?.('손 인식 모듈 불러오는 중…');
    const { FilesetResolver, HandLandmarker } = await import(CONFIG.mediapipe.bundleUrl);
    const fileset = await FilesetResolver.forVisionTasks(CONFIG.mediapipe.wasmBase);
    const options = {
      baseOptions: { modelAssetPath: CONFIG.mediapipe.modelUrl, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numHands: 1,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    };
    onProgress?.('손 인식 모델 준비 중…');
    try {
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
    } catch (e) {
      console.warn('GPU 추론 실패, CPU로 전환', e);
      options.baseOptions.delegate = 'CPU';
      this.landmarker = await HandLandmarker.createFromOptions(fileset, options);
    }
    return this;
  }

  start() {
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const v = this.video;
      if (!v.videoWidth || v.currentTime === this.lastVideoTime) return; // 같은 프레임은 다시 처리하지 않는다
      this.lastVideoTime = v.currentTime;
      const t = performance.now();
      let result;
      try { result = this.landmarker.detectForVideo(v, t); }
      catch (e) { console.warn('detectForVideo 실패', e); return; }
      this.fpsWindow.push(t);
      while (this.fpsWindow.length && t - this.fpsWindow[0] > 1000) this.fpsWindow.shift();
      const landmarks = result?.landmarks?.[0] || null;
      this.onFrame({
        t, present: !!landmarks, landmarks,
        aspect: v.videoWidth / v.videoHeight,
        fps: this.fpsWindow.length,
        source: 'camera',
      });
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
  }

  dispose() {
    this.stop();
    this.landmarker?.close?.();
    this.landmarker = null;
  }
}

// 키보드 데모: 1=가위 2=바위 3=보 (누르고 있는 동안 유지), 4=흐린 보, 0=손 숨기기/보이기, Space=중립 손
export const KEYBOARD_HELP = [
  ['1', '가위'], ['2', '바위'], ['3', '보'], ['4', '흐린 손 모양'], ['0', '손 숨기기 / 보이기'], ['Space', '중립 손'],
];

export class KeyboardSource {
  constructor(onFrame) {
    this.onFrame = onFrame;
    this.held = [];          // 누르고 있는 제스처 키 순서
    this.hidden = false;     // 0 키로 토글
    this.timer = null;
    this.onDown = (e) => this.keydown(e);
    this.onUp = (e) => this.keyup(e);
  }

  static map(key) {
    return { '1': 'scissors', '2': 'rock', '3': 'paper', '4': 'paper-unclear' }[key] || null;
  }

  keydown(e) {
    if (e.repeat) return;
    if (e.target && /^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName)) return;
    if (e.key === '0') { this.hidden = !this.hidden; e.preventDefault(); return; }
    if (e.key === ' ') { this.held = []; e.preventDefault(); return; }
    const g = KeyboardSource.map(e.key);
    if (g) { this.held = this.held.filter((x) => x !== g); this.held.push(g); e.preventDefault(); }
  }

  keyup(e) {
    const g = KeyboardSource.map(e.key);
    if (g) this.held = this.held.filter((x) => x !== g);
  }

  start() {
    window.addEventListener('keydown', this.onDown);
    window.addEventListener('keyup', this.onUp);
    this.timer = setInterval(() => {
      const t = performance.now();
      const top = this.held[this.held.length - 1] || null;
      const unclear = top === 'paper-unclear';
      this.onFrame({
        t,
        present: !this.hidden,
        candidate: unclear ? 'paper' : top,
        clarity: top ? (unclear ? 0.15 : 1) : 0,
        motion: 0,
        fps: 30,
        source: 'keyboard',
      });
    }, 33);
  }

  stop() {
    window.removeEventListener('keydown', this.onDown);
    window.removeEventListener('keyup', this.onUp);
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }
}
