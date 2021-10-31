const cluster = require("cluster");
const http = require("http");
const { setupMaster } = require("@socket.io/sticky");
const { setupPrimary } = require("@socket.io/cluster-adapter");
const recluster = require("recluster");
const path = require("path");
const axios = require("axios");

const httpServer = http.createServer();

// setup sticky sessions
setupMaster(httpServer, {
  loadBalancingMethod: "round-robin",
});

setupPrimary();

cluster.setupMaster({
  serialization: "advanced",
});

httpServer.listen(3000);

console.log("[Master 0] " + "Started at PID: " + process.pid);

const balancer = recluster(path.join(__dirname, "worker.js"));

balancer.run();

setInterval(async () => {
  axios.get("https://www.timeapi.io/api/Time/current/zone?timeZone=Europe/Berlin").then(time => {
    Object.keys(cluster.workers).forEach((id) => {
      cluster.workers[id].send({ type: 'variable', name: "time", data: time.data })
    });
  });
}, 1000);