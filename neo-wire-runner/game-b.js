function cell(px,py,d,side) {
const f = DIRS[player.dir];
const l = DIRS[(player.dir+3)%4];
return {x: px + f.x*d + l.x*side, y: py + f.y*d + l.y*side};
}
function isWall(x,y){ return !inb(x,y) || map[y][x]===1; }
function draw() {
ctx.clearRect(0,0,cw,ch);
ctx.fillStyle = "#02030a";
ctx.fillRect(0,0,cw,ch);
if (!player) return;
const ox = (state && state.shake>0) ? (Math.random()-0.5)*10*state.shake : 0;
const oy = (state && state.shake>0) ? (Math.random()-0.5)*8*state.shake : 0;
ctx.save();
ctx.translate(ox, oy);
const cx = cw/2, horizon = ch*0.42;
const maxD = 8;
const near = 0.42;
function scale(d){ return 1 / (near + d*0.82); }
function box(d) {
const s = scale(d);
const hw = cw * 0.52 * s;
const hh = ch * 0.46 * s;
return {l: cx-hw, r: cx+hw, t: horizon-hh, b: horizon+hh, s};
}
ctx.strokeStyle = "#00e8ff22";
ctx.lineWidth = 1;
for (let d=0; d<=maxD; d++) {
const b = box(d);
ctx.beginPath();
ctx.moveTo(b.l, b.b); ctx.lineTo(b.r, b.b);
ctx.stroke();
}
ctx.strokeStyle = "#00e8ff18";
for (let d=0; d<=maxD; d++) {
const b = box(d);
ctx.beginPath();
ctx.moveTo(b.l, b.t); ctx.lineTo(b.r, b.t);
ctx.stroke();
}
for (let d=maxD; d>=0; d--) {
const b = box(d);
const bn = box(d+1);
const fc = cell(player.x, player.y, d+1, 0);
const glow = Math.max(0.18, 1 - d*0.11);
ctx.globalAlpha = glow;
if (isWall(cell(player.x,player.y,d,1).x, cell(player.x,player.y,d,1).y)) {
line("#00e8ff", [[b.l,b.t],[bn.l,bn.t],[bn.l,bn.b],[b.l,b.b]]);
} else {
ctx.strokeStyle = "#00e8ff55";
ctx.beginPath();
ctx.moveTo(b.l,b.t); ctx.lineTo(bn.l,bn.t);
ctx.moveTo(b.l,b.b); ctx.lineTo(bn.l,bn.b);
ctx.stroke();
}
if (isWall(cell(player.x,player.y,d,-1).x, cell(player.x,player.y,d,-1).y)) {
line("#00e8ff", [[b.r,b.t],[bn.r,bn.t],[bn.r,bn.b],[b.r,b.b]]);
} else {
ctx.strokeStyle = "#00e8ff55";
ctx.beginPath();
ctx.moveTo(b.r,b.t); ctx.lineTo(bn.r,bn.t);
ctx.moveTo(b.r,b.b); ctx.lineTo(bn.r,bn.b);
ctx.stroke();
}
if (isWall(fc.x, fc.y)) {
line("#00e8ff", [[bn.l,bn.t],[bn.r,bn.t],[bn.r,bn.b],[bn.l,bn.b]]);
}
drawEntsAt(d+1, bn);
ctx.globalAlpha = 1;
}
ctx.restore();
if (state && state.flash>0) {
ctx.fillStyle = `rgba(182,255,0,${state.flash*0.18})`;
ctx.fillRect(0,0,cw,ch);
}
}
function line(col, pts) {
ctx.strokeStyle = col;
ctx.shadowColor = col;
ctx.shadowBlur = 8;
ctx.lineWidth = 1.4;
ctx.beginPath();
ctx.moveTo(pts[0][0], pts[0][1]);
for (let i=1;i<pts.length;i++) ctx.lineTo(pts[i][0], pts[i][1]);
ctx.closePath();
ctx.stroke();
ctx.shadowBlur = 0;
}
function drawEntsAt(depth, b) {
const c = cell(player.x, player.y, depth, 0);
const e = entAt(c.x,c.y);
if (!e) return;
const midx = (b.l+b.r)/2;
const midy = (b.t+b.b)/2;
const s = (b.r-b.l);
if (e.type==="enemy") {
ctx.strokeStyle = e.col;
ctx.shadowColor = e.col;
ctx.shadowBlur = 12;
ctx.lineWidth = 1.6;
const r = s*0.16;
ctx.beginPath();
ctx.moveTo(midx, midy-r);
ctx.lineTo(midx+r, midy);
ctx.lineTo(midx, midy+r);
ctx.lineTo(midx-r, midy);
ctx.closePath();
ctx.stroke();
ctx.beginPath();
ctx.arc(midx, midy, r*0.35, 0, Math.PI*2);
ctx.stroke();
ctx.shadowBlur = 0;
} else if (e.type==="chest") {
const col = e.rare ? "#ffd24a" : "#ffe38a";
ctx.strokeStyle = col; ctx.shadowColor = col; ctx.shadowBlur = 10;
const w = s*0.16, h = s*0.12;
ctx.strokeRect(midx-w/2, midy-h/2, w, h);
ctx.beginPath(); ctx.moveTo(midx-w/2, midy); ctx.lineTo(midx+w/2, midy); ctx.stroke();
ctx.shadowBlur = 0;
} else if (e.type==="gate") {
ctx.strokeStyle = "#b6ff00"; ctx.shadowColor = "#b6ff00"; ctx.shadowBlur = 14;
ctx.lineWidth = 2;
const w = s*0.22, h = s*0.34;
ctx.strokeRect(midx-w/2, midy-h/2, w, h);
ctx.beginPath();
ctx.arc(midx, midy, w*0.22, 0, Math.PI*2);
ctx.stroke();
ctx.shadowBlur = 0;
}
}
let last = performance.now();
function loop(now) {
const dt = Math.min(0.05, (now-last)/1000);
last = now;
if (state && !state.over && state.mode!=="end") {
state.left -= dt;
if (state.left <= 0) { state.left = 0; endRun("TIME"); }
if (state.combat) {
state.combat.pulse += dt / 1.05;
const ang = (state.combat.pulse % 1) * 360;
needle.style.transform = `rotate(${ang}deg)`;
}
if (state.flash>0) state.flash = Math.max(0, state.flash - dt*4);
if (state.shake>0) state.shake = Math.max(0, state.shake - dt*4);
updateHud();
}
draw();
requestAnimationFrame(loop);
}
statsEl.textContent = bestKept ? ("BEST KEEP SCORE " + bestKept) : "";
resize();
requestAnimationFrame(loop);
