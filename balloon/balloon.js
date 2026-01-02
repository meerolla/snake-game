const c = document.getElementById("c");
const ctx = c.getContext("2d");

const scoreEl = document.getElementById("score");
const missedEl = document.getElementById("missed");
const timeEl = document.getElementById("time");

const pauseBtn = document.getElementById("pause");
const restartBtn = document.getElementById("restart");

const over = document.getElementById("over");
const finalScore = document.getElementById("finalScore");
const finalMissed = document.getElementById("finalMissed");
const playBtn = document.getElementById("play");

let W=0,H=0, dpr=1;
let balloons = [];
let score=0, missed=0;
let paused=false;
let t=45, timer=null;
let last=0;

function resize(){
  dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
  const rect = c.getBoundingClientRect();
  c.width = Math.floor(rect.width * dpr);
  c.height = Math.floor(rect.height * dpr);
  W = c.width; H = c.height;
}
window.addEventListener("resize", resize);

function rand(min,max){ return Math.random()*(max-min)+min; }
function pick(arr){ return arr[(Math.random()*arr.length)|0]; }

function newBalloon(){
  const r = rand(26, 44) * dpr;
  const x = rand(r*1.2, W - r*1.2);
  const y = H + r + rand(0, H*0.15);
  const speed = rand(55, 115) * dpr; // px/sec
  const colors = ["#ff5d7a","#ffd166","#2dd4bf","#7c5cff","#58a6ff","#5dff9a"];
  return {
    x, y, r,
    vy: -speed,
    color: pick(colors),
    wobble: rand(0.8,1.6),
    phase: rand(0, Math.PI*2)
  };
}

function reset(){
  balloons = [];
  score=0; missed=0;
  paused=false;
  t=45;
  scoreEl.textContent = score;
  missedEl.textContent = missed;
  timeEl.textContent = t;
  over.classList.remove("show");
  over.setAttribute("aria-hidden","true");
  pauseBtn.textContent = "⏸ Pause";
  last = 0;

  // start timer
  if(timer) clearInterval(timer);
  timer = setInterval(()=>{
    if(paused) return;
    t--;
    timeEl.textContent = t;
    if(t<=0){
      endGame();
    }
  },1000);

  // seed balloons
  for(let i=0;i<6;i++) balloons.push(newBalloon());
}

function endGame(){
  if(timer){ clearInterval(timer); timer=null; }
  finalScore.textContent = String(score);
  finalMissed.textContent = String(missed);
  over.classList.add("show");
  over.setAttribute("aria-hidden","false");
}

function drawBalloon(b){
  // string
  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 2 * dpr;
  ctx.beginPath();
  ctx.moveTo(b.x, b.y + b.r*0.9);
  ctx.quadraticCurveTo(b.x + 10*dpr, b.y + b.r*1.6, b.x, b.y + b.r*2.2);
  ctx.stroke();

  // balloon
  ctx.fillStyle = b.color;
  ctx.beginPath();
  ctx.ellipse(b.x, b.y, b.r*0.85, b.r, 0, 0, Math.PI*2);
  ctx.fill();

  // highlight
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  ctx.beginPath();
  ctx.ellipse(b.x - b.r*0.25, b.y - b.r*0.25, b.r*0.18, b.r*0.35, 0.2, 0, Math.PI*2);
  ctx.fill();
}

function step(ts){
  if(!last) last = ts;
  const dt = (ts - last) / 1000;
  last = ts;

  // clear
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = "rgba(20,24,40,0.35)";
  ctx.fillRect(0,0,W,H);

  if(!paused && timer){
    // spawn over time
    if(balloons.length < 14 && Math.random() < 0.08) balloons.push(newBalloon());

    for(const b of balloons){
      b.phase += dt * b.wobble;
      b.x += Math.sin(b.phase) * 18 * dpr * dt;
      b.y += b.vy * dt;
    }

    // miss balloons that leave top
    const keep = [];
    for(const b of balloons){
      if(b.y < -b.r*2){
        missed++;
        missedEl.textContent = missed;
      } else keep.push(b);
    }
    balloons = keep;

    // always keep some
    while(balloons.length < 6) balloons.push(newBalloon());
  }

  // draw
  for(const b of balloons) drawBalloon(b);

  requestAnimationFrame(step);
}

function popAt(clientX, clientY){
  if(paused || !timer) return;
  const rect = c.getBoundingClientRect();
  const x = (clientX - rect.left) * dpr;
  const y = (clientY - rect.top) * dpr;

  // find topmost hit
  for(let i=balloons.length-1;i>=0;i--){
    const b = balloons[i];
    const dx = x - b.x;
    const dy = y - b.y;
    if(dx*dx + dy*dy <= (b.r*b.r)){
      balloons.splice(i,1);
      score += 10;
      scoreEl.textContent = score;
      // add replacement
      balloons.push(newBalloon());
      return;
    }
  }
}

c.addEventListener("click", (e)=> popAt(e.clientX, e.clientY));
c.addEventListener("touchstart", (e)=>{
  e.preventDefault();
  const t0 = e.touches[0];
  popAt(t0.clientX, t0.clientY);
},{passive:false});

pauseBtn.addEventListener("click", ()=>{
  if(!timer) return;
  paused = !paused;
  pauseBtn.textContent = paused ? "▶️ Continue" : "⏸ Pause";
});

restartBtn.addEventListener("click", reset);
playBtn.addEventListener("click", reset);

resize();
reset();
requestAnimationFrame(step);
