const adjectives =
  `amber azure brave brisk calm candid clever crisp curly dapper
  deft drifting eager fading feisty fierce flowing fuzzy gentle glassy
  glowing humble jolly lucid mellow merry misty nimble noble playful
  quirky radiant rosy rustic scarlet shimmer silent silver smooth spicy
  stellar stormy sunny swift tangy tidy vivid warm wild witty`.split(/\s+/);

const nouns =
  `anchor atlas beacon blossom branch breeze canyon cascade cinder comet
  coral crest current drizzle ember feather field fjord forest garden
  glade glow harbor haven horizon lantern leaf lichen marble meadow
  mountain nebula orbit pebble petal prism ranger river shore signal
  spruce stream summit thunder tide trail valley violet willow wind`.split(
    /\s+/,
  );

/** Generate `<adjective>-<noun>` (or 3-word with extra adjective if `taken` collides). */
export function randomTitle(taken: ReadonlySet<string> = new Set()): string {
  for (let attempt = 0; attempt < 8; attempt++) {
    const title = `${pick(adjectives)}-${pick(nouns)}`;
    if (!taken.has(title)) return title;
  }
  return `${pick(adjectives)}-${pick(adjectives)}-${pick(nouns)}`;
}

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}
