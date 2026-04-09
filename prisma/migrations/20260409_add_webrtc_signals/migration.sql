-- CreateTable WebRTCSignal
CREATE TABLE "WebRTCSignal" (
    "id" TEXT NOT NULL,
    "callId" TEXT NOT NULL,
    "fromUserId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebRTCSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebRTCSignal_callId_idx" ON "WebRTCSignal"("callId");

-- CreateIndex
CREATE INDEX "WebRTCSignal_fromUserId_idx" ON "WebRTCSignal"("fromUserId");

-- CreateIndex
CREATE INDEX "WebRTCSignal_createdAt_idx" ON "WebRTCSignal"("createdAt");

-- AddForeignKey
ALTER TABLE "WebRTCSignal" ADD CONSTRAINT "WebRTCSignal_callId_fkey" FOREIGN KEY ("callId") REFERENCES "VideoCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
