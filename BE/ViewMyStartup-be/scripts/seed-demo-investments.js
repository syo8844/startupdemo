import "dotenv/config";
import bcrypt from "bcrypt";
import { randomInt, randomUUID } from "node:crypto";
import { prisma } from "../src/config/prisma.js";

const MIN_INVESTORS_PER_COMPANY = 5;
const DEMO_PASSWORD = "demo-investment";
const FAMILY_NAMES = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const GIVEN_NAMES = [
  "민준", "서연", "도윤", "지우", "하준", "서윤", "주원", "지민",
  "예준", "수아", "현우", "채원", "지호", "민서", "준서", "유진",
  "시우", "다은", "건우", "하은", "우진", "소율", "선우", "예린",
];
const COMMENTS = [
  "[샘플 투자] 성장 가능성을 응원합니다.",
  "[샘플 투자] 서비스의 시장성이 기대됩니다.",
  "[샘플 투자] 앞으로의 성장을 지켜보겠습니다.",
  "[샘플 투자] 좋은 팀과 제품이라고 생각합니다.",
  "[샘플 투자] 새로운 도전을 응원합니다.",
  "[샘플 투자] 꾸준한 성장을 기대합니다.",
];

const randomItem = (items) => items[randomInt(items.length)];

try {
  const companies = await prisma.corp.findMany({ select: { id: true } });
  const activeCounts = await prisma.investment.groupBy({
    by: ["corpId"],
    where: { corpId: { not: null }, isDeleted: false },
    _count: { _all: true },
  });
  const countByCorp = new Map(
    activeCounts.map(({ corpId, _count }) => [corpId, _count._all])
  );
  const password = await bcrypt.hash(DEMO_PASSWORD, 10);
  const records = [];

  for (const company of companies) {
    const missing = Math.max(
      0,
      MIN_INVESTORS_PER_COMPANY - (countByCorp.get(company.id) ?? 0)
    );
    const usedNames = new Set();

    for (let index = 0; index < missing; index += 1) {
      let name;
      do {
        name = `${randomItem(FAMILY_NAMES)}${randomItem(GIVEN_NAMES)}`;
      } while (usedNames.has(name));
      usedNames.add(name);

      records.push({
        id: randomUUID(),
        corpId: company.id,
        name,
        password,
        amount: randomInt(50_000_000, 1_500_000_001),
        amount_comment: randomItem(COMMENTS),
        isDeleted: false,
      });
    }
  }

  if (records.length > 0) {
    await prisma.investment.createMany({ data: records });
  }

  console.log(
    `Added ${records.length} sample investors across ${companies.length} companies; each now has at least ${MIN_INVESTORS_PER_COMPANY} active records.`
  );
} finally {
  await prisma.$disconnect();
}
