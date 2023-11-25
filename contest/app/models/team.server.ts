import { prisma } from "~/db.server";

export async function getTeam(teamNumber: number) {
  return prisma.team.findFirst({
    where: { id: teamNumber },
  });
}
