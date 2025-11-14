# EAS OTA 更新判断依据

## 📋 概述

EAS Updates 在检查更新时，会根据多个条件来判断是否有可用的更新。只有当所有条件都匹配时，才会认为有可用更新。

## 🔍 判断依据（必须全部匹配）

### 1. **runtimeVersion（运行时版本）** ⭐ 最重要

**作用：** 确保更新与 APK 的运行时环境兼容

**当前配置：**
```json
{
  "runtimeVersion": {
    "policy": "appVersion"
  }
}
```

**说明：**
- `policy: "appVersion"` 表示使用 `app.json` 中的 `version` 字段作为运行时版本
- 当前版本：`"1.0.1"`（来自 `app.json` 的 `version` 字段）

**匹配规则：**
- ✅ **必须完全匹配**：APK 的 runtimeVersion 必须与更新发布的 runtimeVersion 完全一致
- ❌ **不匹配示例**：
  - APK: `runtimeVersion = "1.0.0"`
  - 更新: `runtimeVersion = "1.0.1"` 
  - 结果：**不会匹配，不会更新**

**重要：**
- 如果修改了原生代码、添加了新的原生模块、或修改了 `app.json` 中的原生配置，需要更新 `version` 并重新构建 APK
- 如果只修改了 JS 代码，`version` 不变，可以直接发布 OTA 更新

---

### 2. **channel（更新通道）** ⭐ 必须匹配

**作用：** 区分不同环境的更新（生产、预览、测试等）

**当前配置：**
- APK 构建时：`eas.json` 中 `build.preview.android.channel = "preview"` 或 `build.production.android.channel = "production"`
- 更新发布时：`eas update --branch production` 或 `eas update --branch preview`

**匹配规则：**
- ✅ **必须完全匹配**：APK 的 channel 必须与更新发布的 channel 完全一致
- ❌ **不匹配示例**：
  - APK: `channel = "preview"`
  - 更新: `channel = "production"`
  - 结果：**不会匹配，不会更新**

**通道对应关系：**
```
APK 构建时          →  更新发布时
build.preview       →  eas update --branch preview
build.production    →  eas update --branch production
```

---

### 3. **platform（平台）** ⭐ 自动匹配

**作用：** 区分 Android 和 iOS 平台

**匹配规则：**
- ✅ **自动匹配**：根据应用运行的平台自动匹配
- Android 应用只会收到 Android 更新
- iOS 应用只会收到 iOS 更新

**当前配置：**
- 平台：`android`（从 `Platform.OS` 自动获取）

---

### 4. **projectId（项目ID）** ⭐ 必须匹配

**作用：** 确保更新属于正确的项目

**当前配置：**
```json
{
  "extra": {
    "eas": {
      "projectId": "6871505d-550b-4d0e-8e87-b6537f15a5b4"
    }
  }
}
```

**匹配规则：**
- ✅ **必须完全匹配**：APK 的 projectId 必须与更新发布的 projectId 完全一致
- ❌ **不匹配示例**：
  - APK: `projectId = "xxx"`
  - 更新: `projectId = "yyy"`
  - 结果：**不会匹配，不会更新**

---

## 🔄 更新检查流程

### 步骤 1：应用启动时检查

```typescript
// app/_layout.tsx
useEffect(() => {
  const checkForUpdates = async () => {
    // 延迟 2 秒后检查
    updateService.checkForUpdate();
  };
  const timer = setTimeout(checkForUpdates, 2000);
}, []);
```

### 步骤 2：发送更新检查请求

应用会向 EAS Updates 服务器发送请求，包含以下信息：

```http
GET https://u.expo.dev/6871505d-550b-4d0e-8e87-b6537f15a5b4
Headers:
  expo-runtime-version: "1.0.1"        ← 来自 app.json version
  expo-channel-name: "preview"          ← 来自 APK 构建时的 channel
  expo-platform: "android"             ← 自动检测
```

### 步骤 3：服务器匹配更新

EAS Updates 服务器会查找满足以下条件的更新：

1. ✅ `runtimeVersion = "1.0.1"`（必须完全匹配）
2. ✅ `channel = "preview"`（必须完全匹配）
3. ✅ `platform = "android"`（自动匹配）
4. ✅ `projectId = "6871505d-550b-4d0e-8e87-b6537f15a5b4"`（必须完全匹配）
5. ✅ 更新时间晚于当前已安装的更新

### 步骤 4：返回结果

- **有匹配的更新**：返回 `isAvailable: true`，并下载更新
- **无匹配的更新**：返回 `isAvailable: false`

---

## 📊 匹配示例

### ✅ 示例 1：匹配成功

**APK 信息：**
- `runtimeVersion`: `"1.0.1"`
- `channel`: `"production"`
- `platform`: `"android"`
- `projectId`: `"6871505d-550b-4d0e-8e87-b6537f15a5b4"`

**已发布的更新：**
- `runtimeVersion`: `"1.0.1"` ✅
- `channel`: `"production"` ✅
- `platform`: `"android"` ✅
- `projectId`: `"6871505d-550b-4d0e-8e87-b6537f15a5b4"` ✅
- `createdAt`: `2025-01-15 10:00:00`（比当前更新新）

