import type { ActionLog, ActionType, AppState, Edge, Modality, Person, Ring } from '../types'
import { uid } from '../types'

// Demo constellation: ~28 people, 4 rings + outer field, clustered edges (spec §12 Phase 1).
// Everything here is fake, but shaped like real life: contexts overlap, some threads
// cross clusters, and a handful of profiles carry the full texture of §3.1.

const DAY = 24 * 60 * 60 * 1000
const now = Date.now()

function daysAgo(n: number): number {
  return now - n * DAY
}

interface PersonSeed {
  id: string
  name: string
  contexts: string[]
  ring: Ring
  howMet: string
  location?: string
  occupation?: string
  details?: Partial<Person['details']>
}

const emptyDetails = (): Person['details'] => ({
  rituals: [],
  loves: [],
  toDiscuss: [],
  inJokes: [],
  admires: [],
  dates: [],
  dreams: [],
  theirPeople: [],
  giftIdeas: [],
  repairNotes: [],
})

function makePerson(seed: PersonSeed, ageDays: number): Person {
  return {
    id: seed.id,
    name: seed.name,
    contexts: seed.contexts,
    ring: seed.ring,
    howMet: seed.howMet,
    location: seed.location,
    occupation: seed.occupation,
    details: { ...emptyDetails(), ...seed.details },
    ringHistory: [{ ring: seed.ring, at: daysAgo(ageDays) }],
    createdAt: daysAgo(ageDays),
  }
}

