import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, FileText, Search, Upload, User, X } from "lucide-react";
import { deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";
import { dialog } from "../lib/dialog";

type RiskCheck = {
  id: number;
  seq?: number;
  resident_id: number | null;
  full_name: string;
  identity_number: string;
  village_group: string;
  household_type: string;
  risk_level: string;
  warning_content: string;
  medical_amount: string;
  warning_time: string;
  alert_time: string;
};

type Resident = {
  id: number;
  full_name: string;
  gender: string;
  identity_number: string;
  village_group: string;
  phone: string;
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
  sample_rows: Array<Record<string, string | number | null>>;
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

const TABLE_COLS = ["序号", "姓名", "身份证号", "村组", "风险等级", "预警时间", "预警内容", "告警时间", "操作"];

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

export function RiskCheck() {
  const [items, setItems] = useState<RiskCheck[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({
    full_name: "",
    identity_number: "",
    risk_level: "全部",
    start_date: "",
    end_date: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSelectResidentModal, setShowSelectResidentModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [searchResidentParams, setSearchResidentParams] = useState({ full_name: "", identity_number: "", village_group: "" });
  const [residents, setResidents] = useState<Resident[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [formData, setFormData] = useState({
    risk_level: "中风险",
    warning_content: "",
    medical_amount: "",
    warning_time: new Date().toISOString().split("T")[0],
  });
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [importUploading, setImportUploading] = useState(false);
  const [uploadData, setUploadData] = useState<UploadPayload | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<PreviewPayload | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<ImportResult | null>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData(page = 1) {
    setLoading(true);
    setErrorMessage("");
    try {
      const data = await fetchJson<{ items: RiskCheck[]; pagination: Pagination }>("/api/risk-checks/", {
        params: {
          ...filters,
          page,
          page_size: pagination.page_size,
        },
      });
      setItems(data.items || []);
      setPagination(data.pagination || { page: 1, page_size: 10, total: 0, total_pages: 0 });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function searchResidents() {
    setResidentsLoading(true);
    try {
      const data = await fetchJson<{ items: Resident[] }>("/api/residents/", {
        params: {
          ...searchResidentParams,
          page: 1,
          page_size: 20,
        },
      });
      setResidents(data.items || []);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setResidentsLoading(false);
    }
  }

  async function handleAdd() {
    if (!selectedResident) {
      setErrorMessage("请先选择居民。");
      return;
    }
    if (!formData.risk_level || !formData.warning_time) {
      setErrorMessage("请填写完整信息。");
      return;
    }

    try {
      await postJson("/api/risk-checks/create/", {
        resident_id: selectedResident.id,
        ...formData,
      });
      setSuccessMessage("风险预警已新增。");
      setShowAddModal(false);
      setSelectedResident(null);
      setFormData({
        risk_level: "中风险",
        warning_content: "",
        medical_amount: "",
        warning_time: new Date().toISOString().split("T")[0],
      });
      loadData(1);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleDelete(id: number) {
    const ok = await dialog.confirm("确定要删除这条记录吗？");
    if (!ok) return;
    try {
      const payload = await deleteJson<{ message: string }>(`/api/risk-checks/${id}/delete/`);
      setSuccessMessage(payload.message);
      loadData(pagination.page);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  }

  async function handleUploadFile(event: ChangeEvent<HTMLInputElement>) {
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

    const formDataToUpload = new FormData();
    formDataToUpload.append("file", file);
    setImportUploading(true);
    setErrorMessage("");

    try {
      const payload = await uploadForm<UploadPayload>("/api/risk-checks/import/upload/", formDataToUpload);
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
  }

  async function handlePreviewImport() {
    if (!uploadData) {
      return;
    }
    setPreviewLoading(true);
    setErrorMessage("");
    try {
      const payload = await postJson<PreviewPayload>("/api/risk-checks/import/preview/", {
        batch_id: uploadData.batch_id,
        mapping,
      });
      setPreviewData(payload);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleCommitImport() {
    if (!uploadData) {
      return;
    }
    setCommitLoading(true);
    setErrorMessage("");
    try {
      const payload = await postJson<ImportResult>("/api/risk-checks/import/commit/", {
        batch_id: uploadData.batch_id,
        mapping,
      });
      setLastImportResult(payload);
      setLastBatchId(uploadData.batch_id);
      setSuccessMessage(`导入完成：新增 ${payload.created_rows} 条，更新 ${payload.updated_rows} 条，跳过 ${payload.skipped_rows} 条。`);
      setShowImportModal(false);
      setUploadData(null);
      setPreviewData(null);
      loadData(1);
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setCommitLoading(false);
    }
  }

  const previewColumns = useMemo(
    () => ["row_number", "full_name", "identity_number", "head_name", "risk_level", "warning_time", "errors"],
    []
  );

  const handleDownloadErrorReport = () => {
    if (!lastBatchId) {
      return;
    }
    window.open(`/api/risk-checks/import/${lastBatchId}/error-report/`, "_blank");
  };

  return (
    <div className="space-y-3">
      {(errorMessage || successMessage) && (
        <div className="space-y-2">
          {errorMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
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

      <div className="rounded border bg-white px-5 py-4" style={{ borderColor: "#e4e7ed" }}>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>姓名</span>
            <input
              placeholder="请输入姓名"
              value={filters.full_name}
              onChange={(event) => setFilters((current) => ({ ...current, full_name: event.target.value }))}
              className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", width: 130, background: "#fff", color: "#303133" }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>身份证号</span>
            <input
              placeholder="请输入身份证号"
              value={filters.identity_number}
              onChange={(event) => setFilters((current) => ({ ...current, identity_number: event.target.value }))}
              className="rounded px-2.5 py-1.5 text-sm focus:outline-none"
              style={{ border: "1px solid #dcdfe6", width: 170, background: "#fff", color: "#303133" }}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>风险等级</span>
            <div className="relative" style={{ width: 88 }}>
              <select
                value={filters.risk_level}
                onChange={(event) => setFilters((current) => ({ ...current, risk_level: event.target.value }))}
                className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none"
                style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#303133" }}
              >
                {["全部", "高风险", "中风险", "低风险"].map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <button type="button" onClick={() => loadData(1)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:opacity-85">
            查询
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ full_name: "", identity_number: "", risk_level: "全部", start_date: "", end_date: "" });
              setTimeout(() => loadData(1), 0);
            }}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
          >
            重置
          </button>
          <button type="button" onClick={() => setShowImportModal(true)} className="rounded bg-orange-500 px-3 py-1.5 text-sm text-white hover:opacity-85">
            导入
          </button>
          <button type="button" onClick={() => setShowAddModal(true)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:opacity-85">
            新增预警
          </button>
        </div>

        <div className="overflow-x-auto rounded border border-gray-200">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-gray-50">
                {TABLE_COLS.map((col) => (
                  <th key={col} className="whitespace-nowrap border-b border-gray-200 px-3 py-2.5 text-left font-medium text-gray-600">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="py-16 text-center text-gray-400">
                    加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length} className="py-16 text-center text-gray-400">
                    暂无数据
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-3 py-2.5">{item.seq || idx + 1}</td>
                    <td className="px-3 py-2.5">{item.full_name}</td>
                    <td className="px-3 py-2.5">{item.identity_number}</td>
                    <td className="px-3 py-2.5">{item.village_group || "-"}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs ${item.risk_level === "高风险" ? "bg-red-100 text-red-600" : item.risk_level === "中风险" ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"}`}
                      >
                        {item.risk_level}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{item.warning_time ? item.warning_time.split("T")[0] : "-"}</td>
                    <td className="max-w-xs truncate px-3 py-2.5" title={item.warning_content}>
                      {item.warning_content || "-"}
                    </td>
                    <td className="px-3 py-2.5">{item.alert_time ? new Date(item.alert_time).toLocaleString() : "-"}</td>
                    <td className="px-3 py-2.5">
                      <button type="button" onClick={() => handleDelete(item.id)} className="text-red-500 hover:text-red-700">
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-3 flex items-center justify-end gap-2 text-sm text-gray-600">
          <span>共{pagination.total}条</span>
          <button
            type="button"
            onClick={() => loadData(Math.max(1, pagination.page - 1))}
            disabled={pagination.page <= 1}
            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded bg-blue-600 text-white">{pagination.page}</span>
          <button
            type="button"
            onClick={() => loadData(Math.min(pagination.total_pages || 1, pagination.page + 1))}
            disabled={pagination.page >= pagination.total_pages}
            className="flex h-7 w-7 items-center justify-center rounded border hover:bg-gray-50 disabled:opacity-50"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {showAddModal && (
        <Modal title="新增风险预警" onClose={() => setShowAddModal(false)}>
          <div className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-800">选择居民</label>
              {selectedResident ? (
                <div className="flex items-center justify-between rounded border bg-gray-50 p-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                      <User className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{selectedResident.full_name}</div>
                      <div className="text-sm text-gray-500">{selectedResident.identity_number}</div>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedResident(null)} className="text-sm text-red-500 hover:text-red-700">
                    重新选择
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSelectResidentModal(true)}
                  className="flex w-full items-center justify-center gap-2 rounded border border-dashed p-3 text-gray-500 hover:bg-gray-50"
                >
                  <Search className="h-4 w-4" />
                  <span>点击选择居民</span>
                </button>
              )}
            </div>

            {selectedResident && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">风险等级</label>
                    <select
                      value={formData.risk_level}
                      onChange={(event) => setFormData((current) => ({ ...current, risk_level: event.target.value }))}
                      className="w-full rounded border px-3 py-2 text-sm"
                    >
                      <option value="高风险">高风险</option>
                      <option value="中风险">中风险</option>
                      <option value="低风险">低风险</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-gray-600">预警时间</label>
                    <input
                      type="date"
                      value={formData.warning_time}
                      onChange={(event) => setFormData((current) => ({ ...current, warning_time: event.target.value }))}
                      className="w-full rounded border px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">医疗自付费用金额 (元)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.medical_amount}
                    onChange={(event) => setFormData((current) => ({ ...current, medical_amount: event.target.value }))}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="如无则不填"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">预警内容</label>
                  <textarea
                    rows={4}
                    value={formData.warning_content}
                    onChange={(event) => setFormData((current) => ({ ...current, warning_content: event.target.value }))}
                    className="w-full rounded border px-3 py-2 text-sm"
                    placeholder="输入预警详细内容..."
                  />
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 border-t bg-gray-50 px-1 pt-4">
              <button type="button" onClick={() => setShowAddModal(false)} className="rounded border px-4 py-2 text-sm hover:bg-gray-100">
                取消
              </button>
              <button type="button" onClick={handleAdd} className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700">
                保存
              </button>
            </div>
          </div>
        </Modal>
      )}

      {showSelectResidentModal && (
        <Modal title="选择居民" onClose={() => setShowSelectResidentModal(false)}>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                placeholder="姓名"
                value={searchResidentParams.full_name}
                onChange={(event) => setSearchResidentParams((current) => ({ ...current, full_name: event.target.value }))}
                className="rounded border px-3 py-1.5 text-sm"
              />
              <input
                placeholder="身份证号"
                value={searchResidentParams.identity_number}
                onChange={(event) => setSearchResidentParams((current) => ({ ...current, identity_number: event.target.value }))}
                className="rounded border px-3 py-1.5 text-sm"
              />
              <button type="button" onClick={searchResidents} className="rounded bg-blue-600 px-4 py-1.5 text-sm text-white hover:bg-blue-700">
                搜索
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto rounded border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">姓名</th>
                    <th className="px-4 py-2 text-left">身份证号</th>
                    <th className="px-4 py-2 text-left">村组</th>
                    <th className="px-4 py-2 text-left">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {residentsLoading ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        搜索中...
                      </td>
                    </tr>
                  ) : residents.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-gray-500">
                        请输入条件搜索居民
                      </td>
                    </tr>
                  ) : (
                    residents.map((resident) => (
                      <tr key={resident.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2">{resident.full_name}</td>
                        <td className="px-4 py-2">{resident.identity_number}</td>
                        <td className="px-4 py-2">{resident.village_group}</td>
                        <td className="px-4 py-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedResident(resident);
                              setShowSelectResidentModal(false);
                            }}
                            className="text-blue-600 hover:underline"
                          >
                            选择
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      )}

      {showImportModal && (
        <Modal
          title="风险排查 Excel 导入"
          onClose={() => {
            setShowImportModal(false);
            setUploadData(null);
            setPreviewData(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded border px-4 py-3" style={{ borderColor: "#ebeef5", background: "#fafafa" }}>
              <div className="text-sm font-medium" style={{ color: "#303133" }}>步骤 1：上传 Excel</div>
              <p className="mt-1 text-xs" style={{ color: "#909399" }}>
                上传后先配置字段映射，再预览并确认导入风险排查数据。
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
                      至少需要映射身份证号，可选映射姓名、风险等级、预警时间等字段。
                    </p>
                  </div>
                  <button type="button" onClick={handlePreviewImport} disabled={previewLoading} className="rounded-sm px-3 py-1.5 text-xs text-white disabled:opacity-50" style={{ background: "#1677ff" }}>
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
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "full_name"
                                ? "姓名"
                                : column === "identity_number"
                                  ? "身份证号"
                                  : column === "head_name"
                                    ? "户主姓名"
                                    : column === "risk_level"
                                      ? "风险等级"
                                      : column === "warning_time"
                                        ? "预警时间"
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
