# 版本号在 Git 中的保存位置

## 保存位置

### 文件位置
版本号保存在 **`app.json`** 文件中，具体字段：
- `expo.version` - 版本号（如 "1.0.0"）
- `expo.android.versionCode` - Android 版本代码（如 1）

### Git 分支
版本号会提交到**触发工作流的分支**：

**APK 构建工作流：**
- 触发方式：手动触发（`workflow_dispatch`）
- 提交分支：触发工作流时所在的分支（通常是 `main`）

**OTA 更新工作流：**
- 触发方式：
  - 手动触发（`workflow_dispatch`）→ 提交到触发时所在的分支
  - 自动触发（`push` 到 `main`）→ 提交到 `main` 分支

### 提交信息
```
chore: 自动更新版本号 [skip ci]
```

**说明：**
- `[skip ci]` 标记防止触发其他工作流（避免循环触发）
- 提交者：`GitHub Action <action@github.com>`

## 查看版本号历史

### 在 GitHub 上查看

1. **查看文件历史：**
   - 访问 `app.json` 文件
   - 点击 "History" 查看提交历史
   - 查找提交信息包含 "自动更新版本号" 的提交

2. **查看提交历史：**
   ```
   https://github.com/<用户名>/<仓库名>/commits/<分支名>
   ```
   筛选提交信息包含 "自动更新版本号"

### 使用 Git 命令查看

```bash
# 查看 app.json 的提交历史
git log --oneline --follow app.json

# 查看包含版本号更新的提交
git log --oneline --grep="自动更新版本号"

# 查看特定版本的 app.json 内容
git show <commit-hash>:app.json

# 查看版本号的变化
git log -p app.json | grep -A 2 -B 2 "version"
```

## 工作流执行流程

### APK 构建流程

```
1. 手动触发工作流
   ↓
2. Checkout 代码（当前分支，通常是 main）
   ↓
3. 更新 app.json 中的版本号
   ↓
4. 提交到 Git（当前分支）
   ↓
5. 构建 APK
```

### OTA 更新流程

**手动触发：**
```
1. 手动触发工作流
   ↓
2. Checkout 代码（当前分支，通常是 main）
   ↓
3. 更新 app.json 中的版本号
   ↓
4. 提交到 Git（当前分支）
   ↓
5. 发布 OTA 更新
```

**自动触发：**
```
1. Push 代码到 main 分支
   ↓
2. 自动触发工作流
   ↓
3. Checkout main 分支
   ↓
4. 更新 app.json 中的版本号
   ↓
5. 提交到 main 分支
   ↓
6. 发布 OTA 更新
```

## 注意事项

1. **分支保护：**
   - 如果设置了分支保护规则，可能需要管理员权限才能推送
   - 建议为 GitHub Actions 配置适当的权限

2. **权限配置：**
   - 工作流使用 `GITHUB_TOKEN` 进行推送
   - 确保仓库设置中允许 Actions 写入权限

3. **冲突处理：**
   - 如果版本号已被手动修改，工作流会检测到并跳过提交
   - 如果推送失败，不会中断工作流（使用 `|| echo` 处理）

4. **查看当前版本：**
   ```bash
   # 查看当前版本号
   node -p "require('./app.json').expo.version"
   
   # 查看当前 versionCode
   node -p "require('./app.json').expo.android.versionCode"
   ```

## 示例

### 查看最近的版本号更新

```bash
# 查看最近的 5 次版本号更新
git log --oneline --grep="自动更新版本号" -5

# 输出示例：
# abc1234 chore: 自动更新版本号 [skip ci]
# def5678 chore: 自动更新版本号 [skip ci]
# ghi9012 chore: 自动更新版本号 [skip ci]
```

### 查看版本号变化详情

```bash
# 查看特定提交的版本号变化
git show abc1234:app.json | grep -A 1 "version"

# 对比两个提交之间的版本号变化
git diff commit1 commit2 -- app.json
```

