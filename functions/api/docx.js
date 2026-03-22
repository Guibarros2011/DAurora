const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

export async function onRequestOptions() {
  return new Response(null, { headers: cors });
}

export async function onRequestPost(context) {
  const { request } = context;
  try {
    const { fichaContent, clientName } = await request.json();
    const docxBytes = generateDocx(fichaContent, clientName);
    const safeName = (clientName || "Personagem").replace(/[^a-zA-Z0-9]/g, "_");
    return new Response(docxBytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="Ficha_${safeName}_ACO.docx"`,
        ...cors,
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...cors },
    });
  }
}

function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// ── PARSE DA FICHA MARKDOWN ──
function parseFicha(text) {
  const sections = []; let cur = null;
  for (const line of text.split("\n")) {
    if (/^#{1,3}\s+/.test(line)) {
      if (cur) sections.push(cur);
      const level = line.match(/^(#+)/)[1].length;
      cur = { title: line.replace(/^#+\s+/, "").trim(), level, lines: [] };
    } else if (cur) {
      cur.lines.push(line);
    }
  }
  if (cur) sections.push(cur);
  return sections;
}

function generateDocx(fichaContent, clientName) {
  const hoje = new Date().toLocaleDateString("pt-BR");
  const sections = parseFicha(fichaContent || "");

  const paras = [];

  // ── CAPA ──
  paras.push(p("", { after: 60 }));
  paras.push(p("A CRUZADA DOS OCEANOS", { bold: true, color: "b08830", sz: 36, font: "Cormorant Garamond", align: "center", after: 40 }));
  paras.push(p("Guilda Luminávio · Ficha de Personagem", { italic: true, color: "8a6a28", sz: 22, font: "Cormorant Garamond", align: "center", after: 80 }));
  paras.push(borderLine("b08830", "bottom", 4, 60));
  paras.push(p("", { after: 40 }));

  // Nome do personagem (título h1)
  const nomeMatch = fichaContent?.match(/^#\s+(.+)/m);
  const nomePers = nomeMatch ? nomeMatch[1].trim() : (clientName || "Personagem");
  paras.push(p(nomePers, { bold: true, color: "16303f", sz: 52, font: "Cormorant Garamond", align: "center", after: 20 }));
  paras.push(p(`${clientName || ""} · ${hoje}`, { italic: true, sz: 18, color: "8a6a28", align: "center", after: 120 }));
  paras.push(borderLine("b08830", "bottom", 2, 320));

  // ── SEÇÕES ──
  for (const sec of sections) {
    // Pula o h1 (nome do personagem — já na capa)
    if (sec.level === 1) continue;

    if (sec.level === 2) {
      paras.push(h2(sec.title));
    } else if (sec.level === 3) {
      paras.push(h3(sec.title));
    }

    const lines = sec.lines;
    let i = 0;
    while (i < lines.length) {
      const line = lines[i].trim();
      if (!line) { i++; continue; }

      // Bullet
      if (/^[-*•]/.test(line)) {
        const clean = line.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "").trim();
        paras.push(bullet(clean));
        i++; continue;
      }

      // H3 inline
      if (/^###\s+/.test(line)) {
        paras.push(h3(line.replace(/^###\s+/, "").trim()));
        i++; continue;
      }

      // Bold label
      const boldMatch = line.match(/^\*\*([^*]+)\*\*[:]?\s*(.*)/);
      if (boldMatch) {
        paras.push(boldLabel(boldMatch[1] + (boldMatch[2] ? ": " : ""), boldMatch[2] || ""));
        i++; continue;
      }

      // Texto normal
      paras.push(body(line.replace(/\*\*/g, "").replace(/\*/g, "")));
      i++;
    }

    paras.push(spacer());
  }

  // ── RODAPÉ ──
  paras.push(borderLine("b08830", "top", 4, 60));
  paras.push(p("Vilhelmo de Bahxos · FishJourney · StoryForge", {
    italic: true, sz: 18, color: "8a6a28", align: "center", after: 40
  }));
  paras.push(p("A Cruzada dos Oceanos · Universo de Akvon", {
    sz: 18, color: "b08830", align: "center", after: 80
  }));

  const docXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
<w:body>${paras.join("")}
<w:sectPr>
  <w:pgSz w:w="11906" w:h="16838"/>
  <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>
</w:sectPr>
</w:body>
</w:document>`;

  const files = {
    "[Content_Types].xml": `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`,
    "_rels/.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`,
    "word/document.xml": docXml,
    "word/styles.xml": buildStyles(),
    "word/_rels/document.xml.rels": `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
  };

  return buildZip(files);
}

// ── XML BUILDERS ──
function p(text, opts = {}) {
  const { bold, italic, color, sz, font, align, after = 80, before = 0, indent, hanging, border } = opts;
  let rpr = "";
  if (bold) rpr += "<w:b/>";
  if (italic) rpr += "<w:i/>";
  if (color) rpr += `<w:color w:val="${color}"/>`;
  if (sz) rpr += `<w:sz w:val="${sz}"/><w:szCs w:val="${sz}"/>`;
  if (font) rpr += `<w:rFonts w:ascii="${font}" w:hAnsi="${font}"/>`;

  let ppr = `<w:spacing w:before="${before}" w:after="${after}"/>`;
  if (align) ppr += `<w:jc w:val="${align}"/>`;
  if (indent) ppr += `<w:ind w:left="${indent}"${hanging ? ` w:hanging="${hanging}"` : ""}/>`;
  if (border) ppr += border;

  return `<w:p><w:pPr>${ppr}</w:pPr><w:r>${rpr ? `<w:rPr>${rpr}</w:rPr>` : ""}<w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function h2(text) {
  return `<w:p><w:pPr><w:pStyle w:val="Heading2"/><w:spacing w:before="360" w:after="120"/><w:pBdr><w:bottom w:val="single" w:sz="2" w:space="1" w:color="b08830"/></w:pBdr></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/><w:color w:val="16303f"/><w:rFonts w:ascii="Cormorant Garamond" w:hAnsi="Cormorant Garamond"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function h3(text) {
  return `<w:p><w:pPr><w:spacing w:before="200" w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:i/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="2a4a5e"/><w:rFonts w:ascii="Cormorant Garamond" w:hAnsi="Cormorant Garamond"/></w:rPr><w:t>${esc(text)}</w:t></w:r></w:p>`;
}

function body(text) {
  return `<w:p><w:pPr><w:spacing w:after="100"/></w:pPr><w:r><w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="EB Garamond" w:hAnsi="EB Garamond"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function bullet(text) {
  return `<w:p><w:pPr><w:ind w:left="400" w:hanging="200"/><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:color w:val="b08830"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">⚓  </w:t></w:r><w:r><w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="EB Garamond" w:hAnsi="EB Garamond"/></w:rPr><w:t xml:space="preserve">${esc(text)}</w:t></w:r></w:p>`;
}

function boldLabel(label, value) {
  return `<w:p><w:pPr><w:spacing w:after="80"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="22"/><w:color w:val="16303f"/><w:rFonts w:ascii="Cormorant Garamond" w:hAnsi="Cormorant Garamond"/></w:rPr><w:t xml:space="preserve">${esc(label)}</w:t></w:r><w:r><w:rPr><w:sz w:val="22"/><w:rFonts w:ascii="EB Garamond" w:hAnsi="EB Garamond"/></w:rPr><w:t xml:space="preserve">${esc(value)}</w:t></w:r></w:p>`;
}

function spacer() {
  return `<w:p><w:pPr><w:spacing w:after="140"/></w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`;
}

function borderLine(color, side, sz, after) {
  return `<w:p><w:pPr><w:pBdr><w:${side} w:val="single" w:sz="${sz}" w:space="1" w:color="${color}"/></w:pBdr><w:spacing w:after="${after}"/></w:pPr><w:r><w:t xml:space="preserve"> </w:t></w:r></w:p>`;
}

function buildStyles() {
  return `<?xml version="1.0" encoding="UTF-8"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="EB Garamond" w:hAnsi="EB Garamond"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:basedOn w:val="Normal"/><w:rPr><w:b/><w:sz w:val="28"/><w:rFonts w:ascii="Cormorant Garamond" w:hAnsi="Cormorant Garamond"/><w:color w:val="16303f"/></w:rPr></w:style></w:styles>`;
}

// ── ZIP ──
function crc32(data) {
  let c = 0xffffffff;
  for (let i = 0; i < data.length; i++) { c ^= data[i]; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; }
  return (c ^ 0xffffffff) >>> 0;
}
function u16(v) { return new Uint8Array([v & 0xff, (v >> 8) & 0xff]); }
function u32(v) { return new Uint8Array([v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff]); }

function buildZip(files) {
  const te = new TextEncoder();
  const parts = []; const cds = []; let offset = 0;
  for (const [name, content] of Object.entries(files)) {
    const nb = te.encode(name); const db = te.encode(content); const crc = crc32(db);
    const lh = new Uint8Array(30 + nb.length);
    let o = 0;
    lh.set([0x50, 0x4b, 0x03, 0x04], o); o += 4; lh.set(u16(20), o); o += 2; lh.set(u16(0), o); o += 2; lh.set(u16(0), o); o += 2;
    lh.set(u16(0), o); o += 2; lh.set(u16(0), o); o += 2; lh.set(u32(crc), o); o += 4; lh.set(u32(db.length), o); o += 4;
    lh.set(u32(db.length), o); o += 4; lh.set(u16(nb.length), o); o += 2; lh.set(u16(0), o); o += 2; lh.set(nb, o);
    parts.push(lh); parts.push(db);
    cds.push({ nb, db, crc, offset }); offset += lh.byteLength + db.byteLength;
  }
  const cdStart = offset;
  for (const { nb, db, crc, offset: loff } of cds) {
    const cd = new Uint8Array(46 + nb.length); let o = 0;
    cd.set([0x50, 0x4b, 0x01, 0x02], o); o += 4; cd.set(u16(20), o); o += 2; cd.set(u16(20), o); o += 2; cd.set(u16(0), o); o += 2;
    cd.set(u16(0), o); o += 2; cd.set(u16(0), o); o += 2; cd.set(u16(0), o); o += 2; cd.set(u32(crc), o); o += 4;
    cd.set(u32(db.length), o); o += 4; cd.set(u32(db.length), o); o += 4; cd.set(u16(nb.length), o); o += 2;
    cd.set(u16(0), o); o += 2; cd.set(u16(0), o); o += 2; cd.set(u16(0), o); o += 2; cd.set(u16(0), o); o += 2;
    cd.set(u32(0), o); o += 4; cd.set(u32(loff), o); o += 4; cd.set(nb, o);
    parts.push(cd); offset += cd.byteLength;
  }
  const eocd = new Uint8Array(22); let o = 0;
  eocd.set([0x50, 0x4b, 0x05, 0x06], o); o += 4; eocd.set(u16(0), o); o += 2; eocd.set(u16(0), o); o += 2;
  eocd.set(u16(cds.length), o); o += 2; eocd.set(u16(cds.length), o); o += 2;
  eocd.set(u32(offset - cdStart), o); o += 4; eocd.set(u32(cdStart), o); o += 4; eocd.set(u16(0), o);
  parts.push(eocd);
  const total = parts.reduce((s, p) => s + p.byteLength, 0);
  const result = new Uint8Array(total); let pos = 0;
  for (const p of parts) { result.set(new Uint8Array(p.buffer || p), pos); pos += p.byteLength; }
  return result.buffer;
}
