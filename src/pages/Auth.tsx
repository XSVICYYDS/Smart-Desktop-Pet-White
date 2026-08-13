/**
 * 小白官方网站 - 登录 / 注册认证页
 *
 * UI/校验/流程规格与桌面端登录对话框（components/auth_dialog.py）完全一致：
 *  - Tab 切换：登录 / 注册（默认登录）
 *  - 顶部玻璃态粉色卡片 + 小白动图 Logo + 欢迎语
 *  - 登录：邮箱、密码、图形验证码（4 位）、记住登录、登录按钮
 *  - 注册：昵称、邮箱、发送 6 位数字邮箱验证码（60s 限流、5min 有效）、
 *          密码（8~20 位且大小写+数字，含强度条）、确认密码、
 *          图形验证码、滑块验证（连续图形码错误≥2 时升级）
 *  - 登录/注册成功后自动跳转到首页，Navbar 同步显示当前昵称
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ShieldCheck,
  Puzzle,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  LogIn,
  UserPlus2,
  ArrowLeft,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import CaptchaCanvas from "@/components/CaptchaCanvas";
import SliderCaptcha from "@/components/SliderCaptcha";
import {
  login,
  register,
  sendEmailVerificationCode,
  validateEmail,
  validateNickname,
  validatePasswordRules,
  isLoggedIn,
  verifyGraphCaptcha,
  compressAvatar,
  type GraphCaptcha,
} from "@/lib/authClient";

type Mode = "login" | "register";

interface ToastState {
  type: "success" | "error" | "info";
  msg: string;
}

/**
 * 密码强度：基于满足规则的条目数返回 0~4
 * 规则：≥8、含小写、含大写、含数字；对应强度条 4 格
 */
function computePasswordStrength(pwd: string): 0 | 1 | 2 | 3 | 4 {
  if (!pwd) return 0;
  let n = 0;
  if (pwd.length >= 8) n += 1;
  if (/[a-z]/.test(pwd)) n += 1;
  if (/[A-Z]/.test(pwd)) n += 1;
  if (/[0-9]/.test(pwd)) n += 1;
  return n as 0 | 1 | 2 | 3 | 4;
}

/**
 * 头像上传组件（Auth / 账户资料卡片共用：圆形预览 + 选图按钮 + 清除按钮
 * 选图后父组件负责用 compressAvatar() 压缩再赋值给 avatarPreview/avatarDataURL。
 */
