// ============================================================
// engine.js — ステージ・1ボタン入力・サウンド・演出・デバッグ
// ============================================================
window.Engine = (() => {
  const W = 1920, H = 1080;
  const stage = document.getElementById('stage');
  const sceneRoot = document.getElementById('scene');
  const fx = document.getElementById('fx');
  const fxCtx = fx.getContext('2d');
  const flashEl = document.getElementById('flash');
  const debugLayer = document.getElementById('debug');

  // ---------- 画面フィット(1920×1080固定を等倍縮小) ----------
  function fit() {
    const s = Math.min(innerWidth / W, innerHeight / H);
    stage.style.transform = `scale(${s})`;
  }
  addEventListener('resize', fit);
  fit();

  // ---------- 1ボタン入力(Space / クリック / 大型USBボタン) ----------
  let pressCbs = [], releaseCbs = [], hiddenCb = null, down = false;

  function firePress() {
    if (down) return;
    down = true;
    const t = performance.now();
    pressCbs.slice().forEach(f => f(t));
  }
  function fireRelease() {
    if (!down) return;
    down = false;
    const t = performance.now();
    releaseCbs.slice().forEach(f => f(t));
  }

  addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) firePress();
      return;
    }
    // デバッグ切替(IME等でe.codeが取れない環境向けにe.keyでも判定)
    // 環境によって1押下でイベントが2回来ることがあるため、デバウンス+リピート無視
    if (e.code === 'KeyD' || e.key === 'd' || e.key === 'D') {
      if (!e.repeat) toggleDebugSafe();
      return;
    }
    if (hiddenCb) {
      const m = e.code.match(/^(?:Digit|Numpad)([0-9])$/) || (/^[0-9]$/.test(e.key) ? [null, e.key] : null);
      if (m) hiddenCb(+m[1]);
    }
  });
  addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'Enter') fireRelease();
  });
  addEventListener('pointerdown', () => firePress());
  addEventListener('pointerup', () => fireRelease());
  addEventListener('pointercancel', () => fireRelease());

  const Input = {
    onPress(f)    { pressCbs.push(f); return f; },
    offPress(f)   { pressCbs = pressCbs.filter(x => x !== f); },
    onRelease(f)  { releaseCbs.push(f); return f; },
    offRelease(f) { releaseCbs = releaseCbs.filter(x => x !== f); },
    clear()       { pressCbs = []; releaseCbs = []; },
    isDown: () => down,
    waitPress() {
      return new Promise(res => {
        const f = t => { Input.offPress(f); res(t); };
        Input.onPress(f);
      });
    },
    waitRelease() {
      return new Promise(res => {
        const f = t => { Input.offRelease(f); res(t); };
        Input.onRelease(f);
      });
    },
    setHiddenKey(f) { hiddenCb = f; },
  };

  // ---------- サウンド(仮シンセ音/configでファイル差し替え) ----------
  let actx = null;
  function ac() {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
    return actx;
  }
  addEventListener('pointerdown', () => { try { ac(); } catch (e) {} }, { once: true });
  addEventListener('keydown',     () => { try { ac(); } catch (e) {} }, { once: true });

  function tone(freq, dur = 0.1, type = 'square', vol = 0.15, delay = 0, slideTo = 0) {
    try {
      const c = ac(), o = c.createOscillator(), g = c.createGain();
      const t0 = c.currentTime + delay;
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.linearRampToValueAtTime(slideTo, t0 + dur);
      g.gain.setValueAtTime(vol, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) {}
  }

  const SFX = {
    button:  () => tone(700, 0.07, 'square', 0.12),
    stop:    () => { tone(300, 0.08, 'square', 0.2); tone(150, 0.1, 'triangle', 0.2, 0.02); },
    reach:   () => { for (let i = 0; i < 8; i++) tone(300 + i * 90, 0.09, 'sawtooth', 0.1, i * 0.07); },
    win:     () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.15, 'square', 0.14, i * 0.12)),
    bigwin:  () => [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, 0.16, 'square', 0.15, i * 0.11)),
    lose:    () => [400, 350, 300, 200].forEach((f, i) => tone(f, 0.18, 'triangle', 0.18, i * 0.15)),
    tick:    () => tone(900, 0.05, 'square', 0.12),
    go:      () => tone(1500, 0.25, 'square', 0.2),
    perfect: () => [880, 1175, 1760].forEach((f, i) => tone(f, 0.1, 'square', 0.15, i * 0.06)),
    good:    () => { tone(660, 0.12, 'square', 0.14); tone(880, 0.12, 'square', 0.14, 0.1); },
    miss:    () => tone(180, 0.3, 'sawtooth', 0.16),
    revive:  () => { for (let i = 0; i < 6; i++) tone(200 + i * 150, 0.08, 'square', 0.13, i * 0.06); },
    charge:  () => tone(180, 0.5, 'sawtooth', 0.07, 0, 700),
  };

  const bgmPlayers = {};
  function sound(name) {
    const def = (window.CONFIG.sounds || {})[name];
    if (def && def.file) {
      try {
        if (def.loop) {
          if (!bgmPlayers[name]) {
            bgmPlayers[name] = new Audio(def.file);
            bgmPlayers[name].loop = true;
          }
          bgmPlayers[name].volume = def.volume ?? 1;
          bgmPlayers[name].currentTime = 0;
          bgmPlayers[name].play();
        } else {
          const a = new Audio(def.file);
          a.volume = def.volume ?? 1;
          a.play();
        }
      } catch (e) {}
      return;
    }
    (SFX[name] || (() => {}))();
  }
  function stopBgm() {
    Object.values(bgmPlayers).forEach(a => { try { a.pause(); } catch (e) {} });
  }

  // ---------- シーン管理 ----------
  function setScene(cls) {
    Input.clear();
    sceneRoot.className = '';
    sceneRoot.innerHTML = '';
    // 'sc-mg mg-issen' のような複数クラス指定に対応
    if (cls) cls.split(/\s+/).forEach(c => { if (c) sceneRoot.classList.add(c); });
    return sceneRoot;
  }
  function el(parent, cls, html) {
    const d = document.createElement('div');
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    parent.appendChild(d);
    return d;
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const randInt = n => Math.floor(Math.random() * n);
  const choice = arr => arr[randInt(arr.length)];

  // ---------- 画像素材ヘルパー ----------
  // ファイル名 → URL(config.images.dir 基準)
  function assetUrl(file) {
    const dir = (window.CONFIG.images || {}).dir || 'assets/images/';
    return dir + file;
  }
  // 要素に背景画像を設定。file が null/未指定なら何もしない(=仮図形のまま)
  // 戻り値: 画像を設定したか
  function setImage(elm, file, size = 'cover', position = 'center') {
    if (!file || !elm) return false;
    elm.style.backgroundImage = `url('${assetUrl(file)}')`;
    elm.style.backgroundSize = size;
    elm.style.backgroundPosition = position;
    elm.style.backgroundRepeat = 'no-repeat';
    return true;
  }
  // シーン背景: config.images のキーで指定(なければCSSの仮背景のまま)
  function sceneBg(sceneEl, imageKey) {
    const file = (window.CONFIG.images || {})[imageKey];
    if (setImage(sceneEl, file, 'cover')) sceneEl.classList.remove('halftone');
    return !!file;
  }
  // メンバーの顔チップ: face画像があれば顔、なければ色+イニシャル
  function memberFace(parent, member, cls) {
    const d = el(parent, cls, member.face ? '' : member.id);
    d.style.background = member.color;
    if (member.face) {
      setImage(d, member.face, 'cover');
      d.classList.add('face');
    }
    return d;
  }

  // ---------- コマ送りアニメ(画像を定期的に切り替え) ----------
  // files: 画像ファイル名の配列(2〜3枚)。要素がDOMから外れたら自動停止
  // 戻り値: 停止関数
  function animate(elm, files, intervalMs = 600, size = 'contain', position = 'center bottom') {
    const fs = (files || []).filter(Boolean);
    if (!fs.length || !elm) return () => {};
    let i = 0;
    setImage(elm, fs[0], size, position);
    if (fs.length < 2) return () => {};
    const id = setInterval(() => {
      if (!elm.isConnected) { clearInterval(id); return; }
      i = (i + 1) % fs.length;
      setImage(elm, fs[i], size, position);
    }, intervalMs);
    return () => clearInterval(id);
  }

  // ---------- 画像のプリロード(チラつき防止+読み込み失敗の検出) ----------
  // 読み込めない画像があれば画面にERROR表示(デプロイ先でのパス不一致調査用)
  function preloadAll() {
    const seen = new Set();
    const failed = [];
    (function walk(v) {
      if (typeof v === 'string' && /\.(png|jpe?g|webp|gif)$/i.test(v)) {
        if (!seen.has(v)) {
          seen.add(v);
          const im = new Image();
          im.onerror = () => {
            failed.push(v);
            showError('画像を読み込めません(' + failed.length + '件): ' + im.src);
          };
          im.src = assetUrl(v);
        }
      } else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === 'object') Object.values(v).forEach(walk);
    })(window.CONFIG);
    // ura.symbols は実行時に 'ura/' が付くため個別にチェック
    ((window.CONFIG.ura || {}).symbols || []).forEach(f => walk_check('ura/' + f));
    function walk_check(file) {
      if (seen.has(file)) return;
      seen.add(file);
      const im = new Image();
      im.onerror = () => showError('画像を読み込めません: ' + im.src);
      im.src = assetUrl(file);
    }
  }
  setTimeout(preloadAll, 0);

  // ---------- レイアウト微調整(config.layout) ----------
  function applyLayout(elm, key) {
    const L = (window.CONFIG.layout || {})[key];
    if (!L || !elm) return;
    elm.classList.add('layout-abs');
    if (L.x != null) elm.style.left = L.x + 'px';
    if (L.y != null) elm.style.top = L.y + 'px';
    elm.style.transform = `translate(-50%,-50%) scale(${L.scale ?? 1})`;
  }

  // ---------- 演出(フラッシュ・振動・紙吹雪) ----------
  function flash(color = '#fff', ms = 130) {
    flashEl.style.background = color;
    flashEl.style.opacity = 0.9;
    setTimeout(() => { flashEl.style.opacity = 0; }, ms);
  }
  function shake() {
    stage.classList.remove('shake');
    void stage.offsetWidth;
    stage.classList.add('shake');
  }

  let parts = [], fxRunning = false;
  function confetti(n = 140) {
    const colors = ['#ff5fa2', '#ffd54f', '#4fc3f7', '#b39ddb', '#7CFC00', '#fff'];
    for (let i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * W, y: -20 - Math.random() * 400,
        vx: (Math.random() - 0.5) * 4, vy: 3 + Math.random() * 6,
        s: 8 + Math.random() * 12, c: colors[i % colors.length],
        r: Math.random() * 6.28, vr: (Math.random() - 0.5) * 0.3,
      });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxStep); }
  }
  function fxStep() {
    fxCtx.clearRect(0, 0, W, H);
    parts = parts.filter(p => p.y < H + 40);
    for (const p of parts) {
      p.x += p.vx; p.y += p.vy; p.r += p.vr;
      fxCtx.save();
      fxCtx.translate(p.x, p.y); fxCtx.rotate(p.r);
      fxCtx.fillStyle = p.c;
      fxCtx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6);
      fxCtx.restore();
    }
    if (parts.length) requestAnimationFrame(fxStep);
    else { fxRunning = false; fxCtx.clearRect(0, 0, W, H); }
  }

  // ---------- デバッグモード(Dキー) ----------
  let debugOn = !!window.CONFIG.debug;
  const debugState = {};
  function toast(msg) {   // 切替の確認表示(一瞬だけ)
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    stage.appendChild(t);
    setTimeout(() => t.remove(), 900);
  }
  function toggleDebug() { debugOn = !debugOn; renderDebug(); toast('DEBUG ' + (debugOn ? 'ON' : 'OFF')); }
  let lastToggleAt = 0;
  function toggleDebugSafe() {   // 300ms以内の連続トグルを無視(二重発火対策)
    const now = performance.now();
    if (now - lastToggleAt < 300) return;
    lastToggleAt = now;
    toggleDebug();
  }
  function setDebug(k, v) { debugState[k] = v; renderDebug(); }
  function renderDebug() {
    if (!debugOn) { debugLayer.style.display = 'none'; debugLayer.innerHTML = ''; return; }
    debugLayer.style.display = 'block';
    let html = '';
    for (let x = 0; x <= W; x += 100)
      html += `<div class="dbg-v" style="left:${x}px"></div><div class="dbg-lb" style="left:${x + 3}px;top:2px">${x}</div>`;
    for (let y = 0; y <= H; y += 100)
      html += `<div class="dbg-h" style="top:${y}px"></div><div class="dbg-lb" style="left:3px;top:${y + 2}px">${y}</div>`;
    const info = Object.entries(debugState).map(([k, v]) => `${k}: ${v}`).join('<br>');
    html += `<div class="dbg-info">DEBUG (Dで非表示)<br>${info}<br><span id="dbg-mouse"></span></div>`;
    debugLayer.innerHTML = html;
  }
  stage.addEventListener('mousemove', e => {
    if (!debugOn) return;
    const r = stage.getBoundingClientRect();
    const x = Math.round((e.clientX - r.left) / r.width * W);
    const y = Math.round((e.clientY - r.top) / r.height * H);
    const m = document.getElementById('dbg-mouse');
    if (m) m.textContent = `mouse: ${x}, ${y}`;
  });
  renderDebug();

  // ---------- エラーの可視化(黒画面のまま止まるのを防ぐ) ----------
  function showError(msg) {
    let e = document.getElementById('err-overlay');
    if (!e) {
      e = document.createElement('div');
      e.id = 'err-overlay';
      e.style.cssText = 'position:absolute;left:20px;bottom:20px;z-index:200;' +
        'background:rgba(180,0,0,.92);color:#fff;font-size:26px;font-weight:400;' +
        'padding:14px 22px;border-radius:10px;max-width:1700px;';
      stage.appendChild(e);
    }
    e.textContent = 'ERROR: ' + msg;
  }
  addEventListener('error', ev => showError(ev.message || String(ev.error)));
  addEventListener('unhandledrejection', ev =>
    showError(ev.reason && ev.reason.message ? ev.reason.message : String(ev.reason)));

  return {
    W, H, Input, sound, stopBgm, setScene, el, sleep, rand, randInt, choice,
    applyLayout, flash, shake, confetti, setDebug, toggleDebug,
    assetUrl, setImage, sceneBg, memberFace, animate,
  };
})();

// ---------- ミニゲーム登録(プラガブル) ----------
// 新しいミニゲームは js/minigames/ にファイルを追加し、
// MiniGames.register('id', { title, run(ctx) }) で登録するだけで使える
window.MiniGames = {
  defs: {},
  register(id, def) { this.defs[id] = def; },
  // bias: null=通常 / 'easy'=甘め補正 / 'hard'=辛め補正 / 'forceLose'=強制敗北
  // extra: ゲーム固有の追加情報(例: 復活チャレンジの挑戦回数)
  async run(id, bias, extra) {
    const def = this.defs[id];
    if (!def) throw new Error('minigame not found: ' + id);
    const root = Engine.setScene('sc-mg mg-' + id);
    Engine.setDebug('scene', 'minigame:' + id + (bias ? ' [' + bias + ']' : ''));
    return await def.run({
      root,
      cfg: (window.CONFIG.minigames || {})[id] || {},
      bias: bias || null,
      extra: extra || {},
    });
  },
};
