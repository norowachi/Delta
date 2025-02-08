import rateLimit from "express-rate-limit";
import { Status } from "../constants.js";

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
	});
