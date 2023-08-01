import express from "express";
import bcrypt from "bcrypt";
import { User } from "../../database/schema/user";
import { generateDiscriminator } from "../../functions/discriminator";
import { createUser } from "../../database/functions/user";
import md5 from "md5";

const registerRouter = express.Router();

// Register route
registerRouter.post("/", async (req, res) => {
	const { username, email, password } = req.body;
	try {
		if (await User.findOne({ email }))
			return res
				.status(409)
				.json({ message: "User with email already exists" });

		// Check if the username & discriminator are already taken, if true generate a new discrim
		let discriminator = await checkAvailability(
			username,
			generateDiscriminator()
		);

		// Hash the password
		const hashedPassword = await bcrypt.hash(password, 10);

		//!Important: chooses a default avatar if user has no gravatar
		const avatar = `https://www.gravatar.com/avatar/${md5(
			email
		)}?s=512&d=${encodeURI(
			`https://${req.get("host")}/images/delta-${parseInt(discriminator) % 5}.png`
		)}`;

		// Create a new user
		await createUser({
			username: username,
			discriminator: discriminator,
			avatar: avatar,
			roles: 0,
			email: email,
			password: hashedPassword,
		});


		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		res.status(500).json({ message: "Internal server error" });
	}
});

// Checks username & discrim availability and regenerates a discrim if user with same data exists
const checkAvailability = async (
	username: string,
	discriminator: string
): Promise<string> => {
	const existingUser = await User.findOne({ username, discriminator });
	// the discriminator value to return
	let discrim = discriminator;
	if (existingUser) {
		discrim = generateDiscriminator();
		return await checkAvailability(username, discrim);
	}
	return discrim;
};
// Export the Register router
export default registerRouter;
