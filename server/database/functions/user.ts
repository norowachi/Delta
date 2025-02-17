import { Document, Types } from "mongoose";
import { env } from "../../constants.js";
import { generateAuthToken } from "../../functions/token.js";
import { generateSnowflakeID } from "../../functions/uid.js";
import { IGuild, IUser } from "../../interfaces.js";
import { User } from "../schema/user.js";

type popUser = Omit<IUser, "guilds"> & {
	guilds: (Omit<IGuild, "channels"> & { channels: string[] })[];
} & Document<Types.ObjectId>;

export const getUserById = async (userId: string): Promise<popUser | null> => {
	const user = await User.findOne<IUser & Document<Types.ObjectId>>({
		id: userId,
	});
	if (!user) return null;
	return (await user.populate("guilds")) as popUser;
};

export const getUserByToken = async (
	token: string
): Promise<(IUser & Document) | null> => {
	const user = await User.findOne({ token: token });
	if (!user) return null;
	return user;
};

export const createUser = async (
	data: Omit<
		IUser,
		| "id"
		| "disabled"
		| "deleted"
		| "bot"
		| "system"
		| "token"
		| "guilds"
		| "avatar"
	>
): Promise<(IUser & Document) | null> => {
	try {
		const id = generateSnowflakeID("u");
		const token = await generateAuthToken(id, data.handle, data.password);

		const user = new User<IUser>({
			id,
			username: data.username,
			handle: data.handle,
			avatar: `https://${env.API_ORIGIN}/images/delta-${
				parseInt(id.slice(1)) % 5
			}.png`,
			roles: 0,
			password: data.password,
			disabled: false,
			deleted: false,
			bot: false,
			system: false,
			token,
			guilds: ["67adde6604bd4e70d418a65a"], //TODO: add the user to guild.$.member 
		});
		await user.save();
		return user;
	} catch (err) {
		console.error(err);
		return null;
	}
};
