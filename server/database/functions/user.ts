import { env } from "../../constants";
import { generateAuthToken } from "../../functions/token";
import { generateSnowflakeID } from "../../functions/uid";
import { IUser } from "../../interfaces";
import { User } from "../schema/user";

export const getUserById = async (userId: string) => {
	const user = await User.findOne({ id: userId });
	if (!user) return null;
	return user;
};

export const getUserByToken = async (token: string) => {
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
) => {
	try {
		const id = generateSnowflakeID("u");
		const user = new User<IUser>({
			id: id,
			username: data.username,
			handle: data.handle,
			avatar: `https://${env.API_ORIGIN}/images/delta-${parseInt(id) % 5}.png`,
			roles: 0,
			password: data.password,
			disabled: false,
			deleted: false,
			bot: false,
			system: false,
			token: await generateAuthToken(id, data.handle, data.password),
			guilds: [], //TODO: add the base - in this case "townhall" guild id
		});
		await user.save();
		return user;
	} catch (err) {
		return null;
	}
};
