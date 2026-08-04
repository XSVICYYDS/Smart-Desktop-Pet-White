import {
  Code, Monitor, Package, Settings, Image, ScanText,
  Mail, Github, Heart, Sparkles, Rocket, Shield,
  Send, Paperclip, Trash2, UserCircle2, MessageCircle,
  X as XIcon, Download, FileText, Film, Image as ImageIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import SectionTitle from "@/components/SectionTitle";
import { useScrollReveal } from "@/hooks/useScrollReveal";
import { techStack, timeline, siteConfig } from "@/data/content";
import { isLoggedIn, getCurrentDisplayName } from "@/lib/authClient";

// ================= 交流版面：消息模型与存储 =================
type ChatType = "text" | "image" | "video" | "file";

/**
 * 单条社区消息
 *  - 文本消息：type=text  content=纯文本，rows 记录换行行数（用于 2000 行总量保护）
 *  - 图片：type=image  content=base64 data URL  fileName/fileSize/mimeType
 *  - 视频：type=video  content=base64 data URL
 *  - 程序/其它文件：type=file  content=base64 data URL  可点击按钮下载为原文件名
 */
interface ChatMessage {
  id: string;
  ts: number;
  senderName: string;
  senderColor: string;
  type: ChatType;
  content: string;
  /** 文本消息的换行行数，用于 2000 行总量保护；非文本消息计 1 行 */
  rows: number;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

const STORAGE_KEY = "xiaobai_about_chat_v1";
/** 消息条数上限（浏览器存储友好） */
const MAX_MESSAGES = 2000;
/** 单条文本消息的字符上限，避免单条炸掉 localStorage */
const MAX_TEXT_CHARS = 60000;
/** 单文件大小上限 8MB（base64 膨胀后约 11MB，对 localStorage 安全） */
const MAX_FILE_BYTES = 8 * 1024 * 1024;
/** 广播通道名：多标签页实时同步 */
const CHANNEL_NAME = "xiaobai-about-chat-v1";

// ================= 工具函数 =================

/**
 * 计算消息累计行数（用于总量保护与展示）
 * 如果用户显式填了 rows 则信任，否则用换行 + 1 估算
 */
function countLines(text: string): number {
  if (!text) return 1;
  const hardLines = (text.match(/\n/g) || []).length + 1;
  // 超长行按 120 字符虚拟换行
  const softEstimate = Math.ceil(text.length / 120);
  return Math.max(1, Math.max(hardLines, Math.ceil(softEstimate / 2)));
}

/**
 * 把 ArrayBuffer 转 base64 data URL
 */
function bufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  const b64 = typeof btoa === "function" ? btoa(binary) : "";
  return `data:${mime};base64,${b64}`;
}

/**
 * 读取文件为 base64 data URL（供预览 + 存储）
 */
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("read fail"));
    reader.onload = () => resolve(String(reader.result || ""));
    reader.readAsDataURL(file);
  });
}

/**
 * 文件大小格式化（B / KB / MB）
 */
function formatSize(bytes?: number): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

/**
 * 根据昵称生成稳定的头像背景色（HSL）
 */
function stableColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return `hsl(${hue}, 72%, 62%)`;
}

/**
 * 从 localStorage 加载聊天历史，容量超出时裁剪旧消息
 */
function loadMessages(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(arr)) return [];
    // 裁剪条数上限
    if (arr.length > MAX_MESSAGES) return arr.slice(arr.length - MAX_MESSAGES);
    return arr;
  } catch {
    return [];
  }
}

/**
 * 保存到 localStorage；如果因容量异常失败则滚动淘汰 20%
 */
function saveMessages(list: ChatMessage[]): boolean {
  let data = list;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch {
      // 容量不足，删除最旧的 20%
      const drop = Math.max(1, Math.ceil(data.length * 0.2));
      data = data.slice(drop);
    }
  }
  return false;
}

// ================= 主组件：About 页面社区交流版面 =================

