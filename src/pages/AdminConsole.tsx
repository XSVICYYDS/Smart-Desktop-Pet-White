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
  MessageSquare,
  Users as UsersGroup,
  ThumbsUp,
  Heart,
  Search,
  Edit3,
  Ban,
  Award,
  Flame,
  Sparkles,
  Image as ImageIcon,
  Film,
  FileText,
  Download,
  Copy,
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
import {
  adminSearchMessages,
  adminListAllGroups,
  adminListAllFriendEdges,
  adminResetFeatureLikes,
  deleteMessage,
  adminEditTextMessage,
  listAllFeatureLikes,
  computeHotScore,
  getFeatureLikes,
  type ChatMessage,
  type ChatGroup,
  type FeatureLikes,
  disbandGroup,
  transferGroupOwner,
  setGroupMemberRole,
  muteGroupMember,
  subscribeSocial,
  lookupUserPublic,
  getGroup,
} from "@/lib/socialStore";
import { FEATURES } from "@/data/playgroundData";
import xiaobaiLogo from "@/assets/xiaobai-logo.gif";

type Tab = "users" | "roles" | "versions" | "messages" | "groups" | "likes";

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
              { id: "messages", label: "消息管理", icon: MessageSquare, desc: "查看/编辑/删除所有私聊和群聊消息" },
              { id: "groups", label: "群聊管理", icon: UsersGroup, desc: "解散 / 转让 / 禁言 / 踢人" },
              { id: "likes", label: "点赞统计", icon: ThumbsUp, desc: "所有游戏/工具/AI 的赞和喜欢热度榜" },
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
          {tab === "messages" && (
            <MessagesTab
              pushToast={pushToast}
              onGoChat={(cid) => navigate(`/chat/${encodeURIComponent(cid)}`)}
            />
          )}
          {tab === "groups" && <GroupsTab pushToast={pushToast} />}
          {tab === "likes" && <LikesTab pushToast={pushToast} />}
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

/* ========== 消息管理（管理员查看/编辑/删除所有 DM 与群聊消息） ========== */

