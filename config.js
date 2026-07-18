// ============================================================
// MID POP ワンボタン・パニック! prototype2 設定ファイル
// ステージ構成: スロット → ミニゲーム → 裏ステージ の3段階
// ここの数値を書き換えて保存 → ブラウザを再読み込みで反映されます
// ============================================================
window.CONFIG = {

  // ---------- プレイ ----------
  play: {
    credits: 5,            // 1プレイのチャレンジ回数(スロットを回せる回数)
  },

  // ---------- メンバー ----------
  members: [
    { id: 'A', name: '明媚',   color: '#C8102E', game: 'tokimeki',
      face: 'face_meibi.png',    stand: 'stand_meibi.png',    standKime: 'stand_meibi_kime.png',
      anim: ['stand_meibi.png', 'stand_meibi_kime.png'] },
    { id: 'B', name: '葵',     color: '#5110b3', game: 'beat',
      face: 'face_aoi.png',      stand: 'stand_aoi.png',      standKime: 'stand_aoi_kime.png',
      anim: ['stand_aoi.png', 'stand_aoi_kime.png'] },
    { id: 'C', name: '蕎麦',   color: '#ffff00', game: 'issen',
      face: 'face_soba.png',     stand: 'stand_soba.png',     standKime: 'stand_soba_kime.png',
      anim: ['stand_soba.png', 'stand_soba_kime.png'] },
    { id: 'D', name: '溺惑',   color: '#98fafa', game: 'charge',
      face: 'face_dekiwaku.png', stand: 'stand_dekiwaku.png', standKime: 'stand_dekiwaku_kime.png',
      anim: ['stand_dekiwaku.png', 'stand_dekiwaku_kime.png'] },
  ],
  anims: { intervalMs: 600 },

  // ---------- 画像素材(共通) ----------
  images: {
    dir: 'assets/images/',
    bgAttract:   'bg_attract.png',
    bgSlot:      'bg_slot.png',
    bgCutin:     'bg_cutin.png',
    bgResult:    'bg_result.png',
    bgResultLow: 'bg_result_low.png',
    frameSlot:   'frame_slot.png',
    badgePrice:  'badge_price.png',
    guidePush:   'guide_push.png',
    uraWarning:  null,   // 裏ステージ突入演出用(未作成: CSS演出で代用)
  },

  // ---------- スロット(第1段階) ----------
  slot: {
    winRate: 0.05,         // 3つ揃い(ミニゲーム進出)の確率 = 5%
    reachTeaseRate: 0.35,  // ハズレ時にリーチ(2つ揃い)まで見せる確率
    spinSpeed: 42,
    memberWeights: [1, 1, 1, 1], // 揃ったとき誰のゲームになるかの重み
  },

  // ---------- 裏ステージ(第3段階/my-slot-app由来) ----------
  ura: {
    winRate: 0.30,         // 通常目(symbol_2〜5)が揃う確率 = 30% → 1等
    spWinRate: 0.0,        // 特別目(symbol_1)が揃う確率 = 0% → 特賞(当選しない)
    reachTeaseRate: 0.5,   // ハズレ時にリーチまで見せる確率
    spinSpeed: 34,
    symbols: ['symbol_1.png', 'symbol_2.png', 'symbol_3.png', 'symbol_4.png', 'symbol_5.png'],
    images: {
      bg:        'ura/bg_main.png',
      frame:     null,                   // frame_reelは不使用(リールを直接配置)
      textSpace: 'ura/text_space.png',   // PRESS SPACE KEY(上部タイトル)
      textReach: 'ura/text_reach.png',
      textWin:   'ura/text_win.png',
      textLose:  'ura/text_lose.png',
    },
  },

  // ---------- 賞品(等級) ----------
  // 0=特賞 / 1〜4=1等〜4等。到達ステージで決まる:
  //   スロット失敗=4等 / ミニゲーム失敗=3等 / 裏ハズレ=2等 / 裏通常揃い=1等 / 裏特別揃い=特賞
  tiers: {
    0: { name: '特賞', prize: '???(当選なし・展示用)', color: '#ff1744' },
    1: { name: '1等',  prize: 'サイン入りチェキ',       color: '#ffd54f' },
    2: { name: '2等',  prize: '限定ステッカー・缶バッジ', color: '#b39ddb' },
    3: { name: '3等',  prize: 'ランダムトレカ 1枚',     color: '#4fc3f7' },
    4: { name: '4等',  prize: '参加賞(ミニカード)',     color: '#b0bec5' },
  },

  // ミニゲームの判定レベル → 成功判定(perfect/good=成功)
  resultMap: { perfect: 4, good: 3, miss: 2, fail: 1 },

  // ---------- ミニゲーム開始告知(カットイン) ----------
  cutin: {
    durationMs: 5000,      // 表示時間(ルール説明を読める長さ)
  },

  // ---------- ミニゲーム難易度・素材 ----------
  // 成功率の目安は30%。実力系は判定幅で実質成功率を調整する
  minigames: {
    issen: {
      ruleText: 'Fight!!の合図で早押し勝負',
      minWait: 2000, maxWait: 6000,
      perfectMs: 250, goodMs: 300,   // good以内=成功(判定幅で成功率を調整)
      timeoutMs: 1500,
      images: {
        bg: 'bg_issen.png', fight: 'stand_soba_fight.png', win: 'stand_soba_win.png',
        lose: 'stand_soba_lose.png', foe: 'foe_issen.png', fx: 'fx_issen.png',
      },
    },
    beat: {
      ruleText: 'ジャストの1拍を 撃ちぬけ!!',
      bpm: 120,
      perfectMs: 10, goodMs: 24,   // 判定シビア(旧: 90/200)
      danceFrames: ['stand_aoi.png', 'stand_aoi_kime.png'],
      images: {
        bg: 'bg_beat.png', note: 'note_beat.png', ring: 'ring_beat.png',
        speakerL: 'left_speaker_beat.png', speakerR: 'right_speaker_beat.png',
        speakerC: 'speaker_beat.png',
      },
    },
    charge: {
      ruleText: 'ボタン長押しで、ぎりぎりまで削れ!!',
      duration: 2500,
      curve: 3.7,            // メーター加速カーブ(1=等速。大きいほど末端で速い)
      okStart: 0.90, justStart: 0.96, justEnd: 0.99,
      typeMs: 70,
      intro: [
        { speaker: '溺惑', text: '今日はどうされましたか?' },
        { speaker: '第3大臼歯',   text: '歯が痛くて...' },
      ],
      doctorScale: { doctorReady: 2.4, doctorWin: 2.2 },
      images: {
        bg: 'bg_charge.png',
        toothNormal: 'tooth_normal_alpha.png', toothCleaning: 'tooth_cleaning_alpha.png',
        toothClean: 'tooth_clean.png', toothBroken: 'tooth_broken.png',
        doctorStart: 'charge_dekiwaku.png', doctorReady: 'ready_dekiwaku.png',
        doctorTreat: 'treatment_dekiwaku.png', doctorWin: 'win_dekiwaku.png',
        doctorLose: 'lose_dekiwaku.png',
      },
    },
    tokimeki: {
      ruleText: 'ベストな返事で ときめかせろ!!',
      successRate: 0.30,     // 確率判定 = ミニゲーム成功率30%に合わせる
      spinInterval: 90, typeMs: 60,
      scenario: {
        speaker: '明媚', prompt: '今日のライブ、どうだったかな...?', replyLabel: 'あなた',
        choices: ['最高だったよ!!', 'まあまあかな', '見てなかった'], correct: 0,
      },
      images: {
        bg: 'bg_tokimeki.png', talk: 'stand_meibi_talk.png',
        blush: 'stand_meibi_blush.png', sad: 'stand_meibi_sad.png',
      },
    },
  },

  // ---------- サウンド ----------
  // file にパスを入れると差し替え。null は内蔵シンセ音
  // 裏ステージは my-slot-app の音源を使用
  sounds: {
    button:  { file: null, volume: 1 },
    stop:    { file: null, volume: 1 },
    reach:   { file: null, volume: 1 },
    win:     { file: null, volume: 1 },
    bigwin:  { file: null, volume: 1 },
    lose:    { file: null, volume: 1 },
    tick:    { file: null, volume: 1 },
    go:      { file: null, volume: 1 },
    perfect: { file: null, volume: 1 },
    good:    { file: null, volume: 1 },
    miss:    { file: null, volume: 1 },
    charge:  { file: null, volume: 1 },
    type:    { file: null, volume: 1 },
    beatBgm: { file: 'assets/sounds/beat_music.mp3', volume: 1 },
    // 裏ステージ用(実音源)
    uraStart: { file: 'assets/sounds/ura/se_start.mp3',       volume: 1 },
    uraStop:  { file: 'assets/sounds/ura/se_stop.mp3',        volume: 1 },
    uraReach: { file: 'assets/sounds/ura/se_reach_start.mp3', volume: 1 },
    uraWin:   { file: 'assets/sounds/ura/se_win_1.mp3',       volume: 1 },
    uraLose:  { file: 'assets/sounds/ura/se_lose.mp3',        volume: 1 },
    bgmUra:   { file: 'assets/sounds/ura/bgm_spin.mp3',       volume: 0.6, loop: true },
    // BGM(未指定)
    bgmAttract: { file: null, volume: 0.6, loop: true },
    bgmSlot:    { file: null, volume: 0.6, loop: true },
    bgmResult:  { file: null, volume: 0.6, loop: true },
  },

  // ---------- レイアウト微調整 ----------
  layout: {
    title:     { x: 960, y: 180, scale: 1.25 },
    pushGuide: { x: 960, y: 950, scale: 1 },
    lineup:    { x: 960, y: 620, scale: 1 },
    slotFrame: { x: 960, y: 550, scale: 0.97 },
    slotSideL: { x: 180, y: 700, scale: 1 },
    slotSideR: { x: 1740, y: 700, scale: 1 },
    creditCounter: { x: 190, y: 80, scale: 1 },  // 残チャレンジ表示(スロット隅)
    reels: {
      centers: [
        { x: 445,  y: 341 },
        { x: 744,  y: 337 },
        { x: 1058, y: 342 },
      ],
      width: 230, height: 260,
    },
    // 裏ステージのリール(指定範囲 縦600〜1020 / 横463〜1455 にバランス配置)
    uraPanel: { x: 960, y: 810, scale: 1 },      // 装飾パネル(現在未使用)
    uraReels: {
      centers: [
        { x: 628,  y: 810 },
        { x: 959,  y: 810 },
        { x: 1290, y: 810 },
      ],
      width: 300, height: 380,
    },
  },

  // ---------- デバッグ ----------
  debug: false,
};
