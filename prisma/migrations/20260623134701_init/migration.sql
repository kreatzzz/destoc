-- CreateEnum
CREATE TYPE "SandboxRunStatus" AS ENUM ('QUEUED', 'PROVISIONING', 'BUILDING', 'READY', 'FAILED', 'STOPPED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('DRAFT', 'RUNNING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewScope" AS ENUM ('COMPONENT', 'PAGE');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'FAILED');

-- CreateEnum
CREATE TYPE "RevisionStatus" AS ENUM ('QUEUED', 'APPLYING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "AssetKind" AS ENUM ('SCREENSHOT_BEFORE', 'SCREENSHOT_AFTER', 'ELEMENT_CROP', 'PAGE_SCREENSHOT', 'LOG');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workspace" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "githubUrl" TEXT NOT NULL,
    "repositoryOwner" TEXT NOT NULL,
    "repositoryName" TEXT NOT NULL,
    "defaultBranch" TEXT NOT NULL DEFAULT 'main',
    "pinnedCommitSha" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SandboxRun" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "status" "SandboxRunStatus" NOT NULL DEFAULT 'QUEUED',
    "commitSha" TEXT,
    "previewUrl" TEXT,
    "logs" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "stoppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SandboxRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewTarget" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "sandboxRunId" TEXT,
    "pageUrl" TEXT NOT NULL,
    "sourceFilePath" TEXT,
    "domContext" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SelectedElement" (
    "id" TEXT NOT NULL,
    "reviewTargetId" TEXT NOT NULL,
    "selector" TEXT NOT NULL,
    "role" TEXT,
    "text" TEXT,
    "domPath" JSONB NOT NULL,
    "computedStyles" JSONB NOT NULL,
    "boundingBox" JSONB NOT NULL,
    "classNames" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SelectedElement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "reviewTargetId" TEXT NOT NULL,
    "scope" "ReviewScope" NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "provider" TEXT NOT NULL,
    "prompt" TEXT,
    "result" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Suggestion" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'PENDING',
    "severity" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "title" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "rationale" TEXT NOT NULL,
    "intendedOutcome" TEXT NOT NULL,
    "patch" TEXT,
    "verificationChecklist" JSONB,
    "rejectionReason" TEXT,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Suggestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Revision" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "suggestionId" TEXT NOT NULL,
    "sandboxRunId" TEXT,
    "status" "RevisionStatus" NOT NULL DEFAULT 'QUEUED',
    "patch" TEXT NOT NULL,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Revision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "AssetKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedElementId" TEXT,
    "beforeRevisionId" TEXT,
    "afterRevisionId" TEXT,

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "account_providerId_accountId_key" ON "account"("providerId", "accountId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE INDEX "Workspace_userId_idx" ON "Workspace"("userId");

-- CreateIndex
CREATE INDEX "Project_workspaceId_updatedAt_idx" ON "Project"("workspaceId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "Project_workspaceId_repositoryOwner_repositoryName_key" ON "Project"("workspaceId", "repositoryOwner", "repositoryName");

-- CreateIndex
CREATE INDEX "SandboxRun_projectId_createdAt_idx" ON "SandboxRun"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "SandboxRun_status_idx" ON "SandboxRun"("status");

-- CreateIndex
CREATE INDEX "ReviewTarget_projectId_createdAt_idx" ON "ReviewTarget"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "ReviewTarget_sandboxRunId_idx" ON "ReviewTarget"("sandboxRunId");

-- CreateIndex
CREATE UNIQUE INDEX "SelectedElement_reviewTargetId_key" ON "SelectedElement"("reviewTargetId");

-- CreateIndex
CREATE INDEX "Review_projectId_createdAt_idx" ON "Review"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Review_reviewTargetId_idx" ON "Review"("reviewTargetId");

-- CreateIndex
CREATE INDEX "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX "Suggestion_reviewId_createdAt_idx" ON "Suggestion"("reviewId", "createdAt");

-- CreateIndex
CREATE INDEX "Suggestion_status_idx" ON "Suggestion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Revision_suggestionId_key" ON "Revision"("suggestionId");

-- CreateIndex
CREATE INDEX "Revision_projectId_createdAt_idx" ON "Revision"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "Revision_sandboxRunId_idx" ON "Revision"("sandboxRunId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_storageKey_key" ON "Asset"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_selectedElementId_key" ON "Asset"("selectedElementId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_beforeRevisionId_key" ON "Asset"("beforeRevisionId");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_afterRevisionId_key" ON "Asset"("afterRevisionId");

-- CreateIndex
CREATE INDEX "Asset_projectId_kind_createdAt_idx" ON "Asset"("projectId", "kind", "createdAt");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SandboxRun" ADD CONSTRAINT "SandboxRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTarget" ADD CONSTRAINT "ReviewTarget_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewTarget" ADD CONSTRAINT "ReviewTarget_sandboxRunId_fkey" FOREIGN KEY ("sandboxRunId") REFERENCES "SandboxRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SelectedElement" ADD CONSTRAINT "SelectedElement_reviewTargetId_fkey" FOREIGN KEY ("reviewTargetId") REFERENCES "ReviewTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_reviewTargetId_fkey" FOREIGN KEY ("reviewTargetId") REFERENCES "ReviewTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Suggestion" ADD CONSTRAINT "Suggestion_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_suggestionId_fkey" FOREIGN KEY ("suggestionId") REFERENCES "Suggestion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Revision" ADD CONSTRAINT "Revision_sandboxRunId_fkey" FOREIGN KEY ("sandboxRunId") REFERENCES "SandboxRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_selectedElementId_fkey" FOREIGN KEY ("selectedElementId") REFERENCES "SelectedElement"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_beforeRevisionId_fkey" FOREIGN KEY ("beforeRevisionId") REFERENCES "Revision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_afterRevisionId_fkey" FOREIGN KEY ("afterRevisionId") REFERENCES "Revision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
