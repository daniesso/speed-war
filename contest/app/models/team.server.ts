import { prisma } from "~/db.server";

export async function getTeam(teamNumber: number) {
  return prisma.contestTeam.findFirst({
    where: { id: teamNumber },
  });
}
