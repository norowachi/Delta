import jose from "node-jose";
import { IUser, TokenPayload } from "../interfaces";
import { getUserById } from "../database/functions/user";
import { EPOCH } from "./uid";
import { getKeys, addKey } from "../database/functions/keys";

// Encrypts the payload using JWE
const encryptPayload = async (payload: any): Promise<string> => {
	// Generate a new symmetric key
	const keystore = jose.JWK.createKeyStore();
	const key = await keystore.generate("oct", 256, {
		use: "enc",
		alg: "A256GCM",
	});
	await addKey(key);

	const encrypted = await jose.JWE.createEncrypt({ format: "compact" }, key)
		.update(JSON.stringify(payload))
		.final();

	return encrypted;
};

// Decrypts the JWE token and returns the payload
const decryptToken = async (token: string): Promise<TokenPayload> => {
	// Load the key into a key store
	const keystore = jose.JWK.createKeyStore();
	const keys = await getKeys();
	await keystore.add(keys!);

	const decrypted = await jose.JWE.createDecrypt(keystore).decrypt(token);

	return JSON.parse(decrypted.plaintext.toString("utf8"));
};

// Generates a JWE token with the provided payload
export const generateAuthToken = async (
	userId: string,
	email: string,
	password: string
): Promise<string> => {
	// one year in seconds = 60 * 60 * 24 * 365
	const expiry =
		Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 - Number(EPOCH);
	const payload: TokenPayload = {
		userId,
		email,
		password,
		exp: expiry,
	};

	const token = await encryptPayload(payload);
	return token;
};

// Retrieves the user from the JWE token
export const getUserFromToken = async (
	token: string
): Promise<IUser | null> => {
	try {
		const payload = await decryptToken(token);
		const user = await getUserById(payload.userId);

		if (!user) return null;
		if (
			payload.email !== user.email ||
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

	if (payload.email !== user.email || payload.password !== user.password)
		return false;
	if (Math.floor(Date.now() / 1000) - Number(EPOCH) >= payload.exp)
		return false;
	return true;
};
