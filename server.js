'use strict';

const express = require('express');
const socketio = require('socket.io');

const PORT = process.env.PORT || 9000;
const INDEX = '/index.html';

const app = express()
    .use((req, res) => res.sendFile(INDEX, { root: __dirname }))
    .listen(PORT, () => console.log(`Listening on ${PORT}`));

console.log("SNIP WEBSOCKET EDIT FILE SERVER UP!!!");

const io = socketio.listen(app, {
    transports: ['websocket'],
    pingInterval: 0,
    path: '/websocket',
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
});

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
};

var setInfoChannels = function (data, status, user) {
    CHANNELS[data.collection][data.thing][0]["status"] = status;
    CHANNELS[data.collection][data.thing][0]["id_edit"] = user.id;
    CHANNELS[data.collection][data.thing][0]["user_edit"] = user;
};

io.on('connection', (socket) => {
    console.log("Connected", socket.id);
    socket.on('open-edit', function (info) {

        console.log('OPEN EDIT___________________________________');
        var data = JSON.parse(info);
        var room = data.collection + data.thing;
        socket.join(room);
        USERS.push({ data, id: socket.id });

        //Connectados no channel
        var elements = Object.keys(io.sockets.adapter.rooms[room].sockets);

        if (Object.keys(CHANNELS).indexOf(data.collection) === -1) {
            CHANNELS[data.collection] = [];
            CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "", "id_edit": "" }];
        } else {
            if (Object.keys(CHANNELS[data.collection]).indexOf(data.thing) === -1) {
                CHANNELS[data.collection][data.thing] = [{ "status": "alert", "user_edit": "", "id_edit": "" }];
            }
        }
        var channel = CHANNELS[data.collection][data.thing][0];

        var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));

        var user;
        if (channel.user_edit === '') {
            user = '';
        } else {
            user = channel.user_edit;
        }

        var text = (users.length > 1) ? "Outras pessoas estão visualizando o mesmo arquivo" : "";
        var status = channel.status;
        var msg = getMessage(data, text, user, users, status);

        if (channel.status === 'block') {
            elements.forEach(element => {
                if (channel.id_edit != element) {
                    io.to(element).emit('message', msg);
                } else {
                    var new_msg = getMessage(data, text, user, users, 'alert');
                    io.to(element).emit('message', new_msg);
                }
            });
        } else {
            io.to(room).emit('message', msg);
        }
    });

    socket.on('unarchive-edit', function (data) {

        console.log("unarchived-edit________________");
        var info = JSON.parse(data);
        var room = info.collection + info.thing;
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
        var room = info.collection + info.thing;
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
        var room = info.collection + info.thing;
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
        });
        // socket.to(room).emit('message', msg);
    });

    socket.on('file-edit', function (data) {
        console.log("File Edit__________________________________________________________________________");
        var info = JSON.parse(data);
        var room = info.collection + info.thing;
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
        });
    });

    socket.on('close-connection', function (info) {
        console.log('close Connection________________________________________________--');
        if (info != null) {
            var data = JSON.parse(info);
            var room = data.collection + data.thing;
            socket.leave(room);
            var index = USERS.findIndex(user => user.id === socket.id);
            var user_off = USERS.filter(user => user.id === socket.id)[0];
            USERS.splice(index, 1);
            var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));

            var check = getChannels(user_off.data);

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
                    } else {
                        var new_msg = getMessage(data, text, user, users, 'alert');
                        io.to(element).emit('message', new_msg);
                    }
                });
            }
        }
    });

    socket.on('disconnect', function () {

        if (USERS.findIndex(user => user.id === socket.id) != -1) {
            console.log('client disconnect...______________________________________________');
            var user_off = USERS.filter(user => user.id === socket.id)[0];
            var room = user_off.collection + user_off.thing;
            var index = USERS.findIndex(user => user.id === socket.id);
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
        }

    });

    socket.on('error', function (err) {
        console.log('received error from client:', socket.id);
        console.log(err);
    });
});
