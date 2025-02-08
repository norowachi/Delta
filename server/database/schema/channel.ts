import mongoose from "mongoose";
import { IChannel } from "../../interfaces.js";

const ChannelsSchema = new mongoose.Schema<IChannel>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	stickyMessage: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Message",
		required: true,
	},
	messages: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Message",
			required: true,
		},
	],
	members: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: false,
		},
	],
});

export const Channel = mongoose.model<IChannel>("channel", ChannelsSchema);
