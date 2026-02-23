interface Env {
	R2_BUCKET: R2Bucket;
	ALLOWED_ORIGIN: string;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const key = decodeURIComponent(url.pathname.slice(1));

		const corsHeaders: Record<string, string> = {
			"Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
			"Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
			"Access-Control-Allow-Headers": "Range",
			"Access-Control-Expose-Headers": "Content-Length, Content-Type, Content-Range",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { status: 204, headers: corsHeaders });
		}

		if (request.method !== "GET" && request.method !== "HEAD") {
			return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
		}

		if (!key || key.startsWith("_staging/")) {
			return new Response("Not Found", { status: 404, headers: corsHeaders });
		}

		const object = await env.R2_BUCKET.get(key);

		if (!object) {
			return new Response("Not Found", { status: 404, headers: corsHeaders });
		}

		const headers = new Headers(corsHeaders);
		object.writeHttpMetadata(headers);
		headers.set("ETag", object.httpEtag);

		return new Response(object.body, { headers });
	},
};
