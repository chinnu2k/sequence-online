const socket = io("wss://sequence-backend-cnv1.onrender.com");

const room = prompt("Room Code");

let myColor = null;
let game = null;
let selectedCard = null;

const boardEl = document.getElementById("board");
const turnText = document.getElementById("turn");
const redHandEl = document.getElementById("redHand");
const blueHandEl = document.getElementById("blueHand");

socket.on("connect", () => {
  console.log("Connected:", socket.id);
  socket.emit("join", room);
});

socket.on("role", r => {
  myColor = r;
  turnText.innerText = "You are " + r.toUpperCase();
});

socket.on("sequence", color => {
  alert(color.toUpperCase() + " formed a SEQUENCE!");
});

socket.on("sync", state => {
  game = state;
  document.getElementById("redScore").innerText = game.scores.red;
  document.getElementById("blueScore").innerText = game.scores.blue;
  draw();
});

function draw(){
  if(!game) return;
  drawBoard();
  drawHands();
}

function drawBoard(){
  const q = document.getElementById("cardSearch").value || "";
  boardEl.innerHTML="";

  game.board.forEach((c,i)=>{
    const d = document.createElement("div");
    d.className = "cell";
    if(c.chip) d.classList.add(c.chip);

    // 🔥 FREE corner handling
    if(c.card === "FREE"){
      d.innerHTML = "<span class='freeCell'>FREE</span>";
      boardEl.appendChild(d);
      return;
    }

    const suit = c.card.slice(-1);
    const rank = c.card.slice(0,-1);

    let cls = "spadeCard";
    if(suit==="♣") cls="clubCard";
    if(suit==="♥") cls="heartCard";
    if(suit==="♦") cls="diamondCard";

    d.innerHTML = `<span class="rank">${rank}</span><span class="${cls}">${suit}</span>`;

    if(q && c.card.toLowerCase().includes(q.toLowerCase())){
      d.classList.add("highlight");
    }

    d.onclick = ()=>playMove(i);
    boardEl.appendChild(d);
  });
}



function renderCard(c, active){
  const span = document.createElement("span");
  span.className = "card" + (active ? "" : " disabled");
  span.innerText = c;

  if(active){
    span.addEventListener("click", () => {
      selectedCard = c;
      document.getElementById("cardSearch").value = c;   // 🔥 auto-fill search
      document.querySelectorAll(".card").forEach(e => e.classList.remove("selected"));
      span.classList.add("selected");
      drawBoard();   // update board highlight
});

  }
  return span;
}


function drawHands(){
  const q = document.getElementById("cardSearch").value || "";

  redHandEl.innerHTML = "🔴 ";
  blueHandEl.innerHTML = "🔵 ";

  if(myColor === "red"){
    game.hands.red.filter(c => c.includes(q)).forEach(c=>{
      redHandEl.appendChild(renderCard(c, game.current==="red"));
    });
  } else {
    redHandEl.innerHTML += "<span class='hiddenHand'>Opponent Hand</span>";
  }

  if(myColor === "blue"){
    game.hands.blue.filter(c => c.includes(q)).forEach(c=>{
      blueHandEl.appendChild(renderCard(c, game.current==="blue"));
    });
  } else {
    blueHandEl.innerHTML += "<span class='hiddenHand'>Opponent Hand</span>";
  }
}


function selectCard(c){ selectedCard=c; }

function playMove(i){
  if(!selectedCard) return alert("Select a card");
  if(game.current!==myColor) return alert("Wait for your turn!");

  socket.emit("move",{ room, index:i, card:selectedCard, color:myColor });

  // 🔥 clear search after using it
  document.getElementById("cardSearch").value = "";
  drawBoard();
  drawHands();

  selectedCard=null;

}

document.getElementById("cardSearch").addEventListener("input", () => {
  drawHands();
  drawBoard();
});

