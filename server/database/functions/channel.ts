import { Document } from "mongoose";
import { generateSnowflakeID } from "../../functions/uid.js";
import { IChannel, IMessage } from "../../interfaces.js";
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
	limit: number = 100,
	offset: number = 0
): Promise<IMessage[] | null> => {
	const channel = await Channel.findOne<IChannel & Document>(
		{ id: channelId },
		null,
		{ limit }
	);
	if (!channel) return null;
	const messages: IMessage[] = (
		await channel.populate({
			path: "messages",
			populate: {
				path: "author",
			},
			options: {
				sort: { createdAt: 1 },
				limit,
				skip: offset || channel.messages.length - limit,
			},
		})
	).messages;
	if (!messages) return null;

	return messages;
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
