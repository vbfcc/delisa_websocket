const axios = require('axios');
const { userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users')
const baseDomain = 'https://panel.delisa.pro'
const serverPort = 3000;

const io = require("socket.io")(serverPort, {
    serveClient: false,
    // below are engine.IO options
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
  });

  let user;

  io.use( async (socket, next) => {
    let handshake = socket.handshake;
    token = (handshake.auth.token)
    user = getCurrentUser(socket.id);
    if(!user)
    {
        user = userJoin(socket.id,token);
        user = await checkToken(user);
        console.log('!user');
    }
    if(user.permission)
    {
        console.log('user');
        next();
    }else{
        return user;
        console.log(user);
    }
  });

  io.on("connection", (socket) => {
      const userRoom = user.room;
      socket.join(userRoom);

      //send user is connected for partner
      io.to(userRoom).emit('room',{
        partner_is_connected: true,
        });
      console.log(
          {
              username:user.username,
              connected:true
          }
        );

    //check if partner is connected send partner is connected for self
    socket.emit('room',{
        partner_is_connected:(getRoomUsers(userRoom).length == 2) ? true : false
    });
    //Listen for chat message
    socket.on('chatMessage',(msg)=>{
        const user = getCurrentUser(socket.id);
        socket.broadcast.to(user.room).emit('message',{
            id : msg.id,
            music_name : msg.music_name,
            url : msg.url,
            time : msg.time,
            status: msg.status,
            index: msg.index,
            extra: msg.extra
        });
        console.log(msg);
    });

    socket.on('disconnect',(socket)=>{
        io.to(userRoom).emit('room',{
            partner_is_connected: false
        });
        console.log({
            username:user.username,
            connected:false
        });
        userLeave(socket.id);
    })
  });


async function checkToken(user)
  {
     if(user.permission == false)
    {
        let config = {
            headers: {
            Accept: 'application/json',
            Authorization : user.token,
            }
        }
        await axios.post(baseDomain+'/api/v1/auth/me',{},config)
        .then(function (response) {
            user.username = response.data.data.name;
            user.room = response.data.data.relation.id;
            user.permission = true;
        })
        .catch(function (error) {
            user.permission = false;
        });
    }
    return user;
  }