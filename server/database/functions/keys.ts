import jose from "node-jose";
import { Keys } from "../schema/keys.js";

export const rotateKey = async () => {
	const keystore = jose.JWK.createKeyStore();
	const newKey = await keystore.generate("oct", 256, {
		alg: "A256GCM",
		use: "enc",
	});

	const result = await Keys.create({
		kid: newKey.kid,
		kdata: JSON.stringify(newKey.toJSON(true)),
	});

	console.log("New encryption key generated:", newKey.kid);
	return result;
};

export const getKeystore = async () => {
	try {
		const keys = await Keys.find().sort({ createdAt: -1 });
		const keystore = jose.JWK.createKeyStore();

		if (!keys.length) {
			const key = await rotateKey();
			const data = await jose.JWK.asKey(JSON.parse(key.kdata!), "json");
			await keystore.add(data);
		} else {
			for (const key of keys) {
				const data = await jose.JWK.asKey(JSON.parse(key.kdata!), "json");
				await keystore.add(data);
			}
		}

		return keystore;
	} catch (err) {
		throw err;
	}
};
