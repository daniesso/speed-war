import invariant from "tiny-invariant";

import { prisma } from "~/db.server";

invariant(process.env.BOOTSTRAP_ACCESS_KEY, "BOOTSTRAP_ACCESS_KEY must be set");

interface BaseUser {
  isAdmin: boolean;
}

type Userh = AdminUser | ContestTeam;

interface AdminUser extends BaseUser {
  isAdmin: true;
  userId: "admin";
}

interface ContestTeam extends BaseUser {
  isAdmin: false;
  userId: string;
  teamNumber: number;
  teamName: string;
}

const ADMIN_USER_ID = "admin";

export async function verifyLogin(accessKey: string): Promise<Userh | null> {
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
    };
  } else {
    return null;
  }
}

export async function getUserById(userId: string): Promise<Userh | null> {
  if (userId == ADMIN_USER_ID) {
    return {
      isAdmin: true,
      userId,
    };
  } else {
    const contestTeam = await prisma.team.findUnique({
      where: { id: Number(userId) },
    });

    return contestTeam
      ? {
          isAdmin: false,
          userId: contestTeam.id.toString(),
          teamNumber: contestTeam.id,
          teamName: contestTeam.teamName,
        }
      : null;
  }
}
