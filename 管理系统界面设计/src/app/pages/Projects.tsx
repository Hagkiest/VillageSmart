import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { buildQuery, deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";
import { dialog } from "../lib/dialog";

type ProjectRow = {
  id: number;
  seq: number;
  project_name: string;
  project_source: string;
  project_type: string;
  secondary_type: string;
  project_status: string;
  planning_year: number | null;
  implementation_year: number | null;
  included_in_plan: boolean;
  included_in_plan_label: string;
  total_investment: string;
  settled_amount: string;
  audited_amount: string;
  responsible_person: string;
  project_location: string;
  project_description: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Stats = {
  project_count: number;
  total_investment: string;
  settled_amount: string;
  audited_amount: string;
};

type SystemField = {
  key: string;
  label: string;
  required: boolean;
};

type UploadPayload = {
  batch_id: string;
  filename: string;
  headers: string[];
  total_rows: number;
  system_fields: SystemField[];
  suggested_mapping: Record<string, string | null>;
};

type PreviewError = {
  row_number: number;
  messages: string[];
};

type PreviewPayload = {
  preview_rows: Array<Record<string, string | number | string[] | null>>;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: PreviewError[];
};

type ImportResult = {
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  errors: PreviewError[];
};

type FilterState = {
  keyword: string;
  project_type: string;
  project_status: string;
  implementation_year_start: string;
  implementation_year_end: string;
  project_source: string;
  included_in_plan: string;
  planning_year_start: string;
  planning_year_end: string;
};

const DEFAULT_FILTERS: FilterState = {
  keyword: "",
  project_type: "",
  project_status: "",
  implementation_year_start: "",
  implementation_year_end: "",
  project_source: "",
  included_in_plan: "",
  planning_year_start: "",
  planning_year_end: "",
};

const PROJECT_SOURCE_OPTIONS = ["乡村振兴项目库", "财政衔接资金项目库", "行业部门项目库", "其他来源"];
const PROJECT_TYPE_OPTIONS = ["基础设施", "产业发展", "社会事业", "生态环境"];
const PROJECT_STATUS_OPTIONS = ["规划中", "实施中", "已完成", "已终止"];
const INCLUDED_OPTIONS = [
  { value: "true", label: "是" },
  { value: "false", label: "否" },
];
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, index) => String(new Date().getFullYear() - 4 + index));

function SelectField({
  value,
  options,
  placeholder,
  width = 120,
  onChange,
}: {
  value: string;
  options: Array<string | { value: string; label: string }>;
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
        {options.map((option) => {
          const normalized = typeof option === "string" ? { value: option, label: option } : option;
          return (
            <option key={normalized.value} value={normalized.value}>
              {normalized.label}
            </option>
          );
        })}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="max-h-[90vh] w-full max-w-5xl overflow-hidden rounded bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-medium" style={{ color: "#303133" }}>
            {title}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X style={{ width: 16, height: 16, color: "#909399" }} />
          </button>
        </div>
        <div className="max-h-[calc(90vh-56px)] overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

function EmptyIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-14">
      <svg width="120" height="100" viewBox="0 0 120 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="60" cy="72" rx="26" ry="16" fill="#e8edf5" />
        <circle cx="60" cy="50" r="20" fill="#f0f4fb" stroke="#d0d9ef" strokeWidth="1.5" />
        <ellipse cx="50" cy="34" rx="5" ry="11" fill="#f0f4fb" stroke="#d0d9ef" strokeWidth="1.5" />
        <ellipse cx="70" cy="34" rx="5" ry="11" fill="#f0f4fb" stroke="#d0d9ef" strokeWidth="1.5" />
        <ellipse cx="50" cy="34" rx="2.5" ry="7" fill="#e2c8d8" />
        <ellipse cx="70" cy="34" rx="2.5" ry="7" fill="#e2c8d8" />
        <circle cx="54" cy="49" r="2.5" fill="#c9d4ea" />
        <circle cx="66" cy="49" r="2.5" fill="#c9d4ea" />
        <ellipse cx="60" cy="55" rx="3" ry="2" fill="#dde5f5" />
        <circle cx="84" cy="68" r="10" fill="#f8faff" stroke="#c5d5f7" strokeWidth="1.5" />
        <circle cx="84" cy="68" r="6" fill="#fff" stroke="#d0d9ef" strokeWidth="1" />
        <line x1="91" y1="75" x2="97" y2="82" stroke="#c5d5f7" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="22" y="55" width="30" height="36" rx="3" fill="#fff" stroke="#d0d9ef" strokeWidth="1.2" />
        <rect x="27" y="62" width="20" height="2.5" rx="1.25" fill="#dde5f5" />
        <rect x="27" y="68" width="15" height="2.5" rx="1.25" fill="#dde5f5" />
        <rect x="27" y="74" width="18" height="2.5" rx="1.25" fill="#dde5f5" />
      </svg>
      <p className="mt-3 text-sm" style={{ color: "#909399" }}>暂无项目数据</p>
    </div>
  );
}

