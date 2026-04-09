export interface PracticeListWordInput {
  dutchWord: string
  englishWord: string
}

export interface PracticeListCreateInput {
  title: string
  isPrivate?: boolean
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
  correctAnswers: number
  wrongAnswers: number
  resumedFromSavedProgress: boolean
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

export interface StopPracticeRequest {
  correctAnswers: number
  wrongAnswers: number
  currentPosition: number
  reverseMode?: boolean
}

export interface PracticeProgressResponse {
  id: number
  userId: number
  practiceListId: number
  correctAnswers: number
  wrongAnswers: number
  currentPosition: number
  reverseMode: boolean
  createdAt: string
  updatedAt: string
}

export interface PracticeProgressRecord {
  id: number
  userId: number
  practiceListId: number
  correctAnswers: number
  wrongAnswers: number
  currentPosition: number
  reverseMode: boolean
  createdAt: Date
  updatedAt: Date
}

export interface StopPracticeResults {
  totalAttempts: number
  correctAnswers: number
  wrongAnswers: number
  accuracy: number
  position: number
  totalWords: number
  completedPercentage: number
}

export interface StopPracticeResponse {
  message: string
  data: PracticeProgressResponse | null
  results: StopPracticeResults
}

export interface PastExerciseRow {
  id: number
  practiceListId: number
  title: string
  correctAnswers: number
  wrongAnswers: number
  currentPosition: number
  reverseMode: boolean
  totalWords: number
  updatedAt: Date
}

export interface PastExerciseItem {
  id: number
  practiceListId: number
  title: string
  correctAnswers: number
  wrongAnswers: number
  currentPosition: number
  reverseMode: boolean
  totalWords: number
  completedPercentage: number
  updatedAt: string
}

export interface PastExercisesResponse {
  items: PastExerciseItem[]
}

export interface PracticeMissedWord {
  prompt: string
  answer: string
}

export interface PracticeResultsResponse {
  message: string
  results: StopPracticeResults
  missedWords: PracticeMissedWord[]
}

export interface PracticeProgressStatsRow {
  correctAnswers: number
  wrongAnswers: number
  position: number
}

export type PracticeResultStats = Pick<PracticeProgressResponse, 'correctAnswers' | 'wrongAnswers' | 'currentPosition'>;
