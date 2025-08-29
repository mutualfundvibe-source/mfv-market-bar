// scripts/update.mjs
// Fetches market quotes from Yahoo Finance and writes bar-data.json
// Symbols: ^NSEI (NIFTY 50), ^BSESN (SENSEX), ^CNX100 (NIFTY 100 Large Cap proxy), ^CRSMID (NIFTY Midcap 100),
//          ^CNXSC (NIFTY Smallcap 100), USDINR=X (USD/INR)

import fs from "node:fs/promises";

const YF_URL = "https://query1.finance.yahoo.com/v7/finance/quote?symbols=%5ENSEI,%5EBSESN,%5ECNX100,%5ECRSMID,%5ECNXSC,USDINR%3DX";

function istNowISO(){
  const now = new Date();
  const istMillis = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMillis);
  // Format: YYYY-MM-DDTHH:mm:ss+05:30
  const pad = n => String(n).padStart(2,"0");
  const y = ist.getUTCFullYear();
  const m = pad(ist.getUTCMonth()+1);
  const d = pad(ist.getUTCDate());
  const H = pad(ist.getUTCHours());
  const M = pad(ist.getUTCMinutes());
  const S = pad(ist.getUTCSeconds());
  return `${y}-${m}-${d}T${H}:${M}:${S}+05:30`;
}

function mapResult(result){
  // Yahoo returns regularMarketPrice and regularMarketChangePercent (already in %)
  return {
    value: Number(result.regularMarketPrice ?? 0),
    change: Number(result.regularMarketChangePercent ?? 0)
  };
}

const keyMap = {
  "^NSEI":   "nifty50",
  "^BSESN":  "sensex",
  "^CNX100": "largecap",
  "^CRSMID": "midcap",
  "^CNXSC":  "smallcap",
  "USDINR=X": "usdInr"
};

(async () => {
  const resp = await fetch(YF_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if(!resp.ok) {
    throw new Error(`Yahoo Finance API failed: ${resp.status} ${resp.statusText}`);
  }
  const json = await resp.json();
  const results = json?.quoteResponse?.result ?? [];

  const indices = {};
  for(const r of results){
    const key = keyMap[r.symbol];
    if(!key) continue;
    indices[key] = mapResult(r);
  }

  // read current file to preserve CTA/branding/source if you’ve edited them
  let current = {};
  try{
    const raw = await fs.readFile("./bar-data.json","utf8");
    current = JSON.parse(raw);
  }catch{ /* ignore if first run */ }

  const updated = {
    asOf: istNowISO(),
    indices: {
      nifty50:  indices.nifty50  ?? current.indices?.nifty50  ?? {value:0, change:0},
      sensex:   indices.sensex   ?? current.indices?.sensex   ?? {value:0, change:0},
      largecap: indices.largecap ?? current.indices?.largecap ?? {value:0, change:0},
      midcap:   indices.midcap   ?? current.indices?.midcap   ?? {value:0, change:0},
      smallcap: indices.smallcap ?? current.indices?.smallcap ?? {value:0, change:0},
      usdInr:   indices.usdInr   ?? current.indices?.usdInr   ?? {value:0, change:0}
    },
    cta: current.cta ?? {
      text: "Connect with MutualFundVibe expert for your First SIP",
      url: "https://wa.me/91XXXXXXXXXX?text=I%20want%20to%20start%20my%20first%20SIP&utm_source=mfv_bar&utm_medium=site&utm_campaign=cta_v1"
    },
    branding: current.branding ?? "MutualFundVibe",
    source: current.source ?? "Yahoo Finance (delayed); Index definitions by NSE"
  };

  await fs.writeFile("./bar-data.json", JSON.stringify(updated, null, 2) + "\n", "utf8");
  console.log("bar-data.json updated:", updated.asOf);
})();
