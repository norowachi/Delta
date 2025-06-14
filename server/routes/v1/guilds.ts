import express, { Response } from "express";
import {
  getGuildById,
  getGuildChannels,
} from "../../database/functions/guild.js";
import { getUserFromToken } from "../../functions/token.js";
import { makeRateLimiter, nextRouter } from "../../functions/utility.js";
import { formatChannel, formatGuild } from "../../functions/formatters.js";
import GuildMembersRouter from "./guilds/members.js";

const guildsRouter = express.Router();

// get guild data
guildsRouter.get(
  "/:guildId",
  makeRateLimiter(40),
  async (req, res: Response, next) => {
    const guildId = req.params.guildId;
    const guild = await getGuildById(guildId);

    // If guild does not exist return "Bad Request"
    if (!guild) {
      res.locals.status = "400";
      return next();
    }

    const user = res.locals.token
      ? await getUserFromToken(res.locals.token)
      : null;

    // User does not exist or not a member of the guild, return some public info
    if (!user || !guild.members.includes(user.id)) {
      res.locals.status = "200";
      res.locals.json = {
        id: guild.id,
        name: guild.name,
        icon: guild.icon,
        memberCount: guild.memberCount,
        deleted: guild.deleted,
      };
      return next();
    }

    // User is a member, return all data needed
    res.locals.status = "200";
    res.locals.json = await formatGuild(guild);
    return next();
  },
  nextRouter,
);

// get guild channels
guildsRouter.get(
  "/:guildId/channels",
  makeRateLimiter(40),
  async (req, res: Response, next) => {
    if (!res.locals.token) {
      res.locals.status = "401";
      return next();
    }
    const guildId = req.params.guildId;
    // the channels' page
    const page = Number(req.query.page) || 1;
    const guild = await getGuildById(guildId);

    // invalid guildId or guild does not exist, return bad request
    if (!guild) {
      res.locals.status = "400";
      return next();
    }

    const user = await getUserFromToken(res.locals.token);

    // user does not exist or is not a member or the guild, return 401 (Unauthorized)
    if (!user || !guild.members.includes(user.id)) {
      res.locals.status = "401";
      return next();
    }

    // get all channels
    const channels = await getGuildChannels(guildId);
    // No channels, return internal error
    if (!channels || !channels.length) {
      res.locals.status = "500";
      return next();
    }

    // 30 channels per page
    let multip = 30;

    // return the channels per page
    res.locals.status = "200";
    res.locals.json = {
      currentPage: page,
      pages: Math.ceil(channels.length / multip), // max pages
      // TODO: handle null(s)
      channels: await Promise.all(
        channels?.map(formatChannel).slice((page - 1) * multip, page * multip),
      ),
    };
    return next();
  },
  nextRouter,
);

// start; other guild related routes
guildsRouter.use(GuildMembersRouter);
// end.

export default guildsRouter;
