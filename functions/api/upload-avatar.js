const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

async function sha256Hex(data) {
  const buf = data instanceof ArrayBuffer ? data : new TextEncoder().encode(data);
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function deriveSigningKey(secret, dateStamp, region, service) {
  const encode = s => new TextEncoder().encode(s);
  const hmac = async (key, data) => {
    const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    return new Uint8Array(await crypto.subtle.sign("HMAC", k, encode(data)));
  };
  const kDate    = await hmac(encode("AWS4" + secret), dateStamp);
  const kRegion  = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");
  return kSigning;
}

async function hmacHex(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(data));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const notionId = formData.get("notionId");

    if (!file) {
      return new Response(JSON.stringify({ error: "Arquivo não encontrado" }), {
        status: 400, headers: { "Content-Type": "application/json", ...cors }
      });
    }

    const fileBuffer = await file.arrayBuffer();
    const ext = (file.name || "avatar.jpg").split(".").pop().toLowerCase();
    const fileName = `avatars/${notionId || "anon"}-${Date.now()}.${ext}`;
    const contentType = file.type || "image/jpeg";

    const accessKeyId     = env.R2_ACCESS_KEY_ID;
    const secretAccessKey = env.R2_SECRET_ACCESS_KEY;
    const accountId       = env.CF_ACCOUNT_ID;
    const bucket          = "daurora-avatars";
    const region          = "auto";
    const host            = `${accountId}.r2.cloudflarestorage.com`;

    const now = new Date();
    const amzDate  = now.toISOString().replace(/[:\-]|\.\d{3}/g, "").slice(0, 15) + "Z";
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = await sha256Hex(fileBuffer);

    const canonicalUri     = `/${bucket}/${fileName}`;
    const canonicalHeaders =
      `content-type:${contentType}\n` +
      `host:${host}\n` +
      `x-amz-content-sha256:${payloadHash}\n` +
      `x-amz-date:${amzDate}\n`;
    const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

    const canonicalRequest = ["PUT", canonicalUri, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");
    const credentialScope  = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign     = ["AWS4-HMAC-SHA256", amzDate, credentialScope, await sha256Hex(new TextEncoder().encode(canonicalRequest))].join("\n");

    const signingKey = await deriveSigningKey(secretAccessKey, dateStamp, region, "s3");
    const signature  = await hmacHex(signingKey, stringToSign);

    const authorization =
      `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const r2Res = await fetch(`https://${host}${canonicalUri}`, {
      method: "PUT",
      headers: {
        "Content-Type": contentType,
        "x-amz-content-sha256": payloadHash,
        "x-amz-date": amzDate,
        "Authorization": authorization
      },
      body: fileBuffer
    });

    if (!r2Res.ok) {
      const errText = await r2Res.text();
      throw new Error(`R2: ${r2Res.status} ${errText}`);
    }

    const publicUrl = `https://pub-06bd955ab8934c659efe6c112f23c443.r2.dev/${fileName}`;

    if (notionId) {
      await fetch(`https://api.notion.com/v1/pages/${notionId}`, {
        method: "PATCH",
        headers: {
          "Authorization": `Bearer ${env.NOTION_TOKEN}`,
          "Content-Type": "application/json",
          "Notion-Version": "2022-06-28"
        },
        body: JSON.stringify({
          cover: { type: "external", external: { url: publicUrl } },
          properties: { "Avatar URL": { url: publicUrl } }
        })
      });
    }

    return new Response(JSON.stringify({ url: publicUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...cors }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors }
    });
  }
}
