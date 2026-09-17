const FIGHTERS = [
  { id: 'vorcaro', name: 'Vorcaro', role: 'Banco Master', initials: 'DV', primary: '#e33b2f', accent: '#ffe35c', special: 'Compliance Zero', outfit: 'banker', hair: 'dark-neat', hairColor: '#241611', facial: 'shadow', skin: '#d69a73', suit: '#19233d', shirt: '#f8fbff', tie: '#e33b2f' },
  { id: 'moraes', name: 'Alexandre de Moraes', role: 'STF, toga preta', initials: 'AM', primary: '#171717', accent: '#7bdcff', special: 'Canetada', outfit: 'judge', hair: 'bald', hairColor: '#202020', facial: 'none', skin: '#d38f65', suit: '#111', shirt: '#fffdf3', tie: '#b30000' },
  { id: 'fabio-faria', name: 'Fábio Faria', role: 'Ponte aérea', initials: 'FF', primary: '#7c4bc9', accent: '#f1ddff', special: 'Interfone', outfit: 'suit', hair: 'dark-quiff', hairColor: '#1e1716', facial: 'none', skin: '#d99b70', suit: '#2b235f', shirt: '#edf5ff', tie: '#7c4bc9' },
  { id: 'mendonca', name: 'André Mendonça', role: 'STF, toga preta', initials: 'AMd', primary: '#1c9f4a', accent: '#e8f8d9', special: 'Martelada', outfit: 'judge', hair: 'dark-side', hairColor: '#201513', facial: 'none', glasses: true, skin: '#c98d67', suit: '#101010', shirt: '#fffdf3', tie: '#1c9f4a' },
  { id: 'bolsonaro', name: 'Bolsonaro', role: 'Palco político', initials: 'JB', primary: '#f28c28', accent: '#fff0a8', special: 'Motociata', outfit: 'presidential', hair: 'gray-comb', hairColor: '#c8c2b2', facial: 'none', expression: 'angry', skin: '#d49a70', suit: '#1b6b3a', shirt: '#fffdf3', tie: '#ffe35c' },
  { id: 'hugo-motta', name: 'Hugo Motta', role: 'Câmara', initials: 'HM', primary: '#008c8c', accent: '#d8ffff', special: 'Pauta-bomba', outfit: 'suit', hair: 'dark-round', hairColor: '#1e1716', facial: 'none', skin: '#c8845e', suit: '#0e3f63', shirt: '#f6fbff', tie: '#008c8c' },
  { id: 'davi-alcolumbre', name: 'Davi Alcolumbre', role: 'Senado', initials: 'DA', primary: '#3d5afe', accent: '#e4e9ff', special: 'Voto secreto', outfit: 'senator', build: 'heavy', hair: 'dark-round', hairColor: '#211815', facial: 'none', skin: '#c28762', suit: '#24304f', shirt: '#f7f7ff', tie: '#3d5afe' },
];

const byId = new Map(FIGHTERS.map(f => [f.id, f]));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const roll = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const AudioContextCtor = window.AudioContext || window.webkitAudioContext;

/**
 * Small, intentionally silly 2D one-on-one mini game. Everything is local DOM:
 * no canvas, no assets, no external dependencies.
 */
