import mongoose from "mongoose";

const KeySchema = new mongoose.Schema({
	kid: { type: Object, required: true },
	kdata: String,
	createdAt: { type: Date, default: Date.now },
});

export const Keys =
	mongoose.models.keystore || mongoose.model("keystore", KeySchema);