const peopleSeeds: PersonSeed[] = [
  // ——— Ring 1: ride or die ———
  {
    id: 'amara',
    name: 'Amara',
    contexts: ['University'],
    ring: 1,
    howMet: 'Shared a terrible flat in second year of university',
    location: 'Same city',
    occupation: 'Editor, slowly writing her own novel',
    details: {
      rituals: ['Sunday evening call', 'First-snow walk every winter'],
      loves: ['Jasmine tea', 'Wong Kar-wai films', 'Second-hand bookshops'],
      toDiscuss: ['Her chapter she promised to send'],
      inJokes: ['“The radiator incident”', 'Calling any bad flat “the palace”'],
      admires: ['She asks the second question — never lets you get away with “fine”'],
      dates: [
        { id: uid(), label: 'Birthday', date: '03-14' },
        { id: uid(), label: "Anniversary of her mum's death", date: '08-03', hard: true },
      ],
      dreams: ['Finishing the novel draft by autumn'],
      theirPeople: ['Partner: Tomas', 'Sister: Kemi'],
      giftIdeas: ['First edition of anything by Jean Rhys'],
    },
  },
  {
    id: 'ben',
    name: 'Ben',
    contexts: ['Childhood'],
    ring: 1,
    howMet: 'Grew up three doors down; friends since age seven',
    location: 'Two hours away',
    occupation: 'Carpenter',
    details: {
      rituals: ['Annual camping trip, first weekend of June'],
      loves: ['Vinyl (northern soul)', 'Terrible action films', 'His dog, Biscuit'],
      toDiscuss: ['The workshop extension — did planning permission come through?'],
      inJokes: ['“It’s load-bearing”', 'The tent pole story'],
      admires: ['Completely unhurried. Being around him lowers your pulse.'],
      dates: [
        { id: uid(), label: 'Birthday', date: '11-02' },
        { id: uid(), label: 'Anniversary of his dad’s death', date: '01-19', hard: true },
      ],
      dreams: ['Wants to take on an apprentice'],
      theirPeople: ['Wife: Ana', 'Daughter: Mia (6)'],
      giftIdeas: ['Original pressing of “The Snake” by Al Wilson'],
    },
  },
  {
    id: 'priya',
    name: 'Priya',
    contexts: ['Work'],
    ring: 1,
    howMet: 'Sat next to each other at the old job; survived the layoffs together',
    location: 'Same city',
    occupation: 'Product designer',
    details: {
      rituals: ['Pho on the first Friday of the month'],
      loves: ['Ceramics', 'Cold-water swimming', 'Very hot food'],
      toDiscuss: [],
      inJokes: ['“Per my last email”'],
      admires: ['Says the true thing kindly, even when it costs her'],
      dates: [{ id: uid(), label: 'Birthday', date: '06-21' }],
      dreams: ['Deciding whether to go freelance next year'],
      theirPeople: ['Partner: Dev'],
      giftIdeas: ['A wheel-throwing weekend course'],
    },
  },
  {
    id: 'joao',
    name: 'João',
    contexts: ['University'],
    ring: 1,
    howMet: 'Amara’s coursemate; adopted into the flat by osmosis',
    location: 'Lisbon (moved back)',
    occupation: 'Marine biologist',
    details: {
      rituals: ['Voice notes instead of texts — always'],
      loves: ['Tide pools', 'Fado', 'Cooking for twelve when six are coming'],
      toDiscuss: ['His grant application result'],
      admires: ['Gets genuinely excited about your news, every time'],
      dates: [{ id: uid(), label: 'Birthday', date: '09-30' }],
      dreams: ['The research station posting in the Azores'],
      theirPeople: ['Husband: Rui'],
    },
  },

  // ——— Ring 2: close, and deepening ———
  {
    id: 'marco',
    name: 'Marco',
    contexts: ['Neighbourhood'],
    ring: 2,
    howMet: 'Neighbour; bonded over a burst pipe that flooded both flats',
    location: 'Same street',
    occupation: 'Chef',
    details: {
      loves: ['Natural wine', 'Cycling at dawn', 'Arguing about tomatoes'],
      toDiscuss: ['The flat situation — he was stressed about it'],
      dates: [{ id: uid(), label: 'Birthday', date: '04-08' }],
      dreams: ['Opening his own small place next year'],
      theirPeople: ['Sister visiting in March'],
    },
  },
  {
    id: 'sofia',
    name: 'Sofia',
    contexts: ['Supper Club'],
    ring: 2,
    howMet: 'Sat opposite each other at the first supper club night',
    occupation: 'Architect',
    details: {
      loves: ['Brutalism', 'Karaoke (secretly)', 'Long ambitious walks'],
      toDiscuss: ['Her verdict on the gallery show'],
      admires: ['Notices what rooms do to people'],
      dates: [{ id: uid(), label: 'Birthday', date: '12-05' }],
      dreams: ['Interviewing for the partnership this month'],
    },
  },
  {
    id: 'tunde',
    name: 'Tunde',
    contexts: ['Climbing Gym'],
    ring: 2,
    howMet: 'Belayed each other when both partners flaked, became the routine',
    occupation: 'Physiotherapist',
    details: {
      rituals: ['Tuesday evening climb, then the dumpling place'],
      loves: ['Route-setting', 'Analogue photography'],
      admires: ['Patient teacher — never makes you feel slow'],
      dates: [{ id: uid(), label: 'Birthday', date: '07-25' }],
      dreams: ['Training for his first outdoor lead season'],
    },
  },
  {
    id: 'grace',
    name: 'Grace',
    contexts: ['Work'],
    ring: 2,
    howMet: 'Current job; the only other person who laughs in planning meetings',
    occupation: 'Data scientist',
    details: {
      loves: ['Birdwatching', 'Crosswords', 'Very small dogs'],
      toDiscuss: ['Her mum’s health — check in gently'],
      dates: [{ id: uid(), label: 'Birthday', date: '02-17' }],
      dreams: ['Thinking about a sabbatical'],
      theirPeople: ['Mum (unwell lately)'],
    },
  },
  {
    id: 'leila',
    name: 'Leila',
    contexts: ['Supper Club', 'Neighbourhood'],
    ring: 2,
    howMet: 'Turned out the supper club regular lives two streets over',
    occupation: 'Translator',
    details: {
      loves: ['Persian poetry', 'Pickling everything', 'Swing dancing'],
      admires: ['Hosts like it costs her nothing (it doesn’t — she just loves it)'],
      dates: [{ id: uid(), label: 'Birthday', date: '10-11' }],
      dreams: ['Translating a novel she loves, on spec'],
    },
  },

  // ——— Ring 3: good friends ———
  {
    id: 'kemal',
    name: 'Kemal',
    contexts: ['University'],
    ring: 3,
    howMet: 'The university film society',
    occupation: 'Radiographer',
    details: {
      loves: ['Tarkovsky', 'Fountain pens'],
      dates: [{ id: uid(), label: 'Birthday', date: '05-19' }],
    },
  },
  {
    id: 'nina',
    name: 'Nina',
    contexts: ['University'],
    ring: 3,
    howMet: 'Amara’s friend first, then everyone’s',
    occupation: 'Teacher',
    details: {
      loves: ['Wild swimming', 'Board games'],
      dates: [{ id: uid(), label: 'Birthday', date: '08-28' }],
      dreams: ['Deputy head role — applying this term'],
    },
  },
  {
    id: 'oscar',
    name: 'Oscar',
    contexts: ['Work'],
    ring: 3,
    howMet: 'Old job; kept the lunch tradition after he left',
    occupation: 'Engineer',
    details: {
      loves: ['Sourdough', 'Trail running'],
      dates: [{ id: uid(), label: 'Birthday', date: '01-30' }],
    },
  },
  {
    id: 'harriet',
    name: 'Harriet',
    contexts: ['Neighbourhood'],
    ring: 3,
    howMet: 'The community garden plot next to yours',
    occupation: 'Retired GP',
    details: {
      loves: ['Dahlias', 'Radio 3', 'Gossip (kind gossip)'],
      admires: ['Remembers every name you’ve ever mentioned'],
      dates: [{ id: uid(), label: 'Birthday', date: '09-09' }],
    },
  },
  {
    id: 'sam',
    name: 'Sam',
    contexts: ['Climbing Gym'],
    ring: 3,
    howMet: 'Tunde’s regular partner before you joined the Tuesday crew',
    occupation: 'Paramedic',
    details: {
      loves: ['Bouldering', 'Motorbikes', 'Bad puns'],
      dates: [{ id: uid(), label: 'Birthday', date: '03-03' }],
    },
  },
  {
    id: 'yuki',
    name: 'Yuki',
    contexts: ['Supper Club'],
    ring: 3,
    howMet: 'Supper club; brought a dessert that silenced the table',
    occupation: 'Pastry chef',
    details: {
      loves: ['Yuzu anything', 'Jazz records'],
      dates: [{ id: uid(), label: 'Birthday', date: '06-06' }],
      dreams: ['A stall at the weekend market'],
    },
  },
  {
    id: 'david',
    name: 'David',
    contexts: ['Childhood'],
    ring: 3,
    howMet: 'Ben’s cousin, around every summer growing up',
    location: 'Two hours away',
    occupation: 'Farmer',
    details: {
      loves: ['Rugby', 'Real ale'],
      dates: [{ id: uid(), label: 'Birthday', date: '12-22' }],
    },
  },
  {
    id: 'zainab',
    name: 'Zainab',
    contexts: ['Work'],
    ring: 3,
    howMet: 'Current job, the office book club',
    occupation: 'Researcher',
    details: {
      loves: ['Sci-fi', 'Fell walking'],
      dates: [{ id: uid(), label: 'Birthday', date: '07-07' }],
    },
  },
  {
    id: 'ines',
    name: 'Inès',
    contexts: ['Supper Club'],
    ring: 3,
    howMet: 'Supper club regular; you always end up on washing-up duty together',
    occupation: 'Midwife',
    details: {
      loves: ['Choir', 'True crime podcasts'],
      dates: [{ id: uid(), label: 'Birthday', date: '02-02' }],
    },
  },

  // ——— Ring 4: promising acquaintances ———
  {
    id: 'felix',
    name: 'Felix',
    contexts: ['Climbing Gym'],
    ring: 4,
    howMet: 'New to the Tuesday crew; moved to the city in spring',
    occupation: 'Illustrator',
    details: {
      loves: ['Comics', 'Bouldering', 'Coffee nerdery'],
      dreams: ['New to the city, building a life here'],
    },
  },
  {
    id: 'rosa',
    name: 'Rosa',
    contexts: ['Supper Club'],
    ring: 4,
    howMet: 'Joined the supper club last month; instantly at home',
    occupation: 'Journalist',
    details: {
      loves: ['Natural wine', 'Flea markets'],
      dreams: ['New to the city, misses her Madrid crowd'],
    },
  },
  {
    id: 'arthur',
    name: 'Arthur',
    contexts: ['Neighbourhood'],
    ring: 4,
    howMet: 'The café — you both always order before nine',
    occupation: 'Violinist',
    details: {
      loves: ['Chamber music', 'Chess in the park'],
    },
  },
  {
    id: 'mei',
    name: 'Mei',
    contexts: ['Work'],
    ring: 4,
    howMet: 'Joined the team in January; you keep meaning to get lunch',
    occupation: 'Analyst',
    details: {
      loves: ['Badminton', 'Studio Ghibli'],
      dreams: ['New parent — baby arrived in May'],
    },
  },
  {
    id: 'stefan',
    name: 'Stefan',
    contexts: ['Climbing Gym'],
    ring: 4,
    howMet: 'Felix’s flatmate, tags along on Tuesdays',
    occupation: 'Nurse',
    details: {
      loves: ['Cycling', 'Baking bread'],
    },
  },
  {
    id: 'clara',
    name: 'Clara',
    contexts: ['University'],
    ring: 4,
    howMet: 'Reconnected at Nina’s birthday after ten years',
    occupation: 'Lawyer',
    details: {
      loves: ['Opera', 'Hiking'],
      dreams: ['Trying to leave corporate law'],
    },
  },

  // ——— The outer field ———
  {
    id: 'gym-guy-pete',
    name: 'Pete',
    contexts: ['Climbing Gym'],
    ring: 'outer',
    howMet: 'The guy at the climbing gym who knows every route',
    details: { loves: ['Beta-spraying (affectionately)'] },
  },
  {
    id: 'colleague-dana',
    name: 'Dana',
    contexts: ['Work'],
    ring: 'outer',
    howMet: 'Friendly colleague on the other team',
  },
  {
    id: 'aunt-vera',
    name: 'Aunt Vera',
    contexts: ['Family'],
    ring: 'outer',
    howMet: 'Family',
    details: {
      dates: [{ id: uid(), label: 'Birthday', date: '10-31' }],
      loves: ['Crossword rivalry by post'],
    },
  },
  {
    id: 'cousin-theo',
    name: 'Theo',
    contexts: ['Family'],
    ring: 'outer',
    howMet: 'Cousin; the family group chat’s only reliable correspondent',
    details: { loves: ['Football', 'Grime'] },
  },
]

