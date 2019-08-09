var http = require('http');
var fs = require('fs');
var path = require('path');
var mime = require('mime');

var cache = {};

function send404(response){
    response.writeHead(404, {'Content-Type' : 'text/plain'});
    response.write('Error 404: resource not found.');
    response.end();
}

function sendFile(response, filePath, fileContents){
    response.writeHead(
        200,
        {'Content-Type' : mime.lookup(path.basename(filePath))}
    );
    response.end(fileContents);
}

function serveStatic(response, cache, absPath){
    if (cache[absPath]) {
        sendFile(response, absPath, cache[absPath]);
    } else {
        fs.exists(absPath, function (exists) {
            if(exists){
                fs.readFile(absPath, function (err, data) {
                   if(err){
                       send404(response);
                   } else{
                       cache[absPath] = data;
                       sendFile(response, absPath, data);
                    }
                });
            }else{
                send404(response);
            }
        });
    }
}

var server = http.createServer(function (req, res) {
    var filePath = null;
    if(req.url === '/'){
        filePath = 'public/index.html';
    }else{
        filePath = 'public' + req.url;
    }
    var absPath = './' + filePath;
    serveStatic(res, cache, absPath);
});

server.listen(80, function(){
    console.log("Server listening on Port 80.");
});

var chatServer = require("./lib/chat_server");
chatServer.listen(server);
var socketio = require("socket.io");
var io;
var guestNum = 1;
var nickNames = {};
var namesUsed = [];
var currRoom = {};

exports.listen = function(server) {
    io = socketio.listen(server);
    io.set("log level", 1);
    io.sockets.on("connection", function (socket){
        guestNum = assignGuestName(socket, guestNum, nickNames, namesUsed);
        joinRoom(socket, "Lobby");
        handleMessageBroadcasting(socket, nickNames);
        handleNameChangeAttempts(socket, nickNames, namesUsed);
        handleRoomJoining(socket);
        socket.on("rooms", function(){
            socket.emit("rooms", io.sockets.manager.rooms);
        });
        handleClientDisconnection(socket, nickNames, namesUsed);
    });
};