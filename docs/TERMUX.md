# Termux / Android arm64 开发环境

本项目以 Web 为主，桌面与 CI 使用 `package.json` 中的标准工具链。Android arm64 的 Termux 需要一层本地兼容处理。

## 当前兼容策略

仓库保留桌面/CI 的 TypeScript 7 与 Vite 8 配置；Termux 初始化脚本只在本地 `node_modules` 中安装：

- `typescript@6.0.3`
- `@rolldown/binding-android-arm64@1.1.5`

原因：

- TypeScript 7 当前会在 Android arm64 上寻找 `@typescript/typescript-android-arm64`，但该平台编译器包未发布；
- Vite 8 使用 Rolldown，Termux 需要显式安装 Android arm64 native binding；
- 这些修改不写回 `package.json`，避免改变桌面和 GitHub Actions 的正式工具链。

## 全新 Termux 初始化

先安装基础环境：

```bash
pkg update -y
pkg install -y git nodejs
```

确认平台：

```bash
node -v
npm -v
node -p "process.platform + ' ' + process.arch"
```

Android arm64 应输出类似：

```text
android arm64
```

拉取并初始化：

```bash
git clone https://github.com/7015725/rogue-defense.git
cd rogue-defense
npm run setup:termux
```

脚本会：

1. 校验当前平台为 Android arm64；
2. 使用项目独立 npm cache：`~/.npm-cache-rogue-defense`；
3. 清理旧 `node_modules`；
4. 本地安装 TypeScript 6.0.3 与 Rolldown Android arm64 binding；
5. 执行 `npm run build` 验证环境。

## 启动开发服务器

```bash
npm run dev:lan
```

同一台 Android 设备浏览器：

```text
http://127.0.0.1:5173/
http://127.0.0.1:5173/?dev=1
```

同一局域网其他设备使用 Vite 输出的 LAN 地址，例如：

```text
http://192.168.x.x:5173/
```

## Production 本地预览

```bash
npm run build
npm run preview:lan
```

浏览器：

```text
http://127.0.0.1:4173/
http://127.0.0.1:4173/?dev=1
```

## 更新代码

正常情况下：

```bash
git pull --ff-only origin main
npm run setup:termux
```

如果依赖版本没有变化，也可以直接尝试：

```bash
git pull --ff-only origin main
npm run dev:lan
```

当 `package.json`、Vite、TypeScript 或 Rolldown 版本变化时，建议重新执行 `npm run setup:termux`。

## 注意事项

- 不要在 Termux 中执行普通 `npm install -D typescript@...` 并提交由此产生的 `package.json` 修改；Termux 兼容版本应由初始化脚本管理。
- 如果再次出现 npm cache 的 `EACCES` / `EEXIST`，初始化脚本会使用独立缓存目录绕开旧的 `~/.npm/_cacache`。
- `npm install` 可能把本地 TypeScript 恢复为 `package.json` 中的桌面/CI 版本；若随后构建出现 Android TypeScript native package 错误，重新执行 `npm run setup:termux`。
- Termux 本地运行主要用于 Android Chrome、Touch、布局、长局和性能实机测试；GitHub Actions 仍负责正式 Web RC 构建与自动 Gate。
