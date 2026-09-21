const W=15,H=15,RUN=60;
const DIRS=[{x:0,y:-1},{x:1,y:0},{x:0,y:1},{x:-1,y:0}];
const ENEMY=[{id:"ICE-WORM",hp:2,col:"#ff2bd6"},{id:"SHELL-BUG",hp:3,col:"#ff77aa"},{id:"GHOST-PKT",hp:1,col:"#c084fc"}];
const canvas=document.getElementById("fx");
const ctx=canvas.getContext("2d");
const bar=document.getElementById("bar");
const timeEl=document.getElementById("time");
const nodeEl=document.getElementById("node");
const gateEl=document.getElementById("gate");
const dotsEl=document.getElementById("dots");
const msgEl=document.getElementById("msg");
const overlay=document.getElementById("overlay");
const combatEl=document.getElementById("combat");
const needle=document.getElementById("needle");
const cname=document.getElementById("cname");
const hackBtn=document.getElementById("p-h");
const statsEl=document.getElementById("stats");
let cw=0,ch=0,dpr=1,map,entities,player,state,audioCtx=null;
let bestKept=Number(localStorage.getItem("nwr_best")||0);
function resize(){const r=canvas.getBoundingClientRect();dpr=Math.min(window.devicePixelRatio||1,2);cw=Math.max(1,r.width);ch=Math.max(1,r.height);canvas.width=Math.floor(cw*dpr);canvas.height=Math.floor(ch*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);}
window.addEventListener("resize",resize);
new ResizeObserver(resize).observe(canvas);
function say(t,ms=900){msgEl.textContent=t;msgEl.classList.add("show");clearTimeout(say._t);say._t=setTimeout(()=>msgEl.classList.remove("show"),ms);}
function buzz(ms=12){if(navigator.vibrate)navigator.vibrate(ms);}
function ac(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==="suspended")audioCtx.resume();return audioCtx;}
function beep(freq,dur=0.06,type="square",vol=0.04){try{const a=ac(),o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.value=freq;g.gain.value=vol;o.connect(g);g.connect(a.destination);o.start();g.gain.exponentialRampToValueAtTime(0.0001,a.currentTime+dur);o.stop(a.currentTime+dur);}catch(e){}}
function inb(x,y){return x>=0&&y>=0&&x<W&&y<H;}
function walk(x,y){return inb(x,y)&&map[y][x]===0;}
function key(x,y){return x+","+y;}
function bfs(sx,sy){const q=[[sx,sy]],seen={[key(sx,sy)]:0};for(let i=0;i<q.length;i++){const [x,y]=q[i],d=seen[key(x,y)];for(const v of DIRS){const nx=x+v.x,ny=y+v.y;if(walk(nx,ny)&&seen[key(nx,ny)]===undefined){seen[key(nx,ny)]=d+1;q.push([nx,ny]);}}}return seen;}
function generate(){map=Array.from({length:H},()=>Array(W).fill(1));let x=7,y=13;map[y][x]=0;let carved=1,guard=0;while(carved<78&&guard++<8000){const dir=DIRS[(Math.random()*4)|0];const nx=x+dir.x,ny=y+dir.y;if(nx>0&&nx<W-1&&ny>0&&ny<H-1){x=nx;y=ny;if(map[y][x]===1){map[y][x]=0;carved++;}}}for(let i=0;i<18;i++){const rx=1+((Math.random()*(W-2))|0),ry=1+((Math.random()*(H-2))|0);if(map[ry][rx]===0){for(const v of DIRS){const nx=rx+v.x,ny=ry+v.y;if(nx>0&&nx<W-1&&ny>0&&ny<H-1&&Math.random()<0.45)map[ny][nx]=0;}}}const dist=bfs(7,13);const floors=[];for(let yy=1;yy<H-1;yy++)for(let xx=1;xx<W-1;xx++)if(map[yy][xx]===0&&dist[key(xx,yy)]!==undefined)floors.push({x:xx,y:yy,d:dist[key(xx,yy)]});floors.sort((a,b)=>b.d-a.d);const start={x:7,y:13};const gate=floors.find(f=>f.d>=10)||floors[0];entities=[{type:"gate",x:gate.x,y:gate.y}];const used=new Set([key(start.x,start.y),key(gate.x,gate.y)]);const far=floors.filter(f=>f.d>=4&&!used.has(key(f.x,f.y)));for(let i=0;i<6&&far.length;i++){const f=far.splice((Math.random()*far.length)|0,1)[0];used.add(key(f.x,f.y));const proto=ENEMY[i%ENEMY.length];entities.push({type:"enemy",x:f.x,y:f.y,hp:proto.hp,max:proto.hp,name:proto.id,col:proto.col});}for(let i=0;i<5&&far.length;i++){const f=far.splice((Math.random()*Math.min(far.length,8))|0,1)[0];used.add(key(f.x,f.y));entities.push({type:"chest",x:f.x,y:f.y,rare:Math.random()<0.22});}player={x:start.x,y:start.y,dir:0,integ:3,traces:[],nodes:0};}
function entAt(x,y){return entities.find(e=>e.x===x&&e.y===y&&!e.dead);}
function facingCell(){const v=DIRS[player.dir];return {x:player.x+v.x,y:player.y+v.y};}
function gatePos(){return entities.find(e=>e.type==="gate");}
function startRun(){generate();state={mode:"run",t0:performance.now(),left:RUN,combat:null,over:false,reason:"",flash:0,shake:0};overlay.classList.add("hidden");combatEl.classList.remove("on");hackBtn.classList.remove("lit");say("DIVE START",700);beep(220,.08);beep(440,.1);buzz(8);updateHud();}
function endRun(reason){if(state.over)return;state.over=true;state.mode="end";state.reason=reason;combatEl.classList.remove("on");hackBtn.classList.remove("lit");let kept=player.traces.slice(),lost=[];if(reason!=="GATE"){const keepN=Math.floor(player.traces.length/2);kept=player.traces.slice(0,keepN);lost=player.traces.slice(keepN);}const score=kept.reduce((s,t)=>s+(t==="EPIC"?3:1),0);if(score>bestKept){bestKept=score;localStorage.setItem("nwr_best",String(bestKept));}overlay.querySelector("h1").textContent=reason==="GATE"?"EXTRACTION OK":reason==="DEAD"?"SIGNAL LOST":"TIME UP";overlay.querySelector(".sub").textContent=reason==="GATE"?"ALL DATA KEPT":"HALF TRACE LOST";overlay.querySelector(".box").innerHTML=`KEEP ${kept.length} / LOST ${lost.length}<br>`+(kept.length?"KEEP: "+kept.join(" / "):"KEEP: --")+"<br>"+(lost.length?"LOST: "+lost.join(" / "):"LOST: --");document.getElementById("dive").textContent="RE-DIVE";statsEl.textContent="BEST KEEP SCORE "+bestKept;overlay.classList.remove("hidden");beep(reason==="GATE"?880:160,0.18,"square",0.05);}
function updateHud(){const t=Math.max(0,state.left);timeEl.textContent=t.toFixed(1);bar.style.width=(t/RUN)*100+"%";bar.className=t<=15?"dead":t<=30?"warn":"";nodeEl.textContent="NODE "+String(player.nodes).padStart(2,"0");const g=gatePos();const dist=g?bfs(player.x,player.y)[key(g.x,g.y)]:undefined;gateEl.textContent="GATE "+(dist===undefined?"??":String(dist));dotsEl.textContent="INTEGRITY "+"\u25cf".repeat(player.integ)+"\u25cb".repeat(3-player.integ);}
function tryCombat(){const f=facingCell();const e=entAt(f.x,f.y);if(e&&e.type==="enemy"){state.combat={e,pulse:0,hits:0};state.mode="combat";combatEl.classList.add("on");hackBtn.classList.add("lit");cname.textContent=e.name+"  HP "+e.hp;beep(140,.1);buzz(18);return true;}return false;}
function resolveTile(){const e=entAt(player.x,player.y);if(!e)return;if(e.type==="chest"){e.dead=true;const rare=e.rare?"EPIC":"TRACE";player.traces.push(rare);say(rare+" GET");beep(880,.07);beep(1320,.08);buzz(10);state.flash=1;}else if(e.type==="gate"){endRun("GATE");}else if(e.type==="enemy"){tryCombatFromHere(e);}}
function tryCombatFromHere(e){state.combat={e,pulse:0,hits:0};state.mode="combat";combatEl.classList.add("on");hackBtn.classList.add("lit");cname.textContent=e.name+"  HP "+e.hp;}
function moveFwd(){if(state.mode!=="run")return;const f=facingCell();if(!walk(f.x,f.y)){beep(90,.05);buzz(6);say("BLOCK");return;}const e=entAt(f.x,f.y);if(e&&e.type==="enemy"){player.x=f.x;player.y=f.y;player.nodes++;tryCombatFromHere(e);beep(200,.05);return;}player.x=f.x;player.y=f.y;player.nodes++;beep(240,.03,"square",0.03);resolveTile();if(!state.over)tryCombat();}
function turn(dlt){if(state.mode!=="run")return;player.dir=(player.dir+dlt+4)%4;beep(180,.025,"square",0.025);tryCombat();}
function hack(){if(state.over)return;if(state.mode!=="combat"||!state.combat){const f=facingCell();const e=entAt(f.x,f.y);if(e&&e.type==="enemy"){tryCombat();return;}say("NO TARGET");return;}const c=state.combat;const ang=(c.pulse%1);const perfect=ang<0.11||ang>0.89;const ok=ang<0.22||ang>0.78;if(perfect){c.e.hp-=2;say("PERFECT HACK");beep(920,.06);beep(1400,.08);buzz(16);state.flash=1;}else if(ok){c.e.hp-=1;say("HACK");beep(520,.06);buzz(8);}else{say("WHIFF");beep(110,.08);player.integ-=1;state.shake=1;if(player.integ<=0){endRun("DEAD");return;}}cname.textContent=c.e.name+"  HP "+Math.max(0,c.e.hp);if(c.e.hp<=0){c.e.dead=true;player.traces.push("TRACE");say("PURGED +TRACE");state.mode="run";state.combat=null;combatEl.classList.remove("on");hackBtn.classList.remove("lit");beep(700,.1);}else{c.pulse=0.35;}}
function bind(el,fn){const go=ev=>{ev.preventDefault();el.classList.add("down");fn();};const up=()=>el.classList.remove("down");el.addEventListener("pointerdown",go);el.addEventListener("pointerup",up);el.addEventListener("pointerleave",up);el.addEventListener("pointercancel",up);}
bind(document.getElementById("p-l"),()=>turn(-1));
bind(document.getElementById("p-r"),()=>turn(1));
bind(document.getElementById("p-f"),moveFwd);
bind(document.getElementById("p-u"),()=>turn(2));
bind(hackBtn,hack);
document.getElementById("dive").addEventListener("click",()=>{ac();startRun();});
window.addEventListener("keydown",e=>{if(overlay.classList.contains("hidden")===false&&(e.key==="Enter"||e.key===" ")){ac();startRun();return;}if(!state||state.over)return;if(e.key==="ArrowUp"||e.key==="w")moveFwd();if(e.key==="ArrowLeft"||e.key==="a")turn(-1);if(e.key==="ArrowRight"||e.key==="d")turn(1);if(e.key==="ArrowDown"||e.key==="s")turn(2);if(e.key===" "||e.key==="j"||e.key==="k")hack();});
document.addEventListener("touchmove",e=>e.preventDefault(),{passive:false});
