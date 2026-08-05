#!/usr/bin/env bash
#
# build_macos.sh
# ---------------
# 在 macOS 机器上一键构建小白桌面宠物：
#   1) 检查 Python3 / Node（create-dmg 可选）
#   2) 安装依赖（requirements + PyInstaller + Pillow 等）
#   3) 自动生成 .icns 图标（如果能找到 1024x1024 PNG）
#   4) PyInstaller 打包 -> 生成 dist/智能桌面宠物-小白.app
#   5) codesign 签名（有证书用证书，没有用 ad-hoc -s -）
#   6) create-dmg 生成最终 .dmg 安装包
#   7) 计算 .dmg 的 SHA256
#
# 使用方式：
#   # 最简单：
#   bash scripts/build_macos.sh
#
#   # 指定版本 + 开发者证书：
#   XIAOBAI_VERSION=0.6.0 \
#   XIAOBAI_CODESIGN_ID="Developer ID Application: XXX (TEAMID)" \
#   bash scripts/build_macos.sh
#
set -euo pipefail

# ---------- 0. 定位路径 ----------
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
REPO_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"         # Smart-Desktop-Pet-White/
SRC_DIR="$REPO_ROOT/小白-源代码"
SPEC_FILE="$SRC_DIR/小白-macOS.spec"

echo "=============================================="
echo "🐶 小白 macOS 构建脚本启动"
echo "  REPO_ROOT=$REPO_ROOT"
echo "  SRC_DIR=$SRC_DIR"
echo "=============================================="

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "❌ 该脚本只能在 macOS 上运行，当前系统：$(uname -s)" >&2
  exit 1
fi

if [[ ! -f "$SPEC_FILE" ]]; then
  echo "❌ 找不到 .spec：$SPEC_FILE" >&2
  exit 1
fi

cd "$SRC_DIR"

# ---------- 1. 版本 / 环境变量 ----------
export XIAOBAI_VERSION="${XIAOBAI_VERSION:-0.6.0}"
export XIAOBAI_BUNDLE_ID="${XIAOBAI_BUNDLE_ID:-com.xushen.smartpet.xiaobai}"
APP_NAME="智能桌面宠物-小白"
APP_BUNDLE="dist/${APP_NAME}.app"
DMG_NAME="${APP_NAME}-${XIAOBAI_VERSION}-macOS.dmg"
DMG_PATH="dist/${DMG_NAME}"
PY="${PYTHON:-python3}"

echo "版本号：${XIAOBAI_VERSION}"
echo "使用 Python：$($PY --version)"

# ---------- 2. 创建 venv ----------
if [[ ! -d ".venv" ]]; then
  echo "🌟 第一次运行，创建虚拟环境 .venv ..."
  "$PY" -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

# ---------- 3. 安装依赖 ----------
echo "📦 安装/更新 PyPI 依赖（含 PyInstaller、Pillow）..."
python -m pip install --upgrade pip
python -m pip install --upgrade setuptools wheel

# 使用国内镜像（可选，需要可取消注释）：
# python -m pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple

if [[ -f "requirements.txt" ]]; then
  python -m pip install -r requirements.txt || true
fi
python -m pip install --upgrade pyinstaller pillow pyobjc-framework-Quartz

# ---------- 4. 生成 .icns 图标（如果能找到 PNG 源） ----------
ICNS_TARGET="$SRC_DIR/_macos/AppIcon.icns"
mkdir -p "$SRC_DIR/_macos"

ICON_PNG_CANDIDATES=(
  "$REPO_ROOT/public/installer.png"
  "$REPO_ROOT/src/assets/installer.png"
  "$REPO_ROOT/安装包.ico"
  "$REPO_ROOT/public/portable.png"
)
FOUND_PNG=""
for c in "${ICON_PNG_CANDIDATES[@]}"; do
  if [[ -f "$c" ]]; then FOUND_PNG="$c"; break; fi
done

if [[ -n "$FOUND_PNG" ]]; then
  echo "🎨 找到图标源文件：$FOUND_PNG，自动生成 .icns ..."
  ICONSET_DIR="$SRC_DIR/_macos/AppIcon.iconset"
  rm -rf "$ICONSET_DIR" && mkdir -p "$ICONSET_DIR"

  # 用 Pillow 把任意大小 PNG 缩放到 1024，然后再生成各尺寸
  python - "$FOUND_PNG" "$ICONSET_DIR" <<'PY'
from PIL import Image
import sys, os

