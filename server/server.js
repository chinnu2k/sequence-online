const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors:{origin:"*"} });

app.get("/", (req, res) => {
  res.send("Sequence Socket Server is running 🚀");
});
let rooms = {};

io.on("connection", socket => {

  socket.on("join", room => {
    socket.join(room);

    if(!rooms[room]){
      rooms[room] = { players: [], state: null };
    }

    if(rooms[room].players.length < 2){
      rooms[room].players.push(socket.id);
    }

    const role = rooms[room].players[0] === socket.id ? "red" : "blue";

    socket.emit("role", role);

    if(rooms[room].state){
      socket.emit("sync", rooms[room].state);
    }
  });

  socket.on("gameState", ({room,state})=>{
    rooms[room].state = state;
    socket.to(room).emit("sync", state);
  });

  socket.on("disconnect", () => {
  for(const room in rooms){
    rooms[room].players = rooms[room].players.filter(id => id !== socket.id);

    if(rooms[room].players.length === 0){
      delete rooms[room];
    }
  }
});


});


server.listen(process.env.PORT || 3000);
