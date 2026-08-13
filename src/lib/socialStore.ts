/**
 * 社交统一存储层（localStorage + BroadcastChannel 多标签同步）
 *
 * 包含四大能力：
 *  1. 点赞 & 喜欢：每个游戏 / 工具 / AI 功能的 赞(thumbsUp) 与 喜欢(heart) 计数 + 本人是否点过
 *     - 热度 = 2 × 赞数 + 3 × 喜欢数（喜欢权重更高），高热度排首位 & 在首页推荐
 *  2. 好友系统：加好友申请（pending / accepted / rejected）、好友列表
 *  3. 聊群系统：创建群聊 / 加入群聊 / 群成员列表 / 解散 / 转让 / 禁言
 *  4. 会话消息：一对一私聊（DM）和 群聊（GROUP），支持文字 + 图片 + 视频 + 文件
 *
 * 多标签同步：所有写操作都会通过 BroadcastChannel 广播 "social:sync"，
 *            其它标签页收到后重新从 localStorage 加载；同时监听 storage 事件兜底。
 */

import { getCurrentUser, getCurrentSession, isLoggedIn, isCurrentAdmin, isCurrentSuperAdmin } from "./authClient";

// ========================== 存储常量 ==========================
const STORAGE_KEYS = {
  likes: "xiaobai_social_likes_v1",
  friends: "xiaobai_social_friends_v1",
  groups: "xiaobai_social_groups_v1",
  messages: "xiaobai_social_messages_v1",
  meta: "xiaobai_social_meta_v1",
};
const CHANNEL = "xiaobai-social-v1";
const MAX_MESSAGES_PER_SESSION = 500;

// ========================== 类型定义 ==========================
/** 点赞 & 喜欢：按 featureId 聚合的数据 */
export interface FeatureLikes {
  featureId: string;
  /** 点赞数（👍） */
  thumbsUp: number;
  /** 喜欢数（❤️） */
  hearts: number;
  /** 点过 赞 的用户 id 集合（用于判重，未登录时用 临时昵称 + 浏览器指纹） */
  upVoters: string[];
  /** 点过 喜欢 的用户 id 集合 */
  heartVoters: string[];
}

export interface LikesDB {
  version: 1;
  items: Record<string, FeatureLikes>;
}

/** 好友关系（单向记录：每对好友存 2 条；申请时存 1 条） */
export interface FriendEdge {
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: number;
  updatedAt: number;
}

export interface FriendDB {
  version: 1;
  edges: FriendEdge[];
  /** 未登录时的临时"用户"表：nickname→id，id 为 xid_{nanoid} */
  xusers: Record<string, { id: string; nickname: string; avatarColor: string; createdAt: number }>;
}

export type GroupRole = "owner" | "admin" | "member";

export interface GroupMember {
  userId: string;
  nickname: string;
  role: GroupRole;
  mutedUntil?: number; // 禁言到何时（毫秒），undefined=未禁言
  joinedAt: number;
}

export interface ChatGroup {
  groupId: string;
  name: string;
  description?: string;
  avatarColor: string;
  /** 6 位邀请码（字母数字，大小写不敏感），加群时用 */
  inviteCode: string;
  /** 创建者 userId（必须为 owner 之一） */
  ownerId: string;
  /** 是否允许任何登录用户通过邀请码加入 */
  publicJoin: boolean;
  createdAt: number;
  members: GroupMember[];
  /** 管理员/群主可以决定：解散群聊（软删除，消息保留但列表不再展示） */
  disbanded?: boolean;
}

export interface GroupDB {
  version: 1;
  groups: ChatGroup[];
}

/** 会话类型：dm 或 group */
export type ConversationKind = "dm" | "group";

export interface MessageBase {
  id: string;
  /** 会话 id：DM 用 sort([u1,u2]).join("|")，群聊用 groupId */
  conversationId: string;
  kind: ConversationKind;
  /** 发送者 userId（未登录时 xid_xxx） */
  senderId: string;
  senderNickname: string;
  senderColor: string;
  ts: number;
  /** 管理员编辑过文本会置 true */
  edited?: boolean;
  /** 管理员删除消息的软标记（UI 上展示为「该消息已被管理员删除」） */
  deletedByAdmin?: boolean;
  deletedBy?: string;
  deletedAt?: number;
}

export type ChatMessageType = "text" | "image" | "video" | "file";

