import { getClientId } from './clientId.js'

const BASE = import.meta.env.VITE_API_BASE_URL || ''

async function request(path, options = {}) {
  const response = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': getClientId(),
      ...(options.headers || {}),
    },
    ...options,
  })

  if (!response.ok) {
    // Try to use the API's own message; fall back to the status line.
    let message = `${response.status} ${response.statusText}`
    try {
      const body = await response.json()
      if (body?.error) message = body.error
    } catch {
      // The body was not JSON. The status line is all we have.
    }
    throw new Error(message)
  }

  return response.status === 204 ? null : response.json()
}

export const listQuests = ({ rarity, category } = {}) => {
  const params = new URLSearchParams()
  if (rarity) params.set('rarity', rarity)
  if (category) params.set('category', category)
  const qs = params.toString()
  return request(`/api/quests${qs ? `?${qs}` : ''}`)
}

export const spinQuest = () => request('/api/quests/spin')

export const createQuest = (input) =>
  request('/api/quests', { method: 'POST', body: JSON.stringify(input) })

export const generateQuestIdea = () =>
  request('/api/quests/generate', { method: 'POST' })

export const completeQuest = (id) =>
  request(`/api/quests/${id}/complete`, { method: 'PATCH' })

export const deleteQuest = (id) =>
  request(`/api/quests/${id}`, { method: 'DELETE' })

export const toggleQuestActive = (id) =>
  request(`/api/quests/${id}/toggle-active`, { method: 'PATCH' })

export const listHistory = () => request('/api/history')

export const resetHistory = () => request('/api/history', { method: 'DELETE' })