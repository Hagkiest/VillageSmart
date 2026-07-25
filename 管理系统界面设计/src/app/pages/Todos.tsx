import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { deleteJson, fetchJson, postJson, putJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type TodoRow = {
  id: number;
  seq: number;
  title: string;
  content: string;
  reminder_type: string;
  progress: string;
  status: string;
  reminder_at: string;
  reminder_display: string;
  is_read: boolean;
  is_due: boolean;
  notes: string;
  created_at: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Stats = {
  total_count: number;
  unread_count: number;
  read_count: number;
  task_count: number;
  due_count: number;
};

function StatBlock({
  label,
  value,
  bg,
  valueColor,
  borderLeft,
}: {
  label: string;
  value: number;
  bg: string;
  valueColor?: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      className="flex-1 px-6 py-4"
      style={{
        background: bg,
        borderLeft: borderLeft ? "1px solid #e4e7ed" : undefined,
      }}
    >
      <p className="mb-1.5 text-xs" style={{ color: "#909399" }}>{label}</p>
      <p className="text-2xl font-semibold" style={{ color: valueColor ?? "#303133" }}>
        {value}
      </p>
    </div>
  );
}

const VIEW_OPTIONS = ["全部", "未读", "任务", "事件", "系统"];
const TYPE_OPTIONS = ["", "任务", "事件", "系统"];
const STATUS_OPTIONS = ["", "未读", "已读", "已完成"];
const TODO_SUMMARY_EVENT = "todo-summary-changed";

export function Todos() {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeView, setActiveView] = useState("全部");
  const [items, setItems] = useState<TodoRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [stats, setStats] = useState<Stats>({ total_count: 0, unread_count: 0, read_count: 0, task_count: 0, due_count: 0 });
  const [filters, setFilters] = useState({ keyword: "", reminder_type: "", status: "" });
  const [submittedFilters, setSubmittedFilters] = useState({ keyword: "", reminder_type: "", status: "" });
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState((location.state as { message?: string } | null)?.message ?? "");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: TodoRow[]; pagination: Pagination; stats: Stats }>("/api/todos/", {
      params: {
        ...submittedFilters,
        view: activeView,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setStats(payload.stats || { total_count: 0, unread_count: 0, read_count: 0, task_count: 0, due_count: 0 });
        setSelectedIds([]);
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [activeView, pagination.page, pagination.page_size, submittedFilters, refreshKey]);

  const reloadFirstPage = () => {
    setPagination((current) => (current.page === 1 ? current : { ...current, page: 1 }));
    setRefreshKey((current) => current + 1);
  };

  const refreshList = () => {
    setRefreshKey((current) => current + 1);
  };

  const notifyTodoSummaryChanged = () => {
    window.dispatchEvent(new Event(TODO_SUMMARY_EVENT));
  };

  const displayItems = useMemo(
    () =>
      [...items].sort((left, right) => {
        if (left.is_read !== right.is_read) {
          return Number(left.is_read) - Number(right.is_read);
        }
        return 0;
      }),
    [items],
  );

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const next = { keyword: "", reminder_type: "", status: "" };
    setFilters(next);
    setSubmittedFilters(next);
    setActiveView("全部");
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item.id));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const handleBulkRead = async (isRead: boolean) => {
    if (!selectedIds.length) {
      return;
    }
    try {
      const payload = await postJson<{ message: string }>("/api/todos/bulk-read/", { ids: selectedIds, is_read: isRead });
      setSuccessMessage(payload.message);
      reloadFirstPage();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleQuickRead = async (item: TodoRow, isRead: boolean) => {
    try {
      const payload = {
        title: item.title,
        content: item.content,
        reminder_type: item.reminder_type,
        progress: item.progress,
        reminder_at: item.reminder_at,
        notes: item.notes,
        is_read: isRead,
      };
      await putJson(`/api/todos/${item.id}/`, payload);
      setSuccessMessage(isRead ? "提醒已设为已读" : "提醒已设为未读");
      refreshList();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleQuickComplete = async (item: TodoRow) => {
    try {
      await putJson(`/api/todos/${item.id}/`, {
        title: item.title,
        content: item.content,
        reminder_type: item.reminder_type,
        progress: "已完成",
        reminder_at: item.reminder_at,
        notes: item.notes,
        is_read: true,
      });
      setSuccessMessage("提醒已完成");
      refreshList();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await dialog.confirm("确定要删除这条提醒吗？");
    if (!ok) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/todos/${id}/`);
      setSuccessMessage(payload.message);
      reloadFirstPage();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      return;
    }
    const ok2 = await dialog.confirm(`确定要删除选中的 ${selectedIds.length} 条提醒吗？`);
    if (!ok2) {
      return;
    }
    try {
      const payload = await postJson<{ message: string }>("/api/todos/bulk-delete/", { ids: selectedIds });
      setSuccessMessage(payload.message);
      reloadFirstPage();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const payload = await postJson<{ message: string }>("/api/todos/mark-all-read/", {
        ...submittedFilters,
        view: activeView,
      });
      setSuccessMessage(payload.message);
      reloadFirstPage();
      notifyTodoSummaryChanged();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      {(errorMessage || successMessage) && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded px-3 py-2 text-xs" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {successMessage}
            </div>
          )}
        </div>
      )}

      <div className="flex overflow-hidden rounded border" style={{ borderColor: "#e4e7ed", background: "#fff" }}>
        <StatBlock label="总提醒数" value={stats.total_count} bg="#ffffff" />
        <StatBlock label="未读" value={stats.unread_count} bg="#fff2f0" valueColor="#ff4d4f" borderLeft />
        <StatBlock label="已读" value={stats.read_count} bg="#f6ffed" valueColor="#52c41a" borderLeft />
        <StatBlock label="任务提醒" value={stats.task_count} bg="#ffffff" borderLeft />
      </div>

      <div className="rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>视图</span>
            <div className="flex gap-1">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    setActiveView(option);
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="rounded px-2.5 py-1 text-sm"
                  style={{
                    background: activeView === option ? "#1677ff" : "#fff",
                    color: activeView === option ? "#fff" : "#606266",
                    border: `1px solid ${activeView === option ? "#1677ff" : "#dcdfe6"}`,
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>关键词</span>
            <input
              value={filters.keyword}
              onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
              placeholder="标题/内容"
              className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", width: 160, background: "#fff", color: "#303133" }}
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>类型</span>
            <div className="relative" style={{ width: 108 }}>
              <select
                value={filters.reminder_type}
                onChange={(event) => setFilters((current) => ({ ...current, reminder_type: event.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: filters.reminder_type ? "#303133" : "#c0c4cc" }}
              >
                <option value="">全部类型</option>
                {TYPE_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>状态</span>
            <div className="relative" style={{ width: 108 }}>
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: filters.status ? "#303133" : "#c0c4cc" }}
              >
                <option value="">全部状态</option>
                {STATUS_OPTIONS.filter(Boolean).map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>

          <button type="button" onClick={handleSearch} className="rounded px-3 py-1.5 text-sm text-white" style={{ background: "#1677ff" }}>
            查询
          </button>
          <button type="button" onClick={handleReset} className="rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            重置
          </button>
          <button type="button" onClick={() => navigate("/todos/new")} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#52c41a" }}>
            <Plus style={{ width: 13, height: 13 }} />
            新增
          </button>
          <button type="button" onClick={() => void handleBulkRead(true)} disabled={!selectedIds.length} className="rounded px-3 py-1.5 text-sm disabled:opacity-50" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            批量已读
          </button>
          <button type="button" onClick={() => void handleBulkRead(false)} disabled={!selectedIds.length} className="rounded px-3 py-1.5 text-sm disabled:opacity-50" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            批量未读
          </button>
          <button type="button" onClick={handleBulkDelete} disabled={!selectedIds.length} className="rounded px-3 py-1.5 text-sm text-white disabled:opacity-50" style={{ background: "#ff4d4f" }}>
            批量删除
          </button>
          <button type="button" onClick={() => void handleMarkAllRead()} className="rounded px-3 py-1.5 text-sm text-white" style={{ background: "#52c41a" }}>
            全部已读
          </button>
        </div>

        <div className="overflow-x-auto px-5 pb-3 pt-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed", borderRadius: 4 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th className="px-3 py-2.5 text-left" style={{ borderBottom: "1px solid #e4e7ed", width: 40 }}>
                  <input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} className="cursor-pointer" style={{ accentColor: "#1677ff" }} />
                </th>
                {["标题", "内容", "类型", "进度", "状态", "创建时间", "操作"].map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left whitespace-nowrap"
                    style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    加载中...
                  </td>
                </tr>
              ) : displayItems.length ? (
                displayItems.map((item) => {
                  const isArchived = item.is_read || item.status === "已完成";
                  const textStyle = isArchived
                    ? { color: "#909399", textDecoration: "line-through" as const }
                    : { color: "#303133" };
                  return (
                  <tr key={item.id} style={{ background: item.is_due && !isArchived ? "#fff7e6" : isArchived ? "#fafafa" : "#fff" }}>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} className="cursor-pointer" style={{ accentColor: "#1677ff" }} />
                    </td>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0", minWidth: 180 }}>
                      <div className="font-medium" style={textStyle}>{item.title}</div>
                      {item.is_due && <div className="mt-1 text-xs" style={{ color: "#fa8c16" }}>已到提醒时间</div>}
                    </td>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0", minWidth: 240 }}>
                      <div className="line-clamp-2" style={isArchived ? { color: "#bfbfbf", textDecoration: "line-through" } : { color: "#606266" }}>{item.content || "-"}</div>
                      <div className="mt-1 text-xs" style={{ color: "#909399" }}>
                        提醒时间：{item.reminder_display || "未设置"}
                      </div>
                    </td>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0", color: isArchived ? "#bfbfbf" : "#303133" }}>{item.reminder_type}</td>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0", color: isArchived ? "#bfbfbf" : "#303133", textDecoration: isArchived ? "line-through" : undefined }}>{item.progress}</td>
                    <td className="px-3 py-3 align-top" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <span
                        className="inline-flex rounded px-2 py-0.5 text-xs"
                        style={{
                          background: item.status === "未读" ? "#fff2f0" : item.status === "已完成" ? "#f5f5f5" : "#f5f7fa",
                          color: item.status === "未读" ? "#ff4d4f" : item.status === "已完成" ? "#909399" : "#909399",
                          textDecoration: isArchived ? "line-through" : undefined,
                        }}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 align-top whitespace-nowrap" style={{ borderBottom: "1px solid #f0f0f0", color: isArchived ? "#bfbfbf" : "#606266" }}>{item.created_at}</td>
                    <td className="px-3 py-3 align-top whitespace-nowrap" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <div className="flex items-center gap-3 text-sm">
                        <button type="button" onClick={() => navigate(`/todos/${item.id}/detail`)} style={{ color: "#1677ff" }}>详情</button>
                        <button type="button" onClick={() => navigate(`/todos/${item.id}/edit`)} style={{ color: "#1677ff" }}>编辑</button>
                        {item.status !== "已完成" && (
                          <button type="button" onClick={() => void handleQuickComplete(item)} style={{ color: "#52c41a" }}>完成</button>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleQuickRead(item, !item.is_read)}
                          style={{ color: item.is_read ? "#fa8c16" : "#722ed1" }}
                        >
                          {item.is_read ? "未读" : "已读"}
                        </button>
                        <button type="button" onClick={() => void handleDelete(item.id)} style={{ color: "#ff4d4f" }}>删除</button>
                      </div>
                    </td>
                  </tr>
                );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-16 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    暂无数据
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-4 text-sm" style={{ color: "#606266" }}>
          <span>共{pagination.total}条</span>
          <div className="relative">
            <select
              value={`${pagination.page_size}`}
              onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))}
              className="rounded px-2 py-1 pr-6 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", color: "#303133", background: "#fff" }}
            >
              <option value="10">10条/页</option>
              <option value="20">20条/页</option>
              <option value="50">50条/页</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
          </div>
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:opacity-50"
            style={{ border: "1px solid #dcdfe6" }}
          >
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button className="flex h-7 w-7 items-center justify-center rounded text-sm text-white" style={{ background: "#1677ff" }}>
            {pagination.page}
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.total_pages || pagination.total_pages === 0}
            onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.total_pages || 1, current.page + 1) }))}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:opacity-50"
            style={{ border: "1px solid #dcdfe6" }}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
