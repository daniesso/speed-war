import { prisma } from "~/db.server";
import { range } from "~/utils";

export type ContestWithTeams = Awaited<ReturnType<typeof getContest>>;

export async function getContest() {
  return prisma.contest.findFirst({
    select: {
      id: true,
      numPlayers: true,
      numProblems: true,
      nextPlayerSubmission: true,
      teams: true,
    },
    where: { id: 1 },
  });
}

export async function deleteContest() {
  const deleted = await prisma.contest.delete({
    where: { id: 1 },
  });

  console.log(deleted);
}

export async function createContest(numPlayers: number, numProblems: number) {
  const { id: contestId } = await prisma.contest.create({
    select: { id: true },
    data: {
      numPlayers,
      numProblems,
    },
  });

  for (const teamNumber of range(1, numPlayers)) {
    await prisma.team.create({
      data: {
        id: teamNumber,
        contestId: contestId,
        teamName: `Team ${teamNumber}`,
      },
    });
  }

  return (await getContest())!;
}