export function renderGamePanel(container, { onBack } = {}) {
  const root = document.createElement('section');
  root.className = 'fight-game';
  root.setAttribute('aria-label', 'Jogo de lutinha da Turma do Master');

  const state = {
    player: 'vorcaro',
    rival: 'moraes',
    hp: { player: 100, rival: 100 },
    guard: { player: false, rival: false },
    cooldown: { player: 0, rival: 0 },
    busy: false,
    over: false,
    timer: null,
    audio: null,
  };
  const sprite = (side) => `
    <div class="fight-fighter ${side}">
      <div class="fight-sprite ${side}">
        <div class="fight-head">
          <i class="fight-hair"></i>
          <i class="fight-brows"></i>
          <i class="fight-glasses"></i>
          <i class="fight-nose"></i>
          <i class="fight-mouth"></i>
          <i class="fight-facial"></i>
          <span></span>
        </div>
        <div class="fight-body">
          <i class="fight-shirt"></i>
          <i class="fight-tie"></i>
          <i class="fight-sash"></i>
          <i class="fight-pin"></i>
        </div>
        <div class="fight-arm left"><i></i></div>
        <div class="fight-arm right"><i></i></div>
        <div class="fight-leg left"></div>
        <div class="fight-leg right"></div>
      </div>
      <p class="fight-name"></p>
    </div>
  `;

  root.innerHTML = `
    <div class="fight-topbar">
      <button class="fight-back" type="button">Voltar</button>
      <div>
        <p class="fight-eyebrow">Aba interativa</p>
        <h2 class="fight-title">Lutinha da Turma</h2>
        <p class="fight-subtitle">Escolha dois personagens e vença no mano a mano. Controles: A soco, S defesa, D especial.</p>
      </div>
    </div>
    <div class="fight-layout">
      <aside class="fight-roster" aria-label="Personagens"></aside>
      <div class="fight-arena-wrap">
        <div class="fight-scoreboard">
          <div class="fight-health-card">
            <div class="fight-health-meta"><strong class="fight-player-name"></strong><span class="fight-player-hp"></span></div>
            <div class="fight-health"><span class="fight-player-health"></span></div>
          </div>
          <div class="fight-versus">VS</div>
          <div class="fight-health-card">
            <div class="fight-health-meta"><strong class="fight-rival-name"></strong><span class="fight-rival-hp"></span></div>
            <div class="fight-health"><span class="fight-rival-health"></span></div>
          </div>
        </div>
        <div class="fight-stage" aria-live="polite">
          ${sprite('player')}
          <div class="fight-impact">POW</div>
          ${sprite('rival')}
        </div>
        <div class="fight-controls">
          <button type="button" data-move="punch">Soco</button>
          <button type="button" data-move="guard">Defender</button>
          <button type="button" data-move="special">Especial</button>
          <button type="button" data-action="reroll">Trocar rival</button>
          <button type="button" data-action="reset">Reiniciar</button>
          <button type="button" data-action="sound" aria-pressed="true">Som: ligado</button>
        </div>
        <ol class="fight-log" aria-label="Narração da luta"></ol>
      </div>
    </div>
  `;

  const roster = root.querySelector('.fight-roster');
  const playerSprite = root.querySelector('.fight-sprite.player');
  const rivalSprite = root.querySelector('.fight-sprite.rival');
  const impact = root.querySelector('.fight-impact');
  const log = root.querySelector('.fight-log');

  for (const fighter of FIGHTERS) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'fight-roster-card';
    card.dataset.id = fighter.id;
    card.dataset.outfit = fighter.outfit;
    card.style.setProperty('--fighter', fighter.primary);
    card.style.setProperty('--fighter-accent', fighter.accent);
    const initials = document.createElement('span');
    initials.className = 'fight-roster-avatar';
    initials.textContent = fighter.initials;
    const text = document.createElement('span');
    text.className = 'fight-roster-text';
    const name = document.createElement('strong');
    name.textContent = fighter.name;
    const role = document.createElement('small');
    role.textContent = fighter.role;
    text.append(name, role);
    card.append(initials, text);
    card.addEventListener('click', () => chooseFighter(fighter.id));
    roster.appendChild(card);
  }

  root.querySelector('.fight-back').addEventListener('click', () => onBack?.());
  root.querySelector('[data-action="reset"]').addEventListener('click', () => {
    ensureAudio();
    resetFight();
  });
  root.querySelector('[data-action="sound"]').addEventListener('click', (event) => {
    if (!ensureAudio()) {
      event.currentTarget.textContent = 'Som indisponível';
      event.currentTarget.disabled = true;
      return;
    }
    state.audio.enabled = !state.audio.enabled;
    event.currentTarget.setAttribute('aria-pressed', String(state.audio.enabled));
    event.currentTarget.textContent = state.audio.enabled ? 'Som: ligado' : 'Som: desligado';
    if (state.audio.enabled) playSound('guard');
  });
  root.querySelector('[data-action="reroll"]').addEventListener('click', () => {
    ensureAudio();
    const options = FIGHTERS.map(f => f.id).filter(id => id !== state.player && id !== state.rival);
    state.rival = options[roll(0, options.length - 1)] || state.rival;
    resetFight({ keepMatch: true });
  });
  for (const btn of root.querySelectorAll('[data-move]')) {
    btn.addEventListener('click', () => playerMove(btn.dataset.move));
  }
  root.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    if (!['a', 's', 'd'].includes(key)) return;
    if (event.target.closest('input, textarea')) return;
    event.preventDefault();
    if (key === 'a') playerMove('punch');
    if (key === 's') playerMove('guard');
    if (key === 'd') playerMove('special');
  });
  root.tabIndex = -1;

  function chooseFighter(id) {
    if (id === state.player) return;
    state.player = id;
    if (state.rival === id) state.rival = FIGHTERS.find(f => f.id !== id)?.id || state.rival;
    resetFight({ keepMatch: true });
  }

  function resetFight({ keepMatch = false } = {}) {
    clearTimeout(state.timer);
    state.hp = { player: 100, rival: 100 };
    state.guard = { player: false, rival: false };
    state.cooldown = { player: 0, rival: 0 };
    state.busy = false;
    state.over = false;
    playerSprite.classList.remove('is-hit', 'is-attacking', 'is-guarding', 'is-winner', 'is-defeated');
    rivalSprite.classList.remove('is-hit', 'is-attacking', 'is-guarding', 'is-winner', 'is-defeated');
    impact.classList.remove('show');
    log.replaceChildren();
    addLog(keepMatch ? 'Nova luta montada. Valendo.' : 'Round reiniciado. Vai para cima.');
    playSound('reset');
    render();
    root.focus({ preventScroll: true });
  }

  function playerMove(move) {
    if (state.busy || state.over) return;
    if (move === 'special' && state.cooldown.player > 0) {
      addLog(`Especial recarregando (${state.cooldown.player}).`);
      playSound('miss');
      return;
    }
    ensureAudio();
    runMove('player', move);
    if (state.over) { render(); return; }
    state.busy = true;
    state.timer = setTimeout(() => {
      const aiMove = chooseAiMove();
      runMove('rival', aiMove);
      state.cooldown.player = Math.max(0, state.cooldown.player - 1);
      state.cooldown.rival = Math.max(0, state.cooldown.rival - 1);
      state.busy = false;
      render();
    }, 650);
    render();
  }

  function chooseAiMove() {
    if (state.hp.rival < 35 && Math.random() < 0.35) return 'guard';
    if (state.cooldown.rival === 0 && Math.random() < 0.28) return 'special';
    return Math.random() < 0.72 ? 'punch' : 'guard';
  }

  function runMove(actor, move) {
    const target = actor === 'player' ? 'rival' : 'player';
    const fighter = byId.get(state[actor]);
    const targetFighter = byId.get(state[target]);
    const actorSprite = actor === 'player' ? playerSprite : rivalSprite;
    const targetSprite = actor === 'player' ? rivalSprite : playerSprite;

    state.guard[actor] = false;
    if (move === 'guard') {
      state.guard[actor] = true;
      pulse(actorSprite, 'is-guarding');
      playSound('guard');
      addLog(`${fighter.name} fechou a guarda.`);
      return;
    }
    if (move === 'special' && state.cooldown[actor] > 0) return;

    const special = move === 'special';
    let damage = special ? roll(22, 30) : roll(9, 16);
    if (state.guard[target]) damage = Math.ceil(damage * 0.45);
    if (Math.random() < (special ? 0.12 : 0.08)) damage = 0;

    if (special) state.cooldown[actor] = 3;
    state.guard[target] = false;
    pulse(actorSprite, 'is-attacking');
    if (damage) pulse(targetSprite, 'is-hit');
    showImpact(damage ? (special ? 'KABUM' : 'POW') : 'OPA');
    playSound(damage ? (special ? 'special' : 'punch') : 'miss');
    state.hp[target] = clamp(state.hp[target] - damage, 0, 100);
    addLog(damage
      ? `${fighter.name} acertou ${special ? fighter.special : 'um soco'} em ${targetFighter.name}: -${damage}.`
      : `${fighter.name} tentou ${special ? fighter.special : 'bater'}, mas passou no vazio.`);

    if (state.hp[target] <= 0) {
      state.over = true;
      state.busy = false;
      actorSprite.classList.add('is-winner');
      targetSprite.classList.add('is-defeated');
      playSound('win');
      addLog(`${fighter.name} venceu a luta.`);
    }
  }

  function ensureAudio() {
    if (!AudioContextCtor) return null;
    if (!state.audio) state.audio = { ctx: new AudioContextCtor(), enabled: true };
    if (state.audio.ctx.state === 'suspended') state.audio.ctx.resume();
    return state.audio;
  }

  function playSound(kind) {
    const audio = state.audio;
    if (!audio?.enabled) return;
    const ctx = audio.ctx;
    const now = ctx.currentTime;

    const tone = (freq, duration, type = 'square', gain = 0.06, delay = 0) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now + delay);
      amp.gain.setValueAtTime(0.0001, now + delay);
      amp.gain.exponentialRampToValueAtTime(gain, now + delay + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + delay + duration);
      osc.connect(amp).connect(ctx.destination);
      osc.start(now + delay);
      osc.stop(now + delay + duration + 0.02);
    };

    const thump = (duration = 0.11, gain = 0.09) => {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(48, now + duration);
      amp.gain.setValueAtTime(gain, now);
      amp.gain.exponentialRampToValueAtTime(0.0001, now + duration);
      osc.connect(amp).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    };

    if (kind === 'punch') { thump(); tone(180, 0.06, 'sawtooth', 0.045); }
    if (kind === 'special') { thump(0.18, 0.12); tone(260, 0.09, 'square', 0.06); tone(520, 0.12, 'sawtooth', 0.045, 0.06); }
    if (kind === 'guard') { tone(330, 0.05, 'triangle', 0.035); tone(220, 0.06, 'triangle', 0.025, 0.045); }
    if (kind === 'miss') { tone(150, 0.05, 'sine', 0.025); tone(100, 0.08, 'sine', 0.02, 0.04); }
    if (kind === 'win') { tone(392, 0.11, 'square', 0.045); tone(523, 0.12, 'square', 0.045, 0.1); tone(784, 0.18, 'square', 0.04, 0.21); }
    if (kind === 'reset') { tone(260, 0.04, 'triangle', 0.018); }
  }

  function pulse(el, className) {
    el.classList.remove(className);
    void el.offsetWidth;
    el.classList.add(className);
    setTimeout(() => el.classList.remove(className), 380);
  }

  function showImpact(text) {
    impact.textContent = text;
    impact.classList.remove('show');
    void impact.offsetWidth;
    impact.classList.add('show');
    setTimeout(() => impact.classList.remove('show'), 420);
  }

  function addLog(text) {
    const item = document.createElement('li');
    item.textContent = text;
    log.prepend(item);
    while (log.children.length > 6) log.lastChild.remove();
  }

  function render() {
    const player = byId.get(state.player);
    const rival = byId.get(state.rival);
    renderSprite(playerSprite, player);
    renderSprite(rivalSprite, rival);
    root.querySelector('.fight-player-name').textContent = player.name;
    root.querySelector('.fight-rival-name').textContent = rival.name;
    root.querySelector('.fight-player-hp').textContent = `${state.hp.player}%`;
    root.querySelector('.fight-rival-hp').textContent = `${state.hp.rival}%`;
    root.querySelector('.fight-player-health').style.width = `${state.hp.player}%`;
    root.querySelector('.fight-rival-health').style.width = `${state.hp.rival}%`;
    root.querySelector('[data-move="special"]').disabled = state.cooldown.player > 0 || state.busy || state.over;
    root.querySelector('[data-move="special"]').textContent = state.cooldown.player > 0 ? `Especial (${state.cooldown.player})` : 'Especial';
    for (const btn of root.querySelectorAll('[data-move="punch"], [data-move="guard"]')) btn.disabled = state.busy || state.over;
    for (const card of root.querySelectorAll('.fight-roster-card')) card.classList.toggle('active', card.dataset.id === state.player);
  }

  function renderSprite(el, fighter) {
    el.style.setProperty('--fighter', fighter.primary);
    el.style.setProperty('--fighter-accent', fighter.accent);
    el.style.setProperty('--skin', fighter.skin);
    el.style.setProperty('--hair', fighter.hairColor || '#2a211b');
    el.style.setProperty('--suit', fighter.suit);
    el.style.setProperty('--pants', fighter.pants || fighter.suit);
    el.style.setProperty('--shirt', fighter.shirt);
    el.style.setProperty('--tie', fighter.tie);
    el.dataset.fighter = fighter.id;
    el.dataset.outfit = fighter.outfit;
    el.dataset.build = fighter.build || 'normal';
    el.dataset.hair = fighter.hair;
    el.dataset.facial = fighter.facial || 'none';
    el.dataset.glasses = fighter.glasses ? 'true' : 'false';
    el.dataset.expression = fighter.expression || 'neutral';
    el.setAttribute('aria-label', fighter.name);
    el.querySelector('.fight-head span').textContent = fighter.initials;
    el.parentElement.querySelector('.fight-name').textContent = fighter.name;
  }

  container.appendChild(root);
  resetFight();

  return {
    destroy() {
      clearTimeout(state.timer);
      state.audio?.ctx?.close?.();
      root.remove();
    },
  };
}
