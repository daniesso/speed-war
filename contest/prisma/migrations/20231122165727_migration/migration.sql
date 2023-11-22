-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Contest" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "numPlayers" INTEGER NOT NULL,
    "nextPlayerSubmission" INTEGER NOT NULL DEFAULT 1
);
INSERT INTO "new_Contest" ("id", "nextPlayerSubmission", "numPlayers") SELECT "id", "nextPlayerSubmission", "numPlayers" FROM "Contest";
DROP TABLE "Contest";
ALTER TABLE "new_Contest" RENAME TO "Contest";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
