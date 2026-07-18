// ============================================================
// flow.js — prototype2 全体進行
// 待機 → [スロット → ミニゲーム → 裏ステージ] ×最大5クレジット → 最終結果
//
// 等級(到達ステージで決定):
//   スロット失敗=4等 / ミニゲーム失敗=3等 / 裏ハズレ=2等 / 裏通常揃い=1等 / 裏特別揃い=特賞
//
// 隠しキー(待機画面中):
//   1〜4 = 1等〜4等を強制 / 5 = 特賞を強制 / 6〜9 = ミニゲーム(メンバー)強制 / 0 = リセット
//   ※強制はそのプレイの最初のチェーンにのみ適用
// ============================================================
(() => {
  const C = window.CONFIG;
  let forcedTier = null;    // 0=特賞, 1〜4=1等〜4等 or null
  let forcedGameIdx = null; // 0〜3 or null

  function pickMemberIdx() {
    const w = C.slot.memberWeights || C.members.map(() => 1);
    const total = w.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r < 0) return i; }
    return 0;
  }

  // ---------- 待機画面 ----------
  async function attract() {
    const s = Engine.setScene('sc-attract');
    s.classList.add('halftone');
    Engine.sceneBg(s, 'bgAttract');
    Engine.setDebug('scene', 'attract');
    Engine.sound('bgmAttract');
    const IMG = C.images || {};

    const logo = Engine.el(s, 'attract-logo');
    logo.innerHTML = `<div class="logo-main">MID POP</div><div class="logo-sub">ワンボタン・パニック!</div>`;
    Engine.applyLayout(logo, 'title');

    const badge = Engine.el(s, 'price-badge');
    badge.innerHTML = `<span>1PLAY</span>¥1,000`;
    if (Engine.setImage(badge, IMG.badgePrice, 'contain')) badge.classList.add('img-plain');

    const lineup = Engine.el(s, 'attract-lineup layout-abs');
    C.members.forEach((m, i) => {
      const ch = Engine.el(lineup, 'lineup-char');
      ch.style.animationDelay = (i * 0.18) + 's';
      const frames = (m.anim && m.anim.length) ? m.anim : [m.stand];
      Engine.animate(ch, frames, (C.anims && C.anims.intervalMs || 600) + i * 40);
    });
    Engine.applyLayout(lineup, 'lineup');

    const push = Engine.el(s, 'push-guide blink', 'PUSH TO START!');
    if (Engine.setImage(push, IMG.guidePush, '100% 100%')) push.classList.add('img-plain');
    Engine.applyLayout(push, 'pushGuide');

    const tierName = t => t == null ? 'なし(確率)' : (C.tiers[t] ? C.tiers[t].name : t) + ' 強制';
    const updateHiddenDebug = () => {
      Engine.setDebug('forcedTier', tierName(forcedTier));
      Engine.setDebug('forcedGame', forcedGameIdx == null ? 'なし(ランダム)'
        : C.members[forcedGameIdx].name + '(' + C.members[forcedGameIdx].game + ')');
    };
    Engine.Input.setHiddenKey(k => {
      if (k === 0) { forcedTier = null; forcedGameIdx = null; }
      else if (k >= 1 && k <= 4) forcedTier = k;       // 1〜4等
      // ※特賞の強制キーは操作ミス防止のため廃止(特賞は絶対に出ない)
      else if (k >= 6 && k <= 9) forcedGameIdx = k - 6;
      updateHiddenDebug();
    });
    updateHiddenDebug();

    await Engine.Input.waitPress();
    Engine.Input.setHiddenKey(null);
    Engine.stopBgm();
    Engine.sound('button');
    Engine.flash('#fff', 100);
    await Engine.sleep(200);
    play();
  }

  // ---------- 1プレイ(5クレジット) ----------
  async function play() {
    const fTier = forcedTier;      // ワンショット(最初のチェーンのみ)
    const fGame = forcedGameIdx;
    forcedTier = null;
    forcedGameIdx = null;

    let credits = (C.play && C.play.credits) || 5;
    let best = 4;
    let first = true;

    while (credits > 0) {
      const tier = await chain(first ? fTier : null, first ? fGame : null, credits);
      credits--;
      first = false;
      best = Math.min(best, tier);
      // 4等(スロット不成立)はスプラッシュを出さずテンポ優先
      // (クレジット減少の演出はスロット側で表示)
      if (credits > 0 && tier < 4) await tierSplash(tier, credits);
    }
    return finalResult(best);
  }

  // ---------- 1チェーン(スロット→ミニゲーム→裏) 戻り値: 等級 ----------
  async function chain(fTier, fGame, creditsLeft) {
    // 1〜3等確定モードでは「ときめきトーク」を強制選択
    // (実力系ゲームで結果を強制すると不自然に見えるため。確率判定なら自然)
    let memberIdx;
    if (fTier != null && fTier <= 3) {
      const t = C.members.findIndex(m => m.game === 'tokimeki');
      memberIdx = t >= 0 ? t : 0;
    } else if (fGame != null) {
      memberIdx = fGame;
    } else {
      memberIdx = pickMemberIdx();
    }
    const member = C.members[memberIdx];

    // 第1段階: スロット(3つ揃い=5%)
    // ゲーム指定(6〜9キー)時はスロットを必ず成立させて指定ゲームへ進める
    // ※等級強制がある場合はそちらを優先(4等強制ならスロット不成立)
    const slotWin = fTier != null ? fTier <= 3
      : (fGame != null ? true : Math.random() < C.slot.winRate);
    const tease = !slotWin && Math.random() < (C.slot.reachTeaseRate ?? 0.35);
    Engine.sound('bgmSlot');
    const slotRes = await Slot.run({ win: slotWin, memberIdx, tease }, creditsLeft);
    Engine.stopBgm();
    if (!slotRes.win) return 4;

    // 第2段階: ミニゲーム(告知カットイン→本編)
    await gameCutin(member);
    const bias = fTier == null ? null : (fTier <= 2 ? 'easy' : 'hard');
    const res = await MiniGames.run(member.game, bias);
    let success = (C.resultMap[res.level] ?? 1) >= 3; // perfect/good=成功
    if (fTier != null) success = fTier <= 2;
    if (!success) return 3;

    // 第3段階: 裏ステージ(突入演出→本編)
    await uraIntro();
    const ures = await MiniGames.run('ura', null, { forceTier: fTier });
    return ures.tier; // 0=特賞 / 1=1等 / 2=2等
  }

  // ---------- ミニゲーム開始告知(ルール付き・約5秒) ----------
  async function gameCutin(member) {
    const s = Engine.setScene('sc-cutin');
    Engine.setDebug('scene', 'cutin');
    const lines = Engine.el(s, 'speedlines');
    Engine.setImage(lines, (C.images || {}).bgCutin, 'cover');
    const def = MiniGames.defs[member.game] || {};
    const rule = ((C.minigames || {})[member.game] || {}).ruleText || '';
    const panel = Engine.el(s, 'cutin-panel');
    panel.style.background = member.color;
    const visual = member.stand
      ? `<div class="cutin-stand" style="background-image:url('${Engine.assetUrl(member.stand)}')"></div>`
      : `<div class="cutin-face" style="background:${member.color}">${member.id}</div>`;
    panel.innerHTML = `
      ${visual}
      <div class="cutin-name">${member.name}</div>
      <div class="cutin-game">「${def.title || member.game}」</div>
      <div class="cutin-rule">${rule}</div>`;
    Engine.sound('reach');
    Engine.shake();
    await Engine.sleep((C.cutin && C.cutin.durationMs) || 5000);
  }

  // ---------- 裏ステージ突入演出 ----------
  async function uraIntro() {
    const s = Engine.setScene('sc-ura-intro');
    Engine.setDebug('scene', 'ura-intro');
    // 暗転 → 心音 → ストロボ → 「裏ステージ」
    await Engine.sleep(600);
    Engine.sound('tick'); await Engine.sleep(500);
    Engine.sound('tick'); await Engine.sleep(400);
    Engine.flash('#fff', 90);
    Engine.sound('go');
    const q = Engine.el(s, 'burst', '……!?');
    await Engine.sleep(900);
    q.remove();
    Engine.flash('#ff1744', 180);
    Engine.shake();
    const w = Engine.el(s, 'ura-warning');
    const file = (C.images || {}).uraWarning;
    if (file) Engine.setImage(w, file, 'contain', 'center');
    else w.innerHTML = '<div class="uw-main">裏ステージ</div><div class="uw-sub">SECRET STAGE</div>';
    Engine.sound('uraReach');
    Engine.confetti(60);
    await Engine.sleep(2200);
  }

  // ---------- チェーン間の等級表示(短) ----------
  async function tierSplash(tier, creditsLeft) {
    const s = Engine.setScene('sc-splash');
    const t = C.tiers[tier] || {};
    const b = Engine.el(s, 'burst', (t.name || '') + ' 確定!');
    b.style.color = t.color || '#fff';
    Engine.el(s, 'splash-credits', '●'.repeat(creditsLeft));
    Engine.sound(tier <= 1 ? 'bigwin' : tier <= 2 ? 'win' : 'good');
    if (tier <= 2) Engine.confetti(100);
    await Engine.sleep(1600);
  }

  // ---------- 最終結果(そのプレイで最も良かった等級) ----------
  async function finalResult(best) {
    const s = Engine.setScene('sc-result');
    s.classList.add('halftone');
    if (best >= 4) s.classList.add('rank-low');
    Engine.sceneBg(s, best >= 4 ? 'bgResultLow' : 'bgResult');
    Engine.setDebug('scene', 'result tier=' + best);
    Engine.sound('bgmResult');

    const t = C.tiers[best] || {};
    const nameEl = Engine.el(s, 'result-rank', t.name || '');
    nameEl.style.color = t.color || '#fff';
    Engine.el(s, 'result-prize', '賞品: ' + (t.prize || ''));

    if (best === 0) { Engine.sound('bigwin'); Engine.confetti(500); Engine.shake(); }
    else if (best <= 1) { Engine.sound('bigwin'); Engine.confetti(300); Engine.shake(); }
    else if (best <= 2) { Engine.sound('win'); Engine.confetti(150); }
    else if (best <= 3) { Engine.sound('good'); }
    else { Engine.sound('lose'); }

    await Promise.race([Engine.Input.waitPress(), Engine.sleep(8000)]);
    Engine.stopBgm();
    attract();
  }

  // ---------- 起動 ----------
  let started = false;
  function boot() { if (started) return; started = true; attract(); }
  addEventListener('DOMContentLoaded', boot);
  if (document.readyState !== 'loading') boot();
})();
