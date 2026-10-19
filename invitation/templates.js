/*
  Wording for the Assamese wedding invitation writer (invitation/index.html).

  Change what the generator writes by editing this file. The page fills in the
  details. Each template is a function that receives `c`, the prepared details
  for one language:

    c.side          "bride" | "groom" | "couple": who is sending the card
    c.grace         e.g. "ঈশ্বৰৰ অশেষ কৃপাত" (empty for the general style)
    c.graceLead     c.grace followed by a space, or ""
    c.lead(rest)    English only: "With the blessings of the Almighty, rest" or "Rest"
    c.wedding       "শুভ বিবাহ" / "wedding" (or "শুভ নিকাহ" / "Nikah")
    c.weddingCasual "বিয়া" / "wedding"
    c.blessing      "আশীৰ্বাদ" / "blessings"
    c.blessVerb     "আশীৰ্বাদ দিবলৈ" / "bless"
    c.rel           how the hosts are related to their child, e.g. "কন্যা" / "daughter"
    c.child         the hosts' own bride or groom, with honorific
    c.childName     the same, without honorific
    c.partner       the other side, fully introduced, e.g.
                    "যোৰহাট নিবাসী শ্ৰী ... আৰু শ্ৰীমতী ...ৰ পুত্ৰ শ্ৰীমান ৰাহুল"
    c.partnerName   the other side's name only
    c.bride, c.groom  names with honorific
    c.when          "২৫ নৱেম্বৰ, ২০২৬ তাৰিখে, বুধবাৰে সন্ধিয়া ৭ বজাত" /
                    "Wednesday, 25 November 2026 at 7:00 PM"
    c.venue         the venue line
    c.hostsShort    hosts' names on one line
    c.kids, c.kidsRel, c.kidsMany   for the children's line

  Several entries in a list are alternative wordings. The "Another wording"
  button moves through them.
*/
window.INVITE = {
  invocations: {
    prajapati: { label: "শ্ৰীশ্ৰী প্ৰজাপতয়ে নমঃ", as: "শ্ৰীশ্ৰী প্ৰজাপতয়ে নমঃ", en: "Shri Shri Prajapataye Namah" },
    ganesh:    { label: "ॐ শ্ৰীগণেশায় নমঃ", as: "ॐ শ্ৰীগণেশায় নমঃ", en: "Om Shri Ganeshaya Namah" },
    guru:      { label: "শ্ৰীশ্ৰী গুৰুৱে শৰণ", as: "শ্ৰীশ্ৰী গুৰুৱে শৰণ", en: "Shri Shri Guruwe Sharan" },
    bismillah: { label: "বিছমিল্লাহিৰ ৰাহমানিৰ ৰাহিম", as: "বিছমিল্লাহিৰ ৰাহমানিৰ ৰাহিম", en: "Bismillahir Rahmanir Rahim" },
    none:      { label: "None / নাই", as: "", en: "" }
  },

  communities: {
    hindu: {
      label: "Hindu",
      invocation: "prajapati",
      title:   { as: "শুভ বিবাহ", en: "Wedding Invitation" },
      grace:   { as: "ঈশ্বৰৰ অশেষ কৃপাত", en: "With the blessings of the Almighty" },
      wedding: { as: "শুভ বিবাহ", en: "wedding" },
      weddingCasual: { as: "বিয়া", en: "wedding" },
      blessing:  { as: "আশীৰ্বাদ", en: "blessings" },
      blessVerb: { as: "আশীৰ্বাদ দিবলৈ", en: "bless" },
      greeting:  { as: "নমস্কাৰ", en: "Namaskar" },
      honorific: {
        as: { m: "শ্ৰী", f: "শ্ৰীমতী", groom: "শ্ৰীমান", bride: "শ্ৰীমতী" },
        en: { m: "Mr.", f: "Mrs.", groom: "", bride: "" }
      },
      late: { as: { m: "স্বৰ্গীয়", f: "স্বৰ্গীয়া" }, en: { m: "Late", f: "Late" } }
    },
    vaishnav: {
      label: "Vaishnav (Ek Xoron)",
      invocation: "guru",
      title:   { as: "শুভ বিবাহ", en: "Wedding Invitation" },
      grace:   { as: "শ্ৰীশ্ৰী গুৰুজনাৰ অশেষ কৃপাত", en: "By the grace of Shri Shri Guru" },
      wedding: { as: "শুভ বিবাহ", en: "wedding" },
      weddingCasual: { as: "বিয়া", en: "wedding" },
      blessing:  { as: "আশীৰ্বাদ", en: "blessings" },
      blessVerb: { as: "আশীৰ্বাদ দিবলৈ", en: "bless" },
      greeting:  { as: "নমস্কাৰ", en: "Namaskar" },
      honorific: {
        as: { m: "শ্ৰী", f: "শ্ৰীমতী", groom: "শ্ৰীমান", bride: "শ্ৰীমতী" },
        en: { m: "Mr.", f: "Mrs.", groom: "", bride: "" }
      },
      late: { as: { m: "স্বৰ্গীয়", f: "স্বৰ্গীয়া" }, en: { m: "Late", f: "Late" } }
    },
    muslim: {
      label: "Muslim",
      invocation: "bismillah",
      title:   { as: "শুভ নিকাহ", en: "Nikah Invitation" },
      grace:   { as: "মহান আল্লাহৰ অশেষ ৰহমতত", en: "By the grace of Almighty Allah" },
      wedding: { as: "শুভ নিকাহ", en: "Nikah" },
      weddingCasual: { as: "নিকাহ", en: "Nikah" },
      blessing:  { as: "দোৱা", en: "duas" },
      blessVerb: { as: "দোৱা কৰিবলৈ", en: "pray for" },
      greeting:  { as: "আচ্ছালামু আলাইকুম", en: "Assalamu Alaikum" },
      honorific: {
        as: { m: "", f: "", groom: "", bride: "" },
        en: { m: "Mr.", f: "Mrs.", groom: "", bride: "" }
      },
      late: { as: { m: "মৰহুম", f: "মৰহুমা" }, en: { m: "Late", f: "Late" } }
    },
    general: {
      label: "General (no religious line)",
      invocation: "none",
      title:   { as: "বিয়াৰ নিমন্ত্ৰণ", en: "Wedding Invitation" },
      grace:   { as: "", en: "" },
      wedding: { as: "শুভ বিবাহ", en: "wedding" },
      weddingCasual: { as: "বিয়া", en: "wedding" },
      blessing:  { as: "আশীৰ্বাদ", en: "blessings" },
      blessVerb: { as: "আশীৰ্বাদ দিবলৈ", en: "bless" },
      greeting:  { as: "নমস্কাৰ", en: "Hello" },
      honorific: {
        as: { m: "শ্ৰী", f: "শ্ৰীমতী", groom: "", bride: "" },
        en: { m: "Mr.", f: "Mrs.", groom: "", bride: "" }
      },
      late: { as: { m: "স্বৰ্গীয়", f: "স্বৰ্গীয়া" }, en: { m: "Late", f: "Late" } }
    }
  },

  // How the hosts are related to their bride or groom.
  relations: {
    child:      { label: "Son / daughter",            m: { as: "পুত্ৰ", en: "son" },      f: { as: "কন্যা", en: "daughter" } },
    grandchild: { label: "Grandson / granddaughter",  m: { as: "নাতি", en: "grandson" },  f: { as: "নাতিনী", en: "granddaughter" } },
    sibling:    { label: "Brother / sister",          m: { as: "ভাতৃ", en: "brother" },   f: { as: "ভগ্নী", en: "sister" } },
    nephew:     { label: "Nephew / niece",            m: { as: "ভতিজা", en: "nephew" },   f: { as: "ভতিজী", en: "niece" } }
  },

  // Ceremonies offered as quick-add buttons. `for` limits them to who is sending the card,
  // `only` limits them to a community.
  events: [
    { as: "জোৰণ", en: "Juroon" },
    { as: "পানী তোলা", en: "Pani Tola" },
    { as: "নোওনি", en: "Nuoni (ceremonial bath)" },
    { as: "মেহেন্দী", en: "Mehendi" },
    { as: "দৰা যাত্ৰা", en: "Groom's procession", for: ["groom"] },
    { as: "দৰা আদৰণি", en: "Welcoming the groom", for: ["bride"] },
    { as: "কইনা আদৰণি", en: "Welcoming the bride", for: ["groom"] },
    { as: "প্ৰীতিভোজ", en: "Wedding feast" },
    { as: "আদৰণি সভা", en: "Reception" },
    { as: "ৱালিমা", en: "Walima", only: ["muslim"] },
    { as: "আঠমঙলা", en: "Aathmangala" }
  ],

  // Shown in the text wherever a detail is still missing.
  placeholders: {
    as: { bride: "কইনাৰ নাম", groom: "দৰাৰ নাম", date: "তাৰিখ", time: "সময়", venue: "বিবাহস্থলী", hosts: "নিমন্ত্ৰকৰ নাম" },
    en: { bride: "Bride's name", groom: "Groom's name", date: "Date", time: "Time", venue: "Venue", hosts: "Host names" }
  },

  as: {
    salutation: {
      traditional: c => c.guestLine ? "শ্ৰদ্ধাৰ ......................................................," : "শ্ৰদ্ধাৰ মহোদয়/মহোদয়া,",
      modern:      c => c.guestLine ? "মৰমৰ ......................................................," : "মৰমৰ আপোনজন,"
    },
    body: {
      traditional: [
        c => `${c.graceLead}আগামী ${c.when} আমাৰ ${c.rel} ${c.child}ৰ সৈতে ${c.partner}ৰ ${c.wedding} অনুষ্ঠিত হ'ব। এই শুভ অনুষ্ঠানত আপুনি সপৰিয়ালে উপস্থিত থাকি নৱদম্পতীক ${c.blessVerb} সাদৰ নিমন্ত্ৰণ জনালোঁ।`,
        c => `অতি আনন্দৰে জনাইছোঁ যে, ${c.graceLead}আমাৰ ${c.rel} ${c.child}ৰ ${c.wedding} ${c.partner}ৰ সৈতে আগামী ${c.when} অনুষ্ঠিত হ'ব। উক্ত শুভ অনুষ্ঠানলৈ আপোনাক সপৰিয়ালে সাদৰে নিমন্ত্ৰণ জনালোঁ। আপোনাৰ উপস্থিতি আৰু ${c.blessing} নৱদম্পতীৰ নতুন জীৱনৰ পাথেয় হ'ব।`
      ],
      modern: [
        c => `জীৱনৰ এক নতুন অধ্যায়ৰ আৰম্ভণি! ${c.graceLead}আমাৰ ${c.rel} ${c.child} আৰু ${c.partner} বিবাহ-বান্ধোনত আৱদ্ধ হ'বলৈ ওলাইছে। ${c.when} এই আনন্দৰ মুহূৰ্তটো আপোনালোকৰ সৈতে ভাগ কৰি ল'ব বিচাৰোঁ। আপোনালোকৰ উপস্থিতিয়েহে আমাৰ আনন্দ সম্পূৰ্ণ কৰিব।`,
        c => `দুটা হৃদয়, এটা নতুন যাত্ৰা। ${c.when} আমাৰ ${c.rel} ${c.child}ৰ সৈতে ${c.partner}ৰ ${c.weddingCasual}। এই আনন্দৰ দিনটোত আপোনালোকে সপৰিয়ালে আহি নৱদম্পতীক ${c.blessVerb} আন্তৰিক অনুৰোধ জনালোঁ।`
      ]
    },
    bodyCouple: {
      traditional: [
        c => `${c.grace ? c.grace + " আৰু " : ""}উভয় পৰিয়ালৰ আশীৰ্বাদেৰে আগামী ${c.when} আমি, ${c.bride} আৰু ${c.groom}, ${c.wedding}ৰ পবিত্ৰ বান্ধোনত আৱদ্ধ হ'বলৈ ওলাইছোঁ। এই শুভ অনুষ্ঠানত আপুনি সপৰিয়ালে উপস্থিত থাকি আমাক ${c.blessVerb} সাদৰ নিমন্ত্ৰণ জনালোঁ।`
      ],
      modern: [
        c => `আমি, ${c.bride} আৰু ${c.groom}, জীৱনৰ এক নতুন যাত্ৰা আৰম্ভ কৰিবলৈ ওলাইছোঁ! ${c.when} আমাৰ ${c.weddingCasual}ত আপোনালোক সপৰিয়ালে আহি আমাৰ আনন্দত ভাগ ল'লে আমি অতিশয় সুখী হ'ম।`
      ]
    },
    closing: {
      traditional: ["আপোনাৰ শুভাগমনৰ প্ৰতীক্ষাত ৰ'লোঁ।", "আপোনাৰ উপস্থিতিয়ে আমাৰ আনন্দ দুগুণ কৰিব।"],
      modern: ["আপোনালোকক লগত পোৱাৰ আশাৰে।", "আহিব কিন্তু, বাট চাই থাকিম!"]
    },
    signoff: { traditional: "বিনীত", modern: "মৰম আৰু শুভেচ্ছাৰে" },
    programHeading: "কাৰ্যসূচী",
    venueLabel: "স্থান",
    mapLabel: "মানচিত্ৰ",
    contactLabel: "যোগাযোগ",
    addressLabel: "ঠিকনা",
    noGifts: "আপোনালোকৰ উপস্থিতিয়েই আমাৰ বাবে শ্ৰেষ্ঠ উপহাৰ। সবিনয় অনুৰোধ, কোনো উপহাৰ নানিব।",
    kids: c => `${c.kidsMany ? "আমাৰ" : "মোৰ"} ${c.kidsRel}ৰ ${c.weddingCasual}লৈ আপোনালোক অৱশ্যেই আহিব দেই! — ${c.kids}`,
    whatsapp: [
      c => [
        `${c.greeting} 🙏`,
        c.side === "couple"
          ? `${c.graceLead}আগামী ${c.when} আমি, ${c.brideName} আৰু ${c.groomName}, ${c.wedding}ৰ বান্ধোনত আৱদ্ধ হ'বলৈ ওলাইছোঁ। আপোনালোক সপৰিয়ালে আহি আমাক ${c.blessVerb} সাদৰ নিমন্ত্ৰণ জনালোঁ।`
          : `${c.graceLead}আগামী ${c.when} আমাৰ ${c.rel} ${c.childName}ৰ সৈতে ${c.partnerName}ৰ ${c.wedding} অনুষ্ঠিত হ'ব। আপোনালোক সপৰিয়ালে আহি নৱদম্পতীক ${c.blessVerb} সাদৰ নিমন্ত্ৰণ জনালোঁ।`,
        c.venue && `📍 ${c.venue}`,
        c.map,
        c.contact && `📞 ${c.contact}`,
        `— ${c.hostsShort}`
      ]
    ]
  },

  en: {
    salutation: {
      traditional: c => c.guestLine ? "Dear ......................................................," : "Dear Sir / Madam,",
      modern:      c => c.guestLine ? "Dear ......................................................," : "Dear friends and family,"
    },
    body: {
      traditional: [
        c => `${c.lead("we")} request the honour of your presence, along with your family, at the ${c.wedding} of our ${c.rel} ${c.child} with ${c.partner}, on ${c.when}. We seek your gracious presence and ${c.blessing} for the couple.`,
        c => `${c.lead("it gives us great joy to invite")} you and your family to the ${c.wedding} of our ${c.rel} ${c.child} with ${c.partner}. The ceremony will take place on ${c.when}. Your presence and ${c.blessing} will mean a great deal to the couple.`
      ],
      modern: [
        c => `A new chapter begins! ${c.lead("our")} ${c.rel} ${c.child} is getting married to ${c.partner}, and we would love you to be there. Join us on ${c.when} to celebrate.`,
        c => `Two hearts, one journey. We are delighted to share that our ${c.rel} ${c.child} and ${c.partner} are getting married on ${c.when}. It would make our day complete to have you and your family with us.`
      ]
    },
    bodyCouple: {
      traditional: [
        c => `${c.lead("we")}, ${c.bride} and ${c.groom}, together with our families, request the honour of your presence at our ${c.wedding} on ${c.when}. We seek your ${c.blessing} as we begin our life together.`
      ],
      modern: [
        c => `We, ${c.bride} and ${c.groom}, are getting married, and we would love you to celebrate with us on ${c.when}. Bring your family and your best smiles!`
      ]
    },
    closing: {
      traditional: ["We look forward to your gracious presence.", "Your presence will add joy to the occasion."],
      modern: ["We can't wait to celebrate with you!", "Do come, we'll be waiting for you!"]
    },
    signoff: { traditional: "With warm regards", modern: "With love" },
    programHeading: "Programme",
    venueLabel: "Venue",
    mapLabel: "Map",
    contactLabel: "RSVP",
    addressLabel: "Address",
    noGifts: "Your presence is the only gift we wish for. Kindly no gifts.",
    kids: c => `Do come to ${c.kidsMany ? "our" : "my"} ${c.kidsRel}'s ${c.weddingCasual}! — ${c.kids}`,
    whatsapp: [
      c => [
        `${c.greeting} 🙏`,
        c.side === "couple"
          ? `${c.lead("we")}, ${c.brideName} and ${c.groomName}, are getting married on ${c.when}. We warmly invite you and your family to join us and ${c.blessVerb} us.`
          : `${c.lead("we")} warmly invite you and your family to the ${c.wedding} of our ${c.rel} ${c.childName} with ${c.partnerName} on ${c.when}. Please join us and ${c.blessVerb} the couple.`,
        c.venue && `📍 ${c.venue}`,
        c.map,
        c.contact && `📞 ${c.contact}`,
        `— ${c.hostsShort}`
      ]
    ]
  }
};
