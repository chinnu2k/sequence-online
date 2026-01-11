const socket = io("https://sequence-backend-cnv1.onrender.com");
const room = prompt("Room Code");
socket.emit("join", room);

let myColor = null;
let game = null;
let selectedCard = null;

const boardEl = document.getElementById("board");
const turnText = document.getElementById("turn");
const redHandEl = document.getElementById("redHand");
const blueHandEl = document.getElementById("blueHand");

socket.on("role", r => {
  myColor = r;
  turnText.innerText = "You are " + r.toUpperCase();
});

socket.on("sequence", color=>{
  alert(color.toUpperCase()+" formed a SEQUENCE!");
});


socket.on("sync", state => {
  game = state;                     // FIRST assign game

  document.getElementById("redScore").innerText = game.scores.red;
  document.getElementById("blueScore").innerText = game.scores.blue;

  draw();
});


function draw(){
  if(!game) return;   // ⬅️ THIS IS THE FIX
  drawBoard();
  drawHands();
}


function drawBoard(){
  if(!game || !game.board) return;

  boardEl.innerHTML="";
  game.board.forEach((c,i)=>{
    const d=document.createElement("div");
    d.className="cell";
    if(c.chip) d.classList.add(c.chip);
    d.innerText = c.card || "";
    d.onclick = ()=>playMove(i);
    boardEl.appendChild(d);
  });
}


function drawHands(){
  if(!game || !game.hands) return;

  redHandEl.innerHTML="🔴 "+game.hands.red.map(c=>
    `<span class="card ${myColor==='red' && game.current==='red'?'':'disabled'}"
      onclick="${myColor==='red' && game.current==='red'?`selectCard('${c}')`:''}">${c}</span>`
  ).join("");

  blueHandEl.innerHTML="🔵 "+game.hands.blue.map(c=>
    `<span class="card ${myColor==='blue' && game.current==='blue'?'':'disabled'}"
      onclick="${myColor==='blue' && game.current==='blue'?`selectCard('${c}')`:''}">${c}</span>`
  ).join("");

  document.getElementById("redScore").innerText = game.scores.red;
  document.getElementById("blueScore").innerText = game.scores.blue;
}


function selectCard(c){ selectedCard = c; }

function playMove(i){
  if(!selectedCard) return alert("Select a card");
  if(game.current !== myColor) return alert("Wait for your turn!");

  socket.emit("move",{
    room,
    index: i,
    card: selectedCard,
    color: myColor
  });

  selectedCard=null;
}
