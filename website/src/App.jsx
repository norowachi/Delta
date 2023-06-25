import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./App.css";

const socket = io("http://localhost:5000");

function App() {
	const [username, _setUsername] = useState("");
	const [message, setMessage] = useState("");
	const [messages, setMessages] = useState([]);

	useEffect(() => {
		socket.on("message", (message) => {
			setMessages((messages) => [...messages, message]);
		});
	}, []);

	const handleSubmit = (event) => {
		event.preventDefault();
		if (message.trim() !== "") {
			socket.emit("chatMessage", { username, message });
			setMessage("");
		}
	};

	return (
		<div className="container">
			<div className="sidebar">
				<h2>Users</h2>
				<ul>
					<li>
						<a href="#">User 1</a>
					</li>
					<li>
						<a href="#">User 2</a>
					</li>
					<li>
						<a href="#">User 3</a>
					</li>
				</ul>
			</div>
			<div className="chat">
				<div className="chat-header">
					<h2>Delta</h2>
				</div>
				<div className="chat-messages">
					{messages.map((message, index) => (
						<div className="message" key={index}>
							<div className="meta">
								<span className="username">{message.username}</span>
								<span className="time">{message.time}</span>
							</div>
							<div className="text">{message.message}</div>
						</div>
					))}
				</div>
				<div className="chat-input">
					<form onSubmit={handleSubmit}>
						<input
							type="text"
							placeholder="Type your message..."
							value={message}
							onChange={(event) => setMessage(event.target.value)}
						/>
						<button type="submit">Send</button>
					</form>
				</div>
			</div>
		</div>
	);
}

export default App;
