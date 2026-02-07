import { getStore } from "@netlify/blobs";

const FIELD_KEYS = [
  "nom_prenom",
  "tranche_age",
  "telephone",
  "email",
  "securite_general",
  "securite_remarques",
  "sante_professionnels",
  "sante_remarques",
  "impots_fonciers_info",
  "impots_remarques",
  "jeunesse_services",
  "jeunesse_remarques",
  "actions_sociales",
  "social_remarques",
  "attractivite",
  "attractivite_remarques",
  "loisirs_offre",
  "loisirs_remarques",
  "evenements_suffisants",
  "evenements_idees",
  "cae_impact",
  "cae_remarques",
  "representation",
  "representation_remarques",
  "idees_pour_chantraine",
];

const FIELD_LABELS = {
  nom_prenom: "Nom / Prénom",
  tranche_age: "Tranche d'âge",
  telephone: "Téléphone",
  email: "Email",
  securite_general: "Sécurité - Général",
  securite_remarques: "Sécurité - Remarques",
  sante_professionnels: "Santé - Professionnels",
  sante_remarques: "Santé - Remarques",
  impots_fonciers_info: "Impôts fonciers - Info",
  impots_remarques: "Impôts - Remarques",
  jeunesse_services: "Jeunesse - Services",
  jeunesse_remarques: "Jeunesse - Remarques",
  actions_sociales: "Actions sociales",
  social_remarques: "Actions sociales - Remarques",
  attractivite: "Attractivité",
  attractivite_remarques: "Attractivité - Remarques",
  loisirs_offre: "Loisirs - Offre",
  loisirs_remarques: "Loisirs - Remarques",
  evenements_suffisants: "Événements - Suffisants",
  evenements_idees: "Événements - Idées",
  cae_impact: "CAE - Impact",
  cae_remarques: "CAE - Remarques",
  representation: "Représentation",
  representation_remarques: "Représentation - Remarques",
  idees_pour_chantraine: "Idées pour Chantraine",
};

function checkAuth(req) {
  const username = Netlify.env.get("ADMIN_USERNAME") || "admin";
  const password = Netlify.env.get("ADMIN_PASSWORD");

  if (!password) {
    return false;
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return false;
  }

  const decoded = atob(authHeader.slice(6));
  const [user, pass] = decoded.split(":");
  return user === username && pass === password;
}

function unauthorizedResponse() {
  return new Response("Accès refusé", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Administration"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function escapeCsvField(value) {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes('"') || str.includes(",") || str.includes("\n") || str.includes("\r")) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

async function getAllResponses() {
  const store = getStore({ name: "questionnaire-responses", consistency: "strong" });
  const { blobs } = await store.list();

  const responses = [];
  for (const blob of blobs) {
    const data = await store.get(blob.key, { type: "json" });
    if (data) {
      responses.push(data);
    }
  }

  // Sort by submission date (most recent first)
  responses.sort((a, b) => {
    const dateA = a._submitted_at || "";
    const dateB = b._submitted_at || "";
    return dateB.localeCompare(dateA);
  });

  return responses;
}

function buildCsv(responses) {
  const headers = ["Date de soumission", ...FIELD_KEYS.map((k) => FIELD_LABELS[k] || k)];
  const rows = [headers.map(escapeCsvField).join(",")];

  for (const entry of responses) {
    const row = [
      escapeCsvField(entry._submitted_at || ""),
      ...FIELD_KEYS.map((k) => escapeCsvField(entry[k] || "")),
    ];
    rows.push(row.join(","));
  }

  // BOM for Excel UTF-8 compatibility
  return "\uFEFF" + rows.join("\r\n");
}

function buildAdminHtml(responseCount) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Administration - Résultats | Chantraine À-Venir</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .admin-card {
      background: #fff;
      border-radius: 1rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.08);
      padding: 2.5rem;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .admin-card h1 {
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: .5rem;
      color: #1e3a5f;
    }
    .admin-card .subtitle {
      color: #64748b;
      font-size: .95rem;
      margin-bottom: 2rem;
    }
    .stat {
      font-size: 3rem;
      font-weight: 800;
      color: #3b82f6;
      line-height: 1;
      margin-bottom: .25rem;
    }
    .stat-label {
      color: #64748b;
      font-size: .875rem;
      margin-bottom: 2rem;
    }
    .btn {
      display: inline-block;
      padding: .875rem 2rem;
      font-size: 1rem;
      font-weight: 600;
      color: #fff;
      background: #3b82f6;
      border: none;
      border-radius: .5rem;
      cursor: pointer;
      text-decoration: none;
      transition: background .2s;
    }
    .btn:hover { background: #2563eb; }
    .btn:active { background: #1d4ed8; }
    .back-link {
      display: block;
      margin-top: 1.5rem;
      color: #64748b;
      font-size: .875rem;
      text-decoration: none;
    }
    .back-link:hover { color: #3b82f6; }
  </style>
</head>
<body>
  <div class="admin-card">
    <h1>Résultats du questionnaire</h1>
    <p class="subtitle">Administration - Chantraine À-Venir</p>
    <div class="stat">${responseCount}</div>
    <p class="stat-label">réponse${responseCount !== 1 ? "s" : ""} enregistrée${responseCount !== 1 ? "s" : ""}</p>
    <a href="/resultats?format=csv" class="btn" download="questionnaire-resultats.csv">Télécharger le CSV</a>
    <a href="/" class="back-link">Retour à l'accueil</a>
  </div>
</body>
</html>`;
}

export default async (req) => {
  if (!checkAuth(req)) {
    return unauthorizedResponse();
  }

  const url = new URL(req.url);
  const format = url.searchParams.get("format");

  if (format === "csv") {
    const responses = await getAllResponses();
    const csv = buildCsv(responses);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="questionnaire-resultats-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  // Default: show admin HTML page with response count
  const responses = await getAllResponses();

  return new Response(buildAdminHtml(responses.length), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
};

export const config = {
  path: "/resultats",
};
