const users = []

// join user to chat 
function userJoin(id, token){
    var user = {
        id:id,
        username:null,
        token:token,
        room:null,
        permission:false
    }
    users.push(user);
    return user;
}

// get current user
function getCurrentUser(id)
{
    return users.find((user) => user.id == id);
}

//user leave 
function userLeave(id)
{
    const index = users.findIndex(user => user.id == id);
    if(index !== -1)
    {
        return users.splice(index,1)[0];
    }
}

//get room users 
function getRoomUsers(room)
{
    return users.filter(user => user.room == room);
}

module.exports = {
    userJoin,
    getCurrentUser,
    userLeave,
    getRoomUsers
}