// Editorial timeline notes, keyed by video slug. The note renders pinned
// above its video on /years — use it to mark a milestone or introduce the
// recording that follows it. Curator commentary, not archive data, so it
// lives here rather than in the DB. Slugs are globally unique; a key with
// no matching video simply renders nothing.
export const videoNotes: Record<string, string> = {
  "laura-stevenson-and-the-cans-amphibian": "First Pink Couch Session filmed.",
  "hop-along-bruno-is-orange": "Stay True Paltz! Festival",
  "lemuria-the-origamists": "Berea Fest",
  "get-to-the-point-phone-number": "First video by Jeff",
  "31-movies-happy-hour": "First 31 Movies submission"
};
