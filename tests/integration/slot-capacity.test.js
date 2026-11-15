import test from "node:test";
import assert from "node:assert/strict";
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client.ts";

const connectionString = process.env.TEST_DATABASE_URL;
test("only one concurrent request reserves the final delivery place", { skip: !connectionString && "Set TEST_DATABASE_URL to a migrated, disposable PostgreSQL database." }, async () => {
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  let slot;
  try {
    slot = await db.deliverySlot.create({ data: { startsAt: new Date(Date.now() + 3600_000), endsAt: new Date(Date.now() + 7200_000), capacity: 1, reservedCount: 0, areaCode: "000000" } });
    const results = await Promise.all([1, 2].map(() => db.$transaction(async (tx) => {
      const changed = await tx.$executeRaw`UPDATE "DeliverySlot" SET "reservedCount" = "reservedCount" + 1 WHERE "id" = ${slot.id} AND "reservedCount" < "capacity"`;
      return changed === 1;
    })));
    assert.equal(results.filter(Boolean).length, 1);
    const final = await db.deliverySlot.findUniqueOrThrow({ where: { id: slot.id } });
    assert.equal(final.reservedCount, 1);
  } finally {
    if (slot) await db.deliverySlot.delete({ where: { id: slot.id } });
    await db.$disconnect();
  }
});
