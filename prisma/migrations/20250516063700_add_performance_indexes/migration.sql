-- Add indexes for performance optimization

-- Session indexes
CREATE INDEX "Session_shop_idx" ON "Session"("shop");
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- AnalyticsCache indexes
CREATE INDEX "AnalyticsCache_expiresAt_idx" ON "AnalyticsCache"("expiresAt");

-- CustomerProfile indexes
CREATE INDEX "CustomerProfile_shop_segment_idx" ON "CustomerProfile"("shop", "segment");
CREATE INDEX "CustomerProfile_shop_lastOrderDate_idx" ON "CustomerProfile"("shop", "lastOrderDate");
CREATE INDEX "CustomerProfile_shop_totalSpent_idx" ON "CustomerProfile"("shop", "totalSpent");

-- RevenueMetric indexes
CREATE INDEX "RevenueMetric_date_idx" ON "RevenueMetric"("date");
CREATE INDEX "RevenueMetric_shop_revenue_idx" ON "RevenueMetric"("shop", "revenue");

-- OnboardingState indexes
CREATE INDEX "OnboardingState_shop_idx" ON "OnboardingState"("shop");
CREATE INDEX "OnboardingState_completed_idx" ON "OnboardingState"("completed");
