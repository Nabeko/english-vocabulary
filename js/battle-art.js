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
    desert:{ sky:['#e8c27a','#f6e6b8'], glow:'rgba(255,238,190,.55)', far:'#d4a862', mid:'#c2904a', near:'#a8723a',
             ground:'#d9ad5e', groundD:'#b88a42', path:'#e8cf96', pathD:'#c7a968', stone:'#cbb28a', stoneL:'#ddc69e', stoneD:'#8f7652',
             gate:'#5a4328', win:'#2b2016', banner:'#c9622e', ink:'#2e2214', tunic:'#9a6a3a', hood:'#6b4826',
             enemy:['#b07a3e', '#8a5a2e', '#c49452'], eye:'#2e2214' },
    snow:{ sky:['#bcd4e6','#eef5fa'], glow:'rgba(220,240,255,.6)', far:'#a8c0d4', mid:'#8aa8c0', near:'#6c8ca6',
           ground:'#e4eef4', groundD:'#c2d6e2', path:'#d4e2ea', pathD:'#aec4d2', stone:'#c4d2d8', stoneL:'#d8e4e8', stoneD:'#8498a2',
           gate:'#3e4650', win:'#1c2630', banner:'#4a7aa6', ink:'#20282e', tunic:'#3a5c7a', hood:'#294258',
           enemy:['#6c8ea8', '#8296a8', '#5a7892'], eye:'#20282e' },
    volcano:{ sky:['#4a1f1a','#8a3824'], glow:'rgba(255,140,60,.55)', far:'#5e2a20', mid:'#7a3424', near:'#8f3e26',
              ground:'#3a241e', groundD:'#2a1812', path:'#5e3626', pathD:'#3f261a', stone:'#4a3832', stoneL:'#5c463e', stoneD:'#281b16',
              gate:'#1c1210', win:'#e0622a', banner:'#d9432a', ink:'#160e0c', tunic:'#7a2e22', hood:'#4a1c16',
              enemy:['#9a3a28', '#6e2a3e', '#b0502a'], eye:'#e0622a' },
    sakura:{ sky:['#f3c9d6','#fbe8ee'], glow:'rgba(255,220,232,.6)', far:'#e0a8bc', mid:'#d08ca6', near:'#b86e8e',
             ground:'#8aa868', groundD:'#6e8a4e', path:'#e6cdb0', pathD:'#c7a988', stone:'#cbb4bc', stoneL:'#ddc6cc', stoneD:'#8c6e78',
             gate:'#4a3238', win:'#2b1f24', banner:'#d9638a', ink:'#241a1e', tunic:'#8a4a68', hood:'#5c2e44',
             enemy:['#c47a9a', '#9a5a7e', '#d6a0b6'], eye:'#241a1e' },
    swamp:{ sky:['#5c6e4a','#8a9a68'], glow:'rgba(200,220,150,.4)', far:'#4a5c3a', mid:'#3e4e2e', near:'#2e3c22',
            ground:'#3a4428', groundD:'#2a3218', path:'#5a6038', pathD:'#424a26', stone:'#565c48', stoneL:'#686e58', stoneD:'#32362a',
            gate:'#201e14', win:'#14160e', banner:'#6a8a3e', ink:'#14160e', tunic:'#4a5c2e', hood:'#2e3c1c',
            enemy:['#4e6a3a', '#3a5048', '#5c6e2e'], eye:'#9ad84a' },
    candy:{ sky:['#f6b8e0','#fde6f4'], glow:'rgba(255,230,250,.6)', far:'#e89ccb', mid:'#d87fb8', near:'#c266a0',
            ground:'#f4d7e8', groundD:'#e0b6d2', path:'#d9b8e8', pathD:'#c096d6', stone:'#e8c9dc', stoneL:'#f2dcea', stoneD:'#b890a8',
            gate:'#7a4a68', win:'#4a2c40', banner:'#e0548a', ink:'#3a2232', tunic:'#c266a0', hood:'#8a4470',
            enemy:['#e08ab0', '#a874c8', '#f0a8c8'], eye:'#3a2232' },
    'ice-cave':{ sky:['#1c3a52','#3a6a8a'], glow:'rgba(150,220,255,.5)', far:'#243e54', mid:'#2e5068', near:'#245060',
                 ground:'#1e3444', groundD:'#152634', path:'#2e5868', pathD:'#20404e', stone:'#3a6478', stoneL:'#4e7c90', stoneD:'#1c3240',
                 gate:'#101c26', win:'#60d0f0', banner:'#3e9ac2', ink:'#0e1a22', tunic:'#2a5c74', hood:'#1a3e50',
                 enemy:['#3a7ca0', '#2e5a8e', '#4e9cba'], eye:'#60d0f0' },
    twilight:{ sky:['#3a2e5c','#6e4a7a'], glow:'rgba(220,180,255,.45)', far:'#3e2f56', mid:'#4a3868', near:'#382a4e',
               ground:'#2e2444', groundD:'#201834', path:'#4e3e68', pathD:'#382c50', stone:'#4a3e5c', stoneL:'#5c4e70', stoneD:'#2a2238',
               gate:'#18121e', win:'#c48ae0', banner:'#9a5ac2', ink:'#120e1a', tunic:'#4e3a6e', hood:'#302048',
               enemy:['#6e4a8e', '#8a4a7a', '#5a3a9e'], eye:'#c48ae0' },
    jungle:{ sky:['#1e4a3a','#3e7a5a'], glow:'rgba(180,255,210,.4)', far:'#245c42', mid:'#1c4a34', near:'#163a28',
             ground:'#1a3a26', groundD:'#12281a', path:'#4a6e3e', pathD:'#345228', stone:'#4e6a52', stoneL:'#5e7c62', stoneD:'#304238',
             gate:'#1a2816', win:'#0e180e', banner:'#8a9e2e', ink:'#101c12', tunic:'#3e6a3a', hood:'#244a22',
             enemy:['#5a8a3e', '#2e6e4a', '#7a9a2e'], eye:'#101c12' },
    haunted:{ sky:['#26242e','#4a4658'], glow:'rgba(160,220,140,.3)', far:'#2e2c3a', mid:'#242230', near:'#1a1824',
              ground:'#242230', groundD:'#18161e', path:'#3a3644', pathD:'#2a2634', stone:'#4a4656', stoneL:'#5c5868', stoneD:'#28242e',
              gate:'#0e0c12', win:'#9ae88a', banner:'#6e5a8e', ink:'#0a0810', tunic:'#3a3448', hood:'#201c2c',
              enemy:['#6a7e4e', '#8e6a9e', '#4e5e7e'], eye:'#9ae88a' },
    crystal:{ sky:['#2a3a5c','#5a6ea8'], glow:'rgba(180,210,255,.55)', far:'#3e4e78', mid:'#344268', near:'#283658',
              ground:'#263454', groundD:'#1a2440', path:'#4e5e8e', pathD:'#384670', stone:'#5a6ea0', stoneL:'#7284b4', stoneD:'#34406a',
              gate:'#161e36', win:'#8ac8ff', banner:'#6e9ae0', ink:'#0e1424', tunic:'#3e5a8a', hood:'#283a60',
              enemy:['#5a7ec0', '#7a5ad0', '#4aa0c8'], eye:'#8ac8ff' },
    coral:{ sky:['#2e6e8a','#4ea0b8'], glow:'rgba(255,200,220,.45)', far:'#2a7a8e', mid:'#1e6276', near:'#164e60',
            ground:'#124a5a', groundD:'#0c3846', path:'#3a8a7e', pathD:'#2a6a60', stone:'#4a8a8a', stoneL:'#5c9e9c', stoneD:'#2e5c5c',
            gate:'#0e2e3a', win:'#e07a9e', banner:'#e8647e', ink:'#082028', tunic:'#2a7a6a', hood:'#1a5a4e',
            enemy:['#e8826e', '#d85a9a', '#4ec8c0'], eye:'#082028' },
    steampunk:{ sky:['#6a4e38','#a8825a'], glow:'rgba(255,210,140,.4)', far:'#5c4432', mid:'#4a3828', near:'#3a2c1e',
                ground:'#3e3022', groundD:'#2c2216', path:'#6e5438', pathD:'#523e28', stone:'#6a5a42', stoneL:'#7e6c50', stoneD:'#443a2a',
                gate:'#1e160e', win:'#e8a84a', banner:'#b8702e', ink:'#160f09', tunic:'#6e5230', hood:'#463420',
                enemy:['#9a6a3e', '#7a5a52', '#b8863e'], eye:'#e8a84a' },
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
  // 主題造型皆沿用原版城堡的結構（雙塔位置、城門拱形、窗戶座標、磚牆排法），
  // 只替換表面紋理與塔頂裝飾，確保風格統一、不會「看起來隨便」。
  function drawCastleBase(g,T,r,opts){
    opts = opts || {};
    const base = GROUND + 8;
    const texture = opts.texture || bricks;
    g.lineJoin = 'round'; g.strokeStyle = T.ink;
    // 右塔（含城門）
    g.fillStyle = T.stone; g.fillRect(0,128,WALL_X,base-128);
    texture(g,0,128,WALL_X,base-128,r,T);
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
    // 左塔
    g.fillStyle = T.stoneL; g.fillRect(20,68,78,base-68);
    texture(g,20,68,78,base-68,r,T);
    g.fillStyle = 'rgba(0,0,0,.14)'; g.fillRect(20,68,11,base-68);
    g.lineWidth = 2; g.strokeStyle = T.ink; g.strokeRect(20,68,78,base-68);
    for(let x=20; x+12<=98; x+=16.5){ g.fillStyle = T.stoneL; g.fillRect(x,56,12,12); g.strokeRect(x,56,12,12); }
    g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(20,66,78,3);
    [[59,92],[59,152]].forEach(([cx,cy]) => {
      g.beginPath(); g.moveTo(cx-5,cy+20); g.lineTo(cx-5,cy+5); g.arc(cx,cy+5,5,Math.PI,0); g.lineTo(cx+5,cy+20); g.closePath();
      g.fillStyle = T.win; g.fill(); g.lineWidth = 1.8; g.stroke();
    });
    if(opts.topper) opts.topper(g,T,r,base);
    if(!T.night){
      g.fillStyle = '#4f7a4a';
      for(let i=0;i<70;i++){ const x = 20 + r()*70, y = base - r()*r()*120; ell(g,x,y,2.2+r()*2,1.6+r()*1.4); g.fill(); }
      for(let i=0;i<40;i++){ const x = r()*WALL_X, y = base - r()*r()*30; ell(g,x,y,2+r()*2,1.5); g.fill(); }
    }
  }
  function drawCastle(g,T,r){ drawCastleBase(g,T,r); }
  // jungle：石牆改木紋理，塔頂加樹冠與藤蔓垂掛
  function texWood(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.strokeStyle = T.stoneD; g.lineWidth = 1;
    for(let xx=x+4; xx<x+w; xx+=9){ g.beginPath(); g.moveTo(xx,y); g.lineTo(xx+(r()*3-1.5),y+h); g.stroke(); }
    for(let yy=y+14; yy<y+h; yy+=22){ g.strokeStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.moveTo(x,yy); g.lineTo(x+w,yy); g.stroke(); }
    g.restore();
  }
  function topperJungle(g,T,r,base){
    const leafCol = '#3a8a4e', leafMid = '#2e7040', leafD = '#1e5230';
    [[59,56,30,18],[124,117,24,14]].forEach(([cx,cy,rx,ry]) => {
      g.fillStyle = leafD; ell(g,cx+3,cy-ry*.6,rx,ry); g.fill();
      g.fillStyle = leafMid; ell(g,cx-4,cy-ry*1.1,rx*.8,ry*.8); g.fill();
      g.fillStyle = leafCol; ell(g,cx+2,cy-ry*1.5,rx*.6,ry*.6); g.fill();
      g.strokeStyle = T.ink; g.lineWidth = 1.6; ell(g,cx+3,cy-ry*.6,rx,ry); g.stroke();
    });
    g.strokeStyle = leafD; g.lineWidth = 1.4;
    for(let i=0;i<4;i++){ const x = 24 + r()*70, y0 = 70; const len = 10+r()*16; g.beginPath(); g.moveTo(x,y0); g.quadraticCurveTo(x+(r()*4-2),y0+len*.6,x+(r()*3-1.5),y0+len); g.stroke(); }
  }
  // ocean/coral：石牆改貝殼螺旋紋理，塔頂加螺旋尖頂
  function texShell(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.strokeStyle = T.stoneD; g.lineWidth = 1.2;
    const cx = x+w/2;
    for(let k=0;k<8;k++){ g.beginPath(); g.arc(cx, y+h-6-k*16, 6+k*5, Math.PI*.1, Math.PI*1.3); g.stroke(); }
    g.restore();
  }
  function topperShell(g,T,r,base){
    [[59,56,16],[124,117,14]].forEach(([cx,cy,rad]) => {
      g.beginPath(); g.moveTo(cx-rad*.5,cy+rad); g.quadraticCurveTo(cx-rad*.6,cy-rad*.3,cx,cy-rad); g.quadraticCurveTo(cx+rad*.6,cy-rad*.3,cx+rad*.5,cy+rad); g.closePath();
      g.fillStyle = T.stoneL; g.fill(); g.lineWidth = 1.8; g.strokeStyle = T.ink; g.stroke();
      g.strokeStyle = T.stoneD; g.lineWidth = 1.2;
      for(let k=0;k<3;k++){ g.beginPath(); g.arc(cx,cy+rad-4-k*7, 3+k*3, Math.PI*.2, Math.PI*1.1); g.stroke(); }
    });
  }
  // haunted：石牆改腐朽木紋，塔頂加破損尖塔與蜘蛛網
  function texHaunted(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1;
    for(let xx=x+3; xx<x+w; xx+=11){ g.beginPath(); g.moveTo(xx,y); g.lineTo(xx+(r()*5-2.5),y+h); g.stroke(); }
    for(let i=0;i<6;i++){ const xx=x+r()*w, yy=y+r()*h; g.strokeStyle='rgba(0,0,0,.3)'; g.beginPath(); g.moveTo(xx,yy); g.lineTo(xx+r()*8-4,yy+r()*8-4); g.stroke(); }
    g.restore();
  }
  function topperHaunted(g,T,r,base){
    [[59,56,16],[124,117,11]].forEach(([cx,cy,h]) => {
      g.beginPath(); g.moveTo(cx-10,cy); g.lineTo(cx-2,cy-h); g.lineTo(cx+10,cy); g.closePath();
      g.fillStyle = T.stoneD; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
    });
    // 蜘蛛網裝飾
    g.strokeStyle = 'rgba(220,220,230,.5)'; g.lineWidth = 1;
    const cx=20, cy=68;
    for(let a=0;a<Math.PI/2;a+=Math.PI/8){ g.beginPath(); g.moveTo(cx,cy); g.lineTo(cx+Math.cos(a)*16,cy+Math.sin(a)*16); g.stroke(); }
    for(let k=4;k<=16;k+=4){ g.beginPath(); g.arc(cx,cy,k,0,Math.PI/2); g.stroke(); }
  }
  // crystal/ice-cave：石牆改削面晶體紋理，塔頂加晶簇尖刺
  function texCrystal(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 1;
    for(let i=0;i<10;i++){ const xx=x+r()*w, yy=y+r()*h, s=6+r()*10; g.beginPath(); g.moveTo(xx,yy-s); g.lineTo(xx+s*.5,yy); g.lineTo(xx,yy+s); g.lineTo(xx-s*.5,yy); g.closePath(); g.stroke(); }
    g.restore();
  }
  function topperCrystal(g,T,r,base){
    [[49,56],[69,56],[114,117],[134,117]].forEach(([cx,cy],i) => {
      const h = 14 + (i%2)*10;
      g.beginPath(); g.moveTo(cx-6,cy); g.lineTo(cx,cy-h); g.lineTo(cx+6,cy); g.closePath();
      g.fillStyle = i%2 ? T.stoneL : T.stone; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
      g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = 1; g.beginPath(); g.moveTo(cx,cy-h); g.lineTo(cx,cy); g.stroke();
    });
  }
  // desert：沙岩塊紋理（加風化高光／陰影漸層），塔頂改清真寺式洋蔥圓頂+彩釉窗飾+新月
  function texSand(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    const sg = g.createLinearGradient(0,y,0,y+h);
    sg.addColorStop(0,'rgba(255,255,255,.10)'); sg.addColorStop(1,'rgba(0,0,0,.10)');
    g.fillStyle = sg; g.fillRect(x,y,w,h);
    g.lineWidth = 1;
    for(let row=0, yy=y; yy<y+h; row++, yy+=15){
      let xx = x - (row%2 ? 14 : 3);
      while(xx < x+w){
        const bw = 22 + r()*14;
        g.strokeStyle = T.stoneD; g.globalAlpha = .35; g.strokeRect(xx+.5,yy+.5,bw,15);
        g.globalAlpha = .18; g.fillStyle = r()<.5 ? '#fff' : '#000'; g.fillRect(xx+1,yy+1,bw-2,3);
        g.globalAlpha = 1;
        xx += bw;
      }
    }
    g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 1;
    for(let i=0;i<8;i++){ const xx=x+r()*w, yy=y+r()*h; g.beginPath(); g.moveTo(xx,yy); g.lineTo(xx+r()*6-3,yy+r()*6-3); g.stroke(); }
    g.restore();
  }
  function topperDesert(g,T,r,base){
    [[59,56,15],[124,117,12]].forEach(([cx,cy,rad]) => {
      // 洋蔥形圓頂（二次曲線收尖）
      g.beginPath();
      g.moveTo(cx-rad,cy);
      g.bezierCurveTo(cx-rad,cy-rad*.9, cx-rad*.55,cy-rad*1.15, cx-rad*.18,cy-rad*1.45);
      g.lineTo(cx+rad*.18,cy-rad*1.45);
      g.bezierCurveTo(cx+rad*.55,cy-rad*1.15, cx+rad,cy-rad*.9, cx+rad,cy);
      g.closePath();
      const dg = g.createLinearGradient(cx-rad,cy-rad*1.4,cx+rad,cy);
      dg.addColorStop(0, T.stoneL); dg.addColorStop(.5, T.banner); dg.addColorStop(1, T.stoneD);
      g.fillStyle = dg; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
      // 鎏金紋線
      g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx,cy-rad*1.4); g.quadraticCurveTo(cx-rad*.3,cy-rad*.7,cx-rad*.6,cy-2); g.stroke();
      // 底座彩釉窗飾（小拱窗）
      g.fillStyle = T.win; g.beginPath(); g.moveTo(cx-4,cy); g.lineTo(cx-4,cy-6); g.arc(cx,cy-6,4,Math.PI,0); g.lineTo(cx+4,cy); g.closePath(); g.fill();
      g.strokeStyle = T.ink; g.lineWidth = 1; g.stroke();
      // 尖塔柱+新月
      g.strokeStyle = T.ink; g.lineWidth = 1.6; g.beginPath(); g.moveTo(cx,cy-rad*1.45); g.lineTo(cx,cy-rad*1.8); g.stroke();
      g.save(); g.translate(cx,cy-rad*1.9);
      g.fillStyle = '#f0d98a'; g.beginPath(); g.arc(0,0,3.2,Math.PI*.15,Math.PI*1.95); g.arc(1.6,0,2.6,Math.PI*1.2,Math.PI*.1,true); g.closePath(); g.fill();
      g.restore();
    });
  }
  // snow：覆雪磚牆（更細緻的積雪漸層與反光），塔頂改尖頂雪堆+透亮冰柱+霜光
  function texSnowWall(g,x,y,w,h,r,T){
    bricks(g,x,y,w,h,r,T);
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    for(let xx=x; xx<x+w; xx+=10){
      const sh = 2+r()*3, sg = g.createLinearGradient(0,y,0,y+sh);
      sg.addColorStop(0,'rgba(255,255,255,.9)'); sg.addColorStop(1,'rgba(220,235,245,.3)');
      g.fillStyle = sg; g.fillRect(xx,y,8,sh);
    }
    g.strokeStyle = 'rgba(210,230,245,.85)'; g.lineWidth = 1.4;
    for(let i=0;i<5;i++){
      const xx = x+6+r()*(w-12), len = 5+r()*9;
      const ig = g.createLinearGradient(0,y+16,0,y+16+len);
      ig.addColorStop(0,'rgba(255,255,255,.95)'); ig.addColorStop(1,'rgba(180,215,235,.35)');
      g.strokeStyle = ig;
      g.beginPath(); g.moveTo(xx,y+16); g.lineTo(xx-.6,y+16+len*.6); g.lineTo(xx,y+16+len); g.stroke();
    }
    g.restore();
  }
  function topperSnow(g,T,r,base){
    [[59,56,15],[124,117,11]].forEach(([cx,cy,h]) => {
      g.beginPath(); g.moveTo(cx-9,cy); g.lineTo(cx,cy-h); g.lineTo(cx+9,cy); g.closePath();
      const rg = g.createLinearGradient(cx-9,cy-h,cx+9,cy);
      rg.addColorStop(0,T.stoneL); rg.addColorStop(1,T.stoneD);
      g.fillStyle = rg; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
      // 堆雪帽（不規則雪線，非純三角）
      g.beginPath(); g.moveTo(cx-9,cy);
      g.quadraticCurveTo(cx-6,cy-h*.45,cx-2,cy-h*.62); g.quadraticCurveTo(cx,cy-h*.72,cx+2,cy-h*.62);
      g.quadraticCurveTo(cx+5,cy-h*.5,cx,cy-h); g.quadraticCurveTo(cx-5,cy-h*.5,cx-2,cy-h*.3);
      g.quadraticCurveTo(cx+1,cy-h*.2,cx+9,cy); g.closePath();
      g.fillStyle = '#f3f9fd'; g.fill(); g.strokeStyle = 'rgba(190,220,238,.9)'; g.lineWidth = 1; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.7)'; circle(g,cx-3,cy-h*.55,1.3); g.fill();
    });
  }
  // volcano：龜裂黑曜岩紋理帶岩漿脈動光，塔頂改焦黑尖岩+熔岩裂縫發光
  function texObsidian(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    const bg = g.createLinearGradient(0,y,0,y+h);
    bg.addColorStop(0,'rgba(0,0,0,.15)'); bg.addColorStop(1,'rgba(224,98,42,.08)');
    g.fillStyle = bg; g.fillRect(x,y,w,h);
    g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
    for(let i=0;i<9;i++){
      const xx=x+r()*w, yy=y+r()*h; const segs=2+Math.floor(r()*3); let cx=xx, cy=yy;
      g.beginPath(); g.moveTo(cx,cy);
      for(let s=0;s<segs;s++){ cx += r()*10-5; cy += r()*8-4; g.lineTo(cx,cy); }
      g.stroke();
      g.strokeStyle = 'rgba(224,98,42,.5)'; g.lineWidth = .6; g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.5)'; g.lineWidth = 1;
    }
    for(let i=0;i<6;i++){ const xx=x+r()*w, yy=y+r()*h; const gg = g.createRadialGradient(xx,yy,0,xx,yy,3+r()*2); gg.addColorStop(0,'rgba(255,170,80,.55)'); gg.addColorStop(1,'rgba(224,98,42,0)'); g.fillStyle = gg; ell(g,xx,yy,3+r()*2,2); g.fill(); }
    g.restore();
  }
  function topperVolcano(g,T,r,base){
    [[59,56,16],[124,117,12]].forEach(([cx,cy,h]) => {
      g.beginPath(); g.moveTo(cx-8,cy); g.lineTo(cx-4,cy-h*.8); g.lineTo(cx-1,cy-h*.5); g.lineTo(cx,cy-h); g.lineTo(cx+2,cy-h*.55); g.lineTo(cx+5,cy-h*.85); g.lineTo(cx+9,cy); g.closePath();
      const vg = g.createLinearGradient(cx,cy-h,cx,cy);
      vg.addColorStop(0,'#3a241e'); vg.addColorStop(1,T.stoneD);
      g.fillStyle = vg; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
      g.strokeStyle = 'rgba(224,98,42,.9)'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(cx-2,cy-h*.3); g.lineTo(cx,cy-h*.55); g.lineTo(cx+2,cy-h*.2); g.stroke();
      const gg = g.createRadialGradient(cx+1,cy-h*.45,0,cx+1,cy-h*.45,5);
      gg.addColorStop(0,'rgba(255,190,100,.9)'); gg.addColorStop(1,'rgba(255,120,40,0)');
      g.fillStyle = gg; circle(g,cx+1,cy-h*.45,5); g.fill();
    });
  }
  // sakura：沿用石牆，塔頂加層疊花團樹冠＋柔和漸層＋飄落花瓣（更立體）
  function topperSakura(g,T,r,base){
    const petD = '#b86e8e', petMid = '#d08ca6', petCol = '#f3c9d6', petL = '#ffe4ee';
    [[59,56,27,17],[124,117,18,11]].forEach(([cx,cy,rx,ry]) => {
      g.fillStyle = petD; ell(g,cx+3,cy-ry*.55,rx,ry); g.fill();
      g.fillStyle = petMid; ell(g,cx-4,cy-ry*1.05,rx*.82,ry*.82); g.fill();
      g.fillStyle = petCol; ell(g,cx+2,cy-ry*1.5,rx*.6,ry*.62); g.fill();
      const hg = g.createRadialGradient(cx-rx*.3,cy-ry*1.9,1,cx,cy-ry*1.7,rx*.5);
      hg.addColorStop(0,petL); hg.addColorStop(1,'rgba(255,228,238,0)');
      g.fillStyle = hg; ell(g,cx-rx*.15,cy-ry*1.8,rx*.42,ry*.42); g.fill();
      g.strokeStyle = T.ink; g.lineWidth = 1.6; ell(g,cx+3,cy-ry*.55,rx,ry); g.stroke();
      // 細枝垂花
      g.strokeStyle = '#6b4a4a'; g.lineWidth = 1.2;
      for(let i=0;i<3;i++){ const dx = -rx*.6+i*rx*.6; g.beginPath(); g.moveTo(cx+dx,cy-ry*.1); g.quadraticCurveTo(cx+dx+3,cy+6,cx+dx,cy+12); g.stroke();
        g.fillStyle = petCol; circle(g,cx+dx,cy+13,1.6); g.fill(); }
    });
    g.fillStyle = 'rgba(255,220,232,.9)';
    for(let i=0;i<12;i++){ const x = 18+r()*128, y = 50+r()*150, s=1.6+r()*1.4; g.save(); g.translate(x,y); g.rotate(r()*6.28); ell(g,0,0,s,s*.6); g.fill(); g.restore(); }
  }
  // swamp：青苔藤蔓紋理（加漸層濕潤感），塔頂改精緻毒菇叢+發光孢子+纏繞藤蔓
  function texMoss(g,x,y,w,h,r,T){
    bricks(g,x,y,w,h,r,T);
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    for(let i=0;i<14;i++){
      const xx=x+r()*w, yy=y+r()*h, mg = g.createRadialGradient(xx,yy,0,xx,yy,4+r()*4);
      mg.addColorStop(0,'rgba(100,140,50,.55)'); mg.addColorStop(1,'rgba(70,100,40,0)');
      g.fillStyle = mg; ell(g,xx,yy,3+r()*4,2+r()*2); g.fill();
    }
    g.strokeStyle = 'rgba(60,90,30,.65)'; g.lineWidth = 1.3;
    for(let i=0;i<4;i++){
      const xx=x+6+r()*(w-12);
      g.beginPath(); g.moveTo(xx,y); g.quadraticCurveTo(xx+(r()*6-3),y+h*.5,xx+(r()*4-2),y+h); g.stroke();
      for(let k=0;k<3;k++){ g.fillStyle='rgba(90,130,50,.7)'; circle(g, xx+(r()*8-4), y+h*.2+k*h*.25, 1.4); g.fill(); }
    }
    g.restore();
  }
  function topperSwamp(g,T,r,base){
    [[59,56],[124,117]].forEach(([cx,cy],i) => {
      g.strokeStyle = '#3a4e28'; g.lineWidth = 2.6;
      g.beginPath(); g.moveTo(cx,cy); g.quadraticCurveTo(cx+6,cy-10,cx-2,cy-18); g.stroke();
      g.strokeStyle = '#2e3c1c'; g.lineWidth = 1.4;
      g.beginPath(); g.moveTo(cx-3,cy-4); g.quadraticCurveTo(cx-9,cy-10,cx-6,cy-16); g.stroke();
      const capCol = i ? '#8a3a3a' : '#9a4a4a';
      const cg = g.createRadialGradient(cx-3,cy-23,1,cx-2,cy-20,11);
      cg.addColorStop(0,'#c87a7a'); cg.addColorStop(1,capCol);
      g.fillStyle = cg; g.beginPath(); g.ellipse(cx-2,cy-20,10,6,0,Math.PI,0); g.closePath(); g.fill(); g.strokeStyle = T.ink; g.lineWidth = 1.4; g.stroke();
      g.fillStyle = 'rgba(255,255,255,.75)'; [[-5,-21],[1,-23],[5,-20]].forEach(([dx,dy]) => { circle(g,cx+dx,cy+dy,1.1); g.fill(); });
      // 發光孢子微粒
      g.fillStyle = 'rgba(154,216,74,.8)';
      for(let k=0;k<3;k++){ circle(g,cx-2+r()*14-7,cy-26-r()*8,.8); g.fill(); }
    });
  }
  // candy：紅白螺旋糖果條紋（加光澤高光），塔頂改奶油擠花頂+彩色糖珠裝飾
  function texCandy(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    g.fillStyle = T.stone; g.fillRect(x,y,w,h);
    g.strokeStyle = '#e0548a'; g.lineWidth = 6;
    for(let d=-h; d<w+h; d+=14){ g.beginPath(); g.moveTo(x+d,y); g.lineTo(x+d+h,y+h); g.stroke(); }
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x,y,w*.3,h);
    g.restore();
  }
  function topperCandy(g,T,r,base){
    [[59,50,13],[124,110,9]].forEach(([cx,cy,rad]) => {
      g.save(); g.translate(cx,cy);
      for(let a=0;a<Math.PI*3.2;a+=.35){ const rr = rad*(1-a/(Math.PI*3.6)); g.beginPath(); g.arc(0,0,Math.max(1,rr),a,a+.35); g.strokeStyle = a%1.4<.7 ? '#e0548a' : '#fde6f4'; g.lineWidth=3; g.stroke(); }
      g.restore();
      g.strokeStyle = T.ink; g.lineWidth = 1.4; circle(g,cx,cy,rad); g.stroke();
      g.fillStyle = 'rgba(255,255,255,.55)'; ell(g,cx-rad*.3,cy-rad*.3,rad*.3,rad*.18); g.fill();
      // 彩色糖珠環繞
      const dot = ['#e0548a','#9a5ac2','#4ea0b8','#e8a84a'];
      for(let k=0;k<6;k++){ const a=k/6*Math.PI*2; g.fillStyle = dot[k%dot.length]; circle(g,cx+Math.cos(a)*(rad+4),cy+Math.sin(a)*(rad+4),1.6); g.fill(); g.strokeStyle=T.ink; g.lineWidth=.6; g.stroke(); }
      g.strokeStyle='#7a4a68'; g.lineWidth=2.4; g.beginPath(); g.moveTo(cx,cy+rad); g.lineTo(cx,cy+rad+12); g.stroke();
    });
  }
  // twilight：沿用石牆，塔頂改尖塔+彩繪玻璃窗新月+星塵光暈（更有魔幻感）
  function topperTwilight(g,T,r,base){
    [[59,56,13],[124,117,10]].forEach(([cx,cy,h]) => {
      g.beginPath(); g.moveTo(cx-8,cy); g.lineTo(cx,cy-h); g.lineTo(cx+8,cy); g.closePath();
      const tg = g.createLinearGradient(cx,cy-h,cx,cy);
      tg.addColorStop(0, T.stoneL); tg.addColorStop(1, T.stoneD);
      g.fillStyle = tg; g.fill(); g.lineWidth = 1.6; g.strokeStyle = T.ink; g.stroke();
      g.save(); g.translate(cx,cy-h-7);
      const glow = g.createRadialGradient(0,0,0,0,0,9);
      glow.addColorStop(0,'rgba(196,138,224,.55)'); glow.addColorStop(1,'rgba(196,138,224,0)');
      g.fillStyle = glow; circle(g,0,0,9); g.fill();
      g.fillStyle = T.win; g.beginPath(); g.arc(0,0,4.5,Math.PI*.2,Math.PI*1.9); g.arc(2,0,4,Math.PI*1.1,Math.PI*.1,true); g.closePath(); g.fill();
      g.strokeStyle = 'rgba(255,255,255,.5)'; g.lineWidth = .8; g.beginPath(); g.arc(0,0,4.5,Math.PI*.2,Math.PI*1.9); g.stroke();
      g.restore();
    });
    for(let i=0;i<8;i++){
      const x=18+r()*128, y=35+r()*70, gg = g.createRadialGradient(x,y,0,x,y,2.2);
      gg.addColorStop(0,'rgba(255,255,255,.95)'); gg.addColorStop(1,'rgba(220,180,255,0)');
      g.fillStyle = gg; circle(g,x,y,2.2); g.fill();
    }
  }
  // steampunk：鉚釘金屬板紋理（加銅鏽漸層），塔頂改黃銅煙囪+齒輪裝置+節奏蒸氣雲
  function texRivet(g,x,y,w,h,r,T){
    g.save(); g.beginPath(); g.rect(x,y,w,h); g.clip();
    const pg = g.createLinearGradient(0,y,0,y+h);
    pg.addColorStop(0,T.stoneL); pg.addColorStop(1,T.stone);
    g.fillStyle = pg; g.fillRect(x,y,w,h);
    for(let row=0, yy=y+8; yy<y+h; row++, yy+=20){
      let xx = x + 8;
      while(xx < x+w-4){
        g.strokeStyle = T.stoneD; g.lineWidth = 1; g.strokeRect(xx-9,yy-9,18,18);
        [[xx-7,yy-7],[xx+7,yy-7],[xx-7,yy+7],[xx+7,yy+7]].forEach(([rx,ry]) => {
          const rg = g.createRadialGradient(rx-.4,ry-.4,.2,rx,ry,1.4);
          rg.addColorStop(0,'#f0e0b8'); rg.addColorStop(1,'#8a6a3e');
          g.fillStyle = rg; circle(g,rx,ry,1.3); g.fill();
        });
        xx += 20;
      }
    }
    g.restore();
  }
  function topperSteampunk(g,T,r,base){
    [[59,56],[124,117]].forEach(([cx,cy],i) => {
      const h = i ? 14 : 18;
      const pg = g.createLinearGradient(cx-5,0,cx+5,0);
      pg.addColorStop(0,'#8a6a42'); pg.addColorStop(.5,'#b8905a'); pg.addColorStop(1,'#6a5a42');
      g.fillStyle = pg; g.fillRect(cx-5,cy-h,10,h); g.strokeStyle = T.ink; g.lineWidth = 1.6; g.strokeRect(cx-5,cy-h,10,h);
      g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(cx-5,cy-3,10,3);
      g.save(); g.translate(cx+8,cy-h+2); g.rotate(r()*6.28);
      const gg2 = g.createRadialGradient(-1,-1,.5,0,0,4.5);
      gg2.addColorStop(0,'#e8c87a'); gg2.addColorStop(1,'#8a6020');
      g.fillStyle = gg2; g.strokeStyle = T.ink; g.lineWidth = 1;
      for(let k=0;k<8;k++){ const a = k/8*Math.PI*2; g.save(); g.rotate(a); g.fillRect(-1.5,-7,3,3); g.restore(); }
      circle(g,0,0,4.5); g.fill(); g.stroke();
      g.fillStyle = '#5a3e18'; circle(g,0,0,1.6); g.fill();
      g.restore();
      for(let k=0;k<3;k++){
        const sy = cy-h-6-k*7, sg = g.createRadialGradient(cx-2+k*2,sy,0,cx-2+k*2,sy,5+k*2);
        sg.addColorStop(0,'rgba(255,255,255,.55)'); sg.addColorStop(1,'rgba(255,255,255,0)');
        g.fillStyle = sg; ell(g,cx-2+k*2,sy,4+k*2,3+k); g.fill();
      }
    });
  }
  // autumn：沿用石牆磚紋理，塔頂改楓葉花環+漸層葉片+緩降落葉
  function topperAutumn(g,T,r,base){
    [[59,56,20,12],[124,117,13,8]].forEach(([cx,cy,rx,ry]) => {
      const cols = ['#c96a2e','#a04a3a','#d9a640','#8a4f2e'];
      for(let k=0;k<8;k++){
        const a = k/8*Math.PI*2, lx = cx+Math.cos(a)*rx*.82, ly = cy+Math.sin(a)*ry*.82;
        g.save(); g.translate(lx,ly); g.rotate(a+Math.PI/2);
        const lg = g.createLinearGradient(0,-4,0,4);
        lg.addColorStop(0, cols[k%cols.length]); lg.addColorStop(1, '#5c3522');
        g.fillStyle = lg;
        g.beginPath(); g.moveTo(0,-5); g.quadraticCurveTo(4,-1,0,5); g.quadraticCurveTo(-4,-1,0,-5); g.closePath(); g.fill();
        g.strokeStyle = T.ink; g.lineWidth = .7; g.stroke();
        g.restore();
      }
      g.fillStyle = 'rgba(217,166,64,.9)'; circle(g,cx,cy-ry*1.3,2); g.fill();
    });
    g.fillStyle = 'rgba(200,120,50,.6)';
    for(let i=0;i<6;i++){ const x=20+r()*128, y=50+r()*140, s=1.8+r()*1.2; g.save(); g.translate(x,y); g.rotate(r()*6.28); ell(g,0,0,s,s*.6); g.fill(); g.restore(); }
  }

  const CASTLE_RENDERERS = {
    jungle: (g,T,r) => drawCastleBase(g,T,r,{texture:texWood, topper:topperJungle}),
    ocean: (g,T,r) => drawCastleBase(g,T,r,{texture:texShell, topper:topperShell}),
    coral: (g,T,r) => drawCastleBase(g,T,r,{texture:texShell, topper:topperShell}),
    haunted: (g,T,r) => drawCastleBase(g,T,r,{texture:texHaunted, topper:topperHaunted}),
    'ice-cave': (g,T,r) => drawCastleBase(g,T,r,{texture:texCrystal, topper:topperCrystal}),
    crystal: (g,T,r) => drawCastleBase(g,T,r,{texture:texCrystal, topper:topperCrystal}),
    desert: (g,T,r) => drawCastleBase(g,T,r,{texture:texSand, topper:topperDesert}),
    snow: (g,T,r) => drawCastleBase(g,T,r,{texture:texSnowWall, topper:topperSnow}),
    volcano: (g,T,r) => drawCastleBase(g,T,r,{texture:texObsidian, topper:topperVolcano}),
    sakura: (g,T,r) => drawCastleBase(g,T,r,{texture:bricks, topper:topperSakura}),
    swamp: (g,T,r) => drawCastleBase(g,T,r,{texture:texMoss, topper:topperSwamp}),
    candy: (g,T,r) => drawCastleBase(g,T,r,{texture:texCandy, topper:topperCandy}),
    twilight: (g,T,r) => drawCastleBase(g,T,r,{texture:bricks, topper:topperTwilight}),
    steampunk: (g,T,r) => drawCastleBase(g,T,r,{texture:texRivet, topper:topperSteampunk}),
    autumn: (g,T,r) => drawCastleBase(g,T,r,{texture:bricks, topper:topperAutumn}),
  };
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
    (CASTLE_RENDERERS[theme] || drawCastle)(g,T,r);
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
  // 怪物身體裝飾：依場景主題在身軀表面疊加小圖案，讓17個場景的怪物有專屬辨識度。
  // 呼叫時機在body fill/高光之後、頭飾(horn)之前，座標系已被translate到軀幹原點(0,0=腳踝附近)。
  // w=軀幹半寬、h=軀幹高度(像素，已含scale)、t=怪物自身計時器(用於細微動畫，如氣泡/火光閃爍)。
  // 注意：臉部佔據約-h*.33(嘴)到-h*.9(角)的範圍，裝飾一律畫在軀幹下半身(約-h*.05~-h*.28)，
  // 避開臉部區域，否則會被誤判成「飄浮雜訊」蓋在嘴巴/眼睛上。
  function drawEnemyDeco(g,theme,T,w,h,t){
    switch(theme){
      case 'ocean': case 'coral':
        g.fillStyle = theme === 'coral' ? '#f0c8a0' : '#cfe8ea'; g.strokeStyle = T.ink; g.lineWidth = 1;
        [[-.55,.06],[.0,.16],[.5,.08]].forEach(([dx,dy]) => { ell(g, dx*w, -h*(.1+dy), w*.17, w*.14); g.fill(); g.stroke(); });
        g.fillStyle = 'rgba(255,255,255,.5)'; circle(g, w*.3, -h*(.3+Math.sin(t*3)*.02), 1.8); g.fill();
        break;
      case 'jungle':
        g.strokeStyle = '#2e5c2a'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(-w*.85,-h*.02); g.quadraticCurveTo(0,-h*.22,w*.8,0); g.stroke();
        g.fillStyle = '#4a8a3e'; [[-.5,.04],[.15,.2],[.55,.0]].forEach(([dx,dy]) => { g.beginPath(); g.ellipse(dx*w,-h*(.07+dy),w*.2,w*.09,dx*.6,0,Math.PI*2); g.fill(); });
        break;
      case 'desert':
        g.fillStyle = '#e8cf96'; g.strokeStyle = T.ink; g.lineWidth = 1.2;
        g.beginPath(); g.moveTo(-w*.9,-h*.3); g.lineTo(w*.9,-h*.3); g.lineTo(w*.7,-h*.14); g.lineTo(-w*.7,-h*.14); g.closePath(); g.fill(); g.stroke();
        break;
      case 'snow':
        g.fillStyle = '#f2f8fb'; g.strokeStyle = T.ink; g.lineWidth = 1;
        for(let k=-2;k<=2;k++){ ell(g, k*w*.32, -h*.1, w*.14, w*.09); g.fill(); g.stroke(); }
        break;
      case 'volcano':{
        const gl = .5+Math.sin(t*5)*.3;
        g.strokeStyle = `rgba(255,${140+gl*60|0},60,${.7+gl*.3})`; g.lineWidth = 1.6;
        g.beginPath(); g.moveTo(-w*.5,-h*.02); g.lineTo(-w*.2,-h*.16); g.lineTo(w*.1,-h*.04); g.lineTo(w*.45,-h*.2); g.stroke();
        break; }
      case 'sakura':
        g.fillStyle = '#f3c9d6'; g.strokeStyle = '#b86e8e'; g.lineWidth = .8;
        [[-.55,0],[.15,.1],[.5,.0]].forEach(([dx,dy]) => { ell(g, dx*w, -h*(.08+dy), w*.13, w*.13); g.fill(); g.stroke(); });
        break;
      case 'swamp':
        g.fillStyle = '#5c6e2e'; [[-.45,0],[.35,.1]].forEach(([dx,dy]) => { ell(g, dx*w, -h*(.05+dy), w*.28, w*.12); g.fill(); });
        g.strokeStyle = '#9ad84a'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-w*.1,-h*.1); g.quadraticCurveTo(-w*.05,-h*.0,-w*.15,.02*h); g.stroke();
        break;
      case 'candy':
        g.fillStyle = '#fff'; g.strokeStyle = '#c266a0'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(-w*.85,-h*.22); g.quadraticCurveTo(0,-h*.4,w*.85,-h*.22); g.lineTo(w*.65,-h*.1); g.quadraticCurveTo(0,-h*.26,-w*.65,-h*.1); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#e0548a'; circle(g, w*.5, -h*.16, 2); g.fill();
        break;
      case 'ice-cave': case 'crystal':
        g.fillStyle = 'rgba(200,230,255,.65)'; g.strokeStyle = T.ink; g.lineWidth = 1;
        [[-.5,-.05],[.1,-.18],[.5,0]].forEach(([dx,dy]) => { g.beginPath(); g.moveTo(dx*w,dy*h); g.lineTo(dx*w-3,dy*h+8); g.lineTo(dx*w+3,dy*h+8); g.closePath(); g.fill(); g.stroke(); });
        break;
      case 'twilight':
        g.fillStyle = '#e8d8ff';
        [[-.5,0],[.15,.08],[.45,-.02]].forEach(([dx,dy]) => { circle(g, dx*w, -h*(.08+dy), 1.5); g.fill(); });
        break;
      case 'steampunk':
        g.fillStyle = '#c9b48a'; g.strokeStyle = T.ink; g.lineWidth = 1;
        [[-.4,.02],[.4,.02]].forEach(([dx,dy]) => { circle(g, dx*w, -h*(.1+dy), 2); g.fill(); g.stroke(); });
        g.strokeStyle = '#e8a84a'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(-w*.55,-h*.08); g.lineTo(w*.55,-h*.08); g.stroke();
        break;
      case 'haunted':
        g.strokeStyle = 'rgba(180,220,160,.55)'; g.lineWidth = 1.2;
        for(let k=-2;k<=2;k++){ g.beginPath(); g.moveTo(k*w*.35,.03*h); g.lineTo(k*w*.35+Math.sin(t*4+k)*2,.12*h); g.stroke(); }
        break;
      case 'autumn':
        g.fillStyle = '#c96a2e'; g.strokeStyle = '#8a4f2e'; g.lineWidth = .8;
        [[-.4,.02],[.3,.14]].forEach(([dx,dy]) => { g.beginPath(); g.ellipse(dx*w,-h*(.08+dy),w*.18,w*.09,dx*.5,0,Math.PI*2); g.fill(); g.stroke(); });
        break;
      default: break; // forest/space 維持原版無裝飾，作為基準造型
    }
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
    drawEnemyDeco(g, e.theme, T, w, h, e.t);
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

  // ---- 粒子特效（魔王蓄力／必殺一擊演出用，純幾何繪製，無外部素材）----
  // 產生 n 顆噴散粒子推進 parts 陣列：confetti=true 時畫旋轉小方塊（彩帶），否則畫淡出圓點（墨花/火花）
  // nograv=true 時不受重力牽引（用於往弓箭手聚集的蓄力光點）
  function spark(parts, x, y, col, n=14, spd=120){
    for(let i=0;i<n;i++){
      const a = Math.random()*Math.PI*2, v = spd*(.3+Math.random()*.8);
      parts.push({ x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 60, life:.6+Math.random()*.4, max:1, r:1.5+Math.random()*3, col });
    }
  }
  function confettiBurst(parts, xMin, xMax){
    const cols = ['#f2c45a','#a8463a','#3f7a6a','#efe9dc','#4f6f86'];
    for(let k=0;k<70;k++) parts.push({ x: xMin + Math.random()*(xMax-xMin), y: -10 - Math.random()*80, vx:(Math.random()-.5)*40, vy: 30+Math.random()*50,
      life: 1.8+Math.random()*.8, r: 2+Math.random()*2, col: cols[k%cols.length], confetti:true, rot: Math.random()*6, vr:(Math.random()-.5)*10, delay: .25+Math.random()*.5 });
  }
  function stepParticles(parts, dt, groundY){
    for(const p of parts){
      if(p.delay > 0){ p.delay -= dt; continue; }
      p.life -= dt; p.rot = (p.rot||0) + (p.vr||0)*dt;
      p.x += p.vx*dt; p.y += p.vy*dt;
      if(!p.nograv) p.vy += 60*dt;
      if(!p.nograv && !p.confetti && groundY && p.y > groundY){ p.y = groundY; p.vy *= -.3; p.vx *= .6; }
    }
    return parts.filter(p => p.life > 0);
  }
  function drawParticles(g, parts){
    for(const p of parts){
      if(p.delay > 0) continue;
      const a = Math.max(0, Math.min(1, p.life / p.max));
      g.globalAlpha = a;
      if(p.confetti){
        g.save(); g.translate(p.x,p.y); g.rotate(p.rot||0);
        g.fillStyle = p.col; g.fillRect(-p.r,-p.r*.6,p.r*2,p.r*1.2);
        g.restore();
      }else{
        g.fillStyle = p.col; circle(g,p.x,p.y,p.r); g.fill();
      }
    }
    g.globalAlpha = 1;
  }
  // 蓄力集氣演出：畫面變暗＋光環往弓箭手收縮＋放射光芒，t=0~1 代表集氣進度
  function drawUltCharge(g, x, y, t){
    const p = Math.min(1, t/.75);
    g.fillStyle = `rgba(10,14,22,${.58*p})`; g.fillRect(-20,-20,W+40,H+40);
    for(let k=0;k<3;k++){ const q = (t*1.8 + k/3) % 1, r = (1-q)*90 + 6;
      g.strokeStyle = `rgba(242,196,90,${.85*q})`; g.lineWidth = 2+3*q; circle(g,x,y,r); g.stroke(); }
    const rays = 10;
    for(let k=0;k<rays;k++){ const a = k/rays*Math.PI*2 + t*2.5, len = 30+40*p;
      g.strokeStyle = `rgba(255,243,196,${.35*p})`; g.lineWidth = 2;
      g.beginPath(); g.moveTo(x+Math.cos(a)*10, y+Math.sin(a)*10); g.lineTo(x+Math.cos(a)*len, y+Math.sin(a)*len); g.stroke(); }
  }
  // 魔王身上的蓄力光暈：charge 越高光暈越大越亮
  function drawBossGlow(g, x, y, r){
    const gl = g.createRadialGradient(x,y,1,x,y,r*2.4);
    gl.addColorStop(0,'rgba(255,236,170,.95)'); gl.addColorStop(.45,'rgba(242,196,90,.6)'); gl.addColorStop(1,'rgba(242,196,90,0)');
    g.fillStyle = gl; circle(g,x,y,r*2.4); g.fill();
  }

  return { W, H, GROUND, WALL_X, STOP_X, DPR, T, THEMES, makeBg, drawFlag, drawArcher, drawEnemy, drawArrow, drawCrack, circle, ell,
    spark, confettiBurst, stepParticles, drawParticles, drawUltCharge, drawBossGlow };
})();