export interface TextMessage extends MessageBase {
  type: "text";
  content: string;
}
export interface ImageMessage extends MessageBase {
  type: "image";
  content: string; // base64 data url
  fileName?: string;
  fileSize?: number;
}
export interface VideoMessage extends MessageBase {
  type: "video";
  content: string;
  fileName?: string;
  fileSize?: number;
}
export interface FileMessage extends MessageBase {
  type: "file";
  content: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export type ChatMessage = TextMessage | ImageMessage | VideoMessage | FileMessage;

export interface MessageDB {
  version: 1;
  messages: ChatMessage[];
}

// ========================== 内部工具 ==========================
function uid(prefix = "id"): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`;
}

function inviteCode(len = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

function safeJSON<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeDB<T>(key: string, value: T): void {
  // 简单地捕获容量异常并回滚：先暂存原内容，失败时还原
  const prev = localStorage.getItem(key);
  try {
    localStorage.setItem(key, JSON.stringify(value));
    broadcast();
  } catch {
    if (prev) localStorage.setItem(key, prev);
    console.warn("[socialStore] localStorage 写入失败，容量可能已达上限");
  }
}

/**
 * 当前登录用户的标识；未登录用浏览器内稳定 id
 */
export function getCurrentActor(): {
  userId: string;
  nickname: string;
  color: string;
  loggedIn: boolean;
} {
  if (isLoggedIn()) {
    const u = getCurrentUser();
    const sess = getCurrentSession();
    const nickname = (sess?.nickname) || u?.nickname || u?.username || "登录用户";
    return {
      userId: u?.user_id || uid("u"),
      nickname,
      color: stableColor(nickname),
      loggedIn: true,
    };
  }
  // 未登录：生成或复用一个 xid_xxx 存储在 FriendDB.xusers
  const friends = loadFriends();
  const xidKey = "xiaobai_social_xid";
  let xid = localStorage.getItem(xidKey);
  const nn = localStorage.getItem("xiaobai_chat_nickname") || "访客小白";
  if (!xid || !friends.xusers[xid]) {
    xid = uid("xid");
    localStorage.setItem(xidKey, xid);
  }
  if (!friends.xusers[xid]) {
    friends.xusers[xid] = { id: xid, nickname: nn, avatarColor: stableColor(nn), createdAt: Date.now() };
    writeDB(STORAGE_KEYS.friends, friends);
  }
  const info = friends.xusers[xid];
  info.nickname = nn; // 允许昵称更新同步
  return { userId: xid, nickname: nn, color: info.avatarColor || stableColor(nn), loggedIn: false };
}

function stableColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 72%, 62%)`;
}

// ========================== BroadcastChannel / 跨标签同步 ==========================
type Listener = () => void;
const listeners = new Set<Listener>();
let _channel: BroadcastChannel | null = null;
function getChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  if (!_channel) {
    try {
      _channel = new BroadcastChannel(CHANNEL);
      _channel.onmessage = () => listeners.forEach((fn) => safe(fn));
    } catch {
      _channel = null;
    }
  }
  return _channel;
}
function broadcast() {
  try { getChannel()?.postMessage({ at: Date.now() }); } catch { /* ignore: 容忍异常，不中断主流程 */ }
}
function safe(fn: () => void) { try { fn(); } catch { /* empty: 订阅失败忽略 */ }  /* empty: 故意空实现，P3 迭代补业务 */ }

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key && Object.values(STORAGE_KEYS).includes(e.key)) {
      listeners.forEach((fn) => safe(fn));
    }
  });
}

/**
 * 注册社交数据变更回调（多标签同步时触发）
 * 返回取消订阅函数
 */
export function subscribeSocial(fn: Listener): () => void {
  listeners.add(fn);
  // 激活 channel lazy init
  getChannel();
  return () => listeners.delete(fn);
}

// ========================== 1. 点赞 / 喜欢 ==========================
function loadLikes(): LikesDB {
  const raw = localStorage.getItem(STORAGE_KEYS.likes);
  return safeJSON<LikesDB>(raw, { version: 1, items: {} });
}

/**
 * 获取某个功能的点赞 / 喜欢统计；无记录时返回 0 初始化结构
 */
export function getFeatureLikes(featureId: string): FeatureLikes {
  const db = loadLikes();
  return (
    db.items[featureId] || {
      featureId,
      thumbsUp: 0,
      hearts: 0,
      upVoters: [],
      heartVoters: [],
    }
  );
}

