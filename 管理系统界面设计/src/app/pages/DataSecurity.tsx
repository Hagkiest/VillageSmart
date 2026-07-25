import { ChangeEvent, useEffect, useState } from "react";
import { Copy, Download, HardDriveDownload, RefreshCw, ShieldAlert, ShieldCheck, Trash2, Upload } from "lucide-react";
import { deleteJson, fetchJson, postJson, uploadForm } from "../lib/api";
import { dialog } from "../lib/dialog";

type BackupItem = {
  id: number;
  file_name: string;
  relative_path: string;
  file_path: string;
  file_size_display: string;
  record_count: number;
  created_by: string;
  status: string;
  error_message: string;
  created_at: string;
  file_exists: boolean;
};

type BackupPayload = {
  backup_dir: string;
  items: BackupItem[];
  summary: {
    total: number;
    success_count: number;
    failed_count: number;
  };
};

type CreateBackupPayload = {
  item: BackupItem;
};

type RestorePayload = {
  message: string;
  source_file_name: string;
  restored_records: number;
  safety_backup_file_name: string;
  safety_backup_path: string;
};

export function DataSecurity() {
  const [backupDir, setBackupDir] = useState("");
  const [items, setItems] = useState<BackupItem[]>([]);
  const [summary, setSummary] = useState({ total: 0, success_count: 0, failed_count: 0 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [importing, setImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [reloadSeed, setReloadSeed] = useState(0);
  const [clearing, setClearing] = useState(false);

  useEffect(() => {
    setLoading(true);
    setErrorMessage("");
    fetchJson<BackupPayload>("/api/data-security/backups/")
      .then((payload) => {
        setBackupDir(payload.backup_dir || "");
        setItems(payload.items || []);
        setSummary(payload.summary || { total: 0, success_count: 0, failed_count: 0 });
      })
      .catch((error) => setErrorMessage((error as Error).message))
      .finally(() => setLoading(false));
  }, [reloadSeed]);

  const reload = () => setReloadSeed((current) => current + 1);

  const handleCreateBackup = async () => {
    try {
      setCreating(true);
      setErrorMessage("");
      const payload = await postJson<CreateBackupPayload>("/api/data-security/backups/create/", {});
      setSuccessMessage(`备份创建成功：${payload.item.file_name}`);
      reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (item: BackupItem) => {
    const ok = await dialog.confirm(`确定删除备份文件 ${item.file_name} 吗？`);
    if (!ok) {
      return;
    }
    try {
      setErrorMessage("");
      const payload = await deleteJson<{ message: string }>(`/api/data-security/backups/${item.id}/`);
      setSuccessMessage(payload.message);
      reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const buildRestoreSuccessMessage = (payload: RestorePayload) => {
    const backupHint = payload.safety_backup_file_name
      ? `恢复前已自动生成安全备份：${payload.safety_backup_file_name}`
      : "";
    return [payload.message, `导入来源：${payload.source_file_name}`, `恢复记录数：${payload.restored_records}`, backupHint]
      .filter(Boolean)
      .join("；");
  };

  const handleRestore = async (item: BackupItem) => {
    const confirmed = await dialog.confirm(
      `恢复备份会覆盖当前数据库中的全部数据，确定从 ${item.file_name} 执行恢复吗？`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setRestoringId(item.id);
      setErrorMessage("");
      const payload = await postJson<RestorePayload>(`/api/data-security/backups/${item.id}/restore/`, {});
      setSuccessMessage(buildRestoreSuccessMessage(payload));
      reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setRestoringId(null);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleUploadRestore = async () => {
    if (!selectedFile) {
      setErrorMessage("请先选择要导入的数据库备份文件。");
      return;
    }

    const confirmed = await dialog.confirm(
      `上传恢复会覆盖当前数据库中的全部数据，确定导入文件 ${selectedFile.name} 并执行恢复吗？`,
    );
    if (!confirmed) {
      return;
    }

    try {
      setImporting(true);
      setErrorMessage("");
      const formData = new FormData();
      formData.append("file", selectedFile);
      const payload = await uploadForm<RestorePayload>("/api/data-security/backups/restore/upload/", formData);
      setSuccessMessage(buildRestoreSuccessMessage(payload));
      setSelectedFile(null);
      reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = async () => {
    const ok1 = await dialog.confirm("警告：此操作将清除数据库中所有数据（表结构保留），且不可撤销！\n\n确定要继续吗？");
    if (!ok1) {
      return;
    }
    const ok2 = await dialog.confirm("再次确认：清除所有数据后系统将恢复为初始状态。\n\n是否清除所有数据？");
    if (!ok2) {
      return;
    }
    try {
      setClearing(true);
      setErrorMessage("");
      setSuccessMessage("");
      const payload = await postJson<{ message: string; backup: { file_name: string } }>(
        "/api/data-security/backups/clear-all/",
        {},
      );
      setSuccessMessage(
        `${payload.message}（已自动创建安全备份：${payload.backup?.file_name ?? "未知"}）`,
      );
      reload();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setClearing(false);
    }
  };

  const handleCopyPath = async (path: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setSuccessMessage("备份文件路径已复制");
    } catch {
      setErrorMessage("当前浏览器不支持复制路径，请手动复制");
    }
  };

  const handleDownload = (item: BackupItem) => {
    window.open(`/api/data-security/backups/${item.id}/download/`, "_blank");
  };

  return (
    <div className="space-y-4">
      {(successMessage || errorMessage) && (
        <div className="space-y-2">
          {successMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#f6ffed", color: "#389e0d", border: "1px solid #b7eb8f" }}>
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="rounded px-3 py-2 text-sm" style={{ background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}>
              {errorMessage}
            </div>
          )}
        </div>
      )}

      <div className="rounded border bg-white p-5" style={{ borderColor: "#e4e7ed" }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="mb-1 text-sm font-medium" style={{ color: "#303133" }}>数据安全</h2>
            <p className="text-xs leading-6" style={{ color: "#909399" }}>
              使用系统内置备份能力，将当前数据库内容导出为本地 JSON 文件，默认保存到项目运行目录。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={reload}
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm"
              style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
            >
              <RefreshCw style={{ width: 13, height: 13 }} />
              刷新列表
            </button>
            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "#1677ff" }}
            >
              <HardDriveDownload style={{ width: 13, height: 13 }} />
              {creating ? "备份中..." : "立即备份"}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="rounded border px-4 py-3" style={{ borderColor: "#f0f0f0", background: "#fafafa" }}>
            <div className="text-xs" style={{ color: "#909399" }}>备份总数</div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "#303133" }}>{summary.total}</div>
          </div>
          <div className="rounded border px-4 py-3" style={{ borderColor: "#f0f0f0", background: "#fafafa" }}>
            <div className="text-xs" style={{ color: "#909399" }}>成功备份</div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "#389e0d" }}>{summary.success_count}</div>
          </div>
          <div className="rounded border px-4 py-3" style={{ borderColor: "#f0f0f0", background: "#fafafa" }}>
            <div className="text-xs" style={{ color: "#909399" }}>失败记录</div>
            <div className="mt-1 text-xl font-semibold" style={{ color: "#cf1322" }}>{summary.failed_count}</div>
          </div>
        </div>

        <div className="mt-4 rounded border px-4 py-3 text-sm" style={{ borderColor: "#d6e4ff", background: "#f0f5ff" }}>
          <div className="mb-1 inline-flex items-center gap-1.5 font-medium" style={{ color: "#1d39c4" }}>
            <ShieldCheck style={{ width: 14, height: 14 }} />
            本地备份目录
          </div>
          <div style={{ color: "#303133", wordBreak: "break-all" }}>{backupDir || "runtime/database_backups"}</div>
        </div>

        <div className="mt-4 rounded border px-4 py-3 text-sm" style={{ borderColor: "#ffe58f", background: "#fffbe6" }}>
          <div className="mb-1 inline-flex items-center gap-1.5 font-medium" style={{ color: "#ad6800" }}>
            <ShieldAlert style={{ width: 14, height: 14 }} />
            覆盖恢复说明
          </div>
          <div style={{ color: "#8c6d1f", lineHeight: 1.8 }}>
            恢复时会先自动生成一份“恢复前安全备份”，随后按备份文件内容整库覆盖当前数据，可用于回滚，也能自动兼容后续新增的数据表。
          </div>
        </div>

        <div className="mt-4 rounded border px-4 py-4" style={{ borderColor: "#f0f0f0", background: "#fafafa" }}>
          <div className="mb-3 text-sm font-medium" style={{ color: "#303133" }}>上传备份并恢复</div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              className="text-sm"
            />
            <button
              type="button"
              onClick={handleUploadRestore}
              disabled={importing}
              className="inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "#722ed1" }}
            >
              <Upload style={{ width: 13, height: 13 }} />
              {importing ? "恢复中..." : "上传并恢复"}
            </button>
            {selectedFile && (
              <span className="text-xs" style={{ color: "#606266" }}>
                当前文件：{selectedFile.name}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="rounded border px-4 py-4 mt-4" style={{ borderColor: "#ffccc7", background: "#fff2f0" }}>
        <div className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "#cf1322" }}>
          <Trash2 style={{ width: 14, height: 14 }} />
          危险操作 - 清除所有数据
        </div>
        <p className="mb-3 text-xs" style={{ color: "#8c1d1d", lineHeight: 1.8 }}>
          此操作将清空数据库中所有业务数据（保留表结构），系统将恢复为初始状态。
          操作前会自动创建安全备份，但仍建议您手动备份后再执行。
        </p>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={clearing}
          className="inline-flex items-center gap-1.5 rounded px-4 py-2 text-sm text-white disabled:cursor-not-allowed disabled:opacity-60"
          style={{ background: "#cf1322" }}
        >
          <Trash2 style={{ width: 14, height: 14 }} />
          {clearing ? "清除中..." : "清除所有数据"}
        </button>
      </div>

      <div className="rounded border bg-white px-5 pb-4 pt-4" style={{ borderColor: "#e4e7ed" }}>
        <div className="mb-3 text-sm font-medium" style={{ color: "#303133" }}>备份记录</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderCollapse: "collapse", border: "1px solid #e4e7ed" }}>
            <thead>
              <tr style={{ background: "#fafafa" }}>
                {["时间", "文件名", "相对路径", "大小", "记录数", "创建人", "状态", "操作"].map((column) => (
                  <th
                    key={column}
                    className="whitespace-nowrap px-3 py-2.5 text-left"
                    style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    正在加载备份记录...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} style={{ borderBottom: "1px solid #f5f5f5" }}>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 12 }}>{item.created_at}</td>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#303133", fontSize: 13 }}>{item.file_name}</td>
                    <td className="px-3 py-2.5" style={{ color: "#606266", fontSize: 12, minWidth: 220 }}>{item.relative_path}</td>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.file_size_display}</td>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.record_count}</td>
                    <td className="whitespace-nowrap px-3 py-2.5" style={{ color: "#606266", fontSize: 13 }}>{item.created_by}</td>
                    <td className="px-3 py-2.5">
                      <span
                        className="rounded px-2 py-0.5 text-xs"
                        style={item.status === "成功"
                          ? { background: "#f6ffed", color: "#52c41a", border: "1px solid #b7eb8f" }
                          : { background: "#fff2f0", color: "#cf1322", border: "1px solid #ffccc7" }}
                      >
                        {item.status}
                      </span>
                      {!item.file_exists && (
                        <div className="mt-1 text-xs" style={{ color: "#cf1322" }}>文件已不存在</div>
                      )}
                      {item.error_message && (
                        <div className="mt-1 text-xs" style={{ color: "#cf1322", maxWidth: 260 }}>{item.error_message}</div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(item)}
                          disabled={!item.file_exists}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ border: "1px solid #dcdfe6", color: "#1677ff", background: "#fff" }}
                        >
                          <Download style={{ width: 12, height: 12 }} />
                          下载
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          disabled={!item.file_exists || restoringId === item.id}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                          style={{ border: "1px solid #d9d9d9", color: "#722ed1", background: "#f9f0ff" }}
                        >
                          <ShieldCheck style={{ width: 12, height: 12 }} />
                          {restoringId === item.id ? "恢复中..." : "恢复"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyPath(item.file_path)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                          style={{ border: "1px solid #dcdfe6", color: "#606266", background: "#fff" }}
                        >
                          <Copy style={{ width: 12, height: 12 }} />
                          复制路径
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs"
                          style={{ border: "1px solid #ffd8bf", color: "#d46b08", background: "#fff7e6" }}
                        >
                          <Trash2 style={{ width: 12, height: 12 }} />
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-3 py-12 text-center" style={{ color: "#909399", fontSize: 13 }}>
                    暂无备份记录，请先执行一次本地备份。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
