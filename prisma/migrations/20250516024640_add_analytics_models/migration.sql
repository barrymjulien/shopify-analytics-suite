-- CreateTable
CREATE TABLE "AnalyticsCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "metricType" TEXT NOT NULL,
    "metricData" TEXT NOT NULL,
    "calculatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomerProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "clvScore" REAL,
    "totalOrders" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" REAL NOT NULL DEFAULT 0,
    "lastOrderDate" DATETIME,
    "segment" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "RevenueMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "revenue" REAL NOT NULL,
    "orderCount" INTEGER NOT NULL,
    "avgOrderValue" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "AnalyticsCache_shop_metricType_idx" ON "AnalyticsCache"("shop", "metricType");

-- CreateIndex
CREATE UNIQUE INDEX "AnalyticsCache_shop_metricType_key" ON "AnalyticsCache"("shop", "metricType");

-- CreateIndex
CREATE INDEX "CustomerProfile_shop_customerId_idx" ON "CustomerProfile"("shop", "customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerProfile_shop_customerId_key" ON "CustomerProfile"("shop", "customerId");

-- CreateIndex
CREATE INDEX "RevenueMetric_shop_date_idx" ON "RevenueMetric"("shop", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RevenueMetric_shop_date_key" ON "RevenueMetric"("shop", "date");
