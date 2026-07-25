import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { buildQuery, deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";
import { dialog } from "../lib/dialog";

type PublicJobRow = {
  id: number;
  seq: number;
  resident_id: number | null;
  full_name: string;
  gender: string;
  identity_number: string;
  phone: string;
  village_group: string;
  head_name: string;
  household_type: string;
  low_income_type: string;
  job_name: string;
  department: string;
  contract_period: string;
  subsidy_amount: string;
  required_attendance_days: number;
  actual_attendance_days: number;
  status: string;
  notes: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Stats = {
  active_count: number;
  record_count: number;
  job_type_count: number;
  subsidy_total: string;
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

type ListPayload = {
  items: PublicJobRow[];
  pagination: Pagination;
  stats: Stats;
  filter_options?: {
    job_names?: string[];
    departments?: string[];
  };
};

const STATUS_OPTIONS = ["在岗", "离岗", "待岗"];

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

export function PublicJobs() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicJobRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [stats, setStats] = useState<Stats>({ active_count: 0, record_count: 0, job_type_count: 0, subsidy_total: "0" });
  const [jobOptions, setJobOptions] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    full_name: "",
    identity_number: "",
    job_name: "",
    department: "",
    status: "在岗",
  });
  const [submittedFilters, setSubmittedFilters] = useState({
    full_name: "",
    identity_number: "",
    job_name: "",
    department: "",
    status: "在岗",
  });
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
    fetchJson<ListPayload>("/api/public-jobs/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setStats(payload.stats || { active_count: 0, record_count: 0, job_type_count: 0, subsidy_total: "0" });
        setJobOptions(payload.filter_options?.job_names || []);
        setDepartmentOptions(payload.filter_options?.departments || []);
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const previewColumns = useMemo(
    () => ["row_number", "full_name", "identity_number", "job_name", "department", "status", "subsidy_amount", "errors"],
    []
  );

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const reset = { full_name: "", identity_number: "", job_name: "", department: "", status: "在岗" };
    setFilters(reset);
    setSubmittedFilters(reset);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleExport = () => {
    window.open(`/api/public-jobs/export/${buildQuery(submittedFilters)}`, "_blank");
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
      const payload = await uploadForm<UploadPayload>("/api/public-jobs/import/upload/", formData);
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
      const payload = await postJson<PreviewPayload>("/api/public-jobs/import/preview/", {
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
      const payload = await postJson<ImportResult>("/api/public-jobs/import/commit/", {
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
    const ok = await dialog.confirm("确定要删除这条公益性岗位记录吗？");
    if (!ok) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/public-jobs/${id}/`);
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
                    onClick={() => window.open(`/api/public-jobs/import/${lastBatchId}/error-report/`, "_blank")}
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

      <div className="rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        <div className="flex flex-wrap items-center gap-2 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
              姓名
            </span>
            <input
              value={filters.full_name}
              onChange={(e) => setFilters((current) => ({ ...current, full_name: e.target.value }))}
              placeholder="请输入姓名"
              className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", width: 120 }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
              身份证号
            </span>
            <input
              value={filters.identity_number}
              onChange={(e) => setFilters((current) => ({ ...current, identity_number: e.target.value }))}
              placeholder="请输入身份证号"
              className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", width: 170 }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
              岗位
            </span>
            <div className="relative" style={{ width: 140 }}>
              <select
                value={filters.job_name}
                onChange={(e) => setFilters((current) => ({ ...current, job_name: e.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff" }}
              >
                <option value="">全部岗位</option>
                {jobOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
              主管部门
            </span>
            <div className="relative" style={{ width: 140 }}>
              <select
                value={filters.department}
                onChange={(e) => setFilters((current) => ({ ...current, department: e.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff" }}
              >
                <option value="">全部部门</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
              状态
            </span>
            <div className="relative" style={{ width: 100 }}>
              <select
                value={filters.status}
                onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff" }}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>

          <button type="button" onClick={handleSearch} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#1677ff" }}>
            <Search style={{ width: 13, height: 13 }} />
            查询
          </button>
          <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            <RotateCcw style={{ width: 13, height: 13 }} />
            重置
          </button>
          <button type="button" onClick={() => navigate("/public-jobs/new")} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#52c41a" }}>
            <Plus style={{ width: 13, height: 13 }} />
            新增
          </button>
          <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#fa8c16" }}>
            <Upload style={{ width: 13, height: 13 }} />
            导入
          </button>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            <Download style={{ width: 13, height: 13 }} />
            导出
          </button>
          <button type="button" disabled className="rounded px-3 py-1.5 text-sm opacity-50" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            汇总表
          </button>
          <button type="button" disabled className="rounded px-3 py-1.5 text-sm opacity-50" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            公开表
          </button>
        </div>

        <div className="grid grid-cols-4 gap-3 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          {[
            { label: "在岗人数", value: stats.active_count, color: "#303133" },
            { label: "记录数", value: stats.record_count, color: "#303133" },
            { label: "岗位类型", value: stats.job_type_count, color: "#303133" },
            { label: "月补贴标准合计", value: stats.subsidy_total || "0", color: "#1677ff" },
          ].map(({ label, value, color }) => (
            <div key={label} className="rounded border px-5 py-4" style={{ borderColor: "#e4e7ed" }}>
              <p className="text-xs mb-2" style={{ color: "#909399" }}>
                {label}
              </p>
              <p className="font-semibold" style={{ color, fontSize: 22 }}>
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="px-5 pb-2 pt-4 flex items-center justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <div className="rounded-sm flex-shrink-0" style={{ width: 3, height: 14, background: "#1677ff" }} />
              <span className="text-sm font-medium" style={{ color: "#303133" }}>
                公益性岗位台账
              </span>
            </div>
            <p className="text-xs" style={{ color: "#909399" }}>
              新增记录需先搜索居民后再添加，导入默认先完成字段映射
            </p>
          </div>
        </div>

        <div className="overflow-x-auto px-5 pb-5">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 1500, border: "1px solid #e4e7ed", borderRadius: 4 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["序号", "姓名", "身份证号", "性别", "村组", "户主", "户属性", "低收入类型", "岗位名称", "主管部门", "合同期", "补贴标准", "规定出勤天数", "操作"].map((column) => (
                  <th key={column} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                    {column}
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
                  <td colSpan={14} className="px-3 py-16 text-center" style={{ color: "#909399" }}>
                    暂无公益性岗位数据
                  </td>
                </tr>
              ) : (
                items.map((row, index) => (
                  <tr key={row.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.seq}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0", color: "#1677ff" }}>{row.full_name}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.identity_number}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.gender || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.village_group || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.head_name || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.household_type || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.low_income_type || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.job_name}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.department || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.contract_period || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.subsidy_amount || "0"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{row.required_attendance_days || 0}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => navigate(`/public-jobs/${row.id}/detail`)} className="text-blue-500 hover:text-blue-600">
                          详情
                        </button>
                        <button type="button" onClick={() => navigate(`/public-jobs/${row.id}/edit`)} className="text-blue-500 hover:text-blue-600">
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

        <div className="flex items-center justify-end gap-2 pb-4 pr-5 text-xs" style={{ color: "#606266" }}>
          <span>共 {pagination.total} 条</span>
          <div className="relative">
            <select
              value={pagination.page_size}
              onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))}
              className="appearance-none rounded-sm px-2 pr-6 focus:outline-none"
              style={{ height: 26, border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
          </div>
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="flex h-7 w-7 items-center justify-center rounded border disabled:opacity-40">
            <ChevronLeft style={{ width: 12, height: 12 }} />
          </button>
          <button type="button" className="h-7 w-7 rounded text-white" style={{ background: "#409eff" }}>
            {pagination.page}
          </button>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="flex h-7 w-7 items-center justify-center rounded border disabled:opacity-40">
            <ChevronRight style={{ width: 12, height: 12 }} />
          </button>
        </div>
      </div>

      {importOpen && (
        <Modal
          title="公益性岗位 Excel 导入"
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
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>导入默认先做字段映射，兼容不同 Excel 模板。</p>
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
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 880 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "full_name"
                                ? "姓名"
                                : column === "identity_number"
                                  ? "身份证号"
                                  : column === "job_name"
                                    ? "岗位名称"
                                    : column === "department"
                                      ? "主管部门"
                                      : column === "status"
                                        ? "状态"
                                        : column === "subsidy_amount"
                                          ? "月补贴标准"
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
