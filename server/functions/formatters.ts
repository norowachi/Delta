import { Document } from "mongoose";
import { IChannel, IGuild, IMessage, IUser } from "../interfaces.js";
import { Users } from "../constants.js";

export async function formatGuild(guild: IGuild & Document) {
  const populatedChannels = await guild.populate({
    path: "channels",
    populate: {
      path: "stickyMessage",
      populate: {
        path: "author",
      },
    },
  });

  return {
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    memberCount: guild.memberCount,
    members: guild.members,
    ownerId: guild.ownerId,
    deleted: guild.deleted,
    channels: await Promise.all(populatedChannels.channels.map(formatChannel)),
  };
}

export async function formatChannel(channel: IChannel | (IChannel & Document)) {
  const populatedStickyMessage =
    "populate" in channel && !channel.populated("stickyMessage")
      ? (
          await channel
            .populate({
              path: "stickyMessage",
              populate: {
                path: "author",
              },
            })
            .catch(() => {})
        )?.stickyMessage
      : channel.stickyMessage;

  return {
    id: channel.id,
    name: channel.name,
    stickyMessage: populatedStickyMessage
      ? await formatMessage(populatedStickyMessage)
      : null,
    messages: channel.messages,
    members: channel.members,
  };
}

export async function formatMessage(message: IMessage | (IMessage & Document)) {
  const m =
    "populate" in message && !message.populated("author")
      ? await message.populate("author").catch(() => {})
      : message;
  if (!m) return null;

  const author = m.author || Users.Deleted;

  return {
    id: m.id,
    content: m.content,
    embeds: m.embeds,
    system: m.system,
    author: {
      id: author.id,
      username: author.username,
      handle: author.handle,
      avatar: author.avatar,
      roles: author.roles,
      disabled: author.disabled,
      deleted: author.deleted,
      bot: author.bot,
      system: author.system,
    },
    channelId: m.channelId,
    guildId: m.guildId,
    ephemeral: m.ephemeral,
    createdAt: m.createdAt,
    mentions: m.mentions,
  } as IMessage;
}

export function formatUser(
  user: (IUser | (IUser & Document)) & { SHOW_PRIVATE_DATA?: boolean },
) {
  const privateData = {
    password: "*".repeat(8),
    guilds: user.guilds,
  };

  return {
    ...(user.SHOW_PRIVATE_DATA ? privateData : {}),
    id: user.id,
    username: user.username,
    handle: user.handle,
    avatar: user.avatar,
    roles: user.roles,
    disabled: user.disabled,
    deleted: user.deleted,
    bot: user.bot,
    system: user.system,
  } as IUser;
}
