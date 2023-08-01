// Direct Messages
import express, { Response } from "express";
import { getUserFromToken } from "../../functions/token";
import {
	getChannelById,
	getChannelMessages,
} from "../../database/functions/channel";
import { ChannelTypes, IUser } from "../../interfaces";
import { createMessage } from "../../database/functions/message";
import { makeRateLimiter } from "../../functions/utility";

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
		res.locals.json = {
			id: channel.id,
			name: channel.name,
			stickyMessage: channel.stickyMessage?.id,
			messages: channel.messages.map((m) => m.id),
			guildId: null,
			members: channel.members,
			type: ChannelTypes.DM,
		};
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
		const page = req.query.page;
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
		const messages = await getChannelMessages(channelId);
		// No message, return nothing
		if (!messages || !messages.length) {
			// no messages, page 1 of 1
			res.locals.status = "200";
			res.locals.json = { currentPage: 1, pages: 1, messages: [] };
			return next();
		}
		// 30 messages per page
		let multip = 30;
		if (!page || typeof page !== "number" || parseInt(page) === 0) {
			// returns max 90 messages
			res.locals.status = "200";
			res.locals.json = {
				currentPage: 3, // (n of msgs) -> 90/multip = 90/30 = 3
				pages: Math.ceil(messages.length / multip), // max pages
				messages: messages
					?.map((msg) => {
						return {
							id: msg.id,
							content: msg.content,
							embeds: msg.embeds,
							system: msg.system,
							authorId: msg.author.id,
							channelId: msg.channelId,
							hidden: msg.hidden,
						};
					})
					.slice(0, 3 * multip),
			};
			return next();
		}

		// return the messages per page
		res.locals.status = "200";
		res.locals.json = {
			currentPage: page,
			pages: Math.ceil(messages.length / multip), // max pages
			messages: messages
				?.map((msg) => {
					return {
						id: msg.id,
						content: msg.content,
						embeds: msg.embeds,
						system: msg.system,
						authorId: msg.author.id,
						channelId: msg.channelId,
						hidden: msg.hidden,
					};
				})
				.slice((page - 1) * multip, page * multip),
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
			const { content, embeds, hidden } = JSON.parse(req.body);
			const result = await createMessage({
				content: content,
				embeds: embeds,
				authorId: user.id,
				channelId: channelId,
				hidden: hidden,
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
				author: user as Omit<IUser, "email" | "password" | "token">,
				channelId: channelId,
				hidden: result.hidden,
			};
		} catch {
			res.locals.status = "500";
		}
		return next();
	}
);

export default DMRouter;
