export enum WebSocketOP {
	HELLO = 0,
	MESSAGE_CREATE = 1,
	MESSAGE_UPDATE = 2,
	MESSAGE_DELETE = 3,
}

export interface WebSocketEvent {
	op: WebSocketOP;
	d: any;
}

export interface WSHelloPayload {
	op: WebSocketOP.HELLO;
}

export interface WebSocketConnection {
	ws: string;
	id: string;
}
