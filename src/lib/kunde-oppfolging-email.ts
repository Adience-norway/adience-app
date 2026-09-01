// Branded HTML for the trial-lifecycle follow-up sequence (see
// /api/cron/prove-paaminnelse): motivational mid-trial tips, and a 3-part
// win-back sequence for a trial that lapsed without converting to paid.
// Same visual template as send-welcome.ts / send-stream-info -- dark
// teal/coral card, not the newsletter emailShell() (which carries an
// unsubscribe footer that doesn't belong on an arena-owner email).

type Locale = "no" | "en";

function shell(locale: Locale, tagline: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="${locale}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background-color:#073E46;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#073E46;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
        <tr><td style="padding:0 0 32px 0;text-align:center;">
          <div style="font-size:28px;font-weight:900;letter-spacing:0.12em;color:#33D3C4;">ÅDIENCE</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.4);letter-spacing:0.08em;margin-top:4px;">${tagline}</div>
        </td></tr>
        <tr><td style="background-color:#1E293B;border-radius:16px;padding:48px 40px;border:1px solid rgba(51,211,196,0.15);">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:32px 0 0 0;text-align:center;">
          <p style="font-size:13px;color:rgba(255,255,255,0.3);margin:0 0 8px 0;">
            ${locale === "en" ? "Questions? Reply to this email or contact us at" : "Spørsmål? Svar på denne e-posten eller kontakt oss på"}
            <a href="mailto:post@adience.no" style="color:#33D3C4;text-decoration:none;"> post@adience.no</a>
          </p>
          <p style="font-size:12px;color:rgba(255,255,255,0.2);margin:0;">
            Ådience AS · +47 901 82 288 · adience.no
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function cta(url: string, label: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;">
    <tr><td align="center">
      <a href="${url}" style="display:inline-block;background-color:#FF6B4A;color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-size:15px;font-weight:700;letter-spacing:0.04em;">
        ${label}
      </a>
    </td></tr>
  </table>`;
}

function h1(text: string): string {
  return `<p style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 16px 0;line-height:1.3;">${text}</p>`;
}
function p(text: string): string {
  return `<p style="font-size:16px;color:rgba(255,255,255,0.65);margin:0 0 16px 0;line-height:1.6;">${text}</p>`;
}
function highlight(text: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background-color:rgba(51,211,196,0.06);border:1px solid rgba(51,211,196,0.2);border-radius:10px;margin:0 0 20px 0;">
    <tr><td style="padding:16px 20px;"><p style="font-size:14px;color:#9FE1CB;margin:0;line-height:1.6;">${text}</p></td></tr>
  </table>`;
}

const minSideUrl = (locale: Locale, hash: string) =>
  `https://app.adience.no${locale === "en" ? "/en" : ""}/min-side#${hash}`;

// ─── Mid-trial tips 1 (day ~4): get the speaker team set up ───

export function buildTips1Html(navn: string, locale: Locale): string {
  const url = minSideUrl(locale, "speakerteam");
  if (locale === "en") {
    return shell("en", "VENUE AUDIO STREAMING", `
      ${h1(`Has your speaker team gotten started, ${navn}?`)}
      ${p("You're a few days into your free trial — a good moment to get your speaker team properly onboarded.")}
      ${p("Under the <b>Speaker team</b> tab on My page, add each person by name and email. Everyone gets access to structured training modules — technique, audience engagement, rules and safety — with a small certificate once they're done.")}
      ${highlight("A trained, coordinated speaker team isn't just nice to have — it's what separates a good match-day experience from a great one, and it makes the venue safer for everyone there.")}
      ${cta(url, "Go to the speaker team →")}
    `);
  }
  return shell("no", "ARENA AUDIO STREAMING", `
    ${h1(`Har speakerteamet deres kommet i gang, ${navn}?`)}
    ${p("Dere er noen dager inn i den gratis prøveperioden — et godt tidspunkt for å få speakerteamet deres skikkelig i gang.")}
    ${p("Under fanen <b>Speakerteam</b> på Min side legger dere til hvert medlem med navn og e-post. Alle får tilgang til strukturerte kursmoduler — teknikk, publikumsengasjement, regelverk og sikkerhet — med et lite sertifikat når de er ferdige.")}
    ${highlight("Et trent, samkjørt speakerteam er ikke bare hyggelig å ha — det er det som gjør forskjellen mellom en god og en fantastisk kampopplevelse, og det gjør arenaen tryggere for alle som er der.")}
    ${cta(url, "Gå til Speakerteamet →")}
  `);
}

// ─── Mid-trial tips 2 (day ~8): make the venue's identity shine ───

export function buildTips2Html(navn: string, arenanavn: string, locale: Locale): string {
  const url = minSideUrl(locale, "arenainfo");
  if (locale === "en") {
    return shell("en", "VENUE AUDIO STREAMING", `
      ${h1(`Three ways to make ${arenanavn} stand out`)}
      ${p(`Hi ${navn} — you're halfway through the trial. Here are a few things venues often forget to use.`)}
      ${p("<b>1. Description and cover photo</b> — under Venue info, add a description and image that show what actually makes your venue special, not just \"a venue with Ådience.\"")}
      ${p("<b>2. Geofence</b> — fine-tune the perimeter so listeners connect exactly where they should, no wider and no narrower than the venue itself.")}
      ${p("<b>3. QR codes and poster</b> — hang the poster somewhere visible, and share the QR code with sponsors and partners too.")}
      ${highlight("It's the small details that make people remember your venue specifically — not just that it happened to have Ådience.")}
      ${cta(url, "Go to Venue info →")}
    `);
  }
  return shell("no", "ARENA AUDIO STREAMING", `
    ${h1(`Tre måter å gjøre ${arenanavn} unik`)}
    ${p(`Hei ${navn} — dere er halvveis i prøveperioden. Her er noen ting flere arenaer glemmer å bruke.`)}
    ${p("<b>1. Beskrivelse og cover-bilde</b> — under Arenainfo kan dere legge inn en beskrivelse og bilde som viser hva som faktisk gjør akkurat deres arena spesiell, ikke bare «en arena med Ådience».")}
    ${p("<b>2. Geofence</b> — juster perimeteren nøyaktig rundt arenaen, så publikum kobles til akkurat der de skal — ikke videre, ikke trangere enn selve stedet.")}
    ${p("<b>3. QR-koder og plakat</b> — heng opp plakaten et synlig sted, og del QR-koden med sponsorer og partnere også.")}
    ${highlight("Det er de små detaljene som gjør at folk husker akkurat deres arena — ikke bare at det tilfeldigvis var Ådience der.")}
    ${cta(url, "Gå til Arenainfo →")}
  `);
}

// ─── Win-back 1 (day+7 after an unconverted trial ended): speaker team + safety ───

export function buildVinnback1Html(navn: string, arenanavn: string, locale: Locale): string {
  const url = minSideUrl(locale, "speakerteam");
  if (locale === "en") {
    return shell("en", "VENUE AUDIO STREAMING", `
      ${h1(`We miss ${arenanavn}`)}
      ${p(`Hi ${navn} — your free trial has ended, but we wanted to check in.`)}
      ${p("The speaker team course modules are still there whenever you want to keep building competence — technique, audience engagement, rules and safety — even without an active subscription.")}
      ${highlight("A trained, coordinated speaker team makes any event safer and more professional — worth keeping up regardless of where things stand with us.")}
      ${cta(url, "See how the speaker team is doing →")}
    `);
  }
  return shell("no", "ARENA AUDIO STREAMING", `
    ${h1(`Vi savner ${arenanavn}`)}
    ${p(`Hei ${navn} — den gratis prøveperioden deres er over, men vi ville høre hvordan det går.`)}
    ${p("Speakerteam-kursene ligger fortsatt tilgjengelig når dere vil fortsette å bygge kompetanse — teknikk, publikumsengasjement, regelverk og sikkerhet — helt uavhengig av abonnement.")}
    ${highlight("Et trent, samkjørt speakerteam gjør ethvert arrangement tryggere og mer profesjonelt — verdt å holde ved like uansett hvor dere står med oss.")}
    ${cta(url, "Se hvordan speakerteamet ligger an →")}
  `);
}

// ─── Win-back 2 (day+37): venue uniqueness + match/event quality ───

export function buildVinnback2Html(navn: string, arenanavn: string, locale: Locale): string {
  const url = minSideUrl(locale, "oversikt");
  if (locale === "en") {
    return shell("en", "VENUE AUDIO STREAMING", `
      ${h1(`What makes ${arenanavn} special?`)}
      ${p(`Hi ${navn} — every venue has something that sets it apart: a rivalry, a tradition, a sound. That's exactly what a live audio experience is built to carry through to the people in the stands.`)}
      ${p("When you're ready to give your audience that experience again — with the full 1500-listener capacity, not the trial's 150 — Ådience is ready.")}
      ${cta(url, "See your plan options →")}
    `);
  }
  return shell("no", "ARENA AUDIO STREAMING", `
    ${h1(`Hva gjør akkurat ${arenanavn} spesiell?`)}
    ${p(`Hei ${navn} — hver arena har noe som skiller den ut: en rivalisering, en tradisjon, en lyd. Det er akkurat det en lydopplevelse i sanntid er laget for å bringe videre til publikum på tribunen.`)}
    ${p("Når dere er klare for å gi publikum den opplevelsen igjen — med full kapasitet på 1500 samtidige lyttere, ikke prøveperiodens 150 — er Ådience klar.")}
    ${cta(url, "Se abonnementsmulighetene →")}
  `);
}

// ─── Win-back 3 (day+67): arena development, final message in the sequence ───

export function buildVinnback3Html(navn: string, arenanavn: string, locale: Locale): string {
  const url = minSideUrl(locale, "oversikt");
  if (locale === "en") {
    return shell("en", "VENUE AUDIO STREAMING", `
      ${h1("Ådience is ready when you are")}
      ${p(`Hi ${navn} — a quick recap of what ${arenanavn}'s trial touched on, in case it's useful whenever the timing is right: developing the venue's audio experience over time, a stronger and safer speaker team, what makes your venue's identity unique, and the quality of the match/event experience itself.`)}
      ${p("This is the last automatic reminder we'll send — we don't want to fill up your inbox. If and when you're ready, everything is right where you left it.")}
      ${cta(url, "Open My page →")}
    `);
  }
  return shell("no", "ARENA AUDIO STREAMING", `
    ${h1("Ådience er klar når dere er")}
    ${p(`Hei ${navn} — en kort oppsummering av det prøveperioden til ${arenanavn} var innom, i tilfelle det er nyttig når tiden er riktig: å utvikle arenaens lydopplevelse over tid, et sterkere og tryggere speakerteam, det som gjør akkurat deres arenas identitet unik, og selve kvaliteten på kamp-/arrangementsopplevelsen.`)}
    ${p("Dette er siste automatiske påminnelse fra oss — vi vil ikke fylle innboksen deres. Når og hvis dere er klare, ligger alt akkurat der dere forlot det.")}
    ${cta(url, "Åpne Min side →")}
  `);
}
