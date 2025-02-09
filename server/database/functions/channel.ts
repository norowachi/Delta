import { generateSnowflakeID } from "../../functions/uid.js";
import { IChannel, IMessage } from "../../interfaces.js";
import { Channel } from "../schema/channel.js";

export const getChannelById = async (channelId: string) => {
	const channel = await Channel.findOne<IChannel>({ id: channelId });
	if (!channel) return null;
	return channel;
};

export const getChannelMessages = async (channelId: string) => {
	const channel = await Channel.findOne({ id: channelId });
	if (!channel) return null;
	const messages = (await channel.populate("messages")) as IMessage[];
	if (!messages) return null;
	return messages;
};

export const createChannel = async (data: IChannel) => {
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
