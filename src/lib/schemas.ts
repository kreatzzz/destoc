import { z } from "zod";

const githubRepositoryPath = /^\/([^/\s]+)\/([^/\s]+?)(?:\.git)?\/?$/;

export const githubRepositoryUrlSchema = z
  .string()
  .trim()
  .url("Enter a valid GitHub repository URL.")
  .superRefine((value, context) => {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com") {
      context.addIssue({
        code: "custom",
        message: "Only public HTTPS GitHub repository URLs are supported.",
      });
      return;
    }

    const match = url.pathname.match(githubRepositoryPath);
    if (!match || url.search || url.hash) {
      context.addIssue({
        code: "custom",
        message: "Use a repository URL in the form https://github.com/owner/repository.",
      });
    }
  })
  .transform((value) => {
    const url = new URL(value);
    const [, owner, repository] = url.pathname.match(githubRepositoryPath)!;
    return {
      url: `https://github.com/${owner}/${repository}`,
      owner,
      repository,
    };
  });

export const createProjectSchema = z.object({
  workspaceId: z.string().cuid(),
  githubUrl: githubRepositoryUrlSchema,
  defaultBranch: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .regex(/^[A-Za-z0-9._/-]+$/, "Branch contains unsupported characters.")
    .default("main"),
});

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const reviewScopeSchema = z.enum(["COMPONENT", "PAGE"]);

export const selectedElementSchema = z.object({
  selector: z.string().trim().min(1).max(2_000),
  role: z.string().trim().max(100).optional(),
  text: z.string().trim().max(10_000).optional(),
  domPath: z.array(z.string().max(500)).min(1).max(100),
  computedStyles: z
    .record(z.string(), z.string().max(1_000))
    .superRefine((styles, context) => {
      if (Object.keys(styles).length > 250) {
        context.addIssue({
          code: "custom",
          message: "Computed styles contain too many properties.",
        });
      }
    }),
  boundingBox: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    width: z.number().nonnegative().finite(),
    height: z.number().nonnegative().finite(),
  }),
  classNames: z.array(z.string().max(500)).max(200),
});

export const createReviewTargetSchema = z.object({
  projectId: z.string().cuid(),
  sandboxRunId: z.string().cuid().optional(),
  pageUrl: z.string().url().max(2_000),
  sourceFilePath: z
    .string()
    .trim()
    .max(500)
    .regex(/^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/-]+$/, "Source path is invalid.")
    .optional(),
  domContext: z.record(z.string(), z.unknown()).optional(),
  element: selectedElementSchema.optional(),
});

export const createReviewSchema = z.object({
  projectId: z.string().cuid(),
  reviewTargetId: z.string().cuid(),
  scope: reviewScopeSchema,
  prompt: z.string().trim().max(4_000).optional(),
});

export const rejectSuggestionSchema = z.object({
  reason: z.string().trim().min(1).max(1_000).optional(),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateReviewTargetInput = z.infer<typeof createReviewTargetSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
