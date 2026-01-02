const modeEl = document.getElementById("mode");
const levelEl = document.getElementById("level");
const startBtn = document.getElementById("start");

const qEl = document.getElementById("q");
const ansEl = document.getElementById("ans");
const submitBtn = document.getElementById("submit");
const msgEl = document.getElementById("msg");

const scoreEl = document.getElementById("score");
const streakEl = document.getElementById("streak");
const timeEl = document.getElementById("time");

let a=0,b=0,op="+",correct=0;
let score=0, streak=0;
let t=60, timer=null, running=false;

function randInt(min,max){
  return Math.floor(Math.random()*(max-min+1))+min;
}

function ranges(level){
  if(level===1) return {min:0,max:10};
  if(level===2) return {min:0,max:30};
  return {min:0,max:99};
}

function newQuestion(){
  const lvl = Number(levelEl.value);
  const {min,max} = ranges(lvl);
  const m = modeEl.value;

  const choose = (m==="mix") ? (Math.random()<0.5 ? "add":"sub") : m;

  if(choose==="add"){
    a = randInt(min,max);
    b = randInt(min,max);
    op = "+";
    correct = a + b;
  } else {
    // ensure non-negative result for kids
    a = randInt(min,max);
    b = randInt(min,max);
    if(b>a) [a,b]=[b,a];
    op = "−";
    correct = a - b;
  }

  qEl.textContent = `${a} ${op} ${b} = ?`;
  ansEl.value = "";
  ansEl.focus();
  msgEl.textContent = "";
}

function start(){
  score=0; streak=0; t=60; running=true;
  scoreEl.textContent = score;
  streakEl.textContent = streak;
  timeEl.textContent = t;
  msgEl.textContent = "Go!";
  newQuestion();

  if(timer) clearInterval(timer);
  timer = setInterval(()=>{
    t--;
    timeEl.textContent = t;
    if(t<=0){
      clearInterval(timer);
      timer=null;
      running=false;
      qEl.textContent = "Time’s up!";
      msgEl.textContent = `Final score: ${score}`;
      ansEl.blur();
    }
  },1000);
}

function submit(){
  if(!running) return;
  const val = ansEl.value.trim();
  if(val === "") return;

  const num = Number(val);
  if(Number.isNaN(num)) return;

  if(num === correct){
    streak++;
    score += 10 + Math.min(20, streak*2);
    msgEl.textContent = "✅ Correct!";
  } else {
    msgEl.textContent = `❌ Oops! Answer: ${correct}`;
    streak = 0;
  }
  scoreEl.textContent = score;
  streakEl.textContent = streak;

  setTimeout(newQuestion, 450);
}

startBtn.addEventListener("click", start);
submitBtn.addEventListener("click", submit);
ansEl.addEventListener("keydown", (e)=>{ if(e.key==="Enter") submit(); });
