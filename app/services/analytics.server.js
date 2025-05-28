import { prisma } from "../db.server";
import { format, subDays } from "date-fns";
import { mean } from "simple-statistics";
import { analyticsLogger } from "./loggerService"; // Removed eventLogger import

export class AnalyticsService {
  constructor(shop, accessToken) {
    this.shop = shop;
    this.accessToken = accessToken;
  }

  /**
   * Calculate basic revenue metrics
   */
  async getRevenueOverview(days = 30) {
    const cacheKey = `revenue_overview_${days}`;
    
    // Check cache first
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Fetch orders from Shopify
    const orders = await this.fetchOrders(days);
    
    // Calculate metrics
    const currentPeriodOrders = this.filterOrdersForPeriod(orders, days, 0);
    const previousPeriodOrders = this.filterOrdersForPeriod(orders, days, 1); // 1 for one period ago

    const metrics = {
      totalRevenue: this.calculateTotalRevenue(currentPeriodOrders),
      averageOrderValue: this.calculateAOV(currentPeriodOrders),
      orderCount: currentPeriodOrders.length,
      conversionRate: await this.calculateConversionRate(currentPeriodOrders, days),
      topProducts: this.getTopProducts(currentPeriodOrders),
      revenueByDay: this.groupRevenueByDay(currentPeriodOrders),
      previousPeriodRevenueByDay: this.groupRevenueByDay(previousPeriodOrders), // Added for comparison
      periodComparison: this.comparePeriods(currentPeriodOrders, previousPeriodOrders) // Modified to take filtered orders
    };

    // Cache results
    await this.setCache(cacheKey, metrics, 3600); // 1 hour cache
    
    return metrics;
  }

  /**
   * Enhanced cache retrieval with stale-while-revalidate support
   */
  async getCache(key, options = {}) {
    try {
      const cache = await prisma.analyticsCache.findUnique({
        where: {
          shop_metricType: {
            shop: this.shop,
            metricType: key
          }
        }
      });
      
      if (!cache) return null;
      
      const now = new Date();
      const cacheAge = (now - cache.calculatedAt) / 1000; // age in seconds
      const isExpired = now > new Date(cache.expiresAt);
      const isStale = options.maxStaleness ? cacheAge > options.maxStaleness : isExpired;
      
      // Return enhanced cache format with metadata
      const data = cache.metricData ? JSON.parse(cache.metricData) : null;
      
      if (isExpired && !options.maxStaleness) {
        return null; // Cache is expired and no staleness tolerance
      }
      
      if (isStale && !options.ignoreErrors) {
        // Trigger background refresh
        this.triggerBackgroundRefresh(key, cache);
      }
      
      return {
        data,
        metadata: {
          version: '1.0',
          generatedAt: cache.calculatedAt,
          expiresAt: cache.expiresAt,
          isStale
        }
      };
    } catch (error) {
      analyticsLogger.error('Enhanced cache read error:', error, {
        shop: this.shop,
        metricType: key
      });
      return options.ignoreErrors ? null : Promise.reject(error);
    }
  }

  /**
   * Trigger background refresh of cache
   */
  async triggerBackgroundRefresh(key, cache) {
    // This runs in background without blocking
    setImmediate(async () => {
      try {
        analyticsLogger.info(`Background refresh triggered for ${key}`, { shop: this.shop });
        
        // Determine what to refresh based on key
        if (key.startsWith('revenue_overview_')) {
          const days = parseInt(key.split('_')[2]);
          await this.getRevenueOverview(days);
        } else if (key === 'clv_all_customers') {
          await this.calculateCLV();
        }
      } catch (error) {
        analyticsLogger.error('Background refresh failed:', error, {
          shop: this.shop,
          key
        });
      }
    });
  }

  /**
   * Get data type from cache key
   */
  getDataTypeFromKey(key) {
    if (key.includes('revenue')) return 'revenue';
    if (key.includes('clv')) return 'customer';
    if (key.includes('forecast')) return 'forecast';
    return 'general';
  }

  /**
   * Count data points for cache metadata
   */
  countDataPoints(data) {
    if (Array.isArray(data)) return data.length;
    if (data && typeof data === 'object') {
      return Object.keys(data).length;
    }
    return 1;
  }

  /**
   * Prefetch common caches
   */
  async prefetchCommonCaches() {
    try {
      // Prefetch in background
      setImmediate(async () => {
        await Promise.allSettled([
          this.getRevenueOverview(30),
          this.calculateCLV()
        ]);
      });
    } catch (error) {
      analyticsLogger.error('Prefetch error:', error, { shop: this.shop });
    }
  }

