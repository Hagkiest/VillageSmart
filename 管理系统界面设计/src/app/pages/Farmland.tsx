import { type ChangeEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, RotateCcw, Search, Upload, X } from "lucide-react";
import { buildQuery, fetchJson, postJson, uploadForm } from "../lib/api";

type DetailRow = {
  id: number;
  seq: number;
  plot_code: string;
  village_group: string;
  contractor_name: string;
  contractor_identity_number: string;
  linked_resident_id: number | null;
  plot_location: string;
  area_mu: string;
  east_boundary: string;
  south_boundary: string;
  west_boundary: string;
  north_boundary: string;
  plot_status: string;
  transfer_status: string;
  confirmation_status: string;
  current_planting: string;
  latest_change: string;
  change_date: string;
  notes: string;
};

type SummaryRow = {
  id: number;
  seq: number;
  contractor_name: string;
  contractor_identity_number: string;
  linked_resident_id: number | null;
  village_group: string;
  plot_count: number;
  total_area_mu: string;
  transferred_count: number;
  confirmed_count: number;
  plot_codes: string;
  latest_change_date: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Stats = {
  plot_count: number;
  total_area_mu: string;
  transferred_count: number;
  abandoned_count: number;
  reclaimed_count: number;
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

type FilterOptions = {
  village_groups: string[];
  plot_statuses: string[];
};

type FilterState = {
  contractor_name: string;
  plot_code: string;
  village_group: string;
  plot_status: string;
};

const DEFAULT_FILTERS: FilterState = {
  contractor_name: "",
  plot_code: "",
  village_group: "",
  plot_status: "",
};

const DEBUG_IMPORT_URL = "http://127.0.0.1:7777/event";
const DEBUG_IMPORT_SESSION = "farmland-import-button";
const DEBUG_IMPORT_BUILD = "farmland-import-debug-20260708a";

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

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    // #region debug-point C:modal-mounted
    fetch(DEBUG_IMPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DEBUG_IMPORT_SESSION,
        runId: "pre-fix",
        hypothesisId: "C",
        location: "Farmland.tsx:Modal",
        msg: `[DEBUG] modal mounted ${DEBUG_IMPORT_BUILD}`,
        data: { title, hasBody: Boolean(document.body) },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      // #region debug-point C:modal-unmounted
      fetch(DEBUG_IMPORT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: DEBUG_IMPORT_SESSION,
          runId: "pre-fix",
          hypothesisId: "C",
          location: "Farmland.tsx:Modal",
          msg: `[DEBUG] modal unmounted ${DEBUG_IMPORT_BUILD}`,
          data: { title },
          ts: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      document.body.style.overflow = originalOverflow;
    };
  }, [title]);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4">
      <div className="max-h-[90vh] w-full max-w-6xl overflow-hidden rounded bg-white shadow-lg">
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
    </div>,
    document.body
  );
}

function EmptyIllustration() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
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
      <p className="mt-3 text-sm" style={{ color: "#909399" }}>当前还没有符合条件的耕地数据。</p>
    </div>
  );
}

