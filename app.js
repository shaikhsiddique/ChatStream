const express = require('express');
const path = require('path');
const socket_io = require('socket.io');
const http = require('http');
const cookie_parser = require('cookie-parser');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socket_io(server);

const indexRouter = require('./routes');

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));
app.use(cookie_parser()); // Use cookie-parser before defining routes
app.use('/', indexRouter);

let room = {};
let waitingUser = []; // Corrected typo

io.on("connection", (socket) => {
    

    socket.on("join-room", (username) => {
        socket.username = username;

        if (waitingUser.length > 0) {
            let partner = waitingUser.shift();
            let roomName = `${socket.id}-${partner.id}`;
            // Join the room
            socket.join(roomName);
            partner.join(roomName);

            // Notify both users that they have joined the room, including their usernames
            io.to(roomName).emit("joined", {
                room: roomName,
                users: {
                    user1: { id: socket.id, username: socket.username },
                    user2: { id: partner.id, username: partner.username }
                }
            });
           

        } else {
            // Add the socket to the waiting list
            waitingUser.push(socket);
        }
    });

    socket.on('send-message', (data) => {
        socket.broadcast.to(data.room).emit('new-message', data.message);
    });

    socket.on('signalingMessage', (data) => {
        socket.broadcast.to(data.room).emit('signalingMessage', data.message);
    });

    socket.on("startVideoCall", ({ room }) => {
        socket.broadcast.to(room).emit("incomingCall");
    });

    socket.on("acceptCall", ({ room }) => {
        socket.broadcast.to(room).emit("callAccepted");
    });

    socket.on('rejectCall', ({ room }) => {
        socket.broadcast.to(room).emit("rejectCall");
    });

    socket.on('disconnect', () => {
        let index = waitingUser.findIndex((user) => user.id === socket.id);
        if (index !== -1) {
            waitingUser.splice(index, 1);
        }
    });
});

server.listen(process.env.PORT || 4000, () => {
    
});
