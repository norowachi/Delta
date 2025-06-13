import express, { Response } from "express";
import { getGuildById } from "../../../database/functions/guild.js";
import { getUserFromToken } from "../../../functions/token.js";
import { makeRateLimiter, nextRouter } from "../../../functions/utility.js";
import { User } from "../../../database/schema/user.js";
import { IUser } from "../../../interfaces.js";
import { formatUser } from "../../../functions/formatters.js";

const GuildMembersRouter = express.Router();

// get guild members
GuildMembersRouter.get(
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

    // TODO: implement permissions system
    // and do the member fetching from here or something
    const members = await User.find<IUser>({ id: { $in: guild.members } });

    res.locals.status = "200";
    res.locals.json = {
      members: members.map(formatUser),
    };
    return next();
  },
);

// add member to guild
GuildMembersRouter.post(
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
  },
);

GuildMembersRouter.delete(
  "/:guildId/members",
  // TODO: enable
  makeRateLimiter(0), // 30
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
  },
  nextRouter,
);

export default GuildMembersRouter;
