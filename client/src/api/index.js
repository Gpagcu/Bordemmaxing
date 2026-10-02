import * as mockApi from './mockApi.js'
import * as httpApi from './httpApi.js'

export const USING_MOCK_API = import.meta.env.VITE_USE_MOCK_API !== 'false'

const implementation = USING_MOCK_API ? mockApi : httpApi

export const {
  listQuests,
  spinQuest,
  createQuest,
  generateQuestIdea,
  completeQuest,
  deleteQuest,
  toggleQuestActive,
  listHistory,
  resetHistory,
} = implementation