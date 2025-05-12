import express, { Response } from "express";
import { makeRateLimiter, nextRouter } from "../../../functions/utility.js";
import { getMessageById } from "../../../database/functions/message.js";
import {
	IChannel,
	Roles,
	WebSocketEvent,
	WebSocketOP,
} from "../../../interfaces.js";
import { getUserFromToken } from "../../../functions/token.js";
import io from "../../../server.js";
import { Channel } from "../../../database/schema/channel.js";

const messageDeleteRouter = express.Router();

messageDeleteRouter.delete(
	"/:guildId/:channelId/messages/:messageId",
	makeRateLimiter(30),
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

		const { guildId, channelId, messageId } = req.params;

		// check if user is the author of this message or has admin permissions or is staff
		// getting the message
		const message = await getMessageById({ guildId, channelId, messageId });

		if (!message) {
			res.locals.status = "404";
			return next();
		}

		if (
			// if user not the author
			message.author.id !== user.id &&
			// if user not in guild and not the owner of the guild
			//TODO: create and use permissions instead of just owner checking
			!user.guilds.find(
				(guild) => guild.id === guildId && guild.ownerId === user.id
			) &&
			// if user not staff
			!(user.roles & Roles.STAFF)
		) {
			// then send 403 - forbidden
			res.locals.status = "403";
			return next();
		}

		// else delete the message and send confirmation
		try {
			await message.deleteOne();
			await Channel.updateOne<IChannel>(
				{ id: message.channelId },
				{ $inc: { messages: -1 } }
			);

			res.locals.status = "204";

			// return the mesasge id with an event for client to delete the message from the UI
			io.to(message.channelId).emit("message", {
				op: WebSocketOP.MESSAGE_DELETE,
				d: { id: message.id },
			} as WebSocketEvent);

			return next();
		} catch (e) {
			console.error(e);
			res.locals.status = "500";
			return next();
		}
	},
	nextRouter
);

export default messageDeleteRouter;
