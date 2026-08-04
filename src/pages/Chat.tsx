import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Paperclip,
  X as XIcon,
  Download,
  FileText,
  Film,
  Image as ImageIcon,
  MessageCircle,
  Users as UsersIcon,
  Crown,
  Shield,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Edit3,
  Trash2,
  Home,
} from "lucide-react";
import {
  listMessages,
  sendMessage,
  deleteMessage,
  adminEditTextMessage,
  recallSelfMessage,
  subscribeSocial,
  getGroup,
  lookupUserPublic,
  conversationOfGroup,
  getCurrentActor,
  type ChatMessage,
  type ConversationKind,
} from "@/lib/socialStore";
import { isCurrentAdmin, isLoggedIn } from "@/lib/authClient";

/**
 * 会话消息页（/chat/:conversationId）
 *  - conversationId 格式：dm:u1|u2（私聊）或 group:groupId（群聊）
 *  - 支持文本 / 图片 / 视频 / 任意文件
 *  - 管理员：编辑任意文字消息、删除任意消息；
 *  - 本人：10 分钟内可撤回自己的消息
 */
export default function Chat() {
  const { conversationId = "" } = useParams();
  const cid = decodeURIComponent(conversationId);
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>(() => listMessages(cid));
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const me = getCurrentActor();
  const admin = isCurrentAdmin();

  // 解析会话信息
  const parsed = useMemo(() => parseConversationId(cid), [cid]);

  // 群信息（仅群聊）
  const group = useMemo(() => {
    if (parsed.kind !== "group") return null;
    return getGroup(parsed.groupId || "");
  }, [parsed.kind, parsed.groupId]);

  // 会话标题
  const titleInfo = useMemo(() => {
    if (parsed.kind === "group") {
      if (group) return { title: group.name, subtitle: `${group.members.length} 人`, color: group.avatarColor };
      return { title: "群聊", subtitle: "（群不存在或已解散）", color: "#94a3b8" };
    }
    // dm：找到对方 id，显示对方信息
    const other = parsed.dmOtherId || "";
    if (!other) return { title: "私聊", subtitle: "", color: "#f472b6" };
    const info = lookupUserPublic(other);
    return { title: info.nickname, subtitle: "一对一私聊", color: info.color };
  }, [parsed, group]);

  // 订阅多标签同步 & 拉取消息
  useEffect(() => {
    setMessages(listMessages(cid));
  }, [cid]);
  useEffect(() => {
    const off = subscribeSocial(() => setMessages(listMessages(cid)));
    return off;
  }, [cid]);

  // 自动滚到底
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // 消息数限制：会话页顶部提示
  const capNote = messages.length >= 499 ? (
    <div className="text-[11px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mx-4">
      ⚠ 本地会话消息最多保留 500 条，超出将自动丢弃最旧的。
    </div>
  ) : null;

  /**
   * 发送消息：文字 + 所有附件（每个附件独立一条消息）
   */
  const handleSend = async () => {
    if (sending) return;
    setError(null);
    const hasText = text.trim().length > 0;
    const hasFiles = attachments.length > 0;
    if (!hasText && !hasFiles) {
      setError("请输入文字或选择文件 / 图片 / 视频");
      return;
    }
    setSending(true);
    try {
      if (hasText) {
        const r = sendMessage({
          conversationId: cid,
          kind: parsed.kind as ConversationKind,
          groupId: parsed.groupId,
          payload: { type: "text", text },
        });
        if (!r.ok) {
          setError(r.msg || "发送失败");
          setSending(false);
          return;
        }
        setText("");
      }
      for (const f of attachments) {
        const dataUrl = await readAsDataURL(f);
        const kind: "image" | "video" | "file" = f.type.startsWith("image/")
          ? "image"
          : f.type.startsWith("video/")
          ? "video"
          : "file";
        const r = sendMessage({
          conversationId: cid,
          kind: parsed.kind as ConversationKind,
          groupId: parsed.groupId,
          payload: {
            type: kind,
            fileSize: f.size,
            fileName: f.name,
            mimeType: f.type || "application/octet-stream",
            dataUrl,
          },
        });
        if (!r.ok) {
          setError((e) => (e ? e + "\n" : "") + `${f.name}: ${r.msg || "失败"}`);
        }
      }
      setAttachments([]);
      if (fileRef.current) fileRef.current.value = "";
    } catch (e: any) {
      setError(e?.message || "发送失败");
    } finally {
      setSending(false);
      setMessages(listMessages(cid));
    }
  };

  /**
   * 管理员保存编辑后的文字消息
   */
  const saveEdit = () => {
    if (!editing) return;
    if (!admin) {
      setToast({ type: "error", msg: "仅管理员可编辑消息" });
      setEditing(null);
      return;
    }
    if (adminEditTextMessage(editing.id, editing.text)) {
      setToast({ type: "success", msg: "已更新消息内容" });
      setEditing(null);
      setMessages(listMessages(cid));
    } else {
      setToast({ type: "error", msg: "编辑失败（非文字消息或权限不足）" });
    }
  };

  /**
   * 管理员删除消息
   */
  const handleAdminDelete = (m: ChatMessage) => {
    if (!window.confirm("管理员确认删除这条消息？（软删除：UI 展示为『已被管理员删除』，审计仍保留）")) return;
    const r = deleteMessage(m.id);
    setToast({ type: r.ok ? "success" : "error", msg: r.code === "ok" ? "已删除" : r.code === "no_perm" ? "权限不足" : "未找到消息" });
    setMessages(listMessages(cid));
  };

  /**
   * 本人撤回（限 10 分钟）
   */
  const handleRecall = (m: ChatMessage) => {
    if (m.senderId !== me.userId) return;
    if (!window.confirm("确认撤回这条消息？（发送 10 分钟内可撤回）")) return;
    if (recallSelfMessage(m.id)) setToast({ type: "success", msg: "已撤回" });
    else setToast({ type: "error", msg: "撤回失败：超过 10 分钟或非本人消息" });
    setMessages(listMessages(cid));
  };

  return (
    <div className="pt-20 min-h-screen bg-gradient-to-br from-rose-50 via-pink-50 to-violet-50">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 right-6 z-[60] animate-fade-in-up">
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

      {/* 顶部栏 */}
      <div className="sticky top-20 z-20 backdrop-blur-xl bg-white/80 border-b border-pink-100/70 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3 flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate("/social")}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-slate-100 to-pink-50 px-3.5 py-2 text-sm font-semibold text-slate-700 border border-pink-100 hover:shadow-md transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            返回社交中心
          </button>
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50"
          >
            <Home className="w-4 h-4" /> 首页
          </button>
          <div className="flex-1 min-w-[160px] flex items-center gap-3 justify-end md:justify-center flex-wrap">
            <span
              className="shrink-0 w-9 h-9 rounded-full text-white font-bold flex items-center justify-center shadow-md"
              style={{ backgroundColor: titleInfo.color }}
            >
              {titleInfo.title.slice(0, 1).toUpperCase()}
            </span>
            <div className="text-right md:text-center">
              <h1 className="text-lg md:text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                {titleInfo.title}
                {parsed.kind === "group" && group?.ownerId && (
                  <span className="text-[10px] rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 flex items-center gap-0.5">
                    <Crown size={10} /> {lookupUserPublic(group.ownerId).nickname}
                  </span>
                )}
              </h1>
              <div className="text-[11px] text-slate-500 flex items-center gap-2 md:justify-center">
                {parsed.kind === "group" ? (
                  <>
                    <UsersIcon size={11} />
                    {titleInfo.subtitle}
                    {group?.inviteCode && (
                      <>
                        · 邀请码 <code className="font-mono text-violet-700">{group.inviteCode}</code>
                      </>
                    )}
                  </>
                ) : (
                  <>{titleInfo.subtitle}</>
                )}
                {admin && (
                  <span className="inline-flex items-center gap-0.5 ml-1 rounded-full bg-gradient-to-r from-pink-100 to-rose-100 text-pink-700 border border-pink-200 px-2 py-0.5">
                    <ShieldCheck size={10} /> 管理员模式
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
        {capNote && <div className="pb-2">{capNote}</div>}
      </div>

      <div className="max-w-5xl mx-auto pt-4 pb-24">
        <div className="glass rounded-3xl overflow-hidden border border-pink-100 shadow-xl shadow-pink-100/40">
          {/* 消息区 */}
          <div className="h-[calc(100vh-360px)] min-h-[480px] overflow-y-auto bg-gradient-to-b from-white via-pink-50/40 to-white px-4 md:px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <MessageCircle className="w-12 h-12 mb-3 text-pink-300" />
                <div className="font-semibold text-slate-500">还没有消息</div>
                <div className="text-sm mt-1 max-w-sm">
                  发送第一条消息打个招呼吧～支持文字 / 图片 / 视频 / 任意程序文件。
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const isMine = m.senderId === me.userId;
                const date = new Date(m.ts);
                const senderInfo =
                  m.senderId === me.userId
                    ? { nickname: me.nickname, color: me.color }
                    : lookupUserPublic(m.senderId);
                const canRecall = isMine && !m.deletedByAdmin && m.type === "text" && Date.now() - m.ts < 10 * 60 * 1000;
                const canEdit = admin && !m.deletedByAdmin && m.type === "text";
                const canAdminDel = admin && !m.deletedByAdmin;
                // 群主/群管理也能管理消息
                let groupManagerCanManage = false;
                if (parsed.kind === "group" && group) {
                  const gm = group.members.find((x) => x.userId === me.userId);
                  if (gm && (gm.role === "owner" || gm.role === "admin")) {
                    groupManagerCanManage = !m.deletedByAdmin;
                  }
                }

                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 group ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full text-white font-bold flex items-center justify-center shadow-md"
                      style={{ backgroundColor: senderInfo.color }}
                      title={senderInfo.nickname}
                    >
                      {senderInfo.nickname.slice(0, 1).toUpperCase()}
                    </div>
                    <div
                      className={`flex-1 max-w-[82%] ${
                        isMine ? "items-end text-right" : "items-start text-left"
                      } flex flex-col`}
                    >
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">
                          {senderInfo.nickname}
                        </span>
                        <span>
                          {date.toLocaleDateString()} {date.toLocaleTimeString().slice(0, 5)}
                        </span>
                        {m.type !== "text" && (m as any).fileSize ? <span>· {formatSize((m as any).fileSize)}</span> : null}
                        {m.edited && (
                          <span className="text-violet-600 bg-violet-50 border border-violet-200 rounded-full px-2 py-0.5">
                            已编辑
                          </span>
                        )}
                        {canEdit && (
                          <button
                            onClick={() =>
                              m.type === "text" && setEditing({ id: m.id, text: (m as any).content })
                            }
                            className="text-violet-600 hover:text-violet-800"
                            title="管理员：编辑这条文字消息"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {(canAdminDel || groupManagerCanManage) && (
                          <button
                            onClick={() => handleAdminDelete(m)}
                            className="text-rose-500 hover:text-rose-700"
                            title="删除（软删除，保留审计）"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canRecall && (
                          <button
                            onClick={() => handleRecall(m)}
                            className="text-slate-500 hover:text-slate-700"
                            title="撤回这条消息（10 分钟内）"
                          >
                            <XIcon className="w-3.5 h-3.5" /> 撤回
                          </button>
                        )}
                      </div>

                      {/* 已被管理员删除 / 已撤回占位 */}
                      {m.deletedByAdmin ? (
                        <div
                          className={`inline-block rounded-2xl px-4 py-2 text-[12px] italic border ${
                            isMine
                              ? "bg-rose-50 text-rose-600 border-rose-200 rounded-tr-sm"
                              : "bg-slate-50 text-slate-500 border-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {m.deletedBy === me.userId ? "你已撤回该消息" : "该消息已被管理员删除"}
                        </div>
                      ) : (
                        <div
                          className={`inline-block max-w-full rounded-2xl px-4 py-3 text-left text-[14px] leading-7 shadow-sm border ${
                            isMine
                              ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white border-pink-300 rounded-tr-sm"
                              : "bg-white text-slate-800 border-slate-200 rounded-tl-sm"
                          }`}
                        >
                          {renderMessageBody(m, isMine)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* 编辑区（管理员模态化行内编辑） */}
          {editing && (
            <div className="border-t border-pink-100 bg-violet-50/60 p-3 md:p-4">
              <div className="text-xs text-violet-700 mb-2 flex items-center gap-1.5 font-semibold">
                <Shield size={12} /> 管理员编辑消息内容：
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={editing.text}
                  onChange={(e) => setEditing({ ...editing, text: e.target.value })}
                  rows={2}
                  className="flex-1 rounded-xl bg-white border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setEditing(null)}
                    className="rounded-xl bg-slate-100 text-slate-600 px-4 py-2 text-sm hover:bg-slate-200"
                  >
                    取消
                  </button>
                  <button
                    onClick={saveEdit}
                    className="rounded-xl bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white px-4 py-2 text-sm font-semibold shadow hover:brightness-105 flex items-center gap-1.5"
                  >
                    <ShieldCheck size={14} /> 保存修改
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 附件预览条 */}
          {attachments.length > 0 && (
            <div className="border-t border-pink-100 bg-white/70 px-4 md:px-5 py-3 flex flex-wrap gap-2">
              {attachments.map((f, i) => (
                <div
                  key={`${f.name}-${i}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700"
                >
                  {f.type.startsWith("image/") ? (
                    <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
                  ) : f.type.startsWith("video/") ? (
                    <Film className="w-3.5 h-3.5 text-violet-500" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 text-sky-500" />
                  )}
                  <span className="max-w-[200px] truncate" title={f.name}>
                    {f.name}
                  </span>
                  <span className="text-slate-400">{formatSize(f.size)}</span>
                  <button
                    onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))}
                    className="text-slate-400 hover:text-rose-500"
                  >
                    <XIcon className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setAttachments([])}
                className="text-xs text-rose-500 hover:text-rose-700 ml-auto"
              >
                清空附件
              </button>
            </div>
          )}

          {/* 输入区 */}
          <div className="border-t border-pink-100 bg-white/70 p-3 md:p-4 space-y-2">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700 whitespace-pre-wrap">
                {error}
              </div>
            )}
            <div className="flex gap-2 items-start">
              <label
                title="选择图片 / 视频 / 程序 / 任意文件"
                className="shrink-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 w-11 h-11 flex items-center justify-center cursor-pointer"
              >
                <Paperclip className="w-4.5 h-4.5" />
                <input
                  ref={fileRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 16) {
                      setError("一次最多同时上传 16 个文件，请分多次发送");
                    }
                    const map = new Map<string, File>();
                    [...attachments, ...files.slice(0, 16)].forEach((f) =>
                      map.set(`${f.name}__${f.size}`, f)
                    );
                    setAttachments(Array.from(map.values()));
                  }}
                />
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                    e.preventDefault();
                    void handleSend();
                  } else if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                placeholder={`向${parsed.kind === "group" ? `群「${titleInfo.title}」` : `「${titleInfo.title}」`}发送消息…（回车发送 / Shift+Enter 换行 / Ctrl+Enter 发送）`}
                className="flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-[14px] leading-7 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 placeholder:text-slate-400"
              />
              <button
                onClick={handleSend}
                disabled={sending}
                className="shrink-0 h-11 rounded-xl bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white px-4 md:px-5 font-semibold shadow-md shadow-pink-200/60 hover:shadow-lg hover:brightness-105 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">发送</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-400 flex flex-wrap items-center gap-3">
              <span>💾 消息保存在浏览器本地（每个会话最多保留 500 条，超出丢弃最旧）</span>
              <span>📄 单文件 8MB 上限；支持图片预览、视频播放、程序文件还原原文件名下载</span>
              {!isLoggedIn() && <span>🚪 访客可正常聊天，登录后可解锁更多群管理权限</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- 小工具函数 ---------------- */
function parseConversationId(cid: string) {
  if (cid.startsWith("group:")) {
    return { kind: "group" as const, groupId: cid.slice("group:".length), dmOtherId: null };
  }
  if (cid.startsWith("dm:")) {
    const rest = cid.slice("dm:".length);
    const [a, b] = rest.split("|");
    const me = getCurrentActor().userId;
    const other = a === me ? b : a;
    return { kind: "dm" as const, groupId: null, dmOtherId: other || null };
  }
  return { kind: "unknown" as const, groupId: null, dmOtherId: null };
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = () => reject(r.error || new Error("read fail"));
    r.onload = () => resolve(String(r.result || ""));
    r.readAsDataURL(file);
  });
}

