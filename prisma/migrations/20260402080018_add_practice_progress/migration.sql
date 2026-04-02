-- CreateTable
CREATE TABLE "PracticeList" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT true,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "PracticeList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Word" (
    "id" SERIAL NOT NULL,
    "dutchWord" TEXT NOT NULL,
    "englishWord" TEXT NOT NULL,
    "practiceListId" INTEGER NOT NULL,

    CONSTRAINT "Word_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeProgress" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "practiceListId" INTEGER NOT NULL,
    "correctAnswers" INTEGER NOT NULL DEFAULT 0,
    "wrongAnswers" INTEGER NOT NULL DEFAULT 0,
    "currentPosition" INTEGER NOT NULL DEFAULT 0,
    "reverseMode" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PracticeProgress_userId_practiceListId_key" ON "PracticeProgress"("userId", "practiceListId");

-- AddForeignKey
ALTER TABLE "PracticeList" ADD CONSTRAINT "PracticeList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Word" ADD CONSTRAINT "Word_practiceListId_fkey" FOREIGN KEY ("practiceListId") REFERENCES "PracticeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeProgress" ADD CONSTRAINT "PracticeProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PracticeProgress" ADD CONSTRAINT "PracticeProgress_practiceListId_fkey" FOREIGN KEY ("practiceListId") REFERENCES "PracticeList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
