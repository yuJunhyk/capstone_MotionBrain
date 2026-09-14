// 게스트 기록. 완료 횟수와 잠금 해제한 장식만 브라우저 로컬에 남긴다. 영상·관절·시행 로그는 저장하지 않는다.
import { CONFIG } from './config.js';

const EMPTY = { completions: 0, unlocked: [] };

export function loadRecord() {
  try {
    const raw = localStorage.getItem(CONFIG.storage.key);
    return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY };
  } catch { return { ...EMPTY }; }
}

export function saveRecord(rec) {
  try { localStorage.setItem(CONFIG.storage.key, JSON.stringify(rec)); } catch { /* 저장 불가 환경이면 무시 */ }
}

export function resetRecord() {
  try { localStorage.removeItem(CONFIG.storage.key); } catch { /* 무시 */ }
}

// 완료 순서대로 열리는 작은 보상. 정답률·순위와 무관하게 '한 판을 끝낸 것'에 준다.
export const REWARDS = [
  { id: 'cushion', name: '포근한 방석', emoji: '🛏️' },
  { id: 'fish', name: '파란 물고기 인형', emoji: '🐟' },
  { id: 'yarn', name: '털실 뭉치', emoji: '🧶' },
  { id: 'plant', name: '작은 화분', emoji: '🪴' },
];
