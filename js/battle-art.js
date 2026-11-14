/* 守城戰鬥美術模組（移植改寫自 lexilereadingrex.github.io 的 canvas 手繪程式碼，
   純幾何圖形繪製，無外部圖片素材，不含音效/粒子特效等進階演出，僅保留背景/城堡/
   弓箭手/怪物/箭矢的靜態與動態繪製，供 game-engine.js 呼叫）
   畫布邏輯座標沿用原站：W=720,H=300,GROUND=238,WALL_X=158,STOP_X=176
*/
window.BattleArt = (function(){
  const W = 720, H = 300, GROUND = 238, WALL_X = 158, STOP_X = WALL_X + 18;
  const DPR = Math.min(2, window.devicePixelRatio || 1);

  const THEMES = {
    forest:{ sky:['#9dbfc4','#e4d8b9'], glow:'rgba(255,236,200,.55)', far:'#8eab9a', mid:'#6a8c6c', near:'#4e6d50',
             ground:'#5b7a4f', groundD:'#4a6741', path:'#b7a079', pathD:'#8f7a56', stone:'#9aa09f', stoneL:'#aab0ae', stoneD:'#626a6b',
             gate:'#4a3a2f', win:'#2b3134', banner:'#c9932e', ink:'#1c2428', tunic:'#3f6a5a', hood:'#2f4f44',
             enemy:['#5a4a6e','#6e4c4a','#4a5a70'], eye:'#1c2428' },
    ocean:{ sky:['#9fc9d6','#e8e4c9'], glow:'rgba(210,240,255,.55)', far:'#7fa8ad', mid:'#5c8f93', near:'#3f6e72',
             ground:'#4f7a7a', groundD:'#3e6262', path:'#c9bb8e', pathD:'#a89968', stone:'#9aa6a6', stoneL:'#aebab8', stoneD:'#5e6c6c',
             gate:'#3a3933', win:'#223034', banner:'#3e86a0', ink:'#1c2428', tunic:'#2f6a7a', hood:'#244f58',
             enemy:['#3f6e7e', '#2e5a6e', '#4a7a86'], eye:'#1c2428' },
    space:{ sky:['#1c1f3d','#3a2f5c'], glow:'rgba(180,170,255,.45)', far:'#2b2a52', mid:'#3a3468', near:'#2a2650',
             ground:'#3a3550', groundD:'#2a2640', path:'#5c5680', pathD:'#443f66', stone:'#595a78', stoneL:'#6c6d8c', stoneD:'#333449',
             gate:'#201d33', win:'#120f24', banner:'#8463c9', ink:'#0f0d1f', tunic:'#4f4a82', hood:'#36305a',
             enemy:['#6a4a8e', '#4a5a9e', '#8e4a7a'], eye:'#0f0d1f' },
    autumn:{ sky:['#e0b088','#f2dcb0'], glow:'rgba(255,220,170,.55)', far:'#c08a5c', mid:'#a86a3f', near:'#8a4f2e',
             ground:'#9a6a3a', groundD:'#7a4e28', path:'#c9a06a', pathD:'#a67e4a', stone:'#a99486', stoneL:'#bba895', stoneD:'#6b5848',
             gate:'#4a3324', win:'#2b2120', banner:'#c96a2e', ink:'#241a14', tunic:'#8a4a2f', hood:'#5c3522',
             enemy:['#8a5a3a', '#a04a3a', '#6e4a30'], eye:'#241a14' },
  };
  const T = THEMES.forest;

  function rngFrom(str){
    let h = 2166136261;
    for(const c of str){ h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t>>>15, t|1); t ^= t + Math.imul(t ^ t>>>7, t|61); return ((t ^ t>>>14)>>>0) / 4294967296; };
  }
  function circle(g,x,y,r){ g.beginPath(); g.arc(x,y,r,0,Math.PI*2); }
  function ell(g,x,y,rx,ry){ g.beginPath(); g.ellipse(x,y,rx,ry,0,0,Math.PI*2); }
  function ridge(g,r,base,amp,f,x0=0,x1=W){
    const p1 = r()*6, p2 = r()*6;
    g.beginPath(); g.moveTo(x0,H);
    for(let x=x0; x<=x1+6; x+=6) g.lineTo(x, base + Math.sin(x*f+p1)*amp + Math.sin(x*f*2.7+p2)*amp*.35);
    g.lineTo(x1,H); g.closePath(); g.fill();
  }
  function pine(g,x,y,h,col,shade){
    g.fillStyle = col;
    for(let k=0;k<3;k++){
      const yy = y - k*h*.28, ww = h*(.42 - k*.1);
      g.beginPath(); g.moveTo(x, yy - h*.5); g.lineTo(x+ww, yy); g.lineTo(x-ww, yy); g.closePath(); g.fill();
      if(shade){ g.fillStyle = shade; g.beginPath(); g.moveTo(x, yy - h*.5); g.lineTo(x+ww, yy); g.lineTo(x, yy); g.closePath(); g.fill(); g.fillStyle = col; }
    }
  }
  function cloud(g,x,y,s){
    g.fillStyle = 'rgba(255,255,255,.5)';
    [[0,0,26,9],[18,-6,18,10],[-16,-3,16,8],[34,2,16,6]].forEach(([dx,dy,rx,ry]) => { ell(g,x+dx*s,y+dy*s,rx*s,ry*s); g.fill(); });
  }
  function bricks(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.lineWidth = 1;
    for(let row=0, yy=y; yy<y+h; row++, yy+=12){
      let xx = x - (row%2 ? 12 : 2);
      while(xx < x+w){
        const bw = 18 + r()*12, v = r();
        if(v < .22){ g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(xx,yy,bw,12); }
        else if(v < .36){ g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(xx,yy,bw,12); }
        g.strokeStyle = T.stoneD; g.globalAlpha = .55; g.strokeRect(xx+.5,yy+.5,bw,12); g.globalAlpha = 1;
        xx += bw;
      }
    }
    g.restore();
  }
  function drawCrack(g, T, k){
    // k: 0~1，城牆受損程度，裂痕條數與長度隨 k 增加，固定隨機種子讓畫面穩定不閃爍
    const r = rngFrom('crack-seed');
    const n = Math.max(1, Math.round(k*5));
    g.save();
    g.strokeStyle = 'rgba(10,8,6,.75)'; g.lineWidth = 1.4; g.lineCap = 'round';
    for(let i=0;i<n;i++){
      let x = 20 + r()*110, y = 72 + r()*(GROUND-80);
      g.beginPath(); g.moveTo(x,y);
      const segs = 3 + Math.floor(r()*3);
      for(let s=0;s<segs;s++){
        x += (r()*2-1)*14; y += 6 + r()*10;
        g.lineTo(x,y);
      }
      g.stroke();
    }
    g.restore();
  }
  function drawCastle(g,T,r){
    const base = GROUND + 8;
    g.lineJoin = 'round'; g.strokeStyle = T.ink;
    g.fillStyle = T.stone; g.fillRect(0,128,WALL_X,base-128);
    bricks(g,0,128,WALL_X,base-128,r,T);
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(0,128,WALL_X,3);
    g.lineWidth = 2; g.strokeRect(-2,128,WALL_X+2,base-128);
    for(let x=98; x+10<=WALL_X; x+=16){ g.fillStyle = T.stone; g.fillRect(x,117,11,11); g.strokeRect(x,117,11,11); }
    g.beginPath(); g.moveTo(106,base); g.lineTo(106,200); g.arc(124,200,18,Math.PI,0); g.lineTo(142,base); g.closePath();
    g.fillStyle = T.gate; g.fill(); g.lineWidth = 2; g.stroke();
    g.save(); g.clip();
    g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 1;
    for(let x=112; x<142; x+=6){ g.beginPath(); g.moveTo(x,180); g.lineTo(x,base); g.stroke(); }
    g.strokeStyle = '#2a2a2a'; g.lineWidth = 2.5;
    [204,226].forEach(y => { g.beginPath(); g.moveTo(104,y); g.lineTo(144,y); g.stroke(); });
    g.restore();
    g.fillStyle = '#c9b48a'; circle(g,136,214,1.8); g.fill();
    g.strokeStyle = T.stoneD; g.lineWidth = 1;
    for(let a=Math.PI; a<=Math.PI*2+.01; a+=Math.PI/6){ g.beginPath(); g.moveTo(124+Math.cos(a)*18,200+Math.sin(a)*18); g.lineTo(124+Math.cos(a)*25,200+Math.sin(a)*25); g.stroke(); }
    g.strokeStyle = T.ink; g.lineWidth = 2; g.beginPath(); g.arc(124,200,25,Math.PI,0); g.stroke();
    g.fillStyle = T.stoneL; g.fillRect(20,68,78,base-68);
    bricks(g,20,68,78,base-68,r,T);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(20,68,11,base-68);
    g.lineWidth = 2; g.strokeStyle = T.ink; g.strokeRect(20,68,78,base-68);
    for(let x=20; x+12<=98; x+=16.5){ g.fillStyle = T.stoneL; g.fillRect(x,56,12,12); g.strokeRect(x,56,12,12); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(20,66,78,3);
    [[59,92],[59,152]].forEach(([cx,cy]) => {
      g.beginPath(); g.moveTo(cx-5,cy+20); g.lineTo(cx-5,cy+5); g.arc(cx,cy+5,5,Math.PI,0); g.lineTo(cx+5,cy+20); g.closePath();
      g.fillStyle = T.win; g.fill(); g.lineWidth = 1.8; g.stroke();
    });
    if(!T.night){
      g.fillStyle = '#4f7a4a';
      for(let i=0;i<70;i++){ const x = 20 + r()*70, y = base - r()*r()*120; ell(g,x,y,2.2+r()*2,1.6+r()*1.4); g.fill(); }
      for(let i=0;i<40;i++){ const x = r()*WALL_X, y = base - r()*r()*30; ell(g,x,y,2+r()*2,1.5); g.fill(); }
    }
  }
  const bgCache = {};
  function makeBg(theme){
    if(bgCache[theme]) return bgCache[theme];
    const T = THEMES[theme] || THEMES.forest, r = rngFrom('bg-'+theme);
    const c = document.createElement('canvas'); c.width = W*DPR; c.height = H*DPR;
    const g = c.getContext('2d'); g.scale(DPR,DPR);
    let gr = g.createLinearGradient(0,0,0,GROUND); gr.addColorStop(0,T.sky[0]); gr.addColorStop(1,T.sky[1]);
    g.fillStyle = gr; g.fillRect(0,0,W,H);
    const gl = g.createRadialGradient(W*.75,170,10,W*.75,170,280); gl.addColorStop(0,T.glow); gl.addColorStop(1,'rgba(255,255,255,0)');
    g.fillStyle = gl; g.fillRect(0,0,W,H);
    for(let i=0;i<4;i++) cloud(g, 230 + i*(W-260)/4 + r()*50, 32 + r()*60, .7 + r()*.6);
    g.fillStyle = T.far; ridge(g,r,148,18,.008);
    g.fillStyle = T.mid; ridge(g,r,184,11,.014);
    for(let i=0;i<40;i++) pine(g, 170 + r()*560, 186 + r()*14, 18 + r()*18, T.mid, 'rgba(0,0,0,.12)');
    g.fillStyle = T.near; ridge(g,r,212,6,.02);
    g.fillStyle = T.ground; g.fillRect(0,GROUND-14,W,H);
    g.fillStyle = T.groundD; g.fillRect(0,GROUND+24,W,H);
    g.beginPath(); g.moveTo(0,GROUND-6);
    for(let x=0;x<=W;x+=12) g.lineTo(x, GROUND-6 + Math.sin(x*.03)*1.5);
    for(let x=W;x>=0;x-=12) g.lineTo(x, GROUND+18 + Math.sin(x*.025+1)*2);
    g.closePath(); g.fillStyle = T.path; g.fill();
    g.strokeStyle = T.pathD; g.lineWidth = 1.5; g.globalAlpha = .6; g.stroke(); g.globalAlpha = 1;
    for(let i=0;i<70;i++){ g.fillStyle = r()<.5 ? T.pathD : 'rgba(255,255,255,.18)'; ell(g, r()*W, GROUND-2 + r()*17, 1.5+r()*2.5, 1+r()*1.2); g.fill(); }
    g.strokeStyle = T.groundD; g.lineWidth = 1.2;
    for(let i=0;i<120;i++){ const x = r()*W, y = GROUND + 22 + r()*(H-GROUND-22), h = 3 + r()*5; g.beginPath(); g.moveTo(x-2,y-h); g.lineTo(x,y); g.lineTo(x+2,y-h*.8); g.stroke(); }
    for(let i=0;i<26;i++){ g.fillStyle = r()<.5 ? '#e8d27a' : '#efe9dc'; circle(g, r()*W, GROUND+28 + r()*40, 1.6); g.fill(); }
    drawCastle(g,T,r);
    for(let i=0;i<3200;i++){ g.fillStyle = r()<.5 ? 'rgba(0,0,0,.05)' : 'rgba(255,255,255,.05)'; g.fillRect(r()*W, r()*H, 1.3, 1.3); }
    const vg = g.createRadialGradient(W/2,H/2,H*.45,W/2,H/2,W*.62); vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,0,.22)');
    g.fillStyle = vg; g.fillRect(0,0,W,H);
    bgCache[theme] = c;
    return c;
  }
  function drawFlag(g,T,t){
    g.strokeStyle = T.ink; g.lineWidth = 2.5; g.beginPath(); g.moveTo(59,57); g.lineTo(59,10); g.stroke();
    g.fillStyle = T.ink; circle(g,59,9,2.6); g.fill();
    const n = 10, L = 38, top = [], bot = [];
    for(let i=0;i<=n;i++){ const k = i/n, w = Math.sin(t*3.2 - i*.7)*2.6*k; top.push([60+k*L, 13+w]); bot.push([60+k*L, 35+w]); }
    g.beginPath(); top.forEach(([x,y],i) => i ? g.lineTo(x,y) : g.moveTo(x,y)); for(let i=n;i>=0;i--) g.lineTo(bot[i][0], bot[i][1]); g.closePath();
    g.fillStyle = T.banner; g.fill(); g.strokeStyle = T.ink; g.lineWidth = 1.5; g.stroke();
    const cx = top[5][0], cy = (top[5][1]+bot[5][1])/2;
    g.fillStyle = '#f3ecd8'; g.strokeStyle = T.ink; g.lineWidth = 1;
    g.beginPath(); g.moveTo(cx,cy-4); g.lineTo(cx-8,cy-6); g.lineTo(cx-8,cy+4); g.lineTo(cx,cy+6); g.closePath(); g.fill(); g.stroke();
    g.beginPath(); g.moveTo(cx,cy-4); g.lineTo(cx+8,cy-6); g.lineTo(cx+8,cy+4); g.lineTo(cx,cy+6); g.closePath(); g.fill(); g.stroke();
  }
  function drawArcher(g,T,pull){
    const x = 132, y = 117;
    g.lineJoin = 'round'; g.strokeStyle = T.ink; g.lineWidth = 1.6;
    g.fillStyle = '#3b3530'; g.fillRect(x-5,y-9,3.5,9); g.fillRect(x+1.5,y-9,3.5,9);
    g.fillStyle = T.tunic; g.beginPath(); g.moveTo(x-8,y-7); g.lineTo(x+8,y-7); g.lineTo(x+5.5,y-25); g.lineTo(x-5.5,y-25); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = '#6b4a2b'; g.fillRect(x-7,y-14,14,2.6);
    g.fillStyle = '#7a5634'; g.fillRect(x-11,y-27,4,15); g.strokeRect(x-11,y-27,4,15);
    g.strokeStyle = '#e9e1cc'; g.lineWidth = 1; [x-10,x-8.5].forEach(ax => { g.beginPath(); g.moveTo(ax,y-27); g.lineTo(ax-1,y-32); g.stroke(); });
    g.strokeStyle = T.ink; g.lineWidth = 1.6;
    g.fillStyle = '#e6c3a0'; circle(g,x+1,y-30,4.8); g.fill(); g.stroke();
    g.fillStyle = T.hood; g.beginPath(); g.arc(x,y-30.5,6.2,Math.PI*.85,Math.PI*1.95); g.lineTo(x-3,y-25); g.lineTo(x-7,y-25); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = T.ink; circle(g,x+3.4,y-30,.9); g.fill();
    const bx = x+6, by = y-22, R = 12;
    const tx = bx + Math.cos(-1.15)*R, ty = by + Math.sin(-1.15)*R, btx = bx + Math.cos(1.15)*R, bty = by + Math.sin(1.15)*R;
    const mx = Math.min(tx,btx) - pull*7;
    g.strokeStyle = '#e9e1cc'; g.lineWidth = 1; g.beginPath(); g.moveTo(tx,ty); g.lineTo(mx,by); g.lineTo(btx,bty); g.stroke();
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 2.4; g.beginPath(); g.arc(bx,by,R,-1.15,1.15); g.stroke();
    g.strokeStyle = T.ink; g.lineWidth = 1.8; g.beginPath(); g.moveTo(x+3,y-21); g.lineTo(bx+R-1,by); g.stroke();
    if(pull > .05){ g.strokeStyle = '#5b4026'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(mx,by); g.lineTo(bx+R+8,by); g.stroke(); }
  }
  function drawEnemy(g,e,T,target){
    if(e.state === 'gone') return;
    const s = e.scale || 1, kind = e.kind || 'grunt';
    let alpha = 1, rot = 0, dy = 0;
    if(e.state === 'die'){ const p = Math.min(1, e.dt/.55); alpha = 1-p; rot = p*1.1; dy = -Math.sin(p*Math.PI)*12; }
    if(e.state === 'attack' && e.dt > .7){ alpha = Math.max(0, 1-(e.dt-.7)/.25); }
    g.save(); g.globalAlpha = alpha;
    g.fillStyle = 'rgba(0,0,0,.25)'; ell(g, e.x, GROUND+8, 14*s, 3.5); g.fill();
    if(target){
      g.strokeStyle = '#e0aa3e'; g.lineWidth = 2.5; ell(g, e.x, GROUND+8, 19*s, 5); g.stroke();
      const by = GROUND - 34*s - 14 + Math.sin(e.t*5)*2.5;
      g.fillStyle = '#e0aa3e'; g.strokeStyle = T.ink; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(e.x-6,by-6); g.lineTo(e.x+6,by-6); g.lineTo(e.x,by+2); g.closePath(); g.fill(); g.stroke();
    }
    g.translate(e.x, GROUND+6+dy); g.rotate(rot);
    const moving = e.state === 'walk' && (e.stun||0) <= 0;
    const wk = moving ? e.t*(kind === 'runner' ? 14 : kind === 'boss' ? 6 : 9) : 0;
    g.fillStyle = T.ink;
    const fs = Math.max(1, s*.9);
    ell(g, (-5 + Math.sin(wk)*3)*fs, 0, 4.6*fs, 2.6*fs); g.fill();
    ell(g, ( 5 - Math.sin(wk)*3)*fs, 0, 4.6*fs, 2.6*fs); g.fill();
    g.translate(0, -Math.abs(Math.sin(wk))*2 - 1);
    if(kind === 'runner' && moving) g.rotate(-.13);
    const h = 30*s, w = 13*s;
    const bodyPath = () => { g.beginPath(); g.moveTo(0,-h); g.bezierCurveTo(w*1.25,-h, w*1.3,-3, w*.8,-2); g.quadraticCurveTo(0,1,-w*.8,-2); g.bezierCurveTo(-w*1.3,-3,-w*1.25,-h,0,-h); g.closePath(); };
    if(kind === 'boss'){
      const fl = Math.sin(e.t*3)*3;
      g.beginPath(); g.moveTo(-w*.55,-h*.78); g.quadraticCurveTo(w*1.2,-h*.85, w*1.75+fl,-h*.05); g.lineTo(w*1.2+fl*.6,-1); g.quadraticCurveTo(w*.6,-h*.2, w*.1,-h*.55); g.closePath();
      g.fillStyle = '#7a2b2b'; g.fill(); g.strokeStyle = T.ink; g.lineWidth = 2; g.stroke();
    }
    if(kind === 'runner'){
      const f1 = Math.sin(e.t*13)*3, f2 = Math.sin(e.t*13+1.3)*4;
      g.beginPath(); g.moveTo(w*.35,-h*.6); g.quadraticCurveTo(w*1.5,-h*.72+f1, w*2.5,-h*.55+f2); g.lineTo(w*2.35,-h*.4+f2);
      g.quadraticCurveTo(w*1.4,-h*.48+f1, w*.4,-h*.45); g.closePath();
      g.fillStyle = '#c9932e'; g.fill(); g.strokeStyle = T.ink; g.lineWidth = 1.5; g.stroke();
    }
    const hasShield = kind === 'shield' && e.hp >= 2;
    if(!hasShield && kind !== 'runner'){
      g.save(); g.translate(-w*.95, -h*.42);
      const swing = e.state === 'attack' ? -1.3 + Math.sin(Math.min(e.dt,.6)/.6*Math.PI)*1.6 : -.45 + Math.sin(wk)*.15;
      g.rotate(swing); const cs = Math.max(1, s*.85); g.scale(cs, cs);
      g.fillStyle = '#7a5634'; g.strokeStyle = T.ink; g.lineWidth = 1.5;
      g.fillRect(-1.6,-15,3.4,15); g.strokeRect(-1.6,-15,3.4,15);
      ell(g,0,-17,4.2,5.6); g.fill(); g.stroke();
      if(kind === 'boss'){ g.fillStyle = '#c9cfd2'; [[-3,-19],[3,-15],[-2,-13]].forEach(([x,y]) => { g.beginPath(); g.moveTo(x,y); g.lineTo(x-3*Math.sign(x||1),y-1.5); g.lineTo(x,y+2); g.closePath(); g.fill(); g.stroke(); }); }
      g.restore();
    }
    bodyPath(); g.fillStyle = e.color; g.fill();
    g.strokeStyle = T.ink; g.lineWidth = 2; g.stroke();
    g.save(); bodyPath(); g.clip(); g.fillStyle = 'rgba(0,0,0,.16)'; ell(g, w*.9, -h*.4, w*.6, h*.75); g.fill(); g.restore();
    g.fillStyle = 'rgba(255,255,255,.14)'; ell(g, -1, -h*.28, w*.55, h*.2); g.fill();
    if(kind === 'runner'){ g.fillStyle = '#c9932e'; g.strokeStyle = T.ink; g.lineWidth = 1.3; g.beginPath(); g.ellipse(0,-h*.5,w*.78,h*.08,0,0,Math.PI*2); g.fill(); g.stroke(); }
    g.strokeStyle = T.ink;
    if(kind === 'shield'){
      g.beginPath(); g.arc(0,-h*.8, w*.92, Math.PI*1.04, Math.PI*1.96); g.closePath();
      g.fillStyle = '#8b959a'; g.fill(); g.lineWidth = 1.8; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.25)'; g.beginPath(); g.arc(0,-h*.8, w*.7, Math.PI*1.2, Math.PI*1.45); g.lineTo(0,-h*.8); g.closePath(); g.fill();
      g.fillStyle = '#6d777c'; g.fillRect(-w*.95,-h*.84,w*1.9,h*.07); g.strokeRect(-w*.95,-h*.84,w*1.9,h*.07);
      g.fillStyle = '#8b959a'; g.beginPath(); g.moveTo(-2,-h*.8-w*.9); g.lineTo(0,-h*.8-w*.9-6); g.lineTo(2,-h*.8-w*.9); g.closePath(); g.fill(); g.stroke();
    }else{
      g.fillStyle = '#e8dfc9'; g.lineWidth = 1.5;
      const horn = side => { g.beginPath(); g.moveTo(side*w*.32,-h*.9); g.quadraticCurveTo(side*w*.95,-h*1.05, side*w*.78,-h*1.32); g.quadraticCurveTo(side*w*.55,-h*1.08, side*w*.08,-h*.98); g.closePath(); g.fill(); g.stroke(); };
      const hn = e.horn || 0;
      if(hn === 0){ horn(-1); horn(1); }
      else if(hn === 1){ g.beginPath(); g.moveTo(-w*.25,-h*.97); g.quadraticCurveTo(-w*.1,-h*1.35, w*.18,-h*1.38); g.quadraticCurveTo(w*.05,-h*1.1, w*.25,-h*.97); g.closePath(); g.fill(); g.stroke(); }
      else { g.fillStyle = e.color; [-1,1].forEach(sd => { ell(g, sd*w*.7, -h*.92, w*.32, h*.2); g.fill(); g.stroke(); }); }
      if(kind === 'boss'){
        g.beginPath(); g.moveTo(-w*.42,-h*.96); g.lineTo(-w*.48,-h*1.16); g.lineTo(-w*.22,-h*1.05); g.lineTo(0,-h*1.22); g.lineTo(w*.22,-h*1.05); g.lineTo(w*.48,-h*1.16); g.lineTo(w*.42,-h*.96); g.closePath();
        g.fillStyle = '#d9a640'; g.fill(); g.lineWidth = 1.6; g.stroke();
        g.fillStyle = '#a8463a'; circle(g,0,-h*1.03,1.8); g.fill();
      }
    }
    const ey = -h*.62, ex = -w*.3, er = kind === 'boss' ? 1.35 : 1;
    const stunned = (e.stun||0) > 0;
    [[ex-4*er,3.3*er],[ex+4*er,3.6*er]].forEach(([cx,rr]) => {
      g.fillStyle = kind === 'boss' ? '#f2d8a0' : '#f4efe2'; ell(g,cx,ey,rr,rr*1.12); g.fill(); g.strokeStyle = T.ink; g.lineWidth = 1.2; g.stroke();
      if(stunned){ g.strokeStyle = T.ink; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx-1.8,ey-1.8); g.lineTo(cx+1.8,ey+1.8); g.moveTo(cx+1.8,ey-1.8); g.lineTo(cx-1.8,ey+1.8); g.stroke(); }
      else { g.fillStyle = kind === 'boss' ? '#a8463a' : T.eye; circle(g,cx-1.1*er,ey+.3,1.7*er); g.fill(); }
    });
    g.strokeStyle = T.ink; g.lineWidth = 1.6;
    g.beginPath(); g.moveTo(ex-7*er,ey-5.5*er); g.lineTo(ex-1.5*er,ey-3.5*er); g.moveTo(ex+1.5*er,ey-3.5*er); g.lineTo(ex+7.5*er,ey-5.8*er); g.stroke();
    g.lineWidth = 1.3; g.beginPath(); g.moveTo(ex-4*er,-h*.33); g.lineTo(ex-2*er,-h*.37); g.lineTo(ex,-h*.33); g.lineTo(ex+2*er,-h*.37); g.lineTo(ex+4*er,-h*.33); g.stroke();
    if(hasShield){
      const sx = -w*1.02, sy = -h*.4, sr = w*.82;
      g.fillStyle = '#8a5a34'; circle(g,sx,sy,sr); g.fill();
      g.save(); circle(g,sx,sy,sr); g.clip(); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 1;
      for(let k=-2;k<=2;k++){ g.beginPath(); g.moveTo(sx+k*sr*.4, sy-sr); g.lineTo(sx+k*sr*.4, sy+sr); g.stroke(); } g.restore();
      g.strokeStyle = '#5d676c'; g.lineWidth = 3; circle(g,sx,sy,sr-1.5); g.stroke();
      g.strokeStyle = T.ink; g.lineWidth = 1.3; circle(g,sx,sy,sr); g.stroke();
      g.fillStyle = '#c9b48a'; circle(g,sx,sy,sr*.24); g.fill(); g.stroke();
    }
    if((e.flash||0) > 0){ g.globalAlpha = alpha * Math.min(1, e.flash/.12) * .7; g.fillStyle = '#fff'; bodyPath(); g.fill(); }
    g.restore();
    const isBoss = kind === 'boss' && e.words;
    if((e.maxHp > 1 || isBoss) && e.state === 'walk'){
      const py = GROUND - 34*s - (target ? 30 : 16), n = isBoss ? (e.words.length||3) : e.maxHp;
      for(let k=0;k<n;k++){
        const px = e.x + (k - (n-1)/2)*(isBoss ? 18 : 11), d = isBoss ? 1.5 : 1;
        g.fillStyle = isBoss ? (k < (e.charge||0) ? '#e0aa3e' : 'rgba(255,255,255,.55)') : (k < e.hp ? '#a8463a' : 'rgba(255,255,255,.55)'); g.strokeStyle = T.ink; g.lineWidth = 1.3;
        g.beginPath(); g.moveTo(px,py-5*d); g.lineTo(px+4.5*d,py); g.lineTo(px,py+5*d); g.lineTo(px-4.5*d,py); g.closePath(); g.fill(); g.stroke();
      }
    }
    if((e.stun||0) > 0){
      g.fillStyle = '#e0aa3e';
      for(let k=0;k<3;k++){ const a = e.t*6 + k*2.1; circle(g, e.x + Math.cos(a)*10*s, GROUND - 32*s - 4 + Math.sin(a)*3, 2); g.fill(); }
    }
  }
  function drawArrow(g,x,y,ang,T,big){
    g.save(); g.translate(x,y); g.rotate(ang);
    if(big){ g.scale(2.8,2.8); g.fillStyle = 'rgba(242,196,90,.35)'; g.beginPath(); g.moveTo(9,0); g.lineTo(-40,-5); g.lineTo(-40,5); g.closePath(); g.fill(); }
    g.strokeStyle = '#5b4026'; g.lineWidth = 1.8; g.beginPath(); g.moveTo(-15,0); g.lineTo(5,0); g.stroke();
    g.fillStyle = T.ink; g.beginPath(); g.moveTo(9,0); g.lineTo(3,-3); g.lineTo(3,3); g.closePath(); g.fill();
    g.fillStyle = '#e9e1cc'; g.beginPath(); g.moveTo(-15,0); g.lineTo(-19,-3.5); g.lineTo(-12,0); g.lineTo(-19,3.5); g.closePath(); g.fill();
    g.restore();
  }

  return { W, H, GROUND, WALL_X, STOP_X, DPR, T, THEMES, makeBg, drawFlag, drawArcher, drawEnemy, drawArrow, drawCrack, circle, ell };
})();
