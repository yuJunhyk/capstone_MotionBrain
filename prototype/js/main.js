// 이용 흐름: intro → (loading) → greet → practice → play → result
// 프레임 소스(카메라·키보드) → 제스처 분류 → 입력 엔진 → 화면·고양이·게임.

import { CONFIG } from './config.js';
import { classify, wristMotion, GESTURE_LABEL } from './gesture.js';
import { InputEngine, PROFILES } from './input-engine.js';
import { RpsGame, INSTRUCTIONS } from './game-rps.js';
import { Camera } from './camera.js';
import { HandTracker, KeyboardSource, KEYBOARD_HELP } from './tracker.js';
import { createCat } from './cat.js';
import { loadRecord, saveRecord, resetRecord, REWARDS } from './storage.js';

const $ = (id) => document.getElementById(id);
const els = {
  body: document.body,
  modeSelect: $('mode-select'), sourceBadge: $('source-badge'), techToggle: $('tech-toggle'),
  timer: $('timer'), score: $('score'),
  cat: $('cat'), bubble: $('bubble'),
  catHand: $('cat-hand'), catHandIcon: $('cat-hand-icon'), catHandLabel: $('cat-hand-label'),
  promptCard: $('prompt-card'), promptK: $('prompt-k'), promptV: $('prompt-v'), promptSub: $('prompt-sub'),
  feedback: $('feedback'), stamp: $('stamp'),
  overlay: $('overlay'), overlayIcon: $('overlay-icon'), overlayTitle: $('overlay-title'), overlayText: $('overlay-text'), overlayBadge: $('overlay-badge'), overlayBtn: $('overlay-btn'),
  screenIntro: $('screen-intro'), screenResult: $('screen-result'), hifiveAsk: $('hifive-ask'),
  btnCamera: $('btn-camera'), btnKeyboard: $('btn-keyboard'), btnSkipHifive: $('btn-skip-hifive'),
  btnAgain: $('btn-again'), btnHome: $('btn-home'), btnResetRecord: $('btn-reset-record'),
  video: $('video'), camTitle: $('cam-title'), camStatus: $('cam-status'), keyHelp: $('key-help'),
  myHandIcon: $('my-hand-icon'), myHandLabel: $('my-hand-label'), ringFg: $('ring-fg'), ringLabel: $('ring-label'),
  hintCard: $('hint-card'), hintIcon: $('hint-icon'), hintTitle: $('hint-title'), hintText: $('hint-text'),
  recordCard: $('record-card'), recCorrect: $('rec-correct'), recTime: $('rec-time'), recScore: $('rec-score'),
  reward: $('reward'), rewardEmoji: $('reward-emoji'), rewardTitle: $('reward-title'), rewardText: $('reward-text'),
  techbar: $('techbar'), techLine: $('tech-line'),
};

const RING_C = 163.4;
const ICON = { rock: '#ic-rock', paper: '#ic-paper', scissors: '#ic-scissors' };

const app = {
  screen: 'intro',
  sourceKind: 'none', source: null, camera: null,
  engine: null, game: null, cat: null,
  prevLm: null, motionEma: 0,
  lastF: { t: 0, present: false, candidate: null, clarity: 0, motion: 0 },
  lastSnap: { status: 'idle', candidate: null, progress: 0 },
  fps: 0,
  greetSince: null, greetPassed: false,
  practice: { idx: 0 },
  hifiveDone: false,
  lastSummary: null,
  record: loadRecord(),
  timers: new Set(),
};

