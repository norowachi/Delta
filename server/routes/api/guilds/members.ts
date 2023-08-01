import express, { Response } from "express";
import { getGuildById } from "../../../database/functions/guild";
import { getUserFromToken } from "../../../functions/token";
import { makeRateLimiter } from "../../../functions/utility";

const MembersRouter = express.Router();

// add member to guild
MembersRouter.post(
	"/:guildId/members",
	makeRateLimiter(20),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const guildId = req.params.guildId;
		const guild = await getGuildById(guildId);
		const user = await getUserFromToken(res.locals.token);
		if (!user || !guild) {
			res.locals.status = "400";
			return next();
		}

		guild.updateOne({ $push: { members: user.id }, $inc: { memberCount: 1 } });
		user.updateOne({ $push: { guilds: guild._id } });

		res.locals.status = "202";
		return next();
	}
);

MembersRouter.delete(
	"/:guildId/members",
	makeRateLimiter(40),
	async (req, res: Response, next) => {
		if (!res.locals.token) {
			res.locals.status = "401";
			return next();
		}
		const guildId = req.params.guildId;
		const guild = await getGuildById(guildId);
		const user = await getUserFromToken(res.locals.token);

		//TODO: implement a permissions system
		const { memberId } = req.body;
		if (!user || !guild) {
			res.locals.status = "400";
			return next();
		}

		// TODO: make it delete automatically after 14 days or make it send an alert to the admin for deletion.
		guild.updateOne({ $pull: { members: user.id }, $inc: { memberCount: -1 } });
		user.updateOne({ $pull: { guilds: guild._id } });

		res.locals.status = "200";
		return next();
	}
);

export default MembersRouter;
