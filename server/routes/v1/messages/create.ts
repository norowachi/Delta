import express, { Response } from "express";
import { makeRateLimiter } from "../../../functions/utility.js";
import { createMessage } from "../../../database/functions/message.js";
import { IMessage } from "../../../interfaces.js";
import { getUserFromToken } from "../../../functions/token.js";
import io from "../../../server.js";
import { WebSocketEvent, WebSocketOP } from "../../../websocketEvents.js";
import { getChannelById } from "../../../database/functions/channel.js";
import { formatMessage } from "../../../functions/formatters.js";
import { getUsers } from "../../../database/functions/user.js";

const messageCreateRouter = express.Router();

//TODO: dm messages
/*
	messageCreateRouter.post("/@me/:channelId", makeRateLimiter(8 * 60), x);
*/
messageCreateRouter.post(
	"/:guildId/:channelId/messages",
	makeRateLimiter(300),
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
		)?.members?.includes(user.id);

		if (!isInChannel) {
			res.locals.status = "403";
			return next();
		}

		const contentMatch = content?.match(/<@(u\d|\w)+>/g);

		// get the ids mentions
		const __ids = contentMatch
			?.filter((value) => /^<@u\d+>/.test(value))
			.map((c) => c.slice(1));
		const mentionIds: string[] =
			(await getUsers({ ids: __ids }))?.map((u) => u.id) || [];

		// get the non-ids mentions, which we assume is usernames
		const __usernames = contentMatch
			?.filter((c) => !__ids?.includes(c.slice(1)))
			.map((c) => c.slice(1));
		const mentionUsers: string[] =
			(
				await getUsers({
					usernames: __usernames,
				})
			)?.map((u) => u.id) || [];

		// combine the all mentions
		const mentions = Array.from(new Set([...mentionIds, ...mentionUsers]));

		// create the message
		let result = await createMessage({
			content,
			embeds,
			author: user.id,
			channelId: req.params.channelId,
			guildId: req.params.guildId,
			ephemeral,
			mentions,
		});

		if (!result) {
			res.locals.status = "500";
			return next();
		}

		res.locals.status = "200";
		res.locals.json = await formatMessage(result);

		// emit mention event to mentioned users
		mentions
			// .filter((id) => id !== user.id)
			.map((id) => {
				io.to(id).emit("mention", res.locals.json);
			});

		io.to(result.channelId).emit("message", {
			op: WebSocketOP.MESSAGE_CREATE,
			d: res.locals.json,
		} as WebSocketEvent);

		return next();
	}
);

export default messageCreateRouter;
