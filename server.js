'use strict';

const express = require('express');
const url = require('url');

const WebSocket = require('ws').Server;

const PORT = process.env.PORT || 9000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const wss = new WebSocket({ server: server });

// const io = require('socket.io').listen(server);
console.log("SNIP WEBSOCKET EDIT FILE SERVER UP!!!");

var CHANNELS = [];
var USERS = [];

// var getMessage = function (data, text, user, users, status) {
//     var msg = {
//         collection: data.collection,
//         thing: data.thing,
//         message: text,
//         status: status,
//         users: users,
//         user: user
//     };

//     return msg;
// };

// io.on('connection', (socket) => {

//     socket.on('register', function (data) {
//         console.log("Register", data);
//     });

//     socket.on('open-edit', function (info) {
//         var data = JSON.parse(info);
//         // console.log(data.thing);
//         socket.join(data.collection);
//         USERS.push({ data, id: socket.id });

//         if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
//             console.log('Não Tinha');
//             CHANNELS[data.collection] = [];
//             CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "0", "id_edit": "0" }];
//         } else {
//             console.log("Entidade já registrada");
//             if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
//                 CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "0", "id_edit": "0" }];
//             }
//         }

//         var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
//         var user = users.filter(user => user.id === socket.id);
//         var text = (users.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";
//         var status = CHANNELS[data.collection][data.thing][0]['status'];
//         var msg = getMessage(data, text, user, users, status);

//         // console.log(CHANNELS[data.collection][data.thing][0]['status']);
//         // var clients = io.sockets.adapter.rooms[data.collection].sockets;
//         io.in(data.collection).emit('message', msg);
//     });

//     socket.on('unarchive-edit', function (data) {

//         console.log("unarchived-edit");
//         var info = JSON.parse(data);

//         console.log(info.collection);
//         console.log(info.thing);
//         console.log(CHANNELS);

//         var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
//         var user = users.filter(user => (user.id === socket.id));

//         CHANNELS[info.collection][info.thing][0]["status"] = "alert";
//         CHANNELS[info.collection][info.thing][0]["id_edit"] = '';
//         CHANNELS[info.collection][info.thing][0]["user_edit"] = '';

//         var status = CHANNELS[info.collection][info.thing][0]['status'];
//         var text = "Arquivo desarquivado";
//         var msg = getMessage(info, text, user, users, status);

//         socket.to(info.collection).emit('message', msg);

//     });


//     socket.on('archived-edit', function (data) {
//         console.log("archived-edit");
//         var info = JSON.parse(data);

//         var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
//         var user = users.filter(user => (user.id === socket.id));

//         CHANNELS[info.collection][info.thing][0]["status"] = "archived";
//         CHANNELS[info.collection][info.thing][0]["id_edit"] = '';
//         CHANNELS[info.collection][info.thing][0]["user_edit"] = '';

//         var status = CHANNELS[info.collection][info.thing][0]['status'];
//         var text = "Arquivado";
//         var msg = getMessage(info, text, user, users, status);

//         socket.to(info.collection).emit('message', msg);


//     });

//     socket.on('save-edit', function (data) {
//         console.log("Save-edit");
//         var info = JSON.parse(data);

//         var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
//         var user = users.filter(user => (user.id === socket.id));

//         CHANNELS[info.collection][info.thing][0]["status"] = "update";
//         CHANNELS[info.collection][info.thing][0]["id_edit"] = user;
//         CHANNELS[info.collection][info.thing][0]["user_edit"] = user.id;

//         var status = CHANNELS[info.collection][info.thing][0]['status'];
//         var text = "A edição está desabilitada";
//         var msg = getMessage(info, text, user, users, status);

//         socket.to(info.collection).emit('message', msg);
//     });

//     socket.on('file-edit', function (data) {
//         console.log("File Edit");
//         var info = JSON.parse(data);
//         console.log(info);
//         var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
//         var user = users.filter(user => (user.id === socket.id));

//         CHANNELS[info.collection][info.thing][0]['status'] = 'block';
//         CHANNELS[info.collection][info.thing][0]["user_edit"] = user;
//         CHANNELS[info.collection][info.thing][0]["id_edit"] = user.id;

//         var text = "A edição está desabilitada";
//         var status = CHANNELS[info.collection][info.thing][0]['status'];
//         var msg = getMessage(info, text, user, users, status);

//         socket.to(info.collection).emit('message', msg);
//     });

//     socket.on('close-connection', function (info) {

//         console.log('close Connection');
//         var data = JSON.parse(info);
//         console.log(socket.id);
//         socket.leave(data.collection);
//         var index = USERS.findIndex(user => user.id === socket.id);
//         USERS.splice(index, 1);

//         console.log(USERS);

//         var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
//         var user = '';
//         console.log(users);
//         var status = CHANNELS[data.collection][data.thing][0]['status'];
//         var text = "";
//         var msg = getMessage(data, text, user, users, status);

//         io.in(data.collection).emit('message', msg);

//     });

//     socket.on('disconnect', function () {
//         console.log('client disconnect...');
//         // var data = JSON.parse(info);
//         // console.log(USERS);
//         console.log(socket.id);
//         var index = USERS.findIndex(user => {
//             return (user.id === socket.id);
//         });
//         console.log(index);
//         var user_off = USERS.filter(user => {
//             return (user.id === socket.id);
//         })[0];
//         console.log("User", user_off.data);
//         USERS.splice(index, 1);

