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
  const BASE_SPEED = 40;   // 一般敵人移動速度基準值（px/s），實際速度會依難度檔位縮放

  // 難度檔位：speedMul=整體移動速度倍率、runnerSpd=快跑鬼速度倍率、
  // spawnInterval=補怪間隔秒數、maxWalkers=場上同時最多幾隻在走、
  // runnerProb/shieldProb=出怪機率、bossSpdMul=魔王移動速度倍率
  const DIFFICULTY = {
    easy:   { label:'簡單', speedMul:0.6, runnerSpd:1.15, spawnInterval:3.2, maxWalkers:2, runnerProb:0,    shieldProb:0.05, bossSpdMul:0.6 },
    normal: { label:'適中', speedMul:1.0, runnerSpd:1.6,  spawnInterval:2.2, maxWalkers:3, runnerProb:0.15, shieldProb:0.15, bossSpdMul:1.0 },
    hard:   { label:'困難', speedMul:1.3, runnerSpd:1.8,  spawnInterval:1.8, maxWalkers:3, runnerProb:0.20, shieldProb:0.20, bossSpdMul:1.0 },
  };
  const DEFAULT_DIFFICULTY = 'normal';

  // 怪物種類：hp＝要答對幾次、spd＝速度倍率（runner/boss 實際值於 spawn 時依難度檔位覆寫）、dmg＝攻城扣幾點耐久、scale＝原站體型比例
  const KINDS = {
    grunt:  { name:'小兵',   hp:1, spd:1,    dmg:1, color:'#5a4a6e', scale:[.9,1.12] },
    runner: { name:'快跑鬼', hp:1, spd:1.6,  dmg:1, color:'#4f6f86', scale:[.76,.84] },
    shield: { name:'盾牌兵', hp:2, spd:0.75, dmg:1, color:'#9c6f1c', scale:[1.08,1.16] },
    boss:   { name:'魔王',   hp:1, spd:0.5,  dmg:2, color:'#4a2f45', scale:[1.62,1.62] },
  };

  const TYPES = ['en2zh','zh2en','fill'];
  const TYPE_LABEL = { en2zh:'看英文，選中文', zh2en:'看中文，選英文', fill:'例句填空' };

  const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = a => { a = a.slice(); for(let i=a.length-1;i>0;i--){ const j = Math.floor(Math.random()*(i+1)); [a[i],a[j]]=[a[j],a[i]]; } return a; };
  const headWord = w => String(w).split('/')[0].trim();
  const blankRe = w => { try{ return new RegExp('\\b' + headWord(w).replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + '\\b'); }catch(e){ return null; } };
  const canFill = x => !!(x.ex && blankRe(x.w) && blankRe(x.w).test(x.ex));

  const canSpeak = 'speechSynthesis' in window;
  function speak(text){
    if(!canSpeak || !text) return;
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

  function makeQuestion(x, pool, avoidType){
    let types = TYPES.filter(t => t !== avoidType && (t !== 'fill' || canFill(x)));
    if(!types.length) types = ['en2zh'];
    const type = types[Math.floor(Math.random()*types.length)];
    const seenW = new Set([x.w]), seenZ = new Set([x.zh]), others = [];
    for(const y of shuffle(pool.length >= 4 ? pool : pool)){
      if(others.length === 3) break;
      if(seenW.has(y.w) || seenZ.has(y.zh)) continue;
      seenW.add(y.w); seenZ.add(y.zh); others.push(y);
    }
    while(others.length < 3 && pool.length) others.push(pool[Math.floor(Math.random()*pool.length)]); // 字數不足時允許重複湊滿選項
    const opts = shuffle([x, ...others]);
    return { word:x, type, opts, answer:x.w, labels: opts.map(o => type === 'en2zh' ? (o.zh||o.w) : o.w) };
  }

  function start(container, { words, title, onExit, difficulty, onFinish }){
    const pool = words;
    const diffKey = DIFFICULTY[difficulty] ? difficulty : DEFAULT_DIFFICULTY;
    const diff = DIFFICULTY[diffKey];
    const G = {
      diff, queue: buildQueue(words, diff), enemies: [], hp: MAX_HP, streak: 0, right: 0, killed: 0, breached: 0,
      total: 0, time: 0, spawnT: 0.6, lock: 0, cur: null, over: false, won: false, paused: false, raf: null, dead: false,
      banner: null, shake: 0,
    };
    G.total = G.queue.length;

    container.innerHTML = `
      <div class="battle-topbar">
        <button class="tbtn" id="ge-back">← 撤退</button>
        <b class="battle-title">${esc(title || '守城')}</b>
        <span class="battle-diff-tag">${esc(diff.label)}</span>
      </div>
      <div class="battle-field"><canvas id="ge-cv" width="${W*Art.DPR}" height="${H*Art.DPR}" style="width:100%;max-width:${W}px;aspect-ratio:${W}/${H}"></canvas></div>
      <div class="battle-hud">
        <div class="hud-grp">城牆 <span id="ge-hp"></span></div>
        <div class="hud-grp">連擊 <span id="ge-cb"></span></div>
        <div class="hud-grp">剩餘 <span id="ge-left"></span></div>
      </div>
      <div class="battle-qp" id="ge-qp"></div>
    `;
    const cv = container.querySelector('#ge-cv');
    const g = cv.getContext('2d');
    const bg = Art.makeBg('forest');

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
        kind: item.kind, words: item.words, idx: 0, w: item.words[0],
        hp: K.hp, maxHp: K.hp, spd, dmg: K.dmg, color: K.color,
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
      for(const e of G.enemies){
        e.t += dt; if(e.flash > 0) e.flash -= dt;
        if(e.state === 'walk'){
          e.x -= BASE_SPEED * G.diff.speedMul * e.spd * dt;
          if(e.x <= STOP_X){ e.x = STOP_X; e.state = 'attack'; e.dt = 0; e.hitDone = false; }
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
      if(G.banner) hud();
      if(!G.over){
        if(G.hp <= 0) finish(false);
        else if(!G.queue.length && G.enemies.length === 0) finish(true);
      }
      if(!G.over) ensureQuestion();
    }

    function draw(){
      g.setTransform(Art.DPR,0,0,Art.DPR,0,0);
      g.clearRect(0,0,W,H);
      if(G.shake > 0){
        const k = G.shake / 0.35;
        g.translate((Math.random()*2-1)*6*k, (Math.random()*2-1)*4*k);
      }
      g.drawImage(bg,0,0,W,H);
      Art.drawFlag(g,Art.T,G.time);
      const crack = Math.min(1, (MAX_HP - G.hp) / (MAX_HP - 1));
      if(crack > 0) Art.drawCrack(g, Art.T, crack);
      Art.drawArcher(g,Art.T,0);
      const tgt = G.cur && G.cur.enemy;
      [...G.enemies].sort((a,b) => b.x - a.x).forEach(e => Art.drawEnemy(g,e,Art.T,e === tgt && e.state === 'walk'));
      if(G.banner){
        g.fillStyle = 'rgba(28,36,40,.8)'; g.fillRect(W/2-120,14,240,32);
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
        promptHtml = `<div class="qp-word">${esc(x.w)}</div>${canSpeak ? `<button class="qp-say" data-say="${esc(x.w)}">🔊 發音</button>` : ''}`;
      }else if(q.type === 'zh2en'){
        promptHtml = `<div class="qp-zh">${esc(x.zh)}<span class="qp-pos">${esc(x.pos||'')}</span></div>`;
      }else{
        const re = blankRe(x.w); const m = x.ex.match(re);
        if(m){
          promptHtml = `<div class="qp-sent">${esc(x.ex.slice(0,m.index))}<span class="qp-blank"></span>${esc(x.ex.slice(m.index + m[0].length))}</div><div class="qp-trans">${esc(x.exZh||'')}</div>`;
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
      if(!G.cur || G.over || G.cur.answered || G.time < G.lock) return;
      const { enemy: e, q } = G.cur, x = q.word;
      G.cur.answered = true;
      const ok = q.opts[j].w === q.answer;
      const btns = container.querySelectorAll('#ge-qp .qp-opt');
      btns.forEach((b,n) => { b.disabled = true; if(q.opts[n].w === q.answer) b.classList.add('ok'); });
      const fb = container.querySelector('#ge-fb');
      if(ok){
        G.right++; G.streak++;
        sfx.correct();
        if(e.kind === 'boss'){
          e.charge++;
          const left = BOSS_WORDS - e.charge;
          if(left > 0){
            e.idx++; e.w = e.words[e.idx] ? e.words[e.idx].w : e.words[0].w;
            fb.innerHTML = `<span class="qp-good">答對！</span> 魔王蓄力 ${e.charge}/${BOSS_WORDS}`;
          }else{
            e.doomed = true; e.state = 'die'; e.dt = 0; G.killed++; sfx.kill();
            fb.innerHTML = `<span class="qp-good">蓄力完成，魔王被擊退！</span>`;
          }
        }else{
          e.hp--;
          if(e.hp <= 0){ e.doomed = true; e.state = 'die'; e.dt = 0; G.killed++; sfx.kill(); }
          else { e.idx++; if(e.words[e.idx]) e.w = e.words[e.idx].w; }
          fb.innerHTML = `<span class="qp-good">命中！</span> <b>${esc(x.w)}</b> ${esc(x.pos||'')} ${esc(x.zh||'')}`;
        }
        G.lock = G.time + 0.9;
        if(e.hp > 0 && e.state !== 'die') G.cur.stale = true;
        else G.cur.stale = true;
      }else{
        G.streak = 0;
        sfx.wrong();
        e.x = Math.max(STOP_X, e.x - 20);
        fb.innerHTML = `<span class="qp-bad">射偏了！</span> 正確答案是 <b>${esc(x.w)}</b> ${esc(x.pos||'')} ${esc(x.zh||'')}`;
        G.lock = G.time + 1.6;
        G.cur.stale = true;
      }
      speak(x.w);
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

    hud(); renderWait();
    G.raf = requestAnimationFrame(loop);
  }

  return { start };
})();