export function Projects() {
  const navigate = useNavigate();
  const [showMore, setShowMore] = useState(false);
  const [items, setItems] = useState<ProjectRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [stats, setStats] = useState<Stats>({ project_count: 0, total_investment: "0.00", settled_amount: "0.00", audited_amount: "0.00" });
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importUploading, setImportUploading] = useState(false);
  const [uploadData, setUploadData] = useState<UploadPayload | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: ProjectRow[]; pagination: Pagination; stats: Stats }>("/api/projects/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setStats(payload.stats || { project_count: 0, total_investment: "0.00", settled_amount: "0.00", audited_amount: "0.00" });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const previewColumns = useMemo(
    () => ["row_number", "project_name", "project_type", "project_status", "implementation_year", "total_investment", "errors"],
    []
  );

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
    window.open(`/api/projects/export/${buildQuery(submittedFilters)}`, "_blank");
  };

  const handleUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      setErrorMessage("仅支持上传 .xlsx 和 .xls 格式文件。");
      event.target.value = "";
      return;
    }
    const formData = new FormData();
    formData.append("file", file);
    setImportUploading(true);
    setErrorMessage("");
    try {
      const payload = await uploadForm<UploadPayload>("/api/projects/import/upload/", formData);
      setUploadData(payload);
      setMapping(
        Object.entries(payload.suggested_mapping || {}).reduce(
          (acc, [key, value]) => ({ ...acc, [key]: value || "" }),
          {} as Record<string, string>
        )
      );
      setPreviewData(null);
      setSuccessMessage(`已上传 ${payload.filename}，请完成字段映射。`);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setImportUploading(false);
      event.target.value = "";
    }
  };

  const handlePreview = async () => {
    if (!uploadData) {
      return;
    }
    setPreviewLoading(true);
    setErrorMessage("");
    try {
      const payload = await postJson<PreviewPayload>("/api/projects/import/preview/", {
        batch_id: uploadData.batch_id,
        mapping,
      });
      setPreviewData(payload);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleCommitImport = async () => {
    if (!uploadData) {
      return;
    }
    setCommitLoading(true);
    setErrorMessage("");
    try {
      const payload = await postJson<ImportResult>("/api/projects/import/commit/", {
        batch_id: uploadData.batch_id,
        mapping,
      });
      setLastImportResult(payload);
      setLastBatchId(uploadData.batch_id);
      setSuccessMessage(`导入完成：新增 ${payload.created_rows} 条，更新 ${payload.updated_rows} 条，跳过 ${payload.skipped_rows} 条。`);
      setImportOpen(false);
      setUploadData(null);
      setPreviewData(null);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setCommitLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await dialog.confirm("确定要删除这条项目记录吗？");
    if (!ok) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/projects/${id}/`);
      setSuccessMessage(payload.message);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
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
              <div className="flex items-center justify-between gap-2">
                <span>{successMessage}</span>
                {lastImportResult && lastImportResult.skipped_rows > 0 && lastBatchId && (
                  <button
                    type="button"
                    onClick={() => window.open(`/api/projects/import/${lastBatchId}/error-report/`, "_blank")}
                    className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                    style={{ background: "#e6f7ff", color: "#1890ff" }}
                  >
                    <FileText style={{ width: 13, height: 13 }} />
                    下载错误报告
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded border" style={{ borderColor: "#e4e7ed" }}>
        <div className="px-5 pt-4 pb-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>关键字</span>
              <input
                value={filters.keyword}
                onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
                placeholder="项目名称/地点/描述"
                className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
                style={{ border: "1px solid #dcdfe6", width: 200, background: "#fff", color: "#303133" }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>项目类型</span>
              <SelectField value={filters.project_type} onChange={(value) => setFilters((current) => ({ ...current, project_type: value }))} placeholder="全部类型" options={PROJECT_TYPE_OPTIONS} width={120} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>项目状态</span>
              <SelectField value={filters.project_status} onChange={(value) => setFilters((current) => ({ ...current, project_status: value }))} placeholder="全部状态" options={PROJECT_STATUS_OPTIONS} width={110} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>实施年度</span>
              <SelectField value={filters.implementation_year_start} onChange={(value) => setFilters((current) => ({ ...current, implementation_year_start: value }))} placeholder="起始" options={YEAR_OPTIONS} width={88} />
              <span className="text-sm" style={{ color: "#909399" }}>至</span>
              <SelectField value={filters.implementation_year_end} onChange={(value) => setFilters((current) => ({ ...current, implementation_year_end: value }))} placeholder="截止" options={YEAR_OPTIONS} width={88} />
            </div>
            {showMore && (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>项目来源</span>
                  <SelectField value={filters.project_source} onChange={(value) => setFilters((current) => ({ ...current, project_source: value }))} placeholder="全部来源" options={PROJECT_SOURCE_OPTIONS} width={160} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>纳入计划</span>
                  <SelectField value={filters.included_in_plan} onChange={(value) => setFilters((current) => ({ ...current, included_in_plan: value }))} placeholder="全部" options={INCLUDED_OPTIONS} width={96} />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>规划年度</span>
                  <SelectField value={filters.planning_year_start} onChange={(value) => setFilters((current) => ({ ...current, planning_year_start: value }))} placeholder="起始" options={YEAR_OPTIONS} width={88} />
                  <span className="text-sm" style={{ color: "#909399" }}>至</span>
                  <SelectField value={filters.planning_year_end} onChange={(value) => setFilters((current) => ({ ...current, planning_year_end: value }))} placeholder="截止" options={YEAR_OPTIONS} width={88} />
                </div>
              </>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 text-white transition-opacity hover:opacity-85" style={{ background: "#1677ff" }}>
                <Search style={{ width: 13, height: 13 }} />
                查询
              </button>
              <button type="button" onClick={handleReset} className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
                <RotateCcw style={{ width: 13, height: 13 }} />
                重置
              </button>
              <button
                type="button"
                onClick={() => setShowMore((current) => !current)}
                className="flex items-center gap-1 rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85"
                style={{ border: "1px solid #1677ff", color: "#1677ff", background: "#fff" }}
              >
                更多条件
                <ChevronDown style={{ width: 12, height: 12, transform: showMore ? "rotate(180deg)" : undefined, transition: "transform 0.2s" }} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => navigate("/projects/new")} className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 text-white transition-opacity hover:opacity-85" style={{ background: "#52c41a" }}>
                <Plus style={{ width: 13, height: 13 }} />
                新增
              </button>
              <button type="button" onClick={handleExport} className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85" style={{ background: "#f4f4f5", color: "#606266", border: "1px solid #dcdfe6" }}>
                <Download style={{ width: 13, height: 13 }} />
                导出
              </button>
              <button type="button" onClick={() => setImportOpen(true)} className="flex items-center gap-1.5 rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
                <Upload style={{ width: 13, height: 13 }} />
                导入
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: "1px solid #f5f5f5" }}>
          <div className="flex items-center gap-8">
            <span className="text-sm font-medium" style={{ color: "#303133" }}>项目综合查询</span>
            <div className="flex items-center gap-6 text-sm">
              <span style={{ color: "#909399" }}>预算总投资 <span style={{ color: "#303133", fontWeight: 600 }}>{stats.total_investment}</span></span>
              <span style={{ color: "#909399" }}>结算金额 <span style={{ color: "#303133", fontWeight: 600 }}>{stats.settled_amount}</span></span>
              <span style={{ color: "#909399" }}>审计金额 <span style={{ color: "#1677ff", fontWeight: 600 }}>{stats.audited_amount}</span></span>
            </div>
          </div>
          <span className="text-sm" style={{ color: "#909399" }}>共{pagination.total}个项目</span>
        </div>

        <div className="overflow-x-auto px-5 pb-3 pt-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 1640, border: "1px solid #e4e7ed", borderRadius: 4 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["序号", "项目名称", "项目库来源", "项目类型", "二级类型", "项目状态", "规划年度", "实施年度", "纳入计划", "项目预算总投资(万元)", "结算金额(万元)", "决算审计金额(万元)", "督护人/责任人", "操作"].map((col) => (
                  <th key={col} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-3 py-16 text-center" style={{ color: "#909399" }}>
                    加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={14}>
                    <EmptyIllustration />
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.seq}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0", color: "#1677ff" }}>{row.project_name}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.project_source || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.project_type || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.secondary_type || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.project_status || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.planning_year || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.implementation_year || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.included_in_plan_label}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.total_investment || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.settled_amount || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.audited_amount || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.responsible_person || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => navigate(`/projects/${row.id}/detail`)} className="text-blue-500 hover:text-blue-600">
                          详情
                        </button>
                        <button type="button" onClick={() => navigate(`/projects/${row.id}/edit`)} className="text-blue-500 hover:text-blue-600">
                          编辑
                        </button>
                        <button type="button" onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-600">
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-4 text-sm" style={{ color: "#606266" }}>
          <span>共{pagination.total}条</span>
          <div className="relative">
            <select
              value={pagination.page_size}
              onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))}
              className="rounded text-sm px-2 py-1 focus:outline-none appearance-none pr-6"
              style={{ border: "1px solid #dcdfe6", color: "#303133", background: "#fff" }}
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
          </div>
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button type="button" className="w-7 h-7 rounded text-sm text-white flex items-center justify-center" style={{ background: "#1677ff" }}>
            {pagination.page}
          </button>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {importOpen && (
        <Modal
          title="项目台账 Excel 导入"
          onClose={() => {
            setImportOpen(false);
            setUploadData(null);
            setPreviewData(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
              <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 1：上传 Excel</div>
              <p className="mt-1 text-xs" style={{ color: "#909399" }}>上传后先完成字段映射，再预览并确认导入数据库。</p>
              <div className="mt-3 flex items-center gap-3">
                <label className="inline-flex cursor-pointer items-center rounded-sm px-3 py-1.5 text-xs text-white" style={{ background: "#1677ff" }}>
                  <Upload style={{ width: 12, height: 12, marginRight: 4 }} />
                  选择文件
                  <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleUploadFile} />
                </label>
                {importUploading && <span className="text-xs" style={{ color: "#1677ff" }}>上传解析中...</span>}
                {uploadData && <span className="text-xs" style={{ color: "#606266" }}>{uploadData.filename}，共 {uploadData.total_rows} 行</span>}
              </div>
            </div>

            {uploadData && (
              <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 2：字段映射</div>
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>导入默认先做字段映射，兼容不同项目台账模板。</p>
                  </div>
                  <button type="button" onClick={handlePreview} disabled={previewLoading} className="rounded-sm px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: "#1677ff" }}>
                    {previewLoading ? "生成预览中..." : "生成预览"}
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        <th className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>系统字段</th>
                        <th className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>Excel 列名</th>
                        <th className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>要求</th>
                      </tr>
                    </thead>
                    <tbody>
                      {uploadData.system_fields.map((field) => (
                        <tr key={field.key}>
                          <td className="px-3 py-2" style={{ border: "1px solid #ebeef5" }}>{field.label}</td>
                          <td className="px-3 py-2" style={{ border: "1px solid #ebeef5" }}>
                            <select
                              value={mapping[field.key] ?? ""}
                              onChange={(event) => setMapping((current) => ({ ...current, [field.key]: event.target.value }))}
                              className="w-full rounded-sm px-2 py-1 text-xs focus:outline-none"
                              style={{ border: "1px solid #dcdfe6", background: "#fff" }}
                            >
                              <option value="">未映射</option>
                              {uploadData.headers.map((header) => (
                                <option key={header} value={header}>
                                  {header}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2" style={{ border: "1px solid #ebeef5", color: field.required ? "#cf1322" : "#909399" }}>
                            {field.required ? "必填" : "可选"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {previewData && (
              <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 3：数据预览</div>
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>共 {previewData.total_rows} 行，有效 {previewData.valid_rows} 行，无效 {previewData.invalid_rows} 行。</p>
                  </div>
                  <button type="button" onClick={handleCommitImport} disabled={commitLoading} className="rounded-sm px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: "#52c41a" }}>
                    {commitLoading ? "导入中..." : "确认导入数据库"}
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 860 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "project_name"
                                ? "项目名称"
                                : column === "project_type"
                                  ? "项目类型"
                                  : column === "project_status"
                                    ? "项目状态"
                                    : column === "implementation_year"
                                      ? "实施年度"
                                      : column === "total_investment"
                                        ? "预算总投资"
                                        : "错误信息"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview_rows.map((row, index) => (
                        <tr key={index}>
                          {previewColumns.map((column) => (
                            <td key={column} className="px-3 py-2 align-top" style={{ border: "1px solid #ebeef5" }}>
                              {Array.isArray(row[column]) ? (row[column] as string[]).join("；") : String(row[column] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