src, out_dir = sys.argv[1], sys.argv[2]
img = Image.open(src).convert("RGBA")
# 先生成 1024
big = img.resize((1024, 1024), Image.LANCZOS)
sizes = [
    (16, "icon_16x16.png"),
    (32, "icon_16x16@2x.png"),
    (32, "icon_32x32.png"),
    (64, "icon_32x32@2x.png"),
    (128, "icon_128x128.png"),
    (256, "icon_128x128@2x.png"),
    (256, "icon_256x256.png"),
    (512, "icon_256x256@2x.png"),
    (512, "icon_512x512.png"),
    (1024, "icon_512x512@2x.png"),
]
for (sz, name) in sizes:
    im = big.resize((sz, sz), Image.LANCZOS)
    im.save(os.path.join(out_dir, name))
PY

  iconutil -c icns "$ICONSET_DIR" -o "$ICNS_TARGET" || {
    echo "⚠️  iconutil 失败，跳过 .icns，继续打包"
    ICNS_TARGET=""
  }
fi

if [[ -n "$ICNS_TARGET" && -f "$ICNS_TARGET" ]]; then
  export XIAOBAI_ICON_ICNS="$ICNS_TARGET"
  echo "✅ 使用 .icns：$XIAOBAI_ICON_ICNS"
fi

# ---------- 5. PyInstaller 打包 ----------
echo "🔥 运行 PyInstaller ..."
rm -rf build dist
pyinstaller "$SPEC_FILE" --clean --noconfirm

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "❌ 生成 App 失败：找不到 $APP_BUNDLE" >&2
  exit 1
fi

# ---------- 6. 签名 ----------
SIGN_ID="${XIAOBAI_CODESIGN_ID:-}"
if [[ -z "$SIGN_ID" ]]; then
  echo "🖊️  未指定开发者证书，使用 ad-hoc 签名（codesign -s -）..."
  codesign --force --deep --sign - --entitlements /dev/null "$APP_BUNDLE" || true
else
  echo "🖊️  使用证书签名：$SIGN_ID"
  codesign --force --deep --sign "$SIGN_ID" --timestamp --options runtime "$APP_BUNDLE"
fi

# 验证签名结果
codesign --verify --deep --verbose=1 "$APP_BUNDLE" || true

# ---------- 7. 制作 DMG ----------
echo "📀 生成 DMG：$DMG_PATH"
mkdir -p dist

# 优先用 create-dmg（brew install create-dmg），否则用 hdiutil 原生命令
if command -v create-dmg >/dev/null 2>&1; then
  create-dmg \
    --volname "${APP_NAME} ${XIAOBAI_VERSION}" \
    --window-pos 200 120 \
    --window-size 720 480 \
    --icon-size 128 \
    --icon "${APP_NAME}.app" 180 200 \
    --app-drop-link 540 200 \
    --no-internet-enable \
    "$DMG_PATH" \
    "$APP_BUNDLE"
else
  echo "ℹ️  未安装 create-dmg（brew install create-dmg），用 hdiutil 原生方式..."
  TMP_DMG="dist/_tmp.dmg"
  SRC_DIR_DMG="dist/_dmgroot"
  rm -rf "$SRC_DIR_DMG" && mkdir -p "$SRC_DIR_DMG"
  cp -R "$APP_BUNDLE" "$SRC_DIR_DMG/"
  ln -s /Applications "$SRC_DIR_DMG/Applications"
  hdiutil create -volname "${APP_NAME} ${XIAOBAI_VERSION}" \
    -srcfolder "$SRC_DIR_DMG" \
    -ov -format UDZO -imagekey zlib-level=9 \
    "$TMP_DMG"
  mv "$TMP_DMG" "$DMG_PATH"
  rm -rf "$SRC_DIR_DMG"
fi

# ---------- 8. 计算 SHA256 ----------
SHA256="$(shasum -a 256 "$DMG_PATH" | awk '{print $1}')"
echo "$SHA256  $(basename "$DMG_PATH")" > "${DMG_PATH}.sha256"

# ---------- 9. 打印构建结果 ----------
echo ""
echo "=============================================="
echo "✅ 构建完成！以下是产物："
echo "  App Bundle  : $SRC_DIR/$APP_BUNDLE"
echo "  DMG 安装包  : $SRC_DIR/$DMG_PATH"
echo "  SHA256 校验 : $SHA256"
echo "  校验文件    : ${DMG_PATH}.sha256"
echo "=============================================="
echo "小提示："
echo "  1) 没签名的 DMG 首次安装后，右键 App → 打开即可允许运行"
echo "  2) 或执行：xattr -rd com.apple.quarantine \"$HOME/Applications/${APP_NAME}.app\""
echo "  3) 把上述 SHA256 粘贴到官网 content.ts -> releaseChecksums 即可同步到下载页"
