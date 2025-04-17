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
import { WebSocketEvent, WebSocketOP } from "./websocketEvents.js";
import { makeRateLimiter } from "./functions/utility.js";
import { getMessages } from "./database/functions/message.js";
import { getChannels } from "./database/functions/channel.js";
import TenorRouter from "./routes/tenor.js";

// Initialize Express app
const app = express();

// stored images
const images = express.static(path.resolve("./public/images"));
app.use("/images", images);

// JSON body parsing middleware
app.use(express.json());

app.set("trust proxy", 1);
app.get("/ip", (request, response) => response.send(request.ip));

app.use(function (_, res, next) {
	res
		.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH");

	return next();
});

// only allow frontend site
app.use(
	cors({
		origin: (origin, callback) => {
			// const originURL = origin ? new URL(origin) : undefined;
			// const allowedOrigins = ["s.ily.cat", "localhost"];
			//if (origin) console.log(origin);
			// if (!originURL || allowedOrigins.includes(originURL.hostname)) {
			return callback(null, true);
			// } else {
			// 	return callback(new Error("Not allowed by CORS"));
			// }
		},
		credentials: true,
	})
);

app.use(bodyParser.json({ limit: "25mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "25mb" }));

// MongoDB connection setup
mongoose.connect(env.MONGODB_URL!).then(() => console.log("Connected to DB"));

// Tenor Routes
app.use("/tenor", makeRateLimiter(30), TenorRouter);

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

export const APIReturner = async (_: Request, res: Response) => {
	if (!res.writable) return;
	
	const code: keyof typeof Status = res.locals.status || "500";

	return res
		.status(parseInt(code))
		.json(res.locals.json || { message: Status[code] });
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

	console.log(
		`\x1b[36m[Websocket] \x1b[35m${user.username} | ${user.id}\x1b[0m connected in WS \x1b[32m${socket.id}\x1b[0m`
	);
	socket.join(user.id);

	// Handle new websocket messages
	socket.on("message", async (message: WebSocketEvent) => {
		switch (message.op) {
			case WebSocketOP.HELLO: {
				const id = user.id;

				console.log(
					`\x1b[36m[Websocket] \x1b[35m${user.username} | ${user.id}\x1b[0m (\x1b[32m${socket.id}\x1b[0m) sent \x1b[36mHELLO\x1b[0m`
				);

				// get all unread messages
				const unreadMessages = await getMessages(
					{
						readBy: { $nin: [id] },
						channelId: {
							$in: user.guilds
								.map((g) =>
									g.channels
										.filter((c) => c.members.includes(id))
										.map((c) => c.id)
								)
								.flat(),
						},
					},
					{
						_id: 0,
						channelId: 1,
					}
				);

				// send a dummy to just fill in
				if (!unreadMessages) {
					socket.send({
						op: WebSocketOP.HELLO,
						d: { unreadMessages: 0 },
					});
					break;
				}

				const unreadMessagesObject = {} as Record<string, number>;

				unreadMessages.map((unread) => {
					// if the channel id is not in the object, add it
					if (!unreadMessagesObject[unread.channelId]) {
						unreadMessagesObject[unread.channelId] = 1;
					}
					// set a limit of 150 unreads per channel
					if (unreadMessagesObject[unread.channelId] >= 150) return;
					// inc the count
					unreadMessagesObject[unread.channelId]++;
				});

				// send the object
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

		const possibleChannels = (await getChannels(RequestedChannels))?.filter(
			(channel) => channel.members?.includes(user.id.toString())
		);

		return socket.join((possibleChannels || []).map((r) => r.id));
	});

	socket.on("leave", async (room: string) => {
		if (!room) return;
		return socket.leave(room);
	});

	// send first Heartbeat
	Heartbeat();

	// send a beat every 5 seconds
	const heartbeatInterval = setInterval(() => {
		Heartbeat();
	}, 5 * 1000);

	// Handle client disconnection
	socket.on("disconnect", () => {
		console.log(
			`\x1b[36m[Websocket] \x1b[35m${user.username} | ${user.id} (\x1b[32m${socket.id}\x1b[0m) \x1b[31mDisconnected\x1b[0m`
		);
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