//         var users = USERS.filter(user => (user.data.collection === user_off.data.collection && user.data.thing === user_off.data.thing));
//         var user = '';
//         var data = { collection: user_off.data.collection, thing: user_off.data.thing };

//         var status = CHANNELS[user_off.data.collection][user_off.data.thing][0]['status'];
//         var text = "";
//         var msg = getMessage(data, text, user, users, status);

//         io.in(data.collection).emit('message', msg);

//     });

//     socket.on('error', function (err) {
//         //   console.log('received error from client:', client.id)
//         //   console.log(err)
//     });

//     socket.on('all-users', function () {
//         console.log('Allusers');
//         console.log(io.sockets.adapter.rooms['1']);
//         console.log(Object.keys(io.sockets.connected).length);
//         socket.to('1').emit('message', "let's play a game");
//     });


// });
//// AQUI COMEÇA O NOVO

// initialization
var CHANNELS = [];

wss.broadcastChannel = function broadcastChannel(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var text = (channel.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";

    var msg = {
        collection: data.collection,
        thing: data.thing,
        message: text,
        status: channel.status,
        users: users,
        user: channel.user_edit
    };

    channel.forEach((client) => {
        if (client.payload.user.id === channel.id_edit) {
            msg.status = "alert";
            client.connection.send(JSON.stringify(msg));
        } else {
            msg.status = channel.status;
            client.connection.send(JSON.stringify(msg));
        }
    });
};

wss.broadcastUpdateFile = function broadcastUpdateFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });


    console.log("EDITION FILE");
    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "A edição está desabilitada",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};

wss.broadcastUnarchiveFile = function broadcastUnarchiveFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Arquivo desarquivado",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};


wss.broadcastArchivedFile = function broadcastArchivedFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Arquivado",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });
};

wss.broadcastSaveFile = function broadcastSaveFile(channel, data) {

    var users = [];

    channel.forEach((client) => {
        users.push(client.payload.user);
    });

    console.log("SAVE FILE");

    var msg = JSON.stringify({
        collection: data.collection,
        thing: data.thing,
        message: "Precisa atualizar o arquivo",
        status: channel.status,
        user: data.user,
        users: users
    });

    channel.forEach((client) => {
        if (client.payload.user.id !== data.user.id) {
            client.connection.send(msg);
        }
    });

    channel.status = "alert";
};

wss.on('connection', (ws, req) => {
    ws.on('message', function incoming(data) {
        console.log(data);
        data = JSON.parse(data);
        switch (data.message) {
            case 'open-edit':
                if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
                    console.log('Não Tinha');
                    CHANNELS[data.collection] = [];
                    CHANNELS[data.collection][data.thing] = [];
                    CHANNELS[data.collection][data.thing]["status"] = "alert";
                    CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                    console.log(CHANNELS[data.collection][data.thing]);
                    wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                    console.log(CHANNELS);
                } else {
                    console.log("Entidade já registrada");
                    if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
                        CHANNELS[data.collection][data.thing] = [];
                        CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                    } else {
                        CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
                        wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                    }
                }
                break;
            case 'unarchive-edit':
                console.log("Unarchived");
                CHANNELS[data.collection][data.thing]["status"] = "alert";
                wss.broadcastUnarchiveFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'archived-edit':
                CHANNELS[data.collection][data.thing]["status"] = "archived";
                wss.broadcastArchivedFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'reset-server':
                console.log("Reset Server");
                CHANNELS = [];
                // CHANNELS[data.collection][data.thing]["status"] = "block";
                // CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
                // CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
                // wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'save-edit':
                CHANNELS[data.collection][data.thing]["status"] = "update";
                CHANNELS[data.collection][data.thing]["id_edit"] = '';
                CHANNELS[data.collection][data.thing]["user_edit"] = '';
                wss.broadcastSaveFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'file-edit':
                console.log("Editing file");
                CHANNELS[data.collection][data.thing]["status"] = "block";
                CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
                CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
                wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
                break;
            case 'close-connection':
                console.log("Quit connection");
                var index = CHANNELS[data.collection][data.thing].findIndex(x => x.payload.user.id === data.user.id);
                // console.log(CHANNELS[data.collection][data.thing].length);


                if (CHANNELS[data.collection][data.thing]["id_edit"] === data.user.id) {

                    if (CHANNELS[data.collection][data.thing]["status"] != 'archived') {
                        CHANNELS[data.collection][data.thing]["status"] = 'alert';
                    }
                }
                // delete CHANNELS[data.collection][data.thing][index]
                // console.log(CHANNELS[data.collection][data.thing]);
                CHANNELS[data.collection][data.thing].splice(index, 1);
                // console.log(CHANNELS[data.collection][data.thing]);
                // if (CHANNELS[data.collection][data.thing].length === 0) {
                //     console.log("ACHOU");
                // } else {
                // }
                wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
                // CHANNELS[data.collection][data.thing][index].connection.close();
                // console.log(CHANNELS[data.collection]);
                break;
            default:
                console.log("Unexpected event");
                console.log(CHANNELS[data.collection][data.thing]);
        }
    });
});
