import { loadConfig, loadEnvFiles } from '../../src/config.js';
import { createRedis } from '../../src/redis/client.js';
import { SALE_KEYS } from '../../src/redis/keys.js';
import { applySeed, flushSaleKeys } from '../../src/redis/seed.js';

loadEnvFiles();

const TARGET_URL = process.env.TARGET_URL ?? 'http://localhost:3000';
const STRESS_CONCURRENCY = Number(process.env.STRESS_CONCURRENCY ?? 5000);
const STRESS_STOCK = Number(process.env.STRESS_STOCK ?? 100);
const STRESS_DUPLICATE_RATIO = Number(process.env.STRESS_DUPLICATE_RATIO ?? 0.2);

interface PurchaseBody {
  success?: boolean;
  error?: string;
}

function generateUserIds(concurrency: number, duplicateRatio: number): string[] {
  const uniqueCount = Math.max(1, Math.round(concurrency * (1 - duplicateRatio)));
  const ids: string[] = [];
  for (let i = 0; i < uniqueCount; i += 1) {
    ids.push(`user_${i}@stress.test`);
  }
  while (ids.length < concurrency) {
    const reuseIndex = ids.length % uniqueCount;
    ids.push(`user_${reuseIndex}@stress.test`);
  }
  return ids;
}

async function reseed(redis: Awaited<ReturnType<typeof createRedis>>): Promise<void> {
  const now = Date.now();
  await flushSaleKeys(redis);
  await applySeed(redis, {
    startTimeMs: now - 60_000,
    endTimeMs: now + 3_600_000,
    totalStock: STRESS_STOCK,
  });
}

async function main(): Promise<void> {
  const health = await fetch(`${TARGET_URL}/health`).catch(() => null);
  if (!health?.ok) {
    throw new Error(
      `API is not reachable at ${TARGET_URL}. Start it with \`npm run dev\` (Upstash credentials in .env).`,
    );
  }

  const redis = await createRedis(loadConfig().redisUrl);
  await reseed(redis);

  const userIds = generateUserIds(STRESS_CONCURRENCY, STRESS_DUPLICATE_RATIO);
  const started = Date.now();

  const requests = userIds.map((userId) =>
    fetch(`${TARGET_URL}/api/sale/purchase`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then(async (response) => {
      const body = (await response.json()) as PurchaseBody;
      return { status: response.status, body, userId };
    }),
  );

  const results = await Promise.all(requests);
  const elapsedMs = Date.now() - started;

  let successCount = 0;
  let soldOutCount = 0;
  let alreadyPurchasedCount = 0;
  let notStartedCount = 0;
  let endedCount = 0;
  let errorCount = 0;
  const successfulUsers = new Set<string>();

  for (const result of results) {
    if (result.status === 201 && result.body.success) {
      successCount += 1;
      successfulUsers.add(result.userId);
      continue;
    }
    switch (result.body.error) {
      case 'SOLD_OUT':
        soldOutCount += 1;
        break;
      case 'ALREADY_PURCHASED':
        alreadyPurchasedCount += 1;
        break;
      case 'SALE_NOT_STARTED':
        notStartedCount += 1;
        break;
      case 'SALE_ENDED':
        endedCount += 1;
        break;
      default:
        errorCount += 1;
    }
  }

  const remainingStock = Number(await redis.get(SALE_KEYS.stock));
  const purchaserCount = await redis.scard(SALE_KEYS.purchasers);
  await redis.quit();

  const accounted = successCount + soldOutCount + alreadyPurchasedCount;
  const rps = (STRESS_CONCURRENCY / elapsedMs) * 1000;

  console.log(`
Flash sale stress test
----------------------
target              ${TARGET_URL}
concurrency         ${STRESS_CONCURRENCY}
stock               ${STRESS_STOCK}
duplicate ratio     ${STRESS_DUPLICATE_RATIO}

success             ${successCount}
sold out            ${soldOutCount}
already purchased   ${alreadyPurchasedCount}
not started         ${notStartedCount}
ended               ${endedCount}
other errors        ${errorCount}

final stock         ${remainingStock}
purchaser set size  ${purchaserCount}
unique successes    ${successfulUsers.size}

duration            ${elapsedMs} ms
throughput          ${rps.toFixed(0)} req/s
`);

  const failures: string[] = [];
  if (successCount !== STRESS_STOCK) {
    failures.push(`successCount (${successCount}) !== stock (${STRESS_STOCK})`);
  }
  if (successfulUsers.size !== successCount) {
    failures.push(
      `a user succeeded more than once (${successfulUsers.size} unique vs ${successCount} successes)`,
    );
  }
  if (remainingStock !== 0) {
    failures.push(`sale:stock is ${remainingStock}, expected 0`);
  }
  if (purchaserCount !== STRESS_STOCK) {
    failures.push(`SCARD sale:purchasers is ${purchaserCount}, expected ${STRESS_STOCK}`);
  }
  if (accounted !== STRESS_CONCURRENCY) {
    failures.push(
      `success + soldOut + alreadyPurchased (${accounted}) !== concurrency (${STRESS_CONCURRENCY})`,
    );
  }

  if (failures.length > 0) {
    console.error('Assertions failed:');
    for (const failure of failures) {
      console.error(`  - ${failure}`);
    }
    process.exit(1);
  }

  console.log('Assertions passed.');
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
