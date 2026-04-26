const { initSocket, getIo, createNotification } = require('./utils/socketManager');
const http = require('http');

const server = http.createServer();
initSocket(server);

console.log("io from getIo():", !!getIo());

// Now let's print `io` inside createNotification by temporarily modifying it?
// No, we can just look at socketManager.js

