import express from "express";

const TenorRouter = express.Router();

import NodeFetchCache from "node-fetch-cache";
import { RedisCache } from "@node-fetch-cache/redis";
import { Status, env } from "../constants";

const options = {
	host: "redis",
	// All options may be specified. For instance, a database:
	db: 1,
	// Time to live. How long (in ms) responses remain cached before being
	// automatically ejected. If undefined, responses are never
	// automatically ejected from the cache.
	// This sets the expiry within Redis
	ttl: 12 * 60 * 60 * 1000,
};

const fetch = NodeFetchCache.create({
	cache: new RedisCache(options),
});

// Get tenor gifs
TenorRouter.post("/", async (req, res) => {
	const body = req.body;
	if (!body) return res.status(400).json(Status[400]);

	const path = body.path;

	// if path is provided, get that the path
	if (path) {
		const response = await fetch(
			`https://tenor.googleapis.com${path}&key=${env.TENOR_API_KEY}`
		).catch(() => {});

		if (!response || !response.ok)
			return res
				.status(response?.status || 500)
				.json("Tenor API request failed");

		const data = await response.json().catch(() => {});

		if (!data)
			return res
				.status(response?.status || 500)
				.json("Tenor API request failed");

		return res.json(data);
	}

	// get query and next from request body
	const query = body.query;
	const next = body.next ? `&pos=${body.next}` : "";

	if (!query) return res.status(400).json("No query provided");

	// call tenor api
	const response = await fetch(
		`https://tenor.googleapis.com/v2/search?q=${query}&key=${env.TENOR_API_KEY}&media_filter=tinygif,gif&limit=20` +
			next
	).catch(() => {});

	if (!response || !response.ok)
		return res.status(response?.status || 500).json("Tenor API request failed");

	const data = await response.json().catch(() => {});

	if (!data)
		return res.status(response?.status || 500).json("Tenor API request failed");

	return res.json(data);
});

// Get tenor categories
TenorRouter.get("/", async (_, res) => {
	// call tenor api
	const response = await fetch(
		`https://tenor.googleapis.com/v2/categories?type=featured&key=${env.TENOR_API_KEY}`
	).catch(() => {});

	if (!response || !response.ok)
		return res.status(response?.status || 500).json("Tenor API request failed");

	const data = await response.json().catch(() => {});

	if (!data)
		return res.status(response?.status || 500).json("Tenor API request failed");

	return res.json(data);
});

// Export the Tenor router
export default TenorRouter;
