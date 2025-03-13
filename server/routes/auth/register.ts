import express from "express";
import bcrypt from "bcrypt";
import { User } from "../../database/schema/user.js";
import { createUser } from "../../database/functions/user.js";
import { Status } from "../../constants.js";
import { IUser } from "../../interfaces.js";

const registerRouter = express.Router();

// Register route
registerRouter.post("/", async (req, res) => {
	let {
		username,
		handle,
		password,
	}: Pick<IUser, "username" | "password"> & Partial<Pick<IUser, "handle">> =
		req.body;
	if (!username || !password)
		return res.status(400).json({ message: "Invalid credentials" });

	username = username.toLowerCase();
	handle ||= `${username}@delta.noro.cc`;

	try {
		const usernameCheck = /^(?![-_.])[a-z0-9-_.]{3,32}$/gi.test(username);
		if (!usernameCheck)
			return res.status(400).json({ message: "Invalid username." });
		if (await User.findOne<IUser>({ $or: [{ username }, { handle }] }))
			return res.status(409).json({ message: "Username or handle taken." });

		//! default handle
		handle ||= `${username}@delta.noro.cc`;

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new user
		const user = await createUser({
			username: username,
			handle: handle,
			roles: 0,
			password: hashedPassword,
		});

		if (!user) return res.status(500).json({ message: Status[500] });

		res
			.status(201)
			.json({ token: user.token, message: "Registered successfully" });
	} catch (error) {
		console.error(error);
		res.status(500).json({ message: Status[500] });
	}
});

// Export the Register router
export default registerRouter;
