// Direct Messages
import express, { Response } from "express";
import { getUserFromToken } from "../../functions/token.js";
import { getChannelById } from "../../database/functions/channel.js";
import { ChannelTypes, IMessage } from "../../interfaces.js";
import {
	createMessage,
	getChannelMessages,
} from "../../database/functions/message.js";
import { makeRateLimiter } from "../../functions/utility.js";
import { formatChannel, formatMessage } from "../../functions/formatters.js";

const DMRouter = express.Router();

// getting dm channel
DMRouter.get(
	"/:channelId",
	makeRateLimiter(40),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const channelId = req.params.channelId;
		const channel = await getChannelById(channelId);
		// If channel does not exist return "Bad Request"
		if (!channel || channel.type !== ChannelTypes.DM) {
			res.locals.status = "404";
			return next();
		}
		const user = await getUserFromToken(res.locals.token);

		// user does not exist or user not of the parties included in the dm channel
		if (!user || !channel.members?.includes(user.id)) {
			res.locals.status = "401";
			return next();
		}

		res.locals.status = "200";
		res.locals.json = await formatChannel(channel);
		return next();
	}
);

// getting dm messages
DMRouter.get(
	"/:channelId/messages",
	makeRateLimiter(60),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const channelId = req.params.channelId;
		// the messages' page
		const page = Number(req.query.page) || 1;
		const channel = await getChannelById(channelId);
		// If channel does not exist return "Bad Request"
		if (!channel || channel.type !== ChannelTypes.DM) {
			res.locals.status = "404";
			return next();
		}
		const user = await getUserFromToken(res.locals.token);

		// user does not exist or user not of the parties included in the dm channel
		if (!user || !channel.members?.includes(user.id)) {
			res.locals.status = "401";
			return next();
		}

		// get all messages
		const messages = await getChannelMessages(channel);
		// No message, return nothing
		if (!messages || !messages.length) {
			// no messages, page 1 of 1
			res.locals.status = "200";
			res.locals.json = { currentPage: 1, pages: 1, messages: [] };
			return next();
		}
		// 30 messages per page
		let multip = 30;

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
	}
);

// sending dm messages
DMRouter.post(
	"/:channelId/messages",
	makeRateLimiter(40),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const channelId = req.params.channelId;
		const channel = await getChannelById(channelId);
		// If channel does not exist return "Bad Request"
		if (!channel || channel.type !== ChannelTypes.DM) {
			res.locals.status = "404";
			return next();
		}
		const user = await getUserFromToken(res.locals.token);

		// user does not exist or user not of the parties included in the dm channel
		if (!user || !channel.members?.includes(user.id)) {
			res.locals.status = "401";
			return next();
		}
		try {
			const { content, embeds, ephemeral } = req.body as Pick<
				IMessage,
				"content" | "embeds" | "ephemeral"
			>;
			const result = await createMessage({
				content,
				embeds,
				author: user,
				channelId,
				ephemeral,
				guildId: null,
			});

			if (!result) {
				res.locals.status = "500";
				return next();
			}

			res.locals.status = "200";
			res.locals.json = {
				id: result.id,
				content: result.content,
				embeds: result.embeds,
				system: result.system,
				author: user,
				channelId: channelId,
				hidden: result.ephemeral,
			};
		} catch {
			res.locals.status = "500";
		}
		return next();
	}
);

export default DMRouter;
