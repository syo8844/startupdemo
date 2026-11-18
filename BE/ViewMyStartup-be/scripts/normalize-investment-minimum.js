import "dotenv/config";
import { prisma } from "../src/config/prisma.js";

const MIN_INVESTMENT_AMOUNT = 50_000_000;

try {
  const result = await prisma.investment.updateMany({
    where: {
      isDeleted: false,
      amount: { lt: MIN_INVESTMENT_AMOUNT },
    },
    data: { amount: MIN_INVESTMENT_AMOUNT },
  });

  console.log(
    `Set ${result.count} active investment record(s) below 0.5억 원 to the 0.5억 원 minimum.`
  );
} finally {
  await prisma.$disconnect();
}