// Threads: how people know each other. Fixed history (§2.3).
const edgeSeeds: Array<[string, string, string, boolean?]> = [
  // University cluster
  ['amara', 'joao', 'University coursemates', false],
  ['amara', 'nina', 'University', false],
  ['amara', 'kemal', 'University film society', false],
  ['joao', 'kemal', 'University film society', false],
  ['nina', 'clara', 'University', false],
  ['nina', 'kemal', 'University', false],
  // Childhood
  ['ben', 'david', 'Cousins', false],
  // Work clusters (old job + current job overlap)
  ['priya', 'oscar', 'The old job', false],
  ['grace', 'zainab', 'Current job', false],
  ['grace', 'mei', 'Current job', false],
  ['zainab', 'mei', 'Current job', false],
  ['grace', 'colleague-dana', 'Current job', false],
  // Climbing gym
  ['tunde', 'sam', 'Climbing partners', false],
  ['tunde', 'felix', 'Tuesday climbing crew', false],
  ['felix', 'stefan', 'Flatmates', false],
  ['tunde', 'stefan', 'Tuesday climbing crew', false],
  ['sam', 'gym-guy-pete', 'The climbing gym', false],
  ['felix', 'gym-guy-pete', 'The climbing gym', false],
  // Supper club
  ['sofia', 'leila', 'The supper club', false],
  ['sofia', 'yuki', 'The supper club', false],
  ['leila', 'ines', 'The supper club', false],
  ['yuki', 'ines', 'The supper club', false],
  ['leila', 'rosa', 'The supper club', false],
  ['yuki', 'rosa', 'The supper club', false],
  // Neighbourhood
  ['marco', 'leila', 'Neighbours', false],
  ['marco', 'harriet', 'Neighbours', false],
  ['harriet', 'arthur', 'The café before nine', false],
  // Family
  ['aunt-vera', 'cousin-theo', 'Family', false],
  // Cross-cluster threads — the interesting ones
  ['amara', 'priya', 'You introduced them at your birthday', true],
  ['priya', 'sofia', 'Met at your solstice dinner', true],
  ['ben', 'amara', 'Met through you, many times over the years', true],
]

