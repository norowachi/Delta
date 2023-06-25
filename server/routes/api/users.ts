import express from "express";
import { getUserFromToken } from "../../functions/token";
import { getUserById } from "../../database/functions/user";

const usersRouter = express.Router();

usersRouter.get("/:userId", async (req, res) => {
	const userId = req.params.userId;
	// if request it to /@me
	if (userId == "@me") {
		const token = req.header("authorization");
		if (!token) {
			return res.status(401).json({ message: "Missing token" });
		}

		const user = getUserFromToken(token);
		if (!user) {
			return res.status(401).json({ message: "Invalid token" });
		}

		// TODO: return public user data
		return res.status(200).json(user);
	}

	const user = await getUserById(userId);
	if (!user) {
		return res.status(400).json({ message: "Invalid ID" });
	}
	// TODO: return public user data
	res.status(200).json();
});

usersRouter.patch("/@me", (req, res) => {
	const token = req.header("authorization");
	if (!token) {
		return res.status(401).json({ message: "Missing token" });
	}

	const user = getUserFromToken(token);
	if (!user) {
		return res.status(401).json({ message: "Invalid token" });
	}

	// TODO: Handle get user by ID & return new user
	res.status(200).json();
});

// Export the users router
export default usersRouter;
