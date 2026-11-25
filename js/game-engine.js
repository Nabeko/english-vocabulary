/* 守城戰鬥引擎（todo 4）
   玩法參考原站 lexilereadingrex.github.io（守城塔防＋單字選擇題），
   美術改用簡化幾何圖形（圓形/矩形）繪製，不沿用原站美術素材。

   使用方式：
     window.GameEngine.start(container, { words, title, onExit })
   words: 該關要考的單字陣列（每個 unit 的 words，或抽選後的子集）
   onExit: 使用者按「撤退」或戰鬥結束按「返回」時呼叫
*/
window.GameEngine = (function(){

  const MAX_HP = 5;        // 城牆耐久
  const COMBO_N = 3;       // 連續答對幾題觸發「連擊加速」特效
  const BOSS_WORDS = 3;    // 魔王身上帶幾個單字（蓄力幾次才能攻擊）
  // 戰場畫布邏輯尺寸：沿用原站 BattleArt 座標系，確保美術不跑版
  const Art = window.BattleArt;
  const W = Art.W, H = Art.H, GROUND = Art.GROUND, STOP_X = Art.STOP_X;
  const ARCHER_X = 132, ARCHER_Y = 100; // 弓箭手頭部大概位置（對齊 battle-art.js drawArcher 的 x,y-30 一帶），供蓄力光暈/集氣特效對齊
  const BASE_SPEED = 40;   // 一般敵人移動速度基準值（px/s），實際速度會依難度檔位縮放

  // 難度檔位：speedMul=整體移動速度倍率、runnerSpd=快跑鬼速度倍率、
  // spawnInterval=補怪間隔秒數、maxWalkers=場上同時最多幾隻在走、
  // runnerProb/shieldProb=出怪機率、bossSpdMul=魔王移動速度倍率
  const DIFFICULTY = {
    easy:   { label:'簡單', speedMul:0.5,  runnerSpd:1.05, spawnInterval:3.6, maxWalkers:2, runnerProb:0,    shieldProb:0.03, bossSpdMul:0.5 },
    normal: { label:'適中', speedMul:0.85, runnerSpd:1.4,  spawnInterval:2.6, maxWalkers:3, runnerProb:0.12, shieldProb:0.12, bossSpdMul:0.85 },
    hard:   { label:'困難', speedMul:1.1,  runnerSpd:1.6,  spawnInterval:2.1, maxWalkers:3, runnerProb:0.16, shieldProb:0.16, bossSpdMul:0.9 },
  };
  const DEFAULT_DIFFICULTY = 'normal';

  // 怪物種類：hp＝要答對幾次、spd＝速度倍率（runner/boss 實際值於 spawn 時依難度檔位覆寫）、dmg＝攻城扣幾點耐久、scale＝原站體型比例
  // 怪物顏色改依場景主題T.enemy[]調色盤動態指定（見spawn()），此處colorIdx只決定該種類取第幾色，
  // 不再用固定寫死色票，才能讓怪物配色隨17個場景變化而不同。
  const KINDS = {
    grunt:  { name:'小兵',   hp:1, spd:1,    dmg:1, colorIdx:0, scale:[.9,1.12] },
    runner: { name:'快跑鬼', hp:1, spd:1.6,  dmg:1, colorIdx:1, scale:[.76,.84] },
    shield: { name:'盾牌兵', hp:2, spd:0.75, dmg:1, colorIdx:2, scale:[1.08,1.16] },
    boss:   { name:'魔王',   hp:1, spd:0.5,  dmg:2, colorIdx:1, scale:[1.62,1.62] },
  };

  const TYPES = ['en2zh','zh2en','fill'];
  const TYPE_LABEL = { en2zh:'看英文，選中文', zh2en:'看中文，選英文', fill:'例句填空' };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const headWord = w => String(w).split('/')[0].trim();
  const blankRe = w => { try{ return new RegExp('\\b' + headWord(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b'); }catch(e){ return null; } };
  const canFill = x => !!(x.ex && blankRe(x.w) && blankRe(x.w).test(x.ex));
  function boldZhWord(exZh, zh, w){
    if(!exZh) return '';
    if(!zh) return esc(exZh);
    // zh 可能含多個以頓號/斜線/分號分隔的釋義，並夾雜（）附註，例如「表（堂）兄弟姊妹」
    // 參考 lexilereadingrex.github.io 的 zhMark 做法：除了切分釋義本身，
    // 還額外產生「去掉的/地結尾」「去掉感到/令人/有開頭」的變體，
    // 因為AI生成的例句翻譯常把zh釋義換句話說（語序調整、加減語助詞）
    const candidates = [];
    String(zh).split(/[、，,\/；;]/).forEach(part => {
      let c = part.trim().replace(/[（(][^）)]*[）)]/g, '').trim();
      if(!c) return;
      candidates.push(c);
      candidates.push(c.replace(/[的地]$/, ''));
      candidates.push(c.replace(/^(感到|令人|有)/, '').replace(/[的地]$/, ''));
    });
    let best = '';
    // 第一輪：候選字串整段原封不動出現在例句翻譯裡，取最長命中
    candidates.forEach(c => { if(c && exZh.includes(c) && c.length > best.length) best = c; });
    // 第二輪 fallback：候選字串內任意位置的最長公共子字串（優先至少2字），
    // 不要求從候選字串開頭算起，才能抓到語序被打散/插入語助詞後仍共通的詞
    if(!best){
      candidates.forEach(c => {
        for(let i = 0; i < c.length; i++){
          for(let j = c.length; j >= i + 2; j--){
            const sub = c.slice(i, j);
            if(sub.length > best.length && exZh.includes(sub)) best = sub;
          }
        }
      });
    }
    // 第三輪 fallback：候選字串本身只有1個中文字（如「桌子」裁掉助詞後剩「桌」這種基礎詞），
    // 放寬到允許1字命中，避免比舊版（允許前綴短至1字）倒退
    if(!best){
      candidates.forEach(c => {
        for(let i = 0; i < c.length; i++){
          for(let j = c.length; j >= i + 1; j--){
            const sub = c.slice(i, j);
            if(sub.length > best.length && exZh.includes(sub)) best = sub;
          }
        }
      });
    }
    // 第四輪 fallback：以上字串比對全部失敗，通常是因為例句翻譯用了跟 zh 不同的
    // 同義詞（如 grandmother zh='祖母' exZh 寫'奶奶'，兩者沒有共同子字串），
    // 查人工對照表 window.BOLD_ZH_OVERRIDES（data/bold-overrides.js）當最後手段
    if(!best && typeof window !== 'undefined' && window.BOLD_ZH_OVERRIDES && w){
      const override = window.BOLD_ZH_OVERRIDES[w + '|||' + exZh];
      if(override && exZh.includes(override)) best = override;
    }
    if(!best) return esc(exZh);
    const idx = exZh.indexOf(best);
    return esc(exZh.slice(0,idx)) + '<b>' + esc(exZh.slice(idx, idx+best.length)) + '</b>' + esc(exZh.slice(idx+best.length));
  }

  let muted = (function(){ try{ return localStorage.getItem('ev_muted_v1') === '1'; }catch(e){ return false; } })();
  function setMuted(v){
    muted = v;
    try{ localStorage.setItem('ev_muted_v1', v ? '1' : '0'); }catch(e){}
  }

  const canSpeak = 'speechSynthesis' in window;
  function speak(text){
    if(muted || !canSpeak || !text) return;
    try{
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(headWord(text));
      u.lang = 'en-US'; u.rate = 0.9;
      window.speechSynthesis.speak(u);
    }catch(e){}
  }

  // 簡易音效合成（免外部音檔），用 WebAudio 產生短促音效
  let actx = null;
  function ac(){
    if(!actx){ try{ actx = new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ return null; } }
    if(actx && actx.state === 'suspended') actx.resume().catch(()=>{});
    return actx;
  }
  function beep({freq=440, dur=0.12, type='sine', vol=0.2, slideTo=null, delay=0}={}){
    if(muted) return;
    const a = ac(); if(!a) return;
    const t0 = a.currentTime + delay;
    const osc = a.createOscillator(), gn = a.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, t0);
    if(slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1,slideTo), t0+dur);
    gn.gain.setValueAtTime(vol, t0);
    gn.gain.exponentialRampToValueAtTime(0.001, t0+dur);
    osc.connect(gn); gn.connect(a.destination);
    osc.start(t0); osc.stop(t0+dur+0.02);
  }
  function noiseThud(dur=0.25, vol=0.5){
    if(muted) return;
    const a = ac(); if(!a) return;
    const n = a.sampleRate*dur;
    const buf = a.createBuffer(1, n, a.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<n;i++) d[i] = (Math.random()*2-1) * Math.pow(1 - i/n, 2);
    const src = a.createBufferSource(); src.buffer = buf;
    const filt = a.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 220;
    const gn = a.createGain(); gn.gain.setValueAtTime(vol, a.currentTime);
    src.connect(filt); filt.connect(gn); gn.connect(a.destination);
    src.start();
  }
  const sfx = {
    correct(){ beep({freq:660,dur:.09,type:'triangle',vol:.22}); beep({freq:990,dur:.12,type:'triangle',vol:.18,delay:.07}); },
    wrong(){ beep({freq:260,dur:.18,type:'sawtooth',vol:.22,slideTo:120}); },
    breach(){ noiseThud(.3,.6); beep({freq:140,dur:.22,type:'square',vol:.25,slideTo:60}); },
    kill(){ beep({freq:520,dur:.1,type:'square',vol:.18,slideTo:900}); },
    win(){ [0,.12,.24].forEach((d,i)=>beep({freq:520+i*140,dur:.16,type:'triangle',vol:.22,delay:d})); },
    lose(){ beep({freq:300,dur:.4,type:'sawtooth',vol:.2,slideTo:80}); },
  };

  // 依單字清單決定每隻敵人的種類：第一隻一定是小兵（暖身），最後 BOSS_WORDS 個字合併給魔王
  function buildQueue(words, diff){
    const ws = shuffle(words);
    const withBoss = ws.length >= BOSS_WORDS + 3;
    const n = withBoss ? ws.length - BOSS_WORDS : ws.length;
    const q = [];
    for(let i=0;i<n;i++){
      let kind = 'grunt';
      if(i > 0){
        const r = Math.random();
        if(r < diff.runnerProb) kind = 'runner';
        else if(r < diff.runnerProb + diff.shieldProb) kind = 'shield';
      }
      if(kind === 'shield' && i+1 < n){ q.push({ kind:'shield', words:[ws[i], ws[i+1]] }); i++; }
      else q.push({ kind, words:[ws[i]] });
    }
    if(withBoss) q.push({ kind:'boss', words: ws.slice(n) });
    return q;
  }

  // 同義詞群組：這些字彼此是美式/英式用語差異或正式體/口語體差異，中文釋義寫法不同
  // （如grandfather zh='祖父/外公' vs grandpa zh='爺爺/外公（口語）'），自動去重邏輯比對不到，
  // 若同時出現在選擇題選項裡會造成語意模糊、無法判斷何者為「正確答案」。
  // 出題時：若干擾候選字跟正確答案同屬一組，直接排除，不當作干擾選項。
  const SYNONYM_GROUPS = [
    ['grandfather','grandpa'], ['grandmother','grandma'],
    ['mother','mum','mom'], ['father','dad'],
    ['flat','apartment'], ['trousers','pants'],
    ['phone','telephone'], ['television','tv','TV'],
    ['film','movie'], ['holiday','vacation'],
    ['autumn','fall'], ['fridge','refrigerator'],
    ['advert','advertisement'], ['OK','okay'], ['ok','okay'],
    ['sofa','couch'], ['cinema','movie theater'],
  ];
  const SYNONYM_OF = (() => {
    const map = new Map();
    SYNONYM_GROUPS.forEach(group => group.forEach(w => map.set(w.toLowerCase(), group)));
    return w => map.get(String(w).toLowerCase()) || null;
  })();
  const isSynonymPair = (a, b) => {
    const g = SYNONYM_OF(a);
    return !!(g && g.some(w => w.toLowerCase() === String(b).toLowerCase()));
  };

  function makeQuestion(x, pool, avoidType){
    let types = TYPES.filter(t => t !== avoidType && (t !== 'fill' || canFill(x)));
    if(!types.length) types = ['en2zh'];
    const type = types[Math.floor(Math.random()*types.length)];
    const seenW = new Set([x.w]), seenZ = new Set([x.zh]), others = [];
    for(const y of shuffle(pool.length >= 4 ? pool : pool)){
      if(others.length === 3) break;
      if(seenW.has(y.w) || seenZ.has(y.zh)) continue;
      if(isSynonymPair(x.w, y.w)) continue; // 跳過跟正確答案同義（口語/正式體差異）的候選字，避免選項模擬兩可
      seenW.add(y.w); seenZ.add(y.zh); others.push(y);
    }
    while(others.length < 3 && pool.length) others.push(pool[Math.floor(Math.random()*pool.length)]); // 字數不足時允許重複湊滿選項
    const opts = shuffle([x, ...others]);
    return { word:x, type, opts, answer:x.w, labels: opts.map(o => type === 'en2zh' ? (o.zh||o.w) : o.w) };
  }


  function start(container, { words, title, onExit, difficulty, onFinish, onAnswer }){
    const pool = words;
    const diffKey = DIFFICULTY[difficulty] ? difficulty : DEFAULT_DIFFICULTY;
    const diff = DIFFICULTY[diffKey];
    const G = {
      diff, queue: buildQueue(words, diff), enemies: [], hp: MAX_HP, streak: 0, right: 0, killed: 0, breached: 0,
      total: 0, time: 0, spawnT: 0.6, lock: 0, cur: null, over: false, won: false, paused: false, raf: null, dead: false,
      banner: null, shake: 0, parts: [], ult: null, freezeUntil: 0, shot: null,
    };
    G.total = G.queue.length;

    container.innerHTML = `
      <div class="battle-topbar">
        <div class="battle-topbar-left">
          <button class="tbtn" id="ge-back">← 撤退</button>
          <b class="battle-title">${esc(title || '守城')}</b>
        </div>
        <div class="battle-topbar-right">
          <span class="battle-diff-tag">${esc(diff.label)}</span>
          <button class="tbtn" id="ge-pause">⏸ 暫停</button>
          <button class="tbtn" id="ge-mute">${muted ? '🔇 靜音' : '🔊 音效'}</button>
        </div>
      </div>
      <div class="battle-field"><canvas id="ge-cv" width="${W*Art.DPR}" height="${H*Art.DPR}" style="width:100%;max-width:${W}px;aspect-ratio:${W}/${H}"></canvas>
        <div class="battle-pause-overlay" id="ge-pause-overlay" style="display:none"><div class="pause-box">已暫停</div></div>
      </div>
      <div class="battle-hud">
        <div class="hud-grp">城牆 <span id="ge-hp"></span></div>
        <div class="hud-grp">連擊 <span id="ge-cb"></span></div>
        <div class="hud-grp">剩餘 <span id="ge-left"></span></div>
      </div>
      <div class="battle-qp" id="ge-qp"></div>
    `;
    const cv = container.querySelector('#ge-cv');
    const g = cv.getContext('2d');
    const themeKeys = Object.keys(Art.THEMES);
    const theme = themeKeys[Math.floor(Math.random()*themeKeys.length)];
    const T = Art.THEMES[theme];
    const bg = Art.makeBg(theme);

    function hud(){
      const hpEl = container.querySelector('#ge-hp');
      const cbEl = container.querySelector('#ge-cb');
      const leftEl = container.querySelector('#ge-left');
      if(!hpEl) return;
      hpEl.textContent = '♥'.repeat(Math.max(0,G.hp)) + '♡'.repeat(Math.max(0,MAX_HP-G.hp));
      cbEl.textContent = '●'.repeat(G.streak % COMBO_N) + '○'.repeat(COMBO_N - (G.streak % COMBO_N));
      const left = G.queue.length + G.enemies.filter(e => e.state === 'walk').length;
      leftEl.textContent = `${left} / ${G.total}`;
    }

    function spawn(){
      const item = G.queue.shift();
      const K = KINDS[item.kind];
      const scale = K.scale[0] + Math.random()*(K.scale[1]-K.scale[0]);
      let spd = K.spd;
      if(item.kind === 'runner') spd = G.diff.runnerSpd;
      else if(item.kind === 'boss') spd = K.spd * G.diff.bossSpdMul;
      G.enemies.push({
        kind: item.kind, words: item.words, idx: 0, w: item.words[0], theme,
        hp: K.hp, maxHp: K.hp, spd, dmg: K.dmg, color: T.enemy[K.colorIdx],
        x: item.kind === 'boss' ? W - 60 : W + 20, state: 'walk', dt: 0, t: Math.random()*3, stun: 0, flash: 0,
        scale, horn: item.kind === 'boss' ? 0 : item.kind === 'runner' ? 1 : Math.floor(Math.random()*3),
        doomed: false, lastType: null, charge: 0,
      });
      hud();
    }

    function finish(won){
      G.over = true; G.won = won;
      G.banner = won ? '守城成功！' : '城門被攻破了';
      if(won) sfx.win(); else sfx.lose();
      hud();
      setTimeout(() => showResult(), 700);
    }

    function update(dt){
      G.time += dt;
      if(G.shake > 0) G.shake = Math.max(0, G.shake - dt);
      G.spawnT -= dt;
      const walkers = G.enemies.filter(e => e.state === 'walk');
      const nextBoss = G.queue.length && G.queue[0].kind === 'boss';
      if(G.queue.length && (nextBoss ? walkers.length === 0 : (walkers.length < G.diff.maxWalkers && G.spawnT <= 0))){
        spawn(); G.spawnT = G.diff.spawnInterval;
      }
      const frozen = G.time < (G.freezeUntil || 0);
      for(const e of G.enemies){
        e.t += dt; if(e.flash > 0) e.flash -= dt;
        if(e.state === 'walk'){
          if(frozen){ /* 大招演出中，敵人停住 */ }
          else{
            e.x -= BASE_SPEED * G.diff.speedMul * e.spd * dt;
            if(e.x <= STOP_X){ e.x = STOP_X; e.state = 'attack'; e.dt = 0; e.hitDone = false; }
          }
        }else if(e.state === 'attack'){
          e.dt += dt;
          if(e.dt > 0.5 && !e.hitDone){
            e.hitDone = true;
            G.hp = Math.max(0, G.hp - e.dmg); G.breached++;
            G.shake = Math.max(G.shake, 0.35);
            sfx.breach();
            hud();
          }
          if(e.dt > 1.0) e.state = 'gone';
        }else if(e.state === 'die'){
          e.dt += dt; if(e.dt > 0.4) e.state = 'gone';
        }
      }
      G.enemies = G.enemies.filter(e => e.state !== 'gone');
      // 魔王必殺一擊演出：蓄滿後先集氣 0.75 秒，再觸發爆炸震屏＋碎紙特效
      if(G.ult){
        const u = G.ult; u.t += dt;
        if(u.phase === 'charge'){
          if(Math.random() < .9) for(let k=0;k<3;k++){
            const a = Math.random()*Math.PI*2, r = 60 + Math.random()*50;
            G.parts.push({ x:ARCHER_X + Math.cos(a)*r, y:ARCHER_Y + Math.sin(a)*r, vx:-Math.cos(a)*r*2.6, vy:-Math.sin(a)*r*2.6, life:.36, max:.36, r:1.2+Math.random()*1.8, col: Math.random()<.5 ? '#fff3c4' : '#f2c45a', nograv:true });
          }
          if(u.t >= .75){
            const e = u.e;
            if(e && e.state !== 'gone'){
              e.doomed = true; e.state = 'die'; e.dt = 0; G.killed++; sfx.kill();
              G.shake = .95; G.flash = 1;
              Art.spark(G.parts, e.x, GROUND-22*e.scale, '#f2c45a', 40, 260);
              Art.spark(G.parts, e.x, GROUND-22*e.scale, '#ffffff', 20, 200);
              Art.spark(G.parts, e.x, GROUND-22*e.scale, '#a8463a', 14, 180);
              Art.confettiBurst(G.parts, 120, W-20);
              G.banner = '打倒魔王！守城成功';
            }
            G.ult = null;
            G.freezeUntil = 0;
          }
        }
      }
      G.parts = Art.stepParticles(G.parts, dt, GROUND+20);
      if(G.shot){ G.shot.t += dt; if(G.shot.t >= G.shot.dur) G.shot = null; }
      if(G.banner) hud();
      if(!G.over){
        if(G.hp <= 0) finish(false);
        else if(!G.ult && !G.queue.length && G.enemies.length === 0) finish(true);
      }
      if(!G.over && !G.ult) ensureQuestion();
    }

    function draw(){
      g.setTransform(Art.DPR,0,0,Art.DPR,0,0);
      g.clearRect(0,0,W,H);
      if(G.shake > 0){
        const k = G.shake / 0.35;
        g.translate((Math.random()*2-1)*6*k, (Math.random()*2-1)*4*k);
      }
      g.drawImage(bg,0,0,W,H);
      Art.drawFlag(g,T,G.time);
      const crack = Math.min(1, (MAX_HP - G.hp) / (MAX_HP - 1));
      if(crack > 0) Art.drawCrack(g, T, crack);
      // 攻擊瞬間：pull 從大到小插值，製造「射出去」的回彈感；平時維持0
      const shotPull = G.shot ? Math.max(0, .9 * (1 - Math.min(1, G.shot.t / G.shot.dur))) : 0;
      Art.drawArcher(g,T,shotPull,theme);
      // 集氣演出：畫面變暗＋光環收縮＋放射光芒
      if(G.ult && G.ult.phase === 'charge'){
        Art.drawUltCharge(g, ARCHER_X, ARCHER_Y, G.ult.t);
        Art.drawArcher(g,T,shotPull,theme);
      }
      const bossE = G.enemies.find(z => z.kind === 'boss' && z.state === 'walk');
      if(bossE && bossE.charge > 0){
        const r = 4 + bossE.charge*3 + Math.sin(G.time*8)*1.2 + (G.ult && G.ult.phase === 'charge' ? G.ult.t*14 : 0);
        Art.drawBossGlow(g, ARCHER_X, ARCHER_Y, r);
      }
      const tgt = G.cur && G.cur.enemy;
      [...G.enemies].sort((a,b) => b.x - a.x).forEach(e => Art.drawEnemy(g,e,T,e === tgt && e.state === 'walk'));
      if(G.shot){
        const p = Math.min(1, G.shot.t / G.shot.dur);
        const px = G.shot.x0 + (G.shot.x1 - G.shot.x0)*p, py = G.shot.y0 + (G.shot.y1 - G.shot.y0)*p;
        const ang = Math.atan2(G.shot.y1 - G.shot.y0, G.shot.x1 - G.shot.x0);
        if(G.shot.theme === 'ocean') Art.drawTridentProjectile(g, px, py, ang, T);
        else Art.drawArrow(g, px, py, ang, T);
      }
      Art.drawParticles(g, G.parts);
      if(G.banner){
        g.fillStyle = 'rgba(28,36,40,.8)'; g.fillRect(W/2-150,14,300,32);
        g.fillStyle = '#efe9dc'; g.font = 'bold 16px sans-serif'; g.textAlign = 'center';
        g.fillText(G.banner, W/2, 36);
      }
    }

    function loop(ts){
      if(G.dead) return;
      const now = ts/1000;
      const dt = Math.min(0.05, G.last ? now - G.last : 0);
      G.last = now;
      if(!G.paused && !G.over) update(dt);
      draw();
      G.raf = requestAnimationFrame(loop);
    }

    function ensureQuestion(){
      if(G.cur && G.cur.stale && G.time < G.lock) return; // 等鎖定時間過了（讓答題回饋文字有時間被看到）才換下一題
      // 題目來源敵人仍在場上、還沒分出勝負，就維持同一題，不要因為其他敵人超車而中途換題。
      // 注意：題目只是出題來源，答對時攻擊的一律是「當下」離城堡最近的敵人，兩者脫鉤。
      if(G.cur && !G.cur.stale){
        const e = G.cur.enemy;
        if(e && G.enemies.includes(e) && e.state === 'walk' && !e.doomed) return;
      }
      const target = G.enemies.filter(e => e.state === 'walk' && !e.doomed).sort((a,b) => a.x - b.x)[0];
      if(!target){ G.cur = null; renderWait(); return; }
      if(!G.cur || G.cur.enemy !== target || G.cur.stale){
        const q = makeQuestion(findWord(target.w), pool, target.lastType);
        target.lastType = q.type;
        G.cur = { enemy: target, q };
        renderQ();
      }
    }
    function findWord(w){ return pool.find(x => x.w === w) || w; }

    function renderWait(){
      const qp = container.querySelector('#ge-qp');
      if(qp) qp.innerHTML = `<div class="wait-box"><b>敵軍正在接近…</b><br>進入射程就會出題，答對讓弓箭手射擊</div>`;
    }

    function renderQ(){
      const q = G.cur.q, x = q.word;
      const qp = container.querySelector('#ge-qp');
      let promptHtml;
      if(q.type === 'en2zh'){
        promptHtml = `<div class="qp-word">${esc(x.w)}</div>${canSpeak ? `<button class="qp-say" data-say="${esc(x.tts || x.w)}">🔊 發音</button>` : ''}`;
      }else if(q.type === 'zh2en'){
        promptHtml = `<div class="qp-zh">${esc(x.zh)}<span class="qp-pos">${esc(x.pos||'')}</span></div>`;
      }else{
        const re = blankRe(x.w); const m = x.ex.match(re);
        if(m){
          promptHtml = `<div class="qp-sent">${esc(x.ex.slice(0,m.index))}<span class="qp-blank"></span>${esc(x.ex.slice(m.index + m[0].length))}</div><div class="qp-trans">${boldZhWord(x.exZh, x.zh, x.w)}</div>`;
        }else{
          promptHtml = `<div class="qp-word">${esc(x.w)}</div>`;
        }
      }
      qp.innerHTML = `
        <div class="qp-label">${TYPE_LABEL[q.type]}</div>
        ${promptHtml}
        <div class="qp-opts">${q.labels.map((l,j) => `<button class="qp-opt" data-j="${j}"><span class="qp-k">${j+1}</span>${esc(l)}</button>`).join('')}</div>
        <div class="qp-fb" id="ge-fb"></div>`;
      qp.querySelectorAll('[data-say]').forEach(b => b.onclick = () => speak(b.dataset.say));
      qp.querySelectorAll('.qp-opt').forEach(b => b.onclick = () => answer(+b.dataset.j));
    }

    function answer(j){
      if(!G.cur || G.over || G.paused || G.cur.answered || G.time < G.lock) return;
      const { q } = G.cur, x = q.word;
      // 攻擊目標永遠是「當下」離城堡最近的敵人，可能跟出題來源敵人不同（被更快的敵人超車時）
      const e = G.enemies.filter(en => en.state === 'walk' && !en.doomed).sort((a,b) => a.x - b.x)[0] || G.cur.enemy;
      G.cur.answered = true;
      const ok = q.opts[j].w === q.answer;
      if(onAnswer) onAnswer(x.w, ok);
      const btns = container.querySelectorAll('#ge-qp .qp-opt');
      btns.forEach((b,n) => { b.disabled = true; if(q.opts[n].w === q.answer) b.classList.add('ok'); });
      const fb = container.querySelector('#ge-fb');
      if(ok){
        G.right++; G.streak++;
        sfx.correct();
        G.shot = { x0: ARCHER_X, y0: ARCHER_Y, x1: e.x, y1: GROUND - 22*e.scale, t: 0, dur: 0.25, theme };
        if(e.kind === 'boss'){
          e.charge++;
          const left = BOSS_WORDS - e.charge;
          if(left > 0){
            e.idx++; e.w = e.words[e.idx] ? e.words[e.idx].w : e.words[0].w;
            fb.innerHTML = `<span class="qp-good">答對！</span> 魔王蓄力 ${e.charge}/${BOSS_WORDS}`;
          }else{
            e.doomed = true;
            G.ult = { phase:'charge', t:0, e };
            G.freezeUntil = G.time + 1.4; // 集氣＋爆炸演出期間，敵人停住
            G.banner = '蓄力完成　必殺一擊';
            fb.innerHTML = `<span class="qp-good">蓄力完成，發動攻擊！</span>`;
          }
        }else{
          e.hp--;
          if(e.hp <= 0){ e.doomed = true; e.state = 'die'; e.dt = 0; G.killed++; sfx.kill(); }
          else { e.idx++; if(e.words[e.idx]) e.w = e.words[e.idx].w; }
          fb.innerHTML = `<span class="qp-good">命中！</span> <b>${esc(x.w)}</b> ${esc(x.ipa||'')} ${esc(x.pos||'')} ${esc(x.zh||'')}`;
        }
        G.lock = G.time + 0.9;
        if(e.hp > 0 && e.state !== 'die') G.cur.stale = true;
        else G.cur.stale = true;
      }else{
        G.streak = 0;
        sfx.wrong();
        e.x = Math.max(STOP_X, e.x - 20);
        fb.innerHTML = `<span class="qp-bad">射偏了！</span> 正確答案是 <b>${esc(x.w)}</b> ${esc(x.ipa||'')} ${esc(x.pos||'')} ${esc(x.zh||'')}`;
        G.lock = G.time + 1.6;
        G.cur.stale = true;
      }
      speak(x.tts || x.w);
      hud();
    }

    function showResult(){
      const stars = G.won ? (G.hp >= MAX_HP ? 3 : G.hp >= 3 ? 2 : 1) : 0;
      if(onFinish) onFinish(stars, G.won);
      container.innerHTML = `
        <section class="result-box">
          <h2 class="section-title">${G.won ? '守城成功！' : '城門被攻破了'}</h2>
          <div class="result-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</div>
          <div class="result-stats">
            <div>答對：${G.right} 題</div>
            <div>擊退：${G.killed} 隻</div>
            <div>城牆受損：${G.breached} 次</div>
          </div>
          <button class="btn full" id="ge-done">完成</button>
        </section>`;
      container.querySelector('#ge-done').onclick = () => { if(onExit) onExit(); };
    }

    container.querySelector('#ge-back').onclick = () => {
      G.dead = true; cancelAnimationFrame(G.raf);
      if(onExit) onExit();
    };
    container.querySelector('#ge-pause').onclick = () => {
      G.paused = !G.paused;
      const btn = container.querySelector('#ge-pause');
      const overlay = container.querySelector('#ge-pause-overlay');
      if(btn) btn.textContent = G.paused ? '▶ 繼續' : '⏸ 暫停';
      if(overlay) overlay.style.display = G.paused ? 'flex' : 'none';
    };
    container.querySelector('#ge-mute').onclick = () => {
      setMuted(!muted);
      const btn = container.querySelector('#ge-mute');
      if(btn) btn.textContent = muted ? '🔇 靜音' : '🔊 音效';
      if(muted) try{ window.speechSynthesis.cancel(); }catch(e){}
    };

    hud(); renderWait();
    G.raf = requestAnimationFrame(loop);
  }

  return { start };
})();
