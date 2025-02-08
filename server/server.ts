import bodyParser from "body-parser";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { AuthenticateToken, getUserFromToken } from "./functions/token.js";
import APIRoute from "./routes/api/index.js";
import loginRouter from "./routes/auth/login.js";
import registerRouter from "./routes/auth/register.js";
import { env, Status } from "./constants.js";
import path from "path";
import {
	WebSocketConnection,
	WebSocketEvent,
	WebSocketOP,
} from "./websocketEvents.js";
import { delay, makeRateLimiter } from "./functions/utility.js";
import { getMessages } from "./database/functions/message.js";
import { getChannelById } from "./database/functions/channel.js";
import { getGuildById } from "./database/functions/guild.js";

// Initialize Express app
const app = express();

// JSON body parsing middleware
app.use(express.json());

// stored images
app.use(express.static(path.resolve("./public")));

app.set("trust proxy", 1);
app.get("/ip", (request, response) => response.send(request.ip));

app.use(function (_req, res, next) {
	res.header("Access-Control-Allow-Credentials", "true");
	res.header("Access-Control-Allow-Origin", "*");
	res.header(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept, Authorization, X-HTTP-Method-Override, Set-Cookie, Cookie"
	);
	res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");

	next();
});

// only allow frontend site
app.use(cors({ origin: "s.ily.cat" }));

app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "25mb" }));

// MongoDB connection setup
mongoose.connect(env.MONGODB_URL!).then(() => console.log("Connected to DB"));

// AUTH Routes
app.use("/auth/login", makeRateLimiter(20), loginRouter);
app.use("/auth/register", makeRateLimiter(10), registerRouter);

// API Routes
const APIMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	const [type, token] = req.header("authorization")?.split(" ") || [];
	if (type.length > 0 && type !== "Bearer") {
		return res.status(401).json({ message: Status["401"] });
	}

	const isAuthenticated = await AuthenticateToken(token);

	if (isAuthenticated) {
		res.locals.token = token;
		return next();
	} else {
		return next();
	}
};

const APIReturner = async (_req: Request, res: Response) => {
	const code: keyof typeof Status = res.locals.status || "500";
	const message = Status[code];

	return res
		.status(parseInt(code))
		.json(res.locals.json || { message: message });
};

app.use("/api", APIMiddleware, APIRoute, APIReturner);

// Socket.io server setup
const server = app.listen(env.PORT!, () => {
	console.log("Server is running on port " + env.PORT);
});

// saving socket connections
export const wsConnections: Map<
	string,
	{
		id: string;
		ws: string;
		sessionID: string;
		socket: any;
		lastPing: number;
	}[]
> = new Map();

const io = new Server(server);

io.on("connection", async (socket: Socket) => {
	console.log(`[Websocket]\tNew client connected in WS ${socket.id}`);
	const [type, token] = socket.handshake.auth?.split(" ") || [];
	if (type.length > 0 && type !== "Bearer") {
		return socket.disconnect(true);
	}

	const isAuthenticated = await AuthenticateToken(token);

	if (!isAuthenticated) {
		return socket.disconnect(true);
	}
	const user = (await getUserFromToken(token))!;

	if (user.disabled || user.deleted) {
		return socket.disconnect(true);
	}

	const connection: WebSocketConnection = {
		ws: socket.id,
		id: user.id,
	};

	// Handle new chat messages
	socket.on("message", async (message: WebSocketEvent) => {
		switch (message.op) {
			case WebSocketOP.HELLO: {
				const { id, sessionID } = message.d;
				if (id !== user.id) {
					return socket.disconnect(true);
				}

				const connsForThisUser = wsConnections.get(id) || [];

				for (const con of connsForThisUser) {
					if (con.sessionID === sessionID) con.socket.disconnect();
				}

				connsForThisUser.push({
					id,
					ws: connection.ws,
					sessionID,
					socket,
					lastPing: Date.now(),
				});

				wsConnections.set(id, connsForThisUser);

				console.log(
					`[Websocket]\tUser with ID ${id} connected in WS ${connection.ws}!`
				);

				// Send unread messages count mapped by channel ids, if any
				const unreadDirectMessages = (
					await getMessages({
						readBy: { $nin: [user._id] },
					})
				)?.filter(async (msg) => {
					const message = await msg;
					if (message.guildId) {
						return user.guilds.includes(
							(await getGuildById(message.guildId))?._id?.toString() || ""
						);
					}
					return (await getChannelById(message.channelId))?.members?.includes(
						user._id.toString()
					);
				});

				if (!unreadDirectMessages) {
					socket.send({
						op: WebSocketOP.HELLO,
						d: { unreadMessages: 0 },
					});
					break;
				}

				const unreadMessagesObject = {} as Record<string, number>;

				for (const msg of unreadDirectMessages) {
					unreadMessagesObject[(await msg).channelId] =
						unreadDirectMessages.filter(
							async (m) => ((await m).channelId = (await msg).channelId)
						).length;
				}

				socket.send({
					op: WebSocketOP.HELLO,
					d: { unreadMessages: unreadMessagesObject },
				});

				break;
			}
		}
	});

	// Set up the heartbeat and ping mechanism
	function sendHeartbeat() {
		socket.emit("ping");
	}

	socket.on("pong", async () => {
		let con = wsConnections
			.get(connection.id)
			?.find((con) => con.ws === socket.id);
		if (!con) return socket.disconnect(true);
		con.lastPing = Date.now();
		await delay(10 * 1000);
		sendHeartbeat();
	});

	// Start sending heartbeats
	sendHeartbeat();

	// Handle client disconnection
	socket.on("disconnect", () => {
		console.log("Client disconnected:", socket.id);
		wsConnections.delete(connection.id);
	});
});

setInterval(() => {
	for (const [userID, conns] of wsConnections) {
		for (const conn of conns) {
			if (Date.now() - conn.lastPing > 60 * 1000) {
				conn.socket.disconnect();

				console.log(
					`[Websocket]\tConnection closed for user ${userID} with id ${conn.id}! Reason: Ping timeout!`
				);
			}
		}
	}
}, 30 * 1000);
