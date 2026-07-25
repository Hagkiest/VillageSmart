import { Link, Outlet, useLocation, useNavigate } from "react-router";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ChevronDown, ChevronUp, Bell, Maximize2, Minimize2, Settings, Menu,
  LayoutDashboard, Users, Building2, Leaf, Briefcase,
  Scale, BarChart2, FolderOpen, Sprout, Wrench, Shield, SlidersHorizontal,
  X, Info
} from "lucide-react";
import { fetchJson } from "../lib/api";
import { getUISettings, subscribeUISettings } from "../lib/ui-settings";

type NavChild = { label: string; href: string };
type NavGroup = { type: "group"; label: string; icon: any; children: NavChild[] };
type NavLink = { type: "link"; label: string; href: string; icon: any };
type NavItem = NavGroup | NavLink;
const TODO_SUMMARY_EVENT = "todo-summary-changed";

const navItems: NavItem[] = [
  { type: "link", label: "首页", href: "/", icon: LayoutDashboard },
  {
    type: "group", label: "居民管理", icon: Users,
    children: [
      { label: "居民查询", href: "/residents" },
      { label: "新增居民", href: "/residents/new" },
      { label: "务工信息", href: "/work-info" },
      { label: "风险排查", href: "/risk-check" },
    ],
  },
  {
    type: "group", label: "特殊人群管理", icon: Users,
    children: [
      { label: "低收入人员查询", href: "/low-income" },
      { label: "残疾人查询", href: "/disabled" },
      { label: "关爱对象", href: "/care-objects" },
    ],
  },
  {
    type: "group", label: "机构管理", icon: Building2,
    children: [
      { label: "组织架构", href: "/org-structure" },
      { label: "党员管理", href: "/party-members" },
    ],
  },
  { type: "link", label: "待办提醒", href: "/todos", icon: Bell },
  {
    type: "group", label: "乡村振兴", icon: Leaf,
    children: [
      { label: "项目综合查询", href: "/projects" },
      { label: "政策性补贴", href: "/subsidies" },
      { label: "公益性岗位", href: "/public-jobs" },
    ],
  },
  { type: "link", label: "人民调解", href: "/mediation", icon: Scale },
  {
    type: "group", label: "耕地管理", icon: Sprout,
    children: [
      { label: "耕地查询", href: "/farmland" },
      { label: "地块高清图", href: "/land-map" },
    ],
  },
  { type: "link", label: "实用工具", href: "/tools", icon: Wrench },
  {
    type: "group", label: "权限管理", icon: Shield,
    children: [
      { label: "角色管理", href: "/roles" },
      { label: "用户管理", href: "/users" },
    ],
  },
  {
    type: "group", label: "系统设置", icon: SlidersHorizontal,
    children: [
      { label: "数据安全", href: "/settings/security" },
      { label: "提醒规则", href: "/settings/rules" },
      { label: "界面设置", href: "/settings/ui" },
      { label: "操作日志", href: "/settings/logs" },
    ],
  },
];

// breadcrumb map: path => [parent?, current]
const BREADCRUMB: Record<string, string[]> = {
  "/": ["首页"],
  "/residents": ["居民管理", "居民查询"],
  "/residents/new": ["居民管理", "新增居民"],
  "/work-info": ["居民管理", "务工信息"],
  "/risk-check": ["居民管理", "风险排查"],
  "/low-income": ["特殊人群管理", "低收入人员查询"],
  "/disabled": ["特殊人群管理", "残疾人查询"],
  "/care-objects": ["特殊人群管理", "关爱对象"],
  "/org-structure": ["机构管理", "组织架构"],
  "/party-members": ["机构管理", "党员管理"],
  "/todos": ["待办提醒"],
  "/projects": ["乡村振兴", "项目综合查询"],
  "/subsidies": ["乡村振兴", "政策性补贴"],
  "/public-jobs": ["乡村振兴", "公益性岗位"],
  "/mediation": ["人民调解"],
  "/reports": ["报表中心"],
  "/documents": ["文档管理"],
  "/farmland": ["耕地管理", "耕地查询"],
  "/land-map": ["耕地管理", "地块高清图"],
  "/tools": ["实用工具"],
  "/roles": ["权限管理", "角色管理"],
  "/users": ["权限管理", "用户管理"],
  "/activation": ["激活管理"],
  "/settings/security": ["系统设置", "数据安全"],
  "/settings/rules": ["系统设置", "提醒规则"],
  "/settings/dict": ["系统设置", "字典管理"],
  "/settings/ui": ["系统设置", "界面设置"],
  "/settings/logs": ["系统设置", "操作日志"],
};

