import express, { Response } from "express";
import { makeRateLimiter } from "../../../functions/utility.js";
import { createMessage } from "../../../database/functions/message.js";
import { IMessage } from "../../../interfaces.js";
import { getUserFromToken } from "../../../functions/token.js";
import io from "../../../server.js";
import { WebSocketEvent, WebSocketOP } from "../../../websocketEvents.js";

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

		const { content, embeds, ephemeral } = req.body as Pick<
			IMessage,
			"content" | "embeds" | "ephemeral"
		>;

		let result = await createMessage({
			content,
			embeds,
			author: user?.id,
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

		io.to(result.channelId).emit("message", {
			op: WebSocketOP.MESSAGE_CREATE,
			d: result,
		} as WebSocketEvent);

		return next();
	}
);

export default messageCreateRouter;
