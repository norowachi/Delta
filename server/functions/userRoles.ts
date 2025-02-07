import { Roles, Role } from "../constants.js";

export const getRolesFromValue = (value: number): Role[] => {
	const roles: Role[] = [];

	for (const role in Roles) {
		const roleValue = Roles[role as Role];

		if (typeof roleValue === "number" && (value & roleValue) === roleValue) {
			roles.push(role as Role);
		}
	}

	return roles;
};

export const getValueFromRoles = (roles: Role[]): number => {
	let value = 0;

	for (const role of roles) {
		value |= Roles[role];
	}

	return value;
};
