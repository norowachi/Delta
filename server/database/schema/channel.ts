import mongoose from "mongoose";
import { IChannel } from "../../interfaces.js";

const ChannelsSchema = new mongoose.Schema<IChannel>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	stickyMessage: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "message",
		required: true,
	},
	messages: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "message",
			required: true,
		},
	],
	members: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "user",
			required: false,
		},
	],
});

export const Channel =
	mongoose.models.channel ||
	mongoose.model<IChannel>("channel", ChannelsSchema);
