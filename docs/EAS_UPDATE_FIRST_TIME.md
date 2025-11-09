# EAS Update 首次使用指南

## 问题

运行 `eas update:list --branch production` 时出现错误：
```
Could not find branch "production"
```

## 原因

EAS Update 的分支（branch）是在第一次发布更新时自动创建的。如果分支不存在，需要先发布一个更新。

## 解决方案

### 方法 1：直接发布更新（推荐）

直接发布一个更新，这会自动创建分支：

```bash
# 发布到生产环境（会自动创建 production 分支）
eas update --branch production --message "首次更新"

# 发布到预览环境（会自动创建 preview 分支）
eas update --branch preview --message "测试更新"
```

### 方法 2：查看所有分支

查看当前有哪些分支：

```bash
# 查看所有分支
eas update:list

# 或者
eas branch:list
```

## 完整流程

### 第一次使用 EAS Update

1. **确保已登录 Expo 账户**
   ```bash
   eas login
   ```

2. **发布第一个更新（创建分支）**
   ```bash
   eas update --branch production --message "初始化更新"
   ```

3. **查看更新列表**
   ```bash
   eas update:list --branch production
   ```

### 后续使用

之后就可以正常使用所有命令了：

```bash
# 发布更新
eas update --branch production --message "更新说明"

# 查看更新列表
eas update:list --branch production

# 回滚更新
eas update:rollback --branch production
```

## 注意事项

1. **分支名称**：分支名称可以自定义，不一定是 `production` 或 `preview`
2. **首次发布**：第一次发布更新时，分支会自动创建
3. **构建关联**：如果 APK 构建时指定了 `channel`，更新会关联到对应的分支

## 构建时指定通道

如果要在构建 APK 时指定更新通道，可以在 `eas.json` 中配置：

```json
{
  "build": {
    "production": {
      "android": {
        "channel": "production"
      }
    },
    "preview": {
      "android": {
        "channel": "preview"
      }
    }
  }
}
```

这样构建的 APK 会自动关联到对应的更新通道。

