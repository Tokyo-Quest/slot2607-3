// ============================================================
// ジャスト・ビート(葵/リズム・実力判定)bpm120
// カウント 3・2・1 → 「ジャスト」の1拍でボタンを1回だけ。
// スピーカー・キャラがbpmに合わせて跳ねる。
// 踊り差分は config.minigames.beat.danceFrames に追加するだけ。
// ============================================================
MiniGames.register('beat', {
  title: 'ジャスト・ビート',

  async run(ctx) {
    const cfg = ctx.cfg;
    const IMG = cfg.images || {};
    let perfect = cfg.perfectMs, good = cfg.goodMs;
    if (ctx.bias === 'easy') { perfect = 400; good = 900; }
    if (ctx.bias === 'hard') { perfect = 5; good = 20; }

    const s = ctx.root;
    const member = CONFIG.members.find(m => m.game === 'beat') || CONFIG.members[1];
    if (IMG.bg) Engine.setImage(s, IMG.bg, 'cover');
    Engine.el(s, 'mg-title', 'ジャスト・ビート');
    Engine.el(s, 'mg-instr', 'ジャストで押せ!');

    const bpm = cfg.bpm || 120;
    const beat = 60000 / bpm;
    const beatSec = (beat / 1000).toFixed(3) + 's';

    // bpmに合わせて跳ねる要素(--beat で周期指定)
    const bounce = elm => { elm.style.setProperty('--beat', beatSec); elm.classList.add('bpm-bounce'); };

    // スピーカー(左右)
    if (IMG.speakerL) { const sp = Engine.el(s, 'beat-speaker left');  Engine.setImage(sp, IMG.speakerL, 'contain', 'center bottom'); bounce(sp); }
    if (IMG.speakerR) { const sp = Engine.el(s, 'beat-speaker right'); Engine.setImage(sp, IMG.speakerR, 'contain', 'center bottom'); bounce(sp); }
    // 中央スピーカー(テンポに合わせて振動)
    if (IMG.speakerC) {
      const sp = Engine.el(s, 'beat-speaker center');
      Engine.setImage(sp, IMG.speakerC, 'contain', 'center bottom');
      sp.style.setProperty('--beat', beatSec);
    }

    // 踊るキャラ(コマ送り=1拍ごと+跳ね)
    // 位置決めtransformと競合しないよう、跳ねは内側要素に付ける
    const dancer = Engine.el(s, 'beat-dancer');
    const dancerIn = Engine.el(dancer, 'bounce-inner');
    const frames = (cfg.danceFrames && cfg.danceFrames.length) ? cfg.danceFrames : [member.stand];
    Engine.animate(dancerIn, frames, beat, 'contain', 'center bottom');
    bounce(dancerIn);

    // レーン・判定リング・ノーツ
    const lane = Engine.el(s, 'beat-lane');
    const ring = Engine.el(lane, 'beat-ring');
    if (IMG.ring) {
      ring.classList.add('img');
      const ringIn = Engine.el(ring, 'bounce-inner');
      Engine.setImage(ringIn, IMG.ring, 'contain', 'center');
      ringIn.style.backgroundPosition = 'center';
      bounce(ringIn);
    }
    const laneW = 1512; // レーン長(左右204px余白)
    const note = Engine.el(lane, 'beat-note', IMG.note ? '' : '♪');
    if (IMG.note) { Engine.setImage(note, IMG.note, 'contain', 'center'); note.classList.add('img'); }
    else note.style.background = member.color;
    note.style.left = laneW + 'px'; // 開始状態から右端に配置

    await Engine.sleep(900);

    const t0 = performance.now() + 400;
    const offsetMs = 100;
    const target = t0 + 7 * beat + offsetMs; // ← 8拍目がジャストになるよう変更

    // ← 追加した音声素材を音楽開始タイミング(t0)に合わせて再生
    setTimeout(() => Engine.sound('beatBgm'), t0 - performance.now());



    // ノーツが右→左に流れ、target ちょうどで左端のリング中心に到達
    let rafOn = true;
    (function move() {
      if (!rafOn) return;
      const p = Math.min(1, Math.max(0, (performance.now() - t0) / (target - t0)));
      note.style.left = ((1 - p) * laneW) + 'px';
      requestAnimationFrame(move);
    })();

    const result = await new Promise(res => {
      let done = false;
      const finish = v => { if (done) return; done = true; rafOn = false; Engine.Input.offPress(onPress); res(v); };
      const onPress = t => {
        const dt = t - target; // 負=はやい / 正=おそい
        const ad = Math.abs(dt);
        if (dt < -good) finish({ level: 'miss', dt: Math.round(dt), label: 'はやい!' });
        else finish({
          level: ad <= perfect ? 'perfect' : ad <= good ? 'good' : 'miss',
          dt: Math.round(dt),
          label: ad <= perfect ? 'PERFECT!!' : ad <= good ? 'GOOD!' : 'おそい...',
        });
      };
      Engine.Input.onPress(onPress);
      setTimeout(() => Engine.sound('go'), target - performance.now());
      setTimeout(() => finish({ level: 'fail', dt: null, label: '押しそびれた...' }), target - performance.now() + 600);
    });

    // 結果演出
    if (result.level === 'perfect') { Engine.flash('#fff', 150); Engine.shake(); Engine.sound('perfect'); }
    else if (result.level === 'good') Engine.sound('good');
    else Engine.sound('miss');
    const b = Engine.el(s, 'burst', result.label);
    if (result.level === 'miss' || result.level === 'fail') b.style.color = '#b0bec5';
    await Engine.sleep(1800);
    return result;
  },
});
