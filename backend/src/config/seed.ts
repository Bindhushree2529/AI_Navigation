import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || "admin@naviassist.app";
  const adminPassword = process.env.ADMIN_PASSWORD || "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        name: "NaviAssist Admin",
        email: adminEmail,
        passwordHash: await bcrypt.hash(adminPassword, 12),
        role: "ADMIN",
        isVerified: true,
        settings: { create: {} },
      },
    });
    console.log(`✅ Admin created: ${adminEmail}`);
  } else {
    console.log(`ℹ️  Admin already exists: ${adminEmail}`);
  }

  console.log("✅ Seed complete");
}

seed()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
