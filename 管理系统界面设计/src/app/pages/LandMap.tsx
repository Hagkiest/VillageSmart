import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Upload, Plus, Edit2, Trash2 } from "lucide-react";
import { fetchJson, uploadForm, deleteJson } from "../lib/api";
import { dialog } from "../lib/dialog";

type Group = {
  id: number;
  name: string;
  map_image: string | null;
  count: number;
};

// ── map empty illustration ────────────────────────────────────────────────────

function MapEmpty({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-5">
      <svg width="110" height="95" viewBox="0 0 110 95" fill="none" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="55" cy="70" rx="26" ry="14" fill="rgba(255,255,255,0.1)" />
        <circle cx="55" cy="48" r="20" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <ellipse cx="45" cy="32" rx="5" ry="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <ellipse cx="65" cy="32" rx="5" ry="11" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
        <ellipse cx="45" cy="32" rx="2.5" ry="7" fill="rgba(255,255,255,0.1)" />
        <ellipse cx="65" cy="32" rx="2.5" ry="7" fill="rgba(255,255,255,0.1)" />
        <circle cx="49" cy="47" r="2.5" fill="rgba(255,255,255,0.25)" />
        <circle cx="61" cy="47" r="2.5" fill="rgba(255,255,255,0.25)" />
        <ellipse cx="55" cy="53" rx="3" ry="2" fill="rgba(255,255,255,0.15)" />
        {/* map paper */}
        <rect x="18" y="52" width="32" height="34" rx="3" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.18)" strokeWidth="1.2" />
        <rect x="23" y="59" width="22" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)" />
        <rect x="23" y="65" width="16" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)" />
        <rect x="23" y="71" width="19" height="2.5" rx="1.25" fill="rgba(255,255,255,0.15)" />
        {/* pin */}
        <circle cx="82" cy="60" r="8" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.2" />
        <circle cx="82" cy="57" r="3" fill="rgba(255,255,255,0.3)" />
        <path d="M82 60 L82 70" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeLinecap="round" />
      </svg>

      <div className="text-center">
        <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.55)" }}>
          当前还没有上传图纸
        </p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
          请先上传地块高清图
        </p>
      </div>

      <button
        type="button"
        onClick={onUpload}
        className="flex items-center gap-2 rounded px-5 py-2 text-sm transition-opacity hover:opacity-80"
        style={{ background: "#1677ff", color: "#fff" }}
      >
        <Upload style={{ width: 14, height: 14 }} />
        立即上传
      </button>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function LandMap() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGroups = async () => {
    try {
      const res = await fetchJson<{ items: Group[] }>("/api/village-groups/");
      setGroups(res.items);
      if (res.items.length > 0 && selectedId === null) {
        setSelectedId(res.items[0].id);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleAddGroup = async () => {
    const name = window.prompt("请输入新小组名称：");
    if (!name) return;
    try {
      const formData = new FormData();
      formData.append("name", name);
      await uploadForm("/api/village-groups/", formData);
      await fetchGroups();
    } catch (e: any) {
      await dialog.alert(e.message || "添加失败");
    }
  };

  const handleEditGroup = async (group: Group) => {
    const name = window.prompt("请输入新的小组名称：", group.name);
    if (!name || name === group.name) return;
    try {
      const formData = new FormData();
      formData.append("name", name);
      await uploadForm(`/api/village-groups/${group.id}/`, formData);
      await fetchGroups();
    } catch (e: any) {
      await dialog.alert(e.message || "修改失败");
    }
  };

  const handleDeleteGroup = async (id: number) => {
    if (!await dialog.confirm("确定要删除该小组吗？")) return;
    try {
      await deleteJson(`/api/village-groups/${id}/`);
      if (selectedId === id) setSelectedId(null);
      await fetchGroups();
    } catch (e: any) {
      await dialog.alert(e.message || "删除失败");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedId) return;
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      const formData = new FormData();
      formData.append("map_image", file);
      // keep existing name
      const group = groups.find(g => g.id === selectedId);
      if (group) {
        formData.append("name", group.name);
      }
      await uploadForm(`/api/village-groups/${selectedId}/`, formData);
      await fetchGroups();
    } catch (err: any) {
      await dialog.alert(err.message || "上传失败");
    }
    
    // clear input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const selectedGroup = groups.find((g) => g.id === selectedId);

  return (
    <div className="flex rounded border overflow-hidden" style={{ borderColor: "#e4e7ed", height: "calc(100vh - 140px)", minHeight: 500 }}>
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />

      {/* ── Left panel: 地块列表 ────────────────────────────────── */}
      <div className="flex flex-col flex-shrink-0 bg-white" style={{ width: 220, borderRight: "1px solid #e4e7ed" }}>
        {/* header */}
        <div className="px-4 py-3 flex-shrink-0 flex items-center justify-between" style={{ borderBottom: "1px solid #e4e7ed" }}>
          <span className="text-sm font-medium" style={{ color: "#303133" }}>地块列表</span>
          <button onClick={handleAddGroup} className="text-xs text-blue-600 flex items-center gap-1 hover:opacity-80">
            <Plus size={14} /> 添加
          </button>
        </div>

        {/* group list */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-xs text-gray-400 text-center">加载中...</div>
          ) : groups.length === 0 ? (
            <div className="p-4 text-xs text-gray-400 text-center">暂无小组数据</div>
          ) : (
            groups.map((g) => (
              <div
                key={g.id}
                className="group relative flex items-center justify-between px-4 py-2.5 text-sm transition-colors text-left cursor-pointer"
                onClick={() => setSelectedId(g.id)}
                style={{
                  background: selectedId === g.id ? "#e6f4ff" : "transparent",
                  color: selectedId === g.id ? "#1677ff" : "#606266",
                  borderBottom: "1px solid #f5f5f5",
                }}
              >
                <div className="flex items-center gap-2">
                  <span>{g.name}</span>
                  <span className="text-xs px-1.5 py-0.5 rounded"
                    style={{
                      background: selectedId === g.id ? "#bae0ff" : "#f0f0f0",
                      color: selectedId === g.id ? "#1677ff" : "#909399",
                    }}>
                    {g.count}人
                  </span>
                </div>
                
                {/* Actions (visible on hover) */}
                <div className="hidden group-hover:flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); handleEditGroup(g); }} className="p-1 hover:text-blue-500">
                    <Edit2 size={12} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteGroup(g.id); }} className="p-1 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Right panel: map area ───────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden relative" style={{ background: "#404040" }}>
        {/* map toolbar */}
        <div className="flex items-center justify-between px-4 py-2 flex-shrink-0 z-10"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.1)", background: "#333" }}>
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>
            {selectedGroup ? `${selectedGroup.name} · 地块高清图` : "地块高清图"}
          </span>
          <div className="flex items-center gap-2">
            <button type="button"
              className="w-7 h-7 rounded flex items-center justify-center transition-opacity hover:opacity-75"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}>
              <ChevronLeft style={{ width: 14, height: 14 }} />
            </button>
            <button type="button"
              className="w-7 h-7 rounded flex items-center justify-center transition-opacity hover:opacity-75"
              style={{ background: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.65)" }}>
              <ChevronRight style={{ width: 14, height: 14 }} />
            </button>
            {selectedGroup && (
              <button type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded px-3 py-1.5 text-sm transition-opacity hover:opacity-80"
                style={{ background: "#1677ff", color: "#fff" }}>
                <Upload style={{ width: 12, height: 12 }} />
                {selectedGroup.map_image ? "重新上传" : "上传"}
              </button>
            )}
          </div>
        </div>

        {/* map content */}
        <div className="flex-1 overflow-auto flex items-center justify-center relative">
          {!selectedGroup ? (
            <div className="text-gray-400 text-sm">请在左侧选择或添加一个地块小组</div>
          ) : selectedGroup.map_image ? (
            <img 
              src={selectedGroup.map_image} 
              alt={`${selectedGroup.name}地块图`} 
              className="max-w-full max-h-full object-contain"
            />
          ) : (
            <MapEmpty onUpload={() => fileInputRef.current?.click()} />
          )}
        </div>
      </div>
    </div>
  );
}
