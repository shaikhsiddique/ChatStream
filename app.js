const express = require('express');
const path = require('path');
const socket_io = require('socket.io');  // Corrected the typo here
const http = require('http');
require('dotenv').config();
const app = express();
const server = http.createServer(app);
const io = socket_io(server);

const indexRouter = require('./routes');

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use('/', indexRouter);

let room = {};
let watingUser =[];

io.on("connection", (socket) => {
    console.log("connected");
    socket.on("join-room",()=>{
        if(watingUser.length>0){
            let partner = watingUser.shift();
            let roomName = `${socket.id}-${partner.id}`;
            socket.join(roomName);
            partner.join(roomName);

            io.to(roomName).emit("joined",roomName);
        }
        else{
            watingUser.push(socket)
        }
    })

    socket.on('send-message',(data)=>{
        socket.broadcast.to(data.room).emit('new-message',data.message);
        
    })
    socket.on('signalingMessage', (data) => {
        socket.broadcast.to(data.room).emit('signalingMessage',data.message)
    });
    
    socket.on("startVideoCall",({room})=>{
        socket.broadcast.to(room).emit("incomingCall");
    })

    socket.on("acceptCall",({room})=>{
        socket.broadcast.to(room).emit("callAccepted");
    })
    
    socket.on('rejectCall',({ room })=>{
        socket.broadcast.to(room).emit("rejectCall");
    })

    socket.on('disconnect',()=>{
        let index = watingUser.findIndex((users)=>{
            return users.id === socket.id;
        })
        watingUser.splice(index,1);
    })
});

server.listen(process.env.PORT || 3000, () => {
    console.log('Server is running on port 3000');
});

