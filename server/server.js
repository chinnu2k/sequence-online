const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*"}});

app.get("/",(_,res)=>res.send("Sequence Server Live"));

let rooms = {};
if(fs.existsSync("./rooms.json")){
  rooms = JSON.parse(fs.readFileSync("./rooms.json"));
}

function saveRooms(){
  fs.writeFileSync("./rooms.json", JSON.stringify(rooms));
}

const suits = ["♠","♣","♥","♦"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","Q","K"];

function buildBoardCards(){
  const board=[];
  for(let d=0; d<2; d++)
    suits.forEach(s=>ranks.forEach(r=>board.push(r+s)));
  return board;
}

function buildDeck(){
  let deck=[];
  for(let d=0; d<2; d++)
    suits.forEach(s=>ranks.forEach(r=>deck.push(r+s)));
  for(let i=0;i<4;i++){ deck.push("JE"); deck.push("JEE"); }
  return deck.sort(()=>Math.random()-0.5);
}

function newGame(){
  const boardCards=buildBoardCards().sort(()=>Math.random()-0.5);
  const board=[];
  for(let i=0;i<100;i++){
    if([0,9,90,99].includes(i)) board.push({card:"FREE",chip:"wild"});
    else board.push({card:boardCards.pop(),chip:null});
  }
  const deck=buildDeck();
  return {
    board,
    deck,
    hands:{red:deck.splice(0,7),blue:deck.splice(0,7)},
    current:"red",
    scores:{red:0,blue:0},
    sequenceGroups:[]
  };
}

function isMineOrWild(c,color){
  return c.chip===color||c.chip==="wild";
}

function checkSequence(g,color){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let i=0;i<100;i++){
    if(!isMineOrWild(g.board[i],color)) continue;
    const r=Math.floor(i/10),c=i%10;
    for(const[d1,d2] of dirs){
      let cells=[i];
      for(let k=1;k<5;k++){
        const nr=r+d1*k,nc=c+d2*k;
        if(nr<0||nr>9||nc<0||nc>9) break;
        const idx=nr*10+nc;
        if(!isMineOrWild(g.board[idx],color)) break;
        if(g.sequenceGroups.flat().includes(idx)) break;
        cells.push(idx);
      }
      if(cells.length===5){
        g.sequenceGroups.push(cells);
        g.scores[color]++;
        return true;
      }
    }
  }
  return false;
}

io.on("connection",socket=>{

socket.on("join",room=>{
  socket.join(room);
  if(!rooms[room]) rooms[room]={players:[],game:newGame()};
  if(!rooms[room].players.includes(socket.id)&&rooms[room].players.length<2)
    rooms[room].players.push(socket.id);
  socket.emit("role", rooms[room].players[0]===socket.id?"red":"blue");
  socket.emit("sync", rooms[room].game);
});

socket.on("discard",({room,card,color})=>{
  const g=rooms[room].game;
  if(g.current!==color) return;
  if(g.board.some(c=>c.card===card&&c.chip===color)) return;
  g.hands[color]=g.hands[color].filter(c=>c!==card);
  g.hands[color].push(g.deck.pop());
  g.current=color==="red"?"blue":"red";
  saveRooms();
  io.to(room).emit("sync",g);
});

socket.on("move",({room,index,card,color})=>{
  const g=rooms[room].game;
  if(g.current!==color) return;
  const cell=g.board[index];

  if(card==="JE"){
    if(g.sequenceGroups.flat().includes(index)) return;
    if(cell.chip&&cell.chip!==color&&cell.chip!=="wild") cell.chip=null;
    else return;
  }
  else if(card==="JEE"){
    if(!cell.chip) cell.chip=color;
    else return;
  }
  else{
    if(cell.card!==card||cell.chip) return;
    cell.chip=color;
  }

  g.hands[color].splice(g.hands[color].indexOf(card),1);
  g.hands[color].push(g.deck.pop());
  if(checkSequence(g,color)&&g.scores[color]>=2){
    io.to(room).emit("gameover",color);
    return;
  }

  g.current=color==="red"?"blue":"red";
  saveRooms();
  io.to(room).emit("sync",g);
});
});

server.listen(process.env.PORT||3000);
