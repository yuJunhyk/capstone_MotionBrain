// 고양이의 변덕 (반대로 가위바위보) 규칙과 채점.
// 확정 입력만 받는다. 손 놓침은 pause/resume 으로 전달되고 정오답과 분리해 센다.

import { GESTURES } from './gesture.js';

const BEATS = { rock: 'paper', paper: 'scissors', scissors: 'rock' };   // 값이 키를 이긴다
const LOSES = { rock: 'scissors', paper: 'rock', scissors: 'paper' };   // 값이 키에게 진다

export const INSTRUCTIONS = {
  win:  { label: '이겨봐',  line: '이번엔 나를 이겨봐!' },
  lose: { label: '져줘',    line: '이번엔 내가 이기게 해줘!' },
  draw: { label: '비겨줘',  line: '이번엔 나랑 똑같이 내봐!' },
};

function pickInstruction(prev) {
  // 규칙 전환 빈도: 이겨봐 50%, 져줘 35%, 비겨줘 15%. 같은 지시가 3번 연속 나오지 않게 한다.
  const r = Math.random();
  let k = r < 0.5 ? 'win' : r < 0.85 ? 'lose' : 'draw';
  if (prev && prev.length >= 2 && prev[0] === k && prev[1] === k) {
    const others = Object.keys(INSTRUCTIONS).filter((x) => x !== k);
    k = others[Math.floor(Math.random() * others.length)];
  }
  return k;
}

export class RpsGame {
  constructor(cfg, handlers = {}) {
    this.cfg = cfg;       // { durationMs, responseMs, feedbackMs, pointsPerCorrect }
    this.h = handlers;    // { onTrial(trial), onTrialResult(trial), onPause(), onResume(), onEnd(summary) }
    this.running = false;
  }

  start(t) {
    this.running = true;
    this.paused = false;
    this.elapsedBefore = 0;
    this.segmentStart = t;
    this.score = 0;
    this.trialSeq = 0;
    this.history = [];
    this.stats = { trials: 0, correct: 0, wrong: 0, noResponse: 0, lostEvents: 0, falseInputs: 0 };
    this.trial = null;
    this.nextAt = null;
    this.nextTrial(t);
  }

  elapsed(t) {
    return this.elapsedBefore + (this.paused ? 0 : t - this.segmentStart);
  }

  remainingMs(t) {
    return Math.max(0, this.cfg.durationMs - this.elapsed(t));
  }

  nextTrial(t) {
    const catHand = GESTURES[Math.floor(Math.random() * GESTURES.length)];
    const instr = pickInstruction(this.history);
    const answer = instr === 'win' ? BEATS[catHand] : instr === 'lose' ? LOSES[catHand] : catHand;
    this.trialSeq += 1;
    this.trial = {
      id: this.trialSeq, catHand, instr, answer,
      shownAt: t, deadline: t + this.cfg.responseMs,
      result: null, input: null, rt: null,
    };
    this.history.unshift(instr);
    this.nextAt = null;
    this.h.onTrial?.(this.trial);
  }

  /** 손 놓침 등으로 시행을 멈춘다. 점수와 남은 시간은 그대로. */
  pause(t) {
    if (!this.running || this.paused) return;
    this.elapsedBefore += t - this.segmentStart;
    this.paused = true;
    this.stats.lostEvents += 1;
    this.h.onPause?.();
  }

  /** 복구 뒤 같은 문제를 응답 시간 처음부터 다시 준다. */
  resume(t) {
    if (!this.running || !this.paused) return;
    this.paused = false;
    this.segmentStart = t;
    if (this.trial && this.trial.result == null) {
      this.trial.shownAt = t;
      this.trial.deadline = t + this.cfg.responseMs;
    } else if (this.nextAt != null) {
      this.nextAt = t + this.cfg.feedbackMs;
    }
    this.h.onResume?.(this.trial);
  }

  tick(t) {
    if (!this.running || this.paused) return;
    if (this.remainingMs(t) <= 0) { this.end(t); return; }
    const tr = this.trial;
    if (tr.result == null && t >= tr.deadline) {
      tr.result = 'timeout';
      this.stats.trials += 1; this.stats.noResponse += 1;
      this.nextAt = t + this.cfg.feedbackMs;
      this.h.onTrialResult?.(tr);
    }
    if (tr.result != null && this.nextAt != null && t >= this.nextAt) this.nextTrial(t);
  }

  /** 확정 입력. 응답 구간 밖의 입력은 거짓 입력으로 따로 센다. */
  input(gesture, t) {
    if (!this.running || this.paused || !this.trial || this.trial.result != null) {
      this.stats.falseInputs += 1;
      return null;
    }
    const tr = this.trial;
    const ok = gesture === tr.answer;
    tr.result = ok ? 'correct' : 'wrong';
    tr.input = gesture;
    tr.rt = t - tr.shownAt;
    this.stats.trials += 1;
    if (ok) { this.stats.correct += 1; this.score += this.cfg.pointsPerCorrect; }
    else this.stats.wrong += 1;
    this.nextAt = t + this.cfg.feedbackMs;
    this.h.onTrialResult?.(tr);
    return tr.result;
  }

  end(t) {
    if (!this.running) return;
    this.running = false;
    const summary = { score: this.score, stats: { ...this.stats }, durationMs: this.cfg.durationMs, elapsedMs: this.elapsed(t) };
    this.h.onEnd?.(summary);
  }
}
