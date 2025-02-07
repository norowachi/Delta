import express from "express";
import users from "./users.js";
import guilds from "./guilds.js";
import DMRouter from "./DM.js";

const APIRouter = express.Router();

APIRouter.use("/users", users);
APIRouter.use("/guilds", guilds);
APIRouter.use("/dm", DMRouter);

export default APIRouter;
