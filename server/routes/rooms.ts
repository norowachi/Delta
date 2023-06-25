import express from "express";

const roomsRouter = express.Router();

// Define dynamic routes for rooms
roomsRouter.get("/:guildId", (req, res) => {
	const guildId = req.params.guildId;
	// Handle get all rooms
	res.send("Get all channels");
});

roomsRouter.get("/:guildId/:channelId", (req, res) => {
	const guildId = req.params.guildId;
	const channelId = req.params.channelId;

	// Handle get room by ID
	res.send(`Get room with ID ${guildId + "/" + channelId}`);
});

// Export the rooms router
export default roomsRouter;
