// ============================================================
// ura.js — 裏ステージ(第3段階/my-slot-app 由来)
// symbol_1〜5 のスロット。3回押して止める。
//   ハズレ(70%)          → 2等
//   通常目(symbol_2〜5)揃い(30%) → 1等
//   特別目(symbol_1)揃い(0%)     → 特賞(通常は当選しない)
// ctx.extra.forceTier: 0=特賞 / 1=1等 / 2=2等 を強制(隠しキー用)
// ============================================================
MiniGames.register('ura', {
  title: '裏ステージ',

  async run(ctx) {
    const cfg = window.CONFIG.ura || {};
    const L = (window.CONFIG.layout || {});
    const IMG = cfg.images || {};
    const s = ctx.root;
    const SYM_FILES = (cfg.symbols || []).map(f => 'ura/' + f);
    const N = SYM_FILES.length;

    if (IMG.bg) Engine.setImage(s, IMG.bg, 'cover');
    Engine.el(s, 'ura-vignette');

    // 装飾パネル(frame_reel.png): リール群の背後に半透明で敷く(元アプリと同じ構成)
    const panel = Engine.el(s, 'ura-panel layout-abs');
    if (IMG.frame) Engine.setImage(panel, IMG.frame, '100% 100%');
    Engine.applyLayout(panel, 'uraPanel');

    // PRESS SPACE KEY(text_space.png): 上部タイトル(ゆるやかに明滅)
    const guide = Engine.el(s, 'ura-guide soft-blink');
    if (IMG.textSpace) Engine.setImage(guide, IMG.textSpace, 'contain', 'center');
    else guide.textContent = 'PRESS SPACE KEY';

    // ---------- リール ----------
    const RL = L.uraReels || { centers: [{ x: 560, y: 500 }, { x: 960, y: 500 }, { x: 1360, y: 500 }], width: 300, height: 300 };
    class UraReel {
      constructor(center) {
        this.h = RL.height;
        this.N = N;
        this.win = Engine.el(s, 'ura-reel layout-abs');
        this.win.style.left = center.x + 'px';
        this.win.style.top = center.y + 'px';
        this.win.style.width = RL.width + 'px';
        this.win.style.height = RL.height + 'px';
        this.strip = document.createElement('div');
        this.strip.className = 'reel-strip';
        for (let r = 0; r < 2; r++) {
          for (const f of SYM_FILES) {
            const d = document.createElement('div');
            d.className = 'ura-sym';
            d.style.height = this.h + 'px';
            Engine.setImage(d, f, 'contain', 'center');
            this.strip.appendChild(d);
          }
        }
        this.win.appendChild(this.strip);
        this.offset = Engine.randInt(N) * this.h;
        this.mode = 'idle';
        this.render();
      }
      render() {
        const total = this.N * this.h;
        const o = ((this.offset % total) + total) % total;
        this.strip.style.transform = `translateY(${-o}px)`;
      }
      spin() {
        if (this.mode === 'spin') return;
        this.mode = 'spin';
        const tick = () => {
          if (this.mode === 'spin') {
            this.offset += cfg.spinSpeed || 34;
            this.render();
          } else if (this.mode === 'stop') {
            const t = Math.min(1, (performance.now() - this.t0) / this.dur);
            const e = 1 - Math.pow(1 - t, 3);
            this.offset = this.from + (this.to - this.from) * e;
            this.render();
            if (t >= 1) {
              this.mode = 'idle';
              const cb = this.onStopped; this.onStopped = null;
              if (cb) cb();
              return;
            }
          } else return;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
      stopAt(i) {
        return new Promise(res => {
          const total = this.N * this.h;
          const cur = this.offset;
          let target = Math.ceil(cur / total) * total + i * this.h;
          if (target - cur < this.h * 3) target += total;
          this.from = cur; this.to = target;
          this.t0 = performance.now(); this.dur = 560;
          this.onStopped = () => { this.offset = this.to; this.render(); res(); };
          this.mode = 'stop';
        });
      }
    }
    const reels = RL.centers.map(c => new UraReel(c));

    // ---------- 出目の決定 ----------
    // tier: 0=特賞(symbol_1揃い) / 1=1等(通常目揃い) / 2=2等(ハズレ)
    let tier;
    if (ctx.extra && ctx.extra.forceTier != null && ctx.extra.forceTier <= 2) {
      tier = ctx.extra.forceTier;
    } else {
      const r = Math.random();
      if (r < (cfg.spWinRate || 0)) tier = 0;
      else if (r < (cfg.spWinRate || 0) + (cfg.winRate ?? 0.3)) tier = 1;
      else tier = 2;
    }
    let finals;
    if (tier === 0) {
      finals = [0, 0, 0];                                   // symbol_1 揃い
    } else if (tier === 1) {
      const m = 1 + Engine.randInt(N - 1);                  // symbol_2〜5 から
      finals = [m, m, m];
    } else if (Math.random() < (cfg.reachTeaseRate ?? 0.5)) {
      const m = 1 + Engine.randInt(N - 1);
      let c; do { c = Engine.randInt(N); } while (c === m);
      finals = [m, m, c];                                   // リーチ→ずれ
    } else {
      const a = Engine.randInt(N);
      let b; do { b = Engine.randInt(N); } while (b === a);
      finals = [a, b, Engine.randInt(N)];
    }

    // ---------- 進行 ----------
    Engine.sound('bgmUra');
    Engine.sound('uraStart');
    reels.forEach(r => r.spin());
    await Engine.sleep(700);

    for (let k = 0; k < 3; k++) {
      await Engine.Input.waitPress();
      Engine.sound('uraStop');
      await reels[k].stopAt(finals[k]);
      await Engine.sleep(140);
      if (k === 1 && finals[0] === finals[1]) {
        Engine.sound('uraReach');
        Engine.flash('#fff', 160);
        const t = Engine.el(s, 'ura-text');
        if (IMG.textReach) Engine.setImage(t, IMG.textReach, 'contain', 'center');
        else t.textContent = 'リーチ...';
        setTimeout(() => t.remove(), 1400);
      }
    }
    guide.remove();
    Engine.stopBgm();
    await Engine.sleep(500);

    // ---------- 結果演出 ----------
    if (tier <= 1) {
      Engine.flash('#fff', 250);
      Engine.shake();
      Engine.sound('uraWin');
      Engine.confetti(tier === 0 ? 400 : 240);
      const t = Engine.el(s, 'ura-text big');
      if (IMG.textWin) Engine.setImage(t, IMG.textWin, 'contain', 'center');
      else t.textContent = 'WIN!!';
      if (tier === 0) {
        const b = Engine.el(s, 'burst', '特賞!!!!');
        b.style.top = '20%';
      }
      await Engine.sleep(2600);
    } else {
      Engine.sound('uraLose');
      const t = Engine.el(s, 'ura-text big');
      if (IMG.textLose) Engine.setImage(t, IMG.textLose, 'contain', 'center');
      else t.textContent = '...';
      await Engine.sleep(2000);
    }
    return { tier };
  },
});
