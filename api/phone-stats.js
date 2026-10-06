// Phone dashboard data for /phone. The Quo key lives only in this function's
// env (QUO_API_KEY); the page never sees it. Callers must send a Firebase ID
// token for the shared staff account, verified against Google, not trusted.
const FIREBASE_API_KEY = "AIzaSyAj4YUF1DteDZgXM5zV_T08DV3OjzwD_SE";
const STAFF_EMAIL = "staff@iara.nyc";
const PN = "PNuTaGqv8u"; // (929) 930-5033
const OPENED = Date.parse("2026-10-02T21:00:00Z"); // first service, 5 PM ET
const DAYS = 30;
const AUTO = ["Sorry we missed you!", "Thanks for texting iara!", "Thanks, we got your message!", "Thanks for texting iara."];
const RONALD = "USmFnGf59c"; // takes the calls (host stand handset + his phone)
const JAY = "USoYBvLvH2";    // owner seat; typed texts are Jay's
// Inbound texts the auto-replies already answer, or that never need a reply.
const NO_REPLY = [
  /how (do|can) (i|we) (get|make|book)\b.*(reserv|table)/i,        // auto-reply carries the Resy link
  /reply "?1"? to confirm|text "?1"? to confirm|you're due at|we didn't copy/i, // reservation bots
];
const SPAM = /pest control|\bseo\b|merchant services|google listing|business funding/i; // vendor pitches, whole thread
const LATE = /\blate\b|running|\b\d{1,2}(:\d{2})?\s*(pm|p\.m\.)?\b/i;
const CLOSER = /\b(thanks?|thank you|thx|ty|obrigad[ao]|ok(ay)?|great|perfect|awesome|amazing|see you|got it|sounds good)\b|👍|🙏|❤️/i;
const TZ = "America/New_York";

let cache = null; // { at, body }

async function verify(req) {
  const m = (req.headers.authorization || "").match(/^Bearer (.+)$/);
  if (!m) return false;
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_API_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ idToken: m[1] }),
  });
  if (!r.ok) return false;
  const j = await r.json();
  return (j.users || []).some((u) => u.email === STAFF_EMAIL);
}

async function quo(path, params) {
  const out = [];
  let token = null;
  for (let page = 0; page < 20; page++) {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) [].concat(v).forEach((x) => q.append(k, x));
    if (token) q.set("pageToken", token);
    let r;
    for (let tries = 0; tries < 6; tries++) {
      r = await fetch(`https://api.openphone.com/v1/${path}?${q}`, { headers: { Authorization: process.env.QUO_API_KEY } });
      if (r.status !== 429) break;
      await new Promise((s) => setTimeout(s, 1000 * (tries + 1)));
    }
    if (!r.ok) throw new Error(`Quo ${path} ${r.status}`);
    const j = await r.json();
    out.push(...j.data);
    token = j.nextPageToken;
    if (!token) break;
  }
  return out;
}

async function pool(items, n, fn) {
  const res = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; res[k] = await fn(items[k]); }
  }));
  return res;
}

const etParts = (t) => Object.fromEntries(new Intl.DateTimeFormat("en-US", {
  timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "numeric", hourCycle: "h23", weekday: "short",
}).formatToParts(new Date(t)).map((p) => [p.type, p.value]));

