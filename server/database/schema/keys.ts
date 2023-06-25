import mongoose from "mongoose";
import jose from "node-jose";

const KeySchema = new mongoose.Schema<jose.JWK.Key>({
	keystore: { type: Object, required: true },
	length: { type: Number, required: true },
	kty: { type: String, required: true },
	kid: { type: String, required: true },
	use: { type: String, required: true },
	alg: { type: String, required: true },
});

export const Keys = mongoose.model<jose.JWK.Key>("Keystore", KeySchema);
