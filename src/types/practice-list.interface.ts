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
