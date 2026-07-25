import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { buildQuery, deleteJson, fetchJson, postJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type OrgRow = {
  id: number;
  seq: number;
  org_type: string;
  source: string;
  full_name: string;
  ethnicity: string;
  gender: string;
  identity_number: string;
  birth_date: string;
  age: number | null;
  address: string;
  phone: string;
  position: string;
  political_status: string;
  term_number: string;
  term_start: string;
  term_end: string;
  status: string;
  notes: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const ORG_TYPES = [
  "党(总)支部委员会",
  "村居民委员会",
  "村务监督委员会",
  "青年团妇组织",
  "集体经济组织理事会",
  "集体经济组织监事会",
  "村民小组长",
  "村民代表",
];

const TABLE_COLS = [
  "序号",
  "来源",
  "姓名",
  "民族",
  "性别",
  "身份证码号",
  "出生日期",
  "家庭住址",
  "联系电话",
  "职务",
  "政治面貌",
  "届数",
  "任期开始",
  "任期结束",
  "状态",
  "备注",
  "操作",
];

export function OrgStructure() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialOrgIndex = ORG_TYPES.indexOf(searchParams.get("org_type") || "");
  const [activeOrg, setActiveOrg] = useState(initialOrgIndex >= 0 ? initialOrgIndex : 0);
  const [viewMode, setViewMode] = useState<"current" | "past">(searchParams.get("status") === "历届" ? "past" : "current");
  const [filters, setFilters] = useState({ term_number: "", keyword: "" });
  const [submittedFilters, setSubmittedFilters] = useState({ term_number: "", keyword: "" });
  const [items, setItems] = useState<OrgRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const currentOrgType = ORG_TYPES[activeOrg];
  const currentStatus = viewMode === "current" ? "现任" : "历届";
  const listContextQuery = `?org_type=${encodeURIComponent(currentOrgType)}&status=${encodeURIComponent(currentStatus)}`;

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: OrgRow[]; pagination: Pagination }>("/api/org-structure/", {
      params: {
        org_type: currentOrgType,
        status: currentStatus,
        term_number: submittedFilters.term_number,
        keyword: submittedFilters.keyword,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setSelectedIds([]);
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [currentOrgType, currentStatus, pagination.page, pagination.page_size, submittedFilters]);

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const next = { term_number: "", keyword: "" };
    setFilters(next);
    setSubmittedFilters(next);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleDelete = async (id: number) => {
    if (!await dialog.confirm("确定要删除这条组织架构成员记录吗？")) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/org-structure/${id}/`);
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
    if (!await dialog.confirm(`确定要删除选中的 ${selectedIds.length} 条记录吗？`)) {
      return;
    }
    try {
      const payload = await postJson<{ message: string }>("/api/org-structure/bulk-delete/", { ids: selectedIds });
      setSuccessMessage(payload.message);
      setSelectedIds([]);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleExport = () => {
    const query = buildQuery({
      org_type: currentOrgType,
      status: currentStatus,
      term_number: submittedFilters.term_number,
      keyword: submittedFilters.keyword,
    });
    window.open(`/api/org-structure/export/${query}`, "_blank");
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

      <div className="bg-white rounded border" style={{ borderColor: "#e4e7ed" }}>
        <div className="flex overflow-x-auto flex-shrink-0" style={{ borderBottom: "1px solid #e4e7ed" }}>
          {ORG_TYPES.map((org, i) => (
            <button
              key={org}
              type="button"
              onClick={() => {
                setActiveOrg(i);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="px-4 py-3 text-sm whitespace-nowrap flex-shrink-0 transition-colors"
              style={{
                color: activeOrg === i ? "#1677ff" : "#606266",
                borderBottom: activeOrg === i ? "2px solid #1677ff" : "2px solid transparent",
                marginBottom: -1,
                background: "transparent",
              }}
            >
              {org}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 px-4 py-3 flex-wrap">
          <input
            value={filters.term_number}
            onChange={(event) => setFilters((current) => ({ ...current, term_number: event.target.value }))}
            placeholder="输入届数，如第十二届"
            className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
            style={{ border: "1px solid #dcdfe6", width: 160, background: "#fff", color: "#303133" }}
          />

          <div className="flex rounded overflow-hidden" style={{ border: "1px solid #dcdfe6" }}>
            <button
              type="button"
              onClick={() => {
                setViewMode("current");
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="px-4 py-1.5 text-sm transition-colors"
              style={{
                background: viewMode === "current" ? "#1677ff" : "#fff",
                color: viewMode === "current" ? "#fff" : "#606266",
              }}
            >
              现任
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode("past");
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              className="px-4 py-1.5 text-sm transition-colors"
              style={{
                borderLeft: "1px solid #dcdfe6",
                background: viewMode === "past" ? "#1677ff" : "#fff",
                color: viewMode === "past" ? "#fff" : "#606266",
              }}
            >
              历届
            </button>
          </div>

          <input
            value={filters.keyword}
            onChange={(event) => setFilters((current) => ({ ...current, keyword: event.target.value }))}
            placeholder="搜索姓名或职务"
            className="rounded text-sm px-2.5 py-1.5 focus:outline-none"
            style={{ border: "1px solid #dcdfe6", width: 160, background: "#fff", color: "#303133" }}
          />

          <button
            type="button"
            onClick={handleSearch}
            className="rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85"
            style={{ border: "1px solid #1677ff", color: "#1677ff", background: "#fff" }}
          >
            查询
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="rounded text-sm px-3 py-1.5 transition-opacity hover:opacity-85"
            style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
          >
            重置
          </button>

          <button
            type="button"
            onClick={() => navigate(`/org-structure/new${listContextQuery}`)}
            className="rounded text-sm px-3 py-1.5 text-white transition-opacity hover:opacity-85 whitespace-nowrap"
            style={{ background: "#1677ff" }}
          >
            新增成员
          </button>

          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleBulkDelete}
              className="rounded text-sm px-3 py-1.5 text-white transition-opacity hover:opacity-85 whitespace-nowrap"
              style={{ background: "#f56c6c" }}
            >
              批量删除 ({selectedIds.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleExport}
            className="rounded text-sm px-3 py-1.5 text-white transition-opacity hover:opacity-85"
            style={{ background: "#52c41a" }}
          >
            导出
          </button>
        </div>

        <div className="overflow-x-auto px-4 pb-4">
          <table
            className="w-full text-sm"
            style={{ borderCollapse: "collapse", minWidth: 1680, border: "1px solid #e4e7ed", borderRadius: 4 }}
          >
            <thead>
              <tr style={{ background: "#fafafa" }}>
                <th className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(event) => setSelectedIds(event.target.checked ? items.map((item) => item.id) : [])}
                  />
                </th>
                {TABLE_COLS.map((col) => (
                  <th
                    key={col}
                    className="px-3 py-2.5 text-left whitespace-nowrap"
                    style={{
                      borderBottom: "1px solid #e4e7ed",
                      color: "#606266",
                      fontWeight: 500,
                      fontSize: 13,
                    }}
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={TABLE_COLS.length + 1} className="py-16 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    数据加载中...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={TABLE_COLS.length + 1} className="py-16 text-center" style={{ color: "#909399", fontSize: 13 }}>
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
                        onChange={(event) =>
                          setSelectedIds((current) =>
                            event.target.checked ? [...current, item.id] : current.filter((value) => value !== item.id)
                          )
                        }
                      />
                    </td>
                    <td className="px-3 py-2">{item.seq}</td>
                    <td className="px-3 py-2">{item.source || "-"}</td>
                    <td className="px-3 py-2">{item.full_name}</td>
                    <td className="px-3 py-2">{item.ethnicity || "-"}</td>
                    <td className="px-3 py-2">{item.gender || "-"}</td>
                    <td className="px-3 py-2">{item.identity_number}</td>
                    <td className="px-3 py-2">{item.birth_date || "-"}</td>
                    <td className="px-3 py-2">{item.address || "-"}</td>
                    <td className="px-3 py-2">{item.phone || "-"}</td>
                    <td className="px-3 py-2">{item.position || "-"}</td>
                    <td className="px-3 py-2">{item.political_status || "-"}</td>
                    <td className="px-3 py-2">{item.term_number || "-"}</td>
                    <td className="px-3 py-2">{item.term_start || "-"}</td>
                    <td className="px-3 py-2">{item.term_end || "-"}</td>
                    <td className="px-3 py-2">{item.status || "-"}</td>
                    <td className="px-3 py-2">{item.notes || "-"}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={() => navigate(`/org-structure/${item.id}/detail${listContextQuery}`)} className="text-blue-500 hover:text-blue-600">
                          详情
                        </button>
                        <button type="button" onClick={() => navigate(`/org-structure/${item.id}/edit${listContextQuery}`)} className="text-blue-500 hover:text-blue-600">
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

        <div className="flex items-center justify-end gap-2 px-4 pb-4 text-sm" style={{ color: "#606266" }}>
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
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
            style={{ border: "1px solid #dcdfe6" }}
          >
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button type="button" className="w-7 h-7 rounded text-sm text-white flex items-center justify-center" style={{ background: "#1677ff" }}>
            {pagination.page}
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.total_pages}
            onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))}
            className="w-7 h-7 rounded flex items-center justify-center hover:bg-gray-50 disabled:opacity-40"
            style={{ border: "1px solid #dcdfe6" }}
          >
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
