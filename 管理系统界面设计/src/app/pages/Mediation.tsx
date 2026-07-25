import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Calendar, ChevronDown, ChevronLeft, ChevronRight, Plus, RotateCcw, Search } from "lucide-react";
import { buildQuery, deleteJson, fetchJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type MediationRow = {
  id: number;
  seq: number;
  archive_number: string;
  dispute_type: string;
  applicant_names: string;
  respondent_names: string;
  status: string;
  created_at: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type FilterOptions = {
  dispute_types: string[];
  statuses: string[];
};

type ListPayload = {
  items: MediationRow[];
  pagination: Pagination;
  filter_options: FilterOptions;
};

type FilterState = {
  archive_number: string;
  dispute_type: string;
  status: string;
  created_from: string;
  created_to: string;
};

const DEFAULT_FILTERS: FilterState = {
  archive_number: "",
  dispute_type: "",
  status: "",
  created_from: "",
  created_to: "",
};

const STATUS_STYLE: Record<string, { color: string; background: string }> = {
  进行中: { color: "#d48806", background: "#fff7e6" },
  已调解: { color: "#389e0d", background: "#f6ffed" },
  调解失败: { color: "#cf1322", background: "#fff1f0" },
  已归档: { color: "#531dab", background: "#f9f0ff" },
};

function SelectField({
  value,
  options,
  placeholder,
  width = 150,
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

export function Mediation() {
  const navigate = useNavigate();
  const [items, setItems] = useState<MediationRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ dispute_types: [], statuses: [] });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<ListPayload>("/api/mediations/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setFilterOptions(payload.filter_options || { dispute_types: [], statuses: [] });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setSubmittedFilters(DEFAULT_FILTERS);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleExport = () => {
    window.open(`/api/mediations/export/${buildQuery(submittedFilters)}`, "_blank");
  };

  const handleDelete = async (recordId: number) => {
    const confirmed = await dialog.confirm("确认删除该调解档案吗？");
    if (!confirmed) {
      return;
    }
    setErrorMessage("");
    setSuccessMessage("");
    try {
      await deleteJson(`/api/mediations/${recordId}/`);
      setSuccessMessage("调解档案已删除。");
      setPagination((current) => ({ ...current }));
      setItems((current) => current.filter((item) => item.id !== recordId));
      setPagination((current) => ({ ...current, total: Math.max(0, current.total - 1) }));
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

      <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <div className="flex items-center gap-1.5">
          <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>档案编号</span>
          <input
            value={filters.archive_number}
            onChange={(event) => setFilters((current) => ({ ...current, archive_number: event.target.value }))}
            placeholder="请输入档案编号"
            className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
            style={{ border: "1px solid #dcdfe6", width: 160, background: "#fff", color: "#303133" }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>纠纷类型</span>
          <SelectField
            value={filters.dispute_type}
            onChange={(value) => setFilters((current) => ({ ...current, dispute_type: value }))}
            placeholder="请选择纠纷类型"
            options={filterOptions.dispute_types}
            width={170}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>档案状态</span>
          <SelectField
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            placeholder="请选择状态"
            options={filterOptions.statuses}
            width={130}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>创建时间</span>
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
          搜索
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
        <button
          type="button"
          onClick={() => navigate("/mediation/new")}
          className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white"
          style={{ background: "#1677ff" }}
        >
          <Plus style={{ width: 13, height: 13 }} />
          新建档案
        </button>
        <button
          type="button"
          onClick={handleExport}
          className="rounded px-3 py-1.5 text-sm text-white"
          style={{ background: "#52c41a" }}
        >
          导出Excel
        </button>
      </div>

      <div className="overflow-x-auto px-5 py-3">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["序号", "档案编号", "纠纷类型", "申请人", "被申请人", "状态", "创建时间", "操作"].map((column) => (
                <th
                  key={column}
                  className="px-3 py-2.5 text-left whitespace-nowrap"
                  style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!loading && items.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-16 text-center text-sm" style={{ color: "#909399" }}>
                  暂无调解档案
                </td>
              </tr>
            ) : (
              items.map((item) => {
                const style = STATUS_STYLE[item.status] || { color: "#606266", background: "#f5f5f5" };
                return (
                  <tr key={item.id}>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#606266" }}>{item.seq}</td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#303133" }}>{item.archive_number}</td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#303133" }}>{item.dispute_type || "-"}</td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#303133" }}>{item.applicant_names || "-"}</td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#303133" }}>{item.respondent_names || "-"}</td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <span className="rounded px-2 py-1 text-xs" style={{ color: style.color, background: style.background }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-3" style={{ borderBottom: "1px solid #f0f0f0", color: "#606266" }}>{item.created_at}</td>
                    <td className="px-3 py-3 whitespace-nowrap" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <button type="button" onClick={() => navigate(`/mediation/${item.id}/detail`)} className="mr-3 text-sm" style={{ color: "#1677ff" }}>
                        查看
                      </button>
                      <button type="button" onClick={() => navigate(`/mediation/${item.id}/edit`)} className="mr-3 text-sm" style={{ color: "#fa8c16" }}>
                        编辑
                      </button>
                      <button type="button" onClick={() => void handleDelete(item.id)} className="text-sm" style={{ color: "#ff4d4f" }}>
                        删除
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2 px-5 pb-4 text-sm" style={{ color: "#606266" }}>
        <span>共 {pagination.total} 条</span>
        <div className="relative">
          <select
            value={String(pagination.page_size)}
            onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))}
            className="appearance-none rounded px-2 py-1 pr-6 text-sm focus:outline-none"
            style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
          >
            <option value="10">10条/页</option>
            <option value="20">20条/页</option>
            <option value="50">50条/页</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
        </div>
        <button
          type="button"
          onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))}
          disabled={pagination.page <= 1}
          className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-40"
          style={{ border: "1px solid #dcdfe6" }}
        >
          <ChevronLeft style={{ width: 13, height: 13 }} />
        </button>
        <button className="flex h-7 w-7 items-center justify-center rounded text-sm text-white" style={{ background: "#1677ff" }}>
          {pagination.page}
        </button>
        <button
          type="button"
          onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.total_pages || 1, current.page + 1) }))}
          disabled={pagination.page >= pagination.total_pages}
          className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-40"
          style={{ border: "1px solid #dcdfe6" }}
        >
          <ChevronRight style={{ width: 13, height: 13 }} />
        </button>
      </div>
    </div>
  );
}
