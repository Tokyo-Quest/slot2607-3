// ============================================================
// フルパワーチャージ(溺惑/歯医者・ゲージ・実力判定)
// 掛け合い → ボタン長押しでドリル治療 → JUSTゾーンで離す。
// 満タンまで行くと削りすぎで暴発!
// 溺惑差分: charge(開始)/ready(ドリル)/treatment(治療中)/win/lose
// 歯差分: normal/cleaning(治療中)/clean(成功)/broken(失敗)
// ============================================================
MiniGames.register('charge', {
  title: '歯科治療',

  async run(ctx) {
    const cfg = ctx.cfg;
    const IMG = cfg.images || {};
    let okStart = cfg.okStart, justStart = cfg.justStart, justEnd = cfg.justEnd;
    if (ctx.bias === 'easy') { okStart = 0.15; justStart = 0.35; justEnd = 0.97; }
    if (ctx.bias === 'hard') { okStart = 0.86; justStart = 0.879; justEnd = 0.881; }

    const s = ctx.root;
    const member = CONFIG.members.find(m => m.game === 'charge') || CONFIG.members[3];
    if (IMG.bg) Engine.setImage(s, IMG.bg, 'cover');
    Engine.el(s, 'mg-title', '歯科治療');

    // ---- 溺惑(左)と歯(右) ----
    // 素材ごとの見かけサイズ差は cfg.doctorScale で補正(例: ready差分は小さいので拡大)
    const doctor = Engine.el(s, 'charge-doctor');
    const doctorIn = Engine.el(doctor, 'fit-inner');
    const setDoctor = key => {
      if (!IMG[key]) return;
      Engine.setImage(doctorIn, IMG[key], 'contain', 'center bottom');
      const sc = (cfg.doctorScale || {})[key] || 1;
      doctorIn.style.transformOrigin = 'center bottom';
      doctorIn.style.transform = `scale(${sc})`;
    };
    const tooth = Engine.el(s, 'charge-tooth');
    const setTooth = key => { if (IMG[key]) Engine.setImage(tooth, IMG[key], 'contain', 'center'); };
    let target = null;
    if (IMG.doctorStart) setDoctor('doctorStart');
    else { doctor.remove(); }
    if (IMG.toothNormal) setTooth('toothNormal');
    else {
      tooth.remove();
      target = Engine.el(s, 'charge-target', member.face ? '' : member.id);
      target.style.background = member.color;
      if (member.face) { Engine.setImage(target, member.face, 'cover', 'center top'); target.classList.add('face'); }
    }

    // ---- 掛け合い(1文字ずつ表示) ----
    const bubble = Engine.el(s, 'talk-bubble');
    const nameTag = Engine.el(bubble, 'talk-name', '');
    const talkText = Engine.el(bubble, 'talk-text', '');
    // 誰のセリフか分かる演出:
    //   吹き出しが話者側に寄り、しっぽが話者を指す/話者以外は暗くなる/話者は揺れる
    async function say(speaker, text) {
      const isDoctor = speaker !== '第3大臼歯';
      bubble.classList.toggle('from-left', isDoctor);
      bubble.classList.toggle('from-right', !isDoctor);
      nameTag.textContent = speaker;
      if (isDoctor) {
        nameTag.style.background = member.color;
        nameTag.style.color = '#111';     // 溺惑の背景が薄いため文字は黒
        nameTag.style.border = 'none';    // 枠線なし
      } else {
        nameTag.style.background = '#fff'; // 歯の背景は白
        nameTag.style.color = '#111';      // 文字は黒
        nameTag.style.border = '3px solid #111'; // 黒い枠線を追加して囲みっぽくする
      }
      // 話者を強調(相手は暗く)
      doctor.style.filter = isDoctor ? '' : 'brightness(.5)';
      tooth.style.filter = isDoctor ? 'brightness(.5)' : '';
      doctor.classList.toggle('speaking', isDoctor);
      tooth.classList.toggle('speaking', !isDoctor);
      talkText.innerHTML = '';
      let shown = '';
      for (const ch of text) {
        shown += ch;
        talkText.textContent = shown;
        Engine.sound('type');
        await Engine.sleep(cfg.typeMs || 70);
      }
      await Engine.sleep(900); // セリフ間の間(テンポ遅め)
    }
    await Engine.sleep(500);
    const intro = cfg.intro || [];
    for (let i = 0; i < intro.length; i++) {
      await say(intro[i].speaker, intro[i].text);
    }
    bubble.remove();
    // 会話演出をリセット
    doctor.style.filter = '';
    tooth.style.filter = '';
    doctor.classList.remove('speaking');
    tooth.classList.remove('speaking');
    // 会話終了 → いったん左へはけて、ドリルを持って左から再登場
    if (IMG.doctorReady) {
      doctor.style.transition = 'transform .45s ease-in';
      doctor.style.transform = 'translate(-350%, -50%)';  // 左へ出ていく
      await Engine.sleep(480);
      setDoctor('doctorReady');                            // 画面外でドリルに持ち替え
      doctor.style.transition = 'transform .45s ease-out';
      doctor.style.transform = 'translate(-50%, -50%)';    // 左から現れる
      Engine.sound('tick');
      await Engine.sleep(600);
    }

    // ---- ゲージ ----
    const instr = Engine.el(s, 'mg-instr', '長押し→ゾーンで離せ!');
    const bar = Engine.el(s, 'charge-bar');
    const okZone = Engine.el(bar, 'charge-zone');
    okZone.style.left = (okStart * 100) + '%';
    okZone.style.width = (Math.max(0, justStart - okStart) * 100) + '%';
    okZone.style.background = 'rgba(255,213,79,.8)';
    const justZone = Engine.el(bar, 'charge-zone');
    justZone.style.left = (justStart * 100) + '%';
    justZone.style.width = ((justEnd - justStart) * 100) + '%';
    justZone.style.background = 'rgba(255,95,162,.55)';
    const justLabel = Engine.el(bar, 'charge-label', 'JUST!');
    justLabel.style.left = ((justStart + justEnd) / 2 * 100) + '%';
    const fill = Engine.el(bar, 'charge-fill');

    // ---- 長押し開始を待つ → 治療中 ----
    await Engine.Input.waitPress();
    Engine.sound('charge');
    instr.textContent = 'ウィイイイン......!!';
    if (IMG.doctorTreat) setDoctor('doctorTreat');
    if (IMG.toothCleaning) { setTooth('toothCleaning'); tooth.classList.add('treating'); }
    const start = performance.now();
    let rafOn = true;
    let p = 0;

    const chargeLoop = setInterval(() => { if (rafOn) Engine.sound('charge'); }, 500);
    (function grow() {
      if (!rafOn) return;
      // 末端に近づくほど速く進む(curve>1で加速)
      const u = Math.min(1, (performance.now() - start) / cfg.duration);
      p = Math.pow(u, cfg.curve || 1);
      fill.style.width = (p * 100) + '%';
      if (target) target.style.transform = `translate(-50%,-50%) scale(${1 + p * 0.35})`;
      requestAnimationFrame(grow);
    })();

    const result = await new Promise(res => {
      let done = false;
      const finish = v => {
        if (done) return; done = true;
        rafOn = false; clearInterval(chargeLoop);
        Engine.Input.offRelease(onRelease);
        res(v);
      };
      const onRelease = () => {
        if (p >= justStart && p <= justEnd) finish({ level: 'perfect', p, label: 'ピッカピカ!!' });
        else if (p >= okStart && p < justStart) finish({ level: 'good', p, label: 'まずまずの仕上がり!' });
        else if (p > justEnd) finish({ level: 'miss', p, label: '削りすぎ!!' });
        else finish({ level: 'miss', p, label: '削り足りない...' });
      };
      Engine.Input.onRelease(onRelease);
      // 満タン到達=暴発
      const guard = setInterval(() => {
        if (done) { clearInterval(guard); return; }
        if (p >= 1) { clearInterval(guard); finish({ level: 'fail', p: 1, label: 'ガリガリガリ!! 削りすぎだ!!' }); }
      }, 16);
    });

    // ---- 結果演出(歯+溺惑の差分切替) ----
    tooth.classList.remove('treating');
    if (result.level === 'perfect' || result.level === 'good') {
      if (IMG.toothClean) setTooth('toothClean');
      if (IMG.doctorWin) setDoctor('doctorWin');
      Engine.flash('#fff', 160);
      if (result.level === 'perfect') { Engine.shake(); Engine.sound('perfect'); Engine.confetti(80); }
      else Engine.sound('good');
    } else if (result.level === 'fail' || result.p > justEnd) {
      if (IMG.toothBroken) setTooth('toothBroken');
      if (IMG.doctorLose) setDoctor('doctorLose');
      Engine.flash('#ff5252', 250);
      Engine.shake();
      Engine.sound('miss');
    } else {
      // みがき足りない(歯はそのまま)
      if (IMG.doctorLose) setDoctor('doctorLose');
      Engine.sound('miss');
    }
    // 結果テキストは上部に表示(歯の素材と重ならないように)
    const b = Engine.el(s, 'burst', result.label);
    b.style.top = '20%';
    if (result.level === 'miss' || result.level === 'fail') b.style.color = '#ffab91';
    await Engine.sleep(3000); // 結果表示(+1秒)
    return result;
  },
});
