const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

let rooms = {};

io.on("connection", socket => {

  socket.on("join", room => {
    socket.join(room);
    if(!rooms[room]) rooms[room]={players:[],state:null};
    rooms[room].players.push(socket.id);
    io.to(room).emit("players", rooms[room].players.length);
  });

  socket.on("gameState", ({room,state})=>{
    rooms[room].state = state;
    socket.to(room).emit("sync", state);
  });

});

server.listen(process.env.PORT || 3000);
