const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function sign(payloadB64, secret) {
  return crypto.createHmac("sha256", secret).update(payloadB64).digest("base64url");
}

function parseCookies(cookieHeader = "") {
  const out = {};
  cookieHeader.split(";").forEach((part) => {
    const [k, ...v] = part.trim().split("=");
    if (!k) return;
    out[k] = decodeURIComponent(v.join("=") || "");
  });
  return out;
}

function isAuthed(event) {
  const SECRET = process.env.DOCS_AUTH_SECRET;
  if (!SECRET) return false;

  const cookies = parseCookies(event.headers.cookie || event.headers.Cookie || "");
  const token = cookies.cav_auth;
  if (!token) return false;

  const [payloadB64, sig] = token.split(".");
  if (!payloadB64 || !sig) return false;

  const expected = sign(payloadB64, SECRET);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!crypto.timingSafeEqual(a, b)) return false;

  let payload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return false;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || now > payload.exp) return false;

  return true;
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".png") return "image/png";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

exports.handler = async (event) => {
  // 1) Si pas authentifié => afficher page login (rien de sensible dans le front)
  if (!isAuthed(event)) {
    const html = `<!doctype html><html lang="fr"><head>
      <meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
      <title>Espace colistiers</title>
      <style>
        body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#0b1220;color:#e5e7eb;margin:0;display:grid;place-items:center;min-height:100vh;padding:24px}
        .card{background:#111827;border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;max-width:420px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,.45)}
        h1{font-size:20px;margin:0 0 8px}
        p{margin:0 0 14px;color:#cbd5e1;line-height:1.4}
        input,button{width:100%;padding:12px 14px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#0b1220;color:#e5e7eb;font-size:16px}
        button{margin-top:10px;background:#2563eb;border:none;font-weight:700;cursor:pointer}
        .err{color:#f87171;margin-top:10px;display:none}
      </style>
    </head><body>
      <div class="card">
        <h1>Espace colistiers</h1>
        <p>Accès protégé. Entrez le mot de passe.</p>
        <form id="f">
          <input id="p" type="password" placeholder="Mot de passe" autocomplete="off" required>
          <button type="submit">Se connecter</button>
          <div id="e" class="err">Mot de passe incorrect</div>
        </form>
      </div>
      <script>
        const f=document.getElementById('f'), p=document.getElementById('p'), e=document.getElementById('e');
        f.addEventListener('submit', async (ev) => {
          ev.preventDefault(); e.style.display='none';
          const r = await fetch('/.netlify/functions/login', {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify({ password: p.value })
          });
          if(r.ok){ location.reload(); }
          else { e.style.display='block'; p.value=''; p.focus(); }
        });
      </script>
    </body></html>`;

    return {
      statusCode: 401,
      headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
      body: html,
    };
  }

  // 2) Déterminer quel fichier on demande : /colistiers/xxx
  const original =
    event.headers["x-nf-original-path"] ||
    event.headers["X-Nf-Original-Path"] ||
    (event.rawUrl ? new URL(event.rawUrl).pathname : "");

  let rel = original.startsWith("/colistiers/") ? original.slice("/colistiers/".length) : "";
  if (!rel || rel === "/") rel = "documents.html";
  rel = rel.replace(/^\/+/, "");

  if (rel.includes("..")) return { statusCode: 400, body: "Bad path" };

  const filePath = path.join(__dirname, "..", "..", "private_docs", rel);

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    return { statusCode: 404, body: "Not found" };
  }

  const data = fs.readFileSync(filePath);

  return {
    statusCode: 200,
    headers: {
      "Content-Type": contentType(filePath),
      "Cache-Control": "no-store",
    },
    body: data.toString("base64"),
    isBase64Encoded: true,
  };
};
