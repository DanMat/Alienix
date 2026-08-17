/*
 * Alienix configuration.
 *
 * High scores use the shared Cloudflare leaderboard (a Worker + D1),
 * namespaced by `gameId` so Alienix's board is its own — see
 * https://github.com/DanMat/retroix-leaderboard . Blank `apiUrl` to fall
 * back to a local (per-browser) leaderboard.
 */
window.GAME_CONFIG = {
	apiUrl: 'https://retroix-leaderboard.danmat.workers.dev',

	gameId: 'alienix',
	leaderboardSize: 10
};
