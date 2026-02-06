import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const data = await req.json();
    console.log("Received questionnaire submission for:", data.nom_prenom || "Anonyme");

    const store = getStore({ name: "questionnaire-responses", consistency: "strong" });

    // Use timestamp + random suffix as key to avoid collisions
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Add submission timestamp to the data
    const entry = {
      ...data,
      _submitted_at: new Date().toISOString(),
    };

    await store.setJSON(key, entry);
    console.log("Submission saved to Blobs with key:", key);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

export const config = {
  path: "/.netlify/functions/submit-questionnaire",
};
