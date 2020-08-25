'use strict';

const express = require('express');
const url = require('url');

const WebSocket = require('ws').Server;

const PORT = process.env.PORT || 9000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

const io = require('socket.io')(server, {
    pingInterval: 600,
    pingTimeout: 500,
})
// const io = require('socket.io').listen(app, { transports: ['websocket'] });
// const io = require('socket.io')().listen(app);

// const io = require('socket.io')(server);
// const io = require('socket.io')().listen(server);
// const io = require('socket.io').listen(server);
// const io = require('socket.io')(server, { 'transports': ['websocket', 'polling'] });


// const io = require('socket.io')(app);
//  const io = require('socket.io')(app, { 'transports': ['websocket', 'polling'] });


console.log("SNIP WEBSOCKET EDIT FILE SERVER UP!!!");
// const wss = new WebSocket({ server: app });
var CHANNELS = [];
var USERS = [];

var getMessage = function (data, text, user, users, status) {
    var msg = {
        collection: data.collection,
        thing: data.thing,
        message: text,
        status: status,
        users: users,
        user: user
    };

    return msg;
};

io.on('connection', (socket) => {

    // socket.on('register', function (data) {
    //     console.log("Register", data);
    // });

    socket.on('open-edit', function (info) {
        console.log('OPEN EDIT');
        var data = JSON.parse(info);
        console.log(data.thing);
        socket.join(data.collection);
        USERS.push({ data, id: socket.id });

        if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
            console.log('Não Tinha');
            CHANNELS[data.collection] = [];
            CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "0", "id_edit": "0" }];
        } else {
            console.log("Entidade já registrada");
            if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
                CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "0", "id_edit": "0" }];
            }
        }

        var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
        var user = CHANNELS[data.collection][data.thing][0]['user_id'];
        // users.filter(user => user.id === socket.id);
        var text = (users.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";
        var status = CHANNELS[data.collection][data.thing][0]['status'];
        var id_edit = CHANNELS[data.collection][data.thing][0]['id_edit'];
        var msg = getMessage(data, text, user, users, status);
        var clients = io.sockets.adapter.rooms[data.collection].sockets;

        console.log(clients);

        // console.log("VERIFY", CHANNELS[data.collection][data.thing]);
        var ele = Object.keys(clients)
        // console.log("SHOW WLW", ele);
        if (CHANNELS[data.collection][data.thing][0].status !== 'block') {
            io.to(data.collection).emit('message', msg);
        } else {
            ele.forEach(element => {
                console.log(CHANNELS[data.collection][data.thing][0]);
                console.log("ELEMENTO", element);
                if (CHANNELS[data.collection][data.thing][0].id_edit != element) {
                    console.log("ENVIOU");
                    msg.message = "PA VC FOI CARALHo"
                    io.to(element).emit('message', msg);
                }
            });
        }

    });

    socket.on('unarchive-edit', function (data) {

        console.log("unarchived-edit");
        var info = JSON.parse(data);

        console.log(info.collection);
        console.log(info.thing);
        console.log(CHANNELS);

        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id));

        CHANNELS[info.collection][info.thing][0]["status"] = "alert";
        CHANNELS[info.collection][info.thing][0]["id_edit"] = '';
        CHANNELS[info.collection][info.thing][0]["user_edit"] = '';

        var id_edit = CHANNELS[info.collection][info.thing][0]['id_edit'];
        var status = CHANNELS[info.collection][info.thing][0]['status'];
        var text = "Arquivo desarquivado";
        var msg = getMessage(info, text, user, users, status);

        socket.to(info.collection).emit('message', msg);

    });


    socket.on('archived-edit', function (data) {
        console.log("archived-edit");
        var info = JSON.parse(data);

        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id));

        CHANNELS[info.collection][info.thing][0]["status"] = "archived";
        CHANNELS[info.collection][info.thing][0]["id_edit"] = '';
        CHANNELS[info.collection][info.thing][0]["user_edit"] = '';

        var status = CHANNELS[info.collection][info.thing][0]['status'];
        var text = "Arquivado";
        var msg = getMessage(info, text, user, users, status);

        socket.to(info.collection).emit('message', msg);
    });

    socket.on('save-edit', function (data) {
        console.log("Save-edit");
        var info = JSON.parse(data);

        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id));

        CHANNELS[info.collection][info.thing][0]["status"] = "update";
        CHANNELS[info.collection][info.thing][0]["id_edit"] = user;
        CHANNELS[info.collection][info.thing][0]["user_edit"] = user.id;

        var id_edit = CHANNELS[info.collection][info.thing][0]['id_edit'];
        var status = CHANNELS[info.collection][info.thing][0]['status'];
        var text = "A edição está desabilitada";
        var msg = getMessage(info, text, user, users, status);

        socket.to(info.collection).emit('message', msg);
    });

    socket.on('file-edit', function (data) {
        console.log("File Edit__________________________________________________________________________");
        var info = JSON.parse(data);
        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => user.id === socket.id)[0];

        console.log(user);
        CHANNELS[info.collection][info.thing][0].status = 'block';
        CHANNELS[info.collection][info.thing][0].user_edit = user;
        CHANNELS[info.collection][info.thing][0].id_edit = user.id;

        console.log(CHANNELS[info.collection][info.thing][0]);
        console.log("ERA PRA", CHANNELS[info.collection][info.thing][0]['id_edit']);
        console.log("ERA PARA", CHANNELS[info.collection][info.thing][0]['user_edit']);

        var text = "A edição está desabilitada";
        var id_edit = CHANNELS[info.collection][info.thing][0]['id_edit'];
        var status = CHANNELS[info.collection][info.thing][0]['status'];
        var msg = getMessage(info, text, user, users, status);

        socket.to(info.collection).emit('message', msg);
    });

    socket.on('close-connection', function (info) {

        console.log('close Connection________________________________________________--');
        var data = JSON.parse(info);
        socket.leave(data.collection);
        var index = USERS.findIndex(user => user.id === socket.id);
        var user_off = USERS.filter(user => {
            return (user.id === socket.id);
        })[0];

        USERS.splice(index, 1);
        console.log("User EDIT ID", CHANNELS[data.collection][data.thing][0]['id_edit']);
        console.log("ANTES", CHANNELS[data.collection][data.thing][0]["status"]);

        if (CHANNELS[user_off.data.collection][data.thing][0]['id_edit'] === socket.id) {

            if (CHANNELS[data.collection][data.thing][0]["status"] != 'archived') {
                console.log("!= ARCHIVED");
                CHANNELS[data.collection][data.thing][0]["status"] = 'alert';
            }
        }

        console.log("DEPOIS", CHANNELS[data.collection][data.thing][0]["status"]);
        var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
        var user = CHANNELS[data.collection][data.thing][0]['user_edit'];
        var status = CHANNELS[data.collection][data.thing][0]['status'];
        var text = "";
        var id_edit = CHANNELS[data.collection][data.thing][0]['id_edit'];
        var msg = getMessage(data, text, user, users, status, id_edit, socket.id);

        if (CHANNELS[data.collection][data.thing][0].status !== 'block') {
            console.log("DIFERENTE DE BLOCK");
            io.in(data.collection).emit('message', msg);
        } else {

            var clients = io.sockets.adapter.rooms[data.collection].sockets;
            var ele = Object.keys(clients)
            console.log(clients);

            ele.forEach(element => {
                console.log(CHANNELS[data.collection][data.thing][0]);
                console.log("ELEMENTO", element);
                if (CHANNELS[data.collection][data.thing][0].id_edit != element) {
                    console.log("ENVIOU");
                    msg.message = "logout"
                    io.to(element).emit('message', msg);
                }
            });
        }

        // io.in(data.collection).emit('message', msg);

    });

    socket.on('disconnect', function () {
        console.log('client disconnect...______________________________________________');
        // var data = JSON.parse(info);
        // console.log(USERS);
        console.log(socket.id);
        var index = USERS.findIndex(user => {
            return (user.id === socket.id);
        });
        console.log(index);
        var user_off = USERS.filter(user => {
            return (user.id === socket.id);
        })[0];
        USERS.splice(index, 1);

        if (user_off != undefined) {

            console.log("User", user_off.data);

            if (CHANNELS[user_off.data.collection][user_off.data.thing][0]["id_edit"] === socket.id) {

                if (CHANNELS[user_off.data.collection][user_off.data.thing][0]["status"] != 'archived') {
                    CHANNELS[user_off.data.collection][user_off.data.thing][0]["status"] = 'alert';
                }
            }

            var users = USERS.filter(user => (user.data.collection === user_off.data.collection && user.data.thing === user_off.data.thing));
            var user = CHANNELS[user_off.data.collection][user_off.data.thing][0]['user_edit'];
            var data = { collection: user_off.data.collection, thing: user_off.data.thing };

            var status = CHANNELS[user_off.data.collection][user_off.data.thing][0]['status'];
            var text = '';
            var id_edit = CHANNELS[user_off.data.collection][user_off.data.thing][0]['id_edit'];
            var msg = getMessage(data, text, user, users, status);

            io.in(data.collection).emit('message', msg);
        }

    });

    socket.on('error', function (err) {
        console.log('received error from client:', socket.id);
        console.log(err);
    });
});
//// AQUI COMEÇA O NOVO

