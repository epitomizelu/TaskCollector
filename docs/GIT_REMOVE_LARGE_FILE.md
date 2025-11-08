# 从 Git 历史中删除大文件

## 问题
GitHub 限制单个文件大小为 100MB，如果历史记录中包含超过 100MB 的文件，即使已经删除，推送时仍会报错。

## 解决方案

### 1. 从 Git 历史中完全删除文件

```bash
# 使用 git filter-branch 从所有历史中删除文件
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch test-app-release.apk" --prune-empty --tag-name-filter cat -- --all
```

### 2. 清理备份引用

```bash
# 删除 filter-branch 创建的备份引用
git update-ref -d refs/original/refs/heads/main

# 清理 reflog
git reflog expire --expire=now --all

# 强制垃圾回收
git gc --prune=now --aggressive
```

### 3. 验证文件已删除

```bash
# 检查文件是否还在历史中（应该没有输出）
git log --all --full-history --oneline -- test-app-release.apk
```

### 4. 强制推送（⚠️ 注意：会覆盖远程历史）

```bash
# 强制推送，覆盖远程历史
git push origin main --force
```

## 注意事项

1. **强制推送会覆盖远程历史**，如果有其他人也在使用这个仓库，需要先通知他们
2. **确保 `.gitignore` 包含 `.apk`**，避免再次提交大文件
3. **如果文件很大，清理可能需要一些时间**

## 预防措施

1. 在 `.gitignore` 中添加：
   ```
   *.apk
   *.aab
   ```

2. 使用 GitHub Actions 上传构建产物，而不是提交到仓库

3. 如果必须提交大文件，使用 Git LFS（Large File Storage）

