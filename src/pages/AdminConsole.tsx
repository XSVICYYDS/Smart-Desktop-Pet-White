import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import {
  Shield,
  Users,
  KeyRound,
  Package,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  Crown,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Zap,
} from "lucide-react";
import {
  ensureSeedUsers,
  isCurrentAdmin,
  isCurrentSuperAdmin,
  getUserHighestRole,
  getCurrentSession,
  adminListUsers,
  adminUpdateRole,
  adminResetPassword,
  adminSetUserStatus,
  adminDeleteUser,
  adminGetRolesMatrix,
  adminListVersions,
  ROLE_HIERARCHY,
  BUILTIN_SUPER_ADMIN,
  type RoleId,
  type AdminUserRow,
  type VersionRecord,
} from "@/lib/authClient";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";

type Tab = "users" | "roles" | "versions";

function fmtDate(iso?: string) {
  if (!iso) return "-";
  try {
    return new Date(iso).toLocaleString("zh-CN");
  } catch {
    return iso;
  }
}

const ROLE_LABEL: Record<RoleId, string> = {
  guest: "访客",
  user: "普通用户",
  vip: "VIP会员",
  admin: "管理员",
  super_admin: "超级管理员",
};

const ROLE_COLOR: Record<RoleId, string> = {
  guest: "bg-slate-100 text-slate-600 border-slate-200",
  user: "bg-blue-50 text-blue-600 border-blue-200",
  vip: "bg-amber-50 text-amber-700 border-amber-200",
  admin: "bg-purple-50 text-purple-700 border-purple-200",
  super_admin: "bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border-pink-200",
};

/**
 * 管理员控制台（/admin）
 *  - 三大 Tab：管理账号 / 管理权限 / 管理版本
 *  - 路由守卫：非管理员自动跳回首页；
 *  - 越权按钮禁用：管理员看不到 SUPER_ADMIN 角色选项；非 SUPER_ADMIN 禁用对管理员/内置 XSVICYYDS 行的操作；
 *  - 内置 XSVICYYDS 行统一标注「内置超级管理员 - 不可编辑角色/禁用/删除，仅本人可重置密码」
 */
