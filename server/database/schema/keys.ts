import mongoose from "mongoose";

const KeySchema = new mongoose.Schema({
	kid: { type: Object, required: true },
	kdata: String,
	createdAt: { type: Date, default: Date.now, expires: "7d" },
});

export const Keys = mongoose.model("keystore", KeySchema);
