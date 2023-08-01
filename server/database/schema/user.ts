import mongoose from "mongoose";
import { IUser } from "../../interfaces";

const userSchema = new mongoose.Schema<IUser>({
	id: { type: String, required: true },
	username: { type: String, required: true },
	discriminator: { type: String, required: true },
	email: { type: String, required: true },
	avatar: { type: String, required: true },
	roles: { type: Number, required: false },
	password: { type: String, required: true },
	disabled: { type: Boolean, required: false },
	deleted: { type: Boolean, required: false },
	bot: { type: Boolean, required: true },
	system: { type: Boolean, required: false },
	token: { type: String, required: true },
	guilds: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "Guild",
			required: false,
		},
	],
});

export const User = mongoose.model<IUser>("User", userSchema);
