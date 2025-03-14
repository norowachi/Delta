import express from "express";

const Updater = express.Router();

// Show updater
Updater.get("/:target/:arch/:version", async (req, res) => {
	const { target, arch, version } = req.params as {
		target: "linux" | "darwin" | "windows";
		arch: "x86_64" | "i686" | "aarch64" | "armv7";
		version: string;
	};

	if (!target || !arch || !version) return res.sendStatus(400);

	// Get latest release from GitHub
	const github: GitHubRelease = await fetch(
		"https://api.github.com/repos/norowachi/DeltaApp/releases/latest",
		{
			headers: { Accept: "application/vnd.github+json" },
		}
	)
		.then((res) => res.json())
		.catch(() => null);

	if (!github) return res.sendStatus(204);

	const targetMap = {
		windows: ".msi",
		darwin: ".app.tar.gz",
		linux: ".AppImage",
	};

	const archMap = {
		x86_64: ["x86_64", "amd64", "x64"],
		i686: ["i686"],
		aarch64: ["aarch64"],
		armv7: ["armv7", "armhf"],
	};

	const validArch = archMap[arch] || null;
	const validTarget = targetMap[target] || null;
	if (!validTarget || !validArch) {
		console.log("Invalid target or arch", target, arch);
		return res.sendStatus(400);
	}

	// Find matching asset
	const asset = github.assets.find(
		(a) =>
			validArch.some((archStr) => a.name.includes(archStr)) &&
			a.name.endsWith(validTarget)
	);

	if (!asset) {
		console.warn("No asset found for", target, arch, version);
		return res.sendStatus(204);
	}

	// Compare versions
	const latestVersion = github.tag_name.replace(/^v/, "");
	if (latestVersion === version) return res.sendStatus(204);

	const signature = (await fetch(asset.browser_download_url + ".sig")).text();

	// Return update info
	res.status(200).json({
		version: latestVersion,
		pub_date: asset.updated_at || asset.created_at,
		url: asset.browser_download_url,
		signature,
	});
});

export default Updater;

interface GitHubRelease {
	/**
	 * v1.0.0
	 */
	tag_name: string;
	draft: boolean;
	prerelease: boolean;
	assets: {
		/**
		 * https://github.com/octocat/Hello-World/releases/download/v1.0.0/example.zip
		 */
		browser_download_url: string;
		name: string;
		created_at: string;
		updated_at: string;
	}[];
}
