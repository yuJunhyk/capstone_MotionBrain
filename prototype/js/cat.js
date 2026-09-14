// 도형으로 그린 고양이 한 마리. 표현만 담당하고 입력·점수·타이머는 건드리지 않는다.
// 상태: sleep | greet | wait | holding | happy | oops | lost | highfive | rest

const SVG = `
<svg class="cat-svg" viewBox="0 0 240 200" aria-hidden="true">
  <g class="cat-root">
    <path class="tail" d="M172 152 C 214 156, 228 112, 202 98" />
    <g class="body">
      <ellipse cx="120" cy="150" rx="58" ry="34" class="fur"/>
      <path class="stripe" d="M92 128 q8 8 0 18 M118 122 q8 8 0 18 M144 128 q8 8 0 18"/>
      <ellipse cx="120" cy="162" rx="30" ry="16" class="cream"/>
      <ellipse class="paw" cx="92" cy="181" rx="16" ry="10"/>
      <ellipse class="paw" cx="148" cy="181" rx="16" ry="10"/>
      <g class="toy">
        <ellipse cx="190" cy="180" rx="22" ry="9" class="fish"/>
        <path d="M208 180 l14 -8 v16 z" class="fish"/>
        <circle cx="178" cy="178" r="2.2" fill="#1d2a3a"/>
      </g>
    </g>
    <g class="head">
      <path class="ear fur" d="M68 80 L 76 28 L 112 60 Z"/>
      <path class="ear-in" d="M79 70 L 83 44 L 101 60 Z"/>
      <path class="ear fur" d="M172 80 L 164 28 L 128 60 Z"/>
      <path class="ear-in" d="M161 70 L 157 44 L 139 60 Z"/>
      <circle cx="120" cy="86" r="50" class="fur"/>
      <path class="stripe" d="M104 42 q3 10 -2 18 M120 38 q0 10 0 18 M136 42 q-3 10 2 18"/>
      <ellipse cx="120" cy="102" rx="26" ry="16" class="cream"/>
      <g class="eye">
        <circle class="eye-open" cx="100" cy="82" r="7"/>
        <circle class="eye-shine" cx="103" cy="79" r="2.4"/>
        <path class="eye-closed" d="M92 84 q8 6 16 0"/>
        <path class="eye-happy" d="M92 86 q8 -11 16 0"/>
      </g>
      <g class="eye">
        <circle class="eye-open" cx="140" cy="82" r="7"/>
        <circle class="eye-shine" cx="143" cy="79" r="2.4"/>
        <path class="eye-closed" d="M132 84 q8 6 16 0"/>
        <path class="eye-happy" d="M132 86 q8 -11 16 0"/>
      </g>
      <path class="nose" d="M114 97 h12 l-6 6 z"/>
      <path class="mouth mouth-w" d="M112 105 q4 6 8 0 q4 6 8 0"/>
      <path class="mouth mouth-flat" d="M112 107 h16"/>
      <path class="mouth mouth-open" d="M110 104 q10 13 20 0 z"/>
      <g class="whiskers"><path d="M72 96 h26 M72 104 h26 M142 96 h26 M142 104 h26"/></g>
      <g class="blush"><ellipse cx="86" cy="100" rx="8" ry="4"/><ellipse cx="154" cy="100" rx="8" ry="4"/></g>
    </g>
    <g class="raised-paw">
      <path class="fur" d="M164 128 q6 -34 30 -34" stroke-width="16" fill="none" stroke-linecap="round" stroke="#F3A55A"/>
      <circle cx="196" cy="92" r="13" class="fur"/>
      <g class="pads"><circle cx="190" cy="88" r="2.4"/><circle cx="197" cy="85" r="2.4"/><circle cx="203" cy="89" r="2.4"/><circle cx="196" cy="95" r="3.2"/></g>
    </g>
    <text class="zzz" x="168" y="46">z z z</text>
    <text class="qmark" x="176" y="52">?</text>
  </g>
</svg>`;

export function createCat(container) {
  container.innerHTML = SVG;
  container.classList.add('cat');
  let state = 'sleep';
  let happyTimer = null;

  function setState(next) {
    if (happyTimer) { clearTimeout(happyTimer); happyTimer = null; }
    state = next;
    container.dataset.state = next;
  }

  /** 잠깐 보여주고 이전 상태로 돌아오는 반응 (정답·오답용). */
  function flash(next, ms, after) {
    setState(next);
    happyTimer = setTimeout(() => { happyTimer = null; setState(after); }, ms);
  }

  return { el: container, setState, flash, get state() { return state; } };
}
