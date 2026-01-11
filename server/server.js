const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*"}});

app.get("/",(_,res)=>res.send("Sequence Server Live"));

let rooms = {};

const suits = ["♠","♣","♥","♦"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","Q","K"];

function buildDeck(){
  let deck=[];
  for(let d=0;d<2;d++){
    suits.forEach(s=>{
      ranks.forEach(r=>deck.push(r+s));
    });
  }

  for(let i=0;i<4;i++){ deck.push("JE"); deck.push("JEE"); }
  return deck.sort(()=>Math.random()-0.5);
}

function newGame(){
  const deck = buildDeck();
  const normalCards = [];
suits.forEach(s => ranks.forEach(r => normalCards.push(r+s)));

const board = Array.from({length:100},()=>({
  card: normalCards[Math.floor(Math.random()*normalCards.length)],
  chip:null
}));


  return {
    board,
    deck,
    hands:{ red:deck.splice(0,5), blue:deck.splice(0,5) },
    current:"red",
    scores:{red:0,blue:0},
    sequenceCells:[]
  };
}

function checkSequence(g,color){
  const dirs=[[0,1],[1,0],[1,1],[1,-1]];
  for(let i=0;i<100;i++){
    if(g.board[i].chip!==color || g.sequenceCells.includes(i)) continue;
    const r=i/10|0,c=i%10;

    for(const[dX,dY] of dirs){
      let cells=[i];
      for(let k=1;k<5;k++){
        let idx=(r+dX*k)*10+(c+dY*k);
        if(g.board[idx]?.chip===color && !g.sequenceCells.includes(idx))
          cells.push(idx);
        else break;
      }
      if(cells.length===5){
        g.sequenceCells.push(...cells);
        g.scores[color]++;
        return true;
      }
    }
  }
  return false;
}

io.on("connection", socket => {

  socket.on("join", room=>{
    socket.join(room);
    if(!rooms[room]) rooms[room]={ players:[], game:newGame() };
    if(rooms[room].players.length<2) rooms[room].players.push(socket.id);

    const role = rooms[room].players[0]===socket.id?"red":"blue";
    socket.emit("role", role);
    socket.emit("sync", rooms[room].game);
  });

  socket.on("move", ({room,index,card,color})=>{
    const g = rooms[room].game;
    if(g.current!==color) return;

    const cell=g.board[index];

    if(card==="JE"){ if(cell.chip&&cell.chip!==color) cell.chip=null; else return; }
    else if(card==="JEE"){ if(!cell.chip) cell.chip=color; else return; }
    else{ if(cell.card!==card||cell.chip) return; cell.chip=color; }

    g.hands[color].splice(g.hands[color].indexOf(card),1);
    g.hands[color].push(g.deck.pop());
    g.current = g.current==="red"?"blue":"red";

    if(checkSequence(g,color)){
      io.to(room).emit("sequence", color);
    }

    io.to(room).emit("sync", g);
  });
});

server.listen(process.env.PORT||3000);