/**
 * 批量获取所有功能的点赞数据（用于排序 & 管理员统计）
 */
export function listAllFeatureLikes(): FeatureLikes[] {
  return Object.values(loadLikes().items);
}

/**
 * 计算功能热度（用于排位：高的排首位 & 推荐）
 *   权重：赞 * 2 + 喜欢 * 3（喜欢是更强的偏好）
 */
export function computeHotScore(like: FeatureLikes): number {
  return like.thumbsUp * 2 + like.hearts * 3;
}

/**
 * 切换点赞（thumbs up）：已点则取消，未点则加一
 */
export function toggleThumbsUp(featureId: string): { liked: boolean; like: FeatureLikes } {
  const actor = getCurrentActor();
  const db = loadLikes();
  const cur = db.items[featureId] || {
    featureId, thumbsUp: 0, hearts: 0, upVoters: [], heartVoters: [],
  };
  const has = cur.upVoters.includes(actor.userId);
  if (has) {
    cur.thumbsUp = Math.max(0, cur.thumbsUp - 1);
    cur.upVoters = cur.upVoters.filter((x) => x !== actor.userId);
  } else {
    cur.thumbsUp += 1;
    cur.upVoters.push(actor.userId);
  }
  db.items[featureId] = cur;
  writeDB(STORAGE_KEYS.likes, db);
  return { liked: !has, like: cur };
}

/**
 * 切换喜欢（heart）
 */
export function toggleHeart(featureId: string): { loved: boolean; like: FeatureLikes } {
  const actor = getCurrentActor();
  const db = loadLikes();
  const cur = db.items[featureId] || {
    featureId, thumbsUp: 0, hearts: 0, upVoters: [], heartVoters: [],
  };
  const has = cur.heartVoters.includes(actor.userId);
  if (has) {
    cur.hearts = Math.max(0, cur.hearts - 1);
    cur.heartVoters = cur.heartVoters.filter((x) => x !== actor.userId);
  } else {
    cur.hearts += 1;
    cur.heartVoters.push(actor.userId);
  }
  db.items[featureId] = cur;
  writeDB(STORAGE_KEYS.likes, db);
  return { loved: !has, like: cur };
}

/** 管理员功能：重置某个功能的赞数 */
export function adminResetFeatureLikes(featureId: string): void {
  if (!isCurrentAdmin()) return;
  const db = loadLikes();
  delete db.items[featureId];
  writeDB(STORAGE_KEYS.likes, db);
}

// ========================== 2. 好友系统 ==========================
function loadFriends(): FriendDB {
  const raw = localStorage.getItem(STORAGE_KEYS.friends);
  return safeJSON<FriendDB>(raw, { version: 1, edges: [], xusers: {} });
}
function saveFriends(db: FriendDB) { writeDB(STORAGE_KEYS.friends, db); }

function ensureActorRegistered(friends: FriendDB): FriendDB {
  const actor = getCurrentActor();
  if (!friends.xusers[actor.userId] && !actor.loggedIn) {
    friends.xusers[actor.userId] = {
      id: actor.userId, nickname: actor.nickname,
      avatarColor: actor.color, createdAt: Date.now(),
    };
  }
  return friends;
}

/**
 * 发起好友申请
 *   - toId 支持：登录用户 userId / 访客 xid / 昵称（按昵称查找 xuser，找不到创建一个"占位"xuser 等待对方上线接受）
 */
