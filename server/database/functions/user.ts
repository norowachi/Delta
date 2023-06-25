import { IUser } from "../../interfaces";
import { User } from "../schema/user";

export const getUserById = async (userId: string): Promise<IUser | null> => {
	const user = await User.findOne({ id: userId });
	if (!user) return null;
	return user;
};
export const getUserByToken = async (token: string): Promise<IUser | null> => {
	const user = await User.findOne({ token: token });
	if (!user) return null;
	return user;
};