  /**
   * Clean up expired caches
   */
  async cleanupExpiredCaches() {
    try {
      const deleted = await prisma.analyticsCache.deleteMany({
        where: {
          shop: this.shop,
          expiresAt: {
            lt: new Date()
          }
        }
      });
      
      analyticsLogger.info('Cleaned up expired caches', {
        shop: this.shop,
        deletedCount: deleted.count
      });
    } catch (error) {
      analyticsLogger.error('Cache cleanup error:', error, { shop: this.shop });
    }
  }

  /**
   * Cache TTL constants
   */
  static CACHE_TTL = {
    REVENUE_DASHBOARD: 3600,      // 1 hour
    CUSTOMER_SEGMENTS: 7200,      // 2 hours
    CLV_DATA: 14400,              // 4 hours
    FORECAST_DATA: 86400,         // 24 hours
    HISTORICAL_DATA: 604800,      // 1 week
    DEFAULT: 1800                 // 30 minutes
  };

  /**
   * Calculate Customer Lifetime Value
   */
  async calculateCLV(customerId = null) {
    const cacheKey = customerId 
      ? `clv_customer_${customerId}` 
      : `clv_all_customers`;
    
    // Check cache
    const cached = await this.getCache(cacheKey);
    if (cached) return cached;

    // Fetch customer orders
    const orders = customerId 
      ? await this.fetchCustomerOrders(customerId)
      : await this.fetchOrders(365); // Last year for all customers

    // Group by customer
    const customerData = this.groupOrdersByCustomer(orders);
    
    // Calculate CLV metrics
    const clvData = Object.entries(customerData).map(([id, data]) => {
      const metrics = this.calculateCustomerMetrics(data);
      return {
        customerId: id,
        customerName: data.customer?.first_name + ' ' + data.customer?.last_name,
        email: data.customer?.email,
        totalSpent: metrics.totalSpent,
        orderCount: metrics.orderCount,
        avgOrderValue: metrics.avgOrderValue,
        daysSinceFirstOrder: metrics.daysSinceFirstOrder,
        daysSinceLastOrder: metrics.daysSinceLastOrder,
        predictedCLV: this.predictCLV(metrics),
        segment: this.assignSegment(metrics)
      };
    });

    // Sort by CLV
    clvData.sort((a, b) => b.predictedCLV - a.predictedCLV);

    // Handle empty data case
    const result = {
      customers: customerId ? clvData.filter(c => c.customerId === customerId) : clvData,
      summary: {
        averageCLV: clvData.length > 0 ? mean(clvData.map(c => c.predictedCLV)) : 0,
        topSegments: this.summarizeSegments(clvData)
      }
    };

    // Cache results
    await this.setCache(cacheKey, result, 7200); // 2 hour cache
    
    // Store in database
    await this.updateCustomerProfiles(clvData);
    
    return result;
  }

