const protect = (mail: string) => {
	const [name, domain] = mail.split(/@/);
	let blockedName: any;
	if (name.length > 5) {
		blockedName =
			name.slice(0, 2) +
			"*".repeat(name.length - 4) +
			name.slice(name.length - 2);
	}
	if (name.length <= 5 && name.length !== 1) {
		blockedName = name.slice(0, 1) + "*".repeat(name.length - 1);
	}
	if (!blockedName) blockedName = "*".repeat(name.length);
	return `${blockedName}@${domain}`;
};

export default protect;