function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 按消息类型渲染气泡主体
 */
function renderMessageBody(m: ChatMessage, isMine: boolean) {
  const baseCls = isMine
    ? "bg-white/15 hover:bg-white/25"
    : "bg-slate-100 hover:bg-slate-200 text-slate-700";
  const download = (content: string, fn: string) => {
    const a = document.createElement("a");
    a.href = content;
    a.download = fn;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => a.remove(), 0);
  };
  const downloadBtn = (content: string, filename: string) => (
    <a
      href={content}
      download={filename}
      onClick={(e) => {
        e.preventDefault();
        download(content, filename);
      }}
      className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${baseCls}`}
    >
      <Download className="w-3.5 h-3.5" /> 下载
    </a>
  );

  if (m.type === "text") {
    return <pre className="whitespace-pre-wrap break-words font-sans">{m.content}</pre>;
  }
  if (m.type === "image") {
    return (
      <div className="space-y-2 max-w-[420px]">
        {m.fileName && (
          <div className={`text-xs ${isMine ? "text-white/85" : "text-slate-500"} flex items-center gap-1.5`}>
            <ImageIcon className="w-3.5 h-3.5" /> {m.fileName}
          </div>
        )}
        <img
          src={m.content}
          alt={m.fileName || "image"}
          className="max-w-full max-h-[360px] rounded-xl shadow-sm object-contain bg-white/40"
        />
        {downloadBtn(m.content, m.fileName || "image.png")}
      </div>
    );
  }
  if (m.type === "video") {
    return (
      <div className="space-y-2 max-w-[460px]">
        {m.fileName && (
          <div className={`text-xs ${isMine ? "text-white/85" : "text-slate-500"} flex items-center gap-1.5`}>
            <Film className="w-3.5 h-3.5" /> {m.fileName}
          </div>
        )}
        <video src={m.content} controls className="max-w-full max-h-[360px] rounded-xl bg-black/30 shadow-sm" />
        {downloadBtn(m.content, m.fileName || "video.mp4")}
      </div>
    );
  }
  // file
  return (
    <div className={`flex items-center gap-3 min-w-[260px] ${isMine ? "text-white" : "text-slate-800"}`}>
      <div
        className={`shrink-0 w-11 h-11 rounded-xl flex items-center justify-center ${
          isMine ? "bg-white/15" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
        }`}
      >
        <FileText className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold truncate" title={m.fileName}>
          {m.fileName || "unknown.bin"}
        </div>
        <div className={`text-xs ${isMine ? "text-white/80" : "text-slate-500"}`}>
          {m.mimeType || "application/octet-stream"} · {formatSize(m.fileSize)}
        </div>
      </div>
      <a
        href={m.content}
        download={m.fileName || "file"}
        onClick={(e) => {
          e.preventDefault();
          download(m.content, m.fileName || "file");
        }}
        className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold ${
          isMine
            ? "bg-white text-brand-pink hover:bg-white/90"
            : "bg-brand-pink text-white hover:bg-brand-pink-dark"
        }`}
      >
        <Download className="w-3.5 h-3.5" /> 下载
      </a>
    </div>
  );
}
