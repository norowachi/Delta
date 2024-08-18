import express from "express";
import bcrypt from "bcrypt";
import { AuthenticateToken, generateAuthToken } from "../../functions/token";
import { User } from "../../database/schema/user";

const loginRouter = express.Router();

// Login route
loginRouter.post("/", async (req, res) => {
	const { username, email, password } = req.body;
	if (!username || !password || !email) {
		return res.status(400).json({ message: "Invalid credentials" });
	}

	try {
		// Check if the user exists
		const user =
			(await User.findOne({ username })) || (await User.findOne({ email }));
		if (!user) {
			return res.status(401).json({ message: "Invalid username or email" });
		}

		// Compare the hashed password
		const passwordMatch = await bcrypt.compare(password, user.password!);
		if (!passwordMatch) {
			return res.status(401).json({ message: "Invalid password" });
		}

		// Generate or send the authentication token
		let token: string = user.token;
		if (!(await AuthenticateToken(user.token))) {
			token = await generateAuthToken(user.id, user.email, user.password);
		}
		console.log(token);
		res.status(200).json({ token });
	} catch (error) {
		console.error("Error logging in user:", error);
		res.sendStatus(500);
	}
});

// Export the Login router
export default loginRouter;
