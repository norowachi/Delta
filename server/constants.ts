import { IUser } from "./interfaces";

export const Roles = {
	STAFF: 1 << 0, // user is a staff member
	BOT: 1 << 1, // user is a bot
	VERIFIED: 1 << 2, // user (whether bot or not) is verified
};

export type Role = keyof typeof Roles;

export const Delta: IUser = {
	id: "0",
	username: "Delta",
	discriminator: "0000",
	bot: true,
	roles: Roles.STAFF | Roles.BOT | Roles.VERIFIED,
	system: true,
	avatar: "",
	disabled: false,
	deleted: false,
	email: "",
	password: "",
	token: "",
};
