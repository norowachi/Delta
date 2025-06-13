import express, { Response } from "express";
import { getGuildById } from "../../../database/functions/guild.js";
import { getUserFromToken } from "../../../functions/token.js";
import { Guild } from "../../../database/schema/guild.js";
import { makeRateLimiter, nextRouter } from "../../../functions/utility.js";

const guildDeleteRouter = express.Router();

guildDeleteRouter.delete(
  "/:guildId",
  // TODO: enable
  makeRateLimiter(0), // 5
  async (req, res: Response, next) => {
    if (!res.locals.token) {
      res.locals.status = "401";
      return next();
    }
    const guildId = req.params.guildId;
    const guild = await getGuildById(guildId);
    const user = await getUserFromToken(res.locals.token);
    if (!user || !guild || guild.ownerId !== user.id) {
      res.locals.status = "401";
      return next();
    }
    // TODO: make it delete automatically after 14 days or make it send an alert to the admin for deletion.
    Guild.updateOne({ id: guildId }, { $set: { deleted: true } }).catch(() => {
      res.locals.status = "500";
      return next();
    });
    console.log("require deletion, id:", guildId);
    res.locals.status = "202";
    return next();
  },
  nextRouter
);