export function Farmland() {
  const [activeView, setActiveView] = useState<"detail" | "summary">("detail");
  const [detailItems, setDetailItems] = useState<DetailRow[]>([]);
  const [summaryItems, setSummaryItems] = useState<SummaryRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [stats, setStats] = useState<Stats>({ plot_count: 0, total_area_mu: "0", transferred_count: 0, abandoned_count: 0, reclaimed_count: 0 });
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ village_groups: [], plot_statuses: [] });
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
    // #region debug-point D:component-mounted
    fetch(DEBUG_IMPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DEBUG_IMPORT_SESSION,
        runId: "pre-fix",
        hypothesisId: "D",
        location: "Farmland.tsx:Farmland",
        msg: `[DEBUG] farmland mounted ${DEBUG_IMPORT_BUILD}`,
        data: { path: window.location.pathname },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, []);

  useEffect(() => {
    // #region debug-point B:import-open-state
    fetch(DEBUG_IMPORT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: DEBUG_IMPORT_SESSION,
        runId: "pre-fix",
        hypothesisId: "B",
        location: "Farmland.tsx:Farmland",
        msg: `[DEBUG] importOpen changed ${DEBUG_IMPORT_BUILD}`,
        data: { importOpen, hasUploadData: Boolean(uploadData), hasPreviewData: Boolean(previewData) },
        ts: Date.now(),
      }),
    }).catch(() => {});
    // #endregion
  }, [importOpen, previewData, uploadData]);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    const endpoint = activeView === "summary" ? "/api/farmland/households/" : "/api/farmland/";
    fetchJson<{
      items: DetailRow[] | SummaryRow[];
      pagination: Pagination;
      stats: Stats;
      filter_options: FilterOptions;
    }>(endpoint, {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        if (activeView === "summary") {
          setSummaryItems(payload.items as SummaryRow[]);
        } else {
          setDetailItems(payload.items as DetailRow[]);
        }
        setPagination(payload.pagination);
        setStats(payload.stats);
        setFilterOptions(payload.filter_options || { village_groups: [], plot_statuses: [] });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [activeView, pagination.page, pagination.page_size, submittedFilters]);

  const previewColumns = useMemo(
    () => ["row_number", "plot_code", "contractor_name", "village_group", "area_mu", "plot_status", "transfer_status", "errors"],
    []
  );

  const detailColumns = [
    "序号",
    "地块编号",
    "村组",
    "承包户",
    "承包户身份证号",
    "关联居民ID",
    "地块位置",
    "面积（亩）",
    "东至",
    "南至",
    "西至",
    "北至",
    "地块状态",
    "流转情况",
    "确权情况",
    "当前种植",
    "最新变更",
    "变更日期",
    "备注",
  ];

  const summaryColumns = ["序号", "承包户", "承包户身份证号", "关联居民ID", "村组", "地块数量", "总面积（亩）", "流转地块", "已确权地块", "地块编号", "最近变更日期"];

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
    window.open(`/api/farmland/export/${buildQuery({ ...submittedFilters, view: activeView })}`, "_blank");
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
      const payload = await uploadForm<UploadPayload>("/api/farmland/import/upload/", formData);
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
      const payload = await postJson<PreviewPayload>("/api/farmland/import/preview/", {
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
      const payload = await postJson<ImportResult>("/api/farmland/import/commit/", {
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
                    onClick={() => window.open(`/api/farmland/import/${lastBatchId}/error-report/`, "_blank")}
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

      <div className="overflow-hidden rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>承包户</span>
              <input
                value={filters.contractor_name}
                onChange={(event) => setFilters((current) => ({ ...current, contractor_name: event.target.value }))}
                placeholder="输入承包户名称"
                className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", width: 156, background: "#fff", color: "#303133" }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>地块编号</span>
              <input
                value={filters.plot_code}
                onChange={(event) => setFilters((current) => ({ ...current, plot_code: event.target.value }))}
                placeholder="输入地块编号"
                className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", width: 146, background: "#fff", color: "#303133" }}
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>村组</span>
              <SelectField value={filters.village_group} onChange={(value) => setFilters((current) => ({ ...current, village_group: value }))} placeholder="全部村组" options={filterOptions.village_groups} width={118} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>地块状态</span>
              <SelectField value={filters.plot_status} onChange={(value) => setFilters((current) => ({ ...current, plot_status: value }))} placeholder="全部状态" options={filterOptions.plot_statuses} width={118} />
            </div>
            <button type="button" onClick={handleSearch} className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-85" style={{ background: "#1677ff" }}>
              <Search style={{ width: 13, height: 13 }} />
              查询
            </button>
            <button type="button" onClick={handleReset} className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-opacity hover:opacity-85" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
              <RotateCcw style={{ width: 13, height: 13 }} />
              重置
            </button>
            <button type="button" onClick={handleExport} className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-opacity hover:opacity-85" style={{ background: "#f4f4f5", color: "#606266", border: "1px solid #dcdfe6" }}>
              <Download style={{ width: 13, height: 13 }} />
              导出
            </button>
            <button
              type="button"
              onClick={(event) => {
                // #region debug-point A:import-button-click
                fetch(DEBUG_IMPORT_URL, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sessionId: DEBUG_IMPORT_SESSION,
                    runId: "pre-fix",
                    hypothesisId: "A",
                    location: "Farmland.tsx:button",
                    msg: `[DEBUG] import button clicked ${DEBUG_IMPORT_BUILD}`,
                    data: {
                      text: event.currentTarget.textContent?.trim() || "",
                      disabled: event.currentTarget.disabled,
                    },
                    ts: Date.now(),
                  }),
                }).catch(() => {});
                // #endregion
                setImportOpen(true);
              }}
              className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white transition-opacity hover:opacity-85"
              style={{ background: "#fa8c16" }}
            >
              <Upload style={{ width: 13, height: 13 }} />
              导入台账
            </button>
          </div>
        </div>

        <div className="flex flex-wrap" style={{ borderBottom: "1px solid #f0f0f0", background: "#f8faff" }}>
          {[
            { label: "地块总数", value: String(stats.plot_count) },
            { label: "总面积(亩)", value: stats.total_area_mu || "0" },
            { label: "流转地块", value: String(stats.transferred_count) },
            { label: "撂荒地块", value: String(stats.abandoned_count) },
            { label: "复垦相关", value: String(stats.reclaimed_count) },
          ].map((item, index) => (
            <div key={item.label} className="flex-1 px-6 py-4" style={{ minWidth: 180, borderLeft: index > 0 ? "1px solid #e4e7ed" : undefined }}>
              <p className="mb-1 text-xs" style={{ color: "#909399" }}>{item.label}</p>
              <p className="font-semibold" style={{ color: "#303133", fontSize: 20 }}>{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between px-5 pt-3 pb-2">
          <span className="text-sm font-medium" style={{ color: "#303133" }}>耕地查询</span>
          <div className="flex items-center gap-3">
            <div className="flex overflow-hidden rounded" style={{ border: "1px solid #dcdfe6" }}>
              <button
                type="button"
                onClick={() => {
                  setActiveView("detail");
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className="px-3 py-1 text-xs"
                style={{ background: activeView === "detail" ? "#1677ff" : "#fff", color: activeView === "detail" ? "#fff" : "#606266" }}
              >
                地块明细
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("summary");
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className="px-3 py-1 text-xs"
                style={{ borderLeft: "1px solid #dcdfe6", background: activeView === "summary" ? "#1677ff" : "#fff", color: activeView === "summary" ? "#fff" : "#606266" }}
              >
                按户汇总
              </button>
            </div>
            <span className="text-sm" style={{ color: "#909399" }}>
              共{pagination.total}{activeView === "detail" ? "块" : "户"}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto px-5 pb-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: activeView === "detail" ? 2200 : 1280, border: "1px solid #e4e7ed", borderRadius: 4 }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {(activeView === "detail" ? detailColumns : summaryColumns).map((column) => (
                  <th key={column} className="whitespace-nowrap px-3 py-2.5 text-left" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={activeView === "detail" ? detailColumns.length : summaryColumns.length} className="px-3 py-16 text-center" style={{ color: "#909399" }}>
                    加载中...
                  </td>
                </tr>
              ) : activeView === "detail" ? (
                detailItems.length === 0 ? (
                  <tr>
                    <td colSpan={detailColumns.length}>
                      <EmptyIllustration />
                    </td>
                  </tr>
                ) : (
                  detailItems.map((item, index) => (
                    <tr key={item.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.seq}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0", color: "#1677ff" }}>{item.plot_code}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.village_group || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.contractor_name || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.contractor_identity_number || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.linked_resident_id ?? "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.plot_location || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.area_mu || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.east_boundary || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.south_boundary || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.west_boundary || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.north_boundary || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.plot_status || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.transfer_status || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.confirmation_status || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.current_planting || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.latest_change || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.change_date || "-"}</td>
                      <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.notes || "-"}</td>
                    </tr>
                  ))
                )
              ) : summaryItems.length === 0 ? (
                <tr>
                  <td colSpan={summaryColumns.length}>
                    <EmptyIllustration />
                  </td>
                </tr>
              ) : (
                summaryItems.map((item, index) => (
                  <tr key={item.id} style={{ background: index % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.seq}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0", color: "#1677ff" }}>{item.contractor_name || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.contractor_identity_number || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.linked_resident_id ?? "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.village_group || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.plot_count}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.total_area_mu}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.transferred_count}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.confirmed_count}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.plot_codes || "-"}</td>
                    <td className="px-3 py-2" style={{ borderBottom: "1px solid #f0f0f0" }}>{item.latest_change_date || "-"}</td>
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
              className="appearance-none rounded px-2 py-1 pr-6 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", color: "#303133", background: "#fff" }}
            >
              <option value={10}>10条/页</option>
              <option value={20}>20条/页</option>
              <option value={50}>50条/页</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
          </div>
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-sm text-white" style={{ background: "#1677ff" }}>
            {pagination.page}
          </button>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="flex h-7 w-7 items-center justify-center rounded hover:bg-gray-50 disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>

      {importOpen && (
        <Modal
          title="耕地台账 Excel 导入"
          onClose={() => {
            setImportOpen(false);
            setUploadData(null);
            setPreviewData(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
              <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 1：上传 Excel</div>
              <p className="mt-1 text-xs" style={{ color: "#909399" }}>耕地台账仅支持通过 Excel 导入新增或更新，上传后先完成字段映射，再预览并导入数据库。</p>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 2：字段映射</div>
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>按照项目规范，导入默认先做字段映射，以兼容不同耕地台账模板。</p>
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
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 3：数据预览</div>
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>共 {previewData.total_rows} 行，有效 {previewData.valid_rows} 行，无效 {previewData.invalid_rows} 行。</p>
                  </div>
                  <button type="button" onClick={handleCommitImport} disabled={commitLoading} className="rounded-sm px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: "#52c41a" }}>
                    {commitLoading ? "导入中..." : "确认导入数据库"}
                  </button>
                </div>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 920 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "plot_code"
                                ? "地块编号"
                                : column === "contractor_name"
                                  ? "承包户"
                                  : column === "village_group"
                                    ? "村组"
                                    : column === "area_mu"
                                      ? "面积（亩）"
                                      : column === "plot_status"
                                        ? "地块状态"
                                        : column === "transfer_status"
                                          ? "流转情况"
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
