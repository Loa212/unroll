import { env } from "./src/lib/env";
import { router } from "./src/lib/server";
import homepage from "./src/pages/index.html";

const server = Bun.serve({
	port: env.PORT,
	routes: {
		"/": homepage,
		"/api/*": router.handler,
	},
});

console.log(`Listening on ${server.url}`);
