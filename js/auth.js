/* =========================================================
   前端簡易密碼鎖（僅防君子，非真安全機制）
   密碼寫死在這裡；驗證成功後記住在 localStorage，不用每次輸入。
   ========================================================= */
(function(){
  const PASS_KEY = 'ev_auth_v1';
  const PASSWORD = '2004522';
  const ENABLED = false; // 暫時關閉密碼鎖：設回 true 即可恢復

  function isUnlocked(){
    try{ return localStorage.getItem(PASS_KEY) === '1'; }catch(e){ return false; }
  }
  function unlock(){
    try{ localStorage.setItem(PASS_KEY, '1'); }catch(e){}
  }

  function showGate(){
    const gate = document.createElement('div');
    gate.id = 'auth-gate';
    gate.innerHTML = `
      <div class="auth-box">
        <h1>英文單字王</h1>
        <p>請輸入密碼</p>
        <input type="password" id="auth-input" inputmode="numeric" autocomplete="off" />
        <button id="auth-btn" class="btn gold full">進入</button>
        <p id="auth-err" class="auth-err" hidden>密碼錯誤，請再試一次</p>
      </div>`;
    document.body.appendChild(gate);

    const input = gate.querySelector('#auth-input');
    const btn = gate.querySelector('#auth-btn');
    const err = gate.querySelector('#auth-err');

    function tryUnlock(){
      if(input.value === PASSWORD){
        unlock();
        gate.remove();
        document.documentElement.classList.remove('locked');
        if(window.onAuthed) window.onAuthed();
      } else {
        err.hidden = false;
        input.value = '';
        input.focus();
      }
    }
    btn.addEventListener('click', tryUnlock);
    input.addEventListener('keydown', e => { if(e.key === 'Enter') tryUnlock(); });
    setTimeout(() => input.focus(), 50);
  }

  // 一進頁面就鎖住畫面，避免內容閃現
  document.documentElement.classList.add('locked');

  window.EVAuth = {
    init(){
      if(!ENABLED || isUnlocked()){
        document.documentElement.classList.remove('locked');
        if(window.onAuthed) window.onAuthed();
      } else {
        showGate();
      }
    }
  };
})();
