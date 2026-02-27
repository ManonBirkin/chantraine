const crypto = require("crypto");

function json(statusCode, body, headers = {}) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers,
    },
    body: JSON.stringify(body),
  };
}

function safeEqual(a, b) {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function sign(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  const PASSWORD = process.env.DOCS_PASSWORD;   // Netlify env
  const SECRET = process.env.DOCS_AUTH_SECRET;  // Netlify env

  if (!PASSWORD || !SECRET) {
    return json(500, { ok: false, error: "Server not configured" });
  }

  let data;
  try {
    data = JSON.parse(event.body || "{}");
  } catch {
    return json(400, { ok: false, error: "Invalid JSON" });
  }

  const { password } = data;

  if (!safeEqual(password, PASSWORD)) {
    await new Promise((r) => setTimeout(r, 300)); // anti brute force léger
    return json(401, { ok: false, error: "Invalid password" });
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 60 * 12; // 12h

  const payload = Buffer.from(JSON.stringify({ iat: now, exp })).toString("base64url");
  const sig = sign(payload, SECRET);
  const token = `${payload}.${sig}`;

  const cookie = `cav_auth=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${60 * 60 * 12}`;

  return json(200, { ok: true }, { "Set-Cookie": cookie });
};
