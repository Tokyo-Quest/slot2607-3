// ============================================================
// ときめきトーク(明媚/恋愛シム風・確率判定)
// 明媚のセリフが1文字ずつ表示 → 返事の選択肢ルーレットをボタンで停止。
// 見た目は実力ゲームだが、内部は設定確率で結果が決まる。
// ============================================================
MiniGames.register('tokimeki', {
  title: 'ときめきトーク',

  async run(ctx) {
    const cfg = ctx.cfg;
    const IMG = cfg.images || {};
    const sc = cfg.scenario || { speaker: '?', prompt: '?', replyLabel: 'あなた', choices: ['A', 'B', 'C'], correct: 0 };
    const s = ctx.root;
    const member = CONFIG.members.find(m => m.game === 'tokimeki') || CONFIG.members[0];

    if (IMG.bg) Engine.setImage(s, IMG.bg, 'cover'); // 背景画像(なければCSSの仮背景)

    Engine.el(s, 'mg-title', 'ときめきトーク');

    // 中央キャラクター
    const chara = Engine.el(s, 'toki-char');
    if (IMG.talk) {
      Engine.setImage(chara, IMG.talk, 'contain', 'center bottom');
    } else {
      chara.classList.add('plain');
      chara.textContent = member.id;
      chara.style.background = member.color;
    }

    // メッセージウインドウ(底部中央/紺地・白文字・濃い青の縁取り)
    const win = Engine.el(s, 'toki-window');
    const speakerTag = Engine.el(win, 'toki-speaker', sc.speaker || member.name);
    const textEl = Engine.el(win, 'toki-text', '');
    const choicesEl = Engine.el(win, 'toki-choices');

    // 1文字ずつ表示
    async function typeText(el, text, ms) {
      el.innerHTML = '<span class="caret">▏</span>';
      let shown = '';
      for (const ch of text) {
        shown += ch;
        el.innerHTML = shown + '<span class="caret">▏</span>';
        Engine.sound('type');
        await Engine.sleep(ms);
      }
      el.innerHTML = shown;
    }
    await Engine.sleep(600);
    await typeText(textEl, `「${sc.prompt}」`, cfg.typeMs || 60);
    await Engine.sleep(2000); // 最初のセリフの表示時間

    // 返事フェーズ: 話者を「あなた」に切替、選択肢を表示
    speakerTag.textContent = sc.replyLabel || 'あなた';
    speakerTag.classList.add('you');
    textEl.textContent = 'そうだな...';
    const choiceEls = sc.choices.map(c => Engine.el(choicesEl, 'toki-choice', c));
    await Engine.sleep(400);

    // 内部抽選(確率判定/隠しキーで上書き)
    let success;
    if (ctx.bias === 'easy') success = true;
    else if (ctx.bias === 'hard' || ctx.bias === 'forceLose') success = false;
    else success = Math.random() < (cfg.successRate ?? 0.5);

    const correct = sc.correct ?? 0;
    let landing = correct;
    if (!success) {
      do { landing = Engine.randInt(sc.choices.length); } while (landing === correct);
    }

    // 高速ルーレット → 押されたら減速して landing に着地
    let idx = 0, spinning = true;
    const setSel = i => choiceEls.forEach((el, j) => el.classList.toggle('sel', i === j));
    setSel(0);
    const spinner = setInterval(() => {
      if (!spinning) return;
      idx = (idx + 1) % sc.choices.length;
      setSel(idx);
      Engine.sound('tick');
    }, cfg.spinInterval || 90);

    await Promise.race([Engine.Input.waitPress(), Engine.sleep(8000)]);
    Engine.sound('button');
    spinning = false;
    clearInterval(spinner);

    // 減速演出:数ステップ進んで landing で止まる(スキル感の演出)
    const len = sc.choices.length;
    let steps = len + (((landing - idx) % len) + len) % len;
    for (let k = 1; k <= steps; k++) {
      await Engine.sleep(120 + k * 70);
      idx = (idx + 1) % len;
      setSel(idx);
      Engine.sound('tick');
    }
    await Engine.sleep(600);

    // 返事を確定表示
    speakerTag.textContent = sc.replyLabel || 'あなた';
    textEl.textContent = `「${sc.choices[landing]}」`;
    choicesEl.innerHTML = '';
    await Engine.sleep(700);

    // 結果演出(キャラ差分: 照れ/残念)
    if (success) {
      if (IMG.blush) Engine.setImage(chara, IMG.blush, 'contain', 'center bottom');
      Engine.flash('#fff', 150);
      Engine.sound('perfect');
      for (let i = 0; i < 6; i++) {
        const h = Engine.el(s, 'heart-burst', '💗');
        h.style.left = (560 + Math.random() * 800) + 'px';
        h.style.top = (140 + Math.random() * 420) + 'px';
        h.style.animationDelay = (i * 0.1) + 's';
      }
      speakerTag.textContent = sc.speaker || member.name;
      speakerTag.classList.remove('you');
      textEl.textContent = '「......っ!(照れ)」';
      Engine.el(s, 'burst', 'ときめいた...!💗');
      Engine.confetti(80);
    } else {
      if (IMG.sad) Engine.setImage(chara, IMG.sad, 'contain', 'center bottom');
      else chara.style.filter = 'grayscale(.8)';
      Engine.sound('miss');
      speakerTag.textContent = sc.speaker || member.name;
      speakerTag.classList.remove('you');
      textEl.textContent = '「......そっか」';
      const b = Engine.el(s, 'burst', 'ズコー!!');
      b.style.color = '#b0bec5';
    }
    await Engine.sleep(2000);
    return { level: success ? 'perfect' : 'miss' };
  },
});
