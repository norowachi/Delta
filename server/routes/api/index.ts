import express from "express";
import users from "./users";
import guilds from "./guilds";
import DMRouter from "./DM";

const APIRouter = express.Router();

APIRouter.use("/users", users);
APIRouter.use("/guilds", guilds);
APIRouter.use("/dm", DMRouter);

export default APIRouter;
