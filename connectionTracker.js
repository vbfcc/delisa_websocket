// connectionTracker.js

let connectedUsersCount = 0;

module.exports = {
  trackUserConnection: (socket) => {
    connectedUsersCount++;

    socket.on('disconnect', () => {
      connectedUsersCount--;
    });
  },
  getConnectedUsersCount: () => connectedUsersCount,
};
