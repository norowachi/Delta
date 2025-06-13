import mongoose from "mongoose";
import { IGuild } from "../../interfaces.js";

const GuildSchema = new mongoose.Schema<IGuild & mongoose.Document>({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  icon: { type: String, required: false },
  memberCount: { type: Number, required: true },
  members: { type: [String], required: true },
  ownerId: { type: String, required: true },
  channels: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "channel",
      required: true,
    },
  ],
  deleted: { type: Boolean, required: false },
});

export const Guild =
  mongoose.models.guild || mongoose.model<IGuild>("guild", GuildSchema);
