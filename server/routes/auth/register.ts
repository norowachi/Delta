import express from "express";
import bcrypt from "bcrypt";
import { User } from "../../database/schema/user";
import { generateDiscriminator } from "../../functions/discriminator";
import { generateSnowflakeID } from "../../functions/uid";
import { IUser } from "../../interfaces";
import { generateAuthToken } from "../../functions/token";

const registerRouter = express.Router();

// Register route
registerRouter.post("/", async (req, res) => {
	const { username, email, password, avatar } = req.body;
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

		const id = generateSnowflakeID();
		// Create a new user
		const newUser = new User<IUser>({
			id: id,
			username,
			discriminator,
			avatar,
			roles: 0,
			password: hashedPassword,
			email: email,
			disabled: false,
			deleted: false,
			bot: false,
			system: false,
			token: await generateAuthToken(id, email, password),
		});
		await newUser.save();

		res.status(201).json({ message: "User registered successfully" });
	} catch (error) {
		console.error("Error registering user:", error);
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
