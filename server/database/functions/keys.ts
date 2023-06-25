import jose from "node-jose";
import { Keys } from "../schema/keys";

export const getKeys = async (): Promise<jose.JWK.Key[] | null> => {
	const keys = await Keys.find();
	if (!keys) return null;
	return keys as jose.JWK.Key[];
};
export const addKey = async (key: jose.JWK.Key) => {
	try {
		const newKey = new Keys({
			keystore: key.keystore,
			length: key.length,
			kty: key.kty,
			kid: key.kid,
			use: key.use,
			alg: key.alg,
		});
		newKey.save();
		return true;
	} catch (err) {
		console.error("Cannot save key:", err);
		return false;
	}
};
