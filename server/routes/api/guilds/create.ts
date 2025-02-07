import express, { Response } from "express";
import { createGuild } from "../../../database/functions/guild.js";
import { makeRateLimiter } from "../../../functions/utility.js";

const guildCreateRouter = express.Router();

guildCreateRouter.post(
	"/",
	makeRateLimiter(5),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const { name, icon, ownerId } = req.body;
		let result = await createGuild({
			name: name,
			icon: icon,
			ownerId: ownerId,
		});
		if (!result) {
			res.locals.status = "500";
			return next();
		}
		res.locals.status = "200";
		res.locals.json({
			id: result.id,
			name: result.name,
			icon: result.icon,
			memberCount: result.memberCount,
			members: result.members,
			ownerId: result.ownerId,
			channels: result.channels,
			deleted: result.deleted,
		});
	}
);
