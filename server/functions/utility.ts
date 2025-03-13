import rateLimit from "express-rate-limit";
import { Status } from "../constants.js";
import { NextFunction, Request, Response } from "express";
import { getUserFromToken } from "./token.js";

/** Delay function
 *
 * @param ms time to wait in ms
 * @returns
 */
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

/** Creating rate limit - route specific
 *
 * @param allowedRequestsPerMinute name explains it all
 * @returns
 */
export const makeRateLimiter = (allowedRequestsPerMinute: number) =>
	rateLimit({
		windowMs: 60 * 1000,
		max: allowedRequestsPerMinute,
		handler: (_req, res) => res.status(429).json({ message: Status["429"] }),
		keyGenerator: async (req, res) => {
			const token = res.locals.token;
			const user = (token && (await getUserFromToken(token))) || undefined;
			// if user is authenticated, set the identifier to the user id
			// if not then set it to the token or the ip address or unknown
			return user ? user.id : req.ip || token;
		},
	});

export function nextRouter(_req: Request, _res: Response, next: NextFunction) {
	next("router");
}
