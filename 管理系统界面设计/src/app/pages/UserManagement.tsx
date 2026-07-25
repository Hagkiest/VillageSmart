import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { fetchJson } from "../lib/api";
import { dialog } from "../lib/dialog";

export function UserManagement() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);

  const loadUsers = async () => {
    try {
      const data = await fetchJson("/api/users/");
      setUsers(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = async (id: number) => {
    if (!(await dialog.confirm("确定要删除该用户吗？"))) return;
    try {
      await fetchJson(`/api/users/${id}/`, { method: "DELETE" });
      loadUsers();
    } catch (e) {
      await dialog.alert("删除失败");
    }
  };

  return (
    <div className="bg-white rounded border" style={{ borderColor: "#e4e7ed" }}>
      {/* header */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #f0f0f0" }}>
        <button
          type="button"
          onClick={() => navigate("/users/new")}
          className="rounded text-sm px-4 py-1.5 text-white transition-opacity hover:opacity-85"
          style={{ background: "#1677ff" }}
        >
          新增用户
        </button>
      </div>

      {/* table */}
      <div className="overflow-x-auto px-5 pt-4 pb-5">
        <table className="w-full text-sm" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#fafafa" }}>
              {["序号", "用户名", "姓名", "当前角色", "状态", "操作"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left"
                  style={{ borderBottom: "1px solid #e4e7ed", color: "#606266", fontWeight: 500, fontSize: 13 }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u, i) => (
                <tr key={u.id} style={{ borderBottom: "1px solid #f5f5f5" }}
                  className="hover:bg-blue-50 transition-colors">
                  <td className="px-4 py-3" style={{ color: "#606266", fontSize: 13 }}>{i + 1}</td>
                  <td className="px-4 py-3" style={{ color: "#303133", fontSize: 13 }}>{u.username}</td>
                  <td className="px-4 py-3" style={{ color: "#303133", fontSize: 13 }}>{u.name}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded"
                      style={{ background: "#e6f4ff", color: "#1677ff", border: "1px solid #91caff" }}>
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.status ? (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#f6ffed", color: "#52c41a", border: "1px solid #b7eb8f" }}>启用</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: "#fff1f0", color: "#f5222d", border: "1px solid #ffa39e" }}>禁用</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => navigate(`/users/${u.id}/edit`)}
                        className="text-sm transition-opacity hover:opacity-70 whitespace-nowrap"
                        style={{ color: "#1677ff" }}>
                        编辑
                      </button>
                      <button type="button" onClick={() => handleDelete(u.id)}
                        className="text-sm transition-opacity hover:opacity-70 whitespace-nowrap"
                        style={{ color: "#ff4d4f" }}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center" style={{ color: "#909399", fontSize: 13 }}>
                  暂无用户数据
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
