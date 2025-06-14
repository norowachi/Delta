import express, { Response } from "express";
import { getUserFromToken } from "../../functions/token.js";
import { getUserById } from "../../database/functions/user.js";
import { makeRateLimiter, nextRouter } from "../../functions/utility.js";
import { formatUser } from "../../functions/formatters.js";

const usersRouter = express.Router();

// get user by id, or edit "me" a.k.a. current user
usersRouter.get(
  "/:userId",
  makeRateLimiter(60),
  async (req, res: Response, next) => {
    const userId = req.params.userId;
    // if request it to /@me
    if (userId === "@me") {
      // no "me", return bad request
      if (!res.locals.token) {
        res.locals.status = "400";
        return next();
      }
      const user = await getUserFromToken(res.locals.token);
      if (!user) {
        res.locals.status = "401";
        return next();
      }

      // return public user data + protected private info
      res.locals.status = "200";
      res.locals.json = formatUser(
        Object.assign(user, { SHOW_PRIVATE_DATA: true }),
      );
      return next();
    }

    const user = await getUserById(userId);
    if (!user) {
      res.locals.status = "400";
      return next();
    }
    // return public user data
    res.locals.status = "200";
    res.locals.json = formatUser(user);
    return next();
  },
  nextRouter,
);

usersRouter.patch(
  "/@me",
  makeRateLimiter(20),
  async (_, res: Response, next) => {
    if (!res.locals.token) {
      res.locals.status = "401";
      return next();
    }

    const user = await getUserFromToken(res.locals.token);
    if (!user) {
      res.locals.status = "401";
      return next();
    }

    // TODO: Handle get user by ID & return new user
    res.locals.status = "200";
    res.locals.json = {};
    return next();
  },
  nextRouter,
);

// Export the users router
export default usersRouter;
