import { Team } from "@prisma/client";

import { prisma } from "~/db.server";

import { mapContestTeam } from "./submission.server";
import { ContestTeam } from "./user.server";

export async function getTeam(teamNumber: number) {
  return prisma.team.findFirst({
    where: { id: teamNumber },
  });
}

export async function updateTeamName(
  teamNumber: number,
  teamName: string,
): Promise<Team> {
  return prisma.team.update({
    data: { teamName: teamName },
    where: { id: teamNumber },
  });
}

export async function getContestTeam(
  teamNumber: number,
): Promise<ContestTeam | null> {
  const contestTeam = await prisma.team.findUnique({
    where: { id: teamNumber },
  });

  return contestTeam ? mapContestTeam(contestTeam) : null;
}
