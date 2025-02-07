import "express";
import { Errors } from "./constants.js";

interface MyLocals {
	status?: keyof typeof Errors;
	token?: string;
	json?: any;
}

declare module "express" {
	export interface Response {
		locals: MyLocals;
	}
}
