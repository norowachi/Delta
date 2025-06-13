import { Roles } from "../interfaces";

type RoleNames = keyof typeof Roles;

export const getRolesFromValue = (value: number): RoleNames[] => {
  const roles: RoleNames[] = [];

  for (const role in Roles) {
    const roleValue = Roles[role as RoleNames];

    if (typeof roleValue === "number" && (value & roleValue) === roleValue) {
      roles.push(Roles[roleValue] as RoleNames);
    }
  }

  return roles;
};

export const getValueFromRoles = (roles: RoleNames[]): number => {
  let value = 0;

  for (const role of roles) {
    value |= Roles[role];
  }

  return value;
};
