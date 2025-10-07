-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "price" REAL NOT NULL,
    "compare_price" REAL,
    "cost_price" REAL,
    "track_inventory" BOOLEAN NOT NULL DEFAULT true,
    "inventory_quantity" INTEGER NOT NULL DEFAULT 0,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "allow_backorder" BOOLEAN NOT NULL DEFAULT false,
    "weight" REAL,
    "category_id" TEXT,
    "brand_id" TEXT,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "avg_rating" REAL DEFAULT 0,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "requires_shipping" BOOLEAN NOT NULL DEFAULT true,
    "is_digital" BOOLEAN NOT NULL DEFAULT false,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "products_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "brands" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_products" ("allow_backorder", "barcode", "brand_id", "category_id", "compare_price", "cost_price", "created_at", "description", "featured", "id", "inventory_quantity", "is_digital", "low_stock_threshold", "meta_description", "meta_title", "name", "price", "published_at", "requires_shipping", "short_description", "sku", "slug", "status", "track_inventory", "updated_at", "weight") SELECT "allow_backorder", "barcode", "brand_id", "category_id", "compare_price", "cost_price", "created_at", "description", "featured", "id", "inventory_quantity", "is_digital", "low_stock_threshold", "meta_description", "meta_title", "name", "price", "published_at", "requires_shipping", "short_description", "sku", "slug", "status", "track_inventory", "updated_at", "weight" FROM "products";
DROP TABLE "products";
ALTER TABLE "new_products" RENAME TO "products";
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