/**
 * About 页面底部的社区交流版面
 *  - 支持文字（最多 2000 行累计，超过自动滚动删除最旧）
 *  - 图片（<img> 预览）、视频（<video controls> 播放）
 *  - 程序 / 任意文件（Data URL 存储 + 一键下载回原文件名）
 *  - 发送者昵称：登录时自动带入，未登录时使用临时昵称 + 颜色
 *  - 多标签页实时同步：BroadcastChannel 优先，fallback 到 storage 事件
 */
function CommunityChatBoard() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => loadMessages());
  const [nickname, setNickname] = useState<string>(() => {
    // 优先使用登录名；否则尝试本地保存的匿名昵称；最后默认"访客小白"
    const saved = localStorage.getItem("xiaobai_chat_nickname") || "";
    if (isLoggedIn()) return getCurrentDisplayName() || saved || "访客小白";
    return saved || "访客小白";
  });
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const channelRef = useRef<BroadcastChannel | null>(null);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 行号上限统计（2000 行保护）
  const totalRows = useMemo(
    () => messages.reduce((sum, m) => sum + (m.rows || 1), 0),
    [messages]
  );

  /**
   * 写回 state + 持久化，并通知其它标签页刷新
   */
  const persist = useMemo(
    () =>
      (next: ChatMessage[], notifyRemote = true) => {
        setMessages(next);
        saveMessages(next);
        if (notifyRemote && channelRef.current) {
          try { channelRef.current.postMessage({ type: "sync", rows: next.length }); } catch {}
        }
      },
    []
  );

  /**
   * 按 2000 行总量进行滚动清理：超限后优先删最旧的，直到回到 90% 水位以下
   */
  const trimByRows = useMemo(
    () =>
      (list: ChatMessage[]): ChatMessage[] => {
        let rows = list.reduce((s, m) => s + (m.rows || 1), 0);
        if (rows <= MAX_MESSAGES) return list;
        const out = list.slice();
        const target = Math.floor(MAX_MESSAGES * 0.9);
        while (rows > target && out.length > 0) {
          const first = out.shift()!;
          rows -= first.rows || 1;
        }
        return out;
      },
    []
  );

  // 初始化多标签同步通道
  useEffect(() => {
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current.onmessage = () => setMessages(loadMessages());
      }
    } catch {}
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setMessages(loadMessages());
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      try { channelRef.current?.close(); } catch {}
    };
  }, []);

  // 有新消息自动滚到底
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // 保存昵称（未登录时可改）
  useEffect(() => {
    if (!isLoggedIn()) localStorage.setItem("xiaobai_chat_nickname", nickname);
  }, [nickname]);

  /**
   * 追加一条消息到列表（内部用）
   */
  const appendMessage = (msg: ChatMessage) => {
    const next = trimByRows([...messages, msg]);
    persist(next);
  };

  /**
   * 从上传的多个 File 生成消息；每个附件独立一条
   */
  const fileToMessage = async (file: File): Promise<ChatMessage> => {
    const url = await readFileAsDataURL(file);
    let t: ChatType = "file";
    if (file.type.startsWith("image/")) t = "image";
    else if (file.type.startsWith("video/")) t = "video";
    const base: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      ts: Date.now(),
      senderName: nickname || "访客小白",
      senderColor: stableColor(nickname || "访客小白"),
      type: t,
      content: url,
      rows: 1,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type || "application/octet-stream",
    };
    return base;
  };

  /**
   * 点击发送：文本 + 附件一次性发出
   */
  const handleSend = async () => {
    if (sending) return;
    setError(null);
    const hasText = text.trim().length > 0;
    const hasFiles = attachments.length > 0;
    if (!hasText && !hasFiles) {
      setError("请输入文字或选择要发送的文件 / 图片 / 视频");
      return;
    }

    // 文本行数检查 + 字符上限保护
    if (hasText && text.length > MAX_TEXT_CHARS) {
      setError(`文字过长：当前 ${text.length}，上限 ${MAX_TEXT_CHARS} 字符`);
      return;
    }

    setSending(true);
    try {
      // 1) 文本消息
      if (hasText) {
        const rows = countLines(text);
        // 单条消息超过 200 行直接拒绝（避免一条消息一进来就把整个版挤空）
        if (rows > 200) {
          setError(`单条文字过长：估算约 ${rows} 行，单条上限 200 行`);
          setSending(false);
          return;
        }
        const msg: ChatMessage = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          ts: Date.now(),
          senderName: nickname || "访客小白",
          senderColor: stableColor(nickname || "访客小白"),
          type: "text",
          content: text,
          rows,
        };
        setMessages((prev) => {
          const next = trimByRows([...prev, msg]);
          persist(next, false); // 批量发送过程不逐条广播，最后由附件/清空触发
          return next;
        });
        setText("");
      }

      // 2) 附件消息（每个文件 1 条）
      if (hasFiles) {
        const results = await Promise.allSettled(
          attachments.map(async (f) => {
            if (f.size > MAX_FILE_BYTES) throw new Error(`文件 ${f.name} 超过 8MB 上限`);
            return fileToMessage(f);
          })
        );
        const ok: ChatMessage[] = [];
        const errs: string[] = [];
        results.forEach((r, i) => {
          if (r.status === "fulfilled") ok.push(r.value);
          else errs.push(attachments[i].name + ": " + (r.reason?.message || "失败"));
        });
        if (errs.length) {
          setError("部分文件发送失败：" + errs.join("；"));
        }
        if (ok.length) {
          setMessages((prev) => {
            const next = trimByRows([...prev, ...ok]);
            persist(next);
            return next;
          });
        } else {
          // 附件全失败，但前面文本可能已改 state，再广播一次让其它 tab 同步
          persist(messages, true);
        }
      } else {
        // 仅文本：广播一次
        persist(messages, true);
      }
      setAttachments([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (e: any) {
      setError(e?.message || "发送失败");
    } finally {
      setSending(false);
    }
  };

  /**
   * 删除单条消息（允许用户删除自己发的，或登录用户删除任何一条做管理）
   */
  const deleteOne = (id: string) => {
    const target = messages.find((m) => m.id === id);
    if (!target) return;
    const isMine = target.senderName === nickname;
    const admin = isLoggedIn(); // 登录态用户视为具备管理删除权
    if (!isMine && !admin) {
      setError("只能删除你自己发送的消息");
      return;
    }
    const next = messages.filter((m) => m.id !== id);
    persist(next);
  };

  /**
   * 清空全部消息（登录用户可用，未登录则清空自己的可见消息但不会影响他人）
   */
  const clearAll = () => {
    if (!window.confirm("确认清空当前浏览器本地的全部交流消息？（仅清理你本机，其它设备不受影响）")) return;
    persist([]);
  };

  return (
    <section className="py-16 px-6 bg-gradient-to-b from-white via-pink-50 to-violet-50">
      <div className="max-w-4xl mx-auto">
        <SectionTitle
          title="社区交流版面"
          subtitle="和其它小白用户们一起聊天，支持文字 / 图片 / 视频 / 程序文件分享"
        />

        <div className="glass rounded-3xl overflow-hidden border border-pink-100 shadow-xl shadow-pink-100/40">
          {/* 顶部栏：昵称 / 统计 / 清空 */}
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-pink-100 bg-gradient-to-r from-white via-pink-50 to-violet-50">
            <div className="flex items-center gap-2 rounded-2xl bg-white border border-pink-200 px-3 py-1.5 flex-1 max-w-sm">
              <UserCircle2 className="w-4 h-4 text-pink-500" />
              {isLoggedIn() ? (
                <div className="flex-1 text-sm font-semibold text-slate-800 truncate">
                  {nickname}
                  <span className="ml-2 text-[11px] text-brand-pink bg-pink-50 border border-pink-100 rounded-full px-2 py-0.5">
                    登录用户
                  </span>
                </div>
              ) : (
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value.slice(0, 20))}
                  className="flex-1 bg-transparent focus:outline-none text-sm text-slate-800 font-semibold placeholder:text-slate-400"
                  placeholder="给自己起个昵称（最长20字）"
                />
              )}
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-violet-500" />
                消息 <span className="font-bold text-slate-800">{messages.length}</span> 条
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-1.5 text-slate-700 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-emerald-500" />
                累计 <span className={`font-bold ${totalRows > 1800 ? "text-rose-600" : "text-slate-800"}`}>{totalRows}</span> / {MAX_MESSAGES} 行
              </div>
            </div>
            <button
              onClick={clearAll}
              className="ml-auto rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-3 py-2 text-xs font-semibold flex items-center gap-1.5"
              title="清空本机保存的所有交流消息"
            >
              <Trash2 className="w-3.5 h-3.5" />
              清空消息
            </button>
          </div>

          {/* 进度条：累计行数接近上限时变红警告 */}
          <div className="h-1 bg-slate-100">
            <div
              className={`h-full transition-all ${totalRows > 1800 ? "bg-gradient-to-r from-orange-400 to-rose-500" : "bg-gradient-to-r from-brand-pink to-violet-500"}`}
              style={{ width: `${Math.min(100, (totalRows / MAX_MESSAGES) * 100)}%` }}
            />
          </div>

          {/* 消息列表 */}
          <div className="h-[480px] md:h-[520px] overflow-y-auto bg-gradient-to-b from-white via-pink-50/40 to-white px-4 md:px-6 py-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-slate-400">
                <MessageCircle className="w-12 h-12 mb-3 text-pink-300" />
                <div className="font-semibold text-slate-500">这里还是空白～</div>
                <div className="text-sm mt-1 max-w-sm">
                  发送第一条消息和大家打招呼吧，支持文字 / 图片 / 视频 / 任意程序文件分享
                </div>
              </div>
            ) : (
              messages.map((m) => {
                const date = new Date(m.ts);
                const isMine = m.senderName === nickname;
                return (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${isMine ? "flex-row-reverse" : "flex-row"}`}
                  >
                    <div
                      className="shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full text-white font-bold flex items-center justify-center shadow-md"
                      style={{ backgroundColor: m.senderColor }}
                      title={m.senderName}
                    >
                      {m.senderName.slice(0, 1).toUpperCase()}
                    </div>
                    <div className={`flex-1 max-w-[82%] ${isMine ? "items-end text-right" : "items-start text-left"} flex flex-col`}>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-1">
                        <span className="font-semibold text-slate-700">{m.senderName}</span>
                        <span>
                          {date.toLocaleDateString()} {date.toLocaleTimeString().slice(0, 5)}
                        </span>
                        {m.fileSize ? <span>· {formatSize(m.fileSize)}</span> : null}
                        <button
                          onClick={() => deleteOne(m.id)}
                          className="ml-1 opacity-0 group-hover:opacity-100 hover:opacity-100 text-rose-500 hover:text-rose-700"
                          title="删除这条消息"
                        >
                          <XIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* 消息内容：按 type 渲染 */}
                      <div
                        className={`inline-block max-w-full rounded-2xl px-4 py-3 text-left text-[14px] leading-7 shadow-sm border ${
                          isMine
                            ? "bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white border-pink-300 rounded-tr-sm"
                            : "bg-white text-slate-800 border-slate-200 rounded-tl-sm"
                        }`}
                      >
                        {m.type === "text" && (
                          <pre className="whitespace-pre-wrap break-words font-sans">{m.content}</pre>
                        )}
                        {m.type === "image" && (
                          <div className="space-y-2">
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
                            <a
                              href={m.content}
                              download={m.fileName || "image"}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
                                isMine ? "bg-white/15 hover:bg-white/25" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" /> 下载原图
                            </a>
                          </div>
                        )}
                        {m.type === "video" && (
                          <div className="space-y-2">
                            {m.fileName && (
                              <div className={`text-xs ${isMine ? "text-white/85" : "text-slate-500"} flex items-center gap-1.5`}>
                                <Film className="w-3.5 h-3.5" /> {m.fileName}
                              </div>
                            )}
                            <video
                              src={m.content}
                              controls
                              className="max-w-full max-h-[360px] rounded-xl bg-black/30 shadow-sm"
                            />
                            <a
                              href={m.content}
                              download={m.fileName || "video"}
                              className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg ${
                                isMine ? "bg-white/15 hover:bg-white/25" : "bg-slate-100 hover:bg-slate-200 text-slate-700"
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" /> 下载视频
                            </a>
                          </div>
                        )}
                        {m.type === "file" && (
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
                              className={`shrink-0 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-semibold ${
                                isMine ? "bg-white text-brand-pink hover:bg-white/90" : "bg-brand-pink text-white hover:bg-brand-pink-dark"
                              }`}
                            >
                              <Download className="w-3.5 h-3.5" /> 下载
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={listEndRef} />
          </div>

          {/* 附件预上传条（显示要发送的文件列表，可单独移除） */}
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
                    onClick={() =>
                      setAttachments((arr) => arr.filter((_, idx) => idx !== i))
                    }
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
              <div className="rounded-xl bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <div className="flex gap-2 items-start">
              <label
                title="选择图片 / 视频 / 程序文件 / 任意文件"
                className="shrink-0 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 w-11 h-11 flex items-center justify-center cursor-pointer"
              >
                <Paperclip className="w-4.5 h-4.5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    // 去重 + 合并
                    const map = new Map<string, File>();
                    [...attachments, ...files].forEach((f) => map.set(`${f.name}__${f.size}`, f));
                    const merged = Array.from(map.values());
                    if (merged.length > 12) {
                      setError("一次最多同时发送 12 个文件，你可以分多次发送");
                      setAttachments(merged.slice(0, 12));
                    } else {
                      setAttachments(merged);
                      setError(null);
                    }
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
                    // 回车发送，Shift+Enter 换行
                    e.preventDefault();
                    void handleSend();
                  }
                }}
                rows={2}
                placeholder="说点什么吧～（回车发送，Shift+Enter 换行，Ctrl+Enter 发送）；点击左侧📎选择图片/视频/程序等任意文件"
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
              <span>💾 消息保存在你的浏览器本地（localStorage + BroadcastChannel 多标签同步）</span>
              <span>📏 文本单条上限 200 行 / 6 万字符，累计 2000 行自动滚动清理</span>
              <span>📦 单文件上限 8MB（图片 / 视频 / exe / py / js / zip 等均支持）</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

const iconMap: Record<string, LucideIcon> = {
  Code, Monitor, Package, Settings, Image: Image, ScanText,
};

export default function About() {
  const { ref, isVisible } = useScrollReveal();

  return (
    <div className="pt-24">
      {/* Page Header */}
      <section className="py-16 px-6 text-center bg-gradient-to-b from-pink-50 to-white">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white text-4xl font-bold mx-auto mb-6 shadow-lg shadow-pink-200/50">
          白
        </div>
        <h1 className="font-serif text-4xl md:text-5xl font-bold text-brand-dark mb-4">
          关于<span className="gradient-text">小白</span>
        </h1>
        <p className="text-brand-gray text-lg max-w-2xl mx-auto">
          {siteConfig.description}
        </p>
      </section>

      {/* Developer Info */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass rounded-3xl p-8 md:p-12 shadow-lg shadow-pink-100/30">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                XS
              </div>
              <div className="text-center md:text-left flex-1">
                <h2 className="font-serif text-2xl font-bold text-brand-dark mb-2">
                  {siteConfig.developer}
                </h2>
                <p className="text-brand-gray mb-4">
                  独立开发者 · Python 全栈工程师 · 热爱桌面应用开发
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start">
                  <a
                    href={`mailto:${siteConfig.email}`}
                    className="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-pink transition-colors"
                  >
                    <Mail size={18} /> {siteConfig.email}
                  </a>
                  <a
                    href={siteConfig.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-sm text-brand-gray hover:text-brand-pink transition-colors"
                  >
                    <Github size={18} /> GitHub
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-6 bg-gradient-to-b from-white to-pink-50">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="技术栈" subtitle="小白使用以下技术构建" />
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {techStack.map((tech) => {
              const Icon = iconMap[tech.icon] || Code;
              return (
                <div
                  key={tech.name}
                  className="bg-white rounded-2xl p-6 border border-pink-50 hover:shadow-md transition-shadow text-center"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-pink to-brand-pink-light flex items-center justify-center text-white mx-auto mb-4">
                    <Icon size={24} />
                  </div>
                  <h4 className="font-serif text-lg font-bold text-brand-dark mb-1">{tech.name}</h4>
                  <p className="text-xs text-brand-gray">{tech.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section ref={ref} className={`reveal ${isVisible ? "is-visible" : ""} py-16 px-6`}>
        <div className="max-w-3xl mx-auto">
          <SectionTitle title="项目时间线" subtitle="小白的成长历程" />
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-brand-pink via-brand-pink-light to-transparent" />

            {timeline.map((item, index) => (
              <div
                key={item.version}
                className={`relative flex items-center mb-8 ${
                  index % 2 === 0 ? "md:flex-row-reverse" : ""
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-4 h-4 rounded-full bg-brand-pink border-4 border-white shadow-md -translate-x-1/2 z-10" />

                {/* Content */}
                <div className={`w-full md:w-1/2 pl-12 md:pl-0 ${index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"}`}>
                  <div className="bg-white rounded-xl p-4 border border-pink-50 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-2 mb-1" style={{ justifyContent: index % 2 === 0 ? "flex-end" : "flex-start" }}>
                      <span className="text-xs font-bold text-brand-pink bg-pink-100 px-2 py-0.5 rounded-full">
                        {item.version}
                      </span>
                      <span className="text-xs text-brand-gray">{item.date}</span>
                    </div>
                    <p className="text-sm text-brand-dark">{item.event}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 px-6 bg-gradient-to-b from-pink-50 to-white">
        <div className="max-w-5xl mx-auto">
          <SectionTitle title="项目理念" subtitle="我们相信的价值观" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white mx-auto mb-4">
                <Heart size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">温暖陪伴</h4>
              <p className="text-sm text-brand-gray">
                小白不仅是一个工具，更是你桌面上的小伙伴，带来温暖和陪伴。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-400 flex items-center justify-center text-white mx-auto mb-4">
                <Rocket size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">持续进化</h4>
              <p className="text-sm text-brand-gray">
                不断迭代更新，听取用户反馈，让小白变得越来越好。
              </p>
            </div>
            <div className="bg-white rounded-2xl p-8 text-center border border-pink-50 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-400 flex items-center justify-center text-white mx-auto mb-4">
                <Shield size={28} />
              </div>
              <h4 className="font-serif text-lg font-bold text-brand-dark mb-2">开源透明</h4>
              <p className="text-sm text-brand-gray">
                源代码完全公开，安全可审计，欢迎社区参与共建。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <Sparkles size={48} className="mx-auto mb-4 text-brand-pink" />
          <h3 className="font-serif text-2xl font-bold text-brand-dark mb-3">
            想要了解更多？
          </h3>
          <p className="text-brand-gray mb-6">
            欢迎通过以下方式联系开发者，或访问 GitHub 仓库参与项目。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={siteConfig.github}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white px-6 py-3 text-sm font-medium hover:scale-105 transition-transform shadow-lg shadow-pink-200/50"
            >
              <Github size={18} /> 访问 GitHub
            </a>
            <a
              href={`mailto:${siteConfig.email}`}
              className="inline-flex items-center gap-2 rounded-full bg-white text-brand-pink border-2 border-brand-pink px-6 py-3 text-sm font-medium hover:scale-105 transition-transform"
            >
              <Mail size={18} /> 联系开发者
            </a>
          </div>
        </div>
      </section>

      {/* 社区交流版面 */}
      <CommunityChatBoard />
    </div>
  );
}
