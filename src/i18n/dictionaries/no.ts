const no: {
  home: {
    nav: Record<"features" | "download" | "demo" | "cast" | "blog" | "minSide", string>;
    hero: {
      badge: string; headlinePrefix: string; subtext: string; followLabel: string;
      ctaPilot: string; socialProofCount: string; socialProofText: string;
    };
    intro: { heading: string; body: string };
    stats: Record<"delay" | "uptime" | "encryption", { value: string; label: string }>;
    features: {
      eyebrow: string; title: string;
      card1: { title: string; description: string };
      card2: { title: string; description: string };
      card3: { title: string; description: string };
    };
    howItWorks: {
      eyebrow: string; title: string;
      steps: { step: string; title: string; desc: string }[];
    };
    download: { eyebrow: string; title: string; subtitle: string; requirement: string };
    footer: { tagline: string; copyright: string; links: { label: string; href: string }[] };
  };
  demo: {
    metaTitle: string; metaDescription: string;
    nav: { home: string; blog: string; ctaPilot: string };
    hero: { eyebrow: string; title: string; subtitle: string; aiIntro: string };
    steps: {
      step1Label: string; step1Title: string; step1Desc: string;
      step2Label: string; step2Title: string; step2Desc: string; qrAlt: string;
    };
    downloadPrompt: string; footer: string;
  };
  registrer: {
    common: Record<string, string>;
    typeSelector: {
      label: string; title: string; subtitle: string; aiIntro: string;
      arena: { title: string; description: string; chips: string[] };
      engangs: { title: string; description: string; chips: string[] };
      footerNote: string;
    };
    arenaForm: {
      label: string; title: string; subtitle: string; benefits: string[];
      duplicateError: string; submit: string; footerNote: string;
      success: { title: string; subtitlePrefix: string; subtitleSuffix: string };
    };
    engangsForm: {
      label: string; title: string; subtitlePrefix: string; subtitleSuffix: string;
      dateError: string; fieldStartdato: string; fieldSluttdato: string;
      estimatedCostLabel: string; dayUnit: string; dayUnitPlural: string;
      geofenceLabel: string; duplicateError: string; submitPrefix: string; footerNote: string;
      success: {
        title: string; subtitlePrefix: string; subtitleSuffix: string;
        periodLabel: string; invoiceLabel: string;
      };
    };
  };
  cards: {
    arenaProfil: {
      heading: string; subtitle: string;
      keywordsLabel: string; keywordsPlaceholder: string;
      descLabel: string; descPlaceholder: string;
      charCountPrefix: string; charCountSuffix: string;
      generating: string; suggestText: string; saving: string; saveText: string; saved: string;
      coverLabel: string; coverAlt: string; coverDefaultNote: string;
      coverUploading: string; coverChooseText: string;
      errorGeneric: string; errorSelectImage: string; errorTooBig: string;
      errorBadImage: string; errorUploadFailed: string; errorProcessImage: string; errorLoadImage: string;
      tavleToggleLabel: string; tavleToggleHint: string;
    };
    sponsorer: {
      heading: string; subtitle: string; libraryNote: string; visibleNow: string; hidden: string;
      errorType: string; errorSizePrefix: string; errorSizeSuffix: string;
      errorUploadFailed: string; errorSaveFailed: string; errorLoadImage: string; errorProcessImage: string;
      uploading: string; dropPrompt: string; cropHintPrefix: string; cropHintSuffix: string;
    };
    infoTavle: {
      heading: string; subtitle: string; libraryNote: string;
      typeStandard: string; typeDagens: string; dagensWarning: string; todayBadge: string;
      visibleNow: string; hidden: string;
      errorType: string; errorSizePrefix: string; errorSizeSuffix: string;
      errorUploadFailed: string; errorSaveFailed: string; errorLoadImage: string; errorProcessImage: string;
      uploading: string; dropPrompt: string; cropHintPrefix: string; cropHintSuffix: string;
    };
    standardInfoTavle: {
      loading: string; active: string; hidden: string;
      dropPromptPrefix: string; dropPromptSuffix: string;
      errorType: string; errorSizePrefix: string; errorSizeSuffix: string;
      errorUploadFailed: string; errorSaveFailed: string; errorLoadImage: string; errorProcessImage: string;
      uploading: string; cropHintPrefix: string; cropHintSuffix: string;
    };
    holdmusikk: {
      heading: string; subtitle: string;
      currentLabel: string; remove: string; removing: string;
      uploading: string; dropPrompt: string; formatHint: string;
      errorType: string; errorSizePrefix: string; errorSizeSuffix: string;
      errorUploadFailed: string; errorGeneric: string;
    };
  };
  minSide: {
    login: {
      pageLabel: string;
      emailLabel: string; passwordLabel: string; emailPlaceholder: string; passwordPlaceholder: string;
      loginButton: string; loggingIn: string;
      forgotPassword: string;
      resendConfirmation: string; confirmationResent: string;
      errorGeneric: string; errorEmailNotConfirmed: string;
      resetSentMessage: string; resetButton: string; sendingReset: string;
      backToLogin: string;
      newArenaPrefix: string; registerHere: string;
    };
    header: {
      blog: string; logout: string; backToAdmin: string;
      adminBannerPrefix: string; adminBannerSuffix: string;
    };
    tabs: Record<"oversikt" | "arenainfo" | "statistikk" | "geofence" | "speakerteam" | "kurs" | "sertifikater" | "media" | "abonnement", string>;
    noArena: { message: string; goToAdmin: string; logout: string };
    myPageLabel: string;
    oversikt: {
      statStreaming: string; statActive: string; statInactive: string;
      statUpcomingEvents: string; statCertified: string; statPilotDaysLeft: string; statSubscription: string;
      nextStepsTitle: string;
      stepGeofence: string; stepSpeakerteam: string; stepPilotExpiringPrefix: string; stepPilotExpiringSuffix: string; stepStatsComing: string;
      listenersTitle: string; listenersComing: string;
    };
    kontaktinfo: {
      title: string; subtitle: string;
      fieldArenanavn: string;
      fieldKategori: string; kategoriPlaceholder: string;
      fieldLand: string;
      fieldKapasitet: string; kapasitetPlaceholder: string;
      fieldOrgNummer: string;
      contactHeading: string;
      fieldFornavn: string; fieldEtternavn: string; fieldEpost: string; fieldTelefon: string;
      saveButton: string; saving: string; saved: string;
    };
    statistikk: {
      introTitle: string; introText: string;
      emptyState: string;
      thStart: string; thSlutt: string; thVarighet: string; pagaende: string;
      aiInsightTitle: string; aiInsightComing: string;
    };
    geofence: {
      title: string; subtitle: string; radiusLabel: string; saved: string; saveButton: string; saving: string;
      manualTitle: string; manualSubtitlePrefix: string; manualSubtitleSuffix: string; manualCta: string;
      findingLocation: string; clickHint: string; placeInMapHint: string; savePosition: string;
      polygonManagedByAdience: string;
      addressTitle: string; addressSubtitle: string;
      fieldGateadresse: string; gateadressePlaceholder: string;
      fieldPostnummer: string; postnummerPlaceholder: string;
      fieldBy: string; byPlaceholder: string;
      geoLoading: string; geoFound: string; geoNotFound: string; geoError: string;
      saveAddressButton: string; addressSaved: string;
    };
    speakerteam: {
      introTitle: string; introText: string;
      countSuffix: string; cancel: string; addSpeaker: string;
      fieldFornavn: string; fieldEtternavn: string; fieldEpost: string; fieldRolle: string; saving: string; addButton: string;
      emptyState: string; deleteButton: string; confirmDelete: string;
      thName: string; thEmail: string; thRolle: string; thProgress: string; thCertified: string; certifiedLabel: string;
    };
    kurs: {
      emptyState: string; selectSpeaker: string; certifiedPrefix: string; nextModuleButton: string;
      confirmCheckbox: string; sporsmalFeilPrefix: string;
    };
    sertifikater: {
      emptyState: string; certifiedPrefix: string; downloadCert: string;
      certTitlePrefix: string; certHeader: string; certCompletedFor: string; laertTittel: string;
    };
    media: {
      qrTitlePrefix: string; qrHelpText: string; noStreamId: string;
      castToolTitle: string; castToolHelp: string;
      streamIdLabel: string; copyLink: string; copied: string; openCastTool: string; castPassordLabel: string;
      qrCardAdience: { title: string; desc: string };
      qrCardWhite: { title: string; desc: string };
      qrCardTransparent: { title: string; desc: string };
      downloadPng: string; generating: string;
      materialTitle: string; materialSubtitle: string;
      pdfCard1: { title: string; desc: string };
      pdfCard2: { title: string; desc: string };
      pdfCardSpeakerteam: { title: string; desc: string };
      pdfCardSponsor: { title: string; desc: string };
      downloadPdf: string;
      posterCardTitle: string; posterCardDesc: string; printPoster: string;
      posterTitlePrefix: string; posterHeadlinePrefix: string; posterSubline: string; posterBody: string;
    };
    abonnement: {
      title: string; typeLabel: string; statusLabel: string; pilotDaysLabel: string; totalPriceLabel: string;
      upgradeButton: string;
      modalTitle: string; modalText: string; close: string;
    };
  };
  admin: {
    login: Record<string, string>;
    ingenTilgang: Record<string, string>;
    dashboard: Record<string, string>;
    standardCarousel: Record<string, string>;
    adminManager: Record<string, string>;
    arenaRow: Record<string, string>;
    detailPanel: Record<string, string>;
    addArenaModal: Record<string, string>;
    logoUploadField: Record<string, string>;
    kursproduksjon: Record<string, string>;
  };
  cast: {
    nav: { blog: string; backToHome: string };
    title: string; subtitle: string; subtitleVerified: string;
    sectionKilde: string; sectionLydniva: string;
    noMicFound: string; micFallback: string;
    errorFillStreamId: string; errorAntMedia: string; errorMicConnect: string;
    passordLabel: string; passordPlaceholder: string; laasOpp: string; verifiserer: string;
    passordOk: string; passordFeil: string; passordPaakrevd: string;
    connecting: string; stopSending: string; startSending: string;
    statusIdle: string; statusConnecting: string; statusLive: string; statusError: string;
    listenersNow: string; delayLabel: string;
    serverNote: string;
  };
} = {
  home: {
    nav: {
      features: "Funksjoner",
      download: "Last ned",
      demo: "Demo",
      cast: "Cast",
      blog: "Blogg",
      minSide: "Min side",
    },
    hero: {
      badge: "LIVE STREAMING · 0,5 SEK FORSINKELSE",
      headlinePrefix: "Raise the",
      subtext: "Den eksklusive lydkanalen for publikum som er fysisk til stede. Kommentarer, statistikk og eksklusivt innhold — direkte i øret.",
      followLabel: "Følg historiene bak Ådience",
      ctaPilot: "Har arena og vil starte gratis pilot? →",
      socialProofCount: "200+",
      socialProofText: "arenaer har allerede vist interesse",
    },
    intro: {
      heading: "Hva er Ådience?",
      body: "Ådience er en live-lydplattform for arenaer og arrangører innen idrett og kultur, utviklet av StoryPhone AS (org.nr. 823773692, Hamar). Publikum som er fysisk til stede på arenaen kan lytte til eksklusiv lyd — kommentarer og annet lydinnhold — i egne hodetelefoner, med under 0,5 sekunders forsinkelse via geofencing-teknologi. Tjenesten er global — enhver arena, hvor som helst i verden, kan registrere seg og ta i bruk Ådience, forutsatt nettverksdekning på stedet.",
    },
    stats: {
      delay: { value: "0,5 sek", label: "Forsinkelse" },
      uptime: { value: "99.99%", label: "Oppetid" },
      encryption: { value: "256-bit", label: "AES-kryptering" },
    },
    features: {
      eyebrow: "TEKNOLOGI",
      title: "Bygget for arenaen",
      card1: {
        title: "Eksklusiv tilgang",
        description: "Kun publikum inne på arenaen får tilgang via geofencing. Ingen kan lytte fra sofaen hjemme — innholdet forblir eksklusivt for de som er fysisk til stede.",
      },
      card2: {
        title: "Under 0,5 sekunders forsinkelse",
        description: "Proprietær lav-latens protokoll sikrer at lyden er synkronisert med det som skjer på banen. Du hører det i takt med det du ser — alltid.",
      },
      card3: {
        title: "Geofencing teknologi",
        description: "GPS og WiFi-basert geofencing definerer arenaens perimeter nøyaktig. Tilgang aktiveres automatisk når du er inne, og deaktiveres når du forlater.",
      },
    },
    howItWorks: {
      eyebrow: "HVORDAN DET FUNGERER",
      title: "Tre steg til arenaopplevelsen",
      steps: [
        { step: "01", title: "Last ned appen", desc: "Tilgjengelig på App Store og Google Play. Gratis å laste ned." },
        { step: "02", title: "Ankom arenaen", desc: "Appen registrerer automatisk at du er innenfor geofencen." },
        { step: "03", title: "Lytt eksklusivt", desc: "Koble til med egne hodetelefoner og nyt ekspertkommentarer." },
      ],
    },
    download: {
      eyebrow: "LAST NED",
      title: "Ta med Ådience til arenaen",
      subtitle: "Gratis å laste ned. Tilgjengelig på iOS og Android.",
      requirement: "Krever iOS 16+ eller Android 12+",
    },
    footer: {
      tagline: "Den eksklusive lydkanalen for publikum som er fysisk til stede i arenaen.",
      copyright: "© 2025 Ådience AS. Alle rettigheter forbeholdt.",
      links: [
        { label: "Personvern", href: "https://www.adience.no/personvern" },
        // MÅ FYLLES INN: ekte URL for vilkår og cookies — ingen slik side
        // finnes ennå på www.adience.no (sjekket mot Wix sitt eget
        // pages-sitemap.xml 2026-07-31), så disse peker fortsatt på "#".
        { label: "Vilkår", href: "#" },
        { label: "Cookies", href: "#" },
      ],
    },
  },
  demo: {
    metaTitle: "Prøv Ådience selv — live demo",
    metaDescription: "Skann QR-koden og hør den ekte Ådience-lydopplevelsen, uansett hvor du er.",
    nav: { home: "Hjem", blog: "Blogg", ctaPilot: "Start gratis pilot" },
    hero: {
      eyebrow: "LIVE DEMO",
      title: "Hør Ådience selv — uansett hvor du er",
      subtitle: "To steg, ett minutt. Ingen billett, ingen arena nødvendig — bare den ekte lydopplevelsen slik publikum hører den.",
      aiIntro: "Ådience er StoryPhone AS sin live-lydplattform for arenaer og arrangører. Denne demoen strømmer fra en demo-arena uten geofence-krav, slik at du kan høre den samme lydopplevelsen som publikum får på stedet — uten å være fysisk til stede.",
    },
    steps: {
      step1Label: "STEG 1",
      step1Title: "Last ned Ådience-appen",
      step1Desc: "Gratis, tar under et minutt. Har du den allerede? Gå rett til steg 2.",
      step2Label: "STEG 2",
      step2Title: "Skann QR-koden",
      step2Desc: "Den åpner rett på en demo-arena uten geofence-krav, så du hører den ekte lydopplevelsen med én gang — selv om du ikke er fysisk til stede på et arrangement.",
      qrAlt: "QR-kode for live demo",
    },
    downloadPrompt: "Har du ikke appen ennå?",
    footer: "Ådience AS",
  },
  registrer: {
    common: {
      backToTypeSelect: "← Bytt registreringstype",
      backToHome: "← Tilbake",
      backToFrontpage: "← Tilbake til forsiden",
      sectionAboutArena: "Om arenaen",
      sectionAboutEvent: "Om arrangementet",
      sectionContact: "Kontaktperson",
      sectionLogo: "Logo (valgfritt)",
      sectionPeriod: "Periode",
      sectionLocation: "Lokasjon",
      fieldArenanavn: "Arenanavn *",
      placeholderArenanavn: "f.eks. Ullevaal Stadion",
      fieldArrangementsnavn: "Arrangementsnavn *",
      placeholderArrangementsnavn: "f.eks. Øyafestivalen 2025",
      fieldKategori: "Kategori",
      placeholderKategori: "Velg kategori",
      fieldAdresse: "Adresse *",
      placeholderAdresse: "Gatenavn og nummer",
      geocoded: "✓ geocodet",
      fieldPostnummer: "Postnummer",
      placeholderPostnummer: "0001",
      fieldBy: "By",
      placeholderBy: "Oslo",
      fieldLand: "Land",
      fieldKapasitet: "Arenakapasitet",
      placeholderKapasitet: "Velg kapasitet",
      fieldOrgNummerRequired: "Organisasjonsnummer *",
      fieldOrgNummer: "Organisasjonsnummer",
      placeholderOrgNummer: "123 456 789",
      fieldFornavn: "Fornavn *",
      placeholderFornavn: "Ola",
      fieldEtternavn: "Etternavn *",
      placeholderEtternavn: "Nordmann",
      fieldEpostArena: "E-post *",
      placeholderEpostArena: "post@arena.no",
      placeholderEpostArrangement: "post@arrangement.no",
      fieldTelefon: "Telefon",
      placeholderTelefon: "+47 000 00 000",
      fieldPassord: "Passord * (for innlogging på Min side)",
      placeholderPassord: "Minst 6 tegn",
      fileChoose: "Velg fil (PNG eller JPG, maks 5MB)",
      fileErrorType: "Kun PNG og JPG er støttet.",
      fileErrorSize: "Maks filstørrelse er 5MB.",
      gdprText: "Jeg samtykker til at Ådience lagrer og behandler informasjonen over i henhold til",
      gdprLinkText: "personvernreglene",
      errorPrefix: "Feil: ",
      streamIdLabel: "DIN STREAM ID",
      qrLabel: "QR-KODE",
      qrHint: "Skann for å åpne streamen",
      qrResultAlt: "QR-kode som åpner Ådience-strømmen for din arena",
      registering: "Registrerer…",
    },
    typeSelector: {
      label: "REGISTRERING",
      title: "Hva skal du registrere?",
      subtitle: "Velg riktig type registrering — dette avgjør hvilken kontrakt og pris som gjelder.",
      aiIntro: "Ådience tilbys av StoryPhone AS (org.nr. 823773692, Hamar) til arenaeiere og arrangører innen idrett og kultur som ønsker å gi sitt publikum eksklusiv lyd på stedet.",
      arena: {
        title: "Fast arena — årsabonnement",
        description: "Du er ansvarlig for en permanent arena og vil tilby Ådience til arrangører som bruker stedet. Starter med 14 dagers gratis pilot.",
        chips: ["14 dager gratis", "Årsabonnement", "Alle arrangementer inkludert"],
      },
      engangs: {
        title: "Enkeltarrangement",
        description: "Du arrangerer et enkelt event på en lokasjon som ikke har Ådience fra før — f.eks. konsert, festival eller utendørsarrangement. Betaling per dag.",
        chips: ["kr/dag", "Kun for perioden", "Manuell faktura"],
      },
      footerNote: "Ådience følger bygget — arenaer med årsabonnement gir gratis tilgang til alle som bruker stedet.",
    },
    arenaForm: {
      label: "GRATIS PILOT",
      title: "Start din 14-dagers pilot",
      subtitle: "Ingen binding, ingen kredittkort. Kom i gang med Ådience på din arena i dag.",
      benefits: ["14 dager gratis", "Full tilgang", "Ingen oppsett"],
      duplicateError: "Dette organisasjonsnummeret eller e-postadressen er allerede registrert.",
      submit: "Start gratis 14-dagers pilot",
      footerNote: "Ingen kredittkort nødvendig. Piloten varer i 14 dager.",
      success: {
        title: "Piloten er i gang!",
        subtitlePrefix: "Du har 14 dager gratis tilgang til Ådience-plattformen. Vi tar kontakt på",
        subtitleSuffix: "innen kort tid.",
      },
    },
    engangsForm: {
      label: "ENKELTARRANGEMENT",
      title: "Registrer arrangement",
      subtitlePrefix: "For arrangementer på lokasjoner uten Ådience-abonnement. Faktureres",
      subtitleSuffix: "kr/dag etter arrangementet.",
      dateError: "Sluttdato kan ikke være før startdato.",
      fieldStartdato: "Startdato *",
      fieldSluttdato: "Sluttdato *",
      estimatedCostLabel: "ESTIMERT KOSTNAD",
      dayUnit: "dag",
      dayUnitPlural: "dager",
      geofenceLabel: "Geofence-radius:",
      duplicateError: "Dette organisasjonsnummeret er allerede registrert.",
      submitPrefix: "Registrer arrangement —",
      footerNote: "Faktura sendes etter arrangementet. Ingen betaling kreves nå.",
      success: {
        title: "Arrangementet er registrert!",
        subtitlePrefix: "Vi sender faktura til",
        subtitleSuffix: "etter arrangementet.",
        periodLabel: "PERIODE",
        invoiceLabel: "ESTIMERT FAKTURA",
      },
    },
  },
  cards: {
    arenaProfil: {
      heading: "Arena-profil",
      subtitle: "Teksten og bildet vises til publikum i appen når de finner arenaen din.",
      keywordsLabel: "Stikkord til AI-forslaget (valgfritt)",
      keywordsPlaceholder: "F.eks: familievennlig, gratis parkering, historisk bygg, kjøttboller i pausen…",
      descLabel: "Beskrivelse — slik den vises i appen",
      descPlaceholder: "Fortell publikum om arenaen, arrangementet eller hjemmelaget…",
      charCountPrefix: "Bredden her er den samme som på en mobil — så du ser hvordan teksten brytes.",
      charCountSuffix: "tegn.",
      generating: "Genererer…",
      suggestText: "✨ Foreslå tekst",
      saving: "Lagrer…",
      saveText: "Lagre tekst",
      saved: "Lagret ✓",
      coverLabel: "Forsidebilde (16:9)",
      coverAlt: "Forsidebilde",
      coverDefaultNote: "Standard Ådience-bilde vises til publikum til de laster opp eget bilde.",
      coverUploading: "Laster opp…",
      coverChooseText: "Velg bilde (JPG, PNG eller iPhone-bilde — beskjæres automatisk til 16:9)",
      errorGeneric: "Noe gikk galt.",
      errorSelectImage: "Velg en bildefil.",
      errorTooBig: "Bildet er for stort (maks 40 MB).",
      errorBadImage: "Kunne ikke bruke dette bildet. Prøv et annet, eller en JPG.",
      errorUploadFailed: "Opplasting feilet.",
      errorProcessImage: "Kunne ikke behandle bildet.",
      errorLoadImage: "Kunne ikke laste bildet.",
      tavleToggleLabel: "Vis sponsor- og infokarusell i appen",
      tavleToggleHint: "Sponsor- og infolysbilder vises nederst i ventefeltet mens publikum venter på sending. Skru av hvis dere ikke ønsker dette, selv om det finnes bilder.",
    },
    sponsorer: {
      heading: "Sponsorer",
      subtitle: "Vises til publikum i appen mens de venter på at sendingen skal starte.",
      libraryNote: "Ditt bibliotek — velg hvilke som skal vises i dagens sending.",
      visibleNow: "Vises nå",
      hidden: "Skjult",
      errorType: "Kun PNG, JPEG, SVG eller WebP er støttet.",
      errorSizePrefix: "Maks filstørrelse er",
      errorSizeSuffix: "MB.",
      errorUploadFailed: "Opplasting feilet.",
      errorSaveFailed: "Kunne ikke lagre tavlen.",
      errorLoadImage: "Kunne ikke laste bildet.",
      errorProcessImage: "Kunne ikke behandle bildet.",
      uploading: "Laster opp…",
      dropPrompt: "Dra og slipp et bilde her, eller klikk for å velge",
      cropHintPrefix: "Beskjæres automatisk til 16:9 · maks",
      cropHintSuffix: "MB",
    },
    infoTavle: {
      heading: "Info",
      subtitle: "Vises til publikum i appen mens de venter — samme 16:9-format kan også lastes rett inn i storskjermen på arenaen.",
      libraryNote: "Ditt bibliotek — velg hvilke som skal vises nå.",
      typeStandard: "Standard for arenaen",
      typeDagens: "Kun for dagens kamp/konsert",
      dagensWarning: "Vises kun i appen i dag — forsvinner automatisk fra publikums visning i morgen (ligger fortsatt i biblioteket ditt).",
      todayBadge: "I DAG ·",
      visibleNow: "Vises nå",
      hidden: "Skjult",
      errorType: "Kun PNG, JPEG, SVG eller WebP er støttet.",
      errorSizePrefix: "Maks filstørrelse er",
      errorSizeSuffix: "MB.",
      errorUploadFailed: "Opplasting feilet.",
      errorSaveFailed: "Kunne ikke lagre lysbildet.",
      errorLoadImage: "Kunne ikke laste bildet.",
      errorProcessImage: "Kunne ikke behandle bildet.",
      uploading: "Laster opp…",
      dropPrompt: "Dra og slipp et bilde her, eller klikk for å velge",
      cropHintPrefix: "Beskjæres automatisk til 16:9 · maks",
      cropHintSuffix: "MB",
    },
    standardInfoTavle: {
      loading: "Laster…",
      active: "Aktiv",
      hidden: "Skjult",
      dropPromptPrefix: "Dra og slipp standardbildet for",
      dropPromptSuffix: "her, eller klikk for å velge",
      errorType: "Kun PNG, JPEG, SVG eller WebP er støttet.",
      errorSizePrefix: "Maks filstørrelse er",
      errorSizeSuffix: "MB.",
      errorUploadFailed: "Opplasting feilet.",
      errorSaveFailed: "Kunne ikke lagre lysbildet.",
      errorLoadImage: "Kunne ikke laste bildet.",
      errorProcessImage: "Kunne ikke behandle bildet.",
      uploading: "Laster opp…",
      cropHintPrefix: "Beskjæres automatisk til 16:9 · maks",
      cropHintSuffix: "MB",
    },
    holdmusikk: {
      heading: "Pause-/ventemusikk",
      subtitle: "Spilles automatisk i loop for publikum frem til speakerteamet aktiverer mikrofonen på /cast.",
      currentLabel: "Pausemusikk",
      remove: "Fjern",
      removing: "Fjerner…",
      uploading: "Laster opp…",
      dropPrompt: "Dra og slipp en lydfil her, eller klikk for å velge",
      formatHint: "MP3 · WAV · M4A · AAC · maks",
      errorType: "Kun MP3, WAV, M4A eller AAC er støttet.",
      errorSizePrefix: "Maks filstørrelse er",
      errorSizeSuffix: "MB.",
      errorUploadFailed: "Opplasting feilet.",
      errorGeneric: "Kunne ikke laste opp filen.",
    },
  },
  minSide: {
    login: {
      pageLabel: "Min side",
      emailLabel: "E-post",
      passwordLabel: "Passord",
      emailPlaceholder: "post@arena.no",
      passwordPlaceholder: "••••••••••",
      loginButton: "Logg inn",
      loggingIn: "Logger inn…",
      forgotPassword: "Glemt passord?",
      resendConfirmation: "Send bekreftelseslenke på nytt",
      confirmationResent: "Ny bekreftelseslenke sendt — sjekk innboksen.",
      errorGeneric: "Feil e-post eller passord.",
      errorEmailNotConfirmed: "E-posten din er ikke bekreftet ennå. Sjekk innboksen (og søppelpost) for bekreftelseslenken.",
      resetSentMessage: "Sjekk e-posten din for en lenke til å tilbakestille passordet.",
      resetButton: "Send tilbakestillingslenke",
      sendingReset: "Sender…",
      backToLogin: "Tilbake til innlogging",
      newArenaPrefix: "Ny arena?",
      registerHere: "Registrer deg her",
    },
    header: {
      blog: "Blogg",
      logout: "Logg ut",
      backToAdmin: "← Tilbake til admin",
      adminBannerPrefix: "Du ser Min side for «",
      adminBannerSuffix: "» som Ådience-admin — endringer lagres direkte for denne arenaen.",
    },
    tabs: {
      oversikt: "Oversikt",
      arenainfo: "Arenainfo",
      statistikk: "Statistikk",
      geofence: "Geofence",
      speakerteam: "Speakerteam",
      kurs: "Kursmoduler",
      sertifikater: "Sertifikater",
      media: "Media",
      abonnement: "Abonnement",
    },
    noArena: {
      message: "Kontoen din er ikke knyttet til noen arena ennå. Ta kontakt med oss på post@adience.no.",
      goToAdmin: "Gå til Admin",
      logout: "Logg ut",
    },
    myPageLabel: "Min side",
    oversikt: {
      statStreaming: "Streaming",
      statActive: "Aktiv",
      statInactive: "Inaktiv",
      statUpcomingEvents: "Kommende arrangementer",
      statCertified: "Speakerteam sertifisert",
      statPilotDaysLeft: "Pilotdager igjen",
      statSubscription: "Abonnement",
      nextStepsTitle: "Neste steg",
      stepGeofence: "Tegn geofence-området for arenaen din under fanen «Geofence»",
      stepSpeakerteam: "Legg til ditt speakerteam under fanen «Speakerteam»",
      stepPilotExpiringPrefix: "Pilotperioden din utløper om",
      stepPilotExpiringSuffix: "dager — oppgrader under «Abonnement»",
      stepStatsComing: "Statistikk vises her så snart dere har hatt arrangementer",
      listenersTitle: "Lyttertall og engasjement",
      listenersComing: "Sanntids lyttertall og AI-basert toppengasjement-innsikt kommer her når streaming-integrasjonen er koblet på.",
    },
    kontaktinfo: {
      title: "Arenainformasjon",
      subtitle: "Samme opplysninger som ble registrert da dere meldte dere på — rett opp her om noe er feil eller endret seg.",
      fieldArenanavn: "Arenanavn",
      fieldKategori: "Kategori",
      kategoriPlaceholder: "Velg kategori",
      fieldLand: "Land",
      fieldKapasitet: "Kapasitet",
      kapasitetPlaceholder: "Velg kapasitet",
      fieldOrgNummer: "Organisasjonsnummer",
      contactHeading: "Kontaktperson",
      fieldFornavn: "Fornavn",
      fieldEtternavn: "Etternavn",
      fieldEpost: "E-post",
      fieldTelefon: "Telefon",
      saveButton: "Lagre",
      saving: "Lagrer…",
      saved: "Lagret ✓",
    },
    statistikk: {
      introTitle: "Sendingslogg",
      introText: "Ådience-koden til arenaen er fast og skal aldri byttes ut — den er som en gateadresse. Her føres automatisk logg over når sendingen på denne koden har vært åpen.",
      emptyState: "Ingen sendinger registrert ennå.",
      thStart: "Start",
      thSlutt: "Slutt",
      thVarighet: "Varighet",
      pagaende: "Pågår",
      aiInsightTitle: "AI-innsikt",
      aiInsightComing: "Automatisk tilbakemelding på kommunikasjonskvalitet, innholdsvariasjon og lydkvalitet kommer når Claude-integrasjonen er koblet på.",
    },
    geofence: {
      title: "Dekningsområde",
      subtitle: "Området der publikum kan strømme lyd — en sirkel rundt arenaen. Dra markøren for å flytte midtpunktet, og juster radiusen under.",
      radiusLabel: "Radius",
      saved: "Dekningsområde lagret ✓",
      saveButton: "Lagre dekningsområde",
      saving: "Lagrer…",
      manualTitle: "Plassering",
      manualSubtitlePrefix: "Vi klarte ikke å finne adressen «",
      manualSubtitleSuffix: "» automatisk på kartet. Sett plasseringen selv, så kan du tegne geofence-området etterpå.",
      manualCta: "Plasser på kart manuelt →",
      findingLocation: "Finner poststedet på kartet …",
      clickHint: "Zoom inn og klikk i kartet der arenaen ligger.",
      placeInMapHint: "Klikk i kartet for å plassere arenaen.",
      savePosition: "Lagre posisjon",
      polygonManagedByAdience: "Dette dekningsområdet er tegnet inn av Ådience som en del av årsabonnementet ditt. Ta kontakt med oss hvis noe skal justeres.",
      addressTitle: "Adresse",
      addressSubtitle: "Gateadressen vises til publikum i appen og brukes til å beregne avstand til arenaen.",
      fieldGateadresse: "Gateadresse",
      gateadressePlaceholder: "f.eks. Snarøyveien 30",
      fieldPostnummer: "Postnummer",
      postnummerPlaceholder: "0001",
      fieldBy: "By",
      byPlaceholder: "Oslo",
      geoLoading: "Søker etter adresse…",
      geoFound: "Adresse funnet",
      geoNotFound: "Ingen treff på adressen — du kan likevel lagre teksten som skrevet.",
      geoError: "Geokoding feilet.",
      saveAddressButton: "Lagre adresse",
      addressSaved: "Adresse lagret ✓",
    },
    speakerteam: {
      introTitle: "Speakerteam",
      introText: "Her legger dere til medlemmene i speakerteamet — hovedspeaker, informasjonsspeaker, lydmann og andre roller. Hver speaker går gjennom kursmodulene og et lite spørsmål per modul under, og kan laste ned et eget sertifikat når alt er fullført.",
      countSuffix: "medlemmer",
      cancel: "Avbryt",
      addSpeaker: "+ Legg til speaker",
      fieldFornavn: "Fornavn",
      fieldEtternavn: "Etternavn",
      fieldEpost: "E-post",
      fieldRolle: "Rolle (f.eks. Hovedspeaker, Lydmann, Utspeaker)",
      saving: "Lagrer…",
      addButton: "Legg til",
      emptyState: "Ingen speakere lagt til ennå — legg til det første teammedlemmet for å komme i gang.",
      deleteButton: "Slett",
      confirmDelete: "Fjerne denne speakeren fra teamet?",
      thName: "Navn",
      thEmail: "E-post",
      thRolle: "Rolle",
      thProgress: "Kursprogresjon",
      thCertified: "Sertifisert",
      certifiedLabel: "✓ Sertifisert",
    },
    kurs: {
      emptyState: "Legg til det første teammedlemmet over for å låse opp kursmodulene.",
      selectSpeaker: "Velg speaker",
      certifiedPrefix: "✓ Sertifisert",
      nextModuleButton: "Fullfør neste modul",
      confirmCheckbox: "Jeg har lest og forstått innholdet i denne modulen.",
      sporsmalFeilPrefix: "Ikke helt riktig. Tenk på dette:",
    },
    sertifikater: {
      emptyState: "Ingen sertifiserte speakere ennå — fullfør kursmodulene over for å låse opp sertifikatet.",
      certifiedPrefix: "Sertifisert",
      downloadCert: "Last ned sertifikat",
      certTitlePrefix: "Sertifikat —",
      certHeader: "ÅDIENCE SERTIFISERING",
      laertTittel: "Dette har du lært",
      certCompletedFor: "har fullført Ådience speakerkurs for",
    },
    media: {
      qrTitlePrefix: "QR-kode for",
      qrHelpText: "Denne QR-koden er unik for akkurat deres arena — den åpner Ådience-appen direkte på deres arrangement. Har ikke publikum appen ennå, blir de automatisk sendt videre til riktig nedlasting i App Store eller Google Play.",
      noStreamId: "Arenaen mangler en stream-ID ennå — ta kontakt med Ådience for å få satt den opp, så blir QR-koden tilgjengelig her.",
      castToolTitle: "For castingverktøyet",
      castToolHelp: "Dette er innloggingen speakerteamet deres bruker for å faktisk starte en sending — ikke det samme som QR-kodene under, som er for publikum.",
      streamIdLabel: "Stream-ID (til castingverktøyet)",
      copyLink: "Kopier",
      copied: "✓ Kopiert",
      openCastTool: "Åpne castingverktøyet →",
      castPassordLabel: "Passord for casting",
      qrCardAdience: { title: "QR-kode — Ådience-farger", desc: "I Ådience-profilens petrol og turkis. Den vakreste — perfekt på plakater og skilt." },
      qrCardWhite: { title: "QR-kode — hvit bakgrunn", desc: "Nøytral med hvit bakgrunn. Trygg på alt av print og i alle lysforhold." },
      qrCardTransparent: { title: "QR-kode — transparent", desc: "Uten bakgrunn. Bruk oppå eget design, plakater eller materiell i andre farger." },
      downloadPng: "Last ned PNG",
      generating: "Genererer…",
      materialTitle: "Informasjonsmateriell",
      materialSubtitle: "Ferdig utformede PDF-er til utskrift eller intern deling.",
      pdfCard1: { title: "Slik bruker du Ådience", desc: "Kort guide for ansatte — svar på publikums vanligste spørsmål." },
      pdfCard2: { title: "Inspirasjon for ansatte og sikkerhetspersonell", desc: "Hvorfor Ådience betyr noe, og hvordan de kan bidra." },
      pdfCardSpeakerteam: { title: "Til speakerteamet — klar for sending", desc: "Hvordan dere kobler til mikseren, starter en sending, og overvåker nivå og kvalitet for lytterne." },
      pdfCardSponsor: { title: "Til sponsorer og partnere", desc: "Bli med og bygg speakerteamet — kompetanse, kursing og utvikling av opplevelsen i arenaen." },
      posterCardTitle: "Plakat til publikum",
      posterCardDesc: "En ferdig utformet plakat med arenaens egen QR-kode, klar til å skrives ut og henges opp.",
      printPoster: "Skriv ut plakat",
      posterTitlePrefix: "Ådience-plakat —",
      posterHeadlinePrefix: "Vi har Ådience i",
      posterSubline: "Last ned appen, skann QR-koden, og lytt til vårt speakerteam.",
      posterBody: "Ikke bare før kampen — gjennom hele opplevelsen.",
      downloadPdf: "Last ned PDF",
    },
    abonnement: {
      title: "Din plan",
      typeLabel: "Type",
      statusLabel: "Status",
      pilotDaysLabel: "Pilotdager igjen",
      totalPriceLabel: "Totalpris",
      upgradeButton: "Oppgrader abonnement",
      modalTitle: "Oppgrader abonnement",
      modalText: "Betalingsløsning kommer snart. Ta kontakt med oss på post@adience.no eller +47 90182288 for å oppgradere manuelt i mellomtiden.",
      close: "Lukk",
    },
  },
  admin: {
    login: {
      panelLabel: "Admin-panel",
      emailLabel: "E-post",
      passwordLabel: "Passord",
      emailPlaceholder: "navn@adience.no",
      passwordPlaceholder: "••••••••••",
      loginButton: "Logg inn",
      loggingIn: "Logger inn…",
      forgotPassword: "Glemt passord?",
      resetSentMessage: "Sjekk e-posten din for en lenke til å tilbakestille passordet.",
      resetButton: "Send tilbakestillingslenke",
      sendingReset: "Sender…",
      backToLogin: "Tilbake til innlogging",
      errorEmailNotConfirmed: "E-posten din er ikke bekreftet ennå. Sjekk innboksen (og søppelpost) for bekreftelseslenken.",
      errorGeneric: "Feil e-post eller passord.",
    },
    ingenTilgang: {
      message: "Denne kontoen har ikke admin-tilgang til Ådience-panelet.",
      goToMinSide: "Gå til Min side",
      logout: "Logg ut",
    },
    dashboard: {
      adminLabel: "ADMIN",
      backToHome: "← Forsiden",
      logout: "Logg ut",
      title: "Oversikt",
      statTotal: "Totalt arenaer",
      statActivePilots: "Aktive piloter",
      statActiveStreaming: "Aktiv streaming",
      searchPlaceholder: "Søk på arena, kategori eller land…",
      searchButton: "Søk",
      standardCarouselLink: "Standard infokarusell ↓",
      adminManagerLink: "Administratorer ↓",
      kursproduksjonLink: "Kursproduksjon ↓",
      refreshButton: "↻ Oppdater",
      newArenaButton: "+ Ny arena",
      loadingData: "Laster data…",
      noArenasYet: "Ingen arenaer registrert ennå.",
      noSearchResults: "Ingen treff på søket.",
      thName: "Arenanavn",
      thCategory: "Kategori",
      thCountry: "Land",
      thStreamId: "Stream ID",
      thPilotStatus: "Pilot-status",
      thStreaming: "Streaming",
    },
    standardCarousel: {
      title: "Standard info",
      helpText: "Fallback-innhold per land — vises i appen for arenaer som ikke har lastet opp sitt eget ennå. Arenaen overstyrer denne i sin helhet ved å laste opp sitt eget på Min side.",
    },
    adminManager: {
      title: "Administratorer",
      helpText: "Søk fritt på navn, organisasjon eller e-post — du får opp alle som matcher, enten de allerede har konto eller bare er registrert i et speakerteam. Velg hvem som skal bli admin.",
      inviteButton: "+ Inviter ny administrator",
      inviteEmailPlaceholder: "navn@epost.no",
      inviteFirstNamePlaceholder: "Fornavn",
      inviteLastNamePlaceholder: "Etternavn",
      inviteMissingSession: "Fant ikke din egen innlogging. Prøv å laste siden på nytt.",
      inviteGenericError: "Noe gikk galt.",
      inviteSuccess: "Invitasjon sendt! Personen får en e-post for å sette passord, og er admin med det samme.",
      inviting: "Inviterer…",
      sendInvite: "Send invitasjon",
      cancel: "Avbryt",
      searchPlaceholder: "Navn, organisasjon eller e-post…",
      searching: "Søker…",
      searchButton: "Søk",
      noResults: "Ingen treff. Prøv et annet navn, organisasjon eller e-post — eller inviter personen direkte over.",
      thName: "Navn",
      thOrg: "Organisasjon",
      thEmail: "E-post",
      thStatus: "Status",
      thAction: "Handling",
      statusAdmin: "Admin",
      statusHasAccount: "Har konto",
      statusNoAccount: "Ingen konto ennå",
      removeAdmin: "Fjern admin",
      makeAdmin: "Gjør til admin",
      inviteAsAdmin: "Inviter som admin",
    },
    arenaRow: {
      engangsPrefix: "Engangs ·",
      daysLeftSuffix: "d igjen",
      engangsExpired: "Engangs · Utløpt",
      expired: "Utløpt",
      inactiveNoSubscription: "Inaktiv — ingen abonnement",
      activateTooltip: "Aktiver",
      deactivateTooltip: "Deaktiver",
    },
    detailPanel: {
      noStreamId: "Ingen stream ID",
      castPassordLabel: "Cast-passord:",
      openMinSide: "Min side →",
      openMinSideTitle: "Åpne Min side for denne arenaen",
      edit: "Rediger",
      editTitle: "Rediger arena",
      deleteTitle: "Slett arena",
      mapGeofenceLabel: "Kart & geofence",
      savePositionShort: "Lagre ny posisjon",
      saving: "Lagrer…",
      undo: "Angre",
      positionSaved: "✓ Ny posisjon lagret",
      radiusLabel: "Radius",
      overlapWarningPrefix: "⚠ Geofencen overlapper med",
      overlapWarningSuffix: "Vurder å redusere radius.",
      radiusErrorPrefix: "Kunne ikke lagre:",
      radiusSaved: "✓ Geofence lagret",
      saveGeofence: "Lagre geofence",
      geofenceModeSirkel: "Sirkel",
      geofenceModePolygon: "Polygon",
      polygonMinPointsError: "Klikk minst 3 punkter i kartet for å lage en polygon.",
      findingLocation: "Finner poststedet på kartet …",
      addressNotFoundPrefix: "Adressen «",
      addressNotFoundSuffix: "» ble ikke funnet automatisk. Zoom inn og klikk i kartet der arenaen ligger.",
      savePositionBtn: "Lagre posisjon",
      cancel: "Avbryt",
      clickToPlace: "Klikk i kartet for å plassere arenaen.",
      noCoordinates: "Ingen koordinater registrert — adressen ble ikke funnet automatisk.",
      placeManually: "Plasser på kart manuelt →",
      logoLabel: "Logo",
      saveLogo: "Lagre logo",
      uploadingLogo: "Laster opp…",
      changeLogo: "Bytt logo",
      removeLogo: "Fjern logo",
      uploadLogo: "+ Last opp logo",
      subscriptionLabel: "Abonnement",
      typeLabel: "Type",
      typeSingleEvent: "Enkeltarrangement",
      typeStart: "Start",
      typeEnd: "Slutt",
      pricePerDay: "Pris/dag",
      totalInvoiced: "Totalt (faktureres)",
      typePilot: "Pilot",
      statusLabel: "Status",
      daysLeftSuffix: "dager igjen",
      expiredLabel: "Utløpt",
      endLabel: "Slutt",
      inactiveStatus: "Inaktiv — ingen abonnement",
      streamingActiveLabel: "Streaming aktiv",
      overrideLabel: "Ådience-overstyring",
      overrideHelp: "Gi denne arenaen (allerede lagt inn i basen) en test-/pilotperiode uten at de trenger å registrere seg på nytt via nettsiden.",
      missingIdsHelp: "Arenaen mangler stream-ID og sender-kode — kreves for at noen skal kunne teststreame.",
      generateIds: "Generer stream-ID og sender-kode",
      generatingIds: "Genererer…",
      pilotFrom: "Pilot fra",
      pilotTo: "Pilot til",
      extendPilot: "Forleng/overstyr pilotperiode",
      openPilot: "Åpne pilotperiode",
      pilotSaved: "✓ Pilotperiode lagret",
      activateReminder: "Husk å skru på «Streaming aktiv» over når arenaen skal bli spillbar i appen.",
      qrLabel: "QR-kode",
      qrHelp: "Genererer en fersk QR-kode som åpner appen direkte på denne arenaen — med fallback til App Store/Google Play hvis appen ikke er installert. Bruk denne til å erstatte gamle, utdaterte QR-koder (f.eks. fra registreringstidspunktet).",
      showGenerateQr: "Vis / generer QR-kode",
      generatingQr: "Genererer…",
      downloadImage: "↓ Last ned bilde",
      detailsLabel: "Arenadetaljer",
      category: "Kategori",
      address: "Adresse",
      country: "Land",
      capacity: "Kapasitet",
      orgNumber: "Org.nr",
      coordinates: "Koordinater",
      geofence: "Geofence",
      registered: "Registrert",
      radiusSuffix: "m radius",
      arenaProfileLabel: "Arena-profil (tekst & forsidebilde)",
      contactLabel: "Kontakt",
      nameLabel: "Navn",
      emailLabel: "E-post",
      phoneLabel: "Telefon",
      deleteConfirmPrefix: "Er du sikker på at du vil slette",
      deleteConfirmSuffix: "?",
      deleteActivePilotWarning: "⚠ Denne arenaen har en aktiv pilotperiode. Tilknyttede data kan gå tapt.",
      deleteIrreversible: "Dette kan ikke angres.",
      deleteLogoNote: "Logo-filen slettes også fra lagringen.",
      deleteConfirm: "Ja, slett arena",
      deleting: "Sletter…",
    },
    addArenaModal: {
      editTitlePrefix: "Rediger —",
      addTitle: "Legg til arena manuelt",
      noPilotWarningStrong: "Ingen pilot opprettes.",
      noPilotWarningRestPrefix: "Arenaen registreres som inaktiv. Pilot startes kun via",
      fieldArenanavn: "Arenanavn *",
      arenanavnPlaceholder: "f.eks. Telenor Arena",
      fieldKategori: "Kategori",
      placeholderKategori: "Velg kategori",
      fieldLand: "Land",
      fieldOrgNummer: "Organisasjonsnummer",
      orgNummerPlaceholder: "123 456 789",
      fieldKapasitet: "Kapasitet",
      placeholderKapasitet: "Velg kapasitet",
      sectionContact: "Kontaktperson",
      fieldFornavn: "Fornavn",
      fornavnPlaceholder: "Kari",
      fieldEtternavn: "Etternavn",
      etternavnPlaceholder: "Nordmann",
      fieldTelefon: "Telefon",
      telefonPlaceholder: "+47 123 45 678",
      fieldEpost: "E-post",
      epostPlaceholder: "kari@arena.no",
      epostWarn: "E-postadressen ser ikke riktig ut.",
      sectionAddress: "Adresse & koordinater",
      fieldGateadresse: "Gateadresse",
      gateadressePlaceholder: "f.eks. Snarøyveien 30",
      gateWarn: "Gateadresse ser ut til å mangle gatenavn.",
      fieldPostnummer: "Postnummer",
      postnummerPlaceholder: "0001",
      postnrWarn: "Postnummer skal være 4 siffer.",
      fieldBy: "By",
      byPlaceholder: "Oslo",
      geoLoading: "Søker etter adresse…",
      geoFound: "Adresse funnet",
      geoNotFound: "Ingen treff på adressen.",
      geoError: "Geokoding feilet.",
      geoRequiresCoords: "Geofencing fungerer ikke uten koordinater.",
      manualCoordsToggle: "Legg inn koordinater manuelt",
      overrideCoordsToggle: "Overstyr koordinater manuelt",
      fieldLat: "Breddegrad (lat)",
      fieldLng: "Lengdegrad (lng)",
      noCoordWarn: "Geofencing krever koordinater. Fyll inn manuelt eller sjekk adressen.",
      mapUnnamedArena: "Ny arena",
      mapPlacePinHint: "Ingen adresse funnet ennå. Klikk et sted i kartet for å plassere en nål — nærmeste adresse fylles inn automatisk.",
      fieldGeofenceRadius: "Geofence-radius",
      overlapWarningPrefix: "⚠ Geofencen overlapper med",
      overlapWarningSuffix: "Vurder å redusere radius.",
      sectionLogo: "Logo",
      existingLogoKept: "Eksisterende logo beholdes hvis ingen ny fil velges.",
      cancel: "Avbryt",
      saving: "Lagrer…",
      saveChanges: "Lagre endringer",
      addArena: "Legg til arena",
      duplicateOrgError: "Org.nummer er allerede registrert.",
      logoUploadFailedButSaved: "Logo-opplasting feilet, men arenaen ble lagret.",
      logoUploadFailedGeneric: "Logo-opplasting feilet.",
    },
    logoUploadField: {
      clickToUpload: "Klikk for å laste opp logo",
      formatHint: "PNG · JPEG · SVG · WebP · maks 2 MB",
      changeLogo: "Bytt logo",
      removeSelected: "Fjern valgt fil",
      errorType: "Kun PNG, JPEG, SVG og WebP er tillatt.",
      errorSize: "Filen er for stor. Maks 2 MB.",
    },
    kursproduksjon: {
      title: "Kursproduksjon",
      helpText: "Bygg innholdet i speakerkurset — tekst, bilder, lyd og video, per modul og språk. Dette vises for arena-eiere når de går gjennom kursmodulene på Min side.",
      moduleLabel: "MODUL",
      languageLabel: "SPRÅK",
      emptyState: "Ingen innholdsblokker i denne modulen ennå.",
      addTekst: "+ Tekst",
      addBilde: "+ Bilde",
      addLyd: "+ Lyd",
      addVideo: "+ Video",
      tekstPlaceholder: "Skriv innholdet …",
      urlPlaceholder: "Lim inn lenke (f.eks. YouTube) …",
      urlOrUpload: "…eller lim inn en lenke i stedet:",
      uploadLabel: "Velg fil",
      uploading: "Laster opp…",
      save: "Lagre",
      cancel: "Avbryt",
      moveUp: "↑",
      moveDown: "↓",
      delete: "Slett",
      confirmDelete: "Slette denne innholdsblokken?",
      errorUpload: "Opplasting feilet.",
      errorGeneric: "Noe gikk galt. Prøv igjen.",
      aiOr: "…eller generer et illustrasjonsbilde med AI:",
      aiPromptPlaceholder: "Beskriv motivet, f.eks. «en speaker og lydtekniker samarbeider foran en mikser i en arena»",
      aiGenerateButton: "Generer bilde",
      aiGenerating: "Genererer …",
      sporsmalTitle: "Multiple choice-spørsmål",
      sporsmalHelpText: "Spørsmål lytteren må svare riktig på for å gå videre til neste modul. Feil svar gir veiledning, riktig svar gir forklaring.",
      sporsmalPlaceholder: "Skriv spørsmålet …",
      sporsmalAlternativPlaceholder: "Alternativ",
      sporsmalLeggTilAlternativ: "+ Alternativ",
      sporsmalForklaringPlaceholder: "Forklaring av riktig svar (vises som veiledning ved feil svar, og bekreftelse ved riktig svar)",
      sporsmalAddButton: "+ Nytt spørsmål",
      modulerTitle: "Moduler",
      modulerHelpText: "Dra for å omorganisere, endre navn direkte i feltene, eller legg til en helt ny modul.",
      modulerAddButton: "+ Ny modul",
      modulerDelete: "Slett modul",
      modulerDeleteConfirm: "Slette denne modulen? Alt innhold og illustrasjon i den forsvinner også.",
      modulerFieldNavnNo: "Navn (norsk)",
      modulerFieldNavnEn: "Navn (engelsk)",
      coversTitle: "Modulillustrasjoner",
      coversHelpText: "Ett illustrasjonsbilde per modul, vises øverst i modulen for alle språk.",
      coversGenerateAll: "🪄 Generer for alle moduler",
      coverNone: "Ingen illustrasjon ennå",
      coverForModule: "Illustrasjon for",
      coverRegenerate: "Regenerer automatisk",
      coverUpload: "Last opp eget bilde",
      coverFromPrompt: "Generer",
    },
  },
  cast: {
    nav: { blog: "Blogg", backToHome: "← Forsiden" },
    title: "Ådience Cast",
    subtitle: "Browser-sender for live arenastreaming",
    subtitleVerified: "Ådience Casting",
    sectionKilde: "KILDE",
    sectionLydniva: "LYDNIVÅ",
    noMicFound: "Ingen mikrofoner funnet",
    micFallback: "Mikrofon",
    errorFillStreamId: "Fyll inn Stream ID før du starter.",
    passordLabel: "PASSORD",
    passordPlaceholder: "6-sifret passord",
    laasOpp: "Lås opp",
    verifiserer: "Sjekker …",
    passordOk: "Låst opp for denne arenaen",
    passordFeil: "Feil passord for denne stream-ID-en.",
    passordPaakrevd: "Du må låse opp med riktig passord før du kan starte sending.",
    errorAntMedia: "Ant Media-feil:",
    errorMicConnect: "Klarte ikke koble til mikrofon.",
    connecting: "Kobler til…",
    stopSending: "■  Stopp sending",
    startSending: "▶  Start sending",
    statusIdle: "Inaktiv",
    statusConnecting: "Kobler til…",
    statusLive: "● LIVE",
    statusError: "Feil",
    listenersNow: "Lyttere nå",
    delayLabel: "Forsinkelse",
    serverNote: "Kobler til Ådience sin egen Ant Media Server",
  },
};

export default no;
export type Dictionary = typeof no;
