import { IEmbed, IMessage, IUser } from "../../interfaces.js";
import { Message } from "../schema/message.js";
import { generateSnowflakeID } from "../../functions/uid.js";
import { User } from "../schema/user.js";
import { Document, FilterQuery, ProjectionType, QueryOptions } from "mongoose";

export const getMessageById = async ({
	guildId = "@me",
	channelId,
	messageId,
}: {
	guildId: string;
	channelId: string;
	messageId: string;
}) => {
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
	} = message.populate(["author", "readBy"]);

	message.author = populated.author;
	message.readBy = populated.readBy.map((readyBy_User) => readyBy_User.id);
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
}) => {
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
	newMessage.save();
	return newMessage;
};

export const getMessages = async (
	filter: FilterQuery<typeof Message>,
	projection?: ProjectionType<typeof Message>,
	options?: QueryOptions<typeof Message>
) => {
	const messages = await Message.find(filter, projection, options);
	if (!messages.length) return null;

	type pubUser = Omit<IUser, "password" | "token">;

	return messages.map(async (msg) => {
		const populated: Omit<IMessage, "author" | "readBy"> & {
			author: pubUser;
			readBy: pubUser[];
		} = msg.populate(["author", "readBy"]);

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
		};
	});
};
