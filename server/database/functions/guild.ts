import { Document } from "mongoose";
import { generateSnowflakeID } from "../../functions/uid.js";
import { IChannel, IGuild } from "../../interfaces.js";
import { Guild } from "../schema/guild.js";

export const getGuildById = async (
	guildId: string
): Promise<(IGuild & Document) | null> => {
	const guild = await Guild.findOne({ id: guildId });
	if (!guild) return null;
	return guild;
};

export const getGuildChannels = async (
	guildId: string,
	limit: number = 30
): Promise<(IChannel & Document)[] | null> => {
	const guild = await Guild.findOne({ id: guildId }, null, { limit });
	if (!guild) return null;
	const channels = (await guild.populate("channels")).channels;
	if (!channels) return null;
	return channels;
};

export const createGuild = async (
	data: Omit<IGuild, "memberCount" | "id" | "members" | "channels" | "deleted">
): Promise<(IGuild & Document) | null> => {
	try {
		const guild = new Guild<IGuild>({
			id: generateSnowflakeID("g"),
			name: data.name,
			icon: data.icon,
			memberCount: 1,
			members: [],
			ownerId: data.ownerId,
			channels: [], //TODO: create a channel named general and add it here
			deleted: false,
		});
		guild.save();
		return guild;
	} catch (err) {
		return null;
	}
};
