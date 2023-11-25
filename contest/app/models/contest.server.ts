import { prisma } from "~/db.server";
import { range } from "~/utils";

export type ContestWithTeams = Awaited<ReturnType<typeof getContest>>;

const CONTEST_SINGLETON_ID = 1;

export async function getContest() {
  return prisma.contest.findFirst({
    select: {
      id: true,
      numTeams: true,
      numProblems: true,
      nextTeamSubmission: true,
      teams: true,
    },
    where: { id: CONTEST_SINGLETON_ID },
  });
}

export async function deleteContest() {
  const deleted = await prisma.contest.delete({
    where: { id: CONTEST_SINGLETON_ID },
  });

  console.log(deleted);
}

export async function createContest(numTeams: number, numProblems: number) {
  const { id: contestId } = await prisma.contest.create({
    select: { id: true },
    data: {
      numTeams,
      numProblems,
    },
  });

  for (const teamNumber of range(1, numTeams)) {
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

export async function updateNextTeamSubmission(
  updatedNextTeamSubmission: number,
): Promise<void> {
  await prisma.contest.update({
    data: {
      nextTeamSubmission: updatedNextTeamSubmission,
    },
    where: {
      id: CONTEST_SINGLETON_ID,
    },
  });
}
