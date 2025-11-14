# APP 端 EAS OTA 更新触发指南

## 📋 概述

本文档说明如何在应用端触发 EAS OTA 更新，包括自动触发和手动触发两种方式。

## 🎯 触发方式

### 方式 1：自动触发（推荐）✅

**应用启动时自动检查并应用更新**

#### 实现位置
- 文件：`app/_layout.tsx`
- 代码位置：第 18-37 行

#### 工作流程
1. 应用启动后延迟 2 秒（确保应用已完全启动）
2. 静默检查 EAS OTA 更新（不阻塞应用启动）
3. 如果发现更新，自动下载
4. 下载完成后，下次启动应用时自动应用更新

#### 代码实现
```typescript
// app/_layout.tsx
useEffect(() => {
  const checkForUpdates = async () => {
    try {
      // 静默检查 EAS OTA 更新，不阻塞应用启动
      updateService.checkForUpdate().catch(error => {
        console.error('[RootLayout] EAS OTA 更新检查失败:', error);
      });
    } catch (error) {
      console.error('[RootLayout] 更新检查异常:', error);
    }
  };

  // 延迟检查，确保应用已启动
  const timer = setTimeout(checkForUpdates, 2000);
  return () => clearTimeout(timer);
}, []);
```

#### 特点
- ✅ 无需用户操作，自动检查
- ✅ 静默检查，不阻塞应用启动
- ✅ 自动下载更新
- ✅ 下载完成后，下次启动自动应用

---

### 方式 2：手动触发（用于测试或立即应用）🔧

**通过"检查更新"页面手动触发**

#### 页面位置
- 路由：`/app-update`
- 文件：`app/app-update.tsx` → `screens/app-update/index.tsx`

#### 操作步骤
1. 打开应用的"检查更新"页面
2. 点击"检查更新"按钮
3. 系统会检查所有类型的更新（EAS OTA、JS Bundle OTA、APK）
4. 如果有 EAS OTA 更新，会显示蓝色的"EAS OTA 更新"卡片
5. 点击"应用 EAS OTA 更新"按钮
6. 确认后，应用会自动下载并重启以应用更新

#### UI 界面
- **EAS OTA 更新卡片**（蓝色）
  - 图标：☁️ 云下载
  - 显示更新状态和说明
  - "应用 EAS OTA 更新"按钮

#### 代码实现
```typescript
// screens/app-update/index.tsx

// 1. 检查更新
const handleCheckUpdate = async () => {
  const unifiedInfo = await unifiedUpdateService.checkForUpdates();
  setUnifiedUpdateInfo(unifiedInfo);
};

// 2. 应用 EAS OTA 更新
const handleApplyEASOTAUpdate = async () => {
  Alert.alert(
    '应用 EAS OTA 更新',
    '应用将重启以应用更新，是否继续？',
    [
      { text: '取消', style: 'cancel' },
      {
        text: '确定',
        onPress: async () => {
          await unifiedUpdateService.applyEASOTAUpdate();
          // reloadAsync 会重启应用
        },
      },
    ]
  );
};
```

#### 特点
- ✅ 用户可控制更新时机
- ✅ 立即应用更新（无需等待下次启动）
- ✅ 显示更新状态和进度
- ✅ 支持取消操作

---

## 🔄 更新流程

### 自动触发流程
```
应用启动 
  ↓
延迟 2 秒
  ↓
检查 EAS OTA 更新
  ↓
有更新？
  ├─ 是 → 自动下载 → 下次启动时应用
  └─ 否 → 继续正常运行
```

### 手动触发流程
```
用户打开"检查更新"页面
  ↓
点击"检查更新"按钮
  ↓
检查所有类型更新
  ↓
显示 EAS OTA 更新卡片
  ↓
点击"应用 EAS OTA 更新"
  ↓
确认对话框
  ↓
下载更新（如果未下载）
  ↓
重启应用
  ↓
应用新版本
```

---

## 📱 使用场景

### 场景 1：日常使用（自动触发）
- **适用**：普通用户
- **方式**：应用启动时自动检查
- **优点**：无需操作，自动更新

### 场景 2：测试更新（手动触发）
- **适用**：开发测试、立即应用更新
- **方式**：通过"检查更新"页面手动触发
- **优点**：可控制更新时机，立即应用

### 场景 3：强制更新检查
- **适用**：需要立即检查更新
- **方式**：打开"检查更新"页面，点击"检查更新"
- **优点**：立即检查，不等待自动检查

---

## 💻 代码示例

### 示例 1：在代码中手动检查更新