export default function AdminConsole() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("users");
  const [toasts, setToasts] = useState<{ id: number; type: "success" | "error"; msg: string }[]>([]);

  /**
   * 页面内联 toast：避免引入额外依赖
   */
  function pushToast(type: "success" | "error", msg: string) {
    const id = Date.now() + Math.random();
    setToasts((cur) => [...cur, { id, type, msg }]);
    setTimeout(() => {
      setToasts((cur) => cur.filter((t) => t.id !== id));
    }, 2800);
  }

  // 先种子用户（保证 XSVICYYDS 内置账号 & 角色存在）
  const [booted, setBooted] = useState(false);
  useEffect(() => {
    ensureSeedUsers().finally(() => setBooted(true));
  }, []);

  // 路由守卫：未登录管理员 → 回首页
  const guard = useMemo(() => {
    if (!booted) return { ok: true }; // 还在初始化
    const ok = isCurrentAdmin();
    return { ok };
  }, [booted]);

  if (booted && !guard.ok) {
    return <Navigate to="/" replace />;
  }

  const sess = getCurrentSession();
  const meRole = sess ? getUserHighestRole(sess.user_id) : ("guest" as RoleId);
  const isSuper = isCurrentSuperAdmin();

  return (
    <div className="pt-28 pb-24 max-w-7xl mx-auto px-6 relative">
      {/* Inline toast stack */}
      <div className="fixed top-24 right-6 z-[60] flex flex-col gap-2 w-[280px]">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`glass animate-fade-in-up rounded-2xl shadow-xl border px-4 py-3 text-sm flex items-start gap-2 ${
              t.type === "success"
                ? "bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 border-green-200"
                : "bg-gradient-to-br from-red-50 to-rose-50 text-red-800 border-red-200"
            }`}
          >
            {t.type === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <div className="whitespace-pre-wrap break-words leading-snug">{t.msg}</div>
          </div>
        ))}
      </div>

      {/* 顶部 Banner */}
      <div className="glass rounded-3xl shadow-xl shadow-pink-100/60 border border-pink-100 overflow-hidden">
        <div className="bg-gradient-to-br from-brand-pink via-fuchsia-400/70 to-brand-pink-dark p-6 sm:p-8 text-white relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute right-14 top-8 opacity-80">
            <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur border-2 border-white/30 flex items-center justify-center overflow-hidden">
              <img src={xiaobaiLogo} alt="小白" className="w-full h-full object-contain" />
            </div>
          </div>
          <div className="flex items-start gap-4 max-w-3xl">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur border border-white/20">
              <Shield size={28} />
            </div>
            <div className="flex-1">
              <div className="text-xs tracking-[0.2em] opacity-80">XIAOBAI · ADMIN CONSOLE</div>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold leading-tight">
                管理员控制台
              </h1>
              <p className="mt-2 text-sm opacity-90">
                您是 <span className="font-semibold">{ROLE_LABEL[meRole]}</span>
                {sess ? `（${sess.nickname} / ${sess.email}）` : ""}。
                在此管理「账号 / 权限 / 版本」三大能力；所有写入操作均通过
                <span className="mx-1 font-semibold">RBAC 三元组鉴权 + 越权保护</span>。
              </p>
            </div>
          </div>
        </div>

        {/* Tab 栏 */}
        <div className="px-4 sm:px-6 pt-2 border-b border-pink-100 bg-white/40 backdrop-blur">
          <div className="flex flex-wrap gap-2 sm:gap-4 -mb-px">
            {([
              { id: "users", label: "管理账号", icon: Users, desc: "用户列表 / 重置密码 / 禁用 / 删除" },
              { id: "roles", label: "管理权限", icon: KeyRound, desc: "角色-权限矩阵" },
              { id: "versions", label: "管理版本", icon: Package, desc: "历史发布 / 预览版本" },
            ] as const).map((t) => {
              const Icon = t.icon;
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`group relative px-4 py-3 flex items-center gap-2 text-sm transition ${
                    active ? "text-brand-pink font-semibold" : "text-brand-gray hover:text-brand-dark"
                  }`}
                >
                  <Icon size={16} />
                  <span>{t.label}</span>
                  <span className={`hidden sm:inline text-[11px] opacity-70`}>{t.desc}</span>
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-pink rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab 内容 */}
        <div className="p-5 sm:p-8">
          {tab === "users" && (
            <UsersTab
              isSuper={isSuper}
              meRole={meRole}
              meId={sess?.user_id}
              onGoLogin={() => navigate("/auth")}
              pushToast={pushToast}
            />
          )}
          {tab === "roles" && <RolesTab isSuper={isSuper} />}
          {tab === "versions" && <VersionsTab />}
        </div>
      </div>
    </div>
  );
}

/* ========== 管理账号 ========== */