// // initialization
// var CHANNELS = [];

// wss.broadcastChannel = function broadcastChannel(channel, data) {

//     var users = [];

//     channel.forEach((client) => {
//         users.push(client.payload.user);
//     });

//     var text = (channel.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";

//     var msg = {
//         collection: data.collection,
//         thing: data.thing,
//         message: text,
//         status: channel.status,
//         users: users,
//         user: channel.user_edit
//     };

//     channel.forEach((client) => {
//         if (client.payload.user.id === channel.id_edit) {
//             msg.status = "alert";
//             client.connection.send(JSON.stringify(msg));
//         } else {
//             msg.status = channel.status;
//             client.connection.send(JSON.stringify(msg));
//         }
//     });
// };

// wss.broadcastUpdateFile = function broadcastUpdateFile(channel, data) {

//     var users = [];

//     channel.forEach((client) => {
//         users.push(client.payload.user);
//     });


//     console.log("EDITION FILE");
//     var msg = JSON.stringify({
//         collection: data.collection,
//         thing: data.thing,
//         message: "A edição está desabilitada",
//         status: channel.status,
//         user: data.user,
//         users: users
//     });

//     channel.forEach((client) => {
//         if (client.payload.user.id !== data.user.id) {
//             client.connection.send(msg);
//         }
//     });
// };

