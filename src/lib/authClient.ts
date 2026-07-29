/**
 * 网站端认证客户端（与桌面端小白规格完全一致）
 *
 * 功能：
 *  1. 字段严格校验（昵称2-20字符、邮箱格式、密码强度≥8位且大小写+数字、两次密码一致）
 *  2. 邮箱验证码（6位数字、60秒限流、5分钟有效期）
 *  3. 图形验证码（4位字母数字混合、不区分大小写）
 *  4. 会话持久化（localStorage 存储 JWT 风格 token，remember_me=true 用 7 天）
 *  5. 用户存储（users.json 的 localStorage 版本，字段与桌面端完全一致）
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
}

export interface SessionData {
  email: string;
  token: string;
  expires_at: number; // unix ms
  nickname: string;
  user_id: string;
}

export interface EmailCodeRecord {
  code: string;
  expires_at: number; // unix ms
  attempts: number;
}

// ================== localStorage Key 常量 ==================

const LS_USERS = "xiaobai.auth.users.v1";
const LS_SESSION = "xiaobai.auth.session.v1";
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
}): Promise<{ ok: boolean; msg: string; user_id?: string }> {
  const { nickname, email, email_code, password, confirm_password, captcha_id, captcha_input, skip_captcha_for_test } = params;

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

  // 找用户
  const users = _getUsers();
  const user = users[emailR.value!];
  if (!user) return { ok: false, msg: "该邮箱尚未注册", need_slider: false };
  if (user.status !== "active") return { ok: false, msg: "账号已被禁用", need_slider: false };

  // 密码
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return { ok: false, msg: "密码错误", need_slider: false };

  // 建立会话（与桌面端 AuthSystem._save_session / auto_restore_login 同规格）
  const ttlMs = remember_me ? 7 * 24 * 60 * 60 * 1000 : 1 * 24 * 60 * 60 * 1000;
  const sess: SessionData = {
    email: user.email,
    token: _makeSessionToken(user),
    expires_at: Date.now() + ttlMs,
    nickname: user.nickname,
    user_id: user.user_id,
  };
  _writeJSON(LS_SESSION, sess);
  return { ok: true, msg: "登录成功", need_slider: false, user };
}

// ================== 会话 / 用户状态（与桌面端 is_logged_in/get_current_display_name/logout 对应） ==================

/**
 * 读取当前登录会话
 */
export function getCurrentSession(): SessionData | null {
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
  return _getUsers()[s.email] ?? null;
}

/**
 * 退出登录（清理会话）
 */
export function logout(): void {
  localStorage.removeItem(LS_SESSION);
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
