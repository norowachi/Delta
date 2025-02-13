import { Document } from "mongoose";
import { generateSnowflakeID } from "../../functions/uid.js";
import { IChannel, IMessage, IUser } from "../../interfaces.js";
import { Channel } from "../schema/channel.js";

export const getChannelById = async (
	channelId: string
): Promise<(IChannel & Document) | null> => {
	const channel = await Channel.findOne({ id: channelId });
	if (!channel) return null;
	return channel;
};

export const getChannelMessages = async (
	channelId: string,
	limit: number = 100
): Promise<IMessage[] | null> => {
	const channel = await Channel.findOne({ id: channelId }, null, { limit });
	if (!channel) return null;
	const messages: (IMessage & Document)[] = (await channel.populate("messages"))
		.messages;
	if (!messages) return null;

	return Promise.all(
		messages.map(async (msg) => {
			const populated: Omit<IMessage, "author" | "readBy"> & {
				author: Omit<IUser, "password" | "token">;
				readBy: Omit<IUser, "password" | "token">[];
			} = await msg.populate(["author", "readBy"]);

			return {
				id: msg.id,
				content: msg.content,
				embeds: msg.embeds,
				system: msg.system,
				author: populated.author,
				channelId: msg.channelId,
				guildId: msg.guildId,
				hidden: msg.ephemeral,
				readBy: populated.readBy.map((readyBy_User) => readyBy_User.id),
				ephemeral: msg.ephemeral,
				createdAt: msg.createdAt,
			} as IMessage;
		})
	);
};

export const createChannel = async (
	data: IChannel
): Promise<(IChannel & Document) | null> => {
	try {
		const channel = new Channel<IChannel>({
			id: generateSnowflakeID("c"),
			name: data.name,
			stickyMessage: undefined,
			messages: [],
			guildId: data.guildId,
			members: data.members,
			type: data.type,
		});
		await channel.save();
		return channel;
	} catch (err) {
		return null;
	}
};

export const getChannels = async (
	channels: string[]
): Promise<(IChannel & Document)[] | null> => {
	const channel = await Channel.find({ id: { $in: channels } });
	if (!channel) return null;
	return channel;
};
