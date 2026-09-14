// 프로토타입 공통 설정. 값을 바꾸면 입력 프로필 버전(input-engine.js)도 같이 올린다.
export const CONFIG = {
  version: '0.3.0',

  // MediaPipe Hand Landmarker. 오프라인 실행본을 만들 때는 세 경로를 로컬 복사본으로 바꾼다.
  mediapipe: {
    bundleUrl: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/vision_bundle.mjs',
    wasmBase: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm',
    modelUrl: 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },

  camera: { width: 640, height: 480 },

  game: {
    durationMs: 60_000,   // 한 판 60초
    responseMs: 3_500,    // 한 문제당 응답 제한
    feedbackMs: 800,      // 정답·오답 표시 시간
    pointsPerCorrect: 10,
  },

  flow: {
    greetHoldMs: 800,     // 손 인사: 손이 이만큼 계속 보이면 통과
    practiceTargets: ['paper', 'rock'],  // 연습에서 요구하는 손 모양 순서
  },

  storage: { key: 'motionbrain.prototype.v0.3' },
};
