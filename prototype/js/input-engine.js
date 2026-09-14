// 입력 품질·이벤트 계층.
// 추적 결과(후보·또렷함·흔들림·손 존재)를 받아 "확정 입력"과 "입력 상태"로 바꾼다.
// 게임은 원본 관절 좌표를 직접 보지 않고 이 계층의 출력만 받는다.

export const PROFILES = {
  // 진단용 하한선: 후보가 바뀌는 첫 프레임에 바로 확정. 중복 방지·유지·복구 없음.
  B0: {
    key: 'B0', id: 'rps-instant-v0.1', label: '즉시 확정 (B0)',
    holdMs: 0, rearm: false, minClarity: 0, maxMotion: Infinity,
    pauseOnLost: false, lostMs: 0, recoverMs: 0, unclearMs: 0,
  },
  // 주 비교 기준: 같은 후보가 일정 시간 유지되면 확정. 확정한 모양을 풀어야(다른 모양·중립·손 내림) 다시 입력.
  B1: {
    key: 'B1', id: 'rps-hold-v0.1', label: '유지 확정 (B1)',
    holdMs: 300, rearm: true, minClarity: 0, maxMotion: Infinity,
    pauseOnLost: false, lostMs: 0, recoverMs: 0, unclearMs: 0,
  },
  // 제안 방식: 유지 + 또렷함 + 흔들림 + 재입력 준비 + 손 놓침 복구.
  P: {
    key: 'P', id: 'rps-quality-v0.1', label: '제안 방식 (P)',
    holdMs: 300, rearm: true, minClarity: 0.35, maxMotion: 0.12,
    pauseOnLost: true, lostMs: 400, recoverMs: 600, unclearMs: 800,
  },
};

// status 값: lost | recovering | idle | holding | unclear | rearm | confirmed
export class InputEngine {
  constructor(profileKey, handlers = {}) {
    this.h = handlers; // { onConfirm(gesture, t), onLost(t), onRecovered(t) }
    this.setProfile(profileKey);
  }

  setProfile(key) {
    this.p = PROFILES[key] || PROFILES.P;
    this.reset();
  }

  reset() {
    this.status = 'idle';
    this.cand = null;
    this.holdStart = null;
    this.progress = 0;
    this.armed = true;
    this.lostSince = null;
    this.recoverStart = null;
    this.unclearSince = null;
    this.lastFrameCand = null;
    this.lastConfirmed = null;
    this.confirms = 0;
  }

  /** @param {{t:number, present:boolean, candidate:string|null, clarity:number, motion:number}} f */
  update(f) {
    const p = this.p;

    // 1) 손이 없음
    if (!f.present) {
      this.holdStart = null; this.progress = 0; this.cand = null;
      this.unclearSince = null; this.lastFrameCand = null;
      if (p.rearm) this.armed = true; // 손을 내린 것도 해제로 본다
      if (p.pauseOnLost) {
        if (this.lostSince == null) this.lostSince = f.t;
        if (this.status !== 'lost' && f.t - this.lostSince >= p.lostMs) {
          this.status = 'lost'; this.recoverStart = null;
          this.h.onLost?.(f.t);
        } else if (this.status !== 'lost') {
          this.status = 'idle';
        }
      } else {
        this.status = 'idle';
      }
      return this.snapshot(f);
    }
    this.lostSince = null;

    // 2) 손 놓침 뒤 복구: 잠깐 준비 시간을 거친 뒤 입력을 다시 받는다
    if (this.status === 'lost' || this.status === 'recovering') {
      if (this.recoverStart == null) this.recoverStart = f.t;
      this.status = 'recovering';
      this.progress = Math.min(1, (f.t - this.recoverStart) / p.recoverMs);
      if (f.t - this.recoverStart >= p.recoverMs) {
        this.status = 'idle'; this.recoverStart = null; this.armed = true; this.progress = 0;
        this.h.onRecovered?.(f.t);
      }
      return this.snapshot(f);
    }

    const c = f.candidate;

    // 3) 손은 보이지만 가위·바위·보 어느 것도 아님 (중립·전환 중)
    if (c == null) {
      this.holdStart = null; this.progress = 0; this.cand = null;
      this.unclearSince = null; this.lastFrameCand = null;
      if (p.rearm) this.armed = true;
      this.status = 'idle';
      return this.snapshot(f);
    }

    // 4) B0: 후보가 바뀐 첫 프레임에 즉시 확정
    if (p.holdMs === 0 && !p.rearm) {
      this.cand = c; this.status = 'idle';
      if (c !== this.lastFrameCand) this.confirm(c, f.t);
      this.lastFrameCand = c;
      return this.snapshot(f);
    }
    this.lastFrameCand = c;

    // 5) 재입력 준비: 직전에 확정한 모양을 계속 들고 있으면 같은 입력이 반복되지 않게 막는다.
    //    다른 모양으로 바꾸거나, 중립 손·손 내림으로 풀면 다시 받는다.
    if (!this.armed) {
      if (c !== this.lastConfirmed) {
        this.armed = true;
      } else {
        this.status = 'rearm'; this.cand = c; this.progress = 0; this.holdStart = null;
        return this.snapshot(f);
      }
    }

    // 6) 품질 조건 (또렷함·흔들림). B0·B1은 항상 통과.
    const clear = f.clarity >= p.minClarity && f.motion <= p.maxMotion;
    if (!clear) {
      this.holdStart = null; this.progress = 0; this.cand = c;
      if (this.unclearSince == null) this.unclearSince = f.t;
      this.status = (f.t - this.unclearSince >= p.unclearMs) ? 'unclear' : 'idle';
      return this.snapshot(f);
    }
    this.unclearSince = null;

    // 7) 시간 일관성: 같은 후보를 holdMs 동안 유지하면 확정
    if (this.cand !== c || this.holdStart == null) { this.cand = c; this.holdStart = f.t; }
    this.progress = Math.min(1, (f.t - this.holdStart) / p.holdMs);
    this.status = 'holding';
    if (f.t - this.holdStart >= p.holdMs) {
      this.confirm(c, f.t);
      this.holdStart = null; this.progress = 0;
      if (p.rearm) { this.armed = false; this.status = 'rearm'; }
    }
    return this.snapshot(f);
  }

  confirm(c, t) {
    this.lastConfirmed = c; this.confirms += 1; this.status = 'confirmed';
    this.h.onConfirm?.(c, t);
  }

  snapshot(f) {
    return { status: this.status, candidate: this.cand, progress: this.progress, clarity: f.clarity, armed: this.armed };
  }
}
