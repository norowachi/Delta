import express from "express";

const guildsRouter = express.Router();

guildsRouter.get("/:guildId", (req, res) => {
	const guildId = req.params.guildId;
});
