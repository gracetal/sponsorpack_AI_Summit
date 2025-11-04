// script.js

// Your sheet details
const SHEET_ID = "1F97w8RaNMX6n-P3Y1XXavYofRE85moAKdAkgZ5NOCnw";
const TAB_NAME = "Sheet1";

// Google Visualization JSON endpoint
const DATA_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(TAB_NAME)}`;

async function loadSheetObjects() {
  const res = await fetch(DATA_URL, { cache: "no-store" });
  const text = await res.text();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Unexpected response format from Google Sheets.");
  const gviz = JSON.parse(match[0]);

  const cols = gviz.table.cols.map(c => (c.label || c.id || "").trim());
  const rows = gviz.table.rows || [];

  return rows.map(r => {
    const cells = (r.c || []).map(c => (c && (c.v !== null && c.v !== undefined)) ? c.v : "");
    return Object.fromEntries(cols.map((h, i) => [h, cells[i] ?? ""]));
  });
}

function mapToPackages(rows) {
  return rows.map(r => ({
    tier: r.Tier || "",
    name: r.Name || r.Tier || "",
    price: r.Price || "",
    status: r.Status || "Available",
    description: r.Description || "",
    benefits: typeof r.Benefits === "string" ? r.Benefits.split(/[|;]\s*/).filter(Boolean) : [],
    contactLabel: r.ContactLabel || "Contact Us",
    contactHref: r.ContactHref || "#contact",
    sort: Number(r.Sort || 9999)
  }));
}

// Format numeric price as USD
const fmtUSD = n =>
  isNaN(+n) ? n : (+n).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  });

function render(items) {
  const grid = document.getElementById("sp-grid");
  grid.innerHTML = "";
  items
    .sort((a,b)=> (a.sort??9999)-(b.sort??9999))
    .forEach(it=>{
      const taken=/taken|sold\s*out|closed/i.test(it.status||"");
      const statusClass=taken?"taken":"available";
      const benefits = (it.benefits || []).map(txt => {
          const m = txt.match(/^([^:]+):\s*(.*)$/);
          return m ? `<li><strong>${m[1]}:</strong> ${m[2]}</li>` : `<li>${txt}</li>`;
        }).join("");

      grid.insertAdjacentHTML("beforeend", `
  <article class="sp-card ${statusClass}">
    <div class="sp-header-row">
      <span class="sp-status ${statusClass}">${it.status}</span>
      <h3 class="sp-title">${it.name}</h3>
    </div>
    ${it.description ? `<p class="sp-desc">${it.description}</p>` : ""}
    <div><span class="sp-price">${fmtUSD(it.price)}</span></div>
    ${benefits ? `<ul class="sp-benefits">${benefits}</ul>` : ""}
    <div class="sp-cta">
      ${taken ? "" : `<a href="${it.contactHref}">${it.contactLabel}</a>`}
    </div>
  </article>
`);
    });
}

loadSheetObjects()
  .then(mapToPackages)
  .then(render)
  .catch(err=>{
    console.error(err);
    document.getElementById("sp-grid").innerHTML="<p>Couldn’t load sponsorship packages right now. Please Email: asteckel@pghtech.org</p>";
  });
