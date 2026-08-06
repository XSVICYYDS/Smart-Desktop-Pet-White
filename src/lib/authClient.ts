/**
 * 网站端认证客户端（与桌面端小白规格完全一致）
 *
 * 功能：
 *  1. 字段严格校验（昵称2-20字符、邮箱格式、密码强度≥8位且大小写+数字、两次密码一致）
 *  2. 邮箱验证码（6位数字、60秒限流、5分钟有效期）
 *  3. 图形验证码（4位字母数字混合、不区分大小写）
 *  4. 会话持久化（localStorage 存储 JWT 风格 token，remember_me=true 用 7 天）
 *  5. 用户存储（users.json 的 localStorage 版本，字段与桌面端完全一致）
 *  6. 管理员：内置超级管理员 XSVICYYDS@outlook.com / Xs@315207，三大能力：
 *     - 管理账号（禁用/启用/重置密码/删除）
 *     - 管理权限（角色-权限矩阵 + 调整用户角色）
 *     - 管理版本（版本发布清单，展示 v0.4.43 / v0.6.0 / v0.7.0-dev）
 *  7. 越权保护（与桌面端 AuthSystem._require_admin 同规则）
 *
 * 注意：当前为"前端离线模式"，使用 PBKDF2-SHA256 派生密码哈希，
 *       后续接入真实后端时，仅需将本文件内部 _local* 方法替换为 REST/Fetch API 调用即可，
 *       页面层调用方式无需任何改动。
 */

// ================== 类型定义（与桌面端完全对齐） ==================

export interface AuthUser {
  user_id: string;
  username: string; // 兼容桌面端：与 email 相同
  nickname: string; // 展示昵称
  email: string;
  password_hash: string;
  created_at: string; // ISO string
  status: "active" | "disabled";
  /**
   * 头像：data:image/... base64（零后端依赖、可直接存入 users.json / localStorage），
   * 未来接入真实 REST 后再切到 URL。空字符串或 undefined 表示用首字母默认头像。
   */
  avatar?: string;
  roles?: RoleId[]; // 前端本地角色缓存；真实存储在 LS_ROLES
}

export type RoleId = "guest" | "user" | "vip" | "admin" | "super_admin";

export interface SessionData {
  email: string;
  token: string;
  expires_at: number; // unix ms
  nickname: string;
  user_id: string;
  /** 会话内快照：登录/切换账号时带入，用于下拉菜单/导航栏显示头像 */
  avatar?: string;
  /** 兼容：会话池里的登录时间戳 */
  logged_in_at?: number;
}

export interface EmailCodeRecord {
  code: string;
  expires_at: number; // unix ms
  attempts: number;
}

export interface RoleDefinition {
  role_id: RoleId;
  name: string;
  description: string;
}

export interface PermissionDefinition {
  permission_id: string;
  name: string;
  module: string;
  operation: "access" | "manage" | "view";
  description: string;
}

export interface VersionRecord {
  tag: string;
  title: string;
  summary: string;
  released_at: string;
  github_url: string;
  canary: boolean;
}

// ================== 内置超级管理员（与桌面端同规格） ==================

export const BUILTIN_SUPER_ADMIN = {
  nickname: "XSVICYYDS",
  username: "XSVICYYDS@outlook.com",
  email: "XSVICYYDS@outlook.com",
  password: "Xs@315207",
  role: "super_admin" as RoleId,
} as const;

// ================== localStorage Key 常量 ==================

const LS_USERS = "xiaobai.auth.users.v1";
const LS_ROLES = "xiaobai.auth.user_roles.v1"; // key = user_id, value = RoleId[]
const LS_SESSION = "xiaobai.auth.session.v1"; // 兼容老单会话数据（会迁移进新池）
const LS_SESSION_POOL = "xiaobai.auth.session_pool.v1"; // Record<user_id, AuthSessionRecord> 多账号会话池
const LS_ACTIVE_USER_ID = "xiaobai.auth.active_user_id.v1"; // 当前活跃账号 user_id
const LS_EMAIL_CODES = "xiaobai.auth.email_codes.v1";
const LS_EMAIL_LAST_SENT = "xiaobai.auth.email_last_sent.v1";
const LS_GRAPH_CAPTCHA = "xiaobai.auth.graph_captcha.v1";

// ================== 工具函数 ==================

/**
 * 生成随机 UUID v4（不依赖外部库，与桌面端 uuid.uuid4 语义等价）
 */
export function genUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 生成 N 位纯数字字符串（用于邮箱 6 位验证码）
 */
export function genDigitCode(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) out += Math.floor(Math.random() * 10).toString(10);
  return out;
}

const CAPTCHA_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789"; // 剔除容易混淆的 0/O/1/l/I

/**
 * 生成 N 位字母数字混合验证码（用于图形验证码）
 */
export function genMixedCaptcha(len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += CAPTCHA_CHARSET[Math.floor(Math.random() * CAPTCHA_CHARSET.length)];
  }
  return out;
}

// ================== 密码哈希（PBKDF2-SHA256，与桌面端对齐） ==================

/**
 * 派生 PBKDF2-SHA256 密码哈希
 * 输出格式：salt_b64$iterations$derived_b64  （与桌面端 PBKDF2 可互相验证）
 */
export async function hashPassword(password: string, saltIn?: string): Promise<string> {
  const salt = saltIn ?? genMixedCaptcha(16);
  const iterations = 100_000; // 与常见生产配置一致，桌面端也用 10w 轮
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    32 * 8 // SHA256 = 32 bytes
  );
  const derivedB64 = btoa(String.fromCharCode(...new Uint8Array(derived)));
  return `${btoa(salt)}$${iterations}$${derivedB64}`;
}

/**
 * 校验密码是否匹配某个哈希记录
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [saltB64, iterStr] = storedHash.split("$");
    const salt = atob(saltB64);
    void iterStr;
    const recomputed = await hashPassword(password, salt);
    // 简单字符串比较（相同 salt+iter 会得到相同前缀）
    return recomputed === storedHash;
  } catch {
    return false;
  }
}

// ================== 严格字段校验（与桌面端 AuthSystem._validate_* 同规格） ==================

/**
 * 校验昵称：必填，长度 2 ~ 20 字符
 */
