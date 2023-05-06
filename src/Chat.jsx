import { useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

export default function Chat() {
	const [username, setUsername] = useState("");
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState([]);
	const [connectedUsers, setConnectedUsers] = useState([]);

	useEffect(() => {
		socket.on("connect", () => {
			console.log(`Connected to server: ${socket.id}`);
		});

		socket.on("disconnect", () => {
			console.log(`Disconnected from server: ${socket.id}`);
		});

		socket.on("message", (message) => {
			setMessages((prevMessages) => [...prevMessages, message]);
		});

		socket.on("userJoined", ({ username }) => {
			setConnectedUsers((prevUsers) => [...prevUsers, username]);
		});

		socket.on("userLeft", ({ username }) => {
			setConnectedUsers((prevUsers) =>
				prevUsers.filter((user) => user !== username)
			);
		});
	}, []);

	const handleJoin = () => {
		socket.emit("join", { username });
	};

	const handleSend = () => {
		socket.emit("message", { username, message });
		setMessage("");
	};

	return (
		<div className="chat-container">
			<div className="users-container">
				<h2>Connected Users:</h2>
				<ul>
					{connectedUsers.map((user) => (
						<li key={user}>{user}</li>
					))}
				</ul>
			</div>
			<div className="messages-container">
				<div className="messages">
					{messages.map((message) => (
						<div key={message.timestamp}>
							<span className="username">{message.username}:</span>{" "}
							<span className="message-text">{message.message}</span>
						</div>
					))}
				</div>
				<div className="input-container">
					<input
						type="text"
						value={username}
						onChange={(e) => setUsername(e.target.value)}
						placeholder="Username"
					/>
					<button onClick={handleJoin}>Join Chat</button>
					<input
						type="text"
						value={message}
						onChange={(e) => setMessage(e.target.value)}
						placeholder="Type your message..."
					/>
					<button onClick={handleSend}>Send</button>
				</div>
			</div>
		</div>
	);
}
