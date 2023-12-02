import invariant from "tiny-invariant";

import { prisma } from "~/db.server";

import { getContestTeam } from "./team.server";

invariant(process.env.BOOTSTRAP_ACCESS_KEY, "BOOTSTRAP_ACCESS_KEY must be set");

interface BaseUser {
  isAdmin: boolean;
}

export type User = AdminUser | ContestTeam;

interface AdminUser extends BaseUser {
  isAdmin: true;
  userId: "admin";
}

export interface ContestTeam extends BaseUser {
  isAdmin: false;
  userId: string;
  teamNumber: number;
  teamName: string;
  accessKey: string;
}

const ADMIN_USER_ID = "admin";

export async function verifyLogin(accessKey: string): Promise<User | null> {
  if (accessKey == process.env.BOOTSTRAP_ACCESS_KEY) {
    return {
      isAdmin: true,
      userId: ADMIN_USER_ID,
    };
  }

  const contestTeam = await prisma.team.findUnique({
    where: { accessKey },
  });

  if (contestTeam) {
    return {
      isAdmin: false,
      userId: contestTeam.id.toString(),
      teamNumber: contestTeam.id,
      teamName: contestTeam.teamName,
      accessKey: contestTeam.accessKey,
    };
  } else {
    return null;
  }
}

export async function getUserById(userId: string): Promise<User | null> {
  if (userId == ADMIN_USER_ID) {
    return {
      isAdmin: true,
      userId,
    };
  } else {
    return await getContestTeam(Number(userId));
  }
}
