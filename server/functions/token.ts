import jose from "node-jose";
import { TokenPayload } from "../interfaces.js";
import { getUserById } from "../database/functions/user.js";
import { EPOCH } from "./uid.js";
import { getKey } from "../database/functions/keys.js";

// Encrypts the payload using JWE
const encryptPayload = async (payload: any): Promise<string> => {
	// get the key
	const key = await getKey();

	const encrypted = await jose.JWE.createEncrypt({ format: "compact" }, key)
		.update(JSON.stringify(payload))
		.final();

	return encrypted;
};

// Decrypts the JWE token and returns the payload
const decryptToken = async (token: string): Promise<TokenPayload> => {
	// Load the key into a key store
	const key = await getKey();

	const decrypted = await jose.JWE.createDecrypt(key).decrypt(token);

	return JSON.parse(decrypted.plaintext.toString("utf8"));
};

// Generates a JWE token with the provided payload
export const generateAuthToken = async (
	userId: string,
	handle: string,
	password: string
): Promise<string> => {
	// one year in seconds = 60 * 60 * 24 * 365
	const expiry =
		Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 - Number(EPOCH);
	const payload: TokenPayload = {
		userId,
		handle,
		password,
		exp: expiry,
	};

	const token = await encryptPayload(payload);
	return token;
};

// Retrieves the user from the JWE token
export const getUserFromToken = async (token: string) => {
	try {
		const payload = await decryptToken(token);
		const user = await getUserById(payload.userId);

		if (!user) return null;
		if (
			payload.handle !== user.handle ||
			payload.userId !== user.id ||
			payload.password !== user.password
		)
			return null;

		return user;
	} catch (error) {
		console.error("Error decoding token: ", error);
		return null;
	}
};

export const AuthenticateToken = async (token: string) => {
	const payload = await decryptToken(token);
	const user = await getUserById(payload.userId);
	if (!user) return false;

	if (payload.handle !== user.handle || payload.password !== user.password)
		return false;
	if (Math.floor(Date.now() / 1000) - Number(EPOCH) >= payload.exp)
		return false;
	return true;
};
