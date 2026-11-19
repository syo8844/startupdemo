import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

try {
  const passwordHash = await bcrypt.hash("1234", 10);
  const { count } = await prisma.investment.updateMany({
    data: { password: passwordHash },
  });

  console.log(`Reset passwords for ${count} investment record(s).`);
} finally {
  await prisma.$disconnect();
}
