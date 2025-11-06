# 快速配置环境变量

## 🚀 三步配置 API Key

### 第一步：创建 `.env` 文件

在项目根目录创建 `.env` 文件：

```bash
# Windows PowerShell
New-Item .env -ItemType File

# 或使用文本编辑器直接创建
```

### 第二步：添加 API Key

在 `.env` 文件中添加：

```env
EXPO_PUBLIC_API_KEY=你的API密钥
```

**重要：**
- 将 `你的API密钥` 替换为实际的 API Key
- 不要加引号
- 不要有空格

### 第三步：重启服务器

```bash
# 停止当前服务器（按 Ctrl+C）
# 然后重新启动
npm start
```

## ✅ 验证配置

在浏览器控制台运行：

```javascript
console.log(process.env.EXPO_PUBLIC_API_KEY);
```

如果显示你的 API Key，说明配置成功！

## 📝 完整示例

`.env` 文件内容：

```env
EXPO_PUBLIC_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6
```

## ⚠️ 注意事项

1. `.env` 文件已添加到 `.gitignore`，不会被提交到 Git
2. 不要将 API Key 硬编码在代码中
3. 不同环境使用不同的 API Key

## 🔗 详细文档

查看 `docs/ENV_VARIABLES_GUIDE.md` 了解更多配置选项。

