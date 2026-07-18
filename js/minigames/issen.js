// ============================================================
// 一閃カウンター(蕎麦/格闘ゲーム・反射神経・実力判定)
// 「Ready...」→ 待機 → 「Fight!!」の瞬間にボタン。反応速度で判定。
// 決着時にどちらかのHPバーが減る。
// キャラ差分: 構え(fight) / パンチ(win) / やられ(lose)
// ============================================================
MiniGames.register('issen', {
  title: '一閃カウンター',

  async run(ctx) {
    const cfg = ctx.cfg;
    const IMG = cfg.images || {};
    let perfect = cfg.perfectMs, good = cfg.goodMs;
    if (ctx.bias === 'easy') { perfect = 1000; good = 5000; }   // 隠しキー補正(甘)
    if (ctx.bias === 'hard') { perfect = 5; good = 40; }        // 隠しキー補正(辛)

    const s = ctx.root;
    const member = CONFIG.members.find(m => m.game === 'issen') || CONFIG.members[2];
    if (IMG.bg) Engine.setImage(s, IMG.bg, 'cover');
    Engine.el(s, 'mg-title', '一閃カウンター');

    // ---- HPバー(上部2本) ----
    const hpRow = Engine.el(s, 'hp-row');
    const mkHp = (name, foeSide) => {
      const block = Engine.el(hpRow, 'hp-block' + (foeSide ? ' foe-side' : ''));
      Engine.el(block, 'hp-name', name);
      const bar = Engine.el(block, 'hp-bar');
      const fill = Engine.el(bar, 'hp-fill');
      return fill;
    };
    const myHp = mkHp(member.name, false);
    const foeHp = mkHp('???', true);

    // ---- ファイター ----
    const fighters = Engine.el(s, 'issen-fighters');
    const me = Engine.el(fighters, 'fighter me');
    const setPose = pose => {   // 'fight' | 'win' | 'lose'
      const file = IMG[pose];
      if (file) Engine.setImage(me, file, 'contain', 'center bottom');
    };
    if (IMG.fight) setPose('fight');
    else { me.classList.add('plain'); me.textContent = member.id; me.style.background = member.color; }

    const foe = Engine.el(fighters, 'fighter');
    if (IMG.foe) { Engine.setImage(foe, IMG.foe, 'contain', 'center bottom'); foe.classList.add('foe-img'); }
    else { foe.classList.add('plain'); foe.textContent = '?'; foe.style.background = '#37474f'; }

    const instr = Engine.el(s, 'mg-instr', 'Fight!! で押せ!');

    // ---- Ready... → ランダム待機 → Fight!! ----
    await Engine.sleep(1000);
    const ready = Engine.el(s, 'issen-ready blink', 'Ready...');
    Engine.sound('tick');

    const delay = Engine.rand(cfg.minWait, cfg.maxWait);
    const result = await new Promise(res => {
      let signaled = false, signalT = 0, done = false;
      const finish = v => { if (done) return; done = true; Engine.Input.offPress(onPress); res(v); };
      const onPress = t => {
        if (!signaled) finish({ level: 'fail', label: 'お手つき!!' });
        else {
          const ms = Math.round(t - signalT);
          finish({
            level: ms <= perfect ? 'perfect' : ms <= good ? 'good' : 'miss',
            ms,
            label: ms <= perfect ? 'K.O.!!' : ms <= good ? 'HIT!' : 'おそい...!',
          });
        }
      };
      Engine.Input.onPress(onPress);
      setTimeout(() => {
        if (done) return;
        signaled = true;
        signalT = performance.now();
        ready.remove();
        Engine.flash('#fff', 120);
        Engine.sound('go');
        Engine.el(s, 'issen-signal', 'Fight!!');
        setTimeout(() => finish({ level: 'fail', label: 'うごけなかった...' }), cfg.timeoutMs || 1500);
      }, delay);
    });

    // ---- 決着演出(ポーズ切替+HPバー減少) ----
    instr.textContent = '';
    const win = result.level === 'perfect' || result.level === 'good';
    if (win) {
      setPose('win');
      // 勝者(自分)が踏み込んで戻る → 敗者(敵)がぶるぶる震える
      me.classList.add('lunge');
      setTimeout(() => me.classList.remove('lunge'), 600);
      setTimeout(() => foe.classList.add(IMG.foe ? 'foe-tremble' : 'tremble'), 350);
      if (IMG.fx) {
        const fx = Engine.el(s, 'issen-fx');
        Engine.setImage(fx, IMG.fx, 'contain', 'center');
        fx.style.left = '58%'; fx.style.top = '34%';
      } else {
        Engine.el(s, 'zubam', 'ZUBAM!!');
      }
      Engine.flash('#ffd54f', 160);
      Engine.shake();
      Engine.sound(result.level);
      foe.style.filter = 'grayscale(.7) brightness(.7)';
      // 敵のHPが減る(perfect=ゼロ / good=わずかに残る)
      await Engine.sleep(300);
      foeHp.style.width = result.level === 'perfect' ? '0%' : '12%';
      const b = Engine.el(s, 'burst', result.label);
      b.style.top = '30%';
    } else {
      setPose('lose');
      // 勝者(敵)が踏み込んで戻る → 敗者(自分)がぶるぶる震える
      foe.classList.add(IMG.foe ? 'foe-lunge' : 'lunge');
      setTimeout(() => foe.classList.remove(IMG.foe ? 'foe-lunge' : 'lunge'), 600);
      setTimeout(() => me.classList.add('tremble'), 350);
      Engine.sound('miss');
      // 自分のHPが減る
      await Engine.sleep(300);
      myHp.style.width = '0%';
      const b = Engine.el(s, 'burst', result.label);
      b.style.color = '#b0bec5';
      b.style.top = '30%';
    }
    await Engine.sleep(2000);
    return result;
  },
});
