import express, { Response } from "express";
import { getGuildById } from "../../database/functions/guild.js";
import { getUserFromToken } from "../../functions/token.js";
import { makeRateLimiter, nextRouter } from "../../functions/utility.js";
import {
	getChannelMessages,
	getMessageById,
	getMessages,
} from "../../database/functions/message.js";
import { getChannelById } from "../../database/functions/channel.js";
import messageCreateRouter from "./messages/create.js";
import { formatMessage } from "../../functions/formatters.js";
import { IMessage } from "../../interfaces.js";
import { getTimestampFromSnowflakeID } from "../../functions/uid.js";

const messagesRouter = express.Router();

// get messages
messagesRouter.get(
	"/:guildId/:channelId/messages",
	makeRateLimiter(40),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}

		const guildId = req.params.guildId;
		const channelId = req.params.channelId;
		// the messages' page
		const page = Number(req.query.page) || undefined;
		// after messageId
		const after = req.query.after?.toString();
		// before messageId
		const before = req.query.before?.toString();
		// around messageId (50 | around | 50)
		const around = req.query.around?.toString();

		// error if more than one query is provided
		if (Object.keys(req.query).length > 1) {
			res.locals.status = "400";
			return next();
		}

		const guild = await getGuildById(guildId);
		const channel = await getChannelById(channelId);

		// guild/channel do not exist, return bad request
		if (!guild || !channel) {
			res.locals.status = "400";
			return next();
		}

		const user = await getUserFromToken(res.locals.token);

		// user does not exist or is not a member of the guild/channel, return 401 (Unauthorized)
		if (
			!user ||
			!guild.members.includes(user.id) ||
			!channel.members.includes(user.id)
		) {
			res.locals.status = "401";
			return next();
		}

		// 100 messages per page
		let multip = 100;

		let messages: IMessage[] | null = [];

		if (page) {
			if (page > Math.ceil(channel.messages / multip)) {
				res.locals.status = "400";
				return next();
			}
			// get messages
			messages = await getChannelMessages(channel, 100, (page - 1) * multip);
		} else if (after) {
			// get messages after the message
			const timestamp = getTimestampFromSnowflakeID(after);
			if (timestamp === 0n) {
				res.locals.status = "404";
				return next();
			}

			// get messages after the message
			messages = await getMessages(
				{
					guildId,
					channelId,
					createdAt: { $gt: new Date(Number(timestamp) * 1000) },
				},
				undefined,
				{
					sort: { createdAt: 1 },
					limit: 100,
				}
			);
		} else if (before) {
			console.log(before);
			// get messages before the message
			const timestamp = getTimestampFromSnowflakeID(before);
			if (timestamp === 0n) {
				res.locals.status = "404";
				return next();
			}
			console.log(timestamp);

			// get messages before the message
			messages = await getMessages(
				{
					guildId,
					channelId,
					createdAt: { $lt: new Date(Number(timestamp) * 1000) },
				},
				undefined,
				{
					sort: { createdAt: -1 },
					limit: 100,
				}
			);
		} else if (around) {
			const timestamp = getTimestampFromSnowflakeID(around);
			if (timestamp === 0n) {
				res.locals.status = "404";
				return next();
			}
			const date = new Date(Number(timestamp) * 1000);

			// get messages around the message
			const MessagesBefore =
				(await getMessages(
					{
						guildId,
						channelId,
						createdAt: { $lt: date },
					},
					undefined,
					{
						sort: { createdAt: -1 },
						limit: 50,
					}
				)) || [];

			const MessagesAfter =
				(await getMessages(
					{
						guildId,
						channelId,
						createdAt: { $gte: date },
					},
					undefined,
					{
						sort: { createdAt: 1 },
						limit: 50,
					}
				)) || [];
			messages = [...MessagesBefore, ...MessagesAfter];
		}

		console.log(
			"page",
			page,
			"after",
			after,
			"before",
			before,
			"around",
			around
		);

		if (!messages) messages = [];
		else
			messages.sort(
				(a, b) =>
					new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
			);

		// return the messages per page
		res.locals.status = "200";
		res.locals.json = {
			// TODO: better pagaination and page numbering
			currentPage: page,
			pages: Math.ceil(channel.messages / multip), // max pages
			messages: await Promise.all(messages.map(formatMessage)),
		};
		return next();
	},
	nextRouter
);

// get a message data
messagesRouter.get(
	"/:guildId/:channelId/:messageId",
	makeRateLimiter(10 * 60),
	async (req, res: Response, next) => {
		// TODO: check if user has perms in the guild/channel to get the message

		const message = await getMessageById({
			guildId: req.params.guildId,
			channelId: req.params.channelId,
			messageId: req.params.messageId,
		});

		// If no message return "Bad Request"
		if (!message || !message.guildId) {
			res.locals.status = "400";
			return next();
		}

		const user = res.locals.token
			? await getUserFromToken(res.locals.token)
			: null;

		// User does not exist or not a member of the guild, return
		if (!user || !user.guilds.find((g) => g.id === message.guildId)) {
			res.locals.status = "401";
			return next();
		}

		// User is a member, return all data needed
		res.locals.status = "200";
		// TODO: handle null
		res.locals.json = (await formatMessage(message)) || {};
	},
	nextRouter
);

// start; other related routes
messagesRouter.use("/", messageCreateRouter, nextRouter);
// end.

export default messagesRouter;