// wss.broadcastUnarchiveFile = function broadcastUnarchiveFile(channel, data) {

//     var users = [];

//     channel.forEach((client) => {
//         users.push(client.payload.user);
//     });

//     var msg = JSON.stringify({
//         collection: data.collection,
//         thing: data.thing,
//         message: "Arquivo desarquivado",
//         status: channel.status,
//         user: data.user,
//         users: users
//     });

//     channel.forEach((client) => {
//         if (client.payload.user.id !== data.user.id) {
//             client.connection.send(msg);
//         }
//     });
// };


// wss.broadcastArchivedFile = function broadcastArchivedFile(channel, data) {

//     var users = [];

//     channel.forEach((client) => {
//         users.push(client.payload.user);
//     });

//     var msg = JSON.stringify({
//         collection: data.collection,
//         thing: data.thing,
//         message: "Arquivado",
//         status: channel.status,
//         user: data.user,
//         users: users
//     });

//     channel.forEach((client) => {
//         if (client.payload.user.id !== data.user.id) {
//             client.connection.send(msg);
//         }
//     });
// };

// wss.broadcastSaveFile = function broadcastSaveFile(channel, data) {

//     var users = [];

//     channel.forEach((client) => {
//         users.push(client.payload.user);
//     });

//     console.log("SAVE FILE");

