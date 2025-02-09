import mongoose from "mongoose";
import { IEmbed, IMessage } from "../../interfaces.js";

const EmbedSchema = new mongoose.Schema<IEmbed>({
	title: { type: String, required: true },
	url: { type: String, required: false },
	description: { type: String, required: true },
	thumbnail: { type: String, required: false },
});

const MessagesSchema = new mongoose.Schema<IMessage>({
	id: { type: String, required: true },
	content: { type: String, required: false },
	embeds: { type: [EmbedSchema], required: false },
	system: { type: Boolean, required: true },
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "user",
		required: true,
	},
	channelId: { type: String, required: false },
	guildId: { type: String, required: false },
	ephemeral: { type: Boolean, required: false },
	readBy: [
		{ type: mongoose.Schema.Types.ObjectId, ref: "user", required: false },
	],
	createdAt: { type: Date, default: Date.now },
});

export const Message =
	mongoose.models.message ||
	mongoose.model<IMessage>("message", MessagesSchema);