const ALL_ROUTES_MAP: Record<string, string> = {
  "/": "首页",
  "/residents": "居民查询",
  "/residents/new": "新增居民",
  "/work-info": "务工信息",
  "/risk-check": "风险排查",
  "/low-income": "低收入人员查询",
  "/disabled": "残疾人查询",
  "/care-objects": "关爱对象",
  "/org-structure": "组织架构",
  "/party-members": "党员管理",
  "/todos": "待办提醒",
  "/projects": "项目综合查询",
  "/subsidies": "政策性补贴",
  "/public-jobs": "公益性岗位",
  "/mediation": "人民调解",
  "/reports": "报表中心",
  "/documents": "文档管理",
  "/farmland": "耕地查询",
  "/land-map": "地块高清图",
  "/tools": "实用工具",
  "/roles": "角色管理",
  "/users": "用户管理",
  "/activation": "激活管理",
  "/settings/security": "数据安全",
  "/settings/rules": "提醒规则",
  "/settings/ui": "界面设置",
  "/settings/logs": "操作日志",
};

function findParentGroupLabel(pathname: string) {
  for (const item of navItems) {
    if (item.type === "group" && item.children.some((child) => child.href === pathname)) {
      return item.label;
    }
  }
  return null;
}

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(["居民管理"])
  );
  const [uiSettings, setUiSettings] = useState(getUISettings());
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  const [todoSummary, setTodoSummary] = useState({ due_count: 0 });
  const [openedTabs, setOpenedTabs] = useState<{ label: string; href: string }[]>([
    { label: "首页", href: "/" }
  ]);
  const [showAbout, setShowAbout] = useState(false);
  const [aboutData, setAboutData] = useState<Record<string, any> | null>(null);

  const fetchAbout = useCallback(async () => {
    try {
      const data = await fetchJson<Record<string, any>>("/api/system/about/");
      setAboutData(data);
    } catch {
      setAboutData(null);
    }
  }, []);

  const handleOpenAbout = () => {
    fetchAbout();
    setShowAbout(true);
  };

  // ── 下拉菜单悬停控制（延迟隐藏，避免鼠标移动时菜单闪烁）──
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDropdownEnter = () => {
    if (dropdownTimer.current) {
      clearTimeout(dropdownTimer.current);
      dropdownTimer.current = null;
    }
    setShowDropdown(true);
  };
  const handleDropdownLeave = () => {
    dropdownTimer.current = setTimeout(() => {
      setShowDropdown(false);
    }, 250); // 250ms 延迟，给用户足够时间移回菜单
  };

  useEffect(() => {
    const currentPath = location.pathname;
    const label = ALL_ROUTES_MAP[currentPath];
    if (label) {
      setOpenedTabs(prev => {
        if (!prev.find(t => t.href === currentPath)) {
          return [...prev, { label, href: currentPath }];
        }
        return prev;
      });
    }
  }, [location.pathname]);

  useEffect(() => {
    const parentGroup = findParentGroupLabel(location.pathname);
    if (!parentGroup) {
      return;
    }

    setOpenGroups((prev) => {
      if (prev.has(parentGroup)) {
        return prev;
      }

      const next = new Set(prev);
      next.add(parentGroup);
      return next;
    });
  }, [location.pathname]);

  useEffect(() => subscribeUISettings(setUiSettings), []);

  useEffect(() => {
    let disposed = false;

    const loadTodoSummary = async () => {
      try {
        const payload = await fetchJson<{ due_count: number }>("/api/todos/summary/");
        if (!disposed) {
          setTodoSummary({ due_count: payload.due_count || 0 });
        }
      } catch (error) {
        console.error("Failed to load todo summary:", error);
      }
    };

    void loadTodoSummary();
    const timer = window.setInterval(() => {
      void loadTodoSummary();
    }, 30000);
    const handleTodoSummaryChanged = () => {
      void loadTodoSummary();
    };
    window.addEventListener(TODO_SUMMARY_EVENT, handleTodoSummaryChanged);

    return () => {
      disposed = true;
      window.clearInterval(timer);
      window.removeEventListener(TODO_SUMMARY_EVENT, handleTodoSummaryChanged);
    };
  }, [location.pathname]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const closeTab = (e: React.MouseEvent, href: string) => {
    e.preventDefault();
    e.stopPropagation();
    
    setOpenedTabs(prev => {
      const newTabs = prev.filter(t => t.href !== href);
      if (newTabs.length === 0) {
        navigate("/");
        return [{ label: "首页", href: "/" }];
      }
      if (location.pathname === href) {
        navigate(newTabs[newTabs.length - 1].href);
      }
      return newTabs;
    });
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const isActive = (href: string) => location.pathname === href;

  const crumbs = BREADCRUMB[location.pathname] ?? ["首页"];
  const logoLabel = uiSettings.logoText.trim() || uiSettings.systemTitle.trim() || "村务管理系统";
  const showLogoImage = uiSettings.logoMode !== "text";
  const showLogoText = uiSettings.logoMode !== "image";

  const handleToggleFullscreen = async () => {
    if (typeof document === "undefined") {
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await document.documentElement.requestFullscreen();
  };

  const handleExitSystem = async () => {
    try {
      await fetchJson("/api/system/shutdown/", { method: "POST" });
    } catch (e) {
      // Ignore errors if server stops
    }
    // Attempt to close the window
    window.close();
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "#f0f2f5" }}>
      {/* ── Top Header (full width) ── */}
      <header
        className="flex flex-shrink-0 border-b border-gray-200 bg-white"
        style={{ height: 48 }}
      >
        {/* Logo zone */}
        <div
          className="flex items-center gap-2 px-3 border-r border-gray-700 flex-shrink-0"
          style={{ width: 160, background: "#1e2640" }}
        >
          {showLogoImage && (
            uiSettings.logoImage ? (
              <img
                src={uiSettings.logoImage}
                alt="logo"
                className="w-6 h-6 rounded object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: "#1677ff" }}
              >
                <Briefcase className="w-3.5 h-3.5 text-white" />
              </div>
            )
          )}
          {showLogoText && (
            <span className="text-white font-semibold text-sm whitespace-nowrap leading-none">
              {logoLabel}
            </span>
          )}
        </div>

        {/* Header content */}
        <div className="flex flex-1 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-1 rounded text-gray-500 hover:bg-gray-100"
              title="菜单"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1 text-sm text-gray-500">
              {crumbs.map((c, i) => (
                <span key={c} className="flex items-center gap-1">
                  {i > 0 && <span className="mx-0.5" style={{ color: "#c0c4cc" }}>/</span>}
                  <span style={{ color: i === crumbs.length - 1 ? "#303133" : "#909399" }}>
                    {c}
                  </span>
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => void handleToggleFullscreen()}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100"
              title={isFullscreen ? "退出全屏" : "全屏"}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => navigate("/settings/ui")}
              className="p-1.5 rounded text-gray-500 hover:bg-gray-100"
              title="界面设置"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => navigate("/todos")}
              className="relative rounded p-1.5 text-gray-500 hover:bg-gray-100"
              title="待办提醒"
            >
              <Bell className="w-4 h-4" />
              {todoSummary.due_count > 0 && (
                <span
                  className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] text-white"
                  style={{ background: "#ff4d4f", lineHeight: 1 }}
                >
                  {todoSummary.due_count > 99 ? "99+" : todoSummary.due_count}
                </span>
              )}
            </button>
            <div className="flex items-center gap-1.5 ml-1 relative cursor-pointer"
              onMouseEnter={handleDropdownEnter}
              onMouseLeave={handleDropdownLeave}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ background: "#1677ff" }}
              >
                U
              </div>
              <span className="text-sm text-gray-700">当前用户</span>
              
              {/* Dropdown Menu */}
              <div
                className={`absolute right-0 top-full mt-1 w-36 bg-white border border-gray-200 rounded shadow-lg z-50 ${showDropdown ? "block" : "hidden"}`}
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <button
                  onClick={() => navigate("/activation")}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  激活管理
                </button>
                <button
                  onClick={handleOpenAbout}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  关于项目
                </button>
                <div className="border-t border-gray-100" />
                <button
                  onClick={handleExitSystem}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                >
                  退出系统
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className="flex flex-col flex-shrink-0 overflow-y-auto"
          style={{ width: 160, background: "#1e2640" }}
        >
          <nav className="py-1">
            {navItems.map((item) => {
              if (item.type === "link") {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm transition-colors"
                    style={{
                      color: active ? "#fff" : "#a0aec0",
                      background: active ? "#1677ff" : "transparent",
                    }}
                    onMouseEnter={(e) => {
                      if (!active)
                        (e.currentTarget as HTMLElement).style.background = "#2a3555";
                    }}
                    onMouseLeave={(e) => {
                      if (!active)
                        (e.currentTarget as HTMLElement).style.background = "transparent";
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              const isOpen = openGroups.has(item.label);
              return (
                <div key={item.label}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors text-left"
                    style={{ color: "#a0aec0" }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "#2a3555";
                      (e.currentTarget as HTMLElement).style.color = "#fff";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.background = "transparent";
                      (e.currentTarget as HTMLElement).style.color = "#a0aec0";
                    }}
                  >
                    <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isOpen ? (
                      <ChevronUp className="w-3 h-3 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="w-3 h-3 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen &&
                    item.children.map((child) => {
                      const active = isActive(child.href);
                      return (
                        <Link
                          key={child.label}
                          to={child.href}
                          className="flex items-center py-1.5 text-xs transition-colors"
                          style={{
                            paddingLeft: 36,
                            paddingRight: 8,
                            color: active ? "#fff" : "#718096",
                            background: active ? "#1677ff" : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            if (!active)
                              (e.currentTarget as HTMLElement).style.background = "#2a3555";
                          }}
                          onMouseLeave={(e) => {
                            if (!active)
                              (e.currentTarget as HTMLElement).style.background = "transparent";
                          }}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Right panel */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Tab strip */}
          <div
            className="flex flex-shrink-0 items-center bg-white border-b border-gray-200"
            style={{ height: 34 }}
          >
            <div className="flex flex-1 items-center overflow-x-auto h-full">
              {openedTabs.map((tab) => {
                const active = location.pathname === tab.href;
                return (
                  <Link
                    key={tab.href}
                    to={tab.href}
                    className="h-full flex items-center px-3 text-xs whitespace-nowrap flex-shrink-0 border-r border-gray-200 transition-colors group relative"
                    style={{
                      background: active ? "#1677ff" : "transparent",
                      color: active ? "#fff" : "#595959",
                    }}
                  >
                    <span>{tab.label}</span>
                    {openedTabs.length > 1 && (
                      <button
                        onClick={(e) => closeTab(e, tab.href)}
                        className={`ml-2 p-0.5 rounded-full hover:bg-black/10 transition-colors ${active ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      >
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Content + footer */}
          <main className="flex-1 overflow-auto flex flex-col">
            <div className="flex-1 p-4">
              <Outlet />
            </div>
            <footer className="text-center text-gray-400 text-xs py-3">
              Copyright ©2021-present 村务管理系统
            </footer>
          </main>
        </div>
      </div>

      {/* ── 关于项目弹窗 ── */}
      {showAbout && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40"
          onClick={() => setShowAbout(false)}
        >
          <div
            className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={() => setShowAbout(false)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>

            {/* 标题 */}
            <div className="mb-4 flex items-center gap-2">
              <div
                className="flex h-8 w-8 items-center justify-center rounded text-white text-sm"
                style={{ background: "#1677ff" }}
              >
                <Info size={16} />
              </div>
              <h2 className="text-lg font-semibold" style={{ color: "#1a1a2e" }}>
                关于项目
              </h2>
            </div>

            {/* 内容 */}
            {aboutData ? (
              <div className="space-y-3 text-sm" style={{ color: "#303133" }}>
                <div className="border-b pb-2">
                  <div className="text-base font-bold" style={{ color: "#1a1a2e" }}>
                    {aboutData.project?.name ?? "农村村务管理系统"}
                  </div>
                  <div className="text-xs text-gray-400">
                    {aboutData.project?.name_en ?? ""}
                  </div>
                </div>

                <div className="grid grid-cols-[80px_1fr] gap-y-1.5 text-xs">
                  <span className="text-gray-400">版本号</span>
                  <span>v{aboutData.project?.version ?? "1.0.0"}</span>

                  <span className="text-gray-400">制作人</span>
                  <span>{aboutData.author?.name ?? "GYC"}（{aboutData.author?.team ?? "Hispirit 团队"}）</span>

                  {aboutData.author?.email && (
                    <>
                      <span className="text-gray-400">联系邮箱</span>
                      <span>{aboutData.author.email}</span>
                    </>
                  )}
                </div>

                <div className="pt-1">
                  <div className="mb-1 text-xs text-gray-400">项目简介</div>
                  <p className="text-xs leading-relaxed" style={{ color: "#606266" }}>
                    {aboutData.project?.description ?? ""}
                  </p>
                </div>

                <div className="pt-1">
                  <div className="mb-1 text-xs text-gray-400">技术栈</div>
                  <ul className="list-disc pl-4 text-xs" style={{ color: "#606266" }}>
                    {(aboutData.technologies ?? []).map((tech: string, i: number) => (
                      <li key={i}>{tech}</li>
                    ))}
                  </ul>
                </div>

                <div className="mt-2 border-t pt-2 text-xs" style={{ color: "#909399" }}>
                  <p>{aboutData.copyright?.text ?? ""}</p>
                  {aboutData.copyright?.license && (
                    <p className="mt-1">{aboutData.copyright.license}</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-400">加载中...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
