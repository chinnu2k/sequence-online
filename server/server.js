const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:"*"}});

app.get("/",(_,res)=>res.send("Sequence Server Live"));

let rooms = {};

function newGame(){
  const cards=["2","3","4","5","6","7","8","9","10","J","Q","K","A"];
  let deck=[];
  for(let i=0;i<8;i++) cards.forEach(c=>deck.push(c));
  for(let i=0;i<4;i++){deck.push("JE");deck.push("JEE");}
  deck.sort(()=>Math.random()-0.5);

  const board=Array.from({length:100},()=>({card:cards[Math.random()*cards.length|0],chip:null}));
  return { board, deck, hands:{red:deck.splice(0,5), blue:deck.splice(0,5)}, current:"red", scores:{red:0,blue:0} };
}

io.on("connection", socket => {

  socket.on("join", room=>{
    socket.join(room);
    if(!rooms[room]) rooms[room]={ players:[], game:newGame() };

    if(rooms[room].players.length<2)
      rooms[room].players.push(socket.id);

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

    io.to(room).emit("sync", g);
  });
});

server.listen(process.env.PORT||3000);
