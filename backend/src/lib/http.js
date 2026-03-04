export function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(data));
}

export function sendError(res, statusCode, message, details) {
  sendJson(res, statusCode, {
    error: {
      message,
      details: details ?? null
    }
  });
}

export function notFound(res) {
  sendError(res, 404, "Not Found");
}

export function methodNotAllowed(res, allowed) {
  sendJson(res, 405, {
    error: {
      message: "Method Not Allowed",
      allowed
    }
  });
}

export async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  const raw = Buffer.concat(chunks).toString("utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error("Invalid JSON body");
  }
}
