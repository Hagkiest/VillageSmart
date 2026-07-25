import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Download, FileText, Plus, RotateCcw, Search, Upload, X } from "lucide-react";
import { buildQuery, deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";
import { dialog } from "../lib/dialog";

type CareObjectRow = {
  id: number;
  seq: number;
  resident_id: number | null;
  full_name: string;
  gender: string;
  ethnicity: string;
  identity_number: string;
  age: number | null;
  phone: string;
  village_group: string;
  address: string;
  care_type: string;
  care_level: string;
  caregiver_name: string;
  caregiver_phone: string;
  notes: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
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
  items: CareObjectRow[];
  pagination: Pagination;
  filter_options?: {
    care_types?: string[];
    village_groups?: string[];
  };
};

const DEFAULT_CARE_TYPES = ["孤寡老人", "留守儿童", "留守妇女", "其他"];

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

export function CareObjects() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CareObjectRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [careTypeOptions, setCareTypeOptions] = useState<string[]>(DEFAULT_CARE_TYPES);
  const [villageOptions, setVillageOptions] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    full_name: "",
    identity_number: "",
    care_type: "",
    village_group: "",
  });
  const [submittedFilters, setSubmittedFilters] = useState({
    full_name: "",
    identity_number: "",
    care_type: "",
    village_group: "",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
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
    fetchJson<ListPayload>("/api/care-objects/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setSelectedIds([]);
        setCareTypeOptions((payload.filter_options?.care_types?.length ? payload.filter_options.care_types : DEFAULT_CARE_TYPES) || DEFAULT_CARE_TYPES);
        setVillageOptions(payload.filter_options?.village_groups || []);
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const previewColumns = useMemo(
    () => ["row_number", "full_name", "identity_number", "care_type", "care_level", "caregiver_name", "errors"],
    []
  );

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const reset = { full_name: "", identity_number: "", care_type: "", village_group: "" };
    setFilters(reset);
    setSubmittedFilters(reset);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleExport = () => {
    window.open(`/api/care-objects/export/${buildQuery(submittedFilters)}`, "_blank");
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
      const payload = await uploadForm<UploadPayload>("/api/care-objects/import/upload/", formData);
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
      const payload = await postJson<PreviewPayload>("/api/care-objects/import/preview/", {
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
      const payload = await postJson<ImportResult>("/api/care-objects/import/commit/", {
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
    const ok = await dialog.confirm("确定要删除这条关爱对象记录吗？");
    if (!ok) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/care-objects/${id}/`);
      setSuccessMessage(payload.message);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      return;
    }
    const ok = await dialog.confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`);
    if (!ok) {
      return;
    }
    try {
      const payload = await postJson<{ message: string }>("/api/care-objects/bulk-delete/", { ids: selectedIds });
      setSuccessMessage(payload.message);
      setSelectedIds([]);
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
                    onClick={() => window.open(`/api/care-objects/import/${lastBatchId}/error-report/`, "_blank")}
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
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #ebeef5" }}>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: "#606266" }}>居民姓名</span>
              <input value={filters.full_name} onChange={(e) => setFilters((current) => ({ ...current, full_name: e.target.value }))} placeholder="请输入居民姓名" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", width: 150 }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: "#606266" }}>身份证号</span>
              <input value={filters.identity_number} onChange={(e) => setFilters((current) => ({ ...current, identity_number: e.target.value }))} placeholder="请输入身份证号" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", width: 170 }} />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: "#606266" }}>关爱类型</span>
              <div className="relative" style={{ width: 150 }}>
                <select value={filters.care_type} onChange={(e) => setFilters((current) => ({ ...current, care_type: e.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                  <option value="">请选择关爱类型</option>
                  {careTypeOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm" style={{ color: "#606266" }}>村组</span>
              <div className="relative" style={{ width: 120 }}>
                <select value={filters.village_group} onChange={(e) => setFilters((current) => ({ ...current, village_group: e.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                  <option value="">请选择村组</option>
                  {villageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
              </div>
            </div>
            <button type="button" onClick={handleSearch} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#1677ff" }}>
              <Search style={{ width: 13, height: 13 }} />
              搜索
            </button>
            <button type="button" onClick={handleReset} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
              <RotateCcw style={{ width: 13, height: 13 }} />
              重置
            </button>
            <button type="button" onClick={() => navigate("/care-objects/new")} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#67c23a" }}>
              <Plus style={{ width: 13, height: 13 }} />
              新增关爱对象
            </button>
            {selectedIds.length > 0 && (
              <button type="button" onClick={handleBulkDelete} className="rounded px-3 py-1.5 text-sm text-white" style={{ background: "#f56c6c" }}>
                批量删除 ({selectedIds.length})
              </button>
            )}
            <button type="button" onClick={() => setImportOpen(true)} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#e6a23c" }}>
              <Upload style={{ width: 13, height: 13 }} />
              批量导入
            </button>
            <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
              <Download style={{ width: 13, height: 13 }} />
              导出
            </button>
          </div>
        </div>

        <div className="px-4 py-4">
          <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid #ebeef5" }}>
            <table className="w-full text-xs" style={{ minWidth: 1500, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {["checkbox", "序号", "姓名", "性别", "民族", "身份证号", "年龄", "联系电话", "村组", "家庭地址", "关爱类型", "关爱等级", "关爱人员", "联系方式", "备注", "操作"].map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                      {column === "checkbox" ? (
                        <input
                          type="checkbox"
                          checked={items.length > 0 && selectedIds.length === items.length}
                          onChange={(e) => setSelectedIds(e.target.checked ? items.map((item) => item.id) : [])}
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
                    <td colSpan={16} className="px-3 py-10 text-center" style={{ color: "#909399" }}>
                      数据加载中...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={16} className="px-3 py-12 text-center" style={{ color: "#909399" }}>
                      暂无数据
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) =>
                            setSelectedIds((current) =>
                              e.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id)
                            )
                          }
                        />
                      </td>
                      <td className="px-3 py-2">{item.seq}</td>
                      <td className="px-3 py-2">{item.full_name}</td>
                      <td className="px-3 py-2">{item.gender || "-"}</td>
                      <td className="px-3 py-2">{item.ethnicity || "-"}</td>
                      <td className="px-3 py-2">{item.identity_number}</td>
                      <td className="px-3 py-2">{item.age ?? "-"}</td>
                      <td className="px-3 py-2">{item.phone || "-"}</td>
                      <td className="px-3 py-2">{item.village_group || "-"}</td>
                      <td className="px-3 py-2">{item.address || "-"}</td>
                      <td className="px-3 py-2">{item.care_type || "-"}</td>
                      <td className="px-3 py-2">{item.care_level || "-"}</td>
                      <td className="px-3 py-2">{item.caregiver_name || "-"}</td>
                      <td className="px-3 py-2">{item.caregiver_phone || "-"}</td>
                      <td className="px-3 py-2">{item.notes || "-"}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => navigate(`/care-objects/${item.id}/detail`)} className="text-blue-500 hover:text-blue-600">
                            详情
                          </button>
                          <button type="button" onClick={() => navigate(`/care-objects/${item.id}/edit`)} className="text-blue-500 hover:text-blue-600">
                            编辑
                          </button>
                          <button type="button" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-600">
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

          <div className="mt-3 flex items-center justify-end gap-2 text-xs" style={{ color: "#606266" }}>
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
      </div>

      {importOpen && (
        <Modal
          title="关爱对象 Excel 导入"
          onClose={() => {
            setImportOpen(false);
            setUploadData(null);
            setPreviewData(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
              <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 1：上传 Excel</div>
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
                    <p className="mt-1 text-xs" style={{ color: "#909399" }}>导入功能默认先完成字段映射，再做预览和正式入库。</p>
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
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 760 }}>
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
                                  : column === "care_type"
                                    ? "关爱类型"
                                    : column === "care_level"
                                      ? "关爱等级"
                                      : column === "caregiver_name"
                                        ? "关爱人员"
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
