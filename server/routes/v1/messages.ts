import express, { Response } from "express";
import { getGuildById } from "../../database/functions/guild.js";
import { getUserFromToken } from "../../functions/token.js";
import { makeRateLimiter, nextRouter } from "../../functions/utility.js";
import {
	getChannelMessages,
	getMessageById,
} from "../../database/functions/message.js";
import { getChannelById } from "../../database/functions/channel.js";
import messageCreateRouter from "./messages/create.js";
import { formatMessage } from "../../functions/formatters.js";

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
		const page = Number(req.query.page) || 1;
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

		// get all messages
		const messages = await getChannelMessages(channel);

		// No messages, return internal error
		if (!messages) {
			res.locals.status = "500";
			return next();
		}

		// 100 messages per page
		let multip = 100;

		// return the messages per page
		res.locals.status = "200";
		res.locals.json = {
			currentPage: page,
			pages: Math.ceil(messages.length / multip), // max pages
			messages: await Promise.all(
				messages?.map(formatMessage).slice((page - 1) * multip, page * multip)
			),
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
messagesRouter.use("/", messageCreateRouter);
// end.

export default messagesRouter;
