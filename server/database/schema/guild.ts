import mongoose from "mongoose";
import { IChannel, IEmbed, IGuild, IMessage } from "../../interfaces";
import { Delta } from "../../constants";

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
	author:
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "User",
			required: false,
		} || Delta,
	guildId: { type: String, required: false },
	temporary: { type: Boolean, required: false },
});

const ChannelsSchema = new mongoose.Schema<IChannel>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	stickyMessage: { type: MessagesSchema, required: false },
	messages: { type: [MessagesSchema], required: true },
});

const GuildSchema = new mongoose.Schema<IGuild>({
	id: { type: String, required: true },
	name: { type: String, required: true },
	icon: { type: String, required: false },
	memberCount: { type: Number, required: true },
	members: { type: [String], required: true },
	ownerId: { type: String, required: true },
	owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
	channels: { type: [ChannelsSchema], required: true },
	deleted: { type: Boolean, required: false },
});

export const Guild = mongoose.model<IGuild>("Guild", GuildSchema);
