import express from "express";
import users from "./users.js";
import guilds from "./guilds.js";
import DM from "./DM.js";
import messages from "./messages.js";

const V1Router = express.Router();

V1Router.use("/users", users);
V1Router.use("/guilds", guilds);
V1Router.use("/direct", DM);
V1Router.use("/channels", messages);

export default V1Router;
