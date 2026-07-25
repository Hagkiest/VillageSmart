import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Download, Plus, RotateCcw, Search } from "lucide-react";
import { buildQuery, deleteJson, fetchJson, postJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type PartyMemberRow = {
  id: number;
  seq: number;
  full_name: string;
  identity_number: string;
  gender: string;
  birth_date: string;
  age: number | null;
  party_age: number | null;
  ethnicity: string;
  education_level: string;
  join_party_date: string;
  becoming_full_member_date: string;
  member_type: string;
  phone: string;
  party_branch: string;
  address: string;
  fee_status_label: string;
  status: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

const MEMBER_TYPES = ["中共党员", "预备党员", "入党积极分子"];
const STATUS_OPTIONS = ["全部", "正常", "已转出", "停止党籍"];

export function PartyMembers() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartyMemberRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [filters, setFilters] = useState({
    full_name: "",
    identity_number: "",
    member_type: "",
    party_branch: "",
    status: "全部",
  });
  const [submittedFilters, setSubmittedFilters] = useState({
    full_name: "",
    identity_number: "",
    member_type: "",
    party_branch: "",
    status: "全部",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: PartyMemberRow[]; pagination: Pagination }>("/api/party-members/", {
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
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const reset = { full_name: "", identity_number: "", member_type: "", party_branch: "", status: "全部" };
    setFilters(reset);
    setSubmittedFilters(reset);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleDelete = async (id: number) => {
    if (!await dialog.confirm("确定要删除这条党员档案吗？")) {
      return;
    }
    try {
      const payload = await deleteJson<{ message: string }>(`/api/party-members/${id}/`);
      setSuccessMessage(payload.message);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedIds.length) {
      return;
    }
    if (!await dialog.confirm(`确定要删除选中的 ${selectedIds.length} 条党员档案吗？`)) {
      return;
    }
    try {
      const payload = await postJson<{ message: string }>("/api/party-members/bulk-delete/", { ids: selectedIds });
      setSuccessMessage(payload.message);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleExport = () => {
    window.open(`/api/party-members/export/${buildQuery(submittedFilters)}`, "_blank");
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === items.length) {
      setSelectedIds([]);
      return;
    }
    setSelectedIds(items.map((item) => item.id));
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
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
        <div className="flex items-center gap-2 flex-wrap px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>姓名</span>
            <input value={filters.full_name} onChange={(event) => setFilters((current) => ({ ...current, full_name: event.target.value }))} placeholder="姓名" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ width: 120, border: "1px solid #dcdfe6" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>身份证号</span>
            <input value={filters.identity_number} onChange={(event) => setFilters((current) => ({ ...current, identity_number: event.target.value }))} placeholder="身份证号" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ width: 160, border: "1px solid #dcdfe6" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>人员类别</span>
            <div className="relative" style={{ width: 140 }}>
              <select value={filters.member_type} onChange={(event) => setFilters((current) => ({ ...current, member_type: event.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                <option value="">全部</option>
                {MEMBER_TYPES.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>所在党支部</span>
            <input value={filters.party_branch} onChange={(event) => setFilters((current) => ({ ...current, party_branch: event.target.value }))} placeholder="党支部" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ width: 140, border: "1px solid #dcdfe6" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm whitespace-nowrap" style={{ color: "#606266" }}>状态</span>
            <div className="relative" style={{ width: 110 }}>
              <select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
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
          <button type="button" onClick={() => navigate("/party-members/fees")} className="rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            党费缴纳
          </button>
          <button type="button" onClick={() => navigate("/party-members/new")} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm text-white" style={{ background: "#52c41a" }}>
            <Plus style={{ width: 13, height: 13 }} />
            新增党员
          </button>
          <button type="button" onClick={handleBulkDelete} disabled={!selectedIds.length} className="rounded px-3 py-1.5 text-sm text-white disabled:opacity-50" style={{ background: "#ff4d4f" }}>
            批量删除
          </button>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            <Download style={{ width: 13, height: 13 }} />
            导出
          </button>
        </div>

        <div className="flex items-start justify-between px-5 pt-4 pb-3">
          <div className="flex-1 min-w-0 mr-6">
            <div className="flex items-center gap-2 mb-1.5">
              <div style={{ width: 3, height: 14, borderRadius: 2, background: "#1677ff" }} />
              <span className="text-sm font-medium" style={{ color: "#303133" }}>党员名册</span>
            </div>
            <p className="text-xs leading-relaxed" style={{ color: "#909399" }}>
              新增党员后会直接进入详情编辑页，可继续维护流转记录、任职记录和党费缴纳情况。家庭成员维护已取消。
            </p>
          </div>
          <span className="text-sm whitespace-nowrap" style={{ color: "#909399" }}>共{pagination.total}人</span>
        </div>

        <div className="overflow-x-auto px-5 pb-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 1700, border: "1px solid #e4e7ed" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["", "序号", "姓名", "身份证号", "性别", "出生日期", "年龄", "党龄", "民族", "学历", "入党日期", "转正日期", "人员类别", "手机号码", "所在党支部", "现居住址", "党费查缴", "状态", "操作"].map((column) => (
                  <th key={column} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}>
                    {column === "" ? (
                      <input type="checkbox" checked={items.length > 0 && selectedIds.length === items.length} onChange={toggleSelectAll} />
                    ) : (
                      column
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5"><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleSelectOne(item.id)} /></td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.seq}</td>
                    <td className="px-3 py-2.5" style={{ color: "#303133" }}>{item.full_name}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.identity_number}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.gender}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.birth_date || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.age ?? "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.party_age ?? "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.ethnicity || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.education_level || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.join_party_date || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.becoming_full_member_date || "-"}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded px-2 py-0.5 text-xs" style={{ background: "#f0f5ff", color: "#2f54eb", border: "1px solid #adc6ff" }}>
                        {item.member_type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.phone || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266" }}>{item.party_branch || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266", maxWidth: 220 }}>{item.address || "-"}</td>
                    <td className="px-3 py-2.5" style={{ color: "#1677ff" }}>{item.fee_status_label}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded px-2 py-0.5 text-xs" style={{ background: item.status === "正常" ? "#f6ffed" : "#fff7e6", color: item.status === "正常" ? "#52c41a" : "#fa8c16", border: item.status === "正常" ? "1px solid #b7eb8f" : "1px solid #ffd591" }}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => navigate(`/party-members/${item.id}/detail`)} className="text-sm" style={{ color: "#1677ff" }}>详情</button>
                        <button type="button" onClick={() => navigate(`/party-members/${item.id}/edit`)} className="text-sm" style={{ color: "#1677ff" }}>编辑</button>
                        <button type="button" onClick={() => void handleDelete(item.id)} className="text-sm" style={{ color: "#ff4d4f" }}>删除</button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={19} className="py-14 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    {loading ? "加载中..." : "暂无党员数据"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-4 text-sm" style={{ color: "#606266" }}>
          <span>共{pagination.total}条</span>
          <div className="relative">
            <select value={`${pagination.page_size}`} onChange={(event) => setPagination((current) => ({ ...current, page: 1, page_size: Number(event.target.value) }))} className="appearance-none rounded px-2 py-1 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
              {[10, 20, 50].map((size) => (
                <option key={size} value={size}>
                  {size}条/页
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 11, height: 11, color: "#c0c4cc" }} />
          </div>
          <button type="button" disabled={pagination.page <= 1} onClick={() => setPagination((current) => ({ ...current, page: current.page - 1 }))} className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronLeft style={{ width: 13, height: 13 }} />
          </button>
          <button type="button" className="flex h-7 w-7 items-center justify-center rounded text-sm text-white" style={{ background: "#1677ff" }}>
            {pagination.page}
          </button>
          <button type="button" disabled={pagination.page >= pagination.total_pages} onClick={() => setPagination((current) => ({ ...current, page: current.page + 1 }))} className="flex h-7 w-7 items-center justify-center rounded disabled:opacity-40" style={{ border: "1px solid #dcdfe6" }}>
            <ChevronRight style={{ width: 13, height: 13 }} />
          </button>
        </div>
      </div>
    </div>
  );
}
