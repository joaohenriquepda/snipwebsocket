'use strict';
const url = require('url');
const Redis = require("redis");
const socketio = require('socket.io');
const redisAdapter = require('socket.io-redis');

exports.websocket = function (app) {

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

    const uri = 'redis://h:p4bf134313c9a011110f5e035d28e73ed7d359ac2cee68136c6de5932746b0bab@ec2-3-217-82-56.compute-1.amazonaws.com:10269';
    const port = process.env.REDIS_PORT;
    const host = process.env.REDIS_HOST;

    // const redis = Redis.createClient(port, host);
    // const pub = Redis.createClient(port, host);
    // const sub = Redis.createClient(port, host);

    // Para realizar testes será usado a URI do Heroku
    const pub = Redis.createClient(uri);
    const sub = Redis.createClient(uri);
    const redis = Redis.createClient(uri);

    io.adapter(redisAdapter({ pubClient: pub, subClient: sub }));

    var CHANNELS = [];
    var USERS = [];
    var USERS_REDIS = [];
    var CHANNELS_REDIS = [];

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

    var setUsersRedis = function (users) {
        redis.set('USERS', JSON.stringify(users), function (err, value) {
            if (err) {
                console.log("REDIS ERRO", err);
            } else {
                console.log("SET", value);
            }
        });
    };

    var getUsersRedis = function () {
        redis.get('USERS', function (error, value) {
            if (value === null) {
                setUsersRedis(USERS_REDIS);
            } else {
                USERS_REDIS = JSON.parse(value);
            }
        });
    };

    var setChannelsRedis = function (channels) {
        redis.set('CHANNELS', JSON.stringify(channels), function (err, value) {
            if (err) {
                console.log("REDIS ERRO", err);
            } else {
                console.log("SET", value);
            }
        });
    };

    var getChannelsRedis = function () {
        redis.get('CHANNELS', function (error, value) {
            if (value === null) {
                setChannelsRedis(CHANNELS_REDIS);
            } else {
                console.log(value);
                CHANNELS_REDIS = JSON.parse(value);
            }
        });
    };

    redis.on('connect', function () {
        console.log('Redis connect in websocket');
    });

    io.on('connection', (socket) => {

        console.log("++++++++++++++++++++++++++++++++++++++++++++++");
        console.log("Connected", socket.id);
        console.log("++++++++++++++++++++++++++++++++++++++++++++++");

        socket.on('open-edit', function (info) {
            var data = JSON.parse(info);
            console.log('OPEN EDIT___________________________________');

            getUsersRedis();
            getChannelsRedis();

            var check_user = USERS.filter(user => {
                return user.data.user.id === data.user.id;
            });

            console.log("++++++++++++++++++++++++++++++++++++++++++++++===");
            console.log("Connected", socket.id);
            console.log("++++++++++++++++++++++++++++++++++++++++++++++===");

            if (check_user.length >= 1) {
                if (check_user[0].data.collection === data.collection && check_user[0].data.thing === data.thing) {
                    USERS.push({ data, id: socket.id, status: false });
                } else {
                    USERS.push({ data, id: socket.id, status: true });
                }
            } else {
                USERS.push({ data, id: socket.id, status: true });
            }

            var room = data.collection + data.thing;
            socket.join(room);

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

            //  Procurar uma melhor forma de realizar esse filter - provavelmente listar os usuário de um canal e selecionar pelo socket_id

            var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
            users = users.filter(user => (user.status === true));

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

            setChannelsRedis(CHANNELS_REDIS);
            setUsersRedis(USERS_REDIS);

        });

        socket.on('unarchive-edit', function (data) {

            console.log("unarchived-edit________________");
            getUsersRedis();
            getChannelsRedis();
            var info = JSON.parse(data);
            var room = info.collection + info.thing;
            var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
            var user = users.filter(user => (user.id === socket.id));

            setInfoChannels(info, 'alert', user);

            var status = getChannels(info).status;
            var text = "Arquivo desarquivado";
            var msg = getMessage(info, text, user, users, status);

            socket.to(room).emit('message', msg);
            setUsersRedis(USERS);
            setChannelsRedis(CHANNELS);

        });


        socket.on('archived-edit', function (data) {
            console.log("archived-edit");
            getUsersRedis();
            getChannelsRedis();

            var info = JSON.parse(data);
            var room = info.collection + info.thing;
            var users = USERS.filter(user => (user.data.collection === info.collection && user.data.thing === info.thing));
            var user = users.filter(user => (user.id === socket.id))[0];

            setInfoChannels(info, 'archived', user);

            var status = getChannels(info).status;
            var text = "Arquivado";
            var msg = getMessage(info, text, user, users, status);

            socket.to(room).emit('message', msg);

            setUsersRedis(USERS_REDIS);
            setChannelsRedis(CHANNELS_REDIS);
        });

        socket.on('save-edit', function (data) {
            console.log("Save-edit____________");
            getUsersRedis();
            getChannelsRedis();
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

            setUsersRedis(USERS_REDIS);
            setChannelsRedis(CHANNELS_REDIS);
            // socket.to(room).emit('message', msg);
        });

        socket.on('file-edit', function (data) {
            console.log("File Edit__________________________________________________________________________");
            getUsersRedis();
            getChannelsRedis();
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

            setUsersRedis(USERS_REDIS);
            setChannelsRedis(CHANNELS_REDIS);
        });

        socket.on('close-connection', function (info) {
            console.log('close Connection________________________________________________');
            getUsersRedis();
            getChannelsRedis();

            if (info != null) {
                var data = JSON.parse(info);
                var room = data.collection + data.thing;
                socket.leave(room);
                var index = USERS.findIndex(user => user.id === socket.id);
                var user_off = USERS.filter(user => user.id === socket.id)[0];
                // Socketid será diferente porém o id do usuário não 
                USERS.splice(index, 1);

                var nUser = USERS.findIndex(user => user.data.user.id === user_off.data.user.id);
                console.log("US", nUser);
                if (nUser >= 0) {
                    USERS[nUser].status = true;
                }

                var users = USERS.filter(user => (user.data.collection === data.collection && user.data.thing === data.thing));
                users = users.filter(user => (user.status === true));

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
            setUsersRedis(USERS_REDIS);
            setChannelsRedis(CHANNELS_REDIS);
        });

        socket.on('disconnect', function () {


            if (USERS.findIndex(user => user.id === socket.id) != -1) {
                console.log('client disconnect...______________________________________________');
                getUsersRedis();
                getChannelsRedis();
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

                    var users = USERS.filter(user => (user.data.collection === user_off.data.collection && user.data.thing === user_off.data.thing && user.status === true));
                    var user = check.user_edit;
                    var data = { collection: user_off.data.collection, thing: user_off.data.thing };
                    var status = check.status;
                    var text = '';
                    var msg = getMessage(data, text, user, users, status);

                    io.in(room).emit('message', msg);
                }
                setUsersRedis(USERS_REDIS);
                setChannelsRedis(CHANNELS_REDIS);
            }
        });

        socket.on('error', function (err) {
            console.log('received error from client:', socket.id);
            console.log(err);
        });
    });


};