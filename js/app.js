/* 主程式（todo 5 初版）：等級選單 → Unit 卡片列表 → 預習模式（單字清單）
   守城戰鬥畫面（canvas）與小考模擬、錯題本尚未實作，待 todo 4/6 展開。 */
window.App = (function(){

  // 單字資料改為按需動態載入（首頁一開不再灌入全部6個檔案，約1.8MB），
  // LEVELS.words 一開始是空陣列，進入該等級前會先經過 ensureLevelLoaded() 動態載入對應 <script>
  const LEVEL_SRC = {
    preA1: 'data/words/pre-a1.js',
    a1:    'data/words/a1.js',
    a2:    'data/words/a2.js',
    ket:   'data/words/ket.js',
    pet:   'data/words/pet.js',
    toeic: 'data/words/toeic.js',
  };
  const LEVEL_GLOBAL = {
    preA1: 'WORDS_PRE_A1', a1: 'WORDS_A1', a2: 'WORDS_A2',
    ket: 'WORDS_KET', pet: 'WORDS_PET', toeic: 'WORDS_TOEIC',
  };
  const LEVELS = [
    { id: 'preA1', name: 'pre-A1', examName: 'Starters', system: 'cambridge', words: [] },
    { id: 'a1',    name: 'A1',     examName: 'Movers',   system: 'cambridge', words: [] },
    { id: 'a2',    name: 'A2',     examName: 'Flyers',   system: 'cambridge', words: [] },
    { id: 'ket',   name: 'A2–B1',  examName: 'KET',      system: 'cambridge', words: [] },
    { id: 'pet',   name: 'B1–B2',  examName: 'PET',      system: 'cambridge', words: [] },
    { id: 'toeic', name: 'TOEIC',  examName: '新制多益',  system: 'toeic',     words: [] },
  ];

  const loadedScripts = new Set();
  function ensureLevelLoaded(levelId){
    const lv = LEVELS.find(l => l.id === levelId);
    if(!lv) return Promise.resolve();
    const globalName = LEVEL_GLOBAL[levelId];
    if(window[globalName]){ lv.words = window[globalName]; return Promise.resolve(); }
    if(loadedScripts.has(levelId)){
      // 已經在載入中或載入過，等全域變數出現
      return new Promise(resolve => {
        const check = () => {
          if(window[globalName]){ lv.words = window[globalName]; resolve(); }
          else setTimeout(check, 30);
        };
        check();
      });
    }
    loadedScripts.add(levelId);
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = LEVEL_SRC[levelId];
      s.onload = () => { lv.words = window[globalName] || []; resolve(); };
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }
  // 顯示系統/等級選單時需要字數統計，背景預先載入全部（不阻塞畫面渲染）
  function prefetchAllLevels(){
    LEVELS.forEach(lv => ensureLevelLoaded(lv.id));
  }

  const SYSTEMS = [
    { id: 'cambridge', name: '劍橋分級系統', desc: 'YLE Starters/Movers/Flyers・KET・PET', levels: LEVELS.filter(l => l.system === 'cambridge') },
    { id: 'toeic',     name: 'TOEIC 系統',   desc: '新制多益 3,037 字，14 個主題 Unit', levels: LEVELS.filter(l => l.system === 'toeic') },
  ];

  let view;
  const DIFF_KEY = 'ev_difficulty_v1';
  const STAGE_SIZE = 20; // 每小關最多幾個單字，超過自動切成多小關
  const DIFF_OPTS = [
    { id:'easy',   label:'簡單',   desc:'速度慢、怪物少，適合剛入門' },
    { id:'normal', label:'適中',   desc:'原本的速度與怪物組合' },
    { id:'hard',   label:'困難',   desc:'速度快、怪物多，適合挑戰' },
  ];
  function getDifficulty(){
    try{ return localStorage.getItem(DIFF_KEY) || 'normal'; }catch(e){ return 'normal'; }
  }
  function setDifficulty(id){
    try{ localStorage.setItem(DIFF_KEY, id); }catch(e){}
  }

  const PROGRESS_KEY = 'ev_progress_v1';
  function getProgress(){
    try{ return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); }catch(e){ return {}; }
  }
  function getStars(levelId, unitNum, diffId){
    const p = getProgress();
    return p[`${levelId}:${unitNum}:${diffId}`] || 0;
  }
  function saveStars(levelId, unitNum, diffId, stars){
    const p = getProgress();
    const key = `${levelId}:${unitNum}:${diffId}`;
    if(!p[key] || stars > p[key]) p[key] = stars;
    try{ localStorage.setItem(PROGRESS_KEY, JSON.stringify(p)); }catch(e){}
  }

  // 錯題本：每個Unit各自一份，key為「levelId:unitNum」，value為 {單字: 錯誤次數}
  // 規則參考 lexilereadingrex.github.io：答錯+1次，答對-1次，次數歸0就移出錯題本
  const WRONG_KEY = 'ev_wrong_v1';
  function getAllWrong(){
    try{ return JSON.parse(localStorage.getItem(WRONG_KEY) || '{}'); }catch(e){ return {}; }
  }
  function saveAllWrong(all){
    try{ localStorage.setItem(WRONG_KEY, JSON.stringify(all)); }catch(e){}
  }
  function wrongBookKey(levelId, unitNum){
    return `${levelId}:${unitNum}`;
  }
  function getWrongBook(levelId, unitNum){
    const all = getAllWrong();
    return all[wrongBookKey(levelId, unitNum)] || {};
  }
  function getWrongCount(levelId, unitNum){
    return Object.keys(getWrongBook(levelId, unitNum)).length;
  }
  // 某個Unit戰鬥時答題，記錄到該Unit的錯題本（不是錯題特訓關卡本身，避免練錯題又把同一個字記錄進去造成混淆）
  function recordAnswer(levelId, unitNum, word, correct){
    const all = getAllWrong();
    const k = wrongBookKey(levelId, unitNum);
    const book = all[k] || {};
    if(correct){
      if(book[word]){
        book[word]--;
        if(book[word] <= 0) delete book[word];
      }
    }else{
      book[word] = (book[word] || 0) + 1;
    }
    all[k] = book;
    saveAllWrong(all);
  }



  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // 決定性亂數：用整數種子產生0~1浮點數序列，同種子每次呼叫結果完全相同
  function seededRandom(seed){
    let s = seed % 2147483647;
    if(s <= 0) s += 2147483646;
    return function(){
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // 決定性洗牌：同一個unit編號每次洗出的順序都一樣，不會因為重整頁面/預習與實戰畫面不同而對不上
  function seededShuffle(arr, seed){
    const rand = seededRandom(seed);
    const out = arr.slice();
    for(let i = out.length - 1; i > 0; i--){
      const j = Math.floor(rand() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function groupByUnit(words){
    const map = new Map();
    for(const w of words){
      if(!map.has(w.unit)) map.set(w.unit, { unit: w.unit, unitName: w.unitName, words: [] });
      map.get(w.unit).words.push(w);
    }
    // 原始資料檔常按字母序排列（尤其TOEIC），若直接切關卡會導致「第1關全a開頭…」。
    // 用unit編號當種子做決定性洗牌，讓每關混到不同字首/詞性，但同一unit每次結果固定，
    // 確保預習畫面與實際戰鬥畫面看到的小關字集永遠一致。
    return [...map.values()]
      .map(g => ({ ...g, words: seededShuffle(g.words, g.unit) }))
      .sort((a,b) => a.unit - b.unit);
  }

  // 把一個Unit的單字陣列切成多個小關（每關最多 STAGE_SIZE 個字）
  // 若最後一關剩不到 15 字，直接併入前一關（避免出現太短、不成比例的小關）
  const STAGE_MERGE_MIN = 15;
  function splitStages(words){
    const stages = [];
    for(let i = 0; i < words.length; i += STAGE_SIZE){
      stages.push(words.slice(i, i + STAGE_SIZE));
    }
    if(stages.length > 1 && stages[stages.length-1].length < STAGE_MERGE_MIN){
      const last = stages.pop();
      stages[stages.length-1] = stages[stages.length-1].concat(last);
    }
    return stages.length ? stages : [[]];
  }

  // 單一關卡的進度key：只有一關時沿用舊格式（相容既有存檔），多關時加上小關編號
  function stageProgressKey(unitNum, stageIdx, totalStages){
    return totalStages > 1 ? `${unitNum}:s${stageIdx}` : `${unitNum}`;
  }

  function renderSystemMenu(){
    const html = `
      <section class="level-menu">
        <h2 class="section-title">選擇系統</h2>
        <div class="level-list-rows">
          ${SYSTEMS.map(sys => `
              <button class="level-row" data-system="${sys.id}">
                <span class="level-row-main">
                  <span class="level-row-name">${sys.name}</span>
                  <span class="level-row-exam">${sys.desc}</span>
                </span>
                <span class="level-row-progress" data-progress-for="${sys.id}"><span class="bar" style="width:0%"></span></span>
                <span class="level-row-pct" data-pct-for="${sys.id}">載入中…</span>
              </button>`).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    window.scrollTo(0, 0);
    view.querySelectorAll('[data-system]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sys = SYSTEMS.find(s => s.id === btn.dataset.system);
        if(sys && sys.levels.length === 1){
          // 系統只有一個等級時，跳過選等級畫面，直接進Unit列表
          renderUnitList(sys.levels[0].id);
        }else{
          renderLevelMenu(btn.dataset.system);
        }
      });
    });
    // 進度統計需要單字資料，背景動態載入後再補上百分比，不阻塞畫面初次渲染
    SYSTEMS.forEach(sys => {
      Promise.all(sys.levels.map(lv => ensureLevelLoaded(lv.id))).then(() => {
        const total = sys.levels.reduce((a,l) => a + l.words.length, 0);
        const done = sys.levels.reduce((a,l) => a + l.words.filter(w => w.ipa).length, 0);
        const pct = total ? Math.round(done/total*100) : 0;
        const barEl = view.querySelector(`[data-progress-for="${sys.id}"] .bar`);
        const pctEl = view.querySelector(`[data-pct-for="${sys.id}"]`);
        if(barEl) barEl.style.width = pct + '%';
        if(pctEl) pctEl.textContent = `${done}/${total} 字`;
      });
    });
  }

  function renderLevelMenu(systemId){
    const sys = SYSTEMS.find(s => s.id === systemId) || SYSTEMS[0];
    const html = `
      <section class="level-menu">
        <button class="back-btn" data-action="back-systems">← 回系統選單</button>
        <h2 class="section-title">選擇等級</h2>
        <div class="level-list-rows">
          ${sys.levels.map(lv => `
              <button class="level-row" data-level="${lv.id}">
                <span class="level-row-main">
                  <span class="level-row-name">${lv.name}</span>
                  <span class="level-row-exam">${lv.examName}</span>
                </span>
                <span class="level-row-progress" data-progress-for="${lv.id}"><span class="bar" style="width:0%"></span></span>
                <span class="level-row-pct" data-pct-for="${lv.id}">載入中…</span>
              </button>`).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    window.scrollTo(0, 0);
    view.querySelector('[data-action="back-systems"]').addEventListener('click', renderSystemMenu);
    view.querySelectorAll('.level-row').forEach(btn => {
      btn.addEventListener('click', () => renderUnitList(btn.dataset.level));
    });
    sys.levels.forEach(lv => {
      ensureLevelLoaded(lv.id).then(() => {
        const total = lv.words.length;
        const done = lv.words.filter(w => w.ipa).length;
        const pct = total ? Math.round(done/total*100) : 0;
        const barEl = view.querySelector(`[data-progress-for="${lv.id}"] .bar`);
        const pctEl = view.querySelector(`[data-pct-for="${lv.id}"]`);
        if(barEl) barEl.style.width = pct + '%';
        if(pctEl) pctEl.textContent = `${done}/${total} 字`;
      });
    });
  }

  function getBestStars(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = lv && groupByUnit(lv.words).find(x => x.unit === unitNum);
    const stages = g ? splitStages(g.words) : [[]];
    if(stages.length > 1){
      // 多關時，顯示「所有小關都通關的最低星級」當作整個Unit的代表星級（最嚴格，確保全部打過才顯示星）
      let min = 3;
      for(let i = 0; i < stages.length; i++){
        const key = stageProgressKey(unitNum, i, stages.length);
        let best = 0;
        for(const d of ['hard','normal','easy']){
          const s = getStars(levelId, key, d);
          if(s > best) best = s;
        }
        if(best < min) min = best;
      }
      return min;
    }
    for(const d of ['hard','normal','easy']){
      const s = getStars(levelId, unitNum, d);
      if(s > 0) return s;
    }
    return 0;
  }

  function renderUnitList(levelId){
    ensureLevelLoaded(levelId).then(() => renderUnitListNow(levelId));
  }
  function renderUnitListNow(levelId){
    const lv = LEVELS.find(l => l.id === levelId);
    const sys = SYSTEMS.find(s => s.id === lv.system);
    const singleLevelSystem = sys && sys.levels.length === 1;
    const groups = groupByUnit(lv.words);
    const html = `
      <section class="unit-list">
        <button class="back-btn" data-action="back-levels">${singleLevelSystem ? '← 回系統選單' : '← 回等級選單'}</button>
        <h2 class="section-title">${lv.name}（${lv.examName}）— Unit 列表</h2>
        <div class="ulist">
          ${groups.map(g => {
            const done = g.words.filter(w => w.ipa).length;
            const total = g.words.length;
            const ready = done === total;
            const stars = ready ? getBestStars(levelId, g.unit) : 0;
            const stages = splitStages(g.words);
            let stageOffset = 0;
            const stageRowsHtml = ready ? stages.map((s, i) => {
              const stageKey = stageProgressKey(g.unit, i, stages.length);
              const rangeLabel = stages.length > 1
                ? `第 ${stageOffset+1}–${stageOffset+s.length} 字`
                : `共 ${s.length} 字`;
              stageOffset += s.length;
              const diffButtons = DIFF_OPTS.map(d => {
                const st = getStars(levelId, stageKey, d.id);
                return `<button class="stage-diff-btn ${d.id === 'normal' ? 'active' : ''}" data-diff="${d.id}" data-stars="${st}">${d.label}</button>`;
              }).join('');
              const defaultStars = getStars(levelId, stageKey, 'normal');
              return `
                <div class="stage-row" data-unit="${g.unit}" data-stage="${i}">
                  <span class="stage-range">${rangeLabel}</span>
                  <div class="stage-diff-group">${diffButtons}</div>
                  <span class="stage-stars">${'★'.repeat(defaultStars)}${'☆'.repeat(3-defaultStars)}</span>
                  ${stages.length > 1 ? `<button class="btn alt sm" data-preview-stage>📖 預習</button>` : ''}
                  <button class="btn sm" data-play-stage>⚔ 守城</button>
                </div>`;
            }).join('') : '';
            return `
              <article class="ucard ${ready ? '' : 'ucard-wip'}">
                <div class="uhead">
                  <span class="no">UNIT ${g.unit}</span>
                  <h3>${escapeHtml(g.unitName || '')}</h3>
                </div>
                <div class="meta">
                  <span>${total} 字${ready ? '' : '（內容待補）'}${stages.length > 1 ? `・共${stages.length}小關` : ''}</span>
                  ${stars > 0 ? `<span class="unit-card-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>` : ''}
                </div>
                ${ready ? `<div class="stage-rows">${stageRowsHtml}</div>` : ''}
                <div class="row">
                  <button class="btn alt sm" data-preview="${g.unit}">📖 預習單字</button>
                  ${ready && getWrongCount(levelId, g.unit) > 0 ? `<button class="btn alt sm" data-wrongbook="${g.unit}">📕 錯題本（${getWrongCount(levelId, g.unit)}）</button>` : ''}
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    window.scrollTo(0, 0);
    view.querySelector('[data-action="back-levels"]').addEventListener('click', () => {
      if(singleLevelSystem) renderSystemMenu(); else renderLevelMenu(lv.system);
    });
    view.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => renderPreview(levelId, Number(btn.dataset.preview)));
    });
    view.querySelectorAll('[data-wrongbook]').forEach(btn => {
      btn.addEventListener('click', () => renderWrongBook(levelId, Number(btn.dataset.wrongbook)));
    });
    view.querySelectorAll('.stage-row').forEach(row => {
      const unitNum = Number(row.dataset.unit);
      const stageIdx = Number(row.dataset.stage);
      const diffBtns = row.querySelectorAll('.stage-diff-btn');
      const starsEl = row.querySelector('.stage-stars');
      diffBtns.forEach(b => {
        b.addEventListener('click', () => {
          diffBtns.forEach(x => x.classList.remove('active'));
          b.classList.add('active');
          const st = Number(b.dataset.stars);
          starsEl.textContent = '★'.repeat(st) + '☆'.repeat(3-st);
        });
      });
      row.querySelector('[data-play-stage]').addEventListener('click', () => {
        const activeBtn = row.querySelector('.stage-diff-btn.active') || diffBtns[1];
        const diff = activeBtn.dataset.diff;
        setDifficulty(diff);
        const g2 = groups.find(x => x.unit === unitNum);
        const totalStages = splitStages(g2.words).length;
        runBattle(levelId, unitNum, diff, stageIdx, totalStages);
      });
      const previewStageBtn = row.querySelector('[data-preview-stage]');
      if(previewStageBtn){
        previewStageBtn.addEventListener('click', () => {
          const g2 = groups.find(x => x.unit === unitNum);
          const stagesNow = splitStages(g2.words);
          renderPreview(levelId, unitNum, stageIdx, stagesNow.length);
        });
      }
    });
  }

  function startBattle(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = groupByUnit(lv.words).find(x => x.unit === unitNum);
    const stages = splitStages(g.words);
    runBattle(levelId, unitNum, getDifficulty(), 0, stages.length);
  }

  function runBattle(levelId, unitNum, difficulty, stageIdx, totalStages){
    const lv = LEVELS.find(l => l.id === levelId);
    const groups = groupByUnit(lv.words);
    const g = groups.find(x => x.unit === unitNum);
    const stages = splitStages(g.words);
    const stageWords = stages[stageIdx || 0] || g.words;
    const stageKey = stageProgressKey(unitNum, stageIdx || 0, totalStages || stages.length);
    const titleSuffix = (totalStages || stages.length) > 1 ? ` 第${(stageIdx||0)+1}關` : '';
    window.GameEngine.start(view, {
      words: stageWords,
      title: `${lv.name} Unit ${unitNum} 守城${titleSuffix}`,
      difficulty,
      onFinish: (stars) => saveStars(levelId, stageKey, difficulty, stars),
      onAnswer: (word, correct) => recordAnswer(levelId, unitNum, word, correct),
      onExit: () => renderUnitList(levelId),
    });
  }

  // 錯題特訓：抓該Unit錯題本裡的字（最多10個，比照原站做法）開一場戰鬥，純練習不計入該Unit星星進度
  function startWrongDrill(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = groupByUnit(lv.words).find(x => x.unit === unitNum);
    const book = getWrongBook(levelId, unitNum);
    const entries = Object.entries(book).sort((a,b) => b[1]-a[1]).slice(0, 10);
    const words = entries.map(([w]) => g.words.find(x => x.w === w)).filter(Boolean);
    if(!words.length) return;
    window.GameEngine.start(view, {
      words,
      title: `${lv.name} Unit ${unitNum} 錯題特訓`,
      difficulty: getDifficulty(),
      onAnswer: (word, correct) => recordAnswer(levelId, unitNum, word, correct),
      onExit: () => renderUnitList(levelId),
      // 不帶 onFinish：錯題特訓結果不影響該Unit正式星星進度
    });
  }

  function renderWrongBook(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = groupByUnit(lv.words).find(x => x.unit === unitNum);
    const book = getWrongBook(levelId, unitNum);
    const entries = Object.entries(book).sort((a,b) => b[1]-a[1])
      .map(([w,n]) => [g.words.find(x => x.w === w), n]).filter(([x]) => x);
    const html = `
      <section class="wrong-book">
        <button class="back-btn" data-action="back-units">← 回 Unit 列表</button>
        <h2 class="section-title">Unit ${g.unit}：${escapeHtml(g.unitName || '')}（錯題本）</h2>
        ${entries.length
          ? `<p class="lead">答錯的字會記在這裡；之後在這個Unit答對一次，次數就減1，減到0就會移出錯題本。</p>
             <ul class="word-list">
               ${entries.map(([w,n]) => `
                 <li class="word-item">
                   <div class="word-head">
                     <button class="speak-btn" data-word="${escapeHtml(w.tts || w.w)}" title="朗讀">🔊</button>
                     <span class="word-en">${escapeHtml(w.w)}</span>
                     <span class="word-ipa">${escapeHtml(w.ipa || '')}</span>
                     <span class="word-pos">${escapeHtml(w.pos || '')}</span>
                     <span class="wrong-cnt">錯 ${n} 次</span>
                   </div>
                   <div class="word-zh">${escapeHtml(w.zh || '')}</div>
                 </li>`).join('')}
             </ul>
             <button class="btn full" id="wrong-drill">⚔ 用錯題守城（${Math.min(entries.length,10)} 字）</button>`
          : `<div class="sheet" style="padding:24px 16px;text-align:center">這個Unit目前沒有錯題。</div>`}
      </section>`;
    view.innerHTML = html;
    window.scrollTo(0, 0);
    view.querySelector('[data-action="back-units"]').addEventListener('click', () => renderUnitList(levelId));
    view.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.word));
    });
    const drillBtn = view.querySelector('#wrong-drill');
    if(drillBtn) drillBtn.addEventListener('click', () => startWrongDrill(levelId, unitNum));
  }

  function highlightWord(ex, w){
    if(!ex) return '';
    // 只標記原形完全一致出現的單字（遊戲填空題規則：例句需原封不動含該字原形）
    const head = w.split('/')[0].trim();
    const safe = head.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try{
      const re = new RegExp('\\\\b' + safe + '\\\\b');
    }catch(e){}
    return escapeHtml(ex);
  }

  // 發音：Web Speech API（瀏覽器內建 TTS，無需預錄音檔，沿用原站方案 — 見 PRD 4.1）
  function speak(text){
    if(!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel(); // 避免連點疊加朗讀
    const utter = new SpeechSynthesisUtterance(text.split('/')[0].trim());
    utter.lang = 'en-US';
    utter.rate = 0.9;
    window.speechSynthesis.speak(utter);
  }

  // 例句發音：完整句子朗讀，不切斜線（例句不會有單字發音標記的斜線語法），語速放慢方便聽清楚
  function speakSentence(text){
    if(!('speechSynthesis' in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text.trim());
    utter.lang = 'en-US';
    utter.rate = 0.75;
    window.speechSynthesis.speak(utter);
  }

  function renderPreview(levelId, unitNum, stageIdx, totalStages){
    const lv = LEVELS.find(l => l.id === levelId);
    const groups = groupByUnit(lv.words);
    const g = groups.find(x => x.unit === unitNum);
    const stages = splitStages(g.words);
    const hasStage = stageIdx != null && stages.length > 1;
    const previewWords = hasStage ? (stages[stageIdx] || g.words) : g.words;
    const titleSuffix = hasStage ? ` 第${stageIdx+1}關` : '';
    const html = `
      <section class="preview">
        <button class="back-btn" data-action="back-units">← 回 Unit 列表</button>
        <h2 class="section-title">Unit ${g.unit}：${escapeHtml(g.unitName || '')}${titleSuffix}（預習模式）</h2>
        <ul class="word-list">
          ${previewWords.map(w => `
            <li class="word-item">
              <div class="word-head">
                <button class="speak-btn" data-word="${escapeHtml(w.tts || w.w)}" title="朗讀">🔊</button>
                <span class="word-en">${escapeHtml(w.w)}</span>
                <span class="word-ipa">${escapeHtml(w.ipa || '（待補）')}</span>
                <span class="word-pos">${escapeHtml(w.pos || '')}</span>
              </div>
              <div class="word-zh">${escapeHtml(w.zh || '（待補）')}</div>
              ${w.ex ? `<div class="word-ex"><button class="speak-btn ex-speak-btn" data-ex="${escapeHtml(w.ex)}" title="朗讀例句">🔊</button>${highlightWord(w.ex, w.w)}</div>` : ''}
              ${w.exZh ? `<div class="word-exzh">${escapeHtml(w.exZh)}</div>` : ''}
            </li>`).join('')}
        </ul>
        <button class="btn full" id="ge-start-from-preview">⚔ 從這裡開始守城</button>
      </section>`;
    view.innerHTML = html;
    window.scrollTo(0, 0);
    view.querySelector('[data-action="back-units"]').addEventListener('click', () => renderUnitList(levelId));
    view.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        ev.stopPropagation();
        if(btn.dataset.ex) speakSentence(btn.dataset.ex);
        else speak(btn.dataset.word);
      });
    });
    const startBtn = view.querySelector('#ge-start-from-preview');
    if(startBtn) startBtn.addEventListener('click', () => {
      if(hasStage){
        runBattle(levelId, unitNum, getDifficulty(), stageIdx, totalStages || stages.length);
      } else {
        startBattle(levelId, unitNum);
      }
    });
  }

  return {
    init(){
      view = document.getElementById('view');
      if(!view) return;
      renderSystemMenu();
    }
  };
})();
