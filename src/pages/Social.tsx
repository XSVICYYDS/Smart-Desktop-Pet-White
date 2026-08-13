import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users as UsersIcon,
  UserPlus,
  MessageCircle,
  Plus,
  LogIn,
  LogOut,
  Search,
  Copy,
  Crown,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowRightLeft,
  Sparkles,
  UserCheck,
  UserX,
  Ban,
} from "lucide-react";
import SectionTitle from "@/components/SectionTitle";
import {
  sendFriendRequest,
  handleFriendRequest,
  removeFriend,
  listFriends,
  listIncomingRequests,
  listOutgoingRequests,
  createGroup,
  joinGroupByCode,
  listMyGroups,
  getGroup,
  subscribeSocial,
  conversationOfDM,
  conversationOfGroup,
  getCurrentActor,
  lookupUserPublic,
  transferGroupOwner,
  setGroupMemberRole,
  disbandGroup,
  muteGroupMember,
  type ChatGroup,
  type GroupRole,
} from "@/lib/socialStore";
import { isLoggedIn } from "@/lib/authClient";

type TabId = "friends" | "groups";

/**
 * 社交中心页面（/social）
 *  - Tab 1 好友：好友列表（进入私聊）、收到/发出申请、加好友
 *  - Tab 2 群聊：我加入的群、创建群、通过邀请码加入群、群管理（owner/admin）
 */