async function build() {
  const since = new Date(Date.now() - DAYS * 864e5).toISOString();
  const convs = (await quo("conversations", { maxResults: 100, "phoneNumbers[]": PN, updatedAfter: since }))
    .filter((c) => c.participants.length === 1);
  const per = await pool(convs, 4, async (c) => {
    const p = c.participants[0];
    const args = { phoneNumberId: PN, "participants[]": p, maxResults: 100, createdAfter: since };
    const [calls, msgs] = await Promise.all([quo("calls", args), quo("messages", args)]);
    return { p, calls, msgs };
  });

  const ev = [];
  for (const { p, calls, msgs } of per) {
    for (const c of calls) {
      const t = Date.parse(c.createdAt);
      if (c.direction === "incoming") ev.push({ t, p, k: "in_call", s: c.answeredAt ? "answered" : c.status === "completed" ? "voicemail" : "missed" });
      else ev.push({ t, p, k: "out_call", d: c.duration || 0, u: c.userId });
      if (c.direction === "incoming" && c.answeredAt) ev[ev.length - 1].d = c.duration || 0, ev[ev.length - 1].u = c.answeredBy;
    }
    for (const m of msgs) {
      const t = Date.parse(m.createdAt);
      if (m.direction === "incoming") ev.push({ t, p, k: "in_text", text: m.text || "" });
      else ev.push({ t, p, k: AUTO.some((a) => (m.text || "").startsWith(a)) ? "auto" : "human_text", u: m.userId, text: m.text || "" });
    }
  }
  ev.sort((a, b) => a.t - b.t);

  const inCalls = ev.filter((e) => e.k === "in_call");
  const count = (arr, s) => arr.filter((e) => e.s === s).length;
  const post = inCalls.filter((e) => e.t >= OPENED);

  // Per guest: handled if a person spoke to them or replied after their last inbound.
  const by = new Map();
  for (const e of ev) { if (!by.has(e.p)) by.set(e.p, []); by.get(e.p).push(e); }
  const open = []; let handled = 0, autoOnly = 0, guests = 0; const waits = [];
  for (const [p, es] of by) {
    const ins = es.filter((e) => e.k.startsWith("in"));
    if (!ins.length) continue;
    guests++;
    const lastIn = ins[ins.length - 1];
    const touches = es.filter((e) => (e.k === "out_call" || e.k === "human_text" || e.s === "answered"));
    const firstHuman = es.find((e) => (e.k === "out_call" || e.k === "human_text") && e.t >= ins[0].t);
    if (firstHuman && !ins.some((e) => e.s === "answered")) waits.push((firstHuman.t - ins[0].t) / 36e5);
    if (touches.length && touches[touches.length - 1].t >= lastIn.t) { handled++; continue; }
    const kinds = ins.filter((e) => e.t > (touches.length ? touches[touches.length - 1].t : 0));
    const texts = kinds.filter((e) => e.k === "in_text");
    const vm = kinds.some((e) => e.s === "voicemail");
    // "Thanks so much!" after a person already replied closes the thread.
    if (touches.length && !vm && texts.length && texts.every((e) => e.text.length < 80 && CLOSER.test(e.text))) { handled++; continue; }
    // Texts the auto-reply covered: a late notice right after the "Running late?"
    // auto-text, a how-do-I-book question (auto-text has the Resy link), bots, spam.
    const spam = ins.some((e) => e.k === "in_text" && SPAM.test(e.text));
    if (spam) { autoOnly++; continue; }
    const needs = texts.filter((e) => {
      if (NO_REPLY.some((r) => r.test(e.text))) return false;
      const prevAuto = es.filter((x) => x.k === "auto" && x.t <= e.t).pop();
      if (prevAuto && /Running late\?/.test(prevAuto.text) && e.t - prevAuto.t < 15 * 60e3 && e.text.length < 120 && !e.text.includes("?") && LATE.test(e.text)) return false;
      return true;
    });
    if (!needs.length && !vm) { autoOnly++; continue; } // missed call, got the Resy auto-text by design
    open.push({
      last4: p.slice(-4), at: lastIn.t,
      type: needs.length ? "text" : "voicemail",
      count: kinds.length,
      preview: needs.length ? needs[needs.length - 1].text.slice(0, 160) : "",
    });
  }
  open.sort((a, b) => b.at - a.at);
  waits.sort((a, b) => a - b);

  const days = {};
  for (let i = DAYS - 1; i >= 0; i--) {
    const d = etParts(Date.now() - i * 864e5);
    days[`${d.year}-${d.month}-${d.day}`] = { label: `${d.weekday} ${+d.month}/${+d.day}`, answered: 0, voicemail: 0, missed: 0, callsOut: 0, talkMin: 0, textsIn: 0, typed: 0, auto: 0 };
  }
  const hours = Array.from({ length: 24 }, () => 0);
  for (const e of ev) {
    const d = etParts(e.t);
    const day = days[`${d.year}-${d.month}-${d.day}`];
    if (e.k === "in_call") hours[+d.hour]++;
    if (!day) continue;
    if (e.k === "in_call") day[e.s]++;
    if (e.k === "out_call") day.callsOut++;
    if (e.d) day.talkMin += e.d / 60;
    if (e.k === "in_text") day.textsIn++;
    if (e.k === "human_text") day.typed++;
    if (e.k === "auto") day.auto++;
  }
  Object.values(days).forEach((x) => { x.talkMin = Math.round(x.talkMin); });
  const sum = (f) => ev.filter(f).length;
  const people = {
    ronald: {
      answered: sum((e) => e.k === "in_call" && e.s === "answered" && e.u === RONALD),
      callsOut: sum((e) => e.k === "out_call" && e.u === RONALD),
      talkMin: Math.round(ev.filter((e) => e.u === RONALD && e.d).reduce((a, e) => a + e.d, 0) / 60),
    },
    jay: {
      typed: sum((e) => e.k === "human_text" && e.u === JAY),
      threads: new Set(ev.filter((e) => e.k === "human_text" && e.u === JAY).map((e) => e.p)).size,
    },
    auto: { texts: sum((e) => e.k === "auto"), guestsCovered: autoOnly },
  };

  return {
    generatedAt: Date.now(), windowDays: DAYS,
    calls: {
      total: inCalls.length, answered: count(inCalls, "answered"), voicemail: count(inCalls, "voicemail"), missed: count(inCalls, "missed"),
      sinceOpen: { total: post.length, answered: count(post, "answered") },
      outbound: ev.filter((e) => e.k === "out_call").length,
      talkMinutes: Math.round(ev.filter((e) => e.d).reduce((s, e) => s + e.d, 0) / 60),
    },
    texts: {
      inbound: ev.filter((e) => e.k === "in_text").length,
      auto: ev.filter((e) => e.k === "auto").length,
      human: ev.filter((e) => e.k === "human_text").length,
    },
    guests: { total: guests, handled, autoOnly, open: open.length },
    medianCallbackHours: waits.length ? +waits[Math.floor(waits.length / 2)].toFixed(1) : null,
    days: Object.values(days), hours, open, people,
  };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (!(await verify(req))) return res.status(401).json({ error: "Sign in required" });
    if (!process.env.QUO_API_KEY) return res.status(500).json({ error: "QUO_API_KEY not set" });
    const fresh = req.query && req.query.refresh === "1";
    if (!cache || fresh || Date.now() - cache.at > 10 * 60e3) cache = { at: Date.now(), body: await build() };
    res.status(200).json(cache.body);
  } catch (e) {
    res.status(502).json({ error: String(e.message || e) });
  }
};