```typescript
import { unifiedUpdateService } from '../services/unified-update.service';

// 检查所有类型的更新
const checkUpdates = async () => {
  try {
    const updateInfo = await unifiedUpdateService.checkForUpdates();
    
    if (updateInfo.easOtaUpdate?.isAvailable) {
      console.log('发现 EAS OTA 更新');
      // 可以显示提示或自动应用
    }
  } catch (error) {
    console.error('检查更新失败:', error);
  }
};
```

### 示例 2：直接应用 EAS OTA 更新

```typescript
import { unifiedUpdateService } from '../services/unified-update.service';

// 应用 EAS OTA 更新
const applyUpdate = async () => {
  try {
    await unifiedUpdateService.applyEASOTAUpdate();
    // 应用会自动重启，这里不会执行
  } catch (error) {
    console.error('应用更新失败:', error);
    Alert.alert('更新失败', error.message);
  }
};
```

### 示例 3：检查 EAS OTA 更新状态

```typescript
import { unifiedUpdateService } from '../services/unified-update.service';

// 获取 EAS OTA 更新信息
const getEASOTAInfo = () => {
  const info = unifiedUpdateService.getEASOTAUpdateInfo();
  console.log('更新 ID:', info.updateId);
  console.log('运行时版本:', info.runtimeVersion);
  console.log('通道:', info.channel);
  console.log('创建时间:', info.createdAt);
};
```

---

## ⚙️ 配置说明

### app.json 配置
```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/6871505d-550b-4d0e-8e87-b6537f15a5b4"
    },
    "runtimeVersion": {
      "policy": "appVersion"
    }
  }
}
```

### 关键配置项
- `enabled: true` - 启用 OTA 更新
- `checkAutomatically: "ON_LOAD"` - 应用启动时自动检查
- `runtimeVersion.policy: "appVersion"` - 使用版本号作为运行时版本

---

## 🔍 调试和测试

### 查看更新日志
```typescript
// 在控制台查看更新检查日志
console.log('[UpdateService] 开始检查更新...');
console.log('[UpdateService] 发现新版本，开始下载...');
console.log('[UpdateService] 更新下载完成');
```

### 测试自动触发
1. 发布一个测试更新：`eas update --branch preview --message "测试"`
2. 关闭应用
3. 重新打开应用
4. 等待 2 秒后，查看控制台日志
5. 应该能看到更新检查日志

### 测试手动触发
1. 发布一个测试更新：`eas update --branch preview --message "测试"`
2. 打开应用的"检查更新"页面
3. 点击"检查更新"按钮
4. 应该能看到 EAS OTA 更新卡片
5. 点击"应用 EAS OTA 更新"按钮
6. 应用应该会重启并应用更新

---

## ⚠️ 注意事项

### 1. 开发环境限制
- 开发环境（`npm start`）不支持 EAS OTA 更新检查
- 只有打包后的 APK 才会检查更新
- 开发环境会显示提示信息

### 2. 网络要求
- 需要网络连接才能检查和应用更新
- 更新下载需要稳定的网络环境

### 3. 版本匹配
- `runtimeVersion` 必须匹配才能接收更新
- 如果版本号改变，需要重新打包 APK

### 4. 更新限制
- EAS Update 免费版每月 10,000 次更新请求
- 存储限制 1 GB

### 5. 自动检查频率
- 应用启动时检查（`ON_LOAD`）
- 更新服务中设置了 5 分钟防抖，避免频繁检查

---

## 📊 更新状态说明

### EAS OTA 更新状态
- **isAvailable: true** - 有可用更新
- **isDownloaded: true** - 更新已下载，等待应用
- **isAvailable: false** - 当前已是最新版本
- **error** - 更新检查失败（开发环境或网络问题）

### UI 显示
- **蓝色卡片** - EAS OTA 更新
- **"应用 EAS OTA 更新"按钮** - 有可用更新时显示
- **"更新已下载，等待应用"** - 更新已下载但未应用
- **"当前已是最新版本"** - 无可用更新

---

## 🎯 最佳实践

1. **优先使用自动触发**
   - 普通用户无需操作
   - 自动保持应用最新

2. **手动触发用于测试**
   - 开发测试时使用
   - 需要立即应用更新时使用

3. **检查更新页面**
   - 提供用户查看更新状态的入口
   - 支持手动触发更新

4. **错误处理**
   - 静默处理更新检查错误
   - 不阻塞应用正常使用

---

## 📝 总结

✅ **自动触发**：应用启动时自动检查，无需用户操作
✅ **手动触发**：通过"检查更新"页面手动触发，可立即应用
✅ **两种方式并存**：自动保持更新，手动提供控制
✅ **完整的 UI 支持**：显示更新状态，支持用户操作

现在你的应用已经支持完整的 EAS OTA 更新功能！