export default function Social() {
  const [tab, setTab] = useState<TabId>("friends");
  const [, setTick] = useState(0);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const navigate = useNavigate();

  // 订阅多标签同步
  useEffect(() => {
    const off = subscribeSocial(() => setTick((t) => t + 1));
    return off;
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(t);
  }, [toast]);

  const me = getCurrentActor();
  const loggedIn = isLoggedIn();

  // 计算用的快照（tab切换也触发重算）
  const _ = tab;
  void _;

  return (
    <div className="pt-24 pb-24 max-w-6xl mx-auto px-6 relative">
      {toast && (
        <div className="fixed top-24 right-6 z-50 animate-fade-in-up">
          <div
            className={`glass rounded-2xl shadow-xl border px-4 py-3 text-sm flex items-start gap-2 max-w-xs ${
              toast.type === "success"
                ? "bg-gradient-to-br from-green-50 to-emerald-50 text-green-800 border-green-200"
                : "bg-gradient-to-br from-red-50 to-rose-50 text-red-800 border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-green-600" />
            ) : (
              <XCircle size={16} className="mt-0.5 shrink-0 text-red-600" />
            )}
            <div className="whitespace-pre-wrap break-words leading-snug">{toast.msg}</div>
          </div>
        </div>
      )}

      {/* 顶部 Banner */}
      <div className="glass rounded-3xl shadow-xl shadow-pink-100/60 border border-pink-100 overflow-hidden mb-8">
        <div className="bg-gradient-to-br from-brand-pink via-fuchsia-400/80 to-violet-500 p-6 sm:p-8 text-white relative">
          <div className="absolute -right-10 -top-10 w-52 h-52 rounded-full bg-white/10 blur-2xl" />
          <div className="flex items-start gap-4 max-w-3xl relative">
            <div className="p-3 rounded-2xl bg-white/20 backdrop-blur border border-white/20">
              <UsersIcon size={28} />
            </div>
            <div className="flex-1">
              <div className="text-xs tracking-[0.2em] opacity-80">XIAOBAI · SOCIAL</div>
              <h1 className="mt-1 font-serif text-2xl sm:text-3xl font-bold">
                社交中心
              </h1>
              <p className="mt-2 text-sm opacity-90">
                你是{" "}
                <span className="font-semibold">
                  {me.nickname}
                  {loggedIn ? "（已登录）" : "（访客）"}
                </span>
                。
                在这里添加好友、组建聊群；消息支持文字 / 图片 / 视频 / 程序文件。
              </p>
            </div>
          </div>
        </div>
        <div className="px-4 sm:px-6 pt-2 border-b border-pink-100 bg-white/40">
          <div className="flex flex-wrap gap-2 sm:gap-4 -mb-px">
            {[
              { id: "friends", label: "我的好友", icon: UserCheck, desc: "私聊 / 加好友 / 处理申请" },
              { id: "groups", label: "我的群聊", icon: MessageCircle, desc: "群组 / 创建 / 邀请码加入" },
            ].map((t) => {
              const Icon = t.icon;
              const active = tab === (t.id as TabId);
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id as TabId)}
                  className={`group relative px-4 py-3 flex items-center gap-2 text-sm transition ${
                    active ? "text-brand-pink font-semibold" : "text-brand-gray hover:text-brand-dark"
                  }`}
                >
                  <Icon size={16} />
                  <span>{t.label}</span>
                  <span className="hidden sm:inline text-[11px] opacity-70">{t.desc}</span>
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-brand-pink rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {tab === "friends" && (
        <FriendsTab
          me={me.userId}
          onToast={(type, msg) => setToast({ type, msg })}
          onGoChat={(cid) => navigate(`/chat/${encodeURIComponent(cid)}`)}
        />
      )}
      {tab === "groups" && (
        <GroupsTab
          meId={me.userId}
          meNick={me.nickname}
          onToast={(type, msg) => setToast({ type, msg })}
          onGoChat={(cid) => navigate(`/chat/${encodeURIComponent(cid)}`)}
        />
      )}
    </div>
  );
}

/* ===================== 好友 Tab ===================== */
function FriendsTab(props: {
  me: string;
  onToast: (type: "success" | "error", msg: string) => void;
  onGoChat: (conversationId: string) => void;
}) {
  const { me, onToast, onGoChat } = props;
  const [addInput, setAddInput] = useState("");

  const friends = listFriends();
  const incoming = listIncomingRequests();
  const outgoing = listOutgoingRequests();

  const doAdd = () => {
    if (!addInput.trim()) {
      onToast("error", "请输入对方的昵称或用户ID");
      return;
    }
    const r = sendFriendRequest(addInput.trim());
    onToast(r.ok ? "success" : "error", r.msg);
    if (r.ok) setAddInput("");
  };

  return (
    <div className="space-y-8">
      {/* 添加好友 */}
      <section className="glass rounded-3xl p-5 sm:p-6 border border-pink-100">
        <h3 className="font-serif text-xl font-bold text-brand-dark flex items-center gap-2 mb-3">
          <UserPlus className="w-5 h-5 text-brand-pink" />
          添加好友
        </h3>
        <p className="text-sm text-brand-gray mb-4">
          输入对方的昵称或用户ID，发送好友申请（访客之间也可通过昵称互加）。
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && doAdd()}
            placeholder="例如：小明 或 u_xxx / xid_xxx"
            className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300"
          />
          <button
            onClick={doAdd}
            className="rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-pink-200/60 hover:shadow-lg hover:brightness-105 flex items-center justify-center gap-1.5"
          >
            <UserPlus className="w-4 h-4" /> 发送申请
          </button>
        </div>
      </section>

      {/* 收到的申请 */}
      {incoming.length > 0 && (
        <section className="glass rounded-3xl p-5 sm:p-6 border border-pink-100">
          <h3 className="font-serif text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
            <ArrowRightLeft className="w-5 h-5 text-amber-500" />
            收到的好友申请（{incoming.length}）
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {incoming.map(({ edge, fromNickname, fromColor }) => (
              <div
                key={edge.fromUserId}
                className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3"
              >
                <Avatar name={fromNickname} color={fromColor} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-slate-800 truncate">{fromNickname}</div>
                  <div className="text-[11px] text-slate-500">
                    {new Date(edge.createdAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleFriendRequest(edge.fromUserId, "accept");
                      onToast("success", `已接受 ${fromNickname} 的好友申请`);
                    }}
                    className="rounded-lg bg-emerald-500 text-white text-xs px-3 py-1.5 font-semibold hover:bg-emerald-600 flex items-center gap-1"
                  >
                    <CheckCircle2 size={12} /> 接受
                  </button>
                  <button
                    onClick={() => {
                      handleFriendRequest(edge.fromUserId, "reject");
                      onToast("success", "已拒绝该申请");
                    }}
                    className="rounded-lg bg-slate-100 text-slate-600 text-xs px-3 py-1.5 hover:bg-slate-200 flex items-center gap-1"
                  >
                    <XCircle size={12} /> 拒绝
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 发出的申请 */}
      {outgoing.length > 0 && (
        <section className="glass rounded-3xl p-5 sm:p-6 border border-pink-100">
          <h3 className="font-serif text-xl font-bold text-brand-dark flex items-center gap-2 mb-4">
            <LogIn className="w-5 h-5 text-sky-500" />
            等待对方通过（{outgoing.length}）
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {outgoing.map((e) => {
              const info = lookupUserPublic(e.toUserId);
              return (
                <div
                  key={e.toUserId}
                  className="rounded-2xl bg-white border border-slate-200 p-4 flex items-center gap-3 opacity-80"
                >
                  <Avatar name={info.nickname} color={info.color} />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{info.nickname}</div>
                    <div className="text-[11px] text-slate-500">
                      {new Date(e.createdAt).toLocaleString()}
                    </div>
                  </div>
                  <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                    待通过
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* 好友列表 */}
      <section>
        <SectionTitle
          title={`好友列表（${friends.length}）`}
          subtitle="点击任意好友进入一对一私聊，支持文字 / 图片 / 视频 / 任意文件"
        />
        {friends.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-brand-gray border border-pink-100">
            <UserCheck size={40} className="mx-auto mb-3 text-pink-300" />
            <div className="font-semibold text-slate-700 mb-1">还没有好友</div>
            <div className="text-sm">在上方「添加好友」输入昵称，发送第一个好友申请吧～</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {friends.map((f) => (
              <div
                key={f.userId}
                className="group rounded-3xl p-[1px] bg-gradient-to-br from-white/80 via-pink-100/60 to-violet-100/60 shadow-xl/50 hover:shadow-2xl/70 hover:-translate-y-1 transition-all"
              >
                <div className="rounded-[calc(1.5rem-1px)] bg-white/90 backdrop-blur-xl p-5 border border-white/60 flex items-center gap-4">
                  <Avatar name={f.nickname} color={f.color} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-800 truncate">{f.nickname}</div>
                    <div className="text-[11px] text-slate-500">
                      自 {new Date(f.since).toLocaleDateString()} 成为好友
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => onGoChat(conversationOfDM(me, f.userId))}
                      className="rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white px-3 py-2 text-xs font-semibold hover:brightness-105 flex items-center gap-1 shadow-sm"
                    >
                      <MessageCircle size={14} /> 私聊
                    </button>
                    <button
                      onClick={() => {
                        if (!window.confirm(`确认删除好友「${f.nickname}」？`)) return;
                        if (removeFriend(f.userId)) onToast("success", "已删除好友");
                      }}
                      title="删除好友"
                      className="rounded-xl bg-rose-50 text-rose-600 border border-rose-100 w-9 h-9 flex items-center justify-center hover:bg-rose-100"
                    >
                      <UserX size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/* ===================== 群聊 Tab ===================== */
function GroupsTab(props: {
  meId: string;
  meNick: string;
  onToast: (type: "success" | "error", msg: string) => void;
  onGoChat: (conversationId: string) => void;
}) {
  const { meId, meNick, onToast, onGoChat } = props;
  const [joinCode, setJoinCode] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", description: "", publicJoin: true });
  const [manageOf, setManageOf] = useState<string | null>(null);

  const myGroups = listMyGroups();

  const doJoin = () => {
    const c = joinCode.trim();
    if (!c) {
      onToast("error", "请输入邀请码");
      return;
    }
    const r = joinGroupByCode(c);
    onToast(r.ok ? "success" : "error", r.msg);
    if (r.ok) setJoinCode("");
  };

  const doCreate = () => {
    const r = createGroup(createForm);
    onToast(r.ok ? "success" : "error", r.msg);
    if (r.ok) {
      setCreateOpen(false);
      setCreateForm({ name: "", description: "", publicJoin: true });
    }
  };

  const group = manageOf ? getGroup(manageOf) : undefined;

  return (
    <div className="space-y-8">
      {/* 加入 / 创建操作栏 */}
      <section className="glass rounded-3xl p-5 sm:p-6 border border-pink-100 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2 mb-2">
            <LogIn className="w-5 h-5 text-emerald-500" />
            通过邀请码加入群聊
          </h3>
          <p className="text-sm text-brand-gray mb-3">找群主或管理员索取 6 位邀请码，粘贴后即可加入。</p>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && doJoin()}
              placeholder="6 位邀请码（例如：XBAI23）"
              className="flex-1 rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-300 tracking-wider font-mono"
            />
            <button
              onClick={doJoin}
              className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-emerald-200/60 hover:shadow-lg hover:brightness-105 flex items-center justify-center gap-1.5"
            >
              <Search className="w-4 h-4" /> 加入
            </button>
          </div>
        </div>
        <div>
          <h3 className="font-serif text-lg font-bold text-brand-dark flex items-center gap-2 mb-2">
            <Plus className="w-5 h-5 text-violet-500" />
            创建新的群聊
          </h3>
          <p className="text-sm text-brand-gray mb-3">群主可解散群、转让群主、设置管理员、禁言成员、踢出成员。</p>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-sm font-semibold px-5 py-2.5 shadow-md shadow-violet-200/60 hover:shadow-lg hover:brightness-105 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> 创建群聊
          </button>
        </div>
      </section>

      {/* 创建群聊弹窗 */}
      {createOpen && (
        <Modal onClose={() => setCreateOpen(false)} title="创建新群聊">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">群名称 <span className="text-rose-500">*</span></label>
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value.slice(0, 30) })}
                placeholder="例如：809班班级群 / 游戏开黑群"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-brand-dark block mb-1">群简介</label>
              <textarea
                value={createForm.description}
                onChange={(e) => setCreateForm({ ...createForm, description: e.target.value.slice(0, 200) })}
                rows={2}
                placeholder="一句话说清楚这是干啥的群（最长 200 字）"
                className="w-full rounded-xl bg-white border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-violet-300"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={createForm.publicJoin}
                onChange={(e) => setCreateForm({ ...createForm, publicJoin: e.target.checked })}
              />
              任何拿到邀请码的人都可加入（不勾选时只允许已登录用户被邀请加入）
            </label>
            <div className="flex gap-2 justify-end pt-2">
              <button
                onClick={() => setCreateOpen(false)}
                className="rounded-xl bg-slate-100 text-slate-700 px-4 py-2 text-sm hover:bg-slate-200"
              >
                取消
              </button>
              <button
                onClick={doCreate}
                className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-2 text-sm font-semibold hover:brightness-105 shadow"
              >
                创建并获得邀请码
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 我的群聊 */}
      <section>
        <SectionTitle
          title={`我加入的群聊（${myGroups.length}）`}
          subtitle="点击群卡片进入群聊，群主 / 管理员 / 平台管理员可管理群"
        />
        {myGroups.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center text-brand-gray border border-pink-100">
            <Sparkles size={40} className="mx-auto mb-3 text-pink-300" />
            <div className="font-semibold text-slate-700 mb-1">你还没有加入任何群</div>
            <div className="text-sm">用上方「创建群聊」做群主，或粘贴邀请码加入朋友的群～</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myGroups.map((g) => (
              <GroupCard
                key={g.groupId}
                g={g}
                meId={meId}
                meNick={meNick}
                onGoChat={() => onGoChat(conversationOfGroup(g.groupId))}
                onManage={() => setManageOf(g.groupId)}
                onToast={onToast}
              />
            ))}
          </div>
        )}
      </section>

      {/* 群管理弹窗 */}
      {group && (
        <GroupManageModal
          g={group}
          meId={meId}
          onClose={() => setManageOf(null)}
          onToast={onToast}
        />
      )}
    </div>
  );
}

/* ===================== 小工具组件 ===================== */
function Avatar(props: { name: string; color: string; size?: "sm" | "md" | "lg" }) {
  const { name, color, size = "md" } = props;
  const sz = size === "sm" ? "w-9 h-9 text-sm" : size === "lg" ? "w-14 h-14 text-xl" : "w-11 h-11 text-base";
  return (
    <div
      className={`shrink-0 ${sz} rounded-full text-white font-bold flex items-center justify-center shadow-md`}
      style={{ backgroundColor: color }}
      title={name}
    >
      {name.slice(0, 1).toUpperCase()}
    </div>
  );
}

function Modal(props: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={props.onClose}>
      <div
        className="glass w-full max-w-xl rounded-3xl border border-pink-100 shadow-2xl overflow-hidden animate-fade-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-r from-brand-pink to-fuchsia-500 px-5 py-3 text-white flex items-center gap-2">
          <Sparkles size={16} />
          <h3 className="font-semibold flex-1">{props.title}</h3>
          <button onClick={props.onClose} className="rounded-lg hover:bg-white/15 w-8 h-8 flex items-center justify-center">✕</button>
        </div>
        <div className="p-5 max-h-[70vh] overflow-y-auto">{props.children}</div>
      </div>
    </div>
  );
}

/* ===================== 群聊卡片 ===================== */
function GroupCard(props: {
  g: ChatGroup;
  meId: string;
  meNick: string;
  onGoChat: () => void;
  onManage: () => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const { g, meId, onGoChat, onManage } = props;
  const me = g.members.find((m) => m.userId === meId);
  const isOwner = me?.role === "owner";
  const isAdminOrOwner = me?.role === "owner" || me?.role === "admin";
  const canManage = isAdminOrOwner; // 平台管理员在管理弹窗里也能进，但卡片只给 owner/admin 入口（够用）
  const copied = () => {
    try {
      navigator.clipboard?.writeText(g.inviteCode);
    } catch { /* 剪贴板权限被拒或不可用：静默忽略 */ }
  };

  return (
    <div className="group rounded-3xl p-[1px] bg-gradient-to-br from-white/80 via-violet-100/60 to-pink-100/60 shadow-xl/50 hover:shadow-2xl/70 hover:-translate-y-1 transition-all">
      <div className="rounded-[calc(1.5rem-1px)] bg-white/90 backdrop-blur-xl overflow-hidden border border-white/60">
        {/* 顶色带 */}
        <div className="h-2 w-full" style={{ background: `linear-gradient(90deg, ${g.avatarColor}, #ffffff33)` }} />
        <div className="p-5">
          <div className="flex items-start gap-3">
            <Avatar name={g.name} color={g.avatarColor} size="lg" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-slate-800 truncate">{g.name}</h4>
                {isOwner && (
                  <span className="text-[10px] rounded-full bg-gradient-to-r from-amber-400 to-orange-400 text-white px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
                    <Crown size={10} /> 群主
                  </span>
                )}
                {!isOwner && isAdminOrOwner && (
                  <span className="text-[10px] rounded-full bg-gradient-to-r from-violet-400 to-indigo-500 text-white px-2 py-0.5 flex items-center gap-0.5 shadow-sm">
                    <Shield size={10} /> 管理员
                  </span>
                )}
              </div>
              {g.description ? (
                <div className="text-xs text-slate-500 mt-1 line-clamp-2">{g.description}</div>
              ) : null}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[11px] text-slate-500">
                  <UsersIcon size={11} className="inline align-middle mr-1" />
                  {g.members.length} 人
                </span>
                <button
                  onClick={() => {
                    copied();
                    props.onToast("success", `邀请码「${g.inviteCode}」已复制`);
                  }}
                  className="text-[11px] rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 hover:bg-violet-100 flex items-center gap-1"
                >
                  邀请码 <code className="font-mono">{g.inviteCode}</code>
                  <Copy size={11} />
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={onGoChat}
              className="flex-1 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white px-3 py-2 text-sm font-semibold shadow hover:brightness-105 flex items-center justify-center gap-1.5"
            >
              <MessageCircle size={14} /> 进入群聊
            </button>
            {canManage && (
              <button
                onClick={onManage}
                className="rounded-xl bg-slate-50 text-slate-700 border border-slate-200 px-3 py-2 text-sm hover:bg-slate-100 flex items-center gap-1.5"
              >
                <Shield size={14} /> 管理
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===================== 群管理弹窗 ===================== */
function GroupManageModal(props: {
  g: ChatGroup;
  meId: string;
  onClose: () => void;
  onToast: (type: "success" | "error", msg: string) => void;
}) {
  const { g, meId, onClose, onToast } = props;
  // 重新从存储拉一次（保持最新）
  const [, setTick] = useState(0);
  const live = useMemo(() => getGroup(g.groupId) || g, [g.groupId]);
  const me = live.members.find((m) => m.userId === meId);
  const isOwner = me?.role === "owner";
  const isSuper = true; // 渲染时在具体按钮上做 isCurrentAdmin 判断；这里保守 true，真正权限在 socialStore 里校验
  void isSuper;

  const handleRole = (userId: string, role: GroupRole | "kick") => {
    if (setGroupMemberRole(live.groupId, userId, role)) {
      onToast("success", role === "kick" ? "已踢出该成员" : `已更新为「${role}」`);
      setTick((t) => t + 1);
    } else {
      onToast("error", "权限不足或目标不可操作（群主不可被直接降级）");
    }
  };
  const handleTransfer = (userId: string) => {
    if (!window.confirm("确认转让群主给该成员？转让后你将变为管理员。")) return;
    if (transferGroupOwner(live.groupId, userId)) {
      onToast("success", "群主已转让");
      setTick((t) => t + 1);
    } else onToast("error", "转让失败");
  };
  const handleMute = (userId: string, hours: number) => {
    if (muteGroupMember(live.groupId, userId, hours * 3600)) {
      onToast("success", hours > 0 ? `已禁言 ${hours} 小时` : "已解除禁言");
      setTick((t) => t + 1);
    } else onToast("error", "禁言操作失败");
  };
  const handleDisband = () => {
    if (!window.confirm(`确认解散群「${live.name}」？此操作不可恢复，消息仅保留用于管理员审计。`)) return;
    if (disbandGroup(live.groupId)) {
      onToast("success", "群聊已解散");
      onClose();
    } else onToast("error", "仅群主 / 平台管理员可解散");
  };

  return (
    <Modal onClose={onClose} title={`管理群聊 · ${live.name}`}>
      <div className="space-y-4 text-sm">
        {/* 基本信息 */}
        <div className="rounded-2xl bg-gradient-to-br from-violet-50 to-pink-50 border border-violet-100 p-4">
          <div className="flex items-center gap-3">
            <Avatar name={live.name} color={live.avatarColor} size="md" />
            <div className="flex-1">
              <div className="font-semibold">{live.name}</div>
              <div className="text-xs text-slate-600">
                创建于 {new Date(live.createdAt).toLocaleDateString()} · {live.members.length} 位成员
              </div>
            </div>
            <div className="text-right text-xs">
              <div className="text-slate-600">邀请码</div>
              <div
                onClick={() => {
                  try { navigator.clipboard?.writeText(live.inviteCode); onToast("success", "邀请码已复制"); }
                  catch { /* 剪贴板复制失败：静默 */ }
                }}
                className="font-mono font-bold tracking-wider text-violet-700 bg-white border border-violet-200 rounded-lg px-2 py-1 cursor-pointer hover:bg-violet-100"
              >
                {live.inviteCode}
              </div>
            </div>
          </div>
        </div>

        {/* 成员列表 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-slate-800 flex items-center gap-1.5">
              <UsersIcon size={14} /> 成员（{live.members.length}）
            </h4>
          </div>
          <div className="rounded-2xl border border-slate-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="text-left px-3 py-2">成员</th>
                  <th className="text-left px-3 py-2">角色 / 状态</th>
                  <th className="text-right px-3 py-2">操作</th>
                </tr>
              </thead>
              <tbody>
                {live.members.map((m) => {
                  const info = lookupUserPublic(m.userId);
                  const isOwnerRow = m.role === "owner";
                  const canKick = !isOwnerRow; // 群主只能通过转让变更
                  return (
                    <tr key={m.userId} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Avatar name={info.nickname} color={info.color} size="sm" />
                          <div>
                            <div className="font-medium text-slate-800">{m.nickname}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{m.userId}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex flex-wrap items-center gap-1">
                          {m.role === "owner" ? (
                            <span className="rounded-full bg-amber-100 text-amber-700 px-2 py-0.5 flex items-center gap-1">
                              <Crown size={10} /> 群主
                            </span>
                          ) : m.role === "admin" ? (
                            <span className="rounded-full bg-violet-100 text-violet-700 px-2 py-0.5 flex items-center gap-1">
                              <Shield size={10} /> 管理员
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">普通成员</span>
                          )}
                          {m.mutedUntil && m.mutedUntil > Date.now() && (
                            <span className="rounded-full bg-rose-100 text-rose-700 px-2 py-0.5 flex items-center gap-1">
                              <Ban size={10} /> 禁言至 {new Date(m.mutedUntil).toLocaleString()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {/* 转让群主（仅 owner 可见，不展示对自己的操作） */}
                        {isOwner && m.userId !== meId && (
                          <button
                            onClick={() => handleTransfer(m.userId)}
                            className="mr-1 text-[11px] rounded-md bg-amber-50 text-amber-700 border border-amber-200 px-2 py-1 hover:bg-amber-100 inline-flex items-center gap-1"
                          >
                            <Crown size={10} /> 转让
                          </button>
                        )}
                        {/* 改角色：管理员 <-> 成员 */}
                        {m.role === "member" && !isOwnerRow && (
                          <button
                            onClick={() => handleRole(m.userId, "admin")}
                            className="mr-1 text-[11px] rounded-md bg-violet-50 text-violet-700 border border-violet-200 px-2 py-1 hover:bg-violet-100 inline-flex items-center gap-1"
                          >
                            <Shield size={10} /> 设管理员
                          </button>
                        )}
                        {m.role === "admin" && !isOwnerRow && (
                          <button
                            onClick={() => handleRole(m.userId, "member")}
                            className="mr-1 text-[11px] rounded-md bg-slate-100 text-slate-700 border border-slate-200 px-2 py-1 hover:bg-slate-200 inline-flex items-center gap-1"
                          >
                            取消管理员
                          </button>
                        )}
                        {/* 禁言 */}
                        {!isOwnerRow && (
                          <>
                            {(!m.mutedUntil || m.mutedUntil <= Date.now()) ? (
                              <button
                                onClick={() => handleMute(m.userId, 1)}
                                className="mr-1 text-[11px] rounded-md bg-rose-50 text-rose-700 border border-rose-200 px-2 py-1 hover:bg-rose-100 inline-flex items-center gap-1"
                              >
                                <Ban size={10} /> 禁言1h
                              </button>
                            ) : (
                              <button
                                onClick={() => handleMute(m.userId, 0)}
                                className="mr-1 text-[11px] rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-1 hover:bg-emerald-100 inline-flex items-center gap-1"
                              >
                                解除禁言
                              </button>
                            )}
                          </>
                        )}
                        {/* 踢出 */}
                        {canKick && (
                          <button
                            onClick={() => {
                              if (!window.confirm(`确认踢出「${m.nickname}」？`)) return;
                              handleRole(m.userId, "kick");
                            }}
                            className="text-[11px] rounded-md bg-red-50 text-red-700 border border-red-200 px-2 py-1 hover:bg-red-100 inline-flex items-center gap-1"
                          >
                            <UserX size={10} /> 踢出
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 解散群 */}
        <div className="pt-2 flex justify-between items-center">
          <div className="text-xs text-slate-500">
            解散群聊仅群主 / 平台管理员可执行；解散后成员不再看到该群，但聊天记录仍保留用于审计。
          </div>
          <button
            onClick={handleDisband}
            className="rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-xs font-semibold px-4 py-2 shadow hover:brightness-105 flex items-center gap-1.5"
          >
            <LogOut size={12} /> 解散群聊
          </button>
        </div>
      </div>
    </Modal>
  );
}
