import { useEffect, useState } from "react";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Search, Trash2 } from "lucide-react";
import { fetchJson, postJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type LogItem = {
  id: number;
  seq: number;
  time: string;
  operator: string;
  module: string;
  action: string;
  summary: string;
  target: string;
  result: string;
  detail: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type FilterOptions = {
  modules: string[];
  results: string[];
};

type OperationLogPayload = {
  items: LogItem[];
  pagination: Pagination;
  filter_options: FilterOptions;
};

type FilterState = {
  keyword: string;
  module: string;
  result: string;
  created_from: string;
  created_to: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  module: "",
  result: "",
  created_from: "",
  created_to: "",
};

function SelectField({
  value,
  options,
  placeholder,
  width = 120,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder: string;
  width?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative" style={{ width }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
        style={{ border: "1px solid #dcdfe6", background: "#fff", color: value ? "#303133" : "#c0c4cc" }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
    </div>
  );
}

export function OperationLog() {
  const [items, setItems] = useState<LogItem[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 20, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ modules: [], results: [] });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<OperationLogPayload>("/api/operation-logs/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setFilterOptions(payload.filter_options || { modules: [], results: [] });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, reloadSeed, submittedFilters]);

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSubmittedFilters(DEFAULT_FILTERS);
    setPagination((current) => ({ ...current, page: 1, page_size: 20 }));
  };

  const handleCleanup = async () => {
    const ok = await dialog.confirm("确定清理 90 天前的操作日志吗？");
    if (!ok) {
      return;
    }
    try {
      setErrorMessage("");
      const payload = await postJson<{ message: string }>("/api/operation-logs/cleanup/", { retention_days: 90 });
      setSuccessMessage(payload.message);
      setReloadSeed((current) => current + 1);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
      {(successMessage || errorMessage) && (
        <div className="space-y-2 px-5 pt-4">
          {successMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between px-5 pb-3 pt-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div>
          <h2 className="mb-1 text-sm font-medium" style={{ color: "#303133" }}>操作日志</h2>
          <p className="text-xs" style={{ color: "#909399" }}>记录关键增删改、导出和备份下载操作，默认只保留最近 90 天。</p>
        </div>
        <button
          type="button"
          onClick={handleCleanup}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded px-3 py-1.5 text-sm"
          style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
        >
          <Trash2 style={{ width: 13, height: 13 }} />
          清理过期日志
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-sm" style={{ color: "#606266" }}>关键词</span>
          <input
            value={filters.keyword}
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="操作人 / 摘要 / 对象"
            className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
            style={{ border: "1px solid #dcdfe6", width: 190, background: "#fff", color: "#303133" }}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-sm" style={{ color: "#606266" }}>模块</span>
          <SelectField
            value={filters.module}
            onChange={(value) => setFilters((current) => ({ ...current, module: value }))}
            placeholder="全部模块"
            options={filterOptions.modules}
            width={140}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-sm" style={{ color: "#606266" }}>结果</span>
          <SelectField
            value={filters.result}
            onChange={(value) => setFilters((current) => ({ ...current, result: value }))}
            placeholder="全部结果"
            options={filterOptions.results}
            width={100}
          />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-sm" style={{ color: "#606266" }}>日期</span>
          <div className="flex items-center gap-1 rounded px-2 py-1.5" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
            <Calendar style={{ width: 13, height: 13, color: "#c0c4cc" }} />
            <input
              type="date"
              value={filters.created_from}
              onChange={(event) => setFilters((current) => ({ ...current, created_from: event.target.value }))}
              className="bg-transparent text-sm focus:outline-none"
              style={{ color: "#303133" }}
            />
            <span className="text-sm" style={{ color: "#909399" }}>至</span>
            <input
              type="date"
              value={filters.created_to}
              onChange={(event) => setFilters((current) => ({ ...current, created_to: event.target.value }))}
              className="bg-transparent text-sm focus:outline-none"
              style={{ color: "#303133" }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white"
          style={{ background: "#1677ff" }}
        >
          <Search style={{ width: 13, height: 13 }} />
          查询
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm"
          style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}
        >
          <RotateCcw style={{ width: 13, height: 13 }} />
          重置
        </button>
      </div>

      <div className="overflow-x-auto px-5 pb-3 pt-3">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed", borderRadius: 4 }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["时间", "操作人", "模块", "操作", "摘要", "对象", "结果"].map((column) => (
                <th
                  key={column}
                  className="whitespace-nowrap px-3 py-2.5 text-left"
                  style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center" style={{ color: "#909399", fontSize: 13 }}>
                  正在加载日志...
                </td>
              </tr>
            ) : items.length > 0 ? (
              items.map((item) => (
                <tr key={item.id} className="transition-colors hover:bg-blue-50" style={{ borderBottom: "1px solid #f5f5f5" }}>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 12 }}>{item.time}</td>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#303133", fontSize: 13 }}>{item.operator}</td>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.module}</td>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#303133", fontSize: 13 }}>{item.action}</td>
                  <td className="px-3 py-2.5" style={{ color: "#606266", fontSize: 13, maxWidth: 360 }}>{item.summary}</td>
                  <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.target || "-"}</td>
                  <td className="px-3 py-2.5">
                    <span
                      className="rounded px-2 py-0.5 text-xs"
                      style={item.result === "成功"
                        ? { background: "#f6ffed", color: "#52c41a", border: "1px solid #b7eb8f" }
                        : { background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}
                    >
                      {item.result}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-3 py-12 text-center" style={{ color: "#909399", fontSize: 13 }}>
                  暂无日志数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 px-5 pb-4 text-sm" style={{ color: "#606266" }}>
        <span>{`共 ${pagination.total} 条`}</span>
        <div className="relative">
          <select
            value={`${pagination.page_size}`}
            onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))}
            className="appearance-none rounded px-2 py-1 pr-6 text-sm focus:outline-none"
            style={{ border: "1px solid #dcdfe6", color: "#303133", background: "#fff" }}
          >
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
        </div>
        <button
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ border: "1px solid #dcdfe6" }}
        >
          <ChevronLeft style={{ width: 13, height: 13 }} />
        </button>
        <button type="button" className="flex h-7 min-w-7 items-center justify-center rounded px-2 text-sm text-white" style={{ background: "#1677ff" }}>
          {pagination.page}
        </button>
        <button
          type="button"
          disabled={pagination.page >= Math.max(1, pagination.total_pages)}
          onClick={() => setPagination((current) => ({ ...current, page: Math.min(Math.max(1, current.total_pages), current.page + 1) }))}
          className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ border: "1px solid #dcdfe6" }}
        >
          <ChevronRight style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}
