import mongoose from "mongoose";
import { IGuild } from "../../interfaces";

const GuildSchema = new mongoose.Schema<IGuild>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	icon: { type: String, required: false },
	memberCount: { type: Number, required: true },
	members: { type: [String], required: true },
	ownerId: { type: String, required: true },
	channels: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Channel",
			required: true,
		},
	],
	deleted: { type: Boolean, required: false },
});

export const Guild = mongoose.model<IGuild>("Guild", GuildSchema);
