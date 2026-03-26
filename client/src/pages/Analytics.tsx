import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, Clock, Palette, BarChart3 } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

const PIE_COLORS = [
  "#e11d48", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6", "#f59e0b",
];

export default function Analytics() {
  const { data: stats, isLoading } = trpc.bracelet.stats.useQuery();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats || stats.totalCount === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
          Analytics
        </h1>
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No data yet</h3>
            <p className="text-muted-foreground text-sm">Add some bracelets to see your analytics.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const difficultyData = Object.entries(stats.difficultyDistribution).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const outcomeData = Object.entries(stats.outcomeDistribution).map(([name, value]) => ({
    name: name === "needs_improvement" ? "Needs Work" : name.charAt(0).toUpperCase() + name.slice(1),
    value,
  }));

  const monthlyData = Object.entries(stats.monthlyTrend)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({
      month,
      count,
    }));

  const ratingData = Object.entries(stats.ratingDistribution)
    .sort(([a], [b]) => parseInt(a) - parseInt(b))
    .map(([rating, count]) => ({
      rating: `${rating} Star${parseInt(rating) !== 1 ? "s" : ""}`,
      count,
    }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "var(--font-heading)" }}>
        Analytics
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalCount}</p>
                <p className="text-xs text-muted-foreground">Total Bracelets</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-2/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-chart-2" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.avgTimeMinutes >= 60
                    ? `${Math.floor(stats.avgTimeMinutes / 60)}h ${stats.avgTimeMinutes % 60}m`
                    : `${stats.avgTimeMinutes}m`}
                </p>
                <p className="text-xs text-muted-foreground">Avg. Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                <Palette className="h-5 w-5 text-chart-3" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.topColors.length}</p>
                <p className="text-xs text-muted-foreground">Colors Used</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-chart-5/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-chart-5" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.outcomeDistribution.perfect || 0}
                </p>
                <p className="text-xs text-muted-foreground">Perfect Results</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Most Used Colors</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.topColors.length > 0 ? (
              <div className="space-y-2">
                {stats.topColors.map((item, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-mono">{item.color}</span>
                        <span className="text-xs text-muted-foreground">{item.count}x</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(item.count / (stats.topColors[0]?.count || 1)) * 100}%`,
                            backgroundColor: item.color,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No color data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Difficulty Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Difficulty Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {difficultyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={difficultyData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name} (${value})`}
                  >
                    {difficultyData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No difficulty data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Monthly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="oklch(0.55 0.15 340)" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No trend data yet</p>
            )}
          </CardContent>
        </Card>

        {/* Rating Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Rating Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            {ratingData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ratingData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="rating" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="oklch(0.55 0.15 340)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No rating data yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Outcome Distribution */}
      {outcomeData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Outcome Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={outcomeData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="oklch(0.65 0.12 25)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
