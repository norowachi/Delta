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
import messageDeleteRouter from "./messages/delete.js";

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
			if (!after.startsWith("m")) {
				res.locals.status = "400";
				return next();
			}

			// get messages after the message
			messages = await getMessages(
				{
					id: { $gt: after },
					guildId,
					channelId,
				},
				undefined,
				{
					sort: { createdAt: 1 },
					limit: 100,
				}
			);
		} else if (before) {
			if (!before.startsWith("m")) {
				res.locals.status = "400";
				return next();
			}

			// get messages before the message
			messages = await getMessages(
				{
					id: { $lt: before },
					guildId,
					channelId,
				},
				undefined,
				{
					sort: { createdAt: -1 },
					limit: 100,
				}
			);
		} else if (around) {
			if (!around.startsWith("m")) {
				res.locals.status = "400";
				return next();
			}

			// get messages around the message
			const MessagesBefore =
				(await getMessages(
					{
						id: { $lt: around },
						guildId,
						channelId,
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
						id: { $gte: around },
						guildId,
						channelId,
					},
					undefined,
					{
						sort: { createdAt: 1 },
						limit: 50,
					}
				)) || [];
			messages = [...MessagesBefore, ...MessagesAfter];
		}

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
messagesRouter.use(messageCreateRouter, messageDeleteRouter, nextRouter);
// end.

export default messagesRouter;