// ───────── 작은 도우미 ─────────
function later(ms, fn) {
  const id = setTimeout(() => { app.timers.delete(id); fn(); }, ms);
  app.timers.add(id);
  return id;
}
function clearTimers() { for (const id of app.timers) clearTimeout(id); app.timers.clear(); }
function say(text, soft = false) { els.bubble.textContent = text; els.bubble.classList.toggle('soft', soft); }
function fmtTime(ms) {
  const s = Math.ceil(ms / 1000);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function showFeedback(text, kind) {
  els.feedback.textContent = text;
  els.feedback.className = `feedback ${kind || ''}`;
  els.feedback.hidden = false;
  later(CONFIG.game.feedbackMs, () => { els.feedback.hidden = true; });
}
function showOverlay({ icon, title, text, badge, badgeClass, button }) {
  els.overlayIcon.textContent = icon;
  els.overlayTitle.textContent = title;
  els.overlayText.textContent = text;
  els.overlayBadge.textContent = badge || '';
  els.overlayBadge.hidden = !badge;
  els.overlayBadge.className = `pill ${badgeClass || ''}`;
  els.overlayBtn.hidden = !button;
  if (button) els.overlayBtn.textContent = button;
  els.overlay.hidden = false;
}
function hideOverlay() { els.overlay.hidden = true; }
function setHint(kind, icon, title, text) {
  els.hintCard.className = `card hint-card ${kind}`;
  els.hintIcon.textContent = icon;
  els.hintTitle.textContent = title;
  els.hintText.textContent = text;
}
function setStatusPill(text, cls) { els.camStatus.textContent = text; els.camStatus.className = `pill ${cls || ''}`; }
function setPrompt(k, v, sub) {
  els.promptK.textContent = k; els.promptV.textContent = v; els.promptSub.textContent = sub;
  els.promptCard.hidden = false;
}
function setCatHand(g) {
  if (!g) { els.catHand.hidden = true; return; }
  els.catHandIcon.setAttribute('href', ICON[g]);
  els.catHandLabel.textContent = GESTURE_LABEL[g];
  els.catHand.hidden = false;
}

// ───────── 화면 전환 ─────────
function setScreen(name) {
  app.screen = name;
  els.body.dataset.screen = name;
  els.screenIntro.hidden = name !== 'intro';
  els.screenResult.hidden = name !== 'result';
  els.recordCard.hidden = name !== 'result';
  els.stamp.hidden = true;
  els.feedback.hidden = true;
  if (name !== 'play' && name !== 'practice') { els.promptCard.hidden = true; els.catHand.hidden = true; }
}

function goIntro() {
  clearTimers();
  stopSource();
  app.engine?.reset();
  setScreen('intro');
  app.cat.setState('sleep');
  say('졸고 있는 고양이를 발견했어요.');
  els.timer.textContent = fmtTime(CONFIG.game.durationMs);
  els.score.textContent = '0';
  setStatusPill('대기', '');
  setHint('', '💡', '손 모양을 유지하면 입력돼요', '너무 빠르게 움직이면 인식이 어려워요 :)');
  els.camTitle.textContent = '내 손을 보여주세요';
}

function goGreet() {
  clearTimers();
  app.engine.reset();
  app.greetSince = null; app.greetPassed = false;
  setScreen('greet');
  hideOverlay();
  app.cat.setState('wait');
  say('안녕? 손을 화면 안에 보여줘.');
  els.camTitle.textContent = '손을 화면 안에 보여주세요';
}

function goPractice() {
  clearTimers();
  app.engine.reset();
  app.practice.idx = 0;
  setScreen('practice');
  app.cat.setState('wait');
  promptPractice();
}

function promptPractice() {
  const target = CONFIG.flow.practiceTargets[app.practice.idx];
  const n = CONFIG.flow.practiceTargets.length;
  say(`연습! ${GESTURE_LABEL[target]}를 만들고 잠깐 유지해봐.`);
  setPrompt('연습', GESTURE_LABEL[target], `${app.practice.idx} / ${n} 성공 · 게이지가 차면 입력돼요`);
  setCatHand(null);
}

function goPlay() {
  clearTimers();
  app.engine.reset();
  hideOverlay();
  setScreen('play');
  app.cat.setState('wait');
  els.score.textContent = '0';
  app.game.start(performance.now());
}

function goResult(summary) {
  clearTimers();
  app.lastSummary = summary;
  app.hifiveDone = false;
  setScreen('result');
  setCatHand(null);
  app.cat.setState('rest');
  say('손을 펴서 하이파이브!');
  els.hifiveAsk.hidden = false;
  els.reward.hidden = true;
  const { stats, score, durationMs } = summary;
  els.recCorrect.textContent = `${stats.correct} / ${stats.trials}`;
  els.recTime.textContent = `${Math.round(durationMs / 1000)}초`;
  els.recScore.textContent = String(score);
  els.camTitle.textContent = '손을 펴면 하이파이브';
}

function finishHifive(skipped) {
  if (app.hifiveDone) return;
  app.hifiveDone = true;
  els.hifiveAsk.hidden = true;
  app.cat.setState(skipped ? 'rest' : 'highfive');
  say(skipped ? '다음에 또 놀자!' : '하이파이브! 오늘도 고마워 ♥');
  els.stamp.hidden = false;

  // 완료 보상: 한 판을 끝낸 것에 준다. 점수·정답률과 무관.
  app.record.completions += 1;
  const next = REWARDS.find((r) => !app.record.unlocked.includes(r.id));
  if (next) {
    app.record.unlocked.push(next.id);
    els.rewardEmoji.textContent = next.emoji;
    els.rewardTitle.innerHTML = `${next.name} <span class="pill pill-accent">잠금 해제!</span>`;
    els.rewardText.textContent = '새로운 아이템이 방에 추가됐어요!';
  } else {
    els.rewardEmoji.textContent = '🐾';
    els.rewardTitle.innerHTML = `완료 도장 <span class="pill pill-accent">${app.record.completions}개째</span>`;
    els.rewardText.textContent = '방의 장식은 모두 열렸어요. 고마워!';
  }
  els.reward.hidden = false;
  saveRecord(app.record);
}

// ───────── 프레임 소스 ─────────
async function startCamera() {
  app.sourceKind = 'camera';
  els.body.dataset.source = 'camera';
  setScreen('loading');
  showOverlay({ icon: '📷', title: '카메라 켜는 중…', text: '브라우저가 권한을 물어보면 허용해 주세요.' });
  try {
    app.camera = new Camera(els.video, CONFIG.camera);
    await app.camera.start();
    const tracker = new HandTracker(els.video, handleFrame);
    await tracker.load((msg) => { els.overlayText.textContent = msg; });
    app.source = tracker;
    tracker.start();
    els.sourceBadge.textContent = '카메라 입력';
    els.sourceBadge.classList.add('on');
    goGreet();
  } catch (e) {
    console.error(e);
    stopSource();
    els.body.dataset.source = 'none';
    showOverlay({
      icon: '😿', title: '카메라를 켤 수 없어요',
      text: (e && e.name === 'NotAllowedError') ? '카메라 권한이 거부됐어요. 주소창의 카메라 아이콘에서 허용하거나, 키보드로 해볼 수 있어요.' : `${e?.message || e}`,
      button: '웹캠 없이 키보드로 해보기',
    });
    els.overlayBtn.onclick = () => { hideOverlay(); startKeyboard(); };
  }
}

function startKeyboard() {
  app.sourceKind = 'keyboard';
  els.body.dataset.source = 'keyboard';
  els.keyHelp.innerHTML = KEYBOARD_HELP.map(([k, v]) => `<li><kbd>${k}</kbd>${v}</li>`).join('');
  els.keyHelp.hidden = false;
  document.querySelector('.cam-placeholder-title').textContent = '키보드 데모 모드';
  app.source = new KeyboardSource(handleFrame);
  app.source.start();
  els.sourceBadge.textContent = '키보드 데모';
  els.sourceBadge.classList.add('on');
  goGreet();
}

function stopSource() {
  app.source?.stop?.();
  app.source?.dispose?.();
  app.source = null;
  app.camera?.stop();
  app.camera = null;
  app.sourceKind = 'none';
  els.body.dataset.source = 'none';
  els.keyHelp.hidden = true;
  document.querySelector('.cam-placeholder-title').textContent = '카메라가 꺼져 있어요';
  els.sourceBadge.textContent = '입력 없음';
  els.sourceBadge.classList.remove('on');
  app.prevLm = null; app.motionEma = 0;
  app.lastF = { t: performance.now(), present: false, candidate: null, clarity: 0, motion: 0 };
}

// ───────── 프레임 → 엔진 ─────────
function handleFrame(frame) {
  let candidate, clarity, motion;
  if (frame.source === 'camera') {
    const g = classify(frame.landmarks, frame.aspect);
    candidate = g.candidate; clarity = g.clarity;
    const m = (frame.landmarks && app.prevLm) ? wristMotion(frame.landmarks, app.prevLm, frame.aspect) : 0;
    app.motionEma = frame.present ? app.motionEma * 0.6 + m * 0.4 : 0;
    motion = app.motionEma;
    app.prevLm = frame.landmarks;
  } else {
    candidate = frame.candidate; clarity = frame.clarity; motion = frame.motion;
  }
  app.fps = frame.fps;
  const f = { t: frame.t, present: frame.present, candidate, clarity, motion };
  app.lastF = f;
  app.lastSnap = app.engine.update(f);
  renderInput(app.lastSnap, f);
}

const engineHandlers = {
  onConfirm(g, t) {
    if (app.screen === 'practice') return practiceInput(g);
    if (app.screen === 'play') return playInput(g, t);
    if (app.screen === 'result' && !app.hifiveDone && g === 'paper') return finishHifive(false);
  },
  onLost(t) {
    if (app.screen === 'play') {
      app.game.pause(t);
      showOverlay({ icon: '🐱', title: '손이 안 보여요', text: '손을 화면 안에 보여줘', badge: '⏸ 잠시 멈춤', badgeClass: 'pill-warn' });
      say('어디 갔지…?', true);
    } else if (app.screen === 'practice' || app.screen === 'greet') {
      say('손이 안 보여요. 화면 안에 보여줘.', true);
    }
    app.cat.setState('lost');
  },
  onRecovered(t) {
    hideOverlay();
    if (app.screen === 'play') {
      app.game.resume(t);
      say('다시 보이네! 계속하자.');
      later(900, () => { if (app.game.trial) say(INSTRUCTIONS[app.game.trial.instr].line); });
    } else if (app.screen === 'practice') {
      promptPractice();
    } else if (app.screen === 'greet') {
      say('안녕? 손을 화면 안에 보여줘.');
    }
    if (app.screen !== 'result') app.cat.setState('wait');
  },
};

function practiceInput(g) {
  const target = CONFIG.flow.practiceTargets[app.practice.idx];
  if (g !== target) {
    app.cat.flash('oops', 900, 'wait');
    say(`그건 ${GESTURE_LABEL[g]}야. ${GESTURE_LABEL[target]}를 보여줘.`);
    showFeedback(`${GESTURE_LABEL[g]} 입력됨`, 'neutral');
    return;
  }
  app.practice.idx += 1;
  app.cat.flash('happy', 900, 'wait');
  showFeedback('좋아!', '');
  const n = CONFIG.flow.practiceTargets.length;
  if (app.practice.idx >= n) {
    say('완벽해! 이제 같이 놀자.');
    setPrompt('연습', '완료', `${n} / ${n} 성공`);
    later(1300, goPlay);
  } else {
    later(700, promptPractice);
  }
}

function playInput(g, t) {
  const before = app.game.stats.falseInputs;
  app.game.input(g, t);
  if (app.game.stats.falseInputs > before) showFeedback(`${GESTURE_LABEL[g]} · 지금은 입력 구간이 아니에요`, 'neutral');
}

const gameHandlers = {
  onTrial(tr) {
    say(INSTRUCTIONS[tr.instr].line);
    setCatHand(tr.catHand);
    const sub = tr.instr === 'win' ? '고양이를 이기는 손' : tr.instr === 'lose' ? '고양이에게 지는 손' : '고양이와 같은 손';
    setPrompt('지시', INSTRUCTIONS[tr.instr].label, sub);
    if (app.cat.state !== 'lost') app.cat.setState('wait');
  },
  onTrialResult(tr) {
    if (tr.result === 'correct') {
      app.cat.flash('happy', CONFIG.game.feedbackMs, 'wait');
      showFeedback(`맞았어! +${CONFIG.game.pointsPerCorrect}`, '');
      els.score.textContent = String(app.game.score);
    } else if (tr.result === 'wrong') {
      app.cat.flash('oops', CONFIG.game.feedbackMs, 'wait');
      showFeedback(`아쉽다, 정답은 ${GESTURE_LABEL[tr.answer]}`, 'bad');
      say('괜찮아, 다시 해보자.', true);
    } else {
      showFeedback('시간이 지났어. 다음!', 'neutral');
    }
  },
  onPause() {},
  onResume() {},
  onEnd(summary) { goResult(summary); },
};

// ───────── 옆 패널 표시 ─────────
function renderInput(snap, f) {
  const p = app.engine.p;
  const cand = snap.candidate;
  if (cand) { els.myHandIcon.setAttribute('href', ICON[cand]); els.myHandLabel.textContent = GESTURE_LABEL[cand]; }
  else els.myHandLabel.textContent = '—';
  els.myHandIcon.parentElement.style.opacity = cand ? 1 : 0.25;

  const prog = (snap.status === 'holding' || snap.status === 'recovering') ? snap.progress : (snap.status === 'confirmed' || snap.status === 'rearm') ? 1 : 0;
  els.ringFg.style.strokeDashoffset = String(RING_C * (1 - prog));
  els.ringFg.classList.toggle('warn', snap.status === 'recovering');

  if (!f.present) {
    setStatusPill('손이 안 보여요', 'pill-bad');
    els.ringLabel.textContent = '손을 기다리는 중';
    setHint('bad', '🔍', '손을 화면 안에 보여줘', p.pauseOnLost ? '점수는 그대로예요. 다시 보이면 이어서 할 수 있어요!' : '이 입력 방식은 손이 없어도 게임이 멈추지 않아요.');
    return;
  }
  switch (snap.status) {
    case 'recovering':
      setStatusPill('준비 중', 'pill-warn'); els.ringLabel.textContent = '준비 중…';
      setHint('warn', '⏳', '손이 다시 보여요', '잠깐 뒤에 입력할 수 있어요.'); break;
    case 'holding':
      setStatusPill('유지 중', 'pill-ok'); els.ringLabel.textContent = '잠깐 유지해줘';
      setHint('', '💡', '손 모양을 유지하면 입력돼요', '게이지가 차면 확정!'); break;
    case 'unclear':
      setStatusPill('불명확', 'pill-warn'); els.ringLabel.textContent = '또렷하게';
      setHint('warn', '🖐️', '손 모양을 또렷하게 보여줘', '손가락을 확실히 펴거나 접어줘. 손을 너무 빨리 움직여도 안 돼요.'); break;
    case 'rearm':
      setStatusPill('입력됨', 'pill-ok'); els.ringLabel.textContent = '손을 한 번 풀어줘';
      setHint('', '✅', '입력됐어요', '다음 입력을 하려면 손을 잠깐 풀어줘.'); break;
    case 'confirmed':
      setStatusPill('입력됨', 'pill-ok'); els.ringLabel.textContent = '입력됐어요';
      setHint('', '✅', '입력됐어요', ''); break;
    default:
      setStatusPill('손 보임', 'pill-ok'); els.ringLabel.textContent = '잠깐 유지해줘';
      if (cand) setHint('', '💡', `${GESTURE_LABEL[cand]} 모양이 보여요`, '유지하면 입력돼요.');
      else setHint('', '💡', '가위·바위·보 중 하나를 보여줘', '손 모양을 유지하면 입력돼요.');
  }
}

function renderTech() {
  if (els.techbar.hidden) return;
  const p = app.engine.p;
  const s = app.game?.stats;
  const stat = s ? ` · trials=${s.trials} correct=${s.correct} wrong=${s.wrong} timeout=${s.noResponse} lost=${s.lostEvents} false=${s.falseInputs}` : '';
  const q = `clarity=${app.lastF.clarity.toFixed(2)} motion=${app.lastF.motion.toFixed(2)}`;
  els.techLine.textContent = `profile=${p.id} · mode=${p.key} · hold=${p.holdMs}ms · clarity≥${p.minClarity} · motion≤${p.maxMotion} · src=${app.sourceKind} · fps=${app.fps} · status=${app.lastSnap.status} · ${q} · confirms=${app.engine.confirms}${stat} · 완료 ${app.record.completions}회`;
}

// ───────── 메인 루프 ─────────
// 진행 로직은 화면 프레임(requestAnimationFrame)에 묶지 않는다. 탭이 가려지거나 프레임이 멈춰도 타이머는 흘러야 한다.
function loop() {
  const t = performance.now();

  if (app.screen === 'greet' && !app.greetPassed) {
    if (app.lastF.present && app.lastSnap.status !== 'lost' && app.lastSnap.status !== 'recovering') {
      if (app.greetSince == null) app.greetSince = t;
      if (t - app.greetSince >= CONFIG.flow.greetHoldMs) {
        app.greetPassed = true;
        app.cat.setState('greet');
        say('손이 보여요! 안녕 👋');
        later(1400, goPractice);
      }
    } else {
      app.greetSince = null;
    }
  }

  if (app.screen === 'play') {
    app.game.tick(t);
    els.timer.textContent = fmtTime(app.game.remainingMs(t));
  }

  renderTech();
}

// ───────── 초기화 ─────────
function init() {
  app.cat = createCat(els.cat);
  app.engine = new InputEngine(els.modeSelect.value, engineHandlers);
  app.game = new RpsGame(CONFIG.game, gameHandlers);

  els.btnCamera.addEventListener('click', startCamera);
  els.btnKeyboard.addEventListener('click', startKeyboard);
  els.btnSkipHifive.addEventListener('click', () => finishHifive(true));
  els.btnAgain.addEventListener('click', () => { say('한 번 더!'); later(600, goPlay); });
  els.btnHome.addEventListener('click', goIntro);
  els.btnResetRecord.addEventListener('click', () => { resetRecord(); app.record = loadRecord(); });
  els.techToggle.addEventListener('click', () => {
    const on = els.techbar.hidden;
    els.techbar.hidden = !on;
    els.techToggle.setAttribute('aria-pressed', String(on));
  });
  els.modeSelect.addEventListener('change', () => {
    const wasLost = app.lastSnap.status === 'lost' || app.lastSnap.status === 'recovering';
    app.engine.setProfile(els.modeSelect.value);
    if (wasLost) { hideOverlay(); if (app.screen === 'play') app.game.resume(performance.now()); if (app.screen !== 'result') app.cat.setState('wait'); }
    els.modeSelect.blur();
  });
  window.addEventListener('pagehide', stopSource);

  goIntro();
  setInterval(loop, 50);
}

init();
