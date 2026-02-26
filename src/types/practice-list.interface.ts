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
