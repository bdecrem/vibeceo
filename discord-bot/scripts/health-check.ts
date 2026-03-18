import http from "http";
import { client } from "../lib/discord/bot.js";

const server = http.createServer((req, res) => {
	if (req.url === "/health" || req.url === "/api/health") {
		const isClientReady = client.isReady();

		// Always return 200 — Railway healthcheck just needs the server to be up.
		// Include Discord status for observability but don't fail the healthcheck
		// during Discord connection startup.
		res.writeHead(200, { "Content-Type": "application/json" });
		res.end(
			JSON.stringify({
				status: isClientReady ? "healthy" : "starting",
				discord: isClientReady ? "connected" : "connecting",
				uptime: process.uptime(),
			})
		);
	} else {
		res.writeHead(404);
		res.end();
	}
});

const PORT = process.env.PORT || process.env.HEALTH_CHECK_PORT || 3002;
server.listen(PORT, () => {
	console.log(`Health check server listening on port ${PORT}`);
});
