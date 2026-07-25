import { useState, useEffect, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Users, Home as HomeIcon, Accessibility, Info, Image as ImageIcon } from "lucide-react";
import { fetchJson } from "../lib/api";
import { useNavigate } from "react-router";
import { getUISettings, subscribeUISettings } from "../lib/ui-settings";

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444'];
const TODO_SUMMARY_EVENT = "todo-summary-changed";

export function Home() {
  const [ageStructure, setAgeStructure] = useState<any>(null);
  const [totalResidents, setTotalResidents] = useState(0);
  const [lowIncomeCount, setLowIncomeCount] = useState(0);
  const [disabledCount, setDisabledCount] = useState(0);
  const [todoDueCount, setTodoDueCount] = useState(0);
  const [todoProgressData, setTodoProgressData] = useState([
    { name: "未开始", value: 0 },
    { name: "处理中", value: 0 },
    { name: "已完成", value: 0 },
  ]);
  const [disputeData, setDisputeData] = useState([
    { name: "1月", value: 0 },
    { name: "2月", value: 0 },
    { name: "3月", value: 0 },
    { name: "4月", value: 0 },
    { name: "5月", value: 0 },
    { name: "6月", value: 0 },
    { name: "7月", value: 0 },
    { name: "8月", value: 0 },
    { name: "9月", value: 0 },
    { name: "10月", value: 0 },
    { name: "11月", value: 0 },
    { name: "12月", value: 0 },
  ]);
  const [loading, setLoading] = useState(true);
  const [activeAgeGroup, setActiveAgeGroup] = useState<string | null>(null);
  const [uiSettings, setUiSettings] = useState(getUISettings());
  const navigate = useNavigate();
  const matterMax = useMemo(
    () => Math.max(...todoProgressData.map((item) => item.value), 1),
    [todoProgressData],
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => subscribeUISettings(setUiSettings), []);

  useEffect(() => {
    const handleTodoSummaryChanged = () => {
      void loadData();
    };
    window.addEventListener(TODO_SUMMARY_EVENT, handleTodoSummaryChanged);
    return () => window.removeEventListener(TODO_SUMMARY_EVENT, handleTodoSummaryChanged);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [data, todoSummary] = await Promise.all([
        fetchJson<any>("/api/population/age-structure/"),
        fetchJson<{
          due_count: number;
          not_started_count: number;
          in_progress_count: number;
          completed_count: number;
        }>("/api/todos/summary/"),
      ]);
      setAgeStructure(data);
      setTotalResidents(data.total);
      setLowIncomeCount(data.low_income_count || 0);
      setDisabledCount(data.disabled_count || 0);
      setTodoDueCount(todoSummary.due_count || 0);
      setTodoProgressData([
        { name: "未开始", value: todoSummary.not_started_count || 0 },
        { name: "处理中", value: todoSummary.in_progress_count || 0 },
        { name: "已完成", value: todoSummary.completed_count || 0 },
      ]);
      try {
        const trendData = await fetchJson<any>("/api/mediations/trend/");
        if (trendData && Array.isArray(trendData)) {
          setDisputeData(trendData);
        }
      } catch (e) {
        console.error("获取纠纷趋势失败", e);
      }
    } catch (error) {
      console.error("Failed to load population data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePieClick = (entry: any) => {
    setActiveAgeGroup(entry.name);
    navigate(`/residents?ageGroup=${encodeURIComponent(entry.name)}`);
  };

  return (
    <div className="space-y-4">
      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="居民总数"   
          value={totalResidents} 
          iconBg="#dbeafe" 
          iconColor="#3b82f6" 
          Icon={Users} 
        />
        <StatCard 
          title="低收入人数" 
          value={lowIncomeCount} 
          iconBg="#dcfce7" 
          iconColor="#22c55e" 
          Icon={HomeIcon} 
        />
        <StatCard 
          title="残疾人人数" 
          value={disabledCount} 
          iconBg="#dbeafe" 
          iconColor="#3b82f6" 
          Icon={Accessibility} 
        />
        <StatCard 
          title="通知提醒"   
          value={todoDueCount} 
          iconBg="#dcfce7" 
          iconColor="#22c55e" 
          Icon={Info} 
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 人口结构 – 交互式饼图 */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-600">人口结构</p>
            {activeAgeGroup && (
              <button
                onClick={() => setActiveAgeGroup(null)}
                className="text-xs text-blue-500 hover:text-blue-600"
              >
                重置
              </button>
            )}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center" style={{ height: 280 }}>
              <div className="text-sm text-gray-400">加载中...</div>
            </div>
          ) : ageStructure && ageStructure.groups ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={ageStructure.groups}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="count"
                  onClick={handlePieClick}
                  cursor="pointer"
                >
                  {ageStructure.groups.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={COLORS[index % COLORS.length]}
                      opacity={activeAgeGroup === null || activeAgeGroup === entry.name ? 1 : 0.4}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string, props: any) => [
                    `${value}人 (${props.payload.percentage}%)`,
                    name
                  ]}
                  contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  height={36}
                  iconType="circle"
                  formatter={(value) => (
                    <span className="text-xs text-gray-600">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center" style={{ height: 220 }}>
              <div
                className="rounded-full flex items-center justify-center"
                style={{ width: 140, height: 140, background: "#e5e7eb" }}
              >
                <span className="text-sm text-gray-400">暂无数据</span>
              </div>
            </div>
          )}
          
          {activeAgeGroup && (
            <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-600 text-center">
              点击查看 {activeAgeGroup} 居民列表
            </div>
          )}
        </div>

        {/* 事项进度 – explicit height on ResponsiveContainer */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-4">事项进度</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={todoProgressData} margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                allowDecimals={false}
                domain={[0, matterMax]}
              />
              <Tooltip
                cursor={{ fill: "#f9fafb" }}
                contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Bar dataKey="value" fill="#60a5fa" radius={[2, 2, 0, 0]} barSize={48} minPointSize={2} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* 纠纷处理趋势 – explicit height on ResponsiveContainer */}
        <div className="bg-white rounded border border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-4">纠纷处理趋势</p>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={disputeData} margin={{ top: 20, right: 10, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
              <XAxis
                dataKey="name"
                interval={0}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 11 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#9ca3af", fontSize: 12 }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{ borderRadius: 6, border: "1px solid #e5e7eb", fontSize: 12 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#60a5fa"
                strokeWidth={1.5}
                dot={{ fill: "#3b82f6", r: 4, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

      </div>

      <div className="bg-white rounded border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-sm text-gray-900 font-medium">村情概况</p>
            <p className="text-xs text-gray-400 mt-1">内容可在 系统设置 / 界面设置 中维护</p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_0.8fr] gap-4 items-start">
          <div
            className="rounded border px-4 py-4 text-sm leading-7 whitespace-pre-wrap"
            style={{ borderColor: "#ebeef5", color: "#606266", background: "#fafafa", minHeight: 220 }}
          >
            {uiSettings.villageOverview.trim()}
          </div>
          <div
            className="rounded border overflow-hidden flex items-center justify-center"
            style={{ borderColor: "#ebeef5", background: "#f5f7fa", minHeight: 220 }}
          >
            {uiSettings.villageImage ? (
              <img
                src={uiSettings.villageImage}
                alt="村情概况"
                className="w-full h-full object-cover"
                style={{ minHeight: 220 }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-gray-400 gap-2">
                <ImageIcon className="w-8 h-8" />
                <span className="text-sm">未配置栏目图片</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title, value, iconBg, iconColor, Icon,
}: {
  title: string; value: number; iconBg: string; iconColor: string; Icon: any;
}) {
  return (
    <div className="bg-white rounded border border-gray-200 p-4 flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}
      >
        <Icon style={{ width: 24, height: 24, color: iconColor }} />
      </div>
    </div>
  );
}
