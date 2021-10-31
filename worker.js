const cluster = require("cluster");
const http = require("http");
const { Server } = require("socket.io");
const { setupWorker } = require("@socket.io/sticky");
const { createAdapter } = require("@socket.io/cluster-adapter");

const httpServer = http.createServer();
const io = new Server(httpServer);
io.adapter(createAdapter());
setupWorker(io);

var variables = [];
var subscribers = [];

cluster.worker.on('message', variable => {
    if(variable.type && variable.type == 'variable')
        variables[variable.name] = variable.data;

    Object.keys(subscribers).forEach((id) => {
        if(subscribers[id][variable.name] instanceof Function)
            subscribers[id][variable.name](variable.data);
    });
});

console.log("[Worker " + cluster.worker.id + "] " + "Started at PID: " + process.pid);

io.on('connection', (socket) => {
    console.log("[Worker " + cluster.worker.id + "] " + "Socket connected with ID: " + socket.id);
    socket.on('time', event => {
        subscribe(socket, event, "time");
    })
    socket.on('disconnect', () => {
        console.log("[Worker " + cluster.worker.id + "] " + "Socket disconnected with ID: " + socket.id);
        delete subscribers[socket.id];
    })
    socket.on('benchmark', () => {
        for (let i = 0; i < 1e8; i++) {}
        socket.emit('benchmark');
    })
});

const subscribe = (socket, event, variable) => {
    if(event == 'subscribe') {
        socket.emit(variable, variables[variable] || {})
        subscribers[socket.id] = {};
        subscribers[socket.id][variable] = (data) => {
            socket.emit(variable, data)
        }

    } else if(event == 'unsubscribe') {
        delete subscribers[socket.id][variable];
    }
};