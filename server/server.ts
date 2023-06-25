import express, { NextFunction, Request, Response } from "express";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import rateLimit from "express-rate-limit";
import { config } from "dotenv";
import {
	AuthenticateToken,
} from "./functions/token";
import usersRouter from "./routes/api/users";
import roomsRouter from "./routes/rooms";
import loginRouter from "./routes/auth/login";
import registerRouter from "./routes/auth/register";

// Set up environment variables
config();

// Set up rate limiting
const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 100, // Max requests per windowMs
});

// Initialize Express app
const app = express();

// Apply rate limiting middleware
app.use(limiter);

// JSON body parsing middleware
app.use(express.json());

// MongoDB connection setup
mongoose.connect(process.env.MONGODB_URI!);

// Socket.io server setup
const server = app.listen(process.env.PORT!, () => {
	console.log("Server is running on port " + process.env.PORT);
});

const io = new Server(server);

io.on("connection", (socket: Socket) => {
	console.log("New client connected:", socket.id);

	// Handle new chat messages
	socket.on("chatMessage", (message: string) => {
		// Broadcast the message to all connected clients
		io.emit("chatMessage", message);
	});

	// Handle client disconnection
	socket.on("disconnect", () => {
		console.log("Client disconnected:", socket.id);
	});
});

// AUTH Routes
app.use("/login", loginRouter);
app.use("/register", registerRouter);

// API Routes
const APIMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const [type, token] = req.header("authorization")?.split(" ") || [];
	if (type !== "Bearer") {
		return res.status(401).json({ message: "Invalid prefix" });
	}
	
	if (!token) res.status(401).send({ message: "Unauthorized" });

	const isAuthenticated = await AuthenticateToken(token);
	if (isAuthenticated) {
		return next();
	} else {
		return res.status(401).send({ message: "Unauthorized" });
	}
};
app.use("/api", APIMiddleware, usersRouter);

