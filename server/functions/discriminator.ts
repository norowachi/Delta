export const generateDiscriminator = (): string => {
	const min = 1;
	const max = 9999;
	const randomNumber = Math.floor(Math.random() * (max - min + 1)) + min;
	const paddedNumber = randomNumber.toString().padStart(4, "0");
	return paddedNumber;
};
