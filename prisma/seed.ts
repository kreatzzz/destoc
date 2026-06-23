import { hashPassword } from "better-auth/crypto";
import { getPrisma } from "../src/lib/db";

const demoEmail = process.env.DEMO_EMAIL ?? "demo@destoc.local";
const demoPassword = process.env.DEMO_PASSWORD ?? "DemoPassword123!";
const demoUserId = "destoc-demo-user";

async function main() {
  const prisma = getPrisma();
  const password = await hashPassword(demoPassword);

  await prisma.user.upsert({
    where: { email: demoEmail },
    create: {
      id: demoUserId,
      name: "Demo Designer",
      email: demoEmail,
      emailVerified: true,
      accounts: {
        create: {
          id: "destoc-demo-account",
          accountId: demoUserId,
          providerId: "credential",
          password,
        },
      },
    },
    update: {
      name: "Demo Designer",
      emailVerified: true,
      accounts: {
        upsert: {
          where: { providerId_accountId: { providerId: "credential", accountId: demoUserId } },
          create: {
            id: "destoc-demo-account",
            accountId: demoUserId,
            providerId: "credential",
            password,
          },
          update: { password },
        },
      },
    },
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "destoc-demo-workspace" },
    create: { id: "destoc-demo-workspace", userId: demoUserId, name: "Demo workspace" },
    update: { name: "Demo workspace" },
  });

  const project = await prisma.project.upsert({
    where: {
      workspaceId_repositoryOwner_repositoryName: {
        workspaceId: workspace.id,
        repositoryOwner: "destoc-demo",
        repositoryName: "fixture-ui",
      },
    },
    create: {
      id: "destoc-demo-project",
      workspaceId: workspace.id,
      name: "Fixture UI",
      githubUrl: "https://github.com/destoc-demo/fixture-ui",
      repositoryOwner: "destoc-demo",
      repositoryName: "fixture-ui",
      defaultBranch: "main",
      pinnedCommitSha: "demo-fixture-commit",
    },
    update: { pinnedCommitSha: "demo-fixture-commit" },
  });

  const run = await prisma.sandboxRun.upsert({
    where: { id: "destoc-demo-run" },
    create: {
      id: "destoc-demo-run",
      projectId: project.id,
      status: "READY",
      commitSha: "demo-fixture-commit",
      previewUrl: "https://example.com/demo-preview",
      startedAt: new Date(),
    },
    update: { status: "READY", previewUrl: "https://example.com/demo-preview" },
  });

  const target = await prisma.reviewTarget.upsert({
    where: { id: "destoc-demo-target" },
    create: {
      id: "destoc-demo-target",
      projectId: project.id,
      sandboxRunId: run.id,
      pageUrl: "https://example.com/demo-preview",
      sourceFilePath: "src/components/PreviewPanel.tsx",
      domContext: { viewport: { width: 1440, height: 900 } },
      element: {
        create: {
          id: "destoc-demo-element",
          selector: "[data-demo='primary-action']",
          role: "button",
          text: "Run design audit",
          domPath: ["main", "section", "button"],
          computedStyles: { display: "inline-flex", borderRadius: "8px" },
          boundingBox: { x: 100, y: 200, width: 180, height: 40 },
          classNames: ["inline-flex", "rounded-md"],
        },
      },
    },
    update: { sandboxRunId: run.id },
  });

  const review = await prisma.review.upsert({
    where: { id: "destoc-demo-review" },
    create: {
      id: "destoc-demo-review",
      projectId: project.id,
      reviewTargetId: target.id,
      scope: "COMPONENT",
      status: "READY",
      provider: "mock",
      result: { summary: "Fixture design review", suggestions: 1 },
    },
    update: { status: "READY" },
  });

  const suggestion = await prisma.suggestion.upsert({
    where: { id: "destoc-demo-suggestion" },
    create: {
      id: "destoc-demo-suggestion",
      reviewId: review.id,
      status: "ACCEPTED",
      severity: "medium",
      confidence: 0.86,
      title: "Strengthen the primary action hierarchy",
      issue: "The action blends into surrounding controls.",
      rationale: "A clearer surface helps users identify the highest-value action.",
      intendedOutcome: "Make the primary action more discoverable without changing behavior.",
      patch: "--- a/src/components/PreviewPanel.tsx\n+++ b/src/components/PreviewPanel.tsx\n@@\n-className=\"...\"\n+className=\"rounded-md border border-border bg-background px-4 py-3 shadow-sm\"",
      verificationChecklist: ["Check the desktop preview", "Verify keyboard focus"],
    },
    update: { status: "ACCEPTED" },
  });

  await prisma.revision.upsert({
    where: { suggestionId: suggestion.id },
    create: {
      id: "destoc-demo-revision",
      projectId: project.id,
      suggestionId: suggestion.id,
      sandboxRunId: run.id,
      status: "READY",
      patch: suggestion.patch!,
    },
    update: { status: "READY" },
  });

  console.info(`Seeded demo account ${demoEmail}.`);
}

main()
  .catch((error: unknown) => {
    console.error("Database seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPrisma().$disconnect();
  });
