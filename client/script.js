const socket = io("https://sequence-backend-cnv1.onrender.com");
const room = prompt("Room Code");
socket.emit("join", room);

let myColor = null;

const boardEl = document.getElementById("board");
const turnText = document.getElementById("turn");
const redHandEl = document.getElementById("redHand");
const blueHandEl = document.getElementById("blueHand");

let current = "red";
let selectedCard = null;
let scores = { red: 0, blue: 0 };
let sequenceCells = new Set();

const cards = ["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
const board = Array.from({length:100},()=>({
  card: cards[Math.floor(Math.random()*cards.length)],
  chip: null
}));

let deck=[];
function buildDeck(){
  deck=[];
  for(let i=0;i<8;i++) cards.forEach(c=>deck.push(c));
  for(let i=0;i<4;i++){ deck.push("JE"); deck.push("JEE"); }
  deck.sort(()=>Math.random()-0.5);
}
buildDeck();

let hands = { red:deck.splice(0,5), blue:deck.splice(0,5) };

socket.on("role", r=>{
  myColor = r;
  turnText.innerText = "You are " + r.toUpperCase();
});

function drawBoard(){
  boardEl.innerHTML="";
  board.forEach((c,i)=>{
    const d=document.createElement("div");
    d.className="cell";
    if(c.chip) d.classList.add(c.chip);
    d.innerText=c.card;
    d.onclick=()=>playMove(i);
    boardEl.appendChild(d);
  });
}

function drawHands(){
  redHandEl.innerHTML="🔴 "+hands.red.map(c=>
    `<span class="card ${current==='red'?'':'disabled'}" onclick="${current==='red'?`selectCard('${c}')`:''}">${c}</span>`
  ).join("");

  blueHandEl.innerHTML="🔵 "+hands.blue.map(c=>
    `<span class="card ${current==='blue'?'':'disabled'}" onclick="${current==='blue'?`selectCard('${c}')`:''}">${c}</span>`
  ).join("");
}

function selectCard(c){ selectedCard=c; }

function playMove(i){
  if(current !== myColor) return alert("Wait for your turn!");
  if(!selectedCard) return alert("Pick a card");

  const cell = board[i];

  if(selectedCard==="JE"){
    if(cell.chip && cell.chip!==current) cell.chip=null;
    else return;
  }
  else if(selectedCard==="JEE"){
    if(!cell.chip) cell.chip=current;
    else return;
  }
  else{
    if(cell.card!==selectedCard || cell.chip) return;
    cell.chip=current;
  }

  hands[current].splice(hands[current].indexOf(selectedCard),1);
  hands[current].push(deck.pop());

  if(checkSequence(current)){
    scores[current]++;
    document.getElementById("redScore").innerText=scores.red;
    document.getElementById("blueScore").innerText=scores.blue;
    if(scores[current]===2){
      alert(current.toUpperCase()+" WINS!");
      location.reload();
    }
  }

  selectedCard = null;
  current = current === "red" ? "blue" : "red";
  turnText.innerText = current + "'s turn";

  socket.emit("move",{ room, index:i, card:selectedCard, color:myColor });


  drawBoard();
  drawHands();

}

function checkSequence(color){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let i=0;i<100;i++){
    if(board[i].chip!==color||sequenceCells.has(i))continue;
    const r=i/10|0,c=i%10;
    for(const[dX,dY] of dirs){
      let cells=[i];
      for(let k=1;k<5;k++){
        let idx=(r+dX*k)*10+(c+dY*k);
        if(board[idx]?.chip===color && !sequenceCells.has(idx)) cells.push(idx);
        else break;
      }
      if(cells.length===5){
        cells.forEach(x=>sequenceCells.add(x));
        return true;
      }
    }
  }
  return false;
}

socket.on("sync",state=>{
  Object.assign(board,state.board);
  hands=state.hands;
  current=state.current;
  scores=state.scores;
  drawBoard(); drawHands();
});

drawBoard(); drawHands();
