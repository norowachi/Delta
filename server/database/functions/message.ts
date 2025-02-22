import { IChannel, IEmbed, IMessage, IUser } from "../../interfaces.js";
import { Message } from "../schema/message.js";
import { generateSnowflakeID } from "../../functions/uid.js";
import { User } from "../schema/user.js";
import { Document, FilterQuery, ProjectionType, QueryOptions } from "mongoose";
import { Channel } from "../schema/channel.js";
import { formatMessage } from "../../functions/formatters.js";

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
 * @param author - author uid not mongo ObjectId
 */
export const createMessage = async (data: {
	content: string;
	embeds: IEmbed[];
	author: string | (IMessage["author"] & Document);
	channelId: string;
	guildId: string | null;
	ephemeral: boolean;
}): Promise<(IMessage & Document) | null> => {
	const author =
		typeof data.author === "string"
			? await User.findOne({ id: data.author })
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
		readBy: [author._id],
	});

	await Channel.updateOne<IChannel>(
		{ id: data.channelId },
		{ $push: { messages: newMessage._id } }
	);

	await newMessage.save();
	return newMessage;
};

export const getMessages = async (
	filter: FilterQuery<typeof Message>,
	projection?: ProjectionType<typeof Message>,
	options?: QueryOptions<typeof Message>
): Promise<IMessage[] | null> => {
	const messages = await Message.find<IMessage & Document>(
		filter,
		projection,
		options
	).sort({ createdAt: 1 });
	if (!messages.length) return null;

	return (await Promise.all(messages.map(formatMessage))).filter((m) => !!m);
};
