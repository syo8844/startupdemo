-- Replace totals previously overwritten by virtual investments with stable demo-only values.
UPDATE "Corp"
SET "total_investment" =
  100000000 + MOD(ABS(HASHTEXT("id")::BIGINT), 500000001);
