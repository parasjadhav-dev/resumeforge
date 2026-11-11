import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

// Every query is scoped by userId: a user can never read or touch another user's resume.

const summarySelect = {
  id: true,
  title: true,
  templateId: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ResumeSelect;

export const resumeRepository = {
  list: (userId: string) =>
    db.resume.findMany({
      where: { userId },
      select: summarySelect,
      orderBy: { updatedAt: "desc" },
    }),

  count: (userId: string) => db.resume.count({ where: { userId } }),

  find: (userId: string, id: string) => db.resume.findFirst({ where: { id, userId } }),

  create: (userId: string, data: { title: string; templateId?: string; content: object }) =>
    db.resume.create({ data: { userId, ...data } }),

  /** Returns the number of rows updated (0 when not found or not owned). */
  update: async (
    userId: string,
    id: string,
    data: { title?: string; templateId?: string; content?: object },
  ) => (await db.resume.updateMany({ where: { id, userId }, data })).count,

  remove: async (userId: string, id: string) =>
    (await db.resume.deleteMany({ where: { id, userId } })).count,
};
