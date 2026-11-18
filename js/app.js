/* 主程式（todo 5 初版）：等級選單 → Unit 卡片列表 → 預習模式（單字清單）
   守城戰鬥畫面（canvas）與小考模擬、錯題本尚未實作，待 todo 4/6 展開。 */
window.App = (function(){

  const LEVELS = [
    { id: 'preA1', name: 'pre-A1', examName: 'Starters', system: 'cambridge', words: (window.WORDS_PRE_A1 || []) },
    { id: 'a1',    name: 'A1',     examName: 'Movers',   system: 'cambridge', words: (window.WORDS_A1 || []) },
    { id: 'a2',    name: 'A2',     examName: 'Flyers',   system: 'cambridge', words: (window.WORDS_A2 || []) },
    { id: 'ket',   name: 'A2–B1',  examName: 'KET',      system: 'cambridge', words: (window.WORDS_KET || []) },
    { id: 'pet',   name: 'B1–B2',  examName: 'PET',      system: 'cambridge', words: (window.WORDS_PET || []) },
    { id: 'toeic', name: 'TOEIC',  examName: '新制多益',  system: 'toeic',     words: (window.WORDS_TOEIC || []) },
  ];

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


  function escapeHtml(s){
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  function groupByUnit(words){
    const map = new Map();
    for(const w of words){
      if(!map.has(w.unit)) map.set(w.unit, { unit: w.unit, unitName: w.unitName, words: [] });
      map.get(w.unit).words.push(w);
    }
    return [...map.values()].sort((a,b) => a.unit - b.unit);
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
          ${SYSTEMS.map(sys => {
            const total = sys.levels.reduce((a,l) => a + l.words.length, 0);
            const done = sys.levels.reduce((a,l) => a + l.words.filter(w => w.ipa).length, 0);
            const pct = total ? Math.round(done/total*100) : 0;
            return `
              <button class="level-row" data-system="${sys.id}">
                <span class="level-row-main">
                  <span class="level-row-name">${sys.name}</span>
                  <span class="level-row-exam">${sys.desc}</span>
                </span>
                <span class="level-row-progress"><span class="bar" style="width:${pct}%"></span></span>
                <span class="level-row-pct">${done}/${total} 字</span>
              </button>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
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
  }

  function renderLevelMenu(systemId){
    const sys = SYSTEMS.find(s => s.id === systemId) || SYSTEMS[0];
    const html = `
      <section class="level-menu">
        <button class="back-btn" data-action="back-systems">← 回系統選單</button>
        <h2 class="section-title">選擇等級</h2>
        <div class="level-list-rows">
          ${sys.levels.map(lv => {
            const total = lv.words.length;
            const done = lv.words.filter(w => w.ipa).length;
            const pct = total ? Math.round(done/total*100) : 0;
            return `
              <button class="level-row" data-level="${lv.id}">
                <span class="level-row-main">
                  <span class="level-row-name">${lv.name}</span>
                  <span class="level-row-exam">${lv.examName}</span>
                </span>
                <span class="level-row-progress"><span class="bar" style="width:${pct}%"></span></span>
                <span class="level-row-pct">${done}/${total} 字</span>
              </button>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    view.querySelector('[data-action="back-systems"]').addEventListener('click', renderSystemMenu);
    view.querySelectorAll('.level-row').forEach(btn => {
      btn.addEventListener('click', () => renderUnitList(btn.dataset.level));
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
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    view.querySelector('[data-action="back-levels"]').addEventListener('click', () => {
      if(singleLevelSystem) renderSystemMenu(); else renderLevelMenu(lv.system);
    });
    view.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => renderPreview(levelId, Number(btn.dataset.preview)));
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
      onExit: () => renderUnitList(levelId),
    });
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

  function renderPreview(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const groups = groupByUnit(lv.words);
    const g = groups.find(x => x.unit === unitNum);
    const html = `
      <section class="preview">
        <button class="back-btn" data-action="back-units">← 回 Unit 列表</button>
        <h2 class="section-title">Unit ${g.unit}：${escapeHtml(g.unitName || '')}（預習模式）</h2>
        <ul class="word-list">
          ${g.words.map(w => `
            <li class="word-item">
              <div class="word-head">
                <button class="speak-btn" data-word="${escapeHtml(w.tts || w.w)}" title="朗讀">🔊</button>
                <span class="word-en">${escapeHtml(w.w)}</span>
                <span class="word-ipa">${escapeHtml(w.ipa || '（待補）')}</span>
                <span class="word-pos">${escapeHtml(w.pos || '')}</span>
              </div>
              <div class="word-zh">${escapeHtml(w.zh || '（待補）')}</div>
              ${w.ex ? `<div class="word-ex">${highlightWord(w.ex, w.w)}</div>` : ''}
              ${w.exZh ? `<div class="word-exzh">${escapeHtml(w.exZh)}</div>` : ''}
            </li>`).join('')}
        </ul>
        <button class="btn full" id="ge-start-from-preview">⚔ 從這裡開始守城</button>
      </section>`;
    view.innerHTML = html;
    view.querySelector('[data-action="back-units"]').addEventListener('click', () => renderUnitList(levelId));
    view.querySelectorAll('.speak-btn').forEach(btn => {
      btn.addEventListener('click', () => speak(btn.dataset.word));
    });
    const startBtn = view.querySelector('#ge-start-from-preview');
    if(startBtn) startBtn.addEventListener('click', () => startBattle(levelId, unitNum));
  }

  return {
    init(){
      view = document.getElementById('view');
      if(!view) return;
      renderSystemMenu();
    }
  };
})();
