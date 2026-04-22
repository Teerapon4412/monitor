const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = __dirname;
const PORT = Number(process.env.PORT || 3000);

function readSupabaseConfigFromFile() {
  const configPath = path.join(ROOT_DIR, "config.js");

  if (!fs.existsSync(configPath)) {
    return { url: "", anonKey: "" };
  }

  const content = fs.readFileSync(configPath, "utf8");
  const urlMatch = content.match(/url:\s*"([^"]+)"/);
  const keyMatch = content.match(/anonKey:\s*"([^"]+)"/);

  return {
    url: urlMatch ? urlMatch[1].trim().replace(/\/+$/, "") : "",
    anonKey: keyMatch ? keyMatch[1].trim() : ""
  };
}

function getSupabaseConfig() {
  const fileConfig = readSupabaseConfigFromFile();
  const url = (process.env.MONITOR_SUPABASE_URL || process.env.SUPABASE_URL || fileConfig.url || "").trim().replace(/\/+$/, "");
  const anonKey = (process.env.MONITOR_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || fileConfig.anonKey || "").trim();

  return {
    url,
    anonKey,
    enabled: Boolean(url && anonKey)
  };
}

function json(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(payload));
}

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "application/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".json") return "application/json; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".ico") return "image/x-icon";

  return "application/octet-stream";
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;

      if (body.length > 1_000_000) {
        reject(new Error("Request body too large"));
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

async function proxySupabase(pathname, options = {}) {
  const config = getSupabaseConfig();

  if (!config.enabled) {
    throw new Error("Supabase config missing on Render");
  }

  const response = await fetch(`${config.url}/rest/v1${pathname}`, {
    method: options.method || "GET",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "resolution=merge-duplicates,return=representation"
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (!response.ok) {
    let message = `Supabase proxy failed: ${response.status}`;

    try {
      const payload = await response.json();
      message = payload?.message || payload?.error || message;
    } catch (error) {
      const text = await response.text();
      message = text || message;
    }

    throw new Error(message);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function handleApi(request, response, url) {
  try {
    if (request.method === "GET" && url.pathname === "/api/health") {
      json(response, 200, {
        ok: true,
        mode: "render-proxy",
        supabaseConfigured: getSupabaseConfig().enabled
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/jobs") {
      const rows = await proxySupabase("/machine_jobs?select=machine_id,area,direct_value,part_code,part_name,entity_type,qr_value,status,detail,updated_at,scanned_by");
      json(response, 200, rows || []);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/jobs/bulk") {
      const body = await readRequestBody(request);
      await proxySupabase("/machine_jobs?on_conflict=machine_id", {
        method: "POST",
        body: body.rows || []
      });
      json(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/history") {
      const rows = await proxySupabase("/machine_job_history?select=id,machine_id,area,direct_value,part_code,part_name,entity_type,qr_value,status,detail,updated_at,scanned_by,created_at&order=updated_at.desc&limit=300", {
        prefer: "return=representation"
      });
      json(response, 200, rows || []);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/history") {
      const body = await readRequestBody(request);
      await proxySupabase("/machine_job_history", {
        method: "POST",
        body: [body.row || {}]
      });
      json(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/part-settings") {
      const rows = await proxySupabase("/part_settings?select=part_code,injection_time_seconds,note,updated_at,updated_by&order=part_code.asc", {
        prefer: "return=representation"
      });
      json(response, 200, rows || []);
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/part-settings") {
      const body = await readRequestBody(request);
      await proxySupabase("/part_settings?on_conflict=part_code", {
        method: "POST",
        body: [body.row || {}]
      });
      json(response, 200, { ok: true });
      return;
    }

    json(response, 404, { error: "API route not found" });
  } catch (error) {
    const detail = error.cause?.message ? `${error.message}: ${error.cause.message}` : error.message;
    json(response, 502, { error: detail || "Render proxy error" });
  }
}

function serveStaticFile(response, filePath) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      json(response, 404, { error: "File not found" });
      return;
    }

    response.writeHead(200, {
      "Content-Type": getMimeType(filePath)
    });
    response.end(data);
  });
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);

  if (url.pathname.startsWith("/api/")) {
    await handleApi(request, response, url);
    return;
  }

  let relativePath = decodeURIComponent(url.pathname);

  if (relativePath === "/") {
    relativePath = "/index.html";
  }

  const targetPath = path.normalize(path.join(ROOT_DIR, relativePath));

  if (!targetPath.startsWith(ROOT_DIR)) {
    json(response, 403, { error: "Forbidden" });
    return;
  }

  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isFile()) {
    serveStaticFile(response, targetPath);
    return;
  }

  serveStaticFile(response, path.join(ROOT_DIR, "index.html"));
});

server.listen(PORT, () => {
  console.log(`Monitor server listening on port ${PORT}`);
});
