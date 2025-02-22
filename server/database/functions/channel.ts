import { Document } from "mongoose";
import { generateSnowflakeID } from "../../functions/uid.js";
import { IChannel } from "../../interfaces.js";
import { Channel } from "../schema/channel.js";

export const getChannelById = async (
	channelId: string
): Promise<(IChannel & Document) | null> => {
	const channel = await Channel.findOne({ id: channelId });
	if (!channel) return null;
	return channel;
};

export const createChannel = async (
	data: IChannel
): Promise<(IChannel & Document) | null> => {
	try {
		const channel = new Channel<IChannel>({
			id: generateSnowflakeID("c"),
			name: data.name,
			stickyMessage: undefined,
			messages: data.messages,
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
