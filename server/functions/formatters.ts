import { Document } from "mongoose";
import { IChannel, IGuild, IMessage } from "../interfaces";

export async function formatGuild(guild: IGuild & Document) {
	const populatedChannels = await guild.populate({
		path: "channels",
		populate: {
			path: "stickyMessage",
			populate: {
				path: "author",
			},
		},
	});

	return {
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		memberCount: guild.memberCount,
		members: guild.members,
		ownerId: guild.ownerId,
		deleted: guild.deleted,
		channels: await Promise.all(populatedChannels.channels.map(formatChannel)),
	};
}

export async function formatChannel(channel: IChannel | (IChannel & Document)) {
	const populatedStickyMessage =
		"populate" in channel && !channel.populated("stickyMessage")
			? (
					await channel
						.populate({
							path: "stickyMessage",
							populate: {
								path: "author",
							},
						})
						.catch(() => {})
			  )?.stickyMessage
			: channel.stickyMessage;

	return {
		id: channel.id,
		name: channel.name,
		stickyMessage: populatedStickyMessage
			? await formatMessage(populatedStickyMessage)
			: null,
		messages: channel.messages,
		members: channel.members,
	};
}

export async function formatMessage(message: IMessage | (IMessage & Document)) {
	const m =
		"populate" in message && !message.populated("author")
			? await message.populate("author").catch(() => {})
			: message;
	if (!m) return null;

	return {
		id: m.id,
		content: m.content,
		embeds: m.embeds,
		system: m.system,
		author: {
			id: m.author.id,
			username: m.author.username,
			handle: m.author.handle,
			avatar: m.author.avatar,
			roles: m.author.roles,
			disabled: m.author.disabled,
			deleted: m.author.deleted,
			bot: m.author.bot,
			system: m.author.system,
		},
		channelId: m.channelId,
		guildId: m.guildId,
		ephemeral: m.ephemeral,
		createdAt: m.createdAt,
		mentions: m.mentions,
	} as IMessage;
}
