-- Rename stock states in place: the old top band "high_in_stock" becomes
-- "extra_in_stock", and "normal_in_stock" takes over the "high_in_stock" name.
-- SQLite stores Prisma enums as TEXT, so the rename is a value rewrite.
-- Order matters: freeing the "high_in_stock" label first keeps the two
-- renames from merging both old states into one.
UPDATE "LocationStock" SET "stockState" = 'extra_in_stock' WHERE "stockState" = 'high_in_stock';
UPDATE "LocationStock" SET "stockState" = 'high_in_stock' WHERE "stockState" = 'normal_in_stock';
UPDATE "StockThresholdsLocation" SET "state" = 'extra_in_stock' WHERE "state" = 'high_in_stock';
UPDATE "StockThresholdsLocation" SET "state" = 'high_in_stock' WHERE "state" = 'normal_in_stock';