function UsersTab(props: {
  isSuper: boolean;
  meRole: RoleId;
  meId?: string;
  onGoLogin: () => void;
  pushToast: (type: "success" | "error", msg: string) => void;
}) {
  const { isSuper, meRole, meId, onGoLogin, pushToast } = props;
  const [rows, setRows] = useState<AdminUserRow[]>(() => adminListUsers());
  const [resetFor, setResetFor] = useState<string | null>(null);
  const [resetPwd, setResetPwd] = useState("");
  const meLevel = ROLE_HIERARCHY[meRole];

  const refresh = () => setRows(adminListUsers());

  function roleCanEdit(target: AdminUserRow): boolean {
    if (target.is_builtin_super_admin) return false; // XSVICYYDS 不可被改角色
    const tgtLevel = ROLE_HIERARCHY[target.highest_role];
    if (!isSuper) {
      // 非 SUPER_ADMIN：只能编辑比自己低的；并不能改成 ADMIN/SUPER_ADMIN（adminUpdateRole 也会再硬校验）
      if (tgtLevel >= meLevel) return false;
    }
    return true;
  }

  function canDisable(target: AdminUserRow): boolean {
    if (target.is_builtin_super_admin) return false;
    if (target.user_id === meId) return false;
    const tgtLevel = ROLE_HIERARCHY[target.highest_role];
    if (!isSuper && tgtLevel >= meLevel) return false; // 非超管不能改高级别的
    return true;
  }

  function canDelete(target: AdminUserRow): boolean {
    if (target.is_builtin_super_admin) return false;
    if (target.user_id === meId) return false;
    const tgtLevel = ROLE_HIERARCHY[target.highest_role];
    if (!isSuper && tgtLevel >= meLevel) return false;
    return true;
  }

  const builtinHint = rows.find((r) => r.is_builtin_super_admin) ? (
    <div className="mb-4 text-xs flex items-start gap-2 px-3 py-2 rounded-xl bg-pink-50 border border-pink-100 text-pink-700/90">
      <Crown size={14} className="mt-0.5 shrink-0" />
      <span>
        已检测到内置超级管理员 <b>XSVICYYDS</b>（
        <code className="mx-1">{BUILTIN_SUPER_ADMIN.email}</code>）。
        为避免越权，其它管理员不得改其角色/禁用/删除；仅本人可重置密码。
      </span>
    </div>
  ) : null;

  return (
    <div>
      {builtinHint}

      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">用户列表</h2>
          <p className="text-xs text-brand-gray mt-1">
            共 {rows.length} 个用户。图标右侧带 <Crown size={11} className="inline align-text-bottom text-pink-600" />{" "}
            的用户是内置超级管理员，不能被其它账号编辑。
          </p>
        </div>
        <button
          onClick={onGoLogin}
          className="text-xs px-3 py-2 rounded-xl border border-pink-200 bg-white text-brand-pink hover:bg-pink-50 transition"
        >
          切换账号 →
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-pink-50 to-rose-50 text-brand-dark/80">
            <tr>
              <th className="text-left px-4 py-3">用户</th>
              <th className="text-left px-4 py-3">角色</th>
              <th className="text-left px-4 py-3">状态</th>
              <th className="text-left px-4 py-3">注册时间</th>
              <th className="text-right px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => {
              const roleOptions: RoleId[] = isSuper
                ? ["guest", "user", "vip", "admin", "super_admin"]
                : ["guest", "user", "vip"]; // 非超管没有 admin/super_admin 选项
              const roleDisabled = !roleCanEdit(u);
              const canToggle = canDisable(u);
              const canDel = canDelete(u);
              // 密码：非超管且目标级别>=自己 → 禁止；内置超管只允许本人改
              const canResetPwd = (() => {
                if (u.is_builtin_super_admin) return u.user_id === meId;
                const tgtLevel = ROLE_HIERARCHY[u.highest_role];
                if (!isSuper && tgtLevel >= meLevel) return false;
                return true;
              })();
              return (
                <tr
                  key={u.user_id}
                  className={`border-t border-pink-50 hover:bg-pink-50/40 transition ${
                    u.is_builtin_super_admin ? "bg-pink-50/30" : ""
                  }`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`relative w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                          u.is_builtin_super_admin
                            ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark"
                            : "bg-gradient-to-br from-indigo-400 to-sky-500"
                        }`}
                      >
                        {(u.nickname || u.email || "?").slice(0, 1).toUpperCase()}
                        {u.is_builtin_super_admin && (
                          <Crown
                            size={11}
                            className="absolute -top-1 -right-1 text-yellow-400 bg-white rounded-full border border-pink-100 p-[1px]"
                          />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-brand-dark flex items-center gap-1.5">
                          {u.nickname}
                          {u.is_builtin_super_admin && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-pink-100 text-pink-700 border border-pink-200">
                              内置
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-brand-gray truncate">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <select
                        disabled={roleDisabled}
                        value={u.highest_role}
                        onChange={async (e) => {
                          const res = await adminUpdateRole(u.user_id, e.target.value as RoleId);
                          if (res.ok) {
                            pushToast("success", res.msg);
                            refresh();
                          } else {
                            pushToast("error", res.msg);
                            refresh();
                          }
                        }}
                        className={`text-xs rounded-lg px-2 py-1.5 border bg-white disabled:opacity-70 disabled:cursor-not-allowed ${
                          ROLE_COLOR[u.highest_role]
                        }`}
                      >
                        {roleOptions.map((r) => (
                          <option key={r} value={r}>
                            {ROLE_LABEL[r]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {u.status === "active" ? (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={11} />
                        已启用
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200">
                        <XCircle size={11} />
                        已禁用
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-gray whitespace-nowrap">
                    {fmtDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1.5 flex-wrap">
                      <button
                        disabled={!canResetPwd}
                        onClick={() => {
                          setResetFor(u.user_id);
                          setResetPwd("");
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border transition ${
                          canResetPwd
                            ? "bg-white text-brand-dark border-pink-200 hover:bg-pink-50"
                            : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                        }`}
                        title={
                          canResetPwd
                            ? "重置该用户密码"
                            : u.is_builtin_super_admin
                            ? "仅 XSVICYYDS 本人可重置自己的密码"
                            : "目标角色不低于你，禁止重置密码"
                        }
                      >
                        <Lock size={12} />
                        重置密码
                      </button>
                      <button
                        disabled={!canToggle}
                        onClick={() => {
                          const r = adminSetUserStatus(u.user_id, u.status === "active");
                          if (r.ok) {
                            pushToast("success", r.msg);
                            refresh();
                          } else pushToast("error", r.msg);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border transition ${
                          canToggle
                            ? u.status === "active"
                              ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100/70"
                              : "bg-green-50 text-green-700 border-green-200 hover:bg-green-100/70"
                            : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                        }`}
                        title={
                          canToggle
                            ? u.status === "active"
                              ? "禁用该账号"
                              : "启用该账号"
                            : u.is_builtin_super_admin
                            ? "内置超级管理员禁止禁用"
                            : "权限不足：目标角色不低于你"
                        }
                      >
                        {u.status === "active" ? <Lock size={12} /> : <Unlock size={12} />}
                        {u.status === "active" ? "禁用" : "启用"}
                      </button>
                      <button
                        disabled={!canDel}
                        onClick={() => {
                          if (!confirm(`确认删除用户「${u.nickname} <${u.email}>」？删除后不可恢复。`)) return;
                          const r = adminDeleteUser(u.user_id);
                          if (r.ok) {
                            pushToast("success", r.msg);
                            refresh();
                          } else pushToast("error", r.msg);
                        }}
                        className={`inline-flex items-center gap-1 px-2 py-1.5 text-xs rounded-lg border transition ${
                          canDel
                            ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100/70"
                            : "bg-slate-50 text-slate-400 border-slate-100 cursor-not-allowed"
                        }`}
                        title={
                          canDel
                            ? "删除该用户"
                            : u.is_builtin_super_admin
                            ? "内置超级管理员禁止删除"
                            : u.user_id === meId
                            ? "不允许删除当前登录账号"
                            : "权限不足：目标角色不低于你"
                        }
                      >
                        <Trash2 size={12} />
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-brand-gray">
                  暂无用户，请先注册或
                  <button onClick={onGoLogin} className="text-brand-pink mx-1 underline">
                    登录管理员账号
                  </button>
                  。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 重置密码弹窗 */}
      {resetFor && (
        <div className="mt-5 p-5 rounded-2xl border border-pink-200 bg-white shadow-md animate-fade-in-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-brand-dark font-semibold">
              <RotateCcw size={16} className="text-brand-pink" />
              重置密码
            </div>
            <button
              onClick={() => setResetFor(null)}
              className="text-xs text-brand-gray hover:text-brand-dark"
            >
              取消
            </button>
          </div>
          <div className="grid sm:grid-cols-[1fr_auto] gap-3">
            <input
              type="text"
              value={resetPwd}
              onChange={(e) => setResetPwd(e.target.value)}
              placeholder="至少 8 位，需同时包含大写字母 + 小写字母 + 数字"
              className="w-full text-sm px-3 py-2.5 rounded-xl border border-pink-200 focus:outline-none focus:ring-2 focus:ring-brand-pink/40 focus:border-brand-pink"
            />
            <button
              onClick={async () => {
                const r = await adminResetPassword(resetFor, resetPwd);
                if (r.ok) {
                  pushToast("success", r.msg);
                  setResetFor(null);
                  setResetPwd("");
                  refresh();
                } else pushToast("error", r.msg);
              }}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-sm font-medium shadow-md shadow-brand-pink/30 hover:opacity-95 transition"
            >
              确认重置
            </button>
          </div>
          <p className="mt-2 text-xs text-brand-gray">
            密码强度规则与注册完全一致；对内置超级管理员 XSVICYYDS，仅本人账号可重置。
          </p>
        </div>
      )}
    </div>
  );
}

/* ========== 管理权限（角色-权限矩阵） ========== */

function RolesTab({ isSuper }: { isSuper: boolean }) {
  const data = adminGetRolesMatrix();
  if (!data.roles.length) {
    return (
      <div className="text-sm text-brand-gray text-center py-10">
        暂无权限数据，请先登录管理员。
      </div>
    );
  }
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-dark">角色 → 权限矩阵</h2>
        <p className="text-xs text-brand-gray mt-1">
          角色等级：
          <code className="mx-1">
            访客(0) → 普通用户(1) → VIP会员(2) → 管理员(3) → 超级管理员(4)
          </code>
          。其中
          <span className="mx-1 font-semibold text-pink-700">超级管理员拥有 PERMISSION_DEFINITIONS 全部权限</span>
          （包括
          <code className="mx-1">admin.role_manage / admin.version_manage</code>
          等）。
        </p>
        {!isSuper && (
          <div className="mt-2 text-xs inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
            <Zap size={12} />
            您不是 SUPER_ADMIN（XSVICYYDS），因此无法授予任何用户管理员或更高角色。
          </div>
        )}
      </div>
      <div className="overflow-x-auto rounded-2xl border border-pink-100 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-brand-pink/10 to-fuchsia-400/10 text-brand-dark/80">
            <tr>
              <th className="text-left px-4 py-3 w-56">权限（模块 · 名称）</th>
              {data.roles.map((r) => (
                <th key={r.role_id} className="text-center px-2 py-3">
                  <div
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs border ${ROLE_COLOR[r.role_id as RoleId]}`}
                  >
                    {r.role_id === "super_admin" && <Crown size={11} />}
                    {r.name}
                    <span className="opacity-60">Lv.{data.hierarchy[r.role_id as RoleId] ?? 0}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.permissions.map((p, idx) => (
              <tr
                key={p.permission_id}
                className={`border-t border-pink-50 ${idx % 2 === 1 ? "bg-slate-50/30" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <div className="font-medium text-brand-dark">{p.name}</div>
                  <div className="text-[11px] text-brand-gray">
                    <span className="inline-block px-1.5 py-0.5 rounded bg-slate-100 mr-1">{p.module}</span>
                    <span className="opacity-70">{p.description}</span>
                  </div>
                </td>
                {data.roles.map((r) => {
                  const ok = !!data.matrix[r.role_id as RoleId]?.includes(p.permission_id);
                  return (
                    <td key={r.role_id} className="text-center px-2 py-2.5">
                      {ok ? (
                        <CheckCircle2 size={16} className="mx-auto text-green-500" />
                      ) : (
                        <XCircle size={16} className="mx-auto text-slate-300" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== 管理版本 ========== */

function VersionsTab() {
  const list: VersionRecord[] = adminListVersions();
  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-dark">版本发布清单</h2>
        <p className="text-xs text-brand-gray mt-1">
          展示小白所有正式版与开发预览版；点击「GitHub Release」跳转到对应 Release 页面。
        </p>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {list.map((v) => (
          <div
            key={v.tag}
            className={`p-5 rounded-2xl border bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition ${
              v.canary ? "border-amber-200" : "border-pink-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <div
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${
                  v.canary
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-brand-pink/10 text-pink-700 border-pink-200"
                }`}
              >
                <Package size={11} />
                {v.tag}
                {v.canary && <span className="ml-1">开发版</span>}
              </div>
              {v.canary ? (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-700">
                  预览
                </span>
              ) : (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100/70 text-green-700 flex items-center gap-1">
                  <CheckCircle2 size={10} /> 已发布
                </span>
              )}
            </div>
            <h3 className="mt-3 font-semibold text-brand-dark leading-snug">{v.title}</h3>
            <p className="mt-2 text-xs text-brand-gray/90 leading-relaxed min-h-[56px]">
              {v.summary}
            </p>
            <div className="mt-3 text-[11px] text-brand-gray">
              发布时间：{v.released_at ? fmtDate(v.released_at) : "—"}
            </div>
            <div className="mt-3 flex items-center justify-between">
              {v.github_url ? (
                <a
                  href={v.github_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-brand-pink hover:underline"
                >
                  GitHub Release
                  <ExternalLink size={11} />
                </a>
              ) : (
                <span className="text-xs text-brand-gray">暂无公开链接</span>
              )}
              <span className="text-[11px] text-brand-gray">下载数统计占位：—</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
