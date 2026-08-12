#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 未安装。请先在 Termux 执行: pkg install nodejs git"
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "npm 未安装。请先安装 Termux 的 Node.js/npm。"
  exit 1
fi

PLATFORM="$(node -p 'process.platform')"
ARCH="$(node -p 'process.arch')"

if [[ "$PLATFORM" != "android" || "$ARCH" != "arm64" ]]; then
  echo "setup-termux.sh 仅用于 Android arm64 Termux。当前平台: ${PLATFORM} ${ARCH}"
  exit 1
fi

CACHE_DIR="${ROGUE_DEFENSE_NPM_CACHE:-$HOME/.npm-cache-rogue-defense}"
mkdir -p "$CACHE_DIR"
npm config set cache "$CACHE_DIR"

# Termux/Android compatibility:
# - TypeScript 7 currently expects a native android-arm64 compiler package that is not published.
# - Vite 8/Rolldown needs the Android arm64 native binding explicitly on Termux.
# Keep package.json unchanged for desktop/CI and install these Termux-only versions locally.
rm -rf node_modules
npm install \
  --include=optional \
  --no-save \
  --package-lock=false \
  typescript@6.0.3 \
  @rolldown/binding-android-arm64@1.1.5

echo "Platform: $(node -p "process.platform + ' ' + process.arch")"
echo "TypeScript: $(node -p "require('./node_modules/typescript/package.json').version")"
echo "Rolldown Android binding: $(node -p "require('./node_modules/@rolldown/binding-android-arm64/package.json').version")"

npm run build

echo
echo "Termux 环境已准备完成。"
echo "开发启动: npm run dev:lan"
echo "本机 DEV:  http://127.0.0.1:5173/?dev=1"
