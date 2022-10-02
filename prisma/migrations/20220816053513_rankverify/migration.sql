-- CreateTable
CREATE TABLE "User" (
    "id" VARCHAR(19) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Guild" (
    "id" VARCHAR(19) NOT NULL,
    "name" TEXT NOT NULL,
    "rankRoles" TEXT[],

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuildMember" (
    "id" VARCHAR(19) NOT NULL,
    "guildId" TEXT NOT NULL,

    CONSTRAINT "GuildMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TargetChannel" (
    "id" VARCHAR(19) NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "rankRoles" TEXT[],

    CONSTRAINT "TargetChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DenyReason" (
    "id" VARCHAR(19) NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "message" TEXT NOT NULL,

    CONSTRAINT "DenyReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Verification" (
    "id" VARCHAR(19) NOT NULL,
    "memberId" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuildMember_id_guildId_key" ON "GuildMember"("id", "guildId");

-- CreateIndex
CREATE UNIQUE INDEX "Verification_id_guildId_memberId_key" ON "Verification"("id", "guildId", "memberId");

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuildMember" ADD CONSTRAINT "GuildMember_id_fkey" FOREIGN KEY ("id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TargetChannel" ADD CONSTRAINT "TargetChannel_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DenyReason" ADD CONSTRAINT "DenyReason_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_memberId_guildId_fkey" FOREIGN KEY ("memberId", "guildId") REFERENCES "GuildMember"("id", "guildId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Verification" ADD CONSTRAINT "Verification_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
