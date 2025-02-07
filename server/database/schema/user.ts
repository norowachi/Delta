import mongoose from "mongoose";
import { IUser } from "../../interfaces.js";

const userSchema = new mongoose.Schema<IUser>({
	id: { type: String, required: true },
	username: { type: String, required: true, unique: true },
	handle: { type: String, required: true, unique: true },
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
