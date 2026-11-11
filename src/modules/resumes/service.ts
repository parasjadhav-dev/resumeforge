import { resumeContentSchema, createEmptyResume, type ResumeContent } from "@/shared/schema";
import { LimitReachedError, NotFoundError } from "./errors";
import { resumeRepository as repo } from "./repository";
import {
  MAX_RESUMES_PER_USER,
  createResumeInput,
  renameResumeInput,
  updateResumeInput,
  type CreateResumeInput,
  type UpdateResumeInput,
} from "./schemas";

type ResumeRow = NonNullable<Awaited<ReturnType<typeof repo.find>>>;

export type Resume = Omit<ResumeRow, "content"> & { content: ResumeContent };

function toResume(row: ResumeRow): Resume {
  return { ...row, content: resumeContentSchema.parse(row.content) };
}

async function assertUnderLimit(userId: string) {
  if ((await repo.count(userId)) >= MAX_RESUMES_PER_USER) {
    throw new LimitReachedError(`You can have at most ${MAX_RESUMES_PER_USER} resumes.`);
  }
}

export const resumeService = {
  list: (userId: string) => repo.list(userId),

  async get(userId: string, id: string): Promise<Resume> {
    const row = await repo.find(userId, id);
    if (!row) throw new NotFoundError();
    return toResume(row);
  },

  async create(userId: string, input: CreateResumeInput = {}): Promise<Resume> {
    const { title, content } = createResumeInput.parse(input);
    await assertUnderLimit(userId);
    const row = await repo.create(userId, { title, content: content ?? createEmptyResume() });
    return toResume(row);
  },

  async update(userId: string, id: string, input: UpdateResumeInput): Promise<Resume> {
    const data = updateResumeInput.parse(input);
    if ((await repo.update(userId, id, data)) === 0) throw new NotFoundError();
    return this.get(userId, id);
  },

  async rename(userId: string, id: string, title: string): Promise<Resume> {
    return this.update(userId, id, renameResumeInput.parse({ title }));
  },

  async duplicate(userId: string, id: string): Promise<Resume> {
    const source = await this.get(userId, id);
    await assertUnderLimit(userId);
    const title = `${source.title} (copy)`.slice(0, 100);
    const row = await repo.create(userId, {
      title,
      templateId: source.templateId,
      content: source.content,
    });
    return toResume(row);
  },

  async remove(userId: string, id: string): Promise<void> {
    if ((await repo.remove(userId, id)) === 0) throw new NotFoundError();
  },
};
