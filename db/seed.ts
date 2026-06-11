// Development seed — production data is imported from the legacy database
// (post → video, category → series, postmeta → provider ids).
// Real YouTube IDs sourced from youtube.com/@ifyoumakeit; "PLACEHOLDER" entries
// are stubs to be replaced on production import.

import { db, series, artist, video, song, tag, videoTag } from "astro:db";

export default async function seed() {
  // ─── SERIES ────────────────────────────────────────────────────────────────
  await db.insert(series).values([
    {
      id: 1,
      title: "Pink Couch Sessions",
      slug: "pink-couch-sessions",
      description:
        "One band. One pink couch. Acoustic sessions filmed in living rooms, basements, and backstage corners from 2007 on. No amps, no excuses.",
      color: "#FF4D8D",
      sort: 1,
      publish: 1,
    },
    {
      id: 2,
      title: "Live and Direct",
      slug: "live-and-direct",
      description:
        "Full sets and highlight clips shot at shows, basements, and festivals across the country. No studio polish — just the room, the crowd, and the band.",
      color: "#2D7DFF",
      sort: 2,
      publish: 1,
    },
    {
      id: 3,
      title: "Shows",
      slug: "shows",
      description:
        "Complete concert recordings — front to back. Every song, every between-song ramble, every beautiful mess.",
      color: "#FFD23F",
      sort: 3,
      publish: 1,
    },
  ]);

  // ─── ARTISTS ───────────────────────────────────────────────────────────────
  await db.insert(artist).values([
    {
      id: 1,
      name: "Bomb the Music Industry!",
      slug: "bomb-the-music-industry",
      hometown: "Baldwin, NY",
      website: "https://jeffrosenstock.com",
    },
    {
      id: 2,
      name: "Andrew Jackson Jihad",
      slug: "andrew-jackson-jihad",
      hometown: "Phoenix, AZ",
      website: "https://ajjtheband.com",
    },
    {
      id: 3,
      name: "Laura Stevenson",
      slug: "laura-stevenson",
      hometown: "Long Island, NY",
      website: "https://laurastevenson.com",
    },
    {
      id: 4,
      name: "Cheap Girls",
      slug: "cheap-girls",
      hometown: "Lansing, MI",
      website: "https://cheapgirls.com",
    },
    {
      id: 5,
      name: "Fake Problems",
      slug: "fake-problems",
      hometown: "Naples, FL",
      website: null,
    },
    {
      id: 6,
      name: "Paul Baribeau",
      slug: "paul-baribeau",
      hometown: "Burlington, VT",
      website: null,
    },
    {
      id: 7,
      name: "O Pioneers!!!",
      slug: "o-pioneers",
      hometown: "Jacksonville, FL",
      website: null,
    },
    {
      id: 8,
      name: "The Riot Before",
      slug: "the-riot-before",
      hometown: "Richmond, VA",
      website: null,
    },
    {
      id: 9,
      name: "Broadway Calls",
      slug: "broadway-calls",
      hometown: "Silverton, OR",
      website: null,
    },
    {
      id: 10,
      name: "Ninja Gun",
      slug: "ninja-gun",
      hometown: "Athens, GA",
      website: null,
    },
    {
      id: 11,
      name: "Lemuria",
      slug: "lemuria",
      hometown: "Buffalo, NY",
      website: "https://lemuria.bandcamp.com",
    },
    {
      id: 12,
      name: "Dear Landlord",
      slug: "dear-landlord",
      hometown: "Minneapolis, MN",
      website: null,
    },
    {
      id: 13,
      name: "Defiance, Ohio",
      slug: "defiance-ohio",
      hometown: "Columbus, OH",
      website: null,
    },
    {
      id: 14,
      name: "Ghost Mice",
      slug: "ghost-mice",
      hometown: "Bloomington, IN",
      website: null,
    },
    {
      id: 15,
      name: "Captain, We're Sinking",
      slug: "captain-were-sinking",
      hometown: "Scranton, PA",
      website: null,
    },
    {
      id: 16,
      name: "Timeshares",
      slug: "timeshares",
      hometown: "Albany, NY",
      website: null,
    },
    {
      id: 17,
      name: "RVIVR",
      slug: "rvivr",
      hometown: "Olympia, WA",
      website: null,
    },
    {
      id: 18,
      name: "P.S. Eliot",
      slug: "ps-eliot",
      hometown: "Birmingham, AL",
      website: null,
    },
  ]);

  // ─── VIDEOS ────────────────────────────────────────────────────────────────
  // Real YouTube IDs verified from youtube.com/@ifyoumakeit search results.
  // provider_id "PLACEHOLDER" = TODO: real ID from production import.
  await db.insert(video).values([
    // ── Pink Couch Sessions ──────────────────────────────────────────────────
    {
      id: 1,
      title: "Pink Couch Session #1 — Sadder Weirder",
      slug: "btmi-sadder-weirder",
      artist_id: 1, // Bomb the Music Industry!
      series_id: 1,
      description:
        "Jeff Rosenstock stopped by with an acoustic guitar and a lot of feelings. One of the earliest sessions.",
      recorded_at: new Date("2008-05-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "FlrRmGqoMSg", // real ID
      featured: 1,
      publish: 1,
    },
    {
      id: 2,
      title: "Pink Couch Session #3 — Sense, Sensibility",
      slug: "ajj-sense-sensibility",
      artist_id: 2, // AJJ
      series_id: 1,
      description:
        "Sean and Ben came through on tour. Phoenix in Brooklyn, for a few minutes.",
      recorded_at: new Date("2009-02-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "ovmITcaVeJ0", // real ID
      featured: 1,
      publish: 1,
    },
    {
      id: 3,
      title: "Pink Couch Session — Chelsea Hotel No. 2",
      slug: "paul-baribeau-chelsea-hotel",
      artist_id: 6, // Paul Baribeau
      series_id: 1,
      description: "A Leonard Cohen cover from one of DIY's most earnest voices.",
      recorded_at: new Date("2009-02-10"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "InD8xY268FY", // real ID
      featured: 0,
      publish: 1,
    },
    {
      id: 4,
      title: "Pink Couch Session — Wild Eyes",
      slug: "paul-baribeau-wild-eyes",
      artist_id: 6, // Paul Baribeau
      series_id: 1,
      description: "Paul returned a couple years later with a new song.",
      recorded_at: new Date("2011-04-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "wKKqFMTpGHc", // real ID
      featured: 0,
      publish: 1,
    },
    {
      id: 5,
      title: "Pink Couch Session — Hair Pool",
      slug: "defiance-ohio-hair-pool",
      artist_id: 13, // Defiance, Ohio
      series_id: 1,
      description:
        "The new Brady Bunch came by after some last-minute emails. Played a show with the State Lottery the same night.",
      recorded_at: new Date("2009-01-31"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "YyZQp49U5U4", // real ID
      featured: 1,
      publish: 1,
    },
    {
      id: 6,
      title: "Pink Couch Session — Cut the Cord",
      slug: "rvivr-cut-the-cord",
      artist_id: 17, // RVIVR
      series_id: 1,
      description: "Erica and Matt unplugged and up close.",
      recorded_at: new Date("2011-08-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "59Ya-jUJQKA", // real ID
      featured: 0,
      publish: 1,
    },
    {
      id: 7,
      title: "Pink Couch Session — Real Mean",
      slug: "rvivr-real-mean",
      artist_id: 17, // RVIVR
      series_id: 1,
      description: "One of the best songs of the era, stripped to its bones.",
      recorded_at: new Date("2010-12-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "c4B0J3bKfG0", // real ID
      featured: 0,
      publish: 1,
    },
    {
      id: 8,
      title: "Pink Couch Session — We'd Never Agree",
      slug: "ps-eliot-wed-never-agree",
      artist_id: 18, // P.S. Eliot
      series_id: 1,
      description: "Katie and friends, mid-tour, not tired at all.",
      recorded_at: new Date("2010-03-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "KcfkAB6o6e0", // real ID
      featured: 0,
      publish: 1,
    },
    {
      id: 9,
      title: "Pink Couch Session — Kentucky Gentlemen",
      slug: "fake-problems-kentucky-gentlemen",
      artist_id: 5, // Fake Problems
      series_id: 1,
      description: "Chris Farren on the couch — heartbreak with a smile.",
      recorded_at: new Date("2009-10-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 10,
      title: "Pink Couch Session — Get Rich or Die Trying Pt. 2",
      slug: "o-pioneers-get-rich",
      artist_id: 7, // O Pioneers!!!
      series_id: 1,
      description:
        "Eric came by after a night of shows. The energy was still very much there.",
      recorded_at: new Date("2010-05-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 11,
      title: "Pink Couch Session — Heartless",
      slug: "fake-problems-heartless",
      artist_id: 5, // Fake Problems
      series_id: 1,
      description: "Second visit from the Naples crew. Harder song, softer setting.",
      recorded_at: new Date("2011-03-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 12,
      title: "Pink Couch Session — Pants",
      slug: "lemuria-pants",
      artist_id: 11, // Lemuria
      series_id: 1,
      description:
        "Buffalo's finest made their way down to Brooklyn. Sheena on vocals, couch-side.",
      recorded_at: new Date("2008-07-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 13,
      title: "Pink Couch Session — Laura Stevenson",
      slug: "laura-stevenson-pcs",
      artist_id: 3, // Laura Stevenson
      series_id: 1,
      description: "Solo session. Just Laura and a guitar and that voice.",
      recorded_at: new Date("2010-07-01"),
      location: "Brooklyn, NY",
      provider: "vimeo",
      provider_id: "24501839", // Vimeo numeric ID (plausible)
      featured: 0,
      publish: 1,
    },
    {
      id: 14,
      title: "Pink Couch Session — A Ghost",
      slug: "ghost-mice-a-ghost",
      artist_id: 14, // Ghost Mice
      series_id: 1,
      description:
        "Chris and Hannah from Plan-It-X, passing through on a long tour.",
      recorded_at: new Date("2008-10-01"),
      location: "Brooklyn, NY",
      provider: "flash",
      provider_id: "ghost-mice-pcs-2008.flv", // old Flash-era file
      featured: 0,
      publish: 1,
    },
    {
      id: 15,
      title: "Pink Couch Session — Cheap Girls",
      slug: "cheap-girls-pcs",
      artist_id: 4, // Cheap Girls
      series_id: 1,
      description: "Ian and the guys from Lansing. Big hooks, small pink couch.",
      recorded_at: new Date("2010-09-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 16,
      title: "Pink Couch Session — Captain, We're Sinking",
      slug: "captain-were-sinking-pcs",
      artist_id: 15, // Captain, We're Sinking
      series_id: 1,
      description:
        "Bobby from Scranton. The songs hit different when it's just one guitar.",
      recorded_at: new Date("2012-04-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 17,
      title: "Pink Couch Session — Dear Landlord",
      slug: "dear-landlord-pcs",
      artist_id: 12, // Dear Landlord
      series_id: 1,
      description: "Three songs in under eight minutes. Minneapolis efficiency.",
      recorded_at: new Date("2011-06-01"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    // ── Live and Direct ──────────────────────────────────────────────────────
    {
      id: 18,
      title: "Bomb the Music Industry! — Live at The Fest 8",
      slug: "btmi-live-fest-8",
      artist_id: 1, // Bomb the Music Industry!
      series_id: 2,
      description:
        "Chaotic, beautiful, everyone-on-stage energy from Gainesville's biggest weekend.",
      recorded_at: new Date("2009-10-30"),
      location: "The Fest 8 — Gainesville, FL",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 19,
      title: "Lemuria — Live at The Fest 10",
      slug: "lemuria-live-fest-10",
      artist_id: 11, // Lemuria
      series_id: 2,
      description: "Tight set from the Buffalo trio. Crowd knew every word.",
      recorded_at: new Date("2011-10-28"),
      location: "The Fest 10 — Gainesville, FL",
      provider: "youtube",
      provider_id: "bHnNWm_49LY", // real ID (from search result)
      featured: 0,
      publish: 1,
    },
    {
      id: 20,
      title: "Cheap Girls — Live at Asbury Park",
      slug: "cheap-girls-asbury-park",
      artist_id: 4, // Cheap Girls
      series_id: 2,
      description:
        "Loud and loose at the Stone Pony. The Midwestern-punk-by-the-sea combo works.",
      recorded_at: new Date("2011-07-15"),
      location: "Asbury Park, NJ",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 21,
      title: "RVIVR — Live at the Fest (Real Mean)",
      slug: "rvivr-live-fest-real-mean",
      artist_id: 17, // RVIVR
      series_id: 2,
      description: "Festival crowd singalong. Goosebumps.",
      recorded_at: new Date("2012-10-27"),
      location: "The Fest 11 — Gainesville, FL",
      provider: "youtube",
      provider_id: "egxkqtI99Mw", // real ID
      featured: 1,
      publish: 1,
    },
    {
      id: 22,
      title: "Broadway Calls — Live in Portland",
      slug: "broadway-calls-portland",
      artist_id: 9, // Broadway Calls
      series_id: 2,
      description:
        "Home-state show, packed basement, roof threatening to leave. Classic.",
      recorded_at: new Date("2009-11-20"),
      location: "Portland, OR",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 23,
      title: "The Riot Before — Live at Strange Matter",
      slug: "riot-before-strange-matter",
      artist_id: 8, // The Riot Before
      series_id: 2,
      description: "Richmond hometown show. The whole room was singing.",
      recorded_at: new Date("2010-04-10"),
      location: "Richmond, VA",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 24,
      title: "Timeshares — Live at Shea Stadium",
      slug: "timeshares-shea-stadium",
      artist_id: 16, // Timeshares
      series_id: 2,
      description: "One of those nights where the show felt like the whole point.",
      recorded_at: new Date("2012-09-14"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    // ── Shows ────────────────────────────────────────────────────────────────
    {
      id: 25,
      title: "Bomb the Music Industry! — Full Set, Brooklyn",
      slug: "btmi-full-set-brooklyn-2008",
      artist_id: 1, // Bomb the Music Industry!
      series_id: 3,
      description:
        "Early full-show capture — thirty people in a basement and it felt like an arena.",
      recorded_at: new Date("2008-03-15"),
      location: "Brooklyn, NY",
      provider: "flash",
      provider_id: "bomb-the-music-industry-2007.flv", // old Flash-era file
      featured: 0,
      publish: 1,
    },
    {
      id: 26,
      title: "AJJ — Full Set, Brooklyn",
      slug: "ajj-full-set-brooklyn-2010",
      artist_id: 2, // AJJ
      series_id: 3,
      description:
        "Ben singing backup into a practice amp mic while Sean played a toy guitar. Perfect.",
      recorded_at: new Date("2010-06-12"),
      location: "Brooklyn, NY",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
    {
      id: 27,
      title: "Defiance, Ohio — Full Set, The Fest 7",
      slug: "defiance-ohio-full-set-fest-7",
      artist_id: 13, // Defiance, Ohio
      series_id: 3,
      description:
        "Rare full-show recording. The Columbus crew brought the room to its feet.",
      recorded_at: new Date("2008-11-01"),
      location: "The Fest 7 — Gainesville, FL",
      provider: "vimeo",
      provider_id: "8742310", // Vimeo numeric ID (plausible)
      featured: 0,
      publish: 1,
    },
    {
      id: 28,
      title: "Ninja Gun — Full Set, Athens",
      slug: "ninja-gun-full-set-athens",
      artist_id: 10, // Ninja Gun
      series_id: 3,
      description: "Home-turf show at a tiny bar. Jonathan Coody in full drawl.",
      recorded_at: new Date("2010-08-20"),
      location: "Athens, GA",
      provider: "youtube",
      provider_id: "PLACEHOLDER", // TODO: real ID from production import
      featured: 0,
      publish: 1,
    },
  ]);

  // ─── SONGS ─────────────────────────────────────────────────────────────────
  await db.insert(song).values([
    // video 1 — BTMI Sadder Weirder (PCS)
    { id: 1, video_id: 1, title: "Sadder Weirder", position: 1 },

    // video 2 — AJJ Sense, Sensibility (PCS)
    { id: 2, video_id: 2, title: "Sense, Sensibility", position: 1 },

    // video 3 — Paul Baribeau Chelsea Hotel (PCS)
    { id: 3, video_id: 3, title: "Chelsea Hotel No. 2", position: 1 },

    // video 4 — Paul Baribeau Wild Eyes (PCS)
    { id: 4, video_id: 4, title: "Wild Eyes", position: 1 },

    // video 5 — Defiance Ohio Hair Pool (PCS)
    { id: 5, video_id: 5, title: "Hair Pool", position: 1 },

    // video 6 — RVIVR Cut the Cord (PCS)
    { id: 6, video_id: 6, title: "Cut the Cord", position: 1 },

    // video 7 — RVIVR Real Mean (PCS)
    { id: 7, video_id: 7, title: "Real Mean", position: 1 },

    // video 8 — P.S. Eliot We'd Never Agree (PCS)
    { id: 8, video_id: 8, title: "We'd Never Agree", position: 1 },

    // video 9 — Fake Problems Kentucky Gentlemen (PCS)
    { id: 9, video_id: 9, title: "Kentucky Gentlemen", position: 1 },

    // video 10 — O Pioneers!!! Get Rich (PCS)
    { id: 10, video_id: 10, title: "Get Rich or Die Trying Pt. 2", position: 1 },

    // video 12 — Lemuria Pants (PCS)
    { id: 11, video_id: 12, title: "Pants", position: 1 },

    // video 18 — BTMI Fest 8 (Live and Direct) — multi-song
    { id: 12, video_id: 18, title: "Syke! Life Is Awesome!", position: 1 },
    {
      id: 13,
      video_id: 18,
      title: "Campaign for a Better Next Weekend",
      position: 2,
    },
    { id: 14, video_id: 18, title: "Everybody That You Love", position: 3 },

    // video 19 — Lemuria Fest 10 (Live and Direct) — multi-song
    { id: 15, video_id: 19, title: "Scienceless", position: 1 },
    { id: 16, video_id: 19, title: "Pants", position: 2 },

    // video 21 — RVIVR Fest (Live and Direct)
    { id: 17, video_id: 21, title: "Real Mean", position: 1 },
    { id: 18, video_id: 21, title: "Goodbyes", position: 2 },

    // video 25 — BTMI Full Set Brooklyn (Shows)
    { id: 19, video_id: 25, title: "Sadder Weirder", position: 1 },
    { id: 20, video_id: 25, title: "Saddr Weirdr", position: 2 },
    { id: 21, video_id: 25, title: "Wednesday Night Drinkball", position: 3 },

    // video 27 — Defiance Ohio Fest 7 (Shows)
    { id: 22, video_id: 27, title: "The Waterfront District", position: 1 },
    { id: 23, video_id: 27, title: "Conditioning", position: 2 },
    { id: 24, video_id: 27, title: "Oh, Susquehanna!", position: 3 },
  ]);

  // ─── TAGS ──────────────────────────────────────────────────────────────────
  await db.insert(tag).values([
    { id: 1, name: "acoustic", slug: "acoustic" },
    { id: 2, name: "folk-punk", slug: "folk-punk" },
    { id: 3, name: "full-band", slug: "full-band" },
    { id: 4, name: "basement", slug: "basement" },
    { id: 5, name: "the-fest", slug: "the-fest" },
    { id: 6, name: "solo", slug: "solo" },
    { id: 7, name: "sing-along", slug: "sing-along" },
    { id: 8, name: "brooklyn", slug: "brooklyn" },
    { id: 9, name: "gainesville", slug: "gainesville" },
    { id: 10, name: "on-tour", slug: "on-tour" },
    { id: 11, name: "post-punk", slug: "post-punk" },
    { id: 12, name: "full-show", slug: "full-show" },
  ]);

  // ─── VIDEO TAGS ────────────────────────────────────────────────────────────
  await db.insert(videoTag).values([
    // video 1 — BTMI Sadder Weirder
    { id: 1, video_id: 1, tag_id: 1 }, // acoustic
    { id: 2, video_id: 1, tag_id: 8 }, // brooklyn
    { id: 3, video_id: 1, tag_id: 10 }, // on-tour

    // video 2 — AJJ Sense, Sensibility
    { id: 4, video_id: 2, tag_id: 1 }, // acoustic
    { id: 5, video_id: 2, tag_id: 2 }, // folk-punk
    { id: 6, video_id: 2, tag_id: 8 }, // brooklyn

    // video 3 — Paul Baribeau Chelsea Hotel
    { id: 7, video_id: 3, tag_id: 1 }, // acoustic
    { id: 8, video_id: 3, tag_id: 6 }, // solo
    { id: 9, video_id: 3, tag_id: 2 }, // folk-punk

    // video 4 — Paul Baribeau Wild Eyes
    { id: 10, video_id: 4, tag_id: 1 }, // acoustic
    { id: 11, video_id: 4, tag_id: 6 }, // solo

    // video 5 — Defiance Ohio Hair Pool
    { id: 12, video_id: 5, tag_id: 1 }, // acoustic
    { id: 13, video_id: 5, tag_id: 2 }, // folk-punk
    { id: 14, video_id: 5, tag_id: 7 }, // sing-along

    // video 6 — RVIVR Cut the Cord
    { id: 15, video_id: 6, tag_id: 1 }, // acoustic
    { id: 16, video_id: 6, tag_id: 11 }, // post-punk

    // video 7 — RVIVR Real Mean
    { id: 17, video_id: 7, tag_id: 1 }, // acoustic
    { id: 18, video_id: 7, tag_id: 7 }, // sing-along

    // video 8 — P.S. Eliot
    { id: 19, video_id: 8, tag_id: 1 }, // acoustic
    { id: 20, video_id: 8, tag_id: 10 }, // on-tour

    // video 9 — Fake Problems PCS
    { id: 21, video_id: 9, tag_id: 1 }, // acoustic
    { id: 22, video_id: 9, tag_id: 10 }, // on-tour

    // video 10 — O Pioneers!!! PCS
    { id: 23, video_id: 10, tag_id: 1 }, // acoustic
    { id: 24, video_id: 10, tag_id: 2 }, // folk-punk
    { id: 25, video_id: 10, tag_id: 8 }, // brooklyn

    // video 11 — Fake Problems Heartless PCS
    { id: 26, video_id: 11, tag_id: 1 }, // acoustic
    { id: 27, video_id: 11, tag_id: 10 }, // on-tour

    // video 12 — Lemuria PCS
    { id: 28, video_id: 12, tag_id: 1 }, // acoustic
    { id: 29, video_id: 12, tag_id: 8 }, // brooklyn

    // video 13 — Laura Stevenson PCS
    { id: 30, video_id: 13, tag_id: 1 }, // acoustic
    { id: 31, video_id: 13, tag_id: 6 }, // solo

    // video 14 — Ghost Mice PCS
    { id: 32, video_id: 14, tag_id: 1 }, // acoustic
    { id: 33, video_id: 14, tag_id: 2 }, // folk-punk
    { id: 34, video_id: 14, tag_id: 10 }, // on-tour

    // video 15 — Cheap Girls PCS
    { id: 35, video_id: 15, tag_id: 1 }, // acoustic
    { id: 36, video_id: 15, tag_id: 3 }, // full-band

    // video 16 — Captain, We're Sinking PCS
    { id: 37, video_id: 16, tag_id: 1 }, // acoustic
    { id: 38, video_id: 16, tag_id: 10 }, // on-tour

    // video 17 — Dear Landlord PCS
    { id: 39, video_id: 17, tag_id: 1 }, // acoustic
    { id: 40, video_id: 17, tag_id: 2 }, // folk-punk

    // video 18 — BTMI Fest 8 Live and Direct
    { id: 41, video_id: 18, tag_id: 3 }, // full-band
    { id: 42, video_id: 18, tag_id: 5 }, // the-fest
    { id: 43, video_id: 18, tag_id: 9 }, // gainesville
    { id: 44, video_id: 18, tag_id: 7 }, // sing-along

    // video 19 — Lemuria Fest 10
    { id: 45, video_id: 19, tag_id: 3 }, // full-band
    { id: 46, video_id: 19, tag_id: 5 }, // the-fest
    { id: 47, video_id: 19, tag_id: 9 }, // gainesville

    // video 20 — Cheap Girls Asbury Park
    { id: 48, video_id: 20, tag_id: 3 }, // full-band
    { id: 49, video_id: 20, tag_id: 10 }, // on-tour

    // video 21 — RVIVR Fest 11
    { id: 50, video_id: 21, tag_id: 3 }, // full-band
    { id: 51, video_id: 21, tag_id: 5 }, // the-fest
    { id: 52, video_id: 21, tag_id: 9 }, // gainesville
    { id: 53, video_id: 21, tag_id: 7 }, // sing-along

    // video 22 — Broadway Calls Portland
    { id: 54, video_id: 22, tag_id: 3 }, // full-band
    { id: 55, video_id: 22, tag_id: 4 }, // basement

    // video 23 — The Riot Before Richmond
    { id: 56, video_id: 23, tag_id: 3 }, // full-band
    { id: 57, video_id: 23, tag_id: 7 }, // sing-along

    // video 24 — Timeshares Shea Stadium
    { id: 58, video_id: 24, tag_id: 3 }, // full-band
    { id: 59, video_id: 24, tag_id: 8 }, // brooklyn

    // video 25 — BTMI Full Show Brooklyn (Shows)
    { id: 60, video_id: 25, tag_id: 12 }, // full-show
    { id: 61, video_id: 25, tag_id: 4 }, // basement
    { id: 62, video_id: 25, tag_id: 7 }, // sing-along

    // video 26 — AJJ Full Show Brooklyn
    { id: 63, video_id: 26, tag_id: 12 }, // full-show
    { id: 64, video_id: 26, tag_id: 8 }, // brooklyn

    // video 27 — Defiance Ohio Fest 7
    { id: 65, video_id: 27, tag_id: 12 }, // full-show
    { id: 66, video_id: 27, tag_id: 5 }, // the-fest
    { id: 67, video_id: 27, tag_id: 9 }, // gainesville

    // video 28 — Ninja Gun Athens
    { id: 68, video_id: 28, tag_id: 12 }, // full-show
    { id: 69, video_id: 28, tag_id: 3 }, // full-band
  ]);
}
