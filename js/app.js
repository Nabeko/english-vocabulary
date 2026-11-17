/* 主程式（todo 5 初版）：等級選單 → Unit 卡片列表 → 預習模式（單字清單）
   守城戰鬥畫面（canvas）與小考模擬、錯題本尚未實作，待 todo 4/6 展開。 */
window.App = (function(){

  const LEVELS = [
    { id: 'preA1', name: 'pre-A1', examName: 'Starters', words: (window.WORDS_PRE_A1 || []) },
    { id: 'a1',    name: 'A1',     examName: 'Movers',   words: (window.WORDS_A1 || []) },
    { id: 'a2',    name: 'A2',     examName: 'Flyers',   words: (window.WORDS_A2 || []) },
    { id: 'ket',   name: 'A2–B1',  examName: 'KET',      words: (window.WORDS_KET || []) },
    { id: 'pet',   name: 'B1–B2',  examName: 'PET',      words: (window.WORDS_PET || []) },
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
  function splitStages(words){
    const stages = [];
    for(let i = 0; i < words.length; i += STAGE_SIZE){
      stages.push(words.slice(i, i + STAGE_SIZE));
    }
    return stages.length ? stages : [[]];
  }

  // 單一關卡的進度key：只有一關時沿用舊格式（相容既有存檔），多關時加上小關編號
  function stageProgressKey(unitNum, stageIdx, totalStages){
    return totalStages > 1 ? `${unitNum}:s${stageIdx}` : `${unitNum}`;
  }

  function renderLevelMenu(){
    const html = `
      <section class="level-menu">
        <h2 class="section-title">選擇等級</h2>
        <div class="level-list-rows">
          ${LEVELS.map(lv => {
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
    const groups = groupByUnit(lv.words);
    const html = `
      <section class="unit-list">
        <button class="back-btn" data-action="back-levels">← 回等級選單</button>
        <h2 class="section-title">${lv.name}（${lv.examName}）— Unit 列表</h2>
        <div class="ulist">
          ${groups.map(g => {
            const done = g.words.filter(w => w.ipa).length;
            const total = g.words.length;
            const ready = done === total;
            const stars = ready ? getBestStars(levelId, g.unit) : 0;
            return `
              <article class="ucard ${ready ? '' : 'ucard-wip'}">
                <div class="uhead">
                  <span class="no">UNIT ${g.unit}</span>
                  <h3>${escapeHtml(g.unitName || '')}</h3>
                </div>
                <div class="meta">
                  <span>${total} 字${ready ? '' : '（內容待補）'}${splitStages(g.words).length > 1 ? `・共${splitStages(g.words).length}小關` : ''}</span>
                  ${stars > 0 ? `<span class="unit-card-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>` : ''}
                </div>
                <div class="row">
                  ${ready ? `<button class="btn sm" data-play="${g.unit}">⚔ 守城</button>` : ''}
                  <button class="btn alt sm" data-preview="${g.unit}">📖 預習單字</button>
                </div>
              </article>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    view.querySelector('[data-action="back-levels"]').addEventListener('click', renderLevelMenu);
    view.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', () => renderPreview(levelId, Number(btn.dataset.preview)));
    });
    view.querySelectorAll('[data-play]').forEach(btn => {
      btn.addEventListener('click', () => startBattle(levelId, Number(btn.dataset.play)));
    });
  }

  function startBattle(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = groupByUnit(lv.words).find(x => x.unit === unitNum);
    const stages = splitStages(g.words);
    if(stages.length > 1) renderStagePicker(levelId, unitNum);
    else renderDifficultyPicker(levelId, unitNum, 0, 1);
  }

  function renderStagePicker(levelId, unitNum){
    const lv = LEVELS.find(l => l.id === levelId);
    const g = groupByUnit(lv.words).find(x => x.unit === unitNum);
    const stages = splitStages(g.words);
    const html = `
      <section class="stage-picker">
        <button class="back-btn" data-action="back-units">← 回 Unit 列表</button>
        <h2 class="section-title">UNIT ${unitNum}：${escapeHtml(g.unitName || '')}（共${stages.length}小關，每關${STAGE_SIZE}字）</h2>
        <div class="diff-grid">
          ${stages.map((s, i) => {
            const key = stageProgressKey(unitNum, i, stages.length);
            const stars = getBestStageStars(levelId, key);
            return `
            <button class="diff-card" data-stage="${i}">
              <span class="diff-card-label">第 ${i+1} 關</span>
              <span class="diff-card-desc">${s.length} 字</span>
              <span class="diff-card-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    view.querySelectorAll('[data-stage]').forEach(btn => {
      btn.addEventListener('click', () => renderDifficultyPicker(levelId, unitNum, Number(btn.dataset.stage), stages.length));
    });
    view.querySelector('[data-action="back-units"]').addEventListener('click', () => renderUnitList(levelId));
  }

  function getBestStageStars(levelId, stageKey){
    let best = 0;
    for(const d of ['hard','normal','easy']){
      const s = getStars(levelId, stageKey, d);
      if(s > best) best = s;
    }
    return best;
  }

  function renderDifficultyPicker(levelId, unitNum, stageIdx, totalStages){
    const lv = LEVELS.find(l => l.id === levelId);
    const stageKey = stageProgressKey(unitNum, stageIdx, totalStages);
    const current = getDifficulty();
    const backTarget = totalStages > 1 ? () => renderStagePicker(levelId, unitNum) : () => renderUnitList(levelId);
    const html = `
      <section class="diff-picker">
        <button class="back-btn" data-action="back-units">← 回${totalStages > 1 ? '選關' : 'Unit 列表'}</button>
        <h2 class="section-title">選擇難度${totalStages > 1 ? `（第 ${stageIdx+1}/${totalStages} 關）` : ''}</h2>
        <div class="diff-grid">
          ${DIFF_OPTS.map(d => {
            const stars = getStars(levelId, stageKey, d.id);
            return `
            <button class="diff-card ${d.id === current ? 'diff-card-active' : ''}" data-diff="${d.id}">
              <span class="diff-card-label">${d.label}</span>
              <span class="diff-card-desc">${d.desc}</span>
              <span class="diff-card-stars">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>
            </button>`;
          }).join('')}
        </div>
      </section>`;
    view.innerHTML = html;
    view.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        const chosen = btn.dataset.diff;
        setDifficulty(chosen);
        runBattle(levelId, unitNum, chosen, stageIdx, totalStages);
      });
    });
    view.querySelector('[data-action="back-units"]').addEventListener('click', backTarget);
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
      onExit: () => ((totalStages || stages.length) > 1 ? renderStagePicker(levelId, unitNum) : renderUnitList(levelId)),
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
      renderLevelMenu();
    }
  };
})();