//     var msg = JSON.stringify({
//         collection: data.collection,
//         thing: data.thing,
//         message: "Precisa atualizar o arquivo",
//         status: channel.status,
//         user: data.user,
//         users: users
//     });

//     channel.forEach((client) => {
//         if (client.payload.user.id !== data.user.id) {
//             client.connection.send(msg);
//         }
//     });

//     channel.status = "alert";
// };

// wss.on('connection', (ws, req) => {
//     ws.on('message', function incoming(data) {
//         console.log(data);
//         data = JSON.parse(data);
//         switch (data.message) {
//             case 'open-edit':
//                 if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
//                     console.log('Não Tinha');
//                     CHANNELS[data.collection] = [];
//                     CHANNELS[data.collection][data.thing] = [];
//                     CHANNELS[data.collection][data.thing]["status"] = "alert";
//                     CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
//                     console.log(CHANNELS[data.collection][data.thing]);
//                     wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
//                     console.log(CHANNELS);
//                 } else {
//                     console.log("Entidade já registrada");
//                     if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
//                         CHANNELS[data.collection][data.thing] = [];
//                         CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
//                     } else {
//                         CHANNELS[data.collection][data.thing].push({ payload: data, connection: ws });
//                         wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
//                     }
//                 }
//                 break;
//             case 'unarchive-edit':
//                 console.log("Unarchived");
//                 CHANNELS[data.collection][data.thing]["status"] = "alert";
//                 wss.broadcastUnarchiveFile(CHANNELS[data.collection][data.thing], data);
//                 break;
//             case 'archived-edit':
//                 CHANNELS[data.collection][data.thing]["status"] = "archived";
//                 wss.broadcastArchivedFile(CHANNELS[data.collection][data.thing], data);
//                 break;
//             case 'reset-server':
//                 console.log("Reset Server");
//                 CHANNELS = [];
//                 // CHANNELS[data.collection][data.thing]["status"] = "block";
//                 // CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
//                 // CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
//                 // wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
//                 break;
//             case 'save-edit':
//                 CHANNELS[data.collection][data.thing]["status"] = "update";
//                 CHANNELS[data.collection][data.thing]["id_edit"] = '';
//                 CHANNELS[data.collection][data.thing]["user_edit"] = '';
//                 wss.broadcastSaveFile(CHANNELS[data.collection][data.thing], data);
//                 break;
//             case 'file-edit':
//                 console.log("Editing file");
//                 CHANNELS[data.collection][data.thing]["status"] = "block";
//                 CHANNELS[data.collection][data.thing]["user_edit"] = data.user;
//                 CHANNELS[data.collection][data.thing]["id_edit"] = data.user.id;
//                 wss.broadcastUpdateFile(CHANNELS[data.collection][data.thing], data);
//                 break;
//             case 'close-connection':
//                 console.log("Quit connection");
//                 var index = CHANNELS[data.collection][data.thing].findIndex(x => x.payload.user.id === data.user.id);
//                 // console.log(CHANNELS[data.collection][data.thing].length);


//                 if (CHANNELS[data.collection][data.thing]["id_edit"] === data.user.id) {

//                     if (CHANNELS[data.collection][data.thing]["status"] != 'archived') {
//                         CHANNELS[data.collection][data.thing]["status"] = 'alert';
//                     }
//                 }
//                 // delete CHANNELS[data.collection][data.thing][index]
//                 // console.log(CHANNELS[data.collection][data.thing]);
//                 CHANNELS[data.collection][data.thing].splice(index, 1);
//                 // console.log(CHANNELS[data.collection][data.thing]);
//                 // if (CHANNELS[data.collection][data.thing].length === 0) {
//                 //     console.log("ACHOU");
//                 // } else {
//                 // }
//                 wss.broadcastChannel(CHANNELS[data.collection][data.thing], data);
//                 // CHANNELS[data.collection][data.thing][index].connection.close();
//                 // console.log(CHANNELS[data.collection]);
//                 break;
//             default:
//                 console.log("Unexpected event");
//                 console.log(CHANNELS[data.collection][data.thing]);
//         }
//     });
// });
