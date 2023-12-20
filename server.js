const express = require('express');
const app = express();
const axios = require('axios');
const { userJoin, getCurrentUser, userLeave, getRoomUsers} = require('./utils/users')
const baseDomain = 'https://panel.delisa.app'
const serverPort = '300' + process.env.NODE_APP_INSTANCE || 0;

//this below line code is related to connectionTracker.js file
const connectionTracker = require('./connectionTracker');


const io = require("socket.io")(parseInt(serverPort), {
    serveClient: false,
    // below are engine.IO options
    pingInterval: 10000,
    pingTimeout: 5000,
    cookie: false
  });

  let user;

  io.use( async (socket, next) => {
    let handshake = socket.handshake;
  //  token = ()
  //this below line is for when need to send token without 'bearer'
  // token = 'bearer ' + (handshake.auth.token || handshake.query.token);
   token = handshake.auth.token || handshake.query.token;
   console.log(token);
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

  io.on("connection", async(socket) => {

//this below line code is related to connectionTracker.js file
    connectionTracker.trackUserConnection(socket);

      const userRoom = user.room;
      const pusher_channel = user.pusher_channel;
      socket.join(userRoom);
      socket.join(pusher_channel);

      //this below code part is for call this api
       // Function to check user connection status and call the API
    // const checkUserConnectionStatus = async () => {
    //     try {
    //         // Check user's connection status
    //         const response = await axios.post('https://panel.delisa.app/api/v1/isconnected', {
    //             status: socket.connected ? 1 : 0 // Check if the user is connected to the socket
    //         }, {
    //             headers: {
    //                 'Authorization': user.token
    //             }
    //         });

    //         console.log(`User connection status checked: ${socket.connected ? 'Connected' : 'Disconnected'}`);
    //     } catch (error) {
    //         console.error('Error checking user connection status:', error);
    //     }
    // };
    //     // Start checking user connection status immediately when they connect
    //     checkUserConnectionStatus();
    //  // Start checking user connection status every 2 minutes
    //  const intervalId = setInterval(checkUserConnectionStatus, 2 * 60 * 1000); // 2 minutes in milliseconds


      //send user is connected for partner
      socket.broadcast.to(userRoom).emit('room',{
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
        partner_is_connected:(getRoomUsers(userRoom).length == 2)
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

    //new chat part for new update on delisa
 // Listen for chat reactions
// socket.on('chatReaction', (msg) => {
//     const user = getCurrentUser(socket.id);
//     socket.broadcast.to(user.room).emit('reaction', {
//         // id : msg.id,
//         // messageId: msg.messageId,
//         // reactionType: msg.reactionType,
//         id: msg.id, // Unique identifier for the reaction
//         sender_id: msg.user.id, // ID of the user sending the reaction
//         receiver_id: msg.receiver_id, // ID of the user who received the reaction
//         emoji: msg.emoji, // The emoji used for the reaction
//         text: msg.text, // Optional text associated with the reaction
//         seen: false, // Initially set to false
//         created_at: new Date().toISOString(), // Timestamp for when the reaction was created
//     });
//     console.log(msg);
// });

// Assuming this is your 'chatReaction' event handler

socket.on('chatReaction', (msg) => {
    try {
        const user = getCurrentUser(socket.id);

        if (!user || !user.id) {
            // Handle the case where user or user.id is undefined or falsy
            console.error('User or user.id is undefined.');
            return; // Prevent further processing if user is undefined
        }

        // Access the user's id safely
        const userId = user.id;

        // Continue processing with the user's id
        socket.broadcast.to(user.room).emit('reaction', {
            id: msg.id,
            sender_id: userId, // Use the safely retrieved userId
            receiver_id: msg.receiver_id,
            emoji: msg.emoji,
            text: msg.text,
            seen: false,
            created_at: new Date().toISOString(),
        });
        console.log(msg);
    } catch (error) {
        // Handle any other unexpected errors
        console.error('Error in chatReaction event:', error);
    }
});


// Listen for marking messages as seen
socket.on('markSeen', (msg) => {
    const user = getCurrentUser(socket.id);
    // Update message status to "seen" for the user
    // You need to implement the logic to update the status in your data structure

    // Broadcast the updated status to all participants in the room
    socket.broadcast.to(user.room).emit('messageSeen', {
        id : msg.id,
        messageId: msg,
        //userId: user.id
    });
    console.log(`Message ${msg} marked as seen by user ${user.id}`);
});


    //Global message
    socket.on('send_notification',(msg)=>{
        const user = getCurrentUser(socket.id);
        io.to(msg.pusher_channel).emit('notification_listener',{
            title : msg.title,
            detail : msg.detail,
            result : msg.result,
            extra : msg.extra,
            date : msg.date
        });
    });

    socket.on('disconnect',async()=>{

              //this below code part is for call this api
            //   try {
            //     // Call the API with a status of 0 before clearing the interval
            //     await axios.post('https://panel.delisa.app/api/v1/isconnected', {
            //         status: 0
            //     }, {
            //         headers: {
            //             'Authorization': token
            //         }
            //     });
            //     console.log('User disconnected and API called with status 0');
            // } catch (error) {
            //     console.error('Error calling API with status 0:', error);
            // }
        
            // Clear the interval
            // clearInterval(intervalId);
        
        // await axios.post('https://panel.delisa.pro/api/v1/isconnected',{
        //     'status': 0
        //    },{
        //     headers: {
        //         'Authorization':token
        //     }
        //    });
    

        userLeave(socket.id)
        io.to(userRoom).emit('room',{
            partner_is_connected: false
        });
        console.log({
            username:user.username,
            connected:false
        });
    })
  });

  
//this below line code is related to connectionTracker.js file
app.get('/connected-users', (req, res) => {
    const connectedUsersCount = connectionTracker.getConnectedUsersCount();
    res.json({ connectedUsersCount });
  });

async function checkToken(user)
  {
     if(user.permission == false)
    {
        let config = 
        {
            
            headers: {
            Accept: 'application/json',
            Authorization : user.token,
            },
            params: {
                socket: 1,
            },
          
        }
        await axios.post(baseDomain+'/api/v1/auth/me',{},config)
        .then(function (response) {
            user.pusher_channel = response.data.data['pusher-channel']
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