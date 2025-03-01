import { IChannel, IEmbed, IMessage, IUser } from "../../interfaces.js";
import { Message } from "../schema/message.js";
import { generateSnowflakeID } from "../../functions/uid.js";
import { User } from "../schema/user.js";
import { Document, FilterQuery, ProjectionType, QueryOptions } from "mongoose";
import { Channel } from "../schema/channel.js";
import { formatMessage } from "../../functions/formatters.js";
import { getChannelById } from "./channel.js";

export const getMessageById = async ({
	guildId = "@me",
	channelId,
	messageId,
}: {
	guildId: string;
	channelId: string;
	messageId: string;
}): Promise<(IMessage & Document) | null> => {
	const message = await Message.findOne({
		id: messageId,
		guildId: guildId,
		channelId: channelId,
	});
	if (!message) return null;

	type pubUser = Omit<IUser, "password" | "token">;
	const populated: Omit<IMessage, "author" | "readBy"> & {
		author: pubUser;
		readBy: pubUser[];
	} = message.populate("author");

	message.author = populated.author;
	return message;
};

/**
 *
 * @param author - author uid, not mongo ObjectId
 */
export const createMessage = async (data: {
	content: string;
	embeds: IEmbed[];
	author: string | (IMessage["author"] & Document);
	channelId: string;
	guildId: string | null;
	ephemeral: boolean;
	mentions?: Map<string, string>;
}): Promise<(IMessage & Document) | null> => {
	const author =
		typeof data.author === "string"
			? await User.findOne<IUser & Document>({ id: data.author })
			: data.author;
	if (!author) return null;

	const newMessage = new Message({
		id: generateSnowflakeID("m"),
		content: data.content,
		embeds: data.embeds,
		author: author._id,
		system: author.system,
		channelId: data.channelId,
		guildId: data.guildId,
		ephemeral: author.bot ? data.ephemeral : false,
		readBy: [author.id],
		mentions: data.mentions,
	});

	await Channel.updateOne<IChannel>(
		{ id: data.channelId },
		{ $inc: { messages: 1 } }
	);

	await newMessage.save();
	return newMessage;
};

export const getChannelMessages = async (
	channel: string | IChannel,
	limit: number = 100,
	offset: number = 0
): Promise<IMessage[] | null> => {
	const dbChannel =
		typeof channel === "string" ? await getChannelById(channel) : channel;
	if (!dbChannel) return null;

	// TODO: decide whether to use offset or not
	// and if used, decide whether to use from the end or the beginning
	const theoritical = dbChannel.messages - limit,
		skip = offset || theoritical < 0 ? 0 : theoritical;

	const messages = await getMessages({ channelId: dbChannel.id }, undefined, {
		sort: { createdAt: 1 },
		limit,
		skip,
	});

	return messages || [];
};

export const getMessages = async (
	filter: FilterQuery<IMessage>,
	projection?: ProjectionType<IMessage>,
	options?: QueryOptions<IMessage>
): Promise<IMessage[] | null> => {
	const messages = await Message.find<IMessage & Document>(
		filter,
		projection,
		options
	);
	if (!messages.length) return null;

	return (await Promise.all(messages.map(formatMessage))).filter((m) => !!m);
};
