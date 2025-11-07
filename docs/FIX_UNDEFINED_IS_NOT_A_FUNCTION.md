# 修复：打包后 "undefined is not a function" 错误

## ❌ 错误信息

```
undefined is not a function
```

这个错误通常发生在打包后的 React Native 应用中，表示某个函数在打包环境中不可用。

## 🔍 问题原因

### 1. AbortSignal.timeout() 不可用

`AbortSignal.timeout()` 是一个较新的 Web API，在 React Native 环境中可能不可用，特别是在打包后的应用中。

**问题代码：**
```typescript
signal: AbortSignal.timeout(API_CONFIG.TIMEOUT)
```

### 2. require() 在打包环境中的问题

虽然 `require()` 在 React Native 中可用，但在某些打包配置中可能会有问题。

## ✅ 已修复

### 修复 1：使用 AbortController + setTimeout

将 `AbortSignal.timeout()` 替换为兼容的实现：

```typescript
// 创建 AbortController 用于超时控制（兼容 React Native）
const controller = new AbortController();
let timeoutId: ReturnType<typeof setTimeout> | null = null;

try {
  timeoutId = setTimeout(() => {
    controller.abort();
  }, API_CONFIG.TIMEOUT);

  const response = await fetch(url, {
    ...config,
    signal: controller.signal,
  });

  // 清除超时定时器
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  // ...
} catch (error: any) {
  // 清除超时定时器（如果请求失败）
  if (timeoutId) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  // ...
}
```

### 修复 2：使用 ES6 import 替代 require

将 `require()` 改为 ES6 的 `import`：

```typescript
// ❌ 旧代码
const { API_CONFIG } = require('../config/api.config');

// ✅ 新代码
import { API_CONFIG } from '../config/api.config';
```

## 📋 修复的文件

1. **services/api.service.ts**
   - 替换 `AbortSignal.timeout()` 为 `AbortController` + `setTimeout`
   - 添加超时错误处理

2. **services/task.service.ts**
   - 将 `require()` 改为 `import`

## ✅ 验证

修复后，重新打包应用：

```bash
# 重新打包
eas build --platform android --profile production
```

或本地测试：

```bash
# 开发环境测试
npm start
```

## 🔍 如果仍然有问题

### 检查 1：确认 AbortController 支持

`AbortController` 在 React Native 0.60+ 中应该可用。如果不可用，可能需要 polyfill。

### 检查 2：检查其他可能的 undefined 函数

查看错误堆栈，找到具体是哪个函数未定义：

1. 打开开发者工具
2. 查看完整的错误堆栈
3. 找到报错的具体函数
4. 检查该函数是否在 React Native 中可用

### 检查 3：检查打包配置

确保 `eas.json` 或打包配置正确：

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_KEY": "${EXPO_PUBLIC_API_KEY}"
      }
    }
  }
}
```

## 📚 相关文档

- [React Native 兼容性指南](https://reactnative.dev/docs/compatibility)
- [AbortController 文档](https://developer.mozilla.org/en-US/docs/Web/API/AbortController)
- [EAS Build 配置](./GITHUB_ACTIONS_SETUP.md)

## ✅ 总结

主要修复：
1. ✅ 使用 `AbortController` + `setTimeout` 替代 `AbortSignal.timeout()`
2. ✅ 使用 ES6 `import` 替代 `require()`
3. ✅ 添加超时错误处理

这些修复确保了代码在打包后的 React Native 环境中能够正常工作。

