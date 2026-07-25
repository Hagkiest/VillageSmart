import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { ChevronDown, ChevronLeft, ChevronRight, Download, RotateCcw, Search, X } from "lucide-react";
import { buildQuery, fetchJson, postJson, putJson } from "../lib/api";

type PartyFeeRow = {
  id: number;
  seq: number;
  party_member_id: number;
  full_name: string;
  identity_number: string;
  party_branch: string;
  member_type: string;
  fee_year: number;
  fee_month: number;
  amount_due: string;
  amount_paid: string;
  payment_status: string;
  payment_date: string;
  notes: string;
};

type Pagination = {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
};

type Stats = {
  total_due: string;
  total_paid: string;
  paid_count: number;
  pending_count: number;
};

type EditState = {
  id: number;
  full_name: string;
  amount_due: string;
  amount_paid: string;
  payment_status: string;
  payment_date: string;
  notes: string;
};

const YEAR_OPTIONS = [String(new Date().getFullYear() - 1), String(new Date().getFullYear()), String(new Date().getFullYear() + 1)];
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index + 1));
const PAYMENT_STATUS_OPTIONS = ["全部", "待缴纳", "已缴纳"];

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
      <div className="w-full max-w-2xl rounded bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-base font-medium" style={{ color: "#303133" }}>
            {title}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-slate-100">
            <X style={{ width: 16, height: 16, color: "#909399" }} />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export function PartyFeeRecords() {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartyFeeRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, page_size: 10, total: 0, total_pages: 0 });
  const [stats, setStats] = useState<Stats>({ total_due: "0.00", total_paid: "0.00", paid_count: 0, pending_count: 0 });
  const [filters, setFilters] = useState({
    fee_year: String(new Date().getFullYear()),
    fee_month: String(new Date().getMonth() + 1),
    party_branch: "",
    full_name: "",
    payment_status: "全部",
  });
  const [submittedFilters, setSubmittedFilters] = useState({
    fee_year: String(new Date().getFullYear()),
    fee_month: String(new Date().getMonth() + 1),
    party_branch: "",
    full_name: "",
    payment_status: "全部",
  });
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [editState, setEditState] = useState<EditState | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<{ items: PartyFeeRow[]; pagination: Pagination; stats: Stats }>("/api/party-fees/", {
      params: {
        ...submittedFilters,
        page: pagination.page,
        page_size: pagination.page_size,
      },
    })
      .then((payload) => {
        setItems(payload.items || []);
        setPagination(payload.pagination);
        setStats(payload.stats || { total_due: "0.00", total_paid: "0.00", paid_count: 0, pending_count: 0 });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [pagination.page, pagination.page_size, submittedFilters]);

  const handleSearch = () => {
    setPagination((current) => ({ ...current, page: 1 }));
    setSubmittedFilters({ ...filters });
  };

  const handleReset = () => {
    const reset = {
      fee_year: String(new Date().getFullYear()),
      fee_month: String(new Date().getMonth() + 1),
      party_branch: "",
      full_name: "",
      payment_status: "全部",
    };
    setFilters(reset);
    setSubmittedFilters(reset);
    setPagination((current) => ({ ...current, page: 1 }));
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setErrorMessage("");
    try {
      const payload = await postJson<{ message: string }>("/api/party-fees/generate/", {
        fee_year: filters.fee_year,
        fee_month: filters.fee_month,
        party_branch: filters.party_branch,
        full_name: filters.full_name,
      });
      setSuccessMessage(payload.message);
      setPagination((current) => ({ ...current, page: 1 }));
      setSubmittedFilters({ ...filters });
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (id: number) => {
    try {
      await postJson(`/api/party-fees/${id}/mark-paid/`, {});
      setSuccessMessage("已标记为已缴纳。");
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleSaveEdit = async () => {
    if (!editState) {
      return;
    }
    setSavingEdit(true);
    setErrorMessage("");
    try {
      await putJson(`/api/party-fees/${editState.id}/`, {
        amount_due: editState.amount_due,
        amount_paid: editState.amount_paid,
        payment_status: editState.payment_status,
        payment_date: editState.payment_date,
        notes: editState.notes,
      });
      setSuccessMessage("党费记录已更新。");
      setEditState(null);
      setSubmittedFilters((current) => ({ ...current }));
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleExport = () => {
    window.open(`/api/party-fees/export/${buildQuery(submittedFilters)}`, "_blank");
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
            <span className="text-sm" style={{ color: "#606266" }}>年度</span>
            <div className="relative" style={{ width: 110 }}>
              <select value={filters.fee_year} onChange={(event) => setFilters((current) => ({ ...current, fee_year: event.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                {YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm" style={{ color: "#606266" }}>月份</span>
            <div className="relative" style={{ width: 100 }}>
              <select value={filters.fee_month} onChange={(event) => setFilters((current) => ({ ...current, fee_month: event.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                {MONTH_OPTIONS.map((month) => (
                  <option key={month} value={month}>
                    {month}月
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ width: 12, height: 12, color: "#c0c4cc" }} />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm" style={{ color: "#606266" }}>党支部</span>
            <input value={filters.party_branch} onChange={(event) => setFilters((current) => ({ ...current, party_branch: event.target.value }))} placeholder="所在党支部" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ width: 160, border: "1px solid #dcdfe6" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm" style={{ color: "#606266" }}>姓名</span>
            <input value={filters.full_name} onChange={(event) => setFilters((current) => ({ ...current, full_name: event.target.value }))} placeholder="党员姓名" className="rounded px-2.5 py-1.5 text-sm focus:outline-none" style={{ width: 130, border: "1px solid #dcdfe6" }} />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm" style={{ color: "#606266" }}>状态</span>
            <div className="relative" style={{ width: 110 }}>
              <select value={filters.payment_status} onChange={(event) => setFilters((current) => ({ ...current, payment_status: event.target.value }))} className="w-full appearance-none rounded px-2.5 py-1.5 pr-6 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6", background: "#fff" }}>
                {PAYMENT_STATUS_OPTIONS.map((option) => (
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
          <button type="button" onClick={() => void handleGenerate()} disabled={generating} className="rounded px-3 py-1.5 text-sm text-white disabled:opacity-60" style={{ background: "#52c41a" }}>
            {generating ? "生成中..." : "生成党费"}
          </button>
          <button type="button" onClick={handleExport} className="inline-flex items-center gap-1 rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            <Download style={{ width: 13, height: 13 }} />
            导出
          </button>
          <button type="button" onClick={() => navigate("/party-members")} className="rounded px-3 py-1.5 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
            返回党员管理
          </button>
        </div>

        <div className="flex items-center gap-10 px-5 py-3" style={{ borderBottom: "1px solid #f0f0f0" }}>
          {[
            { label: "应缴总额", value: stats.total_due, color: "#303133" },
            { label: "实缴总额", value: stats.total_paid, color: "#1677ff" },
            { label: "已缴人数", value: stats.paid_count, color: "#52c41a" },
            { label: "待缴人数", value: stats.pending_count, color: "#fa8c16" },
          ].map((item) => (
            <div key={item.label}>
              <div className="text-xs" style={{ color: "#909399" }}>{item.label}</div>
              <div className="mt-1 text-lg font-semibold" style={{ color: item.color }}>{item.value}</div>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto px-5 pt-3 pb-3">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", minWidth: 1200, border: "1px solid #e4e7ed" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["序号", "姓名", "身份证号", "所在党支部", "人员类别", "年度", "月份", "应缴金额", "实缴金额", "缴纳状态", "缴纳日期", "备注", "操作"].map((column) => (
                  <th key={column} className="px-3 py-2.5 text-left whitespace-nowrap" style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500 }}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && items.length ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-3 py-2.5">{item.seq}</td>
                    <td className="px-3 py-2.5">{item.full_name}</td>
                    <td className="px-3 py-2.5">{item.identity_number}</td>
                    <td className="px-3 py-2.5">{item.party_branch || "-"}</td>
                    <td className="px-3 py-2.5">{item.member_type}</td>
                    <td className="px-3 py-2.5">{item.fee_year}</td>
                    <td className="px-3 py-2.5">{item.fee_month}</td>
                    <td className="px-3 py-2.5">{item.amount_due}</td>
                    <td className="px-3 py-2.5">{item.amount_paid}</td>
                    <td className="px-3 py-2.5">
                      <span className="rounded px-2 py-0.5 text-xs" style={{ background: item.payment_status === "已缴纳" ? "#f6ffed" : "#fff7e6", color: item.payment_status === "已缴纳" ? "#52c41a" : "#fa8c16", border: item.payment_status === "已缴纳" ? "1px solid #b7eb8f" : "1px solid #ffd591" }}>
                        {item.payment_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">{item.payment_date || "-"}</td>
                    <td className="px-3 py-2.5">{item.notes || "-"}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setEditState({
                              id: item.id,
                              full_name: item.full_name,
                              amount_due: item.amount_due,
                              amount_paid: item.amount_paid,
                              payment_status: item.payment_status,
                              payment_date: item.payment_date,
                              notes: item.notes,
                            })
                          }
                          className="text-sm"
                          style={{ color: "#1677ff" }}
                        >
                          编辑党费
                        </button>
                        {item.payment_status !== "已缴纳" && (
                          <button type="button" onClick={() => void handleMarkPaid(item.id)} className="text-sm" style={{ color: "#52c41a" }}>
                            已缴纳
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={13} className="px-3 py-12 text-center" style={{ color: "#909399" }}>
                    {loading ? "加载中..." : "暂无党费数据，请先点击生成党费"}
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

      {editState && (
        <Modal title={`编辑党费 - ${editState.full_name}`} onClose={() => setEditState(null)}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm" style={{ color: "#606266" }}>应缴金额</label>
              <input value={editState.amount_due} onChange={(event) => setEditState((current) => (current ? { ...current, amount_due: event.target.value } : current))} type="number" className="w-full rounded px-3 py-2 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6" }} />
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: "#606266" }}>实缴金额</label>
              <input value={editState.amount_paid} onChange={(event) => setEditState((current) => (current ? { ...current, amount_paid: event.target.value } : current))} type="number" className="w-full rounded px-3 py-2 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6" }} />
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: "#606266" }}>缴纳状态</label>
              <select value={editState.payment_status} onChange={(event) => setEditState((current) => (current ? { ...current, payment_status: event.target.value } : current))} className="w-full rounded px-3 py-2 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6" }}>
                {PAYMENT_STATUS_OPTIONS.filter((item) => item !== "全部").map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm" style={{ color: "#606266" }}>缴纳日期</label>
              <input value={editState.payment_date} onChange={(event) => setEditState((current) => (current ? { ...current, payment_date: event.target.value } : current))} type="date" className="w-full rounded px-3 py-2 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6" }} />
            </div>
          </div>
          <div className="mt-4">
            <label className="mb-1 block text-sm" style={{ color: "#606266" }}>备注</label>
            <textarea value={editState.notes} onChange={(event) => setEditState((current) => (current ? { ...current, notes: event.target.value } : current))} rows={4} className="w-full rounded px-3 py-2 text-sm focus:outline-none" style={{ border: "1px solid #dcdfe6" }} />
          </div>
          <div className="mt-4 flex items-center gap-3">
            <button type="button" onClick={() => void handleSaveEdit()} disabled={savingEdit} className="rounded px-4 py-2 text-sm text-white disabled:opacity-60" style={{ background: "#1677ff" }}>
              {savingEdit ? "保存中..." : "保存"}
            </button>
            <button type="button" onClick={() => setEditState(null)} className="rounded px-4 py-2 text-sm" style={{ border: "1px solid #dcdfe6", background: "#fff", color: "#606266" }}>
              取消
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
