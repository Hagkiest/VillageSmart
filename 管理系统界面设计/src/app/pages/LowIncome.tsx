import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Plus,
  RotateCcw,
  Search,
  Upload,
  X,
} from "lucide-react";
import { buildQuery, fetchJson, postJson, uploadForm, deleteJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type LowIncomeDetailRow = {
  id: number;
  seq: number;
  full_name: string;
  identity_number: string;
  gender: string;
  ethnicity: string;
  age: number | null;
  phone: string;
  head_name: string;
  relation_to_head: string;
  policy_type: string;
  benefit_level: string;
  subsidy_amount: string;
  subsidy_cycle: string;
  start_date: string;
  end_date: string;
  household_member_count: number;
  beneficiary_count: number;
  household_month_amount: string;
  status: string;
};

type LowIncomeHouseholdRow = {
  id: number;
  seq: number;
  village_group: string;
  head_name: string;
  household_no: string;
  household_member_count: number;
  beneficiary_count: number;
  household_month_amount: string;
  policy_type: string;
  status_summary: string;
};

type UploadPayload = {
  batch_id: string;
  filename: string;
  headers: string[];
  total_rows: number;
  sample_rows: Array<Record<string, string | number | null>>;
  system_fields: SystemField[];
  suggested_mapping: Record<string, string | null>;
};

type SystemField = {
  key: string;
  label: string;
  required: boolean;
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
  full_name: string;
  identity_number: string;
  policy_type: string;
  status: string;
};

const DEFAULT_FILTERS: FilterState = {
  full_name: "",
  identity_number: "",
  policy_type: "",
  status: "在享",
};

const LOW_INCOME_TYPE_OPTIONS = ["低保", "特困供养", "低保边缘家庭", "临时救助"];
const STATUS_OPTIONS = ["在享", "停享", "全部"];

function FieldLabel({ text }: { text: string }) {
  return (
    <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>
      {text}
    </span>
  );
}

function TextField({
  value,
  placeholder,
  width = 150,
  onChange,
}: {
  value: string;
  placeholder: string;
  width?: number;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
      style={{ border: "1px solid #dcdfe6", width, background: "#fff", color: "#303133" }}
    />
  );
}

function SelectField({
  value,
  options,
  placeholder,
  width = 160,
  onChange,
}: {
  value: string;
  options: string[];
  placeholder?: string;
  width?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative" style={{ width }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded text-sm px-2.5 py-1.5 focus:outline-none appearance-none pr-6"
        style={{ border: "1px solid #dcdfe6", background: "#fff", color: value ? "#303133" : "#c0c4cc" }}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
    </div>
  );
}

function ActionButton({
  label,
  bg,
  color,
  border,
  icon,
  onClick,
}: {
  label: string;
  bg: string;
  color: string;
  border?: string;
  icon?: JSX.Element;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-opacity hover:opacity-85"
      style={{ background: bg, color, border }}
    >
      {icon}
      {label}
    </button>
  );
}

function EmptyIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-14">
      <svg width="110" height="96" viewBox="0 0 110 96" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="55" cy="90" rx="36" ry="5" fill="#e8edf5" />
        <rect x="30" y="8" width="56" height="70" rx="4" fill="#dce8fb" stroke="#b8cef5" strokeWidth="1.2" />
        <rect x="23" y="15" width="56" height="70" rx="4" fill="#eaf1fd" stroke="#b8cef5" strokeWidth="1.2" />
        <rect x="16" y="22" width="56" height="70" rx="4" fill="#fff" stroke="#c5d5f7" strokeWidth="1.5" />
        <rect x="26" y="36" width="36" height="4" rx="2" fill="#dde6f5" />
        <rect x="26" y="46" width="28" height="4" rx="2" fill="#dde6f5" />
        <rect x="26" y="56" width="32" height="4" rx="2" fill="#dde6f5" />
        <rect x="26" y="66" width="18" height="4" rx="2" fill="#dde6f5" />
        <circle cx="76" cy="52" r="14" fill="#f0f5ff" stroke="#b8cef5" strokeWidth="1.5" />
        <circle cx="76" cy="52" r="9" fill="#fff" stroke="#c5d5f7" strokeWidth="1.5" />
        <line x1="83" y1="59" x2="90" y2="66" stroke="#b8cef5" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="72" y1="48" x2="80" y2="56" stroke="#c5d5f7" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="80" y1="48" x2="72" y2="56" stroke="#c5d5f7" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <p className="mt-3 text-sm" style={{ color: "#909399" }}>
        当前还没有符合条件的低收入人员数据。
      </p>
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

export function LowIncome() {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<"detail" | "household">("detail");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [detailRows, setDetailRows] = useState<LowIncomeDetailRow[]>([]);
  const [householdRows, setHouseholdRows] = useState<LowIncomeHouseholdRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
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
    const params = {
      ...submittedFilters,
      page: pagination.page,
      page_size: pagination.page_size,
    };
    const endpoint = activeView === "household" ? "/api/low-income/households/" : "/api/low-income/";
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: LowIncomeDetailRow[] | LowIncomeHouseholdRow[]; pagination: Pagination }>(endpoint, { params })
      .then((payload) => {
        if (activeView === "household") {
          setHouseholdRows(payload.items as LowIncomeHouseholdRow[]);
        } else {
          setDetailRows(payload.items as LowIncomeDetailRow[]);
        }
        setPagination(payload.pagination);
        setSelectedIds([]);
      })
      .catch((error) => setErrorMessage(error.message))
      .finally(() => setLoading(false));
  }, [activeView, pagination.page, pagination.page_size, submittedFilters]);

  const detailPreviewColumns = useMemo(
    () => [
      "row_number",
      "full_name",
      "identity_number",
      "policy_type",
      "benefit_level",
      "subsidy_amount",
      "status",
      "errors",
    ],
    []
  );

  const totalLabel = activeView === "household" ? `共${pagination.total}户` : `共${pagination.total}人`;

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters(DEFAULT_FILTERS);
  };

  const handleExport = () => {
    const query = buildQuery({
      ...submittedFilters,
      view: activeView === "household" ? "household" : "detail",
    });
    window.open(`/api/low-income/export/${query}`, "_blank");
  };

  const handleUploadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".xls")) {
      setErrorMessage("仅支持上传 .xlsx 和 .xls 格式文件。");
      event.target.value = "";
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setImportUploading(true);
    setErrorMessage("");

    try {
      const payload = await uploadForm<UploadPayload>("/api/low-income/import/upload/", formData);
      setUploadData(payload);
      const cleanMapping = Object.entries(payload.suggested_mapping || {}).reduce(
        (acc, [key, value]) => ({ ...acc, [key]: value || "" }),
        {} as Record<string, string>
      );
      setMapping(cleanMapping);
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
      const payload = await postJson<PreviewPayload>("/api/low-income/import/preview/", {
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
      const payload = await postJson<ImportResult>("/api/low-income/import/commit/", {
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

  const handleDownloadErrorReport = () => {
    if (!lastBatchId) {
      return;
    }
    window.open(`/api/low-income/import/${lastBatchId}/error-report/`, "_blank");
  };

  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const ok = await dialog.confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`);
    if (!ok) return;
    try {
      await postJson("/api/low-income/bulk-delete/", { ids: selectedIds });
      setSelectedIds([]);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(detailRows.map((row) => row.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await dialog.confirm("确定要删除这条低收入人员记录吗？");
    if (!ok) return;
    try {
      await deleteJson(`/api/low-income/${id}/delete/`);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const currentCount = activeView === "household" ? householdRows.length : detailRows.length;

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #ebeef5" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <FieldLabel text="居民姓名" />
              <TextField value={filters.full_name} onChange={(value) => setFilters((current) => ({ ...current, full_name: value }))} placeholder="请输入居民姓名" width={150} />
            </div>
            <div className="flex items-center gap-1.5">
              <FieldLabel text="身份证号" />
              <TextField value={filters.identity_number} onChange={(value) => setFilters((current) => ({ ...current, identity_number: value }))} placeholder="请输入身份证号" width={170} />
            </div>
            <div className="flex items-center gap-1.5">
              <FieldLabel text="低收入类型" />
              <SelectField value={filters.policy_type} onChange={(value) => setFilters((current) => ({ ...current, policy_type: value }))} placeholder="请选择低收入类型" width={170} options={LOW_INCOME_TYPE_OPTIONS} />
            </div>
            <div className="flex items-center gap-1.5">
              <FieldLabel text="状态" />
              <SelectField value={filters.status} onChange={(value) => setFilters((current) => ({ ...current, status: value }))} width={100} options={STATUS_OPTIONS} />
            </div>
            <ActionButton label="搜索" bg="#1677ff" color="#fff" icon={<Search style={{ width: 12, height: 12 }} />} onClick={handleSearch} />
            <ActionButton label="重置" bg="#fff" color="#606266" border="1px solid #dcdfe6" icon={<RotateCcw style={{ width: 12, height: 12 }} />} onClick={handleReset} />
            <ActionButton label="新增低收入人员" bg="#67c23a" color="#fff" icon={<Plus style={{ width: 12, height: 12 }} />} onClick={() => navigate("/low-income/new")} />
            {activeView === "detail" && selectedIds.length > 0 && (
              <ActionButton label={`批量删除 (${selectedIds.length})`} bg="#f56c6c" color="#fff" onClick={handleBulkDelete} />
            )}
            <ActionButton label="批量导入" bg="#e6a23c" color="#fff" icon={<Upload style={{ width: 12, height: 12 }} />} onClick={() => setImportOpen(true)} />
            <ActionButton label="导出" bg="#fff" color="#606266" border="1px solid #dcdfe6" icon={<Download style={{ width: 12, height: 12 }} />} onClick={handleExport} />
          </div>
        </div>

        <div className="px-4 py-4">
          {(errorMessage || successMessage) && (
            <div className="mb-3 space-y-2">
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
                        onClick={handleDownloadErrorReport}
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

          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "#1677ff" }} />
              <span className="text-sm font-medium" style={{ color: "#303133" }}>
                低收入人员查询
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex overflow-hidden rounded-sm" style={{ border: "1px solid #dcdfe6" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("detail");
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="px-3 text-xs"
                  style={{ height: 24, background: activeView === "detail" ? "#409eff" : "#fff", color: activeView === "detail" ? "#fff" : "#606266" }}
                >
                  人员明细
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("household");
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="px-3 text-xs"
                  style={{ height: 24, borderLeft: "1px solid #dcdfe6", background: activeView === "household" ? "#409eff" : "#fff", color: activeView === "household" ? "#fff" : "#606266" }}
                >
                  按户汇总
                </button>
              </div>
              <button type="button" className="rounded-sm px-2 text-xs" style={{ height: 24, border: "1px solid #dcdfe6", color: "#c0c4cc", background: "#f5f7fa" }}>
                {totalLabel}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid #ebeef5" }}>
            <table className="w-full text-xs" style={{ minWidth: activeView === "household" ? 900 : 1580, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {(activeView === "household"
                    ? ["序号", "村组", "户主姓名", "户号", "全户人数", "享受人数", "户月金额", "政策类型", "状态统计"]
                    : ["checkbox", "居民姓名", "身份证号", "性别", "民族", "年龄", "联系电话", "户主姓名", "与户主关系", "享受政策类型", "享受档次", "补贴金额", "补贴周期", "开始时间", "结束时间", "全户人数", "享受人数", "户月金额", "状态", "操作"]
                  ).map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                      {column === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={detailRows.length > 0 && selectedIds.length === detailRows.length}
                          onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                      ) : (
                        column
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={activeView === "household" ? 9 : 18} className="px-3 py-10 text-center text-xs" style={{ color: "#909399" }}>
                      数据加载中...
                    </td>
                  </tr>
                ) : currentCount === 0 ? (
                  <tr>
                    <td colSpan={activeView === "household" ? 9 : 18}>
                      <EmptyIllustration />
                    </td>
                  </tr>
                ) : activeView === "household" ? (
                  householdRows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                      <td className="px-3 py-2">{item.seq}</td>
                      <td className="px-3 py-2">{item.village_group || "-"}</td>
                      <td className="px-3 py-2">{item.head_name || "-"}</td>
                      <td className="px-3 py-2">{item.household_no || "-"}</td>
                      <td className="px-3 py-2">{item.household_member_count}</td>
                      <td className="px-3 py-2">{item.beneficiary_count}</td>
                      <td className="px-3 py-2">{item.household_month_amount || "-"}</td>
                      <td className="px-3 py-2">{item.policy_type || "-"}</td>
                      <td className="px-3 py-2">{item.status_summary || "-"}</td>
                    </tr>
                  ))
                ) : (
                  detailRows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => handleSelectRow(item.id, e.target.checked)}
                        />
                      </td>
                      <td className="px-3 py-2">{item.full_name}</td>
                      <td className="px-3 py-2">{item.identity_number}</td>
                      <td className="px-3 py-2">{item.gender || "-"}</td>
                      <td className="px-3 py-2">{item.ethnicity || "-"}</td>
                      <td className="px-3 py-2">{item.age ?? "-"}</td>
                      <td className="px-3 py-2">{item.phone || "-"}</td>
                      <td className="px-3 py-2">{item.head_name || "-"}</td>
                      <td className="px-3 py-2">{item.relation_to_head || "-"}</td>
                      <td className="px-3 py-2">{item.policy_type || "-"}</td>
                      <td className="px-3 py-2">{item.benefit_level || "-"}</td>
                      <td className="px-3 py-2">{item.subsidy_amount || "-"}</td>
                      <td className="px-3 py-2">{item.subsidy_cycle || "-"}</td>
                      <td className="px-3 py-2">{item.start_date || "-"}</td>
                      <td className="px-3 py-2">{item.end_date || "-"}</td>
                      <td className="px-3 py-2">{item.household_member_count}</td>
                      <td className="px-3 py-2">{item.beneficiary_count}</td>
                      <td className="px-3 py-2">{item.household_month_amount || "-"}</td>
                      <td className="px-3 py-2">{item.status || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/low-income/${item.id}/detail`)}
                            className="text-xs text-blue-500 hover:text-blue-600"
                          >
                            详情
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(`/low-income/${item.id}/edit`)}
                            className="text-xs text-blue-500 hover:text-blue-600"
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-xs text-red-500 hover:text-red-600"
                          >
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

          <div className="mt-3 flex flex-wrap items-center justify-end gap-2 text-xs" style={{ color: "#606266" }}>
            <span>共{pagination.total}条</span>
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
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
            </div>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => setPagination((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))}
              className="flex items-center justify-center rounded-sm disabled:opacity-40"
              style={{ width: 26, height: 26, border: "1px solid #dcdfe6", background: "#fff" }}
            >
              <ChevronLeft style={{ width: 12, height: 12, color: "#909399" }} />
            </button>
            <button type="button" className="rounded-sm text-white" style={{ width: 26, height: 26, background: "#409eff" }}>
              {pagination.page}
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages}
              onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.page + 1, current.total_pages || 1) }))}
              className="flex items-center justify-center rounded-sm disabled:opacity-40"
              style={{ width: 26, height: 26, border: "1px solid #dcdfe6", background: "#fff" }}
            >
              <ChevronRight style={{ width: 12, height: 12, color: "#909399" }} />
            </button>
          </div>
        </div>
      </div>

      {importOpen && (
        <Modal
          title="低收入人员 Excel 导入"
          onClose={() => {
            setImportOpen(false);
            setUploadData(null);
            setPreviewData(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
              <div className="text-sm font-medium" style={{ color: "#303133" }}>
                步骤 1：上传 Excel
              </div>
              <p className="mt-1 text-xs" style={{ color: "#909399" }}>
                上传后先完成字段映射，再预览并确认导入数据库。
              </p>
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
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>
                      至少需要映射身份证号，其他字段可按 Excel 实际列名自由对应。
                    </p>
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
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>
                      共 {previewData.total_rows} 行，有效 {previewData.valid_rows} 行，无效 {previewData.invalid_rows} 行。
                    </p>
                  </div>
                  <button type="button" onClick={handleCommitImport} disabled={commitLoading} className="rounded-sm px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: "#52c41a" }}>
                    {commitLoading ? "导入中..." : "确认导入数据库"}
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 820 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {detailPreviewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "full_name"
                                ? "居民姓名"
                                : column === "identity_number"
                                  ? "身份证号"
                                  : column === "policy_type"
                                    ? "政策类型"
                                    : column === "benefit_level"
                                      ? "享受档次"
                                      : column === "subsidy_amount"
                                        ? "补贴金额"
                                        : column === "status"
                                          ? "状态"
                                          : "错误信息"}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.preview_rows.map((row, index) => (
                        <tr key={index}>
                          {detailPreviewColumns.map((column) => (
                            <td key={column} className="px-3 py-2 align-top" style={{ border: "1px solid #ebeef5" }}>
                              {Array.isArray(row[column]) ? (row[column] as string[]).join("；") : String(row[column] ?? "")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {previewData.errors.length > 0 && (
                  <div className="mt-3 rounded px-3 py-2" style={{ background: "#fff7e6", border: "1px solid #ffd591" }}>
                    <div className="mb-1 text-xs font-medium" style={{ color: "#d46b08" }}>
                      发现 {previewData.errors.length} 条错误数据
                    </div>
                    <div className="space-y-1 text-xs" style={{ color: "#d46b08" }}>
                      {previewData.errors.slice(0, 10).map((item, index) => (
                        <div key={index}>
                          第 {item.row_number} 行：{item.messages.join("；")}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
