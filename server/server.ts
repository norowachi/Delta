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
import { getGuildById, getGuildChannels } from "./database/functions/guild.js";
import { clear } from "console";

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

app.use("/v1", APIMiddleware, V1Route, APIReturner);

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

const io = new Server(server);

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
		return;
	});

	socket.on("join", async (rooms: string[]) => {
		const RequestedChannels = rooms.filter((room) => room.startsWith("c"));
		const RequestedGuilds = rooms.filter((room) => room.startsWith("g"));

		const UserGuilds = user.guilds.map((guild) => guild.id);

		const possibleGuilds = RequestedGuilds.filter((guild) =>
			UserGuilds.includes(guild)
		);

		const possibleChannels = (await getChannels(RequestedChannels))?.filter(
			(channel) => channel.members?.includes(user._id.toString())
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
