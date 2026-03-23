export interface PracticeListWordInput {
  dutchWord: string
  englishWord: string
}

export interface PracticeListCreateInput {
  title: string
  isPrivate?: boolean
  userId: number
  words: PracticeListWordInput[]
}

export interface PracticeListWithWordCount {
  id: number
  title: string
  isPrivate: boolean
  userId: number
  wordCount: number
}

export interface PracticeListResponse {
  publicLists: PracticeListWithWordCount[]
  privateLists: PracticeListWithWordCount[]
}

export interface PracticeListWordDetail {
  id: number
  dutchWord: string
  englishWord: string
}

export interface PracticeListDetailResponse {
  id: number
  title: string
  isPrivate: boolean
  userId: number
  words: PracticeListWordDetail[]
}

export interface PracticeWordPrompt {
  id: number
  dutchWord: string
  englishWord?: string
}

export interface PracticeWordResponse {
  listId: number
  title: string
  totalWords: number
  reverseMode: boolean
  currentWordIndex: number
  currentWord: PracticeWordPrompt
  hasNextWord: boolean
  nextIndex: number | null
}

export interface SubmitPracticeAnswerRequest {
  index: number
  answer: string
  correctAnswers: number
  wrongAnswers: number
  reverseMode?: boolean
}

export interface PracticeAnswerResponse {
  listId: number
  title: string
  totalWords: number
  answerIsCorrect: boolean
  correctAnswers: number
  wrongAnswers: number
  reverseMode: boolean
  currentWordIndex: number | null
  currentWord: PracticeWordPrompt | null
  hasNextWord: boolean
  nextIndex: number | null
}
