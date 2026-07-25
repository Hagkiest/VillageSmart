import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileText,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
  RotateCcw,
  X,
} from "lucide-react";

import { buildQuery, deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";

type ResidentRow = {
  id: number;
  seq: number;
  full_name: string;
  gender: string;
  identity_number: string;
  birth_date: string;
  age: number | null;
  ethnicity: string;
  phone: string;
  head_name: string;
  head_identity_number: string;
  relation_to_head: string;
  village_group: string;
  address: string;
  household_type: string;
  grid_name: string;
  political_status: string;
  marital_status: string;
  status: string;
};

type ResidentDetail = {
  resident: ResidentRow;
  household: {
    household_no: string;
    head_name: string;
    head_identity_number: string;
    head_gender: string;
    village_group: string;
    address: string;
    household_type: string;
    account_type: string;
    grid_name: string;
    housing_type: string;
  } | null;
  household_members: ResidentRow[];
};

type HouseholdRow = {
  id: number;
  seq: number;
  head_name: string;
  head_gender: string;
  village_group: string;
  address: string;
  head_identity_number: string;
  member_count: number;
  household_type: string;
  grid_name: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type OptionsPayload = {
  options: Record<string, string[]>;
};

type ListPayload<T> = {
  items: T[];
  pagination: Pagination;
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
  sample_rows: Record<string, string>[];
  system_fields: SystemField[];
  suggested_mapping: Record<string, string | null>;
};

type PreviewPayload = {
  preview_rows: Array<Record<string, string | number | string[] | null>>;
  total_rows: number;
  valid_rows: number;
  invalid_rows: number;
  errors: Array<{ row_number: number; messages: string[] }>;
};

type ImportResult = {
  created_rows: number;
  updated_rows: number;
  skipped_rows: number;
  errors: Array<{ row_number: number; messages: string[] }>;
};

type FilterState = {
  full_name: string;
  head_name: string;
  gender: string;
  village_group: string;
  identity_number: string;
  phone: string;
  political_status: string;
  marital_status: string;
  health_status: string;
  residency_status: string;
  household_type: string;
  grid_name: string;
  status: string;
  address: string;
  birth_year_start: string;
  birth_year_end: string;
  age_min: string;
  age_max: string;
};

type DetailColumnKey =
  | "seq"
  | "full_name"
  | "gender"
  | "identity_number"
  | "birth_date"
  | "age"
  | "ethnicity"
  | "phone"
  | "head_name"
  | "relation_to_head"
  | "village_group"
  | "address"
  | "household_type"
  | "grid_name"
  | "political_status"
  | "marital_status"
  | "actions";

type DetailColumnDefinition = {
  key: DetailColumnKey;
  label: string;
};

const DETAIL_COLUMN_STORAGE_KEY = "resident_query_visible_columns";

const DETAIL_COLUMN_DEFINITIONS: DetailColumnDefinition[] = [
  { key: "seq", label: "序号" },
  { key: "full_name", label: "姓名" },
  { key: "gender", label: "性别" },
  { key: "identity_number", label: "身份证号码" },
  { key: "birth_date", label: "出生日期" },
  { key: "age", label: "年龄" },
  { key: "ethnicity", label: "民族" },
  { key: "phone", label: "联系电话" },
  { key: "head_name", label: "户主姓名" },
  { key: "relation_to_head", label: "与户主关系" },
  { key: "village_group", label: "村组" },
  { key: "address", label: "家庭地址" },
  { key: "household_type", label: "户属性" },
  { key: "grid_name", label: "所属网格" },
  { key: "political_status", label: "政治面貌" },
  { key: "marital_status", label: "婚姻状况" },
  { key: "actions", label: "操作" },
];

const DEFAULT_VISIBLE_DETAIL_COLUMNS = DETAIL_COLUMN_DEFINITIONS.map((column) => column.key);

const HOUSEHOLD_COLUMNS = [
  "序号",
  "户主姓名",
  "性别",
  "村组",
  "家庭地址",
  "户主身份证号码",
  "家庭人数",
  "户属性",
  "所属网格",
];

const DEFAULT_FILTERS: FilterState = {
  full_name: "",
  head_name: "",
  gender: "",
  village_group: "",
  identity_number: "",
  phone: "",
  political_status: "",
  marital_status: "",
  health_status: "",
  residency_status: "",
  household_type: "",
  grid_name: "",
  status: "正常",
  address: "",
  birth_year_start: "",
  birth_year_end: "",
  age_min: "",
  age_max: "",
};

function FieldLabel({ text }: { text: string }) {
  return (
    <span className="text-xs whitespace-nowrap" style={{ color: "#606266", lineHeight: "28px" }}>
      {text}
    </span>
  );
}

function TextField({
  value,
  placeholder,
  width = 124,
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
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="rounded-sm text-xs px-2 py-1 focus:outline-none"
      style={{
        width,
        height: 28,
        border: "1px solid #dcdfe6",
        background: "#fff",
        color: "#303133",
      }}
    />
  );
}

function SelectField({
  value,
  placeholder,
  options,
  width = 116,
  onChange,
}: {
  value: string;
  placeholder: string;
  options: string[];
  width?: number;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative" style={{ width }}>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-sm text-xs px-2 py-1 pr-6 appearance-none focus:outline-none"
        style={{
          height: 28,
          border: "1px solid #dcdfe6",
          background: "#fff",
          color: value ? "#303133" : "#c0c4cc",
        }}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <ChevronDown
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
        style={{ width: 12, height: 12, color: "#c0c4cc" }}
      />
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
  icon?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1 rounded-sm px-3 text-xs transition-opacity hover:opacity-85"
      style={{
        height: 28,
        background: bg,
        color,
        border: border ?? "none",
      }}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function EmptyIllustration({ text = "暂无数据" }: { text?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <svg width="118" height="90" viewBox="0 0 118 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="59" cy="82" rx="28" ry="5" fill="#f0f2f5" />
        <path d="M45 30L59 22L75 30L62 38L45 30Z" fill="#e7ebf2" />
        <path d="M38 38L54 28L54 68L38 57V38Z" fill="#eef1f6" />
        <path d="M80 38L64 28V68L80 57V38Z" fill="#e4e8ef" />
        <path d="M44 42H74V73H44V42Z" fill="#f5f7fa" />
        <path d="M44 42L59 53L74 42" fill="#edf1f7" />
        <path d="M44 42L59 53L74 42" stroke="#e1e6ef" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M44 42H74V73H44V42Z" stroke="#e1e6ef" strokeWidth="1.4" />
        <path d="M30 52L45 30V44L30 65V52Z" fill="#f3f5f9" />
        <path d="M88 52L75 30V44L88 65V52Z" fill="#edf1f6" />
      </svg>
      <p className="mt-3 text-xs" style={{ color: "#c0c4cc" }}>
        {text}
      </p>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-5xl rounded border bg-white shadow-xl" style={{ borderColor: "#dcdfe6" }}>
        <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: "#ebeef5" }}>
          <span className="text-sm font-medium" style={{ color: "#303133" }}>
            {title}
          </span>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-gray-100">
            <X style={{ width: 16, height: 16, color: "#909399" }} />
          </button>
        </div>
        <div className="max-h-[80vh] overflow-auto p-5">{children}</div>
      </div>
    </div>
  );
}

function getInitialVisibleDetailColumns() {
  if (typeof window === "undefined") {
    return DEFAULT_VISIBLE_DETAIL_COLUMNS;
  }

  try {
    const rawValue = window.localStorage.getItem(DETAIL_COLUMN_STORAGE_KEY);
    if (!rawValue) {
      return DEFAULT_VISIBLE_DETAIL_COLUMNS;
    }
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return DEFAULT_VISIBLE_DETAIL_COLUMNS;
    }

    const validKeys = DEFAULT_VISIBLE_DETAIL_COLUMNS.filter((columnKey) => parsed.includes(columnKey));
    return validKeys.length > 0 ? validKeys : DEFAULT_VISIBLE_DETAIL_COLUMNS;
  } catch {
    return DEFAULT_VISIBLE_DETAIL_COLUMNS;
  }
}

export function ResidentQuery() {
  const [activeView, setActiveView] = useState<"detail" | "household">("detail");
  const [filterCollapsed, setFilterCollapsed] = useState(false);
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [submittedFilters, setSubmittedFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [options, setOptions] = useState<Record<string, string[]>>({});
  const [detailRows, setDetailRows] = useState<ResidentRow[]>([]);
  const [householdRows, setHouseholdRows] = useState<HouseholdRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    page_size: 10,
    total: 0,
    total_pages: 0,
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
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailData, setDetailData] = useState<ResidentDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [residentToDelete, setResidentToDelete] = useState<ResidentRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [lastImportResult, setLastImportResult] = useState<any>(null);
  const [lastBatchId, setLastBatchId] = useState<string | null>(null);
  const [columnSettingOpen, setColumnSettingOpen] = useState(false);
  const [visibleDetailColumns, setVisibleDetailColumns] = useState<DetailColumnKey[]>(getInitialVisibleDetailColumns);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedResidentIds, setSelectedResidentIds] = useState<number[]>([]);
  const [deleteMode, setDeleteMode] = useState<"single" | "bulk">("single");

  useEffect(() => {
    fetchJson<OptionsPayload>("/api/residents/options/")
      .then((payload) => setOptions(payload.options))
      .catch((error) => setErrorMessage(error.message));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DETAIL_COLUMN_STORAGE_KEY, JSON.stringify(visibleDetailColumns));
    }
  }, [visibleDetailColumns]);

  useEffect(() => {
    const query = {
      ...submittedFilters,
      page: pagination.page,
      page_size: pagination.page_size,
    };
    const url = activeView === "household" ? "/api/residents/households/" : "/api/residents/";

    setLoading(true);
    setErrorMessage("");
    fetchJson<ListPayload<ResidentRow | HouseholdRow>>(`${url}${buildQuery(query)}`)
      .then((payload) => {
        if (activeView === "household") {
          setHouseholdRows(payload.items as HouseholdRow[]);
        } else {
          setDetailRows(payload.items as ResidentRow[]);
        }
        setPagination(payload.pagination);
      })
      .catch((error) => setErrorMessage(error.message))
      .finally(() => setLoading(false));
  }, [activeView, pagination.page, pagination.page_size, submittedFilters]);

  useEffect(() => {
    if (activeView !== "detail") {
      setSelectionMode(false);
      setSelectedResidentIds([]);
    }
  }, [activeView]);

  useEffect(() => {
    setSelectedResidentIds((current) => current.filter((id) => detailRows.some((item) => item.id === id)));
  }, [detailRows]);

  const currentRows = activeView === "household" ? householdRows : detailRows;
  const totalLabel = activeView === "household" ? `共${pagination.total}户` : `共${pagination.total}人`;
  const visibleDetailColumnDefinitions = DETAIL_COLUMN_DEFINITIONS.filter((column) => visibleDetailColumns.includes(column.key));
  const allCurrentPageSelected = detailRows.length > 0 && detailRows.every((item) => selectedResidentIds.includes(item.id));
  const selectedResidentCount = selectedResidentIds.length;

  const previewColumns = useMemo(
    () => ["row_number", "full_name", "gender", "identity_number", "head_name", "head_identity_number", "relation_to_head", "errors"],
    []
  );

  const setFilter = (key: keyof FilterState, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

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
    window.open(`/api/residents/export/${query}`, "_blank");
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
      const payload = await uploadForm<UploadPayload>("/api/residents/import/upload/", formData);
      setUploadData(payload);
      // Ensure all mapped values are strings
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
      const payload = await postJson<PreviewPayload>("/api/residents/import/preview/", {
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
      const payload = await postJson<ImportResult>("/api/residents/import/commit/", {
        batch_id: uploadData.batch_id,
        mapping,
      });
      setLastImportResult(payload);
      setLastBatchId(uploadData.batch_id);
      setSuccessMessage(
        `导入完成：新增 ${payload.created_rows} 条，更新 ${payload.updated_rows} 条，跳过 ${payload.skipped_rows} 条。`
      );
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
    if (!lastBatchId) return;
    window.open(`/api/residents/import/${lastBatchId}/error-report/`, "_blank");
  };

  const handleViewDetail = async (resident: ResidentRow) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setErrorMessage("");
    try {
      const payload = await fetchJson<ResidentDetail>(`/api/residents/${resident.id}/`);
      setDetailData(payload);
    } catch (error) {
      setErrorMessage((error as Error).message);
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleDeleteClick = (resident: ResidentRow) => {
    setDeleteMode("single");
    setResidentToDelete(resident);
    setDeleteConfirmOpen(true);
  };

  const handleToggleSelectionMode = () => {
    setSelectionMode((current) => {
      if (current) {
        setSelectedResidentIds([]);
      }
      return !current;
    });
  };

  const handleToggleSelectAllCurrentPage = () => {
    if (allCurrentPageSelected) {
      setSelectedResidentIds([]);
      return;
    }
    setSelectedResidentIds(detailRows.map((item) => item.id));
  };

  const handleToggleResidentSelection = (residentId: number) => {
    setSelectedResidentIds((current) =>
      current.includes(residentId) ? current.filter((id) => id !== residentId) : [...current, residentId]
    );
  };

  const handleBulkDeleteClick = () => {
    if (selectedResidentCount === 0) {
      setErrorMessage("请先勾选需要删除的居民记录。");
      return;
    }
    setDeleteMode("bulk");
    setDeleteConfirmOpen(true);
  };

  const handleToggleDetailColumn = (columnKey: DetailColumnKey) => {
    setVisibleDetailColumns((current) => {
      if (current.includes(columnKey)) {
        if (current.length === 1) {
          return current;
        }
        return current.filter((key) => key !== columnKey);
      }
      return DETAIL_COLUMN_DEFINITIONS.map((column) => column.key).filter((key) => [...current, columnKey].includes(key));
    });
  };

  const handleResetDetailColumns = () => {
    setVisibleDetailColumns(DEFAULT_VISIBLE_DETAIL_COLUMNS);
  };

  const handleConfirmDelete = async () => {
    if (deleteMode === "single" && !residentToDelete) return;
    if (deleteMode === "bulk" && selectedResidentCount === 0) return;
    setDeleteLoading(true);
    setErrorMessage("");
    try {
      const payload =
        deleteMode === "bulk"
          ? await postJson<{ message: string }>("/api/residents/bulk-delete/", { ids: selectedResidentIds })
          : await deleteJson<{ message: string }>(`/api/residents/${residentToDelete!.id}/delete/`);
      setSuccessMessage(payload.message);
      setDeleteConfirmOpen(false);
      setResidentToDelete(null);
      setSelectedResidentIds([]);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="relative w-full space-y-3">
      <div className="overflow-hidden rounded border bg-white" style={{ borderColor: "#e4e7ed" }}>
        {!filterCollapsed && (
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #ebeef5" }}>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <FieldLabel text="居民姓名" />
                <TextField value={filters.full_name} onChange={(value) => setFilter("full_name", value)} placeholder="姓名" width={110} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="户主姓名" />
                <TextField value={filters.head_name} onChange={(value) => setFilter("head_name", value)} placeholder="户主" width={110} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="性别" />
                <SelectField value={filters.gender} onChange={(value) => setFilter("gender", value)} placeholder="性别" width={96} options={options.gender ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="村组" />
                <SelectField value={filters.village_group} onChange={(value) => setFilter("village_group", value)} placeholder="村组" width={108} options={options.village_group ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="身份证号" />
                <TextField value={filters.identity_number} onChange={(value) => setFilter("identity_number", value)} placeholder="身份证" width={136} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="联系电话" />
                <TextField value={filters.phone} onChange={(value) => setFilter("phone", value)} placeholder="电话" width={116} />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <FieldLabel text="政治面貌" />
                <SelectField value={filters.political_status} onChange={(value) => setFilter("political_status", value)} placeholder="政治面貌" width={108} options={options.political_status ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="婚姻状况" />
                <SelectField value={filters.marital_status} onChange={(value) => setFilter("marital_status", value)} placeholder="婚姻状况" width={108} options={options.marital_status ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="健康状态" />
                <SelectField value={filters.health_status} onChange={(value) => setFilter("health_status", value)} placeholder="健康状态" width={108} options={options.health_status ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="居住状态" />
                <SelectField value={filters.residency_status} onChange={(value) => setFilter("residency_status", value)} placeholder="居住状态" width={108} options={options.residency_status ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="户属性" />
                <SelectField value={filters.household_type} onChange={(value) => setFilter("household_type", value)} placeholder="户属性" width={108} options={options.household_type ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="所属网格" />
                <SelectField value={filters.grid_name} onChange={(value) => setFilter("grid_name", value)} placeholder="所属网格" width={108} options={options.grid_name ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="状态" />
                <SelectField value={filters.status} onChange={(value) => setFilter("status", value)} placeholder="状态" width={92} options={options.status ?? []} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="家庭地址" />
                <TextField value={filters.address} onChange={(value) => setFilter("address", value)} placeholder="家庭地址" width={140} />
              </div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
              <div className="flex items-center gap-1.5">
                <FieldLabel text="出生年份" />
                <TextField value={filters.birth_year_start} onChange={(value) => setFilter("birth_year_start", value)} placeholder="年" width={72} />
                <span className="text-xs" style={{ color: "#909399" }}>-</span>
                <TextField value={filters.birth_year_end} onChange={(value) => setFilter("birth_year_end", value)} placeholder="年" width={72} />
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel text="年龄区间" />
                <TextField value={filters.age_min} onChange={(value) => setFilter("age_min", value)} placeholder="最小" width={64} />
                <span className="text-xs" style={{ color: "#909399" }}>-</span>
                <TextField value={filters.age_max} onChange={(value) => setFilter("age_max", value)} placeholder="最大" width={64} />
              </div>
              <div className="flex items-center gap-2">
                <ActionButton label="查询" bg="#1677ff" color="#fff" icon={<Search style={{ width: 12, height: 12 }} />} onClick={handleSearch} />
                <ActionButton label="重置" bg="#ffffff" color="#606266" border="1px solid #dcdfe6" icon={<RotateCcw style={{ width: 12, height: 12 }} />} onClick={handleReset} />
                <ActionButton label="导出" bg="#67c23a" color="#fff" icon={<Download style={{ width: 12, height: 12 }} />} onClick={handleExport} />
                <ActionButton label="导入" bg="#e6a23c" color="#fff" icon={<Upload style={{ width: 12, height: 12 }} />} onClick={() => setImportOpen(true)} />
                <ActionButton label="人口信息上报" bg="#d48806" color="#fff" icon={<Users style={{ width: 12, height: 12 }} />} />
                <button type="button" onClick={() => setFilterCollapsed(true)} className="text-xs" style={{ color: "#1677ff" }}>
                  收起
                </button>
              </div>
            </div>
          </div>
        )}

        {filterCollapsed && (
          <div className="flex items-center justify-end px-4 py-2" style={{ borderBottom: "1px solid #ebeef5" }}>
            <button type="button" onClick={() => setFilterCollapsed(false)} className="text-xs" style={{ color: "#1677ff" }}>
              展开筛选
            </button>
          </div>
        )}

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
                  <div className="flex items-center justify-between">
                    <span>{successMessage}</span>
                    {lastImportResult && lastImportResult.skipped_rows > 0 && lastBatchId && (
                      <button
                        type="button"
                        onClick={handleDownloadErrorReport}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs"
                        style={{ background: "#e6f7ff", color: "#1890ff" }}
                      >
                        <FileText style={{ width: 14, height: 14 }} />
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
              <span className="text-sm font-medium" style={{ color: "#303133" }}>
                居民查询
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex overflow-hidden rounded-sm" style={{ border: "1px solid #dcdfe6" }}>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("detail");
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="px-3 text-xs transition-colors"
                  style={{
                    height: 24,
                    background: activeView === "detail" ? "#409eff" : "#fff",
                    color: activeView === "detail" ? "#fff" : "#606266",
                  }}
                >
                  居民明细
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveView("household");
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="px-3 text-xs transition-colors"
                  style={{
                    height: 24,
                    borderLeft: "1px solid #dcdfe6",
                    background: activeView === "household" ? "#409eff" : "#fff",
                    color: activeView === "household" ? "#fff" : "#606266",
                  }}
                >
                  按户汇总
                </button>
              </div>
              {activeView === "detail" && (
                <>
                  <button
                    type="button"
                    onClick={handleToggleSelectionMode}
                    className="rounded-sm px-2 text-xs"
                    style={{
                      height: 24,
                      border: "1px solid #dcdfe6",
                      color: selectionMode ? "#1677ff" : "#606266",
                      background: selectionMode ? "#e6f4ff" : "#fff",
                    }}
                  >
                    {selectionMode ? "取消勾选" : "筛选删除"}
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkDeleteClick}
                    disabled={!selectionMode || selectedResidentCount === 0}
                    className="rounded-sm px-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    style={{ height: 24, border: "1px solid #ffccc7", color: "#cf1322", background: "#fff1f0" }}
                  >
                    一键删除{selectedResidentCount > 0 ? `(${selectedResidentCount})` : ""}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setColumnSettingOpen(true)}
                className="rounded-sm px-2 text-xs"
                style={{ height: 24, border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
              >
                列设置
              </button>
              <button type="button" className="rounded-sm px-2 text-xs" style={{ height: 24, border: "1px solid #dcdfe6", color: "#c0c4cc", background: "#f5f7fa" }}>
                {totalLabel}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid #ebeef5" }}>
            <table className="w-full text-xs" style={{ minWidth: activeView === "household" ? 1120 : Math.max(980, visibleDetailColumnDefinitions.length * 120 + (selectionMode ? 60 : 0)), borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#fafafa" }}>
                  {activeView === "detail" && selectionMode && (
                    <th className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                      <label className="inline-flex items-center gap-2">
                        <input type="checkbox" checked={allCurrentPageSelected} onChange={handleToggleSelectAllCurrentPage} />
                        <span>全选</span>
                      </label>
                    </th>
                  )}
                  {(activeView === "household" ? HOUSEHOLD_COLUMNS : visibleDetailColumnDefinitions.map((column) => column.label)).map((column) => (
                    <th key={column} className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={activeView === "household" ? HOUSEHOLD_COLUMNS.length : visibleDetailColumnDefinitions.length + (selectionMode ? 1 : 0)} className="px-3 py-10 text-center text-xs" style={{ color: "#909399" }}>
                      数据加载中...
                    </td>
                  </tr>
                ) : currentRows.length === 0 ? (
                  <tr>
                    <td colSpan={activeView === "household" ? HOUSEHOLD_COLUMNS.length : visibleDetailColumnDefinitions.length + (selectionMode ? 1 : 0)}>
                      <EmptyIllustration />
                    </td>
                  </tr>
                ) : activeView === "household" ? (
                  householdRows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                      <td className="px-3 py-2">{item.seq}</td>
                      <td className="px-3 py-2">{item.head_name}</td>
                      <td className="px-3 py-2">{item.head_gender}</td>
                      <td className="px-3 py-2">{item.village_group}</td>
                      <td className="px-3 py-2">{item.address}</td>
                      <td className="px-3 py-2">{item.head_identity_number}</td>
                      <td className="px-3 py-2">{item.member_count}</td>
                      <td className="px-3 py-2">{item.household_type}</td>
                      <td className="px-3 py-2">{item.grid_name}</td>
                    </tr>
                  ))
                ) : (
                  detailRows.map((item) => (
                    <tr key={item.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                      {selectionMode && (
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={selectedResidentIds.includes(item.id)}
                            onChange={() => handleToggleResidentSelection(item.id)}
                          />
                        </td>
                      )}
                      {visibleDetailColumnDefinitions.map((column) => {
                        if (column.key === "actions") {
                          return (
                            <td key={column.key} className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleViewDetail(item)}
                                  className="inline-flex items-center justify-center rounded px-2 py-1 text-xs text-white transition-opacity hover:opacity-80"
                                  style={{ backgroundColor: "#409eff" }}
                                >
                                  <Eye style={{ width: 14, height: 14, marginRight: 4 }} />
                                  查看
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteClick(item)}
                                  className="inline-flex items-center justify-center rounded px-2 py-1 text-xs text-white transition-opacity hover:opacity-80"
                                  style={{ backgroundColor: "#f56c6c" }}
                                >
                                  <Trash2 style={{ width: 14, height: 14, marginRight: 4 }} />
                                  删除
                                </button>
                              </div>
                            </td>
                          );
                        }

                        const valueMap: Record<Exclude<DetailColumnKey, "actions">, ReactNode> = {
                          seq: item.seq,
                          full_name: item.full_name,
                          gender: item.gender,
                          identity_number: item.identity_number,
                          birth_date: item.birth_date,
                          age: item.age ?? "",
                          ethnicity: item.ethnicity,
                          phone: item.phone,
                          head_name: item.head_name,
                          relation_to_head: item.relation_to_head,
                          village_group: item.village_group,
                          address: item.address,
                          household_type: item.household_type,
                          grid_name: item.grid_name,
                          political_status: item.political_status,
                          marital_status: item.marital_status,
                        };

                        return (
                          <td key={column.key} className="px-3 py-2">
                            {valueMap[column.key as Exclude<DetailColumnKey, "actions">]}
                          </td>
                        );
                      })}
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
            <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: Math.max(current.page - 1, 1) }))} className="flex items-center justify-center rounded-sm disabled:opacity-40" style={{ width: 26, height: 26, border: "1px solid #dcdfe6", background: "#fff" }}>
              <ChevronLeft style={{ width: 12, height: 12, color: "#909399" }} />
            </button>
            <button type="button" className="rounded-sm text-white" style={{ width: 26, height: 26, background: "#409eff" }}>
              {pagination.page}
            </button>
            <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.page + 1, current.total_pages || 1) }))} className="flex items-center justify-center rounded-sm disabled:opacity-40" style={{ width: 26, height: 26, border: "1px solid #dcdfe6", background: "#fff" }}>
              <ChevronRight style={{ width: 12, height: 12, color: "#909399" }} />
            </button>
            <span>前往</span>
            <input
              defaultValue={pagination.page}
              key={pagination.page}
              onBlur={(event) => {
                const next = Number(event.target.value);
                if (Number.isFinite(next) && next >= 1 && next <= Math.max(pagination.total_pages, 1)) {
                  setPagination((current) => ({ ...current, page: next }));
                }
              }}
              className="rounded-sm text-center focus:outline-none"
              style={{ width: 34, height: 26, border: "1px solid #dcdfe6", background: "#fff" }}
            />
            <span>页</span>
          </div>
        </div>
      </div>

      <button type="button" onClick={() => setColumnSettingOpen(true)} className="absolute right-[-10px] top-1/2 flex -translate-y-1/2 items-center justify-center rounded-l-sm text-white shadow-sm" style={{ width: 22, height: 34, background: "#409eff" }}>
        <Settings2 style={{ width: 12, height: 12 }} />
      </button>

      {columnSettingOpen && (
        <Modal title="列设置" onClose={() => setColumnSettingOpen(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "#606266" }}>
                勾选需要显示的列，设置会保存在当前浏览器中。
              </p>
              <button
                type="button"
                onClick={handleResetDetailColumns}
                className="rounded px-3 py-1.5 text-xs"
                style={{ background: "#fff", border: "1px solid #dcdfe6", color: "#606266" }}
              >
                恢复默认
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              {DETAIL_COLUMN_DEFINITIONS.map((column) => (
                <label
                  key={column.key}
                  className="flex items-center gap-2 rounded border px-3 py-2 text-sm"
                  style={{ borderColor: "#ebeef5", color: "#303133" }}
                >
                  <input
                    type="checkbox"
                    checked={visibleDetailColumns.includes(column.key)}
                    onChange={() => handleToggleDetailColumn(column.key)}
                  />
                  <span>{column.label}</span>
                </label>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setColumnSettingOpen(false)}
                className="rounded px-3 py-1.5 text-xs text-white"
                style={{ background: "#1677ff" }}
              >
                完成
              </button>
            </div>
          </div>
        </Modal>
      )}

      {importOpen && (
        <Modal
          title="居民 Excel 导入"
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
                仅支持 `.xlsx`、`.xls`，上传后可配置字段映射、预览数据，再正式导入数据库。
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
                      如果上传文件包含“户主身份证号码”，导入时会优先按该字段完成归户。
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
                          <td className="px-3 py-2" style={{ border: "1px solid #ebeef5" }}>
                            {field.label}
                          </td>
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

                {uploadData.sample_rows.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-medium" style={{ color: "#606266" }}>上传样例</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                        <thead>
                          <tr style={{ background: "#fafafa" }}>
                            {uploadData.headers.map((header) => (
                              <th key={header} className="px-3 py-2 text-left whitespace-nowrap" style={{ border: "1px solid #ebeef5" }}>
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {uploadData.sample_rows.map((row, index) => (
                            <tr key={index}>
                              {uploadData.headers.map((header) => (
                                <td key={header} className="px-3 py-2 whitespace-nowrap" style={{ border: "1px solid #ebeef5" }}>
                                  {row[header] ?? ""}
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
                  <table className="w-full text-xs" style={{ borderCollapse: "collapse", minWidth: 980 }}>
                    <thead>
                      <tr style={{ background: "#fafafa" }}>
                        {previewColumns.map((column) => (
                          <th key={column} className="px-3 py-2 text-left" style={{ border: "1px solid #ebeef5" }}>
                            {column === "row_number"
                              ? "Excel 行号"
                              : column === "full_name"
                                ? "居民姓名"
                                : column === "gender"
                                  ? "性别"
                                  : column === "identity_number"
                                    ? "身份证号码"
                                    : column === "head_name"
                                      ? "户主姓名"
                                      : column === "head_identity_number"
                                        ? "户主身份证号码"
                                        : column === "relation_to_head"
                                          ? "与户主关系"
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
                    <div className="text-xs font-medium mb-1" style={{ color: "#d46b08" }}>
                      发现 {previewData.errors.length} 条错误数据
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {previewData.errors.slice(0, 10).map((item, index) => (
                        <div key={index} className="text-xs" style={{ color: "#d46b08" }}>
                          第 {item.row_number} 行：{item.messages.join("；")}
                        </div>
                      ))}
                      {previewData.errors.length > 10 && (
                        <div className="text-xs" style={{ color: "#faad14" }}>
                          ...还有 {previewData.errors.length - 10} 条错误
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </Modal>
      )}

      {detailOpen && (
        <Modal title="居民详情" onClose={() => setDetailOpen(false)}>
          {detailLoading ? (
            <div className="py-10 text-center text-xs" style={{ color: "#909399" }}>
              加载中...
            </div>
          ) : detailData ? (
            <div className="space-y-6">
              {detailData.household && (
                <div>
                  <div className="mb-3 text-sm font-medium" style={{ color: "#303133" }}>
                    家庭信息
                  </div>
                  <div className="grid grid-cols-2 gap-3 rounded border p-3" style={{ borderColor: "#ebeef5" }}>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户编号：</span>
                      <span className="text-xs">{detailData.household.household_no}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户主姓名：</span>
                      <span className="text-xs">{detailData.household.head_name}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户主身份证号：</span>
                      <span className="text-xs">{detailData.household.head_identity_number}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户主性别：</span>
                      <span className="text-xs">{detailData.household.head_gender}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>村组：</span>
                      <span className="text-xs">{detailData.household.village_group}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>家庭地址：</span>
                      <span className="text-xs">{detailData.household.address}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户属性：</span>
                      <span className="text-xs">{detailData.household.household_type}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>户口类型：</span>
                      <span className="text-xs">{detailData.household.account_type}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>所属网格：</span>
                      <span className="text-xs">{detailData.household.grid_name}</span>
                    </div>
                    <div>
                      <span className="text-xs" style={{ color: "#909399" }}>住房类型：</span>
                      <span className="text-xs">{detailData.household.housing_type}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <div className="mb-3 text-sm font-medium" style={{ color: "#303133" }}>
                  居民信息
                </div>
                <div className="grid grid-cols-2 gap-3 rounded border p-3" style={{ borderColor: "#ebeef5" }}>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>姓名：</span>
                    <span className="text-xs">{detailData.resident.full_name}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>性别：</span>
                    <span className="text-xs">{detailData.resident.gender}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>身份证号：</span>
                    <span className="text-xs">{detailData.resident.identity_number}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>出生日期：</span>
                    <span className="text-xs">{detailData.resident.birth_date}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>年龄：</span>
                    <span className="text-xs">{detailData.resident.age ?? ""}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>民族：</span>
                    <span className="text-xs">{detailData.resident.ethnicity}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>联系电话：</span>
                    <span className="text-xs">{detailData.resident.phone}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>与户主关系：</span>
                    <span className="text-xs">{detailData.resident.relation_to_head}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>政治面貌：</span>
                    <span className="text-xs">{detailData.resident.political_status}</span>
                  </div>
                  <div>
                    <span className="text-xs" style={{ color: "#909399" }}>婚姻状况：</span>
                    <span className="text-xs">{detailData.resident.marital_status}</span>
                  </div>
                </div>
              </div>

              {detailData.household_members.length > 0 && (
                <div>
                  <div className="mb-3 text-sm font-medium" style={{ color: "#303133" }}>
                    家庭成员列表
                  </div>
                  <div className="overflow-x-auto rounded border" style={{ borderColor: "#ebeef5" }}>
                    <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ background: "#fafafa" }}>
                          <th className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                            姓名
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                            性别
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                            身份证号
                          </th>
                          <th className="whitespace-nowrap px-3 py-2 text-left" style={{ borderBottom: "1px solid #ebeef5", color: "#606266", fontWeight: 500 }}>
                            与户主关系
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailData.household_members.map((member) => (
                          <tr key={member.id} style={{ borderBottom: "1px solid #f5f7fa" }}>
                            <td className="px-3 py-2">{member.full_name}</td>
                            <td className="px-3 py-2">{member.gender}</td>
                            <td className="px-3 py-2">{member.identity_number}</td>
                            <td className="px-3 py-2">{member.relation_to_head}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </Modal>
      )}

      {deleteConfirmOpen && (
        <Modal
          title={deleteMode === "bulk" ? "确认批量删除" : "确认删除"}
          onClose={() => {
            setDeleteConfirmOpen(false);
            setResidentToDelete(null);
          }}
        >
          <div className="py-4">
            <p className="text-sm" style={{ color: "#606266" }}>
              {deleteMode === "bulk" ? (
                <>
                  确定要删除已勾选的
                  <span className="font-medium" style={{ color: "#f56c6c" }}>
                    {selectedResidentCount}
                  </span>
                  条居民记录吗？
                </>
              ) : (
                <>
                  确定要删除居民
                  <span className="font-medium" style={{ color: "#f56c6c" }}>
                    {residentToDelete?.full_name}
                  </span>
                  吗？
                </>
              )}
            </p>
            <div className="mt-3 rounded px-3 py-2 text-xs" style={{ background: "#fff7e6", color: "#d46b08", border: "1px solid #ffd591" }}>
              删除后将同步移除关联居民记录；如该居民是户主，还可能触发家庭户主重算。此操作不可恢复，请再次确认。
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setResidentToDelete(null);
                }}
                className="rounded px-3 py-1.5 text-xs"
                style={{ background: "#fff", border: "1px solid #dcdfe6", color: "#606266" }}
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="rounded px-3 py-1.5 text-xs text-white disabled:opacity-50"
                style={{ background: "#f56c6c" }}
              >
                {deleteLoading ? "删除中..." : "确认删除"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