function AvatarUploader(props: {
  avatarPreview: string;
  processing: boolean;
  onPick: (file: File) => void | Promise<void>;
  onClear?: () => void;
  size?: number;
  hint?: string;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { avatarPreview, processing, onPick, onClear, size = 96, hint } = props;
  const pickTrigger = () => inputRef.current?.click();

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-pink-100 bg-white/60 backdrop-blur px-4 py-3">
      {/* 预览 */}
      <button
        type="button"
        onClick={pickTrigger}
        className="group relative shrink-0"
        style={{ width: size, height: size }}
        title="点击选择头像图片"
      >
        {avatarPreview ? (
          <img
            src={avatarPreview}
            alt="头像预览"
            className="w-full h-full rounded-full object-cover border-2 border-brand-pink/30 shadow-sm"
          />
        ) : (
          <span className="rounded-full bg-gradient-to-br from-brand-pink to-brand-pink-dark text-white text-2xl font-bold border-2 border-white shadow-sm btn-touchable">
            {String.fromCodePoint(0x1f436)}
          </span>
        )}
        {processing && (
          <span className="rounded-full bg-black/30 text-white text-xs flex items-center justify-center btn-touchable">
            处理中…
          </span>
        )}
        <span className="pointer-events-none absolute inset-0 rounded-full opacity-0 group-hover:opacity-100 transition bg-black/40 text-white text-[11px] flex items-center justify-center">
          更换头像
        </span>
      </button>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-brand-dark mb-1">
        选择头像（可选）
        </div>
        <div className="text-[11px] text-brand-gray/80 mb-2">
          {hint ?? "支持 JPG / PNG / WEBP，最大 5MB，自动裁剪为正方形并压缩"}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pickTrigger}
            disabled={processing}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-pink text-white hover:bg-brand-pink-dark disabled:opacity-60 shadow-sm border border-brand-pink/20"
          >
            选择图片
          </button>
          {avatarPreview && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-brand-pink-dark border border-pink-200 hover:bg-pink-50"
            >
              清除头像
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPick(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");

  // ========== 公共输入 ==========
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);

  // ========== 注册字段 ==========
  const [nickname, setNickname] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [avatarDataURL, setAvatarDataURL] = useState<string>("");
  const [avatarProcessing, setAvatarProcessing] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeCountdown, setEmailCodeCountdown] = useState(0); // 剩余秒数
  const [emailCodeSent, setEmailCodeSent] = useState<string>(""); // 当前待验证的 6 位验证码（模拟版提示）
  const emailTimerRef = useRef<number | null>(null);

  // ========== 图形验证码 ==========
  const [captchaId, setCaptchaId] = useState("");
  const [captchaInput, setCaptchaInput] = useState("");
  // 递增时强制 CaptchaCanvas 重新生成新图片 + 新 id
  // 关键：每次切换 Tab / 发送邮箱验证码后 / 提交表单后都要 +1，
  // 否则 verifyGraphCaptcha 删除记录后继续用同一个 captchaId 会"怎么输都错"
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  // 图形验证码连续错误次数：达到阈值 needSlider=true，强制先过滑块
  const [captchaFails, setCaptchaFails] = useState(0);
  const [needSlider, setNeedSlider] = useState(false);
  const [sliderPassed, setSliderPassed] = useState(false);
  const [sliderResetKey, setSliderResetKey] = useState(0);

  // ========== 登录选项 ==========
  const [rememberMe, setRememberMe] = useState(true);

  // ========== 状态 ==========
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  /**
   * 挂载时：如果已经登录，直接跳首页，避免重复登录
   */
  useEffect(() => {
    if (isLoggedIn()) navigate("/", { replace: true });
  }, [navigate]);

  /**
   * 自动清理 Toast 消息
   */
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(t);
  }, [toast]);

  /**
   * 切换 Tab 时清空表单与错误计数
   */
  const switchMode = (next: Mode) => {
    setMode(next);
    setPassword("");
    setConfirmPwd("");
    setCaptchaInput("");
    setCaptchaFails(0);
    setNeedSlider(false);
    setSliderPassed(false);
    setToast(null);
    // 切换 Tab 必须强制刷新图形验证码 id + 图片
    // （否则注册时消耗掉 captchaId 后，切换到登录仍用已删除的 id 提交→永远图形码错误）
    setCaptchaRefreshKey((k) => k + 1);
  };

  // ============== 发送邮箱验证码 ==============
  const handleSendEmailCode = async () => {
    if (emailCodeCountdown > 0) return;
    const eRes = validateEmail(email);
    if (!eRes.ok) {
      setToast({ type: "error", msg: eRes.msg });
      return;
    }
    // 必须先真的通过一次图形验证码校验，防止接口刷（verifyGraphCaptcha 内部会立即消耗掉这个 id）
    if (!captchaId) {
      setToast({ type: "error", msg: "图形验证码尚未生成，请稍等片刻或点击刷新图形码" });
      return;
    }
    if ((captchaInput.trim().length) !== 4) {
      setToast({ type: "error", msg: "请先输入完整的 4 位图形验证码，再点击发送邮箱验证码" });
      return;
    }
    const graphOk = verifyGraphCaptcha(captchaId, captchaInput);
    // 无论校验是否通过，只要调用过 verifyGraphCaptcha，记录都已消耗→必须刷新新图形码
    setCaptchaRefreshKey((k) => k + 1);
    if (!graphOk) {
      const next = captchaFails + 1;
      setCaptchaFails(next);
      if (next >= 2) {
        setNeedSlider(true);
        setSliderResetKey((k) => k + 1);
        setSliderPassed(false);
        setToast({ type: "error", msg: `图形验证码错误（连续错误${next}次，请先完成拼图滑块再发送邮箱验证码）` });
        return;
      }
      setToast({ type: "error", msg: `图形验证码错误（连续错误${next}次，下一次错误将升级为拼图滑块）` });
      return;
    }
    // 开发模式下直接返回验证码；真实环境需对接邮件服务
    const r = sendEmailVerificationCode(eRes.value!);
    if (!r.ok) {
      setToast({ type: "error", msg: r.msg });
      return;
    }
    // 成功：开启 60s 倒计时，回显模拟验证码
    setEmailCodeSent(r.code ?? "");
    setEmailCodeCountdown(60);
    setToast({ type: "success", msg: r.msg });
    if (emailTimerRef.current) window.clearInterval(emailTimerRef.current);
    emailTimerRef.current = window.setInterval(() => {
      setEmailCodeCountdown((s) => {
        if (s <= 1) {
          if (emailTimerRef.current) {
            window.clearInterval(emailTimerRef.current);
            emailTimerRef.current = null;
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  // ============== 密码强度可视化 ==============
  const pwdStrength = useMemo(() => computePasswordStrength(password), [password]);
  const strengthTexts = ["", "太弱", "一般", "良好", "很强"];
  const strengthColors = [
    "bg-gray-200",
    "bg-red-400",
    "bg-orange-400",
    "bg-yellow-400",
    "bg-green-400",
  ];

  // ============== 提交：登录 / 注册 ==============
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    // 如果 needSlider 升级为滑块，必须先过滑块
    if (needSlider && !sliderPassed) {
      setToast({ type: "error", msg: "图形验证码错误次数过多，请先完成滑块拼图验证" });
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        // 登录
        const res = await login({
          email,
          password,
          captcha_id: captchaId,
          captcha_input: captchaInput,
          remember_me: rememberMe,
          slider_passed: sliderPassed,
          captcha_fail_count: captchaFails,
        });
        if (!res.ok) {
          if (res.msg.includes("图形验证码错误")) {
            const next = captchaFails + 1;
            setCaptchaFails(next);
            // 达到阈值就升级滑块
            if (next >= 2) {
              setNeedSlider(true);
              setSliderResetKey((k) => k + 1);
              setSliderPassed(false);
            }
          }
          setToast({ type: "error", msg: res.msg });
        } else {
          setToast({
            type: "success",
            msg: `🎉 登录成功，欢迎回来 ${res.user?.nickname ?? ""}！网站与桌面端小白已同步登录。`,
          });
          window.setTimeout(() => navigate("/"), 900);
        }
      } else {
        // 注册（严格按桌面端顺序：昵称→邮箱→邮箱验证码→密码→确认密码→图形码→滑块）
        const nickR = validateNickname(nickname);
        if (!nickR.ok) {
          setToast({ type: "error", msg: nickR.msg });
          return;
        }
        const eR = validateEmail(email);
        if (!eR.ok) {
          setToast({ type: "error", msg: eR.msg });
          return;
        }
        const pwR = validatePasswordRules(password);
        if (!pwR.ok) {
          setToast({ type: "error", msg: pwR.msg });
          return;
        }
        if (password !== confirmPwd) {
          setToast({ type: "error", msg: "两次输入的密码不一致" });
          return;
        }
        const res = await register({
          nickname,
          email,
          email_code: emailCode,
          password,
          confirm_password: confirmPwd,
          captcha_id: captchaId,
          captcha_input: captchaInput,
          avatar: avatarDataURL || undefined,
        });
        if (!res.ok) {
          if (res.msg.includes("图形验证码错误")) {
            const next = captchaFails + 1;
            setCaptchaFails(next);
            if (next >= 2) {
              setNeedSlider(true);
              setSliderResetKey((k) => k + 1);
              setSliderPassed(false);
            }
          }
          setToast({ type: "error", msg: res.msg });
        } else {
          setAvatarPreview("");
          setAvatarDataURL("");
          setToast({
            type: "success",
            msg: "✅ 注册成功！已自动切换到登录界面，请输入邮箱和密码登录。",
          });
          window.setTimeout(() => {
            switchMode("login");
          }, 800);
        }
      }
    } finally {
      setSubmitting(false);
      // 提交后无论如何：
      // 1) 重置图形验证码输入框
      // 2) 强制生成新的 captcha id + 图片（verifyGraphCaptcha 已删除旧 id，不复用）
      setCaptchaInput("");
      setCaptchaRefreshKey((k) => k + 1);
    }
  };

  // ============== 渲染：公共样式 ==============
  const inputBase =
    "w-full rounded-xl border border-pink-200 bg-white/80 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-brand-gray/60 focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20";

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-brand-cream via-pink-50 to-rose-100">
      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg backdrop-blur border ${
              toast.type === "success"
                ? "bg-green-50/90 text-green-700 border-green-200"
                : toast.type === "error"
                  ? "bg-red-50/90 text-red-600 border-red-200"
                  : "bg-brand-cream/90 text-brand-dark border-pink-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle size={18} className="text-green-500 flex-shrink-0" />
            ) : toast.type === "error" ? (
              <XCircle size={18} className="text-red-500 flex-shrink-0" />
            ) : (
              <AlertCircle size={18} className="text-brand-pink flex-shrink-0" />
            )}
            <span className="whitespace-pre-line max-w-[420px]">{toast.msg}</span>
          </div>
        </div>
      )}

      <div className="max-w-xl mx-auto">
        {/* 返回首页链接 */}
        <div className="mb-4">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-brand-gray hover:text-brand-pink transition"
          >
            <ArrowLeft size={16} />
            返回小白官网首页
          </Link>
        </div>

        {/* 卡片主体 */}
        <div className="glass rounded-3xl shadow-2xl p-6 sm:p-10 border border-pink-100 relative overflow-hidden animate-fade-in-up">
          {/* 装饰：左上角小圆点 */}
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-brand-pink/20 blur-3xl rounded-full pointer-events-none" />
          <div className="absolute -bottom-12 -right-8 w-44 h-44 bg-brand-pink-light/40 blur-3xl rounded-full pointer-events-none" />

          {/* Logo + 标题 */}
          <div className="flex flex-col items-center text-center mb-6 relative">
            <img
              src={`${import.meta.env.BASE_URL}xiaobai-logo.gif`}
              alt="小白 Logo"
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white animate-bounce-soft"
            />
            <h1 className="mt-4 text-2xl sm:text-3xl font-bold font-serif">
              <span className="gradient-text">
                {mode === "login" ? "欢迎回到小白官方网站" : "加入小白大家庭"}
              </span>
            </h1>
            <p className="mt-2 text-sm text-brand-gray">
              {mode === "login"
                ? "使用与桌面端完全一致的账号密码登录，两边同步。"
                : "创建账号后，网站端与桌面端小白均可登录，数据互通。"}
            </p>
          </div>

          {/* Tab 切换 */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-2xl bg-pink-50 border border-pink-100 mb-6">
            {[
              { key: "login" as Mode, text: "登录", Icon: LogIn },
              { key: "register" as Mode, text: "注册", Icon: UserPlus2 },
            ].map(({ key, text, Icon }) => {
              const active = mode === key;
              return (
                <button
                  type="button"
                  key={key}
                  onClick={() => switchMode(key)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-medium text-sm transition ${
                    active
                      ? "bg-gradient-to-r from-brand-pink to-brand-pink-dark text-white shadow-md shadow-brand-pink/30"
                      : "text-brand-gray hover:text-brand-dark hover:bg-white/60"
                  }`}
                >
                  <Icon size={16} />
                  {text}
                </button>
              );
            })}
          </div>

          {/* 表单 */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative">
            {/* 注册：昵称 + 头像 */}
            {mode === "register" && (
              <>
                <label className="flex flex-col gap-1.5">
                  <span className="text-xs text-brand-gray flex items-center gap-1">
                    <User size={13} /> 昵称（2–20 个字符）
                  </span>
                  <input
                    className={inputBase}
                    placeholder="例如：小白的铲屎官"
                    value={nickname}
                    maxLength={20}
                    onChange={(e) => setNickname(e.target.value)}
                  />
                </label>

                {/* 头像上传（注册时可先选头像，压缩后作为 avatar 字段随用户一同写入） */}
                <AvatarUploader
                  avatarPreview={avatarPreview}
                  processing={avatarProcessing}
                  onPick={async (file) => {
                    setAvatarProcessing(true);
                    try {
                      const r = await compressAvatar(file, 160, 0.88);
                      if (!r.ok || !r.dataURL) {
                        setToast({ type: "error", msg: r.msg ?? "头像上传失败" });
                        return;
                      }
                      setAvatarPreview(r.dataURL);
                      setAvatarDataURL(r.dataURL);
                      setToast({ type: "success", msg: "✅ 头像已选好，提交注册后会与账号一同保存。" });
                    } finally {
                      setAvatarProcessing(false);
                    }
                  }}
                  onClear={() => {
                    setAvatarPreview("");
                    setAvatarDataURL("");
                  }}
                />
              </>
            )}

            {/* 邮箱 */}
            <label className="flex flex-col gap-1.5">
              <span className="text-xs text-brand-gray flex items-center gap-1">
                <Mail size={13} /> 邮箱（与桌面端一致）
              </span>
              <input
                className={inputBase}
                type="email"
                placeholder="example@xiaobai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={mode === "login" ? "email" : "off"}
              />
            </label>

            {/* 注册：邮箱验证码 */}
            {mode === "register" && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs text-brand-gray flex items-center gap-1">
                  <ShieldCheck size={13} /> 邮箱验证码（6 位数字，5 分钟内有效）
                </span>
                <div className="flex gap-2 items-stretch">
                  <input
                    className={inputBase}
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    placeholder="请输入6位验证码"
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, ""))}
                  />
                  <button
                    type="button"
                    disabled={emailCodeCountdown > 0 || submitting}
                    onClick={handleSendEmailCode}
                    className={`whitespace-nowrap px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                      emailCodeCountdown > 0
                        ? "bg-gray-50 border-gray-200 text-brand-gray/70 cursor-not-allowed"
                        : "bg-white border-pink-200 text-brand-pink hover:bg-pink-50 hover:shadow-md disabled:opacity-60"
                    }`}
                  >
                    {emailCodeCountdown > 0
                      ? `重新发送(${emailCodeCountdown}s)`
                      : "发送验证码"}
                  </button>
                </div>
                {emailCodeSent && (
                  <div className="text-[11px] text-brand-pink-dark/90 flex items-start gap-1 bg-pink-50/70 border border-pink-100 rounded-lg px-2.5 py-1.5">
                    <Sparkles size={12} className="mt-0.5 flex-shrink-0" />
                    <span>
                      模拟邮箱服务：本次验证码为
                      <span className="font-bold mx-1 select-all">{emailCodeSent}</span>
                      （实际上线后会替换为真实邮件发送，这里仅方便您在开发环境直接体验）
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* 密码 */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-brand-gray flex items-center gap-1">
                <Lock size={13} /> 密码
                {mode === "register" && (
                  <span className="text-[11px] text-brand-gray/70">
                    （≥8 位，需含大小写字母和数字，与桌面端一致）
                  </span>
                )}
              </span>
              <div className="relative">
                <input
                  className={inputBase + " pr-10"}
                  type={showPwd ? "text" : "password"}
                  placeholder={mode === "register" ? "例如：Abc12345" : "请输入登录密码"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  maxLength={32}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-gray hover:text-brand-pink transition"
                  tabIndex={-1}
                  aria-label={showPwd ? "隐藏密码" : "显示密码"}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* 注册：密码强度条 */}
              {mode === "register" && (
                <div className="flex flex-col gap-1">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[0, 1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full transition ${
                          i < pwdStrength ? strengthColors[pwdStrength] : "bg-gray-200"
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex justify-between text-[11px] text-brand-gray">
                    <span>强度：{strengthTexts[pwdStrength] || "未输入"}</span>
                    <span>进度 {pwdStrength * 25}%</span>
                  </div>
                </div>
              )}
            </div>

            {/* 注册：确认密码 */}
            {mode === "register" && (
              <label className="flex flex-col gap-1.5">
                <span className="text-xs text-brand-gray flex items-center gap-1">
                  <Lock size={13} /> 确认密码（必须与上面一致）
                </span>
                <input
                  className={inputBase}
                  type={showPwd ? "text" : "password"}
                  placeholder="请再次输入密码"
                  value={confirmPwd}
                  maxLength={32}
                  onChange={(e) => setConfirmPwd(e.target.value)}
                />
              </label>
            )}

            {/* 图形验证码（公共） */}
            <div className="flex flex-col gap-1.5">
              <span className="text-xs text-brand-gray flex items-center gap-1">
                <Sparkles size={13} /> 图形验证码（4 位，点击刷新，不区分大小写）
              </span>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  className={inputBase + " flex-1 min-w-[160px] max-w-[220px]"}
                  placeholder="请输入右侧图形码"
                  maxLength={4}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                />
                <CaptchaCanvas
                  refreshKey={captchaRefreshKey}
                  onChange={(cap: GraphCaptcha) => {
                    setCaptchaId(cap.id);
                    // 刷新图片时自动清空输入框，保留错误计数，避免用户通过刷新图片绕过计数
                    setCaptchaInput("");
                  }}
                />
              </div>
              <div className="text-[11px] text-brand-gray/80 flex items-center gap-1">
                <RefreshCw size={11} />
                图形验证码连续错误 ≥ 2 次，将升级为「拼图滑块验证」
                （与桌面端规格完全一致）
              </div>
            </div>

            {/* 滑块验证（needSlider=true 时显示，或注册时为了安全也默认显示注册需满足的滑块） */}
            {(needSlider || mode === "register") && (
              <div className="p-3 rounded-2xl bg-pink-50/60 border border-pink-100 flex flex-col gap-2">
                <div className="text-xs text-brand-gray flex items-center gap-1">
                  <Puzzle size={13} />
                  <span className="font-medium text-brand-dark">
                    {needSlider ? "图形验证码错误次数过多，请先通过滑块验证" : "真人验证：拼图滑块（注册安全校验）"}
                  </span>
                  {sliderPassed && (
                    <span className="ml-auto text-green-600 inline-flex items-center gap-1">
                      <CheckCircle size={13} />
                      已通过
                    </span>
                  )}
                </div>
                <SliderCaptcha
                  resetKey={sliderResetKey}
                  onPassed={() => {
                    setSliderPassed(true);
                    setToast({ type: "success", msg: "拼图验证通过，您是真人！请继续提交表单。" });
                  }}
                  onFailed={(m) => {
                    setSliderPassed(false);
                    setToast({ type: "error", msg: m });
                  }}
                />
              </div>
            )}

            {/* 登录：记住登录状态 */}
            {mode === "login" && (
              <label className="flex items-center gap-2 select-none cursor-pointer text-sm text-brand-dark">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-brand-pink"
                />
                记住登录状态（勾选后会话 7 天有效；不勾选则 1 天有效，与桌面端一致）
              </label>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={submitting || (mode === "register" && !sliderPassed)}
              className="mt-1 w-full py-3 rounded-2xl text-white font-semibold bg-gradient-to-r from-brand-pink to-brand-pink-dark shadow-lg shadow-brand-pink/30 hover:shadow-brand-pink/50 hover:scale-[1.01] active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  {mode === "login" ? "正在登录..." : "正在注册..."}
                </>
              ) : mode === "login" ? (
                <>
                  <LogIn size={16} /> 登录小白官方网站
                </>
              ) : (
                <>
                  <UserPlus2 size={16} /> 创建账号（与桌面端小白互通）
                </>
              )}
            </button>

            {/* 底部切换说明 */}
            <div className="text-center text-sm text-brand-gray">
              {mode === "login" ? (
                <>
                  还没有账号？
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="ml-1 text-brand-pink hover:text-brand-pink-dark font-medium underline-offset-2 hover:underline"
                  >
                    立即注册
                  </button>
                </>
              ) : (
                <>
                  已经有账号？
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="ml-1 text-brand-pink hover:text-brand-pink-dark font-medium underline-offset-2 hover:underline"
                  >
                    立即登录
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        {/* 底部小提示：同步说明 */}
        <div className="mt-6 text-center text-xs text-brand-gray/80">
          🌐 本页登录接口使用与桌面端完全相同的校验规则与数据格式，网站与桌面端共用同一套账号体系。
        </div>
      </div>
    </div>
  );
}