export function sendFriendRequest(toIdOrNickname: string): { ok: boolean; code: "self" | "exists" | "ok" | "needLogin"; msg: string; edge?: FriendEdge } {
  const me = getCurrentActor();
  const db = loadFriends();
  ensureActorRegistered(db);
  if (!toIdOrNickname.trim()) return { ok: false, code: "exists", msg: "请填写对方的昵称或用户ID" };
  // 不能加自己
  if (toIdOrNickname === me.userId || toIdOrNickname === me.nickname) {
    return { ok: false, code: "self", msg: "不能添加自己为好友" };
  }
  // 解析对方 id：先按 userId 精确匹配，再按昵称匹配 xuser
  let toId = toIdOrNickname;
  if (!db.xusers[toId] && !toId.startsWith("u_")) {
    // 昵称查找
    const hit = Object.values(db.xusers).find((u) => u.nickname === toIdOrNickname.trim());
    if (hit) toId = hit.id;
    else {
      // 创建占位 xuser（对方上线后，如果昵称一致会被复用）
      toId = uid("xid");
      db.xusers[toId] = {
        id: toId, nickname: toIdOrNickname.trim(),
        avatarColor: stableColor(toIdOrNickname.trim()),
        createdAt: Date.now(),
      };
    }
  }
  // 检查是否已存在关系
  const exist = db.edges.find(
    (e) =>
      (e.fromUserId === me.userId && e.toUserId === toId) ||
      (e.toUserId === me.userId && e.fromUserId === toId)
  );
  if (exist) {
    if (exist.status === "accepted") return { ok: false, code: "exists", msg: "你们已经是好友了" };
    if (exist.status === "pending" && exist.fromUserId === me.userId)
      return { ok: false, code: "exists", msg: "你之前已发送过申请，等待对方接受" };
    if (exist.status === "pending") {
      // 对方向我发过申请，我再发一次 = 直接互相接受
      exist.status = "accepted";
      exist.updatedAt = Date.now();
      saveFriends(db);
      return { ok: true, code: "ok", msg: "你们互相申请，已自动成为好友", edge: exist };
    }
    if (exist.status === "rejected") {
      // 重新申请
      exist.status = "pending";
      exist.fromUserId = me.userId;
      exist.updatedAt = Date.now();
      saveFriends(db);
      return { ok: true, code: "ok", msg: "已重新发送好友申请", edge: exist };
    }
  }
  const edge: FriendEdge = {
    fromUserId: me.userId, toUserId: toId,
    status: "pending", createdAt: Date.now(), updatedAt: Date.now(),
  };
  db.edges.push(edge);
  saveFriends(db);
  return { ok: true, code: "ok", msg: "已发送好友申请，等待对方通过", edge };
}

/** 处理好友申请：接受 / 拒绝 */
export function handleFriendRequest(fromUserId: string, action: "accept" | "reject"): boolean {
  const me = getCurrentActor();
  const db = loadFriends();
  const e = db.edges.find((x) => x.fromUserId === fromUserId && x.toUserId === me.userId && x.status === "pending");
  if (!e) return false;
  e.status = action === "accept" ? "accepted" : "rejected";
  e.updatedAt = Date.now();
  saveFriends(db);
  return true;
}

/** 删除好友（双向移除 accepted） */
export function removeFriend(otherId: string): boolean {
  const me = getCurrentActor();
  const db = loadFriends();
  const before = db.edges.length;
  db.edges = db.edges.filter(
    (e) =>
      !(
        (e.fromUserId === me.userId && e.toUserId === otherId) ||
        (e.toUserId === me.userId && e.fromUserId === otherId)
      )
  );
  if (db.edges.length === before) return false;
  saveFriends(db);
  return true;
}

/** 获取本人好友列表（accepted） */
export function listFriends(): Array<{
  userId: string;
  nickname: string;
  color: string;
  since: number;
}> {
  const me = getCurrentActor();
  const db = loadFriends();
  ensureActorRegistered(db);
  const out: Array<{ userId: string; nickname: string; color: string; since: number }> = [];
  for (const e of db.edges) {
    if (e.status !== "accepted") continue;
    const other = e.fromUserId === me.userId ? e.toUserId : e.fromUserId;
    if (other === me.userId) continue;
    const user = db.xusers[other];
    out.push({
      userId: other,
      nickname: user?.nickname || other,
      color: user?.avatarColor || stableColor(other),
      since: e.updatedAt,
    });
  }
  return out;
}

/** 我收到的待处理好友申请（toUserId === me） */
export function listIncomingRequests(): Array<{
  edge: FriendEdge;
  fromNickname: string;
  fromColor: string;
}> {
  const me = getCurrentActor();
  const db = loadFriends();
  return db.edges
    .filter((e) => e.toUserId === me.userId && e.status === "pending")
    .map((edge) => {
      const u = db.xusers[edge.fromUserId];
      return {
        edge,
        fromNickname: u?.nickname || edge.fromUserId,
        fromColor: u?.avatarColor || stableColor(edge.fromUserId),
      };
    })
    .sort((a, b) => b.edge.createdAt - a.edge.createdAt);
}

/** 我发出的好友申请（对方未处理） */
export function listOutgoingRequests(): FriendEdge[] {
  const me = getCurrentActor();
  const db = loadFriends();
  return db.edges.filter((e) => e.fromUserId === me.userId && e.status === "pending");
}

