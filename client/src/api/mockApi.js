import seed from './seed.json'

const QUESTS_KEY = 'final-project:quests'
const HISTORY_KEY = 'final-project:quest-history'

// A real network is not instant. Keeping this delay is what forces you to build
// a loading state now, while it is cheap, instead of discovering you need one
// the day you switch to the real API.
const delay = (ms = 250) => new Promise((resolve) => setTimeout(resolve, ms))

// The real API asks Gemini for a suggestion. There is no API key available
// in the browser (and there shouldn't be — it belongs on the server), so
// the demo picks from a small fixed pool instead. This keeps the button
// working in demo mode without pretending to call a real AI.
const CANNED_IDEAS = [
  { text: 'Invent a secret handshake and teach it to someone', category: 'social' },
  { text: 'Balance a spoon on your nose for as long as you can', category: 'weird' },
  { text: 'Sketch the view outside your nearest window', category: 'creative' },
  { text: 'Do wall sits until your legs shake', category: 'physical' },
  { text: 'Write a one-star review of a boring Tuesday', category: 'creative' },
]

export async function generateQuestIdea() {
  await delay()
  return CANNED_IDEAS[Math.floor(Math.random() * CANNED_IDEAS.length)]
}

// Mirrors the rarity weighting used server-side, so the demo build "feels"
// the same as the real API even though it never talks to it.
const RARITY_WEIGHTS = { common: 45, uncommon: 28, rare: 15, epic: 9, legendary: 3 }
const UNIQUE_PULL_CHANCE = 0.15

function readQuests() {
  const stored = localStorage.getItem(QUESTS_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      // Corrupted storage. Start again rather than crashing the app.
      localStorage.removeItem(QUESTS_KEY)
    }
  }
  localStorage.setItem(QUESTS_KEY, JSON.stringify(seed))
  return seed
}

function writeQuests(rows) {
  localStorage.setItem(QUESTS_KEY, JSON.stringify(rows))
  return rows
}

function readHistory() {
  const stored = localStorage.getItem(HISTORY_KEY)
  if (!stored) return []
  try {
    return JSON.parse(stored)
  } catch {
    localStorage.removeItem(HISTORY_KEY)
    return []
  }
}

function writeHistory(rows) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(rows))
  return rows
}

function pickWeightedRarity(counts) {
  const available = Object.entries(counts).filter(([, count]) => count > 0)
  if (available.length === 0) return null

  const totalWeight = available.reduce((sum, [rarity]) => sum + (RARITY_WEIGHTS[rarity] || 0), 0)
  let roll = Math.random() * totalWeight

  for (const [rarity] of available) {
    roll -= RARITY_WEIGHTS[rarity] || 0
    if (roll <= 0) return rarity
  }
  return available[available.length - 1][0]
}

export async function listQuests({ rarity, category } = {}) {
  await delay()
  let rows = readQuests()
  if (rarity) rows = rows.filter((row) => row.rarity === rarity)
  if (category) rows = rows.filter((row) => row.category === category)
  return rows.slice().sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export async function spinQuest() {
  await delay()
  const rows = readQuests().filter((row) => row.is_active !== false)

  const uniqueRows = rows.filter((row) => row.rarity === 'unique')
  if (uniqueRows.length > 0 && Math.random() < UNIQUE_PULL_CHANCE) {
    return uniqueRows[Math.floor(Math.random() * uniqueRows.length)]
  }

  const presets = rows.filter((row) => row.is_preset)
  const counts = {}
  for (const row of presets) {
    counts[row.rarity] = (counts[row.rarity] || 0) + 1
  }

  const chosenRarity = pickWeightedRarity(counts)
  if (!chosenRarity) throw new Error('No quests available')

  const pool = presets.filter((row) => row.rarity === chosenRarity)
  return pool[Math.floor(Math.random() * pool.length)]
}

export async function createQuest(input) {
  await delay()
  const created = {
    id: crypto.randomUUID(),
    text: input.text,
    category: input.category || null,
    rarity: 'unique',
    is_preset: false,
    user_id: 'local',
    is_active: true,
    is_completed: false,
    date_completed: null,
    created_at: new Date().toISOString(),
  }
  writeQuests([...readQuests(), created])
  return created
}

export async function toggleQuestActive(id) {
  await delay()
  const rows = readQuests()
  const index = rows.findIndex((row) => String(row.id) === String(id) && !row.is_preset)
  if (index === -1) throw new Error('Not found')

  rows[index] = { ...rows[index], is_active: !rows[index].is_active }
  writeQuests(rows)
  return rows[index]
}

export async function completeQuest(id) {
  await delay()
  const rows = readQuests()
  const index = rows.findIndex((row) => String(row.id) === String(id))
  if (index === -1) throw new Error('Not found')

  rows[index] = { ...rows[index], is_completed: true, date_completed: new Date().toISOString() }
  writeQuests(rows)

  writeHistory([
    {
      id: crypto.randomUUID(),
      text: rows[index].text,
      rarity: rows[index].rarity,
      category: rows[index].category,
      completed_at: rows[index].date_completed,
    },
    ...readHistory(),
  ])

  return rows[index]
}

export async function deleteQuest(id) {
  await delay()
  const rows = readQuests()
  const target = rows.find((row) => String(row.id) === String(id))
  if (target && !target.is_preset) {
    writeQuests(rows.filter((row) => String(row.id) !== String(id)))
  }
}

export async function listHistory() {
  await delay()
  return readHistory()
}

export async function resetHistory() {
  await delay()
  writeHistory([])
  const rows = readQuests().map((row) => ({ ...row, is_completed: false, date_completed: null }))
  writeQuests(rows)
}