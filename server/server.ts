import bodyParser from "body-parser";
import express, { NextFunction, Request, Response } from "express";
import cors from "cors";
import { Server, Socket } from "socket.io";
import mongoose from "mongoose";
import { AuthenticateToken, getUserFromToken } from "./functions/token.js";
import V1Route from "./routes/v1/index.js";
import loginRouter from "./routes/auth/login.js";
import registerRouter from "./routes/auth/register.js";
import { env, Status } from "./constants.js";
import path from "path";
import {
	WebSocketConnection,
	WebSocketEvent,
	WebSocketOP,
} from "./websocketEvents.js";
import { makeRateLimiter } from "./functions/utility.js";
import { getMessages } from "./database/functions/message.js";
import { getChannelById, getChannels } from "./database/functions/channel.js";

// Initialize Express app
const app = express();

// stored images
const images = express.static(path.resolve("./public/images"));
console.log(path.resolve("./public/images"));
app.use("/images", images);

// JSON body parsing middleware
app.use(express.json());

app.set("trust proxy", 1);
app.get("/ip", (request, response) => response.send(request.ip));

app.use(function (req, res, next) {
	console.log(req.path);
	res
		.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");

	next();
});

// only allow frontend site
app.use(
	cors({
		origin: (origin, callback) => {
			const allowedOrigins = ["https://s.ily.cat", "http://localhost:5173 "];
			if (origin) console.log(origin);
			if (!origin || allowedOrigins.includes(origin)) {
				callback(null, true);
			} else {
				callback(new Error("Not allowed by CORS"));
			}
		},
		credentials: true,
	})
);

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
	const [type, token] = req.header("Authorization")?.split(" ") || [];
	if ((type?.length || 0) >= 0 && type !== "Bearer") {
		return res.status(401).json({ message: Status["401"] });
	}

	if (token) {
		const isAuthenticated = await AuthenticateToken(token);
		if (isAuthenticated) res.locals.token = token;
	}

	return next();
};

const APIReturner = async (_req: Request, res: Response) => {
	const code: keyof typeof Status = res.locals.status || "500";
	const message = Status[code];

	return res
		.status(parseInt(code))
		.json(res.locals.json || { message: message });
};

app.use("/v1", APIMiddleware, V1Route, APIReturner);
// default version
app.use("/", APIMiddleware, V1Route, APIReturner);

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
		socket: any;
	}[]
> = new Map();

const io = new Server(server, {
	cors: {
		origin: "*",
	},
});

io.on("connection", async (socket: Socket) => {
	console.log(`[Websocket] New client connected in WS ${socket.id}`);
	if (!socket.handshake.auth) return socket.disconnect(true);

	const type: string | undefined = socket.handshake.auth.type || "Bearer";
	const token: string | undefined = socket.handshake.auth.token || undefined;

	if (type !== "Bearer" || !token) {
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

	// Handle new websocket messages
	socket.on("message", async (message: WebSocketEvent) => {
		switch (message.op) {
			case WebSocketOP.HELLO: {
				const id = user.id;

				const connsForThisUser = wsConnections.get(id) || [];

				connsForThisUser.push({
					id,
					ws: connection.ws,
					socket,
				});

				wsConnections.set(id, connsForThisUser);

				console.log(
					`[Websocket] User with ID ${id} connected in WS ${connection.ws}!`
				);

				// Send unread messages count mapped by channel ids, if any
				const unreadDirectMessages = (
					await getMessages({
						readBy: { $nin: [user._id] },
					})
				)?.filter(async (message) => {
					if (message.guildId) {
						return user.guilds.some((g) => g.id === message.guildId);
					}
					return (await getChannelById(message.channelId))?.members?.includes(
						user.id
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
					unreadMessagesObject[msg.channelId] = unreadDirectMessages.filter(
						async (m) => (m.channelId = msg.channelId)
					).length;
				}

				socket.send({
					op: WebSocketOP.HELLO,
					d: { unreadMessages: unreadMessagesObject },
				});

				break;
			}
		}
		return;
	});

	socket.on("join", async (rooms: string[]) => {
		if (!rooms || !rooms.length || !Array.isArray(rooms)) return;

		const RequestedChannels = rooms.filter((room) => room.startsWith("c"));
		const RequestedGuilds = rooms.filter((room) => room.startsWith("g"));

		const UserGuilds = user.guilds.map((guild) => guild.id);

		const possibleGuilds = RequestedGuilds.filter((guild) =>
			UserGuilds.includes(guild)
		);

		const possibleChannels = (await getChannels(RequestedChannels))?.filter(
			(channel) => channel.members?.includes(user.id.toString())
		);

		socket.join([
			...possibleGuilds,
			...(possibleChannels || []).map((r) => r.id),
		]);
	});

	// send first Heartbeat
	Heartbeat();

	// send a beat every 5 seconds
	const heartbeatInterval = setInterval(() => {
		Heartbeat();
	}, 5 * 1000);

	// Handle client disconnection
	socket.on("disconnect", () => {
		console.log("Client disconnected:", socket.id);
		wsConnections.delete(connection.id);
		clearInterval(heartbeatInterval);
	});

	function Heartbeat() {
		socket.timeout(4 * 1000).emit("ping", (err: any, response: any) => {
			if (err || response !== socket.id) socket.disconnect(true);
			return;
		});
	}
});

export default io;