/** 管理员：查看全量好友关系，用于审计 */
export function adminListAllFriendEdges(): FriendEdge[] {
  return isCurrentAdmin() ? loadFriends().edges.slice() : [];
}

// ========================== 3. 群聊系统 ==========================
function loadGroups(): GroupDB {
  const raw = localStorage.getItem(STORAGE_KEYS.groups);
  return safeJSON<GroupDB>(raw, { version: 1, groups: [] });
}
function saveGroups(db: GroupDB) { writeDB(STORAGE_KEYS.groups, db); }

/**
 * 创建新群聊（群主）
 */
export function createGroup(input: {
  name: string;
  description?: string;
  publicJoin?: boolean;
}): { ok: boolean; msg: string; group?: ChatGroup } {
  const me = getCurrentActor();
  const name = input.name.trim();
  if (!name) return { ok: false, msg: "请填写群聊名称" };
  const db = loadGroups();
  let code = inviteCode();
  while (db.groups.some((g) => g.inviteCode === code)) code = inviteCode();
  const group: ChatGroup = {
    groupId: uid("g"),
    name,
    description: input.description?.trim() || "",
    avatarColor: stableColor(name),
    inviteCode: code,
    ownerId: me.userId,
    publicJoin: !!input.publicJoin,
    createdAt: Date.now(),
    members: [
      {
        userId: me.userId, nickname: me.nickname, role: "owner",
        joinedAt: Date.now(),
      },
    ],
  };
  db.groups.push(group);
  saveGroups(db);
  return { ok: true, msg: `群聊已创建，邀请码：${code}`, group };
}

/**
 * 通过邀请码加入群聊
 */
export function joinGroupByCode(code: string): { ok: boolean; msg: string; group?: ChatGroup } {
  const me = getCurrentActor();
  const db = loadGroups();
  const c = code.trim().toUpperCase();
  const g = db.groups.find((x) => x.inviteCode === c);
  if (!g) return { ok: false, msg: "邀请码无效" };
  if (g.disbanded) return { ok: false, msg: "该群聊已解散" };
  if (g.members.some((m) => m.userId === me.userId))
    return { ok: false, msg: "你已经在该群聊中" };
  if (!g.publicJoin && !me.loggedIn)
    return { ok: false, msg: "该群为私有群，需登录后通过邀请加入" };
  g.members.push({
    userId: me.userId, nickname: me.nickname, role: "member", joinedAt: Date.now(),
  });
  saveGroups(db);
  return { ok: true, msg: "加入成功", group: g };
}