function MessagesTab(props: {
  pushToast: (type: "success" | "error", msg: string) => void;
  onGoChat: (conversationId: string) => void;
}) {
  const { pushToast, onGoChat } = props;
  const [kw, setKw] = useState("");
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const off = subscribeSocial(() => setTick((t) => t + 1));
    return off;
  }, []);
  const list = useMemo(() => adminSearchMessages(kw, 300), [kw, tick]);
  const [editOf, setEditOf] = useState<{ id: string; text: string } | null>(null);

  const saveEdit = () => {
    if (!editOf) return;
    if (adminEditTextMessage(editOf.id, editOf.text)) {
      pushToast("success", "已更新文字消息内容");
      setEditOf(null);
      setTick((t) => t + 1);
    } else {
      pushToast("error", "编辑失败（非文字消息或权限不足）");
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3 justify-between">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">
            消息管理（{list.length} 条）
          </h2>
          <p className="text-xs text-brand-gray mt-1">
            支持所有私聊/群聊消息的关键词搜索、文本编辑、软删除；被删除的消息 UI 展示为「管理员已删除」但审计保留。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && setTick((t) => t + 1)}
              placeholder="按内容 / 发送者 / 会话ID 搜索…"
              className="pl-8 pr-3 py-2 text-xs rounded-xl border border-pink-200 bg-white focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 w-64"
            />
          </div>
          <button
            onClick={() => setTick((t) => t + 1)}
            className="text-xs px-3 py-2 rounded-xl border border-pink-200 bg-white text-brand-pink hover:bg-pink-50 flex items-center gap-1"
          >
            <RotateCcw size={12} /> 刷新
          </button>
        </div>
      </div>

      {editOf && (
        <div className="mb-4 rounded-2xl border border-violet-200 bg-violet-50/60 p-4 animate-fade-in-up">
          <div className="text-xs text-violet-700 font-semibold mb-2 flex items-center gap-1.5">
            <Shield size={12} /> 正在编辑该文字消息：
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <textarea
              value={editOf.text}
              onChange={(e) => setEditOf({ ...editOf, text: e.target.value })}
              rows={2}
              className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setEditOf(null)}
                className="rounded-xl bg-slate-100 text-slate-600 px-4 py-2 text-sm hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={saveEdit}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-2 text-sm font-semibold shadow hover:brightness-105"
              >
                保存修改
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-pink-100 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-pink-50 to-violet-50 text-brand-dark/80">
            <tr>
              <th className="px-3 py-2 text-left w-40">时间</th>
              <th className="px-3 py-2 text-left w-32">类型</th>
              <th className="px-3 py-2 text-left w-32">发送者</th>
              <th className="px-3 py-2 text-left">内容（前 120 字）/ 文件名</th>
              <th className="px-3 py-2 text-left w-44">会话</th>
              <th className="px-3 py-2 text-right w-48">操作</th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-slate-500">
                  暂无匹配消息（社交功能上线后这里会有越来越多的消息～）
                </td>
              </tr>
            )}
            {list.map((m) => {
              const kindLabel =
                m.kind === "dm"
                  ? "私聊"
                  : m.kind === "group"
                  ? "群聊"
                  : "会话";
              const typeBadge = (() => {
                switch (m.type) {
                  case "text":
                    return <span className="rounded-md bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5">文字</span>;
                  case "image":
                    return <span className="rounded-md bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 flex items-center gap-1"><ImageIcon size={10} />图片</span>;
                  case "video":
                    return <span className="rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 flex items-center gap-1"><Film size={10} />视频</span>;
                  case "file":
                    return <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 flex items-center gap-1"><FileText size={10} />文件</span>;
                }
              })();
              const preview =
                m.type === "text"
                  ? m.content.length > 140
                    ? m.content.slice(0, 140) + "…"
                    : m.content
                  : `${(m as any).fileName || "未命名文件"} · ${formatBytes((m as any).fileSize)}`;
              return (
                <tr
                  key={m.id}
                  className={`border-t border-pink-50/80 hover:bg-pink-50/30 ${
                    m.deletedByAdmin ? "bg-rose-50/40" : ""
                  }`}
                >
                  <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(m.ts).toLocaleString("zh-CN")}
                  </td>
                  <td className="px-3 py-2">{typeBadge}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full text-white text-[10px] font-bold flex items-center justify-center shrink-0"
                        style={{ background: m.senderColor }}
                      >
                        {m.senderNickname.slice(0, 1).toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <div className="text-slate-800 font-medium truncate">{m.senderNickname}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[80px]">{m.senderId}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div
                      className={`break-all leading-relaxed ${
                        m.deletedByAdmin ? "italic text-rose-500" : "text-slate-700"
                      }`}
                    >
                      {m.deletedByAdmin ? "（该消息已被管理员删除）" : preview}
                      {m.edited && (
                        <span className="ml-2 text-[10px] text-violet-600 bg-violet-50 border border-violet-200 rounded px-1.5 py-0.5">
                          已编辑
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex flex-col gap-1">
                      <span className="rounded-md bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 inline-flex items-center gap-1 w-fit">
                        <MessageSquare size={10} />
                        {kindLabel}
                      </span>
                      <button
                        onClick={() => onGoChat(m.conversationId)}
                        className="text-[11px] text-brand-pink hover:underline truncate text-left w-fit"
                        title={m.conversationId}
                      >
                        进入会话 →
                      </button>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 justify-end flex-wrap">
                      {m.type === "text" && !m.deletedByAdmin && (
                        <button
                          onClick={() => setEditOf({ id: m.id, text: (m as any).content })}
                          className="text-[11px] rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-1 hover:bg-violet-100 inline-flex items-center gap-1"
                        >
                          <Edit3 size={10} /> 编辑
                        </button>
                      )}
                      {!m.deletedByAdmin && (
                        <button
                          onClick={() => {
                            if (!window.confirm("确认软删除这条消息？UI 将显示为管理员已删除。")) return;
                            const r = deleteMessage(m.id);
                            pushToast(
                              r.ok ? "success" : "error",
                              r.code === "ok" ? "已删除" : r.code === "no_perm" ? "权限不足" : "未找到消息"
                            );
                            setTick((t) => t + 1);
                          }}
                          className="text-[11px] rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 hover:bg-rose-100 inline-flex items-center gap-1"
                        >
                          <Trash2 size={10} /> 删除
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ========== 群聊管理（管理员：解散 / 转让 / 禁言 / 踢人） ========== */
function GroupsTab(props: { pushToast: (type: "success" | "error", msg: string) => void }) {
  const { pushToast } = props;
  const [tick, setTick] = useState(0);
  const [manageOf, setManageOf] = useState<string | null>(null);
  useEffect(() => {
    const off = subscribeSocial(() => setTick((t) => t + 1));
    return off;
  }, []);
  const groups = useMemo(() => adminListAllGroups(), [tick]);
  const friendEdges = adminListAllFriendEdges();

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-brand-dark">
          群聊管理（{groups.filter((g) => !g.disbanded).length} 个活跃 / {groups.length} 个总计）
        </h2>
        <p className="text-xs text-brand-gray mt-1">
          管理员可强制解散任何群、转让群主、修改成员角色、禁言成员。好友关系共 {friendEdges.length} 条记录（审计用）。
        </p>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-3xl border border-pink-100 bg-white p-10 text-center text-slate-500">
          <UsersGroup size={36} className="mx-auto mb-2 text-pink-300" />
          还没有任何群聊，用户可以在「社交中心→我的群聊」创建第一个群～
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map((g) => (
            <div
              key={g.groupId}
              className={`rounded-3xl p-[1px] shadow-md ${
                g.disbanded ? "bg-slate-200" : "bg-gradient-to-br from-violet-100/70 via-pink-100/60 to-rose-100/70"
              }`}
            >
              <div className="rounded-[calc(1.5rem-1px)] bg-white p-5 border border-white/60">
                <div className="flex items-start gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold shrink-0 shadow"
                    style={{ background: g.avatarColor }}
                  >
                    {g.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-800 truncate">{g.name}</h4>
                      {g.disbanded ? (
                        <span className="text-[10px] rounded-full bg-slate-200 text-slate-700 px-2 py-0.5 flex items-center gap-1">
                          <Ban size={10} /> 已解散
                        </span>
                      ) : (
                        <span className="text-[10px] rounded-full bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 px-2 py-0.5 flex items-center gap-1 border border-emerald-200">
                          <CheckCircle2 size={10} /> 活跃
                        </span>
                      )}
                    </div>
                    {g.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{g.description}</p>}
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                      <span className="rounded-md bg-slate-50 text-slate-700 border border-slate-200 px-2 py-0.5 inline-flex items-center gap-1">
                        <UsersGroup size={10} /> {g.members.length} 成员
                      </span>
                      <span
                        className="rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 font-mono inline-flex items-center gap-1 cursor-pointer hover:bg-violet-100"
                        onClick={() => {
                          try {
                            navigator.clipboard?.writeText(g.inviteCode);
                            pushToast("success", `邀请码「${g.inviteCode}」已复制`);
                          } catch {}
                        }}
                        title="点击复制邀请码"
                      >
                        <Copy size={10} /> 邀请码 {g.inviteCode}
                      </span>
                      <span className="text-slate-500">
                        群主：{lookupUserPublic(g.ownerId).nickname}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex gap-2 flex-wrap">
                  {!g.disbanded && (
                    <>
                      <button
                        onClick={() => setManageOf(g.groupId)}
                        className="text-xs rounded-xl bg-violet-50 text-violet-700 border border-violet-200 px-3 py-2 hover:bg-violet-100 inline-flex items-center gap-1"
                      >
                        <Shield size={12} /> 成员管理
                      </button>
                      <button
                        onClick={() => {
                          if (!window.confirm(`确认解散群「${g.name}」？解散后成员不可见，消息仍保留审计。`)) return;
                          if (disbandGroup(g.groupId)) {
                            pushToast("success", "群聊已解散");
                            setTick((t) => t + 1);
                          } else pushToast("error", "解散失败");
                        }}
                        className="text-xs rounded-xl bg-rose-50 text-rose-700 border border-rose-200 px-3 py-2 hover:bg-rose-100 inline-flex items-center gap-1"
                      >
                        <Ban size={12} /> 强制解散
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {manageOf && (
        <SimpleGroupManageModal
          groupId={manageOf}
          onClose={() => setManageOf(null)}
          pushToast={pushToast}
          onChange={() => setTick((t) => t + 1)}
        />
      )}
    </div>
  );
}

/** 管理员用简化版群成员管理模态 */
function SimpleGroupManageModal(props: {
  groupId: string;
  onClose: () => void;
  pushToast: (t: "success" | "error", m: string) => void;
  onChange: () => void;
}) {
  const { groupId, onClose, pushToast, onChange } = props;
  const [tick, setTick] = useState(0);
  const live = useMemo(() => {
    void tick;
    return getGroup(groupId);
  }, [groupId, tick]);

  if (!live) return null;
  const roleOrKick = (uid: string, action: "admin" | "member" | "kick") => {
    if (setGroupMemberRole(groupId, uid, action as any)) {
      pushToast("success", action === "kick" ? "已踢出成员" : `已设为${action === "admin" ? "管理员" : "普通成员"}`);
      onChange();
      setTick((t) => t + 1);
    } else pushToast("error", "权限不足或目标不可操作（群主不可直接降级/踢出）");
  };
  const transfer = (uid: string) => {
    if (!window.confirm("确认转让群主给该成员？转让后你将变为管理员。")) return;
    if (transferGroupOwner(groupId, uid)) {
      pushToast("success", "群主已转让");
      onChange();
      setTick((t) => t + 1);
    } else pushToast("error", "转让失败");
  };
  const mute = (uid: string, hours: number) => {
    if (muteGroupMember(groupId, uid, hours * 3600)) {
      pushToast("success", hours > 0 ? `已禁言 ${hours} 小时` : "已解除禁言");
      onChange();
      setTick((t) => t + 1);
    } else pushToast("error", "禁言操作失败");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div
        className="glass w-full max-w-2xl rounded-3xl border border-pink-100 shadow-2xl overflow-hidden animate-fade-in-up max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 py-3 text-white flex items-center gap-2">
          <Shield size={16} />
          <h3 className="font-semibold flex-1">管理员 · 群成员管理 · {live.name}</h3>
          <button onClick={onClose} className="rounded-lg hover:bg-white/15 w-8 h-8 flex items-center justify-center">
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2 text-left">成员</th>
                <th className="px-3 py-2 text-left">角色/状态</th>
                <th className="px-3 py-2 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {live.members.map((m) => {
                const info = lookupUserPublic(m.userId);
                const isOwner = m.role === "owner";
                return (
                  <tr key={m.userId} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-7 h-7 rounded-full text-white text-[11px] font-bold flex items-center justify-center"
                          style={{ background: info.color }}
                        >
                          {info.nickname.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{m.nickname}</div>
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">{m.userId}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {isOwner ? (
                          <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 inline-flex items-center gap-1">
                            <Crown size={10} /> 群主
                          </span>
                        ) : m.role === "admin" ? (
                          <span className="rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 inline-flex items-center gap-1">
                            <Shield size={10} /> 管理员
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 text-slate-600 px-2 py-0.5">普通成员</span>
                        )}
                        {m.mutedUntil && m.mutedUntil > Date.now() && (
                          <span className="rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 inline-flex items-center gap-1">
                            <Ban size={10} /> 禁言至 {new Date(m.mutedUntil).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 justify-end flex-wrap">
                        {!isOwner && (
                          <button
                            onClick={() => transfer(m.userId)}
                            className="text-[11px] rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 hover:bg-amber-100 inline-flex items-center gap-1"
                          >
                            <Crown size={10} /> 转让
                          </button>
                        )}
                        {m.role === "member" && !isOwner && (
                          <button
                            onClick={() => roleOrKick(m.userId, "admin")}
                            className="text-[11px] rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-1 hover:bg-violet-100 inline-flex items-center gap-1"
                          >
                            <Shield size={10} /> 设管理员
                          </button>
                        )}
                        {m.role === "admin" && !isOwner && (
                          <button
                            onClick={() => roleOrKick(m.userId, "member")}
                            className="text-[11px] rounded-md bg-slate-50 text-slate-700 border border-slate-200 px-2 py-1 hover:bg-slate-100"
                          >
                            取消管理员
                          </button>
                        )}
                        {!isOwner && (
                          !m.mutedUntil || m.mutedUntil <= Date.now() ? (
                            <button
                              onClick={() => mute(m.userId, 1)}
                              className="text-[11px] rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 hover:bg-rose-100 inline-flex items-center gap-1"
                            >
                              <Ban size={10} /> 禁言1h
                            </button>
                          ) : (
                            <button
                              onClick={() => mute(m.userId, 0)}
                              className="text-[11px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 hover:bg-emerald-100 inline-flex items-center gap-1"
                            >
                              解除禁言
                            </button>
                          )
                        )}
                        {!isOwner && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`确认踢出「${m.nickname}」？`)) return;
                              roleOrKick(m.userId, "kick");
                            }}
                            className="text-[11px] rounded-md bg-red-50 text-red-700 border border-red-200 px-2 py-1 hover:bg-red-100 inline-flex items-center gap-1"
                          >
                            <Trash2 size={10} /> 踢出
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ========== 点赞统计（所有功能的赞 + 喜欢，热度排序 & 管理员清零） ========== */
function LikesTab(props: { pushToast: (type: "success" | "error", msg: string) => void }) {
  const { pushToast } = props;
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const off = subscribeSocial(() => setTick((t) => t + 1));
    return off;
  }, []);
  const table = useMemo(() => {
    void tick;
    const map: Record<string, FeatureLikes> = {};
    for (const f of FEATURES) map[f.id] = getFeatureLikes(f.id);
    for (const l of listAllFeatureLikes()) {
      if (!map[l.featureId]) map[l.featureId] = l;
    }
    return Object.values(map)
      .map((like) => {
        const f = FEATURES.find((x) => x.id === like.featureId);
        return { like, meta: f };
      })
      .sort((a, b) => computeHotScore(b.like) - computeHotScore(a.like));
  }, [tick]);

  const totalUp = table.reduce((s, r) => s + r.like.thumbsUp, 0);
  const totalHeart = table.reduce((s, r) => s + r.like.hearts, 0);
  const totalHot = table.reduce((s, r) => s + computeHotScore(r.like), 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-brand-dark">
            点赞统计总榜（按热度排序）
          </h2>
          <p className="text-xs text-brand-gray mt-1">
            赞 👍 ×2 + 喜欢 ❤️ ×3 = 热度。功能列表会按热度自动把高人气功能排在前面并在首页推荐。
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-2xl bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 px-4 py-3">
            <div className="text-[11px] text-rose-700 flex items-center justify-center gap-1"><ThumbsUp size={12} /> 总赞数</div>
            <div className="text-xl font-bold text-rose-700 mt-1">{totalUp}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-pink-50 to-fuchsia-50 border border-pink-200 px-4 py-3">
            <div className="text-[11px] text-pink-700 flex items-center justify-center gap-1"><Heart size={12} /> 总喜欢</div>
            <div className="text-xl font-bold text-pink-700 mt-1">{totalHeart}</div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 px-4 py-3">
            <div className="text-[11px] text-amber-700 flex items-center justify-center gap-1"><Flame size={12} /> 总热度</div>
            <div className="text-xl font-bold text-amber-700 mt-1">{totalHot}</div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-pink-100 bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-gradient-to-r from-amber-50 to-pink-50 text-brand-dark/80">
            <tr>
              <th className="px-3 py-2 text-left w-14">排名</th>
              <th className="px-3 py-2 text-left">功能</th>
              <th className="px-3 py-2 text-center w-24">分类</th>
              <th className="px-3 py-2 text-center w-24">👍 赞</th>
              <th className="px-3 py-2 text-center w-24">❤️ 喜欢</th>
              <th className="px-3 py-2 text-center w-24">🔥 热度</th>
              <th className="px-3 py-2 text-right w-28">操作</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row, idx) => {
              const topBadge =
                idx === 0 ? (
                  <span className="rounded-md bg-gradient-to-r from-amber-400 to-orange-500 text-white px-2 py-0.5 inline-flex items-center gap-1 font-bold shadow-sm">
                    <Award size={11} /> Top 1
                  </span>
                ) : idx === 1 ? (
                  <span className="rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 inline-flex items-center gap-1 font-semibold">
                    <Sparkles size={11} /> Top 2
                  </span>
                ) : idx === 2 ? (
                  <span className="rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 inline-flex items-center gap-1 font-semibold">
                    <Sparkles size={11} /> Top 3
                  </span>
                ) : (
                  <span className="text-slate-400">#{idx + 1}</span>
                );
              const f = row.meta;
              const categoryLabel =
                f?.category === "game" ? "游戏" : f?.category === "tool" ? "工具" : f?.category === "ai" ? "AI" : "—";
              const catCls =
                f?.category === "game"
                  ? "bg-pink-100 text-pink-700 border-pink-200"
                  : f?.category === "tool"
                  ? "bg-sky-100 text-sky-700 border-sky-200"
                  : "bg-violet-100 text-violet-700 border-violet-200";
              const hot = computeHotScore(row.like);
              return (
                <tr key={row.like.featureId} className="border-t border-pink-50/80 hover:bg-pink-50/30">
                  <td className="px-3 py-2">{topBadge}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-8 h-8 rounded-lg bg-gradient-to-br ${
                          f?.colorScheme || "from-slate-400 to-slate-600"
                        } text-white text-[11px] font-bold flex items-center justify-center shrink-0`}
                      >
                        {(f?.name || "?").slice(0, 1)}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-800">
                          {f?.name || `功能 ${row.like.featureId}`}
                          {hot > 0 && idx === 0 && (
                            <span className="ml-1.5 text-[10px] text-orange-600 bg-orange-50 border border-orange-200 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                              <Flame size={10} /> 首页推荐
                            </span>
                          )}
                        </div>
                        {f && <div className="text-[10px] text-slate-400 line-clamp-1 max-w-[280px]">{f.summary}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <span className={`rounded-md border px-2 py-0.5 ${catCls}`}>{categoryLabel}</span>
                  </td>
                  <td className="px-3 py-2 text-center font-semibold text-rose-600">{row.like.thumbsUp}</td>
                  <td className="px-3 py-2 text-center font-semibold text-pink-600">{row.like.hearts}</td>
                  <td className="px-3 py-2 text-center font-bold text-amber-600">🔥 {hot}</td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      {(row.like.thumbsUp + row.like.hearts) > 0 && (
                        <button
                          onClick={() => {
                            if (!window.confirm(`确认清零「${f?.name || row.like.featureId}」的所有赞和喜欢？`)) return;
                            adminResetFeatureLikes(row.like.featureId);
                            pushToast("success", "已清零该功能的点赞统计");
                            setTick((t) => t + 1);
                          }}
                          className="text-[11px] rounded-md bg-slate-50 text-slate-600 border border-slate-200 px-2 py-1 hover:bg-slate-100 inline-flex items-center gap-1"
                        >
                          <RotateCcw size={10} /> 清零
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function formatBytes(bytes?: number): string {
  if (!bytes) return "0B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
