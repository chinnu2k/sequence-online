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

function buildBoardCards(){
  let cards=[];
  for(let d=0; d<2; d++){
    suits.forEach(s=>{
      ranks.forEach(r=>{
        cards.push(r+s);
      });
    });
  }
  return cards.sort(()=>Math.random()-0.5);   // 100 cards
}

function buildDeck(){
  let deck=[];
  for(let d=0; d<2; d++){
    suits.forEach(s=>{
      ranks.forEach(r=>{
        deck.push(r+s);
      });
    });
  }
  for(let i=0;i<4;i++){ deck.push("JE"); deck.push("JEE"); }
  return deck.sort(()=>Math.random()-0.5);
}

function newGame(){
  const boardCards = buildBoardCards();
  const board = boardCards.map(c => ({ card:c, chip:null }));

  // ✅ Now board EXISTS, so set FREE corners
  [0,9,90,99].forEach(i=>{
    board[i].card = "FREE";
    board[i].chip = "wild";
  });

  const deck = buildDeck();

  return {
    board,
    deck,
    hands:{ red:deck.splice(0,7), blue:deck.splice(0,7) },
    current:"red",
    scores:{red:0,blue:0},
    sequenceCells:[]
  };
}

function isMineOrWild(cell,color){
  return cell.chip===color || cell.chip==="wild";
}

function checkSequence(g,color){
  const dirs = [[0,1],[1,0],[1,1],[1,-1]];

  for(let i=0;i<100;i++){
    const base = g.board[i];
    if(!base || !isMineOrWild(base,color) || g.sequenceCells.includes(i)) continue;

    const r=Math.floor(i/10), c=i%10;

    for(const [dx,dy] of dirs){
      let cells=[i];

      for(let k=1;k<5;k++){
        const nr=r+dx*k, nc=c+dy*k;
        if(nr<0||nr>9||nc<0||nc>9) break;
        const idx=nr*10+nc;
        const cell=g.board[idx];
        if(!cell || !isMineOrWild(cell,color) || g.sequenceCells.includes(idx)) break;
        cells.push(idx);
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
    if(!rooms[room].players.includes(socket.id) && rooms[room].players.length<2)
      rooms[room].players.push(socket.id);

    const role = rooms[room].players[0]===socket.id?"red":"blue";
    socket.emit("role", role);
    socket.emit("sync", rooms[room].game);
  });

  socket.on("move", ({room,index,card,color})=>{
    const g = rooms[room].game;
    if(g.current!==color) return;

    const cell=g.board[index];

    if(card==="JE"){
      if(cell.chip && cell.chip!==color && cell.chip!=="wild") cell.chip=null;
      else return;
    }
    else if(card==="JEE"){
      if(!cell.chip) cell.chip=color;
      else return;
    }
    else{
      if(cell.card!==card || cell.chip) return;
      cell.chip=color;
    }

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
