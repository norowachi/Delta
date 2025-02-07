import express from "express";
import bcrypt from "bcrypt";
import { User } from "../../database/schema/user";
import { createUser } from "../../database/functions/user";

const registerRouter = express.Router();

// Register route
registerRouter.post("/", async (req, res) => {
	const { username, password } = req.body;
	try {
		const usernameCheck = /^(?![-_.])[a-zA-Z0-9-_.]{3,32}$/gi.test(username);
		if (!usernameCheck)
			return res.status(400).json({ message: "Invalid username." });
		if (await User.findOne({ username }))
			return res.status(409).json({ message: "Username taken." });

		//! default handle
		const handle = `${username}.delta.noro.cc`;

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		// Create a new user
		await createUser({
			username: username,
			handle: handle,
			roles: 0,
			password: hashedPassword,
		});

		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
});

// Export the Register router
export default registerRouter;
