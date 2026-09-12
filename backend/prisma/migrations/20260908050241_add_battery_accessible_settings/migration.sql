-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "voiceLanguage" TEXT NOT NULL DEFAULT 'en-US',
    "voiceSpeed" REAL NOT NULL DEFAULT 1.0,
    "voiceType" TEXT NOT NULL DEFAULT 'female',
    "hapticIntensity" INTEGER NOT NULL DEFAULT 2,
    "highContrast" BOOLEAN NOT NULL DEFAULT false,
    "largeTouchTarget" BOOLEAN NOT NULL DEFAULT true,
    "offlineMode" BOOLEAN NOT NULL DEFAULT false,
    "darkMode" BOOLEAN NOT NULL DEFAULT false,
    "announceCadence" INTEGER NOT NULL DEFAULT 3,
    "batteryMode" TEXT NOT NULL DEFAULT 'normal',
    "preferAccessible" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserSettings" ("announceCadence", "darkMode", "hapticIntensity", "highContrast", "id", "largeTouchTarget", "offlineMode", "userId", "voiceLanguage", "voiceSpeed", "voiceType") SELECT "announceCadence", "darkMode", "hapticIntensity", "highContrast", "id", "largeTouchTarget", "offlineMode", "userId", "voiceLanguage", "voiceSpeed", "voiceType" FROM "UserSettings";
DROP TABLE "UserSettings";
ALTER TABLE "new_UserSettings" RENAME TO "UserSettings";
CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
