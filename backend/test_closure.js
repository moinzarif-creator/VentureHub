let io;
module.exports = {
    init: () => { io = "ready" },
    check: () => console.log(io)
};