**结果：** ✅ **匹配，会更新**

---

### ❌ 示例 2：runtimeVersion 不匹配

**APK 信息：**
- `runtimeVersion`: `"1.0.0"`

**已发布的更新：**
- `runtimeVersion`: `"1.0.1"` ❌

**结果：** ❌ **不匹配，不会更新**

**原因：** runtimeVersion 必须完全匹配。如果 APK 是 `1.0.0`，而更新是 `1.0.1`，不会匹配。

**解决方案：**
1. 重新构建 APK，使用 `version: "1.0.1"`
2. 或者发布更新时使用 `runtimeVersion: "1.0.0"`

---

### ❌ 示例 3：channel 不匹配

**APK 信息：**
- `channel`: `"preview"`

**已发布的更新：**
- `channel`: `"production"` ❌

**结果：** ❌ **不匹配，不会更新**

**原因：** channel 必须完全匹配。预览版 APK 不会收到生产版更新。

**解决方案：**
1. 使用预览版 APK，发布更新到 `preview` 通道：`eas update --branch preview`
2. 或者重新构建生产版 APK，发布更新到 `production` 通道

---

### ❌ 示例 4：projectId 不匹配

**APK 信息：**
- `projectId`: `"6871505d-550b-4d0e-8e87-b6537f15a5b4"`

**已发布的更新：**
- `projectId`: `"other-project-id"` ❌

**结果：** ❌ **不匹配，不会更新**

**原因：** projectId 必须完全匹配。不同项目的更新不会互相影响。

---

## 🎯 实际应用场景

### 场景 1：只修改 JS 代码（推荐使用 OTA）

**操作：**
1. 修改 JS 代码
2. **不修改** `app.json` 中的 `version`
3. 发布更新：`eas update --branch production --message "修复 bug"`

**结果：**
- ✅ runtimeVersion 匹配（都是 `"1.0.1"`）
- ✅ channel 匹配
- ✅ 更新成功

---

### 场景 2：修改原生代码（必须重新构建 APK）

**操作：**
1. 修改原生代码或 `app.json` 配置
2. **修改** `app.json` 中的 `version`: `"1.0.1"` → `"1.0.2"`
3. 重新构建 APK：`eas build --platform android --profile production`
4. 之后可以继续使用 OTA 更新（只要 `version` 不变）

**结果：**
- ✅ 新 APK 的 runtimeVersion 是 `"1.0.2"`
- ✅ 之后发布的 OTA 更新必须使用 `runtimeVersion: "1.0.2"`

---

### 场景 3：测试环境更新

**操作：**
1. 构建预览版 APK：`eas build --platform android --profile preview`
   - APK 的 channel 是 `"preview"`
2. 发布测试更新：`eas update --branch preview --message "测试新功能"`

**结果：**
- ✅ 预览版 APK 会收到更新
- ❌ 生产版 APK 不会收到更新（channel 不匹配）

---

## ⚠️ 常见问题

### Q1: 为什么更新检查返回 "没有可用更新"？

**可能原因：**
1. ❌ runtimeVersion 不匹配
2. ❌ channel 不匹配
3. ❌ 没有发布更新到对应通道
4. ❌ 更新发布时间早于当前已安装的更新

**检查方法：**
```bash
# 查看已发布的更新
eas update:list --branch production

# 检查 APK 的 runtimeVersion 和 channel
# 在应用中查看：updateService.getUpdateInfo()
```

---

### Q2: 如何确保更新能匹配？

**检查清单：**
- [ ] APK 的 `runtimeVersion` 与更新发布的 `runtimeVersion` 一致
- [ ] APK 的 `channel` 与更新发布的 `channel` 一致
- [ ] APK 的 `projectId` 与更新发布的 `projectId` 一致
- [ ] 已发布更新到正确的通道：`eas update --branch <channel>`

---

### Q3: 修改了 `version` 后还能使用 OTA 吗？

**答案：** 可以，但需要重新构建 APK。

**流程：**
1. 修改 `app.json` 中的 `version`: `"1.0.1"` → `"1.0.2"`
2. 重新构建 APK（新的 runtimeVersion 是 `"1.0.2"`）
3. 之后发布的 OTA 更新必须使用 `runtimeVersion: "1.0.2"`

---

## 📝 总结

**EAS OTA 更新判断依据（必须全部匹配）：**

1. ✅ **runtimeVersion** - 必须完全匹配（最重要）
2. ✅ **channel** - 必须完全匹配
3. ✅ **platform** - 自动匹配
4. ✅ **projectId** - 必须完全匹配
5. ✅ **更新时间** - 必须比当前更新新

**关键点：**
- runtimeVersion 是判断更新的核心依据
- channel 用于区分不同环境的更新
- 所有条件必须同时满足才会匹配
- 不匹配时不会更新，也不会报错（静默失败）

**最佳实践：**
- 只修改 JS 代码时，保持 `version` 不变，直接发布 OTA 更新
- 修改原生代码时，更新 `version` 并重新构建 APK
- 使用不同的 channel 来区分生产、预览、测试环境

