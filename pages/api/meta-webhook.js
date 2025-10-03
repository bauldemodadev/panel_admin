import { saveLeadToFirebase } from "@/lib/firebase";

const VERIFY_TOKEN = "tucscrm2024";
const FB_PAGE_ACCESS_TOKEN = process.env.FB_PAGE_ACCESS_TOKEN;

async function fetchLeadFromFacebook(leadgen_id) {
  const url = `https://graph.facebook.com/v18.0/${leadgen_id}?access_token=${FB_PAGE_ACCESS_TOKEN}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Facebook API error: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error al consultar la API de Facebook:", error);
    throw error;
  }
}

function parseLeadData(fbLead) {
  // Extrae los campos del formulario
  const fields = {};
  if (Array.isArray(fbLead.field_data)) {
    for (const item of fbLead.field_data) {
      if (item.name && item.values && item.values.length > 0) {
        // Normaliza nombres comunes
        const key = item.name.toLowerCase().replace(/\s+/g, "_");
        fields[key] = item.values[0];
      }
    }
  }
  return fields;
}

export default async function handler(req, res) {
  if (req.method === "GET") {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Verificación exitosa de Meta Webhook");
      return res.status(200).send(challenge);
    } else {
      console.error("Token inválido en verificación");
      return res.status(403).send("Token inválido");
    }
  }

  if (req.method === "POST") {
    const body = req.body;
    console.log("POST recibido en webhook:", JSON.stringify(body, null, 2));

    if (body.object === "page") {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.field === "leadgen") {
            const { leadgen_id, page_id, created_time } = change.value;
            try {
              // 1. Consultar la API de Facebook
              console.log(`Consultando Facebook API para leadgen_id: ${leadgen_id}`);
              const fbLead = await fetchLeadFromFacebook(leadgen_id);
              console.log("Respuesta de Facebook API:", JSON.stringify(fbLead, null, 2));

              // 2. Parsear los datos del formulario
              const formData = parseLeadData(fbLead);
              console.log("Datos parseados del formulario:", formData);

              // 3. Guardar en Firestore
              const leadToSave = {
                leadgen_id,
                page_id,
                created_time,
                ...formData,
                receivedAt: new Date().toISOString(),
                status: "pending"
              };
              await saveLeadToFirebase(leadToSave);
              console.log("Lead guardado correctamente en Firestore", leadToSave);
            } catch (error) {
              console.error("Error en el procesamiento del lead:", error);
              return res.status(500).json({ error: "Error al procesar y guardar lead", details: error.message });
            }
          }
        }
      }
      return res.status(200).send("EVENT_RECEIVED");
    }
    console.warn("No es un evento de leadgen");
    return res.status(404).send("No es un evento de leadgen");
  }

  res.setHeader("Allow", ["GET", "POST"]);
  res.status(405).end(`Method ${req.method} Not Allowed`);
} 