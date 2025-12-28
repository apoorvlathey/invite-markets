import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface SaleData {
  timestamp: string;
  priceUsdc: number;
  slug: string;
}

interface PriceChartProps {
  sales: SaleData[];
  gradientFrom: string;
  gradientTo: string;
  className?: string;
}

export function PriceChart({
  sales,
  gradientFrom,
  gradientTo,
  className,
}: PriceChartProps) {
  const chartData = useMemo(() => {
    if (!sales || sales.length === 0) return [];

    const sorted = [...sales].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return sorted.map((sale) => {
      const d = new Date(sale.timestamp);

      return {
        // numeric x value so each point is unique
        x: d.getTime(),
        // short label for XAxis
        date: d.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
        }),
        // full label for tooltip
        fullDate: d.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        // keep raw price to preserve curve shape
        price: sale.priceUsdc,
      };
    });
  }, [sales]);

  const stats = useMemo(() => {
    if (chartData.length === 0)
      return {
        avgPrice: 0,
        minPrice: 0,
        maxPrice: 0,
        totalSales: 0,
        priceChange: 0,
      };

    const prices = chartData.map((d) => d.price);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const totalSales = chartData.length;

    const priceChange =
      chartData.length > 1
        ? ((chartData[chartData.length - 1].price - chartData[0].price) /
            chartData[0].price) *
          100
        : 0;

    return {
      avgPrice: Math.round(avgPrice * 100) / 100,
      minPrice,
      maxPrice,
      totalSales,
      priceChange: Math.round(priceChange * 10) / 10,
    };
  }, [chartData]);

  if (chartData.length === 0) {
    return (
      <div
        className={`rounded-xl bg-zinc-950 border border-zinc-800 p-8 flex flex-col justify-center ${className || ""}`}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center">
            <svg
              className="w-6 h-6 text-zinc-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-1">
            No sales history yet
          </h3>
          <p className="text-xs text-zinc-500">
            Price history will appear after the first sale
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl bg-zinc-950 border border-zinc-800 overflow-hidden flex flex-col ${className || ""}`}
    >
      <div className="px-5 py-4 border-b border-zinc-800">
        <h3 className="text-lg font-bold text-white mb-3">Price History</h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Avg Price</div>
            <div className="text-lg font-bold text-white">
              ${stats.avgPrice}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Floor</div>
            <div className="text-lg font-bold text-emerald-400">
              ${stats.minPrice}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Peak</div>
            <div className="text-lg font-bold text-cyan-400">
              ${stats.maxPrice}
            </div>
          </div>

          <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-800 flex flex-col">
            <div className="text-xs text-zinc-500 mb-1">Total Sales</div>
            <div className="flex items-baseline gap-2">
              <div className="text-lg font-bold text-white">
                {stats.totalSales}
              </div>
              {stats.priceChange !== 0 && (
                <span
                  className={`text-xs font-semibold ${
                    stats.priceChange > 0
                      ? "text-emerald-400"
                      : "text-red-400"
                  }`}
                >
                  {stats.priceChange > 0 ? "+" : ""}
                  {stats.priceChange}%
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="p-5">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={gradientFrom} stopOpacity={0.3} />
                <stop offset="95%" stopColor={gradientTo} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="x"
              stroke="#71717a"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#71717a" }}
              tickFormatter={(_, index) =>
                chartData[index] ? chartData[index].date : ""
              }
            />
            <YAxis
              stroke="#71717a"
              style={{ fontSize: "12px" }}
              tick={{ fill: "#71717a" }}
              tickFormatter={(value) => `$${value.toFixed(2)}`}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;

                const data = payload[0].payload;
                return (
                  <div
                    style={{
                      backgroundColor: "#18181b",
                      border: "1px solid #3f3f46",
                      borderRadius: "8px",
                      padding: "8px 12px",
                      fontSize: "12px",
                    }}
                  >
                    <div style={{ color: "#a1a1aa", marginBottom: "4px" }}>
                      {data.fullDate}
                    </div>
                    <div style={{ color: "#06b6d4", fontWeight: 600 }}>
                      Price: ${data.price.toFixed(3)}
                    </div>
                  </div>
                );
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke={gradientFrom}
              strokeWidth={2}
              fill="url(#priceGradient)"
              dot={{
                fill: gradientFrom,
                strokeWidth: 2,
                r: 4,
                stroke: "#000",
              }}
              activeDot={{
                r: 6,
                fill: gradientFrom,
                stroke: "#000",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
