const express = require('express');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const mongoose = require('mongoose');
const User = require('./models/User');
const Message = require('./models/Message');
const ws = require('ws');
const fs = require('fs');

dotenv.config();
mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);


const app = express();
app.use('/uploads', express.static(__dirname + '/uploads'));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
}));

app.get('/test', (req,res) => {
    res.json('test ok');
});

async function getUserDataFromRequest(req) {

    return new Promise((resolve, reject) => {
        const token = req.cookies?.token;
        if (token) {
            jwt.verify(token, jwtSecret, {}, (err, userData) => {
                if(err) {
                    reject(err);
                }
                else {
                    resolve(userData);
                }
            });
        }
        else {
            reject(new Error('Token not found'));
        }
    });



    
}

app.get('/messages/:userId', async (req,res) => {
    const {userId} = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
        $or: [
            {sender: userId, recipient: ourUserId},
            {sender: ourUserId, recipient: userId},
        ]
    });
    res.json(messages);
});

app.get('/users', async (req,res) => {
    const users = await User.find({}, {'_id': 1, username: 1});
    res.json(users);
});

app.get('/profile', (req,res) => {
    const token = req.cookies?.token;
    if (token) {
        jwt.verify(token, jwtSecret, {}, (err, userData) => {
            if(err) throw err;
            res.json(userData);
        });
    }
    else
    {
        res.status(401).json('no token');
    }
    
});

app.post('/login', async (req,res) => {
    const {username, password} = req.body;
    const foundUser = await User.findOne({username});
    if(foundUser){
        const passwordMatch = bcrypt.compareSync(password, foundUser.password);
        if(passwordMatch){
            jwt.sign({ userId: foundUser._id, username}, jwtSecret, {}, (err, token) => {
                if (err) throw err;
                res.cookie('token', token, {sameSite:'none', secure: true}).status(201).json({
                    id: foundUser._id,
                });
            });        
        }
    }
    
});

app.post('/logout', (req,res) => {
    res.cookie('token', '', {sameSite: 'none', secure: true}).json('ok');
});

app.post('/register', async (req,res) => {
    const {username, password} = req.body;
    const hashPassword = bcrypt.hashSync(password, bcryptSalt);
    const createdUser = await User.create({
        username: username, 
        password: hashPassword
    });
    jwt.sign({ userId: createdUser._id, username}, jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res.cookie('token', token, {sameSite:'none', secure: true}).status(201).json({
            id: createdUser._id,
        });
    });
});

const server = app.listen(4040);

// 65S4d7dY5y9Qk0KH

const wss = new ws.WebSocketServer({server});
wss.on('connection', (connection, req) => {
    const cookies = req.headers.cookie;

    function showingOnlineUsers() {
        [...wss.clients].forEach(client => {
            client.send(JSON.stringify({
                online:  [...wss.clients].map(c => ({userId: c.userId, username: c.username}))
            }))
        });
    }

    connection.isAlive = true;
    
    connection.timer = setInterval(() => {
        connection.ping();
        connection.death = setTimeout(() => {
            connection.isAlive = false;
            clearInterval(connection.timer);
            connection.terminate();
            showingOnlineUsers();
        }, 1000);
    }, 5000);

    connection.pong(() => {
        clearTimeout(connection.deathTimer);
    });
    
    // fetching user id and username from cookie
    if (cookies) {
        const splitCookie = cookies.split(';').find(str => str.startsWith('token='));
        if (splitCookie) {
            const token = splitCookie.split('=')[1];
            if (token) {
                jwt.verify(token, jwtSecret, {}, (err, userData) => {
                    if (err) throw err;
                    const {userId, username} = userData;
                    connection.userId = userId;
                    connection.username = username;
                });
            }
        }
    }

    connection.on('message', async (message, isBinary) => {
        const messageData = JSON.parse(message);
        const {recipient, text, file} = messageData;
        let filename = '';
        // console.log("send file");
        if(file) {
            const parts = file.name.split('.');
            const ext = parts[parts.length - 1];
            filename = Date.now() + '.' + ext;
            const path = __dirname + '/uploads/' + filename;
            const bufferData = new Buffer(file.data.split(',')[1], 'base64');
            fs.writeFile(path, bufferData, () => {
                // console.log('file saved: '+ path);
            })
        }
        
        if(recipient && (text || file)) {
            const messageData = await Message.create({
                sender: connection.userId,
                recipient: recipient,
                text: text,
                file: file ? filename : null,
            });
            console.log('message created');
            [...wss.clients]
                .filter(c => c.userId === recipient)
                .forEach(c => c.send(JSON.stringify({
                    text,
                    sender: connection.userId,
                    recipient,
                    file: file ? filename : null,
                    _id: messageData._id,
                })));
        }
    });

    // showing all users online
    showingOnlineUsers();

});

wss.on('close', data => {
    console.log("Disconnect", data);
});