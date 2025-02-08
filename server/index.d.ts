import "express";
import { Status } from "./constants.js";

interface MyLocals {
	status?: keyof typeof Status;
	token?: string;
	json?: any;
}

declare module "express" {
	export interface Response {
		locals: MyLocals;
	}
}