// A believable trail of recent outreach (§5.1) — this is the user's own record.
const actionSeeds: Array<{
  type: ActionType
  modality: Modality
  participants: string[]
  days: number
  note: string
}> = [
  { type: 'everyday', modality: 'call', participants: ['amara'], days: 2, note: 'Sunday call — her chapter is nearly done, send encouragement Thursday' },
  { type: 'shared_experience', modality: 'in_person', participants: ['tunde', 'felix', 'stefan'], days: 3, note: 'Tuesday climb + dumplings. Felix flashed the purple route' },
  { type: 'sweetness', modality: 'message', participants: ['grace'], days: 4, note: 'Sent the crossword she would have loved' },
  { type: 'everyday', modality: 'message', participants: ['ben'], days: 6, note: 'Biscuit photo exchange' },
  { type: 'shared_experience', modality: 'in_person', participants: ['priya'], days: 9, note: 'First-Friday pho. She is 80% sure about going freelance' },
  { type: 'depth', modality: 'in_person', participants: ['grace'], days: 12, note: 'Long walk — talked properly about her mum. Check in soon' },
  { type: 'everyday', modality: 'message', participants: ['sofia'], days: 13, note: 'Swapped photos from the gallery show' },
  { type: 'shared_experience', modality: 'in_person', participants: ['sofia', 'leila', 'yuki', 'ines', 'rosa'], days: 16, note: 'Supper club — Rosa’s tortilla, Yuki’s yuzu tart' },
  { type: 'sweetness', modality: 'gift', participants: ['harriet'], days: 18, note: 'Dahlia tubers from the market' },
  { type: 'everyday', modality: 'call', participants: ['amara'], days: 9, note: 'Sunday call' },
  { type: 'bridging', modality: 'introduction', participants: ['priya', 'sofia'], days: 21, note: 'Introduced at the solstice dinner — architects and designers, obviously' },
  { type: 'everyday', modality: 'message', participants: ['joao'], days: 24, note: 'Voice note tennis, three rounds' },
  { type: 'shared_experience', modality: 'in_person', participants: ['oscar'], days: 28, note: 'Trail run, he lapped me, lunch after' },
  { type: 'sweetness', modality: 'letter', participants: ['aunt-vera'], days: 30, note: 'Crossword postcard returned, with a harder one' },
  { type: 'everyday', modality: 'call', participants: ['amara'], days: 16, note: 'Sunday call' },
  { type: 'depth', modality: 'call', participants: ['joao'], days: 38, note: 'The grant rejection. He took it hard. Azores plan still alive' },
  { type: 'shared_experience', modality: 'in_person', participants: ['nina', 'clara'], days: 42, note: 'Nina’s birthday — reconnected with Clara after ten years' },
  { type: 'everyday', modality: 'in_person', participants: ['marco'], days: 47, note: 'Ran into him at the market, quick coffee' },
  { type: 'sweetness', modality: 'message', participants: ['yuki'], days: 50, note: 'Sent the jazz record list' },
  { type: 'shared_experience', modality: 'in_person', participants: ['ben', 'david'], days: 55, note: 'The June camping trip. Tent pole broke. Again' },
  { type: 'everyday', modality: 'message', participants: ['kemal'], days: 60, note: 'Tarkovsky retrospective flyer' },
  { type: 'depth', modality: 'in_person', participants: ['amara'], days: 65, note: 'The long dinner. Talked about her mum, the novel, everything' },
  { type: 'shared_experience', modality: 'in_person', participants: ['sam', 'tunde'], days: 70, note: 'Outdoor climbing day trip' },
  { type: 'everyday', modality: 'message', participants: ['zainab'], days: 75, note: 'Book club thread about the ending' },
  { type: 'sweetness', modality: 'gift', participants: ['mei'], days: 80, note: 'Baby gift — the Totoro blanket' },
  { type: 'everyday', modality: 'message', participants: ['arthur'], days: 85, note: 'Swapped concert recommendations at the café' },
  { type: 'shared_experience', modality: 'in_person', participants: ['leila'], days: 88, note: 'Swing dance taster class. I was terrible. Great night' },
  { type: 'everyday', modality: 'message', participants: ['cousin-theo'], days: 95, note: 'Match thread' },
]

export function buildSeedState(): AppState {
  const people = peopleSeeds.map((s, i) => makePerson(s, 400 - i))
  const edges: Edge[] = edgeSeeds.map(([a, b, context, introducedByUser]) => ({
    a,
    b,
    context,
    introducedByUser: !!introducedByUser,
  }))
  const actions: ActionLog[] = actionSeeds.map((s) => ({
    id: uid(),
    type: s.type,
    modality: s.modality,
    participants: s.participants,
    timestamp: daysAgo(s.days),
    note: s.note,
  }))
  return {
    people,
    edges,
    actions,
    events: [
      {
        id: uid(),
        what: 'Spare ticket: Khruangbin at the Roundhouse',
        when: 'Friday night',
        where: 'The Roundhouse',
        kind: 'large_event',
        tags: ['live music', 'jazz records', 'vinyl'],
      },
    ],
    sparkStates: [
      { pairKey: ['priya', 'sofia'].sort().join('|'), status: 'landed', at: daysAgo(21) },
    ],
    dismissedProposals: [],
  }
}
