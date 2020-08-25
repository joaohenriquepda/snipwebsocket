'use strict';

const express = require('express');
const url = require('url');

// const WebSocket = require('ws').Server;

const PORT = process.env.PORT || 9000;
const INDEX = '/index.html';

const server = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

// const wss = new WebSocket({ server });

const io = require('socket.io')(server, {
    transports: ['websocket'],
    pingInterval: 0,
    pingTimeout: 50000,
    perMessageDeflate: false,
    handlePreflightRequest: (req, res) => {
        const headers = {
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Allow-Origin": req.headers.origin, //or the specific origin you want to give access to,
            "Access-Control-Allow-Credentials": true
        };
        res.writeHead(200, headers);
        res.end();
    }
})

console.log("SNIP WEBSOCKET EDIT FILE SERVER UP!!!");
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

var getChannels = function (data) {
    return CHANNELS[data.collection][data.thing][0];
}

var setInfoChannels = function (data, status, user) {
    CHANNELS[data.collection][data.thing][0]["status"] = status;
    CHANNELS[data.collection][data.thing][0]["id_edit"] = user.id;
    CHANNELS[data.collection][data.thing][0]["user_edit"] = user;
}


io.on('connection', (socket) => {

    socket.on('open-edit', function (info) {

        console.log('OPEN EDIT___________________________________');
        var data = JSON.parse(info);
        var room = data.collection + data.thing
        socket.join(room);
        USERS.push({ data, id: socket.id });

        //Connectados no channel
        var elements = Object.keys(io.sockets.adapter.rooms[room].sockets)

        if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
            CHANNELS[data.collection] = [];
            CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "", "id_edit": "" }];
        } else {
            if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
                CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "", "id_edit": "" }];
            }
        }
        var channel = CHANNELS[data.collection][data.thing][0];

        //  Procurar uma melhor forma de realizar esse filter - provavelmente listar os usuário de um canal e selecionar pelo socket_id
        var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));

        if (channel.user_edit === '') {
            var user = '';
        } else {
            var user = channel.user_edit
        }

        var text = (users.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";
        var status = channel.status;
        var msg = getMessage(data, text, user, users, status);

        if (channel.status === 'block') {
            elements.forEach(element => {
                if (channel.id_edit != element) {
                    io.to(element).emit('message', msg);
                }
            });
        } else {
            io.to(room).emit('message', msg);
        }
    });

    socket.on('unarchive-edit', function (data) {

        console.log("unarchived-edit________________");
        var info = JSON.parse(data);
        var room = info.collection + info.thing
        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id));

        setInfoChannels(info, 'alert', user);

        var status = getChannels(info).status;
        var text = "Arquivo desarquivado";
        var msg = getMessage(info, text, user, users, status);

        socket.to(room).emit('message', msg);

    });


    socket.on('archived-edit', function (data) {
        console.log("archived-edit");
        var info = JSON.parse(data);
        var room = info.collection + info.thing
        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id))[0];

        setInfoChannels(info, 'archived', user);

        var status = getChannels(info).status;
        var text = "Arquivado";
        var msg = getMessage(info, text, user, users, status);

        socket.to(room).emit('message', msg);
    });

    socket.on('save-edit', function (data) {
        console.log("Save-edit____________");
        var info = JSON.parse(data);
        var room = info.collection + info.thing
        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => (user.id === socket.id))[0];

        setInfoChannels(info, 'update', user);

        var channel = getChannels(info);
        var status = channel.status;
        var text = "A edição está desabilitada";
        var msg = getMessage(info, text, user, users, status);

        var clients = Object.keys(io.sockets.adapter.rooms[room].sockets);
        clients.forEach(element => {
            if (channel.id_edit != element) {
                io.to(element).emit('message', msg);
            }
        })

        // socket.to(room).emit('message', msg);
    });

    socket.on('file-edit', function (data) {
        console.log("File Edit__________________________________________________________________________");
        var info = JSON.parse(data);
        var room = info.collection + info.thing
        var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
        var user = users.filter(user => user.id === socket.id)[0];

        setInfoChannels(info, 'block', user);

        var channel = getChannels(info);
        var status = channel.status;
        var text = "A edição está desabilitada";
        var msg = getMessage(info, text, user, users, status);


        var clients = Object.keys(io.sockets.adapter.rooms[room].sockets);
        clients.forEach(element => {
            if (channel.id_edit != element) {
                io.to(element).emit('message', msg);
            }
        })
        // socket.to(room).emit('message', msg);
    });

    socket.on('close-connection', function (info) {

        console.log('close Connection________________________________________________--');
        var data = JSON.parse(info);
        var room = data.collection + data.thing
        socket.leave(room);
        var index = USERS.findIndex(user => user.id === socket.id);
        var user_off = USERS.filter(user => user.id === socket.id)[0];
        USERS.splice(index, 1);
        var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));

        var check = getChannels(user_off.data)

        if (check.id_edit === socket.id) {
            if (check.status != 'archived') {
                check.status = 'alert';
            }
        }

        var info_channel = getChannels(data);

        var user = info_channel.user_edit;
        var status = info_channel.status;
        var text = "";
        var msg = getMessage(data, text, user, users, status);

        if (info_channel.status !== 'block') {
            io.in(room).emit('message', msg);
        } else {
            var clients = Object.keys(io.sockets.adapter.rooms[room].sockets);
            clients.forEach(element => {
                if (info_channel.id_edit != element) {
                    io.to(element).emit('message', msg);
                }
            });
        }
    });

    socket.on('disconnect', function () {
        console.log('client disconnect...______________________________________________');
        var room = data.collection + data.thing
        var index = USERS.findIndex(user => user.id === socket.id);
        var user_off = USERS.filter(user => user.id === socket.id)[0];
        USERS.splice(index, 1);

        if (user_off != undefined) {
            var check = getChannels(user_off.data);
            if (check.id_edit === socket.id) {
                if (check.status != 'archived') {
                    check.status = 'alert';
                }
            }

            var users = USERS.filter(user => (user.data.collection === user_off.data.collection && user.data.thing === user_off.data.thing));
            var user = check.user_edit;
            var data = { collection: user_off.data.collection, thing: user_off.data.thing };
            var status = check.status;
            var text = '';
            var msg = getMessage(data, text, user, users, status);

            io.in(room).emit('message', msg);
        }

    });

    socket.on('error', function (err) {
        console.log('received error from client:', socket.id);
        console.log(err);
    });
});


//// AQUI COMEÇA O NOVO

// initialization
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

//     ws.on('test', function test() { 
//         console.log("sfvpviernjviowrjv-mwróvjmeropbjepobjeopbjeopbkqepobjpotedjk");
//     });

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