/** 我加入的群聊列表 */
export function listMyGroups(): ChatGroup[] {
  const me = getCurrentActor();
  const db = loadGroups();
  return db.groups
    .filter((g) => !g.disbanded && g.members.some((m) => m.userId === me.userId))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** 按 id 查群 */
export function getGroup(groupId: string): ChatGroup | undefined {
  return loadGroups().groups.find((g) => g.groupId === groupId);
}

/** 群聊成员角色检查：我是否有权管理该群（owner / admin 或平台管理员） */
export function canManageGroup(groupId: string): boolean {
  const me = getCurrentActor();
  const g = getGroup(groupId);
  if (!g) return false;
  if (isCurrentAdmin()) return true;
  const m = g.members.find((x) => x.userId === me.userId);
  return !!m && (m.role === "owner" || m.role === "admin");
}

/** 转让群主（仅 owner / 平台管理员可操作） */
export function transferGroupOwner(groupId: string, newOwnerId: string): boolean {
  if (!canManageGroup(groupId)) return false;
  const db = loadGroups();
  const g = db.groups.find((x) => x.groupId === groupId);
  if (!g) return false;
  const me = getCurrentActor();
  const mine = g.members.find((m) => m.userId === me.userId);
  if (!isCurrentAdmin() && mine?.role !== "owner") return false;
  const target = g.members.find((m) => m.userId === newOwnerId);
  if (!target) return false;
  target.role = "owner";
  if (mine) mine.role = mine.userId === newOwnerId ? "owner" : "admin";
  g.ownerId = newOwnerId;
  saveGroups(db);
  return true;
}

/** 修改成员角色（设为管理员/取消管理员）或踢出 */
export function setGroupMemberRole(groupId: string, userId: string, role: GroupRole | "kick"): boolean {
  if (!canManageGroup(groupId)) return false;
  const db = loadGroups();
  const g = db.groups.find((x) => x.groupId === groupId);
  if (!g) return false;
  if (role === "kick") {
    g.members = g.members.filter((m) => m.userId !== userId || m.role === "owner");
  } else {
    const m = g.members.find((x) => x.userId === userId);
    if (!m) return false;
    if (m.role === "owner" && !isCurrentSuperAdmin()) return false; // 不能随便把 owner 降级
    m.role = role;
  }
  saveGroups(db);
  return true;
}

/** 禁言某成员（seconds=0 解除） */
export function muteGroupMember(groupId: string, userId: string, seconds: number): boolean {
  if (!canManageGroup(groupId)) return false;
  const db = loadGroups();
  const g = db.groups.find((x) => x.groupId === groupId);
  if (!g) return false;
  const m = g.members.find((x) => x.userId === userId);
  if (!m) return false;
  m.mutedUntil = seconds > 0 ? Date.now() + seconds * 1000 : undefined;
  saveGroups(db);
  return true;
}

/** 解散群聊（软删除，列表不显示，消息仍保留用于审计） */
export function disbandGroup(groupId: string): boolean {
  if (!canManageGroup(groupId)) return false;
  const db = loadGroups();
  const g = db.groups.find((x) => x.groupId === groupId);
  if (!g) return false;
  const me = getCurrentActor();
  const mine = g.members.find((m) => m.userId === me.userId);
  if (!isCurrentAdmin() && mine?.role !== "owner") return false;
  g.disbanded = true;
  saveGroups(db);
  return true;
}

/** 管理员：获取所有群（含已解散） */
export function adminListAllGroups(): ChatGroup[] {
  if (!isCurrentAdmin()) return [];
  return loadGroups().groups.slice().sort((a, b) => b.createdAt - a.createdAt);
}

// ========================== 4. 会话消息 ==========================
function loadMessages(): MessageDB {
  const raw = localStorage.getItem(STORAGE_KEYS.messages);
  return safeJSON<MessageDB>(raw, { version: 1, messages: [] });
}
function saveMessages(db: MessageDB) {
  // 每个会话最多保留 MAX_MESSAGES_PER_SESSION，超出丢弃最旧
  const map: Record<string, ChatMessage[]> = {};
  for (const m of db.messages) {
    (map[m.conversationId] ||= []).push(m);
  }
  for (const k of Object.keys(map)) {
    if (map[k].length > MAX_MESSAGES_PER_SESSION) {
      map[k] = map[k].slice(map[k].length - MAX_MESSAGES_PER_SESSION);
    }
  }
  const trimmed: ChatMessage[] = [];
  for (const arr of Object.values(map)) trimmed.push(...arr);
  db.messages = trimmed;
  writeDB(STORAGE_KEYS.messages, db);
}

/** 会话 ID：DM 按字母序拼接；GROUP 直接用 groupId */
export function conversationOfDM(a: string, b: string): string {
  return `dm:${[a, b].sort().join("|")}`;
}
export function conversationOfGroup(groupId: string): string {
  return `group:${groupId}`;
}

/** 拉取某个会话的消息 */
export function listMessages(conversationId: string): ChatMessage[] {
  return loadMessages()
    .messages.filter((m) => m.conversationId === conversationId)
    .sort((a, b) => a.ts - b.ts);
}

/** 管理员 / 发送者删除消息（软删除，保留在审计里） */
export function deleteMessage(messageId: string): { ok: boolean; code: "no_perm" | "not_found" | "ok" } {
  if (!isCurrentAdmin()) return { ok: false, code: "no_perm" };
  const db = loadMessages();
  const m = db.messages.find((x) => x.id === messageId);
  if (!m) return { ok: false, code: "not_found" };
  m.deletedByAdmin = true;
  const act = getCurrentActor();
  m.deletedBy = act.userId;
  m.deletedAt = Date.now();
  saveMessages(db);
  return { ok: true, code: "ok" };
}

/** 本人删除自己发送的消息（限 10 分钟内） */
export function recallSelfMessage(messageId: string): boolean {
  const me = getCurrentActor();
  const db = loadMessages();
  const m = db.messages.find((x) => x.id === messageId);
  if (!m) return false;
  if (m.senderId !== me.userId) return false;
  if (Date.now() - m.ts > 10 * 60 * 1000) return false;
  m.deletedByAdmin = true;
  m.deletedBy = me.userId;
  m.deletedAt = Date.now();
  saveMessages(db);
  return true;
}

/** 管理员编辑文字消息内容（只允许改 text 类型） */
export function adminEditTextMessage(messageId: string, newContent: string): boolean {
  if (!isCurrentAdmin()) return false;
  const db = loadMessages();
  const m = db.messages.find((x) => x.id === messageId);
  if (!m || m.type !== "text") return false;
  m.content = newContent;
  m.edited = true;
  saveMessages(db);
  return true;
}

/**
 * 发送消息
 * @param conversationId 会话 id（用 conversationOfDM / conversationOfGroup）
 * @param kind 会话类型
 * @param payload 文本或文件
 */
export function sendMessage(args: {
  conversationId: string;
  kind: ConversationKind;
  groupId?: string;
  payload:
    | { type: "text"; text: string }
    | { type: "image" | "video" | "file"; fileSize: number; fileName?: string; mimeType: string; dataUrl: string };
}): { ok: boolean; msg?: string; message?: ChatMessage } {
  const me = getCurrentActor();
  const { conversationId, kind, payload } = args;

  // 群聊禁言检查
  if (kind === "group" && args.groupId) {
    const g = getGroup(args.groupId);
    if (!g) return { ok: false, msg: "群不存在" };
    const m = g.members.find((x) => x.userId === me.userId);
    if (!m) return { ok: false, msg: "你不在该群内" };
    if (m.mutedUntil && m.mutedUntil > Date.now())
      return { ok: false, msg: `你已被禁言至 ${new Date(m.mutedUntil).toLocaleString()}` };
  }

  const base = {
    id: uid("m"),
    conversationId,
    kind,
    senderId: me.userId,
    senderNickname: me.nickname,
    senderColor: me.color,
    ts: Date.now(),
  };
  let message: ChatMessage;
  if (payload.type === "text") {
    const content = payload.text.replace(/\s+$/g, "");
    if (!content) return { ok: false, msg: "不能发送空消息" };
    if (content.length > 40000) return { ok: false, msg: "单条文字超过 4 万字限制" };
    message = { ...base, type: "text", content };
  } else {
    if (payload.fileSize > 8 * 1024 * 1024) return { ok: false, msg: "文件最大 8MB" };
    if (payload.type === "image") {
      message = {
        ...base, type: "image", content: payload.dataUrl,
        fileName: payload.fileName, fileSize: payload.fileSize,
      };
    } else if (payload.type === "video") {
      message = {
        ...base, type: "video", content: payload.dataUrl,
        fileName: payload.fileName, fileSize: payload.fileSize,
      };
    } else {
      message = {
        ...base, type: "file", content: payload.dataUrl,
        fileName: payload.fileName || "file.bin",
        fileSize: payload.fileSize,
        mimeType: payload.mimeType || "application/octet-stream",
      };
    }
  }
  const db = loadMessages();
  db.messages.push(message);
  saveMessages(db);
  return { ok: true, message };
}

/** 管理员：按关键词搜索消息 */
export function adminSearchMessages(keyword: string, limit = 200): ChatMessage[] {
  if (!isCurrentAdmin()) return [];
  const kw = keyword.trim().toLowerCase();
  const all = loadMessages().messages.slice().sort((a, b) => b.ts - a.ts);
  if (!kw) return all.slice(0, limit);
  const out: ChatMessage[] = [];
  for (const m of all) {
    if (out.length >= limit) break;
    const parts: string[] = [m.senderNickname, m.senderId, m.conversationId];
    if (m.type === "text") parts.push(m.content);
    // P3 迭代：替换 any 为具体类型
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((m as any).fileName) parts.push((m as any).fileName);
    if (parts.some((p) => (p || "").toLowerCase().includes(kw))) out.push(m);
  }
  return out;
}

/** 按 userId / nickname 查询访客信息（用于展示聊天对方） */
export function lookupUserPublic(userId: string): { nickname: string; color: string } {
  const db = loadFriends();
  const u = db.xusers[userId];
  if (u) return { nickname: u.nickname, color: u.avatarColor };
  if (isLoggedIn()) {
    const curr = getCurrentUser();
    if (curr && (curr.user_id === userId || curr.username === userId)) {
      return { nickname: (getCurrentSession()?.nickname) || curr.nickname || curr.username, color: stableColor(curr.nickname || curr.username) };
    }
  }
  return { nickname: userId, color: stableColor(userId) };
}