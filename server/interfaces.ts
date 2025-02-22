// User & Member Interfaces

export interface PrivateUser {
	id: string;
	username: string;
	handle: string;
	avatar: string | null;
	roles: number;
	disabled: boolean;
	deleted: boolean;
	bot: boolean;
	system: boolean;
}

export interface IUser {
	id: string;
	username: string;
	handle: string;
	avatar: string | null;
	roles: number;
	password: string;
	disabled: boolean;
	deleted: boolean;
	bot: boolean;
	system: boolean;
	token: string;
	guilds: string[];
}

export interface IMember {
	id: string;
	user: PrivateUser;
	guildId: string;
	nickname: string;
	owner: boolean;
}

// Message Interface
export interface IMessage {
	id: string;
	content: string;
	embeds: IEmbed[];
	system: boolean;
	author: PrivateUser;
	channelId: string;
	guildId?: string | null;
	ephemeral: boolean;
	readBy: string[];
	createdAt: Date;
}

export interface IEmbed {
	type: "image" | "video" | "link";
	title: string;
	url: string;
	image: {
		url: string;
		width: number;
		height: number;
	};
	description: string;
	thumbnail: string;
}

// Guild & Channel Interface
export interface IGuild {
	id: string;
	name: string;
	icon: string | null;
	memberCount: number;
	members: string[];
	ownerId: string;
	channels: IChannel[];
	deleted: boolean;
}

//! Important
export enum ChannelTypes {
	DM = 0,
	TEXT = 1,
	VOICE = 2,
}

export interface IChannel {
	id: string;
	name: string;
	stickyMessage?: IMessage;
	messages: IMessage[];
	guildId: string;
	members: string[];
	type: ChannelTypes;
}

// Define the TokenPayload interface
export interface TokenPayload {
	userId: string;
	handle: string;
	password: string;
	exp: number;
}
