import mongoose, { Types } from "mongoose";
import { IEmbed, IMessage } from "../../interfaces.js";

const EmbedSchema = new mongoose.Schema<IEmbed>(
  {
    type: { $type: String, required: true },
    title: { $type: String, required: false },
    url: { $type: String, required: false },
    description: { $type: String, required: false },
    thumbnail: { $type: String, required: false },
    image: {
      url: String,
      width: Number,
      height: Number,
    },
  },
  { typeKey: "$type" },
);

const MessagesSchema = new mongoose.Schema<IMessage & mongoose.Document>({
  id: { type: String, required: true, unique: true },
  content: { type: String, required: false },
  embeds: { type: [EmbedSchema], required: false },
  system: { type: Boolean, required: true },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  channelId: { type: String, required: false },
  guildId: { type: String, required: false },
  ephemeral: { type: Boolean, required: false },
  readBy: { type: [String], required: false },
  createdAt: { type: Date, default: Date.now },
  mentions: { type: Map, of: String, required: false },
});

export const Message =
  mongoose.models.message ||
  mongoose.model<IMessage>("message", MessagesSchema);
