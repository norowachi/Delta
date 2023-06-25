// User & Member Interfaces
export interface IUser {
	id: string;
	username: string;
	discriminator: string;
	avatar: string | null;
	roles: number;
	email: string;
	password: string;
	disabled: boolean;
	deleted: boolean;
	bot: boolean;
	system: boolean;
	token: string;
}

export interface IMember {
	id: string;
	user: IUser;
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
	author: IUser;
	guildId: string | null;
	temporary: boolean;
}

export interface IEmbed {
	title: string;
	url: string;
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
	owner: IUser;
	channels: IChannel[];
	deleted: boolean;
}

export interface IChannel {
	id: string;
	name: string;
	stickyMessage: IMessage;
	messages: IMessage[];
}

// Define the TokenPayload interface
export interface TokenPayload {
	userId: string;
	email: string;
	password: string;
	exp: number;
}
