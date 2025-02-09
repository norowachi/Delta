import express, { Response } from "express";
import { makeRateLimiter } from "../../../functions/utility.js";
import { createMessage } from "../../../database/functions/message.js";
import { IMessage } from "../../../interfaces.js";
import { getUserFromToken } from "../../../functions/token.js";
import io from "../../../server.js";
import { WebSocketEvent, WebSocketOP } from "../../../websocketEvents.js";
import { getGuildChannels } from "../../../database/functions/guild.js";
import { getChannelById } from "../../../database/functions/channel.js";

const messageCreateRouter = express.Router();

//TODO: dm messages
/*
	messageCreateRouter.post("/@me/:channelId", makeRateLimiter(8 * 60), x);
*/
messageCreateRouter.post(
	"/:guildId/:channelId/messages",
	makeRateLimiter(8 * 60),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}

		const user = await getUserFromToken(res.locals.token);

		if (!user) {
			res.locals.status = "401";
			return next();
		}

		const { content, embeds, ephemeral } = req.body as Pick<
			IMessage,
			"content" | "embeds" | "ephemeral"
		>;

		if (!content && !embeds) {
			res.locals.status = "400";
			return next();
		}

		// check if user has access to guild and channel
		// just those checks should be enough and no need for
		// guild\channel existence checks
		const isInGuild = user.guilds.some(
			(guild) => guild.id === req.params.guildId
		);

		if (!isInGuild) {
			res.locals.status = "403";
			return next();
		}

		const isInChannel = (
			await getChannelById(req.params.channelId)
		)?.members?.includes(user._id.toString());

		if (!isInChannel) {
			res.locals.status = "403";
			return next();
		}

		// create the message
		let result = await createMessage({
			content,
			embeds,
			author: user.id,
			channelId: req.params.channelId,
			guildId: req.params.guildId,
			ephemeral,
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
			author: result.author,
			channelId: result.channelId,
			guildId: result.guildId,
			ephemeral: result.ephemeral,
			readBy: result.readBy,
		} as IMessage;

		io.to([result.guildId, result.channelId]).emit("message", {
			op: WebSocketOP.MESSAGE_CREATE,
			d: result,
		} as WebSocketEvent);

		return next();
	}
);

export default messageCreateRouter;
