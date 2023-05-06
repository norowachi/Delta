require('dotenv').config();
const express = require('express');
const http = require('http');
const socketio = require('socket.io');
const redis = require('redis');
const passport = require('passport');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken")

// Configure Passport.js
passport.use(new JwtStrategy({
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
}, async (payload, done) => {
    redisClient.hget('users', payload.username, (err, userJson) => {
        if (err) {
            return done
        }
    })
}
));

// Configure Redis client
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    password: process.env.REDIS_PASSWORD
});

redisClient.on('error', (err) => {
    console.error('Redis error', err);
});

// Set up Express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
    cors: {
        origin: '*'
    }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(passport.initialize());

// Routes
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    redisClient.hget('users', username, async (err, userJson) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }

        if (!userJson) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = JSON.parse(userJson);
        const isValidPassword = await bcrypt.compare(password, user.password);

        if (!isValidPassword) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ username: user.username }, process.env.JWT_SECRET);

        res.json({ token });
    });
});

app.post('/api/auth/signup', async (req, res) => {
    const { username, password } = req.body;

    const existingUserJson = await new Promise((resolve, reject) => {
        redisClient.hget('users', username, (err, result) => {
            if (err) {
                return reject(err);
            }

            resolve(result);
        });
    });

    if (existingUserJson) {
        return res.status(409).json({ message: 'Username already taken' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = { username, password: hashedPassword };

    redisClient.hset('users', username, JSON.stringify(newUser), (err) => {
        if (err) {
            return res.status(500).json({ message: 'Internal server error' });
        }

        res.json({ message: 'Signed up successfully' });
    });
});

// handling incomin messages
io.on('connection', (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('join', ({ username }) => {
        console.log(`${username} joined the chat`);

        // Send previous messages to the user
        redisClient.lrange('messages', 0, -1, (err, messages) => {
            if (err) {
                console.error('Redis error', err);
                return;
            }

            messages.reverse().forEach((message) => {
                socket.emit('message', JSON.parse(message));
            });
        });

        // Add user to Redis set of connected users
        redisClient.sadd('connectedUsers', username, (err) => {
            if (err) {
                console.error('Redis error', err);
                return;
            }

            // Notify other users that this user has joined
            socket.broadcast.emit('userJoined', { username });
        });
    });

    socket.on('message', ({ username, message }) => {
        console.log(`${username}: ${message}`);

        // Add message to Redis list of messages
        const messageObj = { username, message, timestamp: Date.now() };
        redisClient.lpush('messages', JSON.stringify(messageObj), (err) => {
            if (err) {
                console.error('Redis error', err);
                return;
            }

            // Broadcast message to all connected users
            io.emit('message', messageObj);
        });
    });

    socket.on('disconnect', ({ username }) => {
        // Remove user from Redis set of connected users and notify other users
        redisClient.srem('connectedUsers', username, (err) => {
            if (err) {
                console.error('Redis error', err);
                return;
            }

            socket.broadcast.emit('userLeft', { username });
        });

        console.log(`User disconnected: ${socket.id}`);
    });
});

// Start server
const port = process.env.PORT || 5000;

// Start the server
server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});