export function validateNickname(nickname: string): { ok: boolean; msg: string; value?: string } {
  const v = (nickname ?? "").trim();
  if (v.length === 0) return { ok: false, msg: "昵称不能为空" };
  if (v.length < 2) return { ok: false, msg: "昵称至少需要2个字符" };
  if (v.length > 20) return { ok: false, msg: "昵称最多20个字符" };
  return { ok: true, msg: "", value: v };
}

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

/**
 * 校验邮箱：必填 + 格式正则 + 长度≤254
 */
export function validateEmail(email: string): { ok: boolean; msg: string; value?: string } {
  const v = (email ?? "").trim();
  if (v.length === 0) return { ok: false, msg: "邮箱不能为空" };
  if (v.length > 254) return { ok: false, msg: "邮箱长度超出限制" };
  if (!EMAIL_RE.test(v)) return { ok: false, msg: "邮箱格式不正确" };
  return { ok: true, msg: "", value: v.toLowerCase() };
}

/**
 * 校验邮箱验证码：必须是 6 位纯数字
 */
export function validateEmailCodeFormat(code: string): { ok: boolean; msg: string } {
  const v = (code ?? "").trim();
  if (!/^\d{6}$/.test(v)) return { ok: false, msg: "邮箱验证码必须是6位数字" };
  return { ok: true, msg: "" };
}

/**
 * 密码强度：≥8 位，必须同时包含 大写字母 + 小写字母 + 数字
 */
export function validatePasswordRules(pwd: string): { ok: boolean; msg: string } {
  if (!pwd || pwd.length < 8) return { ok: false, msg: "密码至少需要8个字符" };
  if (!/[a-z]/.test(pwd)) return { ok: false, msg: "密码必须包含小写字母" };
  if (!/[A-Z]/.test(pwd)) return { ok: false, msg: "密码必须包含大写字母" };
  if (!/[0-9]/.test(pwd)) return { ok: false, msg: "密码必须包含数字" };
  return { ok: true, msg: "" };
}

// ================== 存储层：读取/写入 localStorage ==================

function _readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function _writeJSON(key: string, data: unknown): void {
  localStorage.setItem(key, JSON.stringify(data));
}

// ================== 多账号会话池（Session Pool）：A 登、B 也能登，互相不覆盖 ==================

export type SavedSessionEntry = {
  user_id: string;
  email: string;
  nickname: string;
  token: string;
  logged_in_at: number;
  /** 会话池内缓存的头像（登录时从用户表快照） */
  avatar?: string;
};

/**
 * 读取多账号会话池（同时自动把老单会话迁移进来，升级无感）
 */
export function getSessionPool(): Record<string, SavedSessionEntry> {
  const pool = _readJSON<Record<string, SavedSessionEntry>>(LS_SESSION_POOL, {});
  try {
    const legacy = localStorage.getItem(LS_SESSION);
    if (legacy) {
      const sess = JSON.parse(legacy) as any;
      if (sess?.user_id && !(sess.user_id in pool)) {
        pool[sess.user_id] = {
          user_id: sess.user_id,
          email: sess.email ?? "",
          nickname: sess.nickname ?? sess.email ?? "用户",
          token: sess.token ?? "",
          logged_in_at: sess.logged_in_at ?? Date.now(),
        };
        localStorage.setItem(LS_SESSION_POOL, JSON.stringify(pool));
      }
    }
  } catch {
    /* ignore */
  }
  return pool;
}

/**
 * 获取当前活跃账号的 user_id（未登录则 null）
 */
