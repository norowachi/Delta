import { generateSnowflakeID } from "../../functions/uid";
import { IChannel, IGuild } from "../../interfaces";
import { Guild } from "../schema/guild";

export const getGuildById = async (guildId: string) => {
	const guild = await Guild.findOne({ id: guildId });
	if (!guild) return null;
	return guild;
};

export const getGuildByMongoId = async (mongoGuildId: string) => {
	const guild = await Guild.findOne({ _id: mongoGuildId });
	if (!guild) return null;
	return guild;
};

export const getGuildChannels = async (guildId: string) => {
	const guild = await Guild.findOne({ id: guildId });
	if (!guild) return null;
	const channels = (await guild.populate("channels")) as IChannel[];
	if (!channels) return null;
	return channels;
};

export const createGuild = async (
	data: Omit<IGuild, "memberCount" | "id" | "members" | "channels" | "deleted">
) => {
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