  /**
   * Helper: Fetch orders from Shopify
   */
  async fetchOrders(days) {
    try {
      const since = format(subDays(new Date(), days), 'yyyy-MM-dd');
      const response = await fetch(
        `https://${this.shop}/admin/api/2024-01/orders.json?status=paid&created_at_min=${since}&limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        analyticsLogger.error(`Failed to fetch orders: ${response.status} ${response.statusText}`, null, {
          shop: this.shop,
          days
        });
        return [];
      }
      
      const data = await response.json();
      
      // Filter out any malformed orders or draft orders with incomplete data
      const validOrders = (data.orders || []).filter(order => 
        order && 
        order.id && 
        (order.total_price !== undefined && !isNaN(parseFloat(order.total_price)))
      );
      
      return validOrders;
    } catch (error) {
      analyticsLogger.error('Error fetching orders:', error, {
        shop: this.shop,
        days
      });
      return [];
    }
  }

  /**
   * Helper: Calculate total revenue
   */
  calculateTotalRevenue(orders) {
    return orders.reduce((sum, order) => 
      sum + parseFloat(order.total_price || 0), 0
    );
  }

  /**
   * Helper: Calculate Average Order Value
   */
  calculateAOV(orders) {
    if (orders.length === 0) return 0;
    return this.calculateTotalRevenue(orders) / orders.length;
  }

  /**
   * Helper: Group revenue by day
   */
  groupRevenueByDay(orders) {
    try {
      // If no orders, provide sample data to avoid empty charts
      if (!orders || orders.length === 0) {
        const today = new Date();
        const sampleData = [];
        
        // Generate 30 days of sample data (all zeros)
        for (let i = 29; i >= 0; i--) {
          const date = format(subDays(today, i), 'yyyy-MM-dd');
          sampleData.push({ date, revenue: 0 });
        }
        
        return sampleData;
      }
      
      const revenueByDay = {};
      
      orders.forEach(order => {
        try {
          // Ensure order.created_at exists and is valid
          if (!order.created_at) return;
          
          const orderDate = new Date(order.created_at);
          if (isNaN(orderDate.getTime())) return; // Skip invalid dates
          
          const day = format(orderDate, 'yyyy-MM-dd');
          if (!revenueByDay[day]) {
            revenueByDay[day] = 0;
          }
          
          // Ensure price is a valid number
          const price = parseFloat(order.total_price || 0);
          if (!isNaN(price)) {
            revenueByDay[day] += price;
          }
        } catch (err) {
          analyticsLogger.error('Error processing order for revenue by day:', err, {
            shop: this.shop,
            orderId: order.id || 'unknown'
          });
          // Continue processing other orders
        }
      });
      
      // Create a sorted array of date-revenue pairs
      return Object.entries(revenueByDay)
        .map(([date, revenue]) => ({ date, revenue }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));
    } catch (error) {
      analyticsLogger.error('Error grouping revenue by day:', error, {
        shop: this.shop
      });
      // Return empty sample data as fallback
      const today = new Date();
      return Array.from({length: 30}, (_, i) => ({
        date: format(subDays(today, 29 - i), 'yyyy-MM-dd'),
        revenue: 0
      }));
    }
  }

  /**
   * Helper: Simple CLV prediction
   * Based on RFM (Recency, Frequency, Monetary) analysis
   */
  predictCLV(metrics) {
    const {
      totalSpent,
      orderCount,
      avgOrderValue,
      daysSinceLastOrder,
      daysSinceFirstOrder
    } = metrics;
    
    // Calculate purchase frequency (orders per month)
    const monthsActive = Math.max(daysSinceFirstOrder / 30, 1);
    const purchaseFrequency = orderCount / monthsActive;
    
    // Recency score (inverse of days since last order)
    const recencyScore = Math.max(0, 100 - daysSinceLastOrder);
    
    // Simple CLV formula
    // CLV = AOV × Purchase Frequency × Customer Lifespan × Retention Factor
    const expectedLifespan = 24; // months
    const retentionFactor = recencyScore / 100;
    
    const predictedCLV = avgOrderValue * purchaseFrequency * expectedLifespan * retentionFactor;
    
    return Math.round(predictedCLV);
  }

  /**
   * Helper: Assign customer segment
   */
  assignSegment(metrics) {
    const { totalSpent, orderCount, daysSinceLastOrder } = metrics;
    
    if (orderCount === 1) return "New Customer";
    if (daysSinceLastOrder > 180) return "At Risk";
    if (daysSinceLastOrder > 90) return "Needs Attention";
    if (totalSpent > 1000 && orderCount > 5) return "VIP";
    if (orderCount > 3) return "Loyal";
    return "Promising";
  }

  // The setCache method is defined above with the enhanced getCache.
  // The older getCache method that was here has been removed by a previous step or was not present.

  /**
   * Helper: Update customer profiles in DB
   */
  async updateCustomerProfiles(clvData) {
    // Use a transaction to batch update all customer profiles
    try {
      await prisma.$transaction(
        clvData.map(customer => 
          prisma.customerProfile.upsert({
            where: {
              shop_customerId: {
                shop: this.shop,
                customerId: customer.customerId
              }
            },
            update: {
              clvScore: customer.predictedCLV,
              totalOrders: customer.orderCount,
              totalSpent: customer.totalSpent,
              lastOrderDate: customer.lastOrderDate ? new Date(customer.lastOrderDate) : null,
              segment: customer.segment
            },
            create: {
              shop: this.shop,
              customerId: customer.customerId,
              clvScore: customer.predictedCLV,
              totalOrders: customer.orderCount,
              totalSpent: customer.totalSpent,
              lastOrderDate: customer.lastOrderDate ? new Date(customer.lastOrderDate) : null,
              segment: customer.segment
            }
          })
        )
      );
    } catch (error) {
      analyticsLogger.error('Batch profile update error:', error, {
        shop: this.shop,
        customerCount: clvData.length
      });
    }
  }

  /**
   * Helper: Group orders by customer
   */
  groupOrdersByCustomer(orders) {
    return orders.reduce((customers, order) => {
      const customerId = order.customer?.id;
      if (!customerId) return customers;
      
      if (!customers[customerId]) {
        customers[customerId] = {
          customer: order.customer,
          orders: []
        };
      }
      
      customers[customerId].orders.push(order);
      return customers;
    }, {});
  }

  /**
   * Helper: Calculate customer metrics
   */
  calculateCustomerMetrics(data) {
    const orders = data.orders || [];
    
    if (orders.length === 0) {
      return {
        totalSpent: 0,
        orderCount: 0,
        avgOrderValue: 0,
        daysSinceFirstOrder: 0,
        daysSinceLastOrder: 0
      };
    }
    
    // Sort orders by date (newest first)
    orders.sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    const totalSpent = orders.reduce((sum, order) => 
      sum + parseFloat(order.total_price || 0), 0
    );
    
    const avgOrderValue = totalSpent / orders.length;
    const now = new Date();
    
    const firstOrderDate = new Date(orders[orders.length - 1].created_at);
    const lastOrderDate = new Date(orders[0].created_at);
    
    const daysSinceFirstOrder = Math.round((now - firstOrderDate) / (1000 * 60 * 60 * 24));
    const daysSinceLastOrder = Math.round((now - lastOrderDate) / (1000 * 60 * 60 * 24));
    
    return {
      totalSpent,
      orderCount: orders.length,
      avgOrderValue,
      daysSinceFirstOrder,
      daysSinceLastOrder,
      firstOrderDate,
      lastOrderDate
    };
  }

  /**
   * Helper: Compare current period with previous
   */
  filterOrdersForPeriod(allOrders, days, periodsAgo = 0) {
    const now = new Date();
    const periodEnd = subDays(now, days * periodsAgo);
    const periodStart = subDays(periodEnd, days);

    return allOrders.filter(order => {
      const orderDate = new Date(order.created_at);
      return orderDate >= periodStart && orderDate < periodEnd; // Use < periodEnd for non-overlapping
    });
  }

  comparePeriods(currentOrders, previousOrders) { // Modified to accept pre-filtered orders
    const currentRevenue = this.calculateTotalRevenue(currentOrders);
    const previousRevenue = this.calculateTotalRevenue(previousOrders);
    
    const currentAOV = this.calculateAOV(currentOrders);
    const previousAOV = this.calculateAOV(previousOrders);
    
    // Calculate trends (percentage change)
    const calculateTrend = (current, previous) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Math.round(((current - previous) / previous) * 100);
    };
    
    return {
      revenueTrend: calculateTrend(currentRevenue, previousRevenue),
      orderTrend: calculateTrend(currentOrders.length, previousOrders.length),
      aovTrend: calculateTrend(currentAOV, previousAOV)
    };
  }

  /**
   * Helper: Fetch customer orders
   */
  async fetchCustomerOrders(customerId) {
    try {
      const response = await fetch(
        `https://${this.shop}/admin/api/2024-01/customers/${customerId}/orders.json?status=paid&limit=250`,
        {
          headers: {
            'X-Shopify-Access-Token': this.accessToken,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.ok) {
        analyticsLogger.error(`Failed to fetch customer orders: ${response.status} ${response.statusText}`, null, {
          shop: this.shop,
          customerId
        });
        return [];
      }
      
      const data = await response.json();
      
      // Filter out any malformed orders or draft orders with incomplete data
      const validOrders = (data.orders || []).filter(order => 
        order && 
        order.id && 
        (order.total_price !== undefined && !isNaN(parseFloat(order.total_price)))
      );
      
      return validOrders;
    } catch (error) {
      analyticsLogger.error('Error fetching customer orders:', error, {
        shop: this.shop,
        customerId
      });
      return [];
    }
  }

  /**
   * Helper: Get top products from orders
   */
  getTopProducts(orders) {
    const products = {};
    
    orders.forEach(order => {
      (order.line_items || []).forEach(item => {
        const productId = item.product_id;
        if (!productId) return;
        
        if (!products[productId]) {
          products[productId] = {
            id: productId,
            title: item.title,
            units: 0,
            revenue: 0
          };
        }
        
        products[productId].units += item.quantity || 0;
        products[productId].revenue += parseFloat(item.price) * item.quantity || 0;
      });
    });
    
    return Object.values(products)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }

  /**
   * Helper: Calculate conversion rate
   */
  async calculateConversionRate(orders, days) {
    try {
      // This would normally fetch session/visitor data
      // For MVP, we'll return a simulated conversion rate between 1-5%
      return Math.random() * 4 + 1;
    } catch (error) {
      analyticsLogger.error('Conversion rate calculation error:', error, {
        shop: this.shop,
        days
      });
      return null;
    }
  }

  /**
   * Helper: Summarize customer segments
   */
  summarizeSegments(clvData) {
    // If no data, return default segments with zero counts
    if (!clvData || clvData.length === 0) {
      return [
        { name: "VIP", count: 0 },
        { name: "Loyal", count: 0 },
        { name: "Promising", count: 0 },
        { name: "New Customer", count: 0 },
        { name: "At Risk", count: 0 }
      ];
    }
    
    const segments = {};
    
    clvData.forEach(customer => {
      const segment = customer.segment;
      if (!segments[segment]) {
        segments[segment] = { name: segment, count: 0 };
      }
      segments[segment].count++;
    });
    
    return Object.values(segments).sort((a, b) => b.count - a.count);
  }
}