export function getActiveUserId(): string | null {
  const active = localStorage.getItem(LS_ACTIVE_USER_ID);
  if (active) {
    const pool = getSessionPool();
    if (pool[active]) return active;
  }
  // 兼容回落：用老单会话 user_id 当活跃账号
  try {
    const legacy = localStorage.getItem(LS_SESSION);
    if (legacy) {
      const parsed = JSON.parse(legacy) as any;
      if (parsed?.user_id) return parsed.user_id;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * 登录成功后保存会话（加入 pool 并设为活跃，同时保留老单会话便于兼容）
 */
export function setActiveSession(entry: SavedSessionEntry): void {
  if (!entry?.user_id) return;
  const pool = getSessionPool();
  pool[entry.user_id] = entry;
  localStorage.setItem(LS_SESSION_POOL, JSON.stringify(pool));
  localStorage.setItem(LS_ACTIVE_USER_ID, entry.user_id);
  localStorage.setItem(LS_SESSION, JSON.stringify(entry));
}

/**
 * 切换到另一个已记住登录的账号（无需重新输入密码）
 */
export function switchSession(userId: string): { ok: boolean; msg: string } {
  const pool = getSessionPool();
  if (!pool[userId]) return { ok: false, msg: "该账号未在此设备保存登录状态" };
  localStorage.setItem(LS_ACTIVE_USER_ID, userId);
  localStorage.setItem(LS_SESSION, JSON.stringify(pool[userId]));
  return { ok: true, msg: `已切换到：${pool[userId].nickname || pool[userId].email}` };
}

// ================== 邮箱验证码：发送 + 验证（60s 限流、5分钟过期） ==================

/**
 * 发送邮箱验证码（6位数字）
 * @returns { ok, msg, code }  code 是开发/离线模式直接回显，生产环境应对接邮件服务而不返回
 */
export function sendEmailVerificationCode(email: string): {
  ok: boolean;
  msg: string;
  code?: string;
} {
  const eRes = validateEmail(email);
  if (!eRes.ok) return { ok: false, msg: eRes.msg };
  const e = eRes.value!;

  // 60 秒限流（与桌面端 email_verifier.py 同规格）
  const lastSent = _readJSON<Record<string, number>>(LS_EMAIL_LAST_SENT, {});
  const now = Date.now();
  if (lastSent[e] && now - lastSent[e] < 60_000) {
    const remaining = Math.ceil((60_000 - (now - lastSent[e])) / 1000);
    return { ok: false, msg: `验证码发送过于频繁，请在 ${remaining} 秒后重试` };
  }

  const code = genDigitCode(6);
  const codes = _readJSON<Record<string, EmailCodeRecord>>(LS_EMAIL_CODES, {});
  codes[e] = {
    code,
    expires_at: now + 5 * 60 * 1000, // 5 分钟有效期
    attempts: 0,
  };
  _writeJSON(LS_EMAIL_CODES, codes);
  lastSent[e] = now;
  _writeJSON(LS_EMAIL_LAST_SENT, lastSent);

  // 开发版模拟：直接把验证码附带到 msg 中（与桌面端「开发版模拟」一致的体验）
  return {
    ok: true,
    msg: `验证码已发送（模拟版），请查看控制台或下方提示获取验证码：${code}`,
    code,
  };
}

/**
 * 验证邮箱验证码（最多 6 次尝试机会，过期自动清理）
 */
export function verifyEmailCode(email: string, codeInput: string): { ok: boolean; msg: string } {
  const format = validateEmailCodeFormat(codeInput);
  if (!format.ok) return format;
  const eRes = validateEmail(email);
  if (!eRes.ok) return { ok: false, msg: eRes.msg };
  const e = eRes.value!;

  const codes = _readJSON<Record<string, EmailCodeRecord>>(LS_EMAIL_CODES, {});
  const rec = codes[e];
  if (!rec) return { ok: false, msg: "验证码不存在或已过期，请重新发送" };
  if (Date.now() > rec.expires_at) {
    delete codes[e];
    _writeJSON(LS_EMAIL_CODES, codes);
    return { ok: false, msg: "验证码不存在或已过期，请重新发送" };
  }
  if (rec.attempts >= 6) {
    delete codes[e];
    _writeJSON(LS_EMAIL_CODES, codes);
    return { ok: false, msg: "验证码尝试次数过多，请重新发送" };
  }
  if (rec.code !== codeInput.trim()) {
    rec.attempts += 1;
    codes[e] = rec;
    _writeJSON(LS_EMAIL_CODES, codes);
    const left = 6 - rec.attempts;
    return { ok: false, msg: `验证码错误，还剩 ${left} 次尝试机会` };
  }
  // 成功后一次性使用
  delete codes[e];
  _writeJSON(LS_EMAIL_CODES, codes);
  return { ok: true, msg: "验证码正确" };
}

// ================== 图形验证码（4 位字母数字混合） ==================

export interface GraphCaptcha {
  id: string;
  code: string; // 原始验证码（存储在本机，不会泄漏到页面之外）
  createdAt: number;
}

/**
 * 生成一条图形验证码
 */
export function generateGraphCaptcha(): GraphCaptcha {
  const cap: GraphCaptcha = {
    id: genUUID(),
    code: genMixedCaptcha(4),
    createdAt: Date.now(),
  };
  // 存入 localStorage，模拟后端 session；生产环境对应 session id -> captcha_code
  const all = _readJSON<Record<string, GraphCaptcha>>(LS_GRAPH_CAPTCHA, {});
  all[cap.id] = cap;
  // 清理过期条目（超过 10 分钟）
  const cutoff = Date.now() - 10 * 60 * 1000;
  for (const k of Object.keys(all)) {
    if (all[k].createdAt < cutoff) delete all[k];
  }
  _writeJSON(LS_GRAPH_CAPTCHA, all);
  return cap;
}

/**
 * 验证图形验证码（不区分大小写，验证后立即失效）
 */
export function verifyGraphCaptcha(id: string, input: string): boolean {
  const all = _readJSON<Record<string, GraphCaptcha>>(LS_GRAPH_CAPTCHA, {});
  const rec = all[id];
  if (!rec) return false;
  // 清理当前 id，一次使用
  delete all[id];
  _writeJSON(LS_GRAPH_CAPTCHA, all);
  if (Date.now() - rec.createdAt > 10 * 60 * 1000) return false;
  return (input ?? "").trim().toLowerCase() === rec.code.toLowerCase();
}

// ================== 用户注册 / 登录（与桌面端 AuthSystem.register/login 签名同规格） ==================

function _getUsers(): Record<string, AuthUser> {
  // key = email.toLowerCase()
  return _readJSON<Record<string, AuthUser>>(LS_USERS, {});
}
function _saveUsers(u: Record<string, AuthUser>) {
  _writeJSON(LS_USERS, u);
}

/**
 * 注册新用户
 * 顺序：昵称校验 → 邮箱格式 → 邮箱验证码 → 密码规则 → 两次密码一致 → 图形验证码 → 邮箱去重 → 创建用户
 */
export async function register(params: {
  nickname: string;
  email: string;
  email_code: string;
  password: string;
  confirm_password: string;
  captcha_id: string;
  captcha_input: string;
  skip_captcha_for_test?: boolean;
  /** 注册时上传的头像（dataURL；空字符串则不用） */
  avatar?: string;
}): Promise<{ ok: boolean; msg: string; user_id?: string }> {
  const { nickname, email, email_code, password, confirm_password, captcha_id, captcha_input, skip_captcha_for_test, avatar } = params;

  // 1. 昵称校验
  const nick = validateNickname(nickname);
  if (!nick.ok) return { ok: false, msg: nick.msg };

  // 2. 邮箱格式
  const emailR = validateEmail(email);
  if (!emailR.ok) return { ok: false, msg: emailR.msg };

  // 3. 邮箱验证码
  const ec = verifyEmailCode(emailR.value!, email_code);
  if (!ec.ok) return { ok: false, msg: ec.msg };

  // 4. 密码规则
  const pw = validatePasswordRules(password);
  if (!pw.ok) return { ok: false, msg: pw.msg };

  // 5. 两次密码一致
  if (password !== confirm_password) return { ok: false, msg: "两次输入的密码不一致" };

  // 6. 图形验证码
  if (!skip_captcha_for_test && !verifyGraphCaptcha(captcha_id, captcha_input)) {
    return { ok: false, msg: "图形验证码错误" };
  }

  // 7. 邮箱去重
  const users = _getUsers();
  const key = emailR.value!;
  if (users[key]) return { ok: false, msg: "该邮箱已被注册" };

  // 8. 创建用户（字段与桌面端 user_storage.py 完全一致）
  const uid = genUUID();
  const phash = await hashPassword(password);
  const user: AuthUser = {
    user_id: uid,
    username: key,
    nickname: nick.value!,
    email: key,
    password_hash: phash,
    created_at: new Date().toISOString(),
    status: "active",
    avatar: avatar || "",
  };
  users[key] = user;
  _saveUsers(users);
  return { ok: true, msg: "注册成功", user_id: uid };
}

function _makeSessionToken(user: AuthUser): string {
  // 一个简单 JWT 风格 token，payload 用 btoa 编码（开发模式够用；生产需签名）
  const payload = {
    sub: user.user_id,
    email: user.email,
    nickname: user.nickname,
    iat: Math.floor(Date.now() / 1000),
  };
  const sign = genMixedCaptcha(24); // 伪签名，前端存储防误改
  return `xb.${btoa(JSON.stringify(payload)).replace(/=/g, "")}.${sign}`;
}

/**
 * 邮箱+密码登录
 * 返回 need_slider：连续图形验证码错误超过阈值（2次）后要求升级滑块验证
 */
export async function login(params: {
  email: string;
  password: string;
  captcha_id: string;
  captcha_input: string;
  remember_me: boolean;
  slider_passed: boolean;
  captcha_fail_count?: number;
  skip_captcha_for_test?: boolean;
}): Promise<{
  ok: boolean;
  msg: string;
  need_slider: boolean;
  user?: AuthUser;
}> {
  const { email, password, captcha_id, captcha_input, remember_me, slider_passed, captcha_fail_count = 0, skip_captcha_for_test } = params;

  // 阈值（与桌面端保持一致）：≥ 2 次图形验证码错误，升级滑块
  const THRESHOLD = 2;
  const need_slider_next = captcha_fail_count + 1 >= THRESHOLD;

  // 邮箱格式
  const emailR = validateEmail(email);
  if (!emailR.ok) return { ok: false, msg: emailR.msg, need_slider: false };

  // 图形验证码 / 滑块升级
  if (!skip_captcha_for_test) {
    if (captcha_fail_count >= THRESHOLD) {
      // 必须通过滑块
      if (!slider_passed) {
        return { ok: false, msg: "图形验证码错误次数过多，请先完成滑块拼图验证", need_slider: true };
      }
    } else {
      if (!verifyGraphCaptcha(captcha_id, captcha_input)) {
        return {
          ok: false,
          msg: `图形验证码错误（连续错误${captcha_fail_count + 1}次，下一次将升级为滑块验证）`,
          need_slider: need_slider_next,
        };
      }
    }
  }

  // 找用户（按邮箱 key 存；兼容直接输入昵称 / 用户名 XSVICYYDS）
  const users = _getUsers();
  let user: AuthUser | undefined = users[emailR.value!];
  if (!user) {
    for (const key of Object.keys(users)) {
      const u = users[key];
      const unameOk = (u.username ?? "").toLowerCase() === emailR.value!.toLowerCase();
      const nickOk = (u.nickname ?? "") === email.trim();
      if (unameOk || nickOk) {
        user = u;
        break;
      }
    }
  }
  if (!user) return { ok: false, msg: "该邮箱尚未注册", need_slider: false };
  // 内置超级管理员 XSVICYYDS 永不被 disabled
  const builtin = _isBuiltinSuperAdmin(user);
  if (!builtin && user.status !== "active") return { ok: false, msg: "账号已被禁用，请联系管理员 XSVICYYDS", need_slider: false };

  // 密码
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { ok: false, msg: "密码错误", need_slider: false };

  // 建立会话（与桌面端 AuthSystem._save_session / auto_restore_login 同规格）
  // 多账号版：同时写入多账号会话池，并设为当前活跃账号（A 登后 B 再登 = 加入池并切到 B）
  const ttlMs = remember_me ? 7 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
  const sess: SessionData = {
    email: user.email,
    token: _makeSessionToken(user),
    expires_at: Date.now() + ttlMs,
    nickname: user.nickname,
    user_id: user.user_id,
    logged_in_at: Date.now(),
    avatar: user.avatar || "",
  } as any;
  setActiveSession(sess as any);
  return { ok: true, msg: "登录成功", need_slider: false, user };
}

// ================== 会话 / 用户状态（与桌面端 is_logged_in/get_current_display_name/logout 对应） ==================

// ================== 头像上传（零后端依赖：File -> canvas 压缩 -> dataURL base64） ==================

/**
 * 压缩用户选择的图片为头像 dataURL（方形居中裁剪后缩放到 size x size）。
 * 不依赖任何第三方，直接在浏览器里压缩，可安全存入 localStorage / users.json。
 */
export function compressAvatar(
  file: File,
  size = 128,
  quality = 0.85
): Promise<{ ok: boolean; msg?: string; dataURL?: string }> {
  return new Promise((resolve) => {
    if (!file) return resolve({ ok: false, msg: "请选择图片文件" });
    if (!file.type.startsWith("image/")) return resolve({ ok: false, msg: "只能上传图片（jpg/png/webp）" });
    // 单文件 5MB 上限（防止 LS 超配额）
    if (file.size > 5 * 1024 * 1024) return resolve({ ok: false, msg: "图片太大，请选择小于 5MB 的图片" });

    const reader = new FileReader();
    reader.onerror = () => resolve({ ok: false, msg: "读取图片失败" });
    reader.onload = () => {
      const src = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve({ ok: false, msg: "解码图片失败" });
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (!ctx) return resolve({ ok: false, msg: "浏览器不支持 Canvas" });

          // 居中裁剪（Cover）：取较短边的正方形
          const { width: w, height: h } = img;
          const side = Math.min(w, h);
          const sx = (w - side) / 2;
          const sy = (h - side) / 2;
          ctx.fillStyle = "#fff";
          ctx.fillRect(0, 0, size, size);
          ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
          const mime =
            file.type === "image/png" || file.type === "image/webp" ? file.type : "image/jpeg";
          const dataURL = canvas.toDataURL(mime, quality);
          // 保底：256KB 上限（避免 base64 过大撑爆 localStorage）
          if (dataURL.length > 256 * 1024 * 1.34) {
            return resolve({ ok: false, msg: "压缩后仍然过大，请换小一些的图片" });
          }
          resolve({ ok: true, dataURL });
        } catch (e) {
          resolve({ ok: false, msg: "处理图片失败" });
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * 更新当前登录用户的头像（用户表 + 会话池 + 活跃会话三处同步，保证菜单、社交中心都能立即看到）
 * @param dataURL 头像 dataURL；传 "" 则清除头像，恢复首字母默认
 */
export function updateCurrentUserAvatar(dataURL: string): { ok: boolean; msg: string } {
  const sess = getCurrentSession();
  if (!sess) return { ok: false, msg: "请先登录" };
  const users = _getUsers();
  const user = users[sess.email];
  if (!user) return { ok: false, msg: "当前用户不存在" };
  user.avatar = dataURL || "";
  users[sess.email] = user;
  _saveUsers(users);

  // 同步会话池中的头像快照（避免切换账号/刷新后仍显示旧头像）
  const pool = getSessionPool();
  if (pool[user.user_id]) {
    pool[user.user_id].avatar = user.avatar;
    localStorage.setItem(LS_SESSION_POOL, JSON.stringify(pool));
  }
  // 同步当前会话文件
  const merged: SessionData = { ...sess, avatar: user.avatar };
  localStorage.setItem(LS_SESSION, JSON.stringify(merged));

  return { ok: true, msg: dataURL ? "✅ 头像已更新" : "头像已清除，恢复默认首字母" };
}

/**
 * 获取当前登录用户头像（没有返回空字符串，UI 自己渲染首字母 fallback）
 */
export function getCurrentAvatar(): string {
  const s = getCurrentSession();
  if (!s) return "";
  if (s.avatar) return s.avatar;
  // 会话里没有的话再回落到用户表
  const users = _getUsers();
  return users[s.email]?.avatar ?? "";
}

/**
 * 读取当前登录会话（多账号版：优先从多账号会话池读活跃账号；没有再回落老单会话）
 * 过期会自动从池中清理，避免残留无效条目。
 */
export function getCurrentSession(): SessionData | null {
  const activeId = getActiveUserId();
  if (activeId) {
    const pool = getSessionPool();
    const entry = pool[activeId] as any as SessionData | undefined;
    if (entry) {
      if (entry.expires_at && Date.now() > entry.expires_at) {
        delete pool[activeId];
        localStorage.setItem(LS_SESSION_POOL, JSON.stringify(pool));
        localStorage.removeItem(LS_ACTIVE_USER_ID);
        // 尝试清理老单会话同名条目
        try {
          const legacy = localStorage.getItem(LS_SESSION);
          if (legacy) {
            const p = JSON.parse(legacy) as any;
            if (p?.user_id === activeId) localStorage.removeItem(LS_SESSION);
          }
        } catch {
          /* ignore */
        }
        return null;
      }
      return entry;
    }
  }
  // 兼容回落：老单会话
  const s = _readJSON<SessionData | null>(LS_SESSION, null);
  if (!s) return null;
  if (Date.now() > s.expires_at) {
    localStorage.removeItem(LS_SESSION);
    return null;
  }
  return s;
}

/**
 * 是否已登录
 */
export function isLoggedIn(): boolean {
  return getCurrentSession() !== null;
}

/**
 * 获取当前登录用户的展示昵称（与桌面端 get_current_display_name 对应）
 */
export function getCurrentDisplayName(): string | null {
  const s = getCurrentSession();
  return s ? s.nickname : null;
}

/**
 * 读取当前用户完整记录（可选）
 */
export function getCurrentUser(): AuthUser | null {
  const s = getCurrentSession();
  if (!s) return null;
  // 兼容按 email / username / nickname 三种方式
  const users = _getUsers();
  let u = users[s.email] ?? null;
  if (!u) {
    for (const k of Object.keys(users)) {
      if (users[k].user_id === s.user_id) {
        u = users[k];
        break;
      }
    }
  }
  return u ? { ...u, roles: getUserRoles(u.user_id) } : null;
}

/**
 * 登出当前活跃账号（多账号版：只移除活跃账号会话，其他记住的账号仍可切换回来）
 */
export function logout(): void {
  const activeUserId = getActiveUserId();
  if (!activeUserId) {
    // 兜底：清理老版单会话 key
    localStorage.removeItem(LS_SESSION);
    localStorage.removeItem(LS_ACTIVE_USER_ID);
    return;
  }
  const pool = getSessionPool();
  delete pool[activeUserId];
  localStorage.setItem(LS_SESSION_POOL, JSON.stringify(pool));
  localStorage.removeItem(LS_ACTIVE_USER_ID);
  // 同时尝试清理老版单会话（仅当老版也存的是同一 user 时）
  try {
    const legacy = localStorage.getItem(LS_SESSION);
    if (legacy) {
      const parsed = JSON.parse(legacy) as any;
      if (parsed?.user_id === activeUserId) localStorage.removeItem(LS_SESSION);
    }
  } catch {
    /* ignore */
  }
}

/**
 * 模拟云同步入口占位（与桌面端托盘菜单「同步数据（预览）」一致）
 * 未来接入真实 REST API 时在这里实现上传/下载 users / session / 宠物配置
 */
export function syncCloudPreview(): { ok: boolean; msg: string; syncedAt: string } {
  return {
    ok: true,
    msg: "云同步预览版：当前已将本地会话信息标记为与云端一致（占位实现，后续接入正式云函数后生效）",
    syncedAt: new Date().toLocaleString("zh-CN"),
  };
}

// ================== RBAC：角色/权限/版本静态定义（与桌面端 feature_definitions.py 一致） ==================

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  { role_id: "guest", name: "访客", description: "未登录用户，仅可访问基础功能" },
  { role_id: "user", name: "普通用户", description: "已登录用户，可访问 Pro 功能" },
  { role_id: "vip", name: "VIP会员", description: "VIP 用户，可访问所有高级功能" },
  { role_id: "admin", name: "管理员", description: "系统管理员，可管理用户和系统" },
  { role_id: "super_admin", name: "超级管理员", description: "超级管理员，拥有全部权限（内置 XSVICYYDS）" },
];

export const ROLE_HIERARCHY: Record<RoleId, number> = {
  guest: 0,
  user: 1,
  vip: 2,
  admin: 3,
  super_admin: 4,
};

function _admin(permId: string, name: string, module_: string, operation: PermissionDefinition["operation"], description: string): PermissionDefinition {
  return { permission_id: permId, name, module: module_, operation, description };
}

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = [
  // 宠物
  _admin("pet.basic", "基础宠物互动", "宠物", "access", "基础的宠物互动功能"),
  _admin("pet.pro_animations", "Pro动画", "宠物", "access", "高级宠物动画"),
  _admin("pet.all_features", "全部宠物功能", "宠物", "access", "所有宠物功能"),
  // 游戏
  _admin("games.basic", "基础游戏", "游戏", "access", "基础小游戏"),
  _admin("games.vip", "VIP专属游戏", "游戏", "access", "VIP专属小游戏"),
  _admin("games.all", "全部游戏", "游戏", "access", "所有游戏功能"),
  // 工具
  _admin("tools.screenshot", "截图", "工具", "access", "截图工具"),
  _admin("tools.screen_pen", "屏幕笔", "工具", "access", "屏幕画笔工具"),
  _admin("tools.system", "系统工具", "工具", "access", "系统快捷工具"),
  // 个人中心
  _admin("mycenter.profile", "个人资料", "个人中心", "access", "查看和编辑个人资料"),
  _admin("mycenter.settings", "设置", "个人中心", "access", "账户设置"),
  _admin("mycenter.history", "使用历史", "个人中心", "access", "查看使用历史记录"),
  _admin("mycenter.vip_upgrade", "VIP升级", "个人中心", "access", "VIP会员升级功能"),
  // 管理员（三大能力 + 扩展能力
  _admin("admin.user_manage", "用户管理", "管理", "manage", "管理用户账户（创建、禁用、重置密码等"),
  _admin("admin.role_manage", "权限配置", "管理", "manage", "分配/撤销用户角色与权限配置"),
  _admin("admin.version_manage", "版本管理", "管理", "manage", "查看、发布、回滚软件版本并维护发布说明"),
  _admin("admin.system_settings", "系统设置", "管理", "manage", "系统全局设置"),
  _admin("admin.audit_logs", "审计日志", "管理", "view", "查看系统审计日志"),
  _admin("admin.statistics", "数据统计", "管理", "view", "查看系统数据统计"),
];

/**
 * 角色 -> 权限映射（与桌面端 FeatureDefinitions.get_role_permissions_map 完全对齐）
 */
export const ROLE_PERMISSIONS: Record<RoleId, string[]> = {
  guest: ["pet.basic", "games.basic", "tools.screenshot", "tools.screen_pen", "tools.system"],
  user: ["pet.basic", "pet.pro_animations", "games.basic", "tools.screenshot", "tools.screen_pen", "tools.system",
         "mycenter.profile", "mycenter.settings", "mycenter.history", "mycenter.vip_upgrade"],
  vip: ["pet.basic", "pet.pro_animations", "pet.all_features", "games.basic", "games.vip", "games.all",
        "tools.screenshot", "tools.screen_pen", "tools.system",
        "mycenter.profile", "mycenter.settings", "mycenter.history", "mycenter.vip_upgrade"],
  admin: ["pet.basic", "pet.pro_animations", "pet.all_features", "games.basic", "games.vip", "games.all",
          "tools.screenshot", "tools.screen_pen", "tools.system",
          "mycenter.profile", "mycenter.settings", "mycenter.history",
          "admin.user_manage", "admin.role_manage", "admin.audit_logs", "admin.statistics"],
  super_admin: PERMISSION_DEFINITIONS.map((p) => p.permission_id),
};

/**
 * 版本发布清单（与桌面端 admin_list_versions 返回值一致）
 */
export const VERSION_RECORDS: VersionRecord[] = [
  {
    tag: "v0.4.43",
    title: "小白 v0.4.43 稳定版",
    summary: "新增安装包制作流程、桌面动画 20 种、游戏 10 款、系统托盘快捷工具。",
    released_at: "2026-06-20T10:00:00+08:00",
    github_url: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.4.43",
    canary: false,
  },
  {
    tag: "v0.6.0",
    title: "小白 v0.6.0 管理能力版",
    summary: "新增登录/注册中心（拼图容差 15px / 真人验证前置）、内置 SUPER_ADMIN XSVICYYDS、管理员三大控制台。",
    released_at: "2026-07-30T09:30:00+08:00",
    github_url: "https://github.com/XSVICYYDS/Smart-Desktop-Pet-White/releases/tag/v0.6.0",
    canary: false,
  },
  {
    tag: "v0.7.0-dev",
    title: "小白 v0.7.0 开发版（预览）",
    summary: "开发版：云端账号同步、游戏得分排行、AI 对话历史聚合、管理员批量发送邮件通知（待发布）。",
    released_at: "",
    github_url: "",
    canary: true,
  },
];

// ================== 角色存储：LS_ROLES 持久化 ==================

function _getRoleMap(): Record<string, RoleId[]> {
  return _readJSON<Record<string, RoleId[]>>(LS_ROLES, {});
}
function _saveRoleMap(m: Record<string, RoleId[]>) {
  _writeJSON(LS_ROLES, m);
}

/**
 * 读取用户角色；返回空数组视为访客（和桌面端 PermissionManager.get_user_roles 一致
 */
export function getUserRoles(userId: string): RoleId[] {
  const m = _getRoleMap();
  const r = m[userId];
  if (!r || r.length === 0) return ["guest"];
  // 按层级降序
  return [...r].sort((a, b) => ROLE_HIERARCHY[b] - ROLE_HIERARCHY[a]);
}

/**
 * 返回用户最高角色
 */
export function getUserHighestRole(userId: string): RoleId {
  return getUserRoles(userId)[0] ?? "guest";
}

/**
 * 覆盖设置用户角色
 */
export function setUserRoles(userId: string, roles: RoleId[]): void {
  const m = _getRoleMap();
  m[userId] = roles;
  _saveRoleMap(m);
}

/**
 * 检查用户是否为管理员（admin 或 super_admin）
 */
export function isRoleAtLeast(userId: string, expected: RoleId): boolean {
  const highest = getUserHighestRole(userId);
  return ROLE_HIERARCHY[highest] >= ROLE_HIERARCHY[expected];
}

// ================== 内置超级管理员 种子初始化 ==================

/**
 * 判断某个用户对象是否为内置 XSVICYYDS 超级管理员（3 个字段任一匹配）
 */
export function _isBuiltinSuperAdmin(u: { email?: string; username?: string; nickname?: string } | null | undefined): boolean {
  if (!u) return false;
  const eok = String(u.email ?? "").trim().toLowerCase() === BUILTIN_SUPER_ADMIN.email.trim().toLowerCase();
  const uok = String(u.username ?? "").trim().toLowerCase() === BUILTIN_SUPER_ADMIN.username.trim().toLowerCase();
  const nok = String(u.nickname ?? "").trim() === BUILTIN_SUPER_ADMIN.nickname.trim();
  return eok || uok || nok;
}

/**
 * 启动时（懒加载）种子内置超级管理员 + 3 个兼容老的 demo/vip/admin（无则创建，有则补齐超级管理员角色
 */
let _seeded = false;
export async function ensureSeedUsers(): Promise<void> {
  if (_seeded) return;
  _seeded = true;
  const users = _getUsers();
  const roleMap = _getRoleMap();
  let changedUsers = false;
  let changedRoles = false;

  // 1) 内置 XSVICYYDS super_admin
  {
    let existing: AuthUser | undefined;
    for (const key of Object.keys(users)) {
      if (_isBuiltinSuperAdmin(users[key])) {
        existing = users[key];
        break;
      }
    }
    if (!existing) {
      const uid = genUUID();
      const u: AuthUser = {
        user_id: uid,
        username: BUILTIN_SUPER_ADMIN.username,
        nickname: BUILTIN_SUPER_ADMIN.nickname,
        email: BUILTIN_SUPER_ADMIN.email,
        password_hash: await hashPassword(BUILTIN_SUPER_ADMIN.password),
        created_at: new Date().toISOString(),
        status: "active",
        avatar: "",
      };
      users[u.email] = u;
      changedUsers = true;
      roleMap[uid] = ["super_admin"];
      changedRoles = true;
    } else {
      // 补齐 nickname / active / super_admin 角色
      if (!existing.nickname) {
        existing.nickname = BUILTIN_SUPER_ADMIN.nickname;
        changedUsers = true;
      }
      if (existing.status !== "active") {
        existing.status = "active";
        changedUsers = true;
      }
      const rs = roleMap[existing.user_id] ?? [];
      if (!rs.includes("super_admin")) {
        roleMap[existing.user_id] = ["super_admin", ...rs.filter((r) => r !== "super_admin" && r !== "admin" && r !== "vip" && r !== "user" && r !== "guest")];
        changedRoles = true;
      }
    }
  }

  // 2) demo / vip / admin 演示用户（与桌面端保持一致）
  const seeds = [
    { email: "demo@example.com", nickname: "演示用户", password: "Demo123!", role: "user" as RoleId },
    { email: "vip@example.com", nickname: "VIP会员", password: "Vip123!", role: "vip" as RoleId },
    { email: "admin@example.com", nickname: "系统管理员", password: "Admin123!", role: "admin" as RoleId },
  ];
  for (const s of seeds) {
    if (!users[s.email]) {
      const uid = genUUID();
      users[s.email] = {
        user_id: uid,
        username: s.email,
        nickname: s.nickname,
        email: s.email,
        password_hash: await hashPassword(s.password),
        created_at: new Date().toISOString(),
        status: "active",
      };
      changedUsers = true;
      roleMap[uid] = [s.role];
      changedRoles = true;
    }
  }

  if (changedUsers) _saveUsers(users);
  if (changedRoles) _saveRoleMap(roleMap);
}
// 在模块导入即做异步预种（不阻塞导入路径不阻塞）
void ensureSeedUsers();

// ================== 管理员越权保护（与桌面端 _require_admin 同规格） ==================

export interface AdminGate {
  ok: boolean;
  msg: string;
}

/**
 * 统一越权保护：操作者 + 目标 + 操作三元组
 */
export function requireAdmin(opts: { needSuper?: boolean; targetUserId?: string; protectBuiltin?: boolean }): AdminGate {
  const { needSuper = false, targetUserId, protectBuiltin = true } = opts;
  const sess = getCurrentSession();
  if (!sess) return { ok: false, msg: "未登录" };
  const operatorLevel = ROLE_HIERARCHY[getUserHighestRole(sess.user_id)] ?? 0;
  if (needSuper && operatorLevel < ROLE_HIERARCHY.super_admin) {
    return { ok: false, msg: "该操作仅允许 SUPER_ADMIN（XSVICYYDS）执行" };
  }
  if (operatorLevel < ROLE_HIERARCHY.admin) {
    return { ok: false, msg: "该操作仅允许管理员执行" };
  }
  if (targetUserId && protectBuiltin) {
    const users = _getUsers();
    const target = Object.values(users).find((u) => u.user_id === targetUserId);
    if (_isBuiltinSuperAdmin(target)) {
      if (needSuper && sess.user_id !== targetUserId) {
        return { ok: false, msg: "禁止修改内置超级管理员（XSVICYYDS）的角色/状态" };
      }
      if (!needSuper) {
        return { ok: false, msg: "禁止修改内置超级管理员（XSVICYYDS）的账号/角色/状态" };
      }
    }
  }
  return { ok: true, msg: "权限通过" };
}

// ================== 管理员 API：管理账号 / 管理权限 / 管理版本 ==================

export interface AdminUserRow {
  user_id: string;
  nickname: string;
  email: string;
  status: "active" | "disabled";
  roles: RoleId[];
  highest_role: RoleId;
  created_at: string;
  is_builtin_super_admin: boolean;
}

/**
 * 【管理账号】管理员查询所有用户列表
 */
export function adminListUsers(): AdminUserRow[] {
  const gate = requireAdmin({});
  if (!gate.ok) return [];
  const users = _getUsers();
  const rows: AdminUserRow[] = Object.values(users).map((u) => {
    const roles = getUserRoles(u.user_id);
    return {
      user_id: u.user_id,
      nickname: u.nickname || u.username || u.email,
      email: u.email,
      status: u.status,
      roles,
      highest_role: roles[0] ?? "guest",
      created_at: u.created_at,
      is_builtin_super_admin: _isBuiltinSuperAdmin(u),
    };
  });
  rows.sort((a, b) => {
    const al = a.is_builtin_super_admin ? 1 : 0;
    const bl = b.is_builtin_super_admin ? 1 : 0;
    if (al !== bl) return bl - al;
    return ROLE_HIERARCHY[b.highest_role] - ROLE_HIERARCHY[a.highest_role];
  });
  return rows;
}

/**
 * 【管理权限】调整某个用户角色
 */
export async function adminUpdateRole(targetUserId: string, newRole: RoleId): Promise<AdminGate> {
  const needSuper = newRole === "super_admin";
  const gate = requireAdmin({ needSuper, targetUserId });
  if (!gate.ok) return gate;
  if (!ROLE_HIERARCHY[newRole]) return { ok: false, msg: `未知角色: ${newRole}` };
  const users = _getUsers();
  const target = Object.values(users).find((u) => u.user_id === targetUserId);
  if (!target) return { ok: false, msg: "目标用户不存在" };
  const sess = getCurrentSession()!;
  const opLevel = ROLE_HIERARCHY[getUserHighestRole(sess.user_id)];
  if (opLevel < ROLE_HIERARCHY.super_admin) {
    // 非超级管理员不得分配 admin / super_admin
    if (newRole === "admin" || newRole === "super_admin") {
      return { ok: false, msg: "仅 SUPER_ADMIN（XSVICYYDS）可授予管理员及更高角色" };
    }
  }
  setUserRoles(targetUserId, [newRole]);
  return { ok: true, msg: "角色更新成功" };
}

/**
 * 【管理账号】重置用户密码（内置 XSVICYYDS 只能自己改）
 */
export async function adminResetPassword(targetUserId: string, newPassword: string): Promise<AdminGate> {
  const gate = requireAdmin({ targetUserId: undefined });
  if (!gate.ok) return gate;
  const users = _getUsers();
  const target = Object.values(users).find((u) => u.user_id === targetUserId);
  if (!target) return { ok: false, msg: "目标用户不存在" };
  const sess = getCurrentSession()!;
  if (_isBuiltinSuperAdmin(target) && sess.user_id !== targetUserId) {
    return { ok: false, msg: "其它管理员不得重置内置超级管理员（XSVICYYDS）的密码" };
  }
  const pw = validatePasswordRules(newPassword);
  if (!pw.ok) return { ok: false, msg: pw.msg };
  target.password_hash = await hashPassword(newPassword);
  _saveUsers(users);
  return { ok: true, msg: "密码已重置" };
}

/**
 * 【管理账号】禁用/启用用户
 */
export function adminSetUserStatus(targetUserId: string, disabled: boolean): AdminGate {
  const gate = requireAdmin({ targetUserId });
  if (!gate.ok) return gate;
  const users = _getUsers();
  const target = Object.values(users).find((u) => u.user_id === targetUserId);
  if (!target) return { ok: false, msg: "目标用户不存在" };
  const sess = getCurrentSession()!;
  const opLevel = ROLE_HIERARCHY[getUserHighestRole(sess.user_id)];
  const targetRoles = getUserRoles(targetUserId);
  if (opLevel < ROLE_HIERARCHY.super_admin) {
    if (targetRoles.includes("admin") || targetRoles.includes("super_admin")) {
      return { ok: false, msg: "非 SUPER_ADMIN 不得禁用/启用其它管理员账号" };
    }
  }
  target.status = disabled ? "disabled" : "active";
  _saveUsers(users);
  // 禁用自己立即退出
  if (disabled && sess.user_id === targetUserId) logout();
  return { ok: true, msg: "账号状态已更新" };
}

/**
 * 【管理账号】删除用户（内置 XSVICYYDS、自己 不可删）
 */
export function adminDeleteUser(targetUserId: string): AdminGate {
  const gate = requireAdmin({ targetUserId });
  if (!gate.ok) return gate;
  const users = _getUsers();
  const target = Object.values(users).find((u) => u.user_id === targetUserId);
  if (!target) return { ok: false, msg: "目标用户不存在" };
  const sess = getCurrentSession()!;
  if (sess.user_id === targetUserId) return { ok: false, msg: "不允许删除当前登录账号" };
  const opLevel = ROLE_HIERARCHY[getUserHighestRole(sess.user_id)];
  const targetRoles = getUserRoles(targetUserId);
  if (opLevel < ROLE_HIERARCHY.super_admin) {
    if (targetRoles.includes("admin") || targetRoles.includes("super_admin")) {
      return { ok: false, msg: "非 SUPER_ADMIN 不得删除其它管理员账号" };
    }
  }
  const byEmailKey = Object.keys(users).find((k) => users[k].user_id === targetUserId);
  if (byEmailKey) delete users[byEmailKey];
  _saveUsers(users);
  const m = _getRoleMap();
  delete m[targetUserId];
  _saveRoleMap(m);
  return { ok: true, msg: "用户已删除" };
}

/**
 * 【管理权限】返回角色-权限矩阵（用于页面渲染表格）
 */
export function adminGetRolesMatrix(): { roles: RoleDefinition[]; permissions: PermissionDefinition[]; matrix: Record<RoleId, string[]>; hierarchy: Record<RoleId, number> } {
  const gate = requireAdmin({});
  if (!gate.ok) return { roles: [], permissions: [], matrix: {} as any, hierarchy: {} as any };
  const matrix: any = {};
  for (const r of ROLE_DEFINITIONS) matrix[r.role_id] = [...(ROLE_PERMISSIONS[r.role_id] ?? [])];
  return { roles: [...ROLE_DEFINITIONS], permissions: [...PERMISSION_DEFINITIONS], matrix, hierarchy: { ...ROLE_HIERARCHY } };
}

/**
 * 【管理版本】返回版本列表
 */
export function adminListVersions(): VersionRecord[] {
  const gate = requireAdmin({});
  if (!gate.ok) return [];
  return [...VERSION_RECORDS];
}

/**
 * 当前登录用户是否是管理员（用于 UI 层决定是否显示控制台入口）
 */
export function isCurrentAdmin(): boolean {
  const sess = getCurrentSession();
  if (!sess) return false;
  return isRoleAtLeast(sess.user_id, "admin");
}

/**
 * 当前登录用户是否是 SUPER_ADMIN（XSVICYYDS 内置超管
 */
export function isCurrentSuperAdmin(): boolean {
  const sess = getCurrentSession();
  if (!sess) return false;
  return getUserHighestRole(sess.user_id) === "super_admin";
}
