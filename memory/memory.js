const gridEl = document.getElementById("grid");
const movesEl = document.getElementById("moves");
const matchedEl = document.getElementById("matched");
const timeEl = document.getElementById("time");
const sizeSel = document.getElementById("size");
const newGameBtn = document.getElementById("newGame");

const winOverlay = document.getElementById("win");
const winMoves = document.getElementById("winMoves");
const winTime = document.getElementById("winTime");
const playAgain = document.getElementById("playAgain");

const EMOJI = ["🐶","🐱","🦊","🐻","🐼","🐵","🐸","🐧","🦄","🐝","🦋","🐢","🐙","🦁","🐯","🐰","🐷","🐨","🦖","🦕","🐳","🦉","🦀","🍎","🍌","🍓","🍇","🍉","🍒","🥕","🍕","🍩","⚽","🏀","🎮","🚗","✈️","🚀","⭐","🌈"];

let total = 16;
let first = null, second = null;
let lock = false;
let moves = 0;
let matched = 0;
let seconds = 0;
let timer = null;

function shuffle(arr){
  for(let i=arr.length-1;i>0;i--){
    const j = Math.floor(Math.random()*(i+1));
    [arr[i],arr[j]]=[arr[j],arr[i]];
  }
  return arr;
}

function startTimer(){
  stopTimer();
  seconds = 0;
  timeEl.textContent = seconds;
  timer = setInterval(()=>{ seconds++; timeEl.textContent = seconds; },1000);
}
function stopTimer(){ if(timer){ clearInterval(timer); timer=null; } }

function buildGrid(n){
  // n is number of cards
  const side = Math.sqrt(n) | 0;
  gridEl.style.gridTemplateColumns = `repeat(${side}, minmax(0, 1fr))`;
}

function newGame(){
  total = Number(sizeSel.value);
  const pairs = total / 2;

  moves = 0; matched = 0;
  movesEl.textContent = moves;
  matchedEl.textContent = matched;
  first = null; second = null; lock = false;

  winOverlay.classList.remove("show");
  winOverlay.setAttribute("aria-hidden","true");

  buildGrid(total);

  const picks = shuffle([...EMOJI]).slice(0, pairs);
  const cards = shuffle([...picks, ...picks]).map((sym, idx) => ({
    id: idx,
    sym,
    flipped: false,
    matched: false
  }));

  gridEl.innerHTML = "";
  for (const c of cards){
    const btn = document.createElement("button");
    btn.className = "cardBtn";
    btn.setAttribute("aria-label","card");
    btn.dataset.id = String(c.id);
    btn.dataset.sym = c.sym;
    btn.textContent = "❓";
    btn.addEventListener("click", () => flip(btn));
    gridEl.appendChild(btn);
  }

  startTimer();
}

function flip(btn){
  if(lock) return;
  if(btn.classList.contains("matched")) return;
  if(btn.classList.contains("flipped")) return;

  btn.classList.add("flipped");
  btn.textContent = btn.dataset.sym;

  if(!first){
    first = btn;
    return;
  }
  second = btn;
  moves++;
  movesEl.textContent = moves;

  if(first.dataset.sym === second.dataset.sym){
    first.classList.add("matched");
    second.classList.add("matched");
    matched += 2;
    matchedEl.textContent = matched;
    first = null; second = null;

    if(matched === total){
      stopTimer();
      winMoves.textContent = String(moves);
      winTime.textContent = String(seconds);
      winOverlay.classList.add("show");
      winOverlay.setAttribute("aria-hidden","false");
    }
    return;
  }

  lock = true;
  setTimeout(()=>{
    first.classList.remove("flipped");
    second.classList.remove("flipped");
    first.textContent = "❓";
    second.textContent = "❓";
    first = null; second = null;
    lock = false;
  }, 550);
}

newGameBtn.addEventListener("click", newGame);
playAgain.addEventListener("click", newGame);
sizeSel.addEventListener("change", newGame);

newGame();
