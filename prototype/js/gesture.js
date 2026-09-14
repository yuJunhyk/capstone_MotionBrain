// 손 관절 21개 → 가위/바위/보 후보와 또렷함(clarity).
// 손 검출 점수를 제스처 확률로 쓰지 않는다. 손가락 펴짐 정도만 본다.

export const GESTURES = ['rock', 'paper', 'scissors'];
export const GESTURE_LABEL = { rock: '바위', paper: '보', scissors: '가위' };

// [MCP, PIP, DIP, TIP] 관절 번호. 엄지는 판정에서 뺀다(카메라 각도에 너무 민감).
const FINGERS = {
  index: [5, 6, 7, 8],
  middle: [9, 10, 11, 12],
  ring: [13, 14, 15, 16],
  pinky: [17, 18, 19, 20],
};

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function dist(a, b, aspect) {
  const dx = (a.x - b.x) * aspect;
  const dy = a.y - b.y;
  return Math.hypot(dx, dy);
}

/**
 * @param {Array<{x:number,y:number}>} lm  정규화 관절 좌표 21개
 * @param {number} aspect  영상 가로/세로 비율 (정규화 좌표의 왜곡 보정)
 * @returns {{candidate: string|null, clarity: number, extended: object|null, scores: object|null}}
 */
export function classify(lm, aspect = 4 / 3) {
  if (!lm || lm.length < 21) return { candidate: null, clarity: 0, extended: null, scores: null };

  const wrist = lm[0];
  const palm = dist(wrist, lm[9], aspect) || 1e-6; // 손목 → 중지 뿌리 = 손바닥 길이

  // 손가락별 펴짐 점수 s ∈ [-1, +1]. +1 또렷하게 펴짐, -1 또렷하게 접힘, 0 근처는 전환 중.
  const s = {};
  for (const [name, [, pip, , tip]] of Object.entries(FINGERS)) {
    const r = (dist(lm[tip], wrist, aspect) - dist(lm[pip], wrist, aspect)) / palm;
    s[name] = clamp((r - 0.1) / 0.2, -1, 1);
  }

  const scores = {
    paper: Math.min(s.index, s.middle, s.ring, s.pinky),
    rock: Math.min(-s.index, -s.middle, -s.ring, -s.pinky),
    scissors: Math.min(s.index, s.middle, -s.ring, -s.pinky),
  };

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [best, bestScore] = sorted[0];
  const second = sorted[1][1];

  if (bestScore <= 0) return { candidate: null, clarity: 0, extended: s, scores };

  // 또렷함: 최고 후보가 조건을 얼마나 확실히 만족하고, 2위와 얼마나 떨어져 있는가.
  const clarity = clamp(Math.min(bestScore, bestScore - second), 0, 1);
  return { candidate: best, clarity, extended: s, scores };
}

/** 손목 이동량(손바닥 길이 대비)으로 흔들림을 잰다. */
export function wristMotion(lm, prevLm, aspect = 4 / 3) {
  if (!lm || !prevLm) return 0;
  const palm = dist(lm[0], lm[9], aspect) || 1e-6;
  return dist(lm[0], prevLm[0], aspect) / palm;
}
