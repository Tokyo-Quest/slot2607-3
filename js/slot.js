// ============================================================
// slot.js — 第1段階スロット(prototype2)
// 3つ揃い(確率5%)でミニゲームへ進出。リーチ演出は残す。
// 残チャレンジ数を隅に表示。
// ============================================================
window.Slot = (() => {

  let SYMS = null;
  function symbols() {
    if (SYMS) return SYMS;
    SYMS = window.CONFIG.members.map((m, i) => ({
      type: 'member', memberIdx: i, label: m.id, color: m.color, image: m.face || null,
    }));
    return SYMS;
  }

  function reelLayout() {
    const L = (window.CONFIG.layout || {}).reels || {};
    return {
      centers: L.centers || [{ x: 445, y: 341 }, { x: 744, y: 337 }, { x: 1058, y: 342 }],
      w: L.width || 230,
      h: L.height || 260,
    };
  }

  class Reel {
    constructor(container, center, w, h) {
      const syms = symbols();
      this.N = syms.length;
      this.h = h;
      this.win = Engine.el(container, 'reel-window on-frame');
      this.win.style.left = center.x + 'px';
      this.win.style.top = center.y + 'px';
      this.win.style.width = w + 'px';
      this.win.style.height = h + 'px';
      this.strip = document.createElement('div');
      this.strip.className = 'reel-strip';
      for (let r = 0; r < 2; r++) {
        for (const s of syms) {
          const d = document.createElement('div');
          d.className = 'sym';
          d.style.height = h + 'px';
          d.style.fontSize = Math.round(h * 0.5) + 'px';
          d.style.background = s.color;
          if (s.image) {
            Engine.setImage(d, s.image, 'cover', 'center top');
            d.classList.add('face');
          } else {
            d.textContent = s.label;
          }
          this.strip.appendChild(d);
        }
      }
      this.win.appendChild(this.strip);
      this.offset = Engine.randInt(this.N) * h;
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
          this.offset += window.CONFIG.slot.spinSpeed;
          this.render();
        } else if (this.mode === 'stop') {
          const t = Math.min(1, (performance.now() - this.t0) / this.dur);
          const e = 1 - Math.pow(1 - t, 3);
          this.offset = this.from + (this.to - this.from) * e;
          this.render();
          if (t >= 1) {
            this.mode = 'idle';
            const cb = this.onStopped;
            this.onStopped = null;
            if (cb) cb();
            return;
          }
        } else {
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    stopAt(symIndex) {
      return new Promise(res => {
        const total = this.N * this.h;
        const cur = this.offset;
        let target = Math.ceil(cur / total) * total + symIndex * this.h;
        if (target - cur < this.h * 3) target += total;
        this.from = cur; this.to = target;
        this.t0 = performance.now(); this.dur = 480;
        this.onStopped = () => { this.offset = this.to; this.render(); res(); };
        this.mode = 'stop';
      });
    }
  }

  let reels = [];
  let counterEl = null;

  function renderCounter(n, crack) {
    if (!counterEl) return;
    const total = (window.CONFIG.play && window.CONFIG.play.credits) || 5;
    counterEl.innerHTML =
      `<span class="cc-label">CHALLENGE</span><span class="cc-dots">${'●'.repeat(Math.max(0, n))}${'○'.repeat(Math.max(0, total - n))}</span>`;
    if (crack) {
      counterEl.classList.remove('cc-crack');
      void counterEl.offsetWidth;
      counterEl.classList.add('cc-crack');
    }
  }

  function buildScene(creditsLeft) {
    reels.forEach(r => { r.mode = 'idle'; });
    const s = Engine.setScene('sc-slot');
    s.classList.add('halftone');
    Engine.sceneBg(s, 'bgSlot');

    const IMG = window.CONFIG.images || {};
    const cab = Engine.el(s, 'slot-cabinet layout-abs');
    let reelParent = cab;
    if (IMG.frameSlot) {
      reelParent = Engine.el(cab, 'reel-layer');
      const overlay = Engine.el(cab, 'frame-overlay');
      Engine.setImage(overlay, IMG.frameSlot, 'contain');
    } else {
      cab.classList.add('plain');
    }
    Engine.applyLayout(cab, 'slotFrame');

    const RL = reelLayout();
    reels = [0, 1, 2].map(i => new Reel(reelParent, RL.centers[i], RL.w, RL.h));

    // 両サイドのキャラ(コマ送りアニメ)
    const ms = window.CONFIG.members;
    const li = Engine.randInt(ms.length);
    let ri; do { ri = Engine.randInt(ms.length); } while (ri === li);
    const interval = (window.CONFIG.anims && window.CONFIG.anims.intervalMs) || 600;
    [[li, 'slotSideL'], [ri, 'slotSideR']].forEach(([idx, key], k) => {
      const m = ms[idx];
      const side = Engine.el(s, 'slot-side layout-abs');
      side.style.animationDelay = (k * 0.4) + 's';
      const frames = (m.anim && m.anim.length) ? m.anim : [m.stand];
      Engine.animate(side, frames, interval + k * 70);
      Engine.applyLayout(side, key);
    });

    // 残チャレンジカウンター(隅に表示)
    counterEl = Engine.el(s, 'credit-counter layout-abs');
    renderCounter(creditsLeft, false);
    Engine.applyLayout(counterEl, 'creditCounter');

    const push = Engine.el(s, 'slot-push blink', 'STOP!');
    return { s, cab, push };
  }

  return {
    symbols,

    // outcome: { win:bool, memberIdx:number, tease:bool } / creditsLeft: 残チャレンジ数
    async run(outcome, creditsLeft) {
      const syms = symbols();
      const ui = buildScene(creditsLeft);
      Engine.setDebug('scene', 'slot (credits=' + creditsLeft + ')');
      const mi = outcome.memberIdx;

      // 最終出目を決める
      let finals;
      if (outcome.win) {
        finals = [mi, mi, mi];                    // 3つ揃い!
      } else if (outcome.tease) {
        let c; do { c = Engine.randInt(syms.length); } while (c === mi);
        finals = [mi, mi, c];                     // リーチ→1コマずれ
      } else {
        const a = Engine.randInt(syms.length);
        let b; do { b = Engine.randInt(syms.length); } while (b === a);
        const c = Engine.randInt(syms.length);
        finals = [a, b, c];                       // リーチにもならない
      }

      reels.forEach(r => r.spin());
      await Engine.sleep(500);

      for (let k = 0; k < 3; k++) {
        await Engine.Input.waitPress();
        Engine.sound('button');
        await reels[k].stopAt(finals[k]);
        Engine.sound('stop');
        await Engine.sleep(120);
        // 2つ揃ったらリーチ表示(3つ目はプレイヤーが止める)
        if (k === 1 && finals[0] === finals[1]) {
          Engine.sound('reach');
          Engine.flash('#fff', 160);
          const rb = Engine.el(ui.s, 'burst', 'リーチ!!');
          setTimeout(() => rb.remove(), 1200);
        }
      }

      await Engine.sleep(400);
      if (outcome.win) {
        Engine.flash('#fff', 200);
        Engine.shake();
        Engine.sound('bigwin');
        Engine.confetti(200);
        Engine.el(ui.s, 'burst', '大当たり!!');
        await Engine.sleep(2000);
        return { win: true };
      }
      const b = Engine.el(ui.s, 'burst', finals[0] === finals[1] ? 'あと1コマ...!' : 'そろわない...!');
      b.style.color = '#b0bec5';
      Engine.sound('miss');
      await Engine.sleep(900);
      // クレジットが1つ減る演出(4等スプラッシュの代わり)
      renderCounter(creditsLeft - 1, true);
      Engine.sound('tick');
      await Engine.sleep(700);
      return { win: false };
    },
  };
})();
