# `__DEV__` 变量说明

## 什么是 `__DEV__`

`__DEV__` 是 React Native 和 Expo 提供的一个**全局布尔变量**，用于区分开发环境和生产环境。

## 值如何确定

### 1. **开发环境（Development Mode）**

当运行以下命令时，`__DEV__` 为 `true`：

```bash
# Expo 开发服务器
npm start
expo start

# React Native 开发模式
npm run android
npm run ios
```

**特点：**
- `__DEV__ = true`
- 启用热重载（Hot Reload）
- 显示开发工具和调试信息
- 启用 React DevTools
- 显示红色错误屏幕（Red Screen of Death）

### 2. **生产环境（Production Mode）**

当打包 APK/IPA 时，`__DEV__` 为 `false`：

```bash
# EAS Build 打包
eas build --platform android --profile production

# 本地打包
eas build --platform android --local
```

**特点：**
- `__DEV__ = false`
- 代码会被优化和压缩
- 移除调试代码
- 禁用开发工具
- 性能优化

## 工作原理

### Metro Bundler 处理

Metro Bundler（React Native 的打包工具）在打包时会：

1. **开发模式**：
   ```javascript
   // Metro 会自动注入
   global.__DEV__ = true;
   ```

2. **生产模式**：
   ```javascript
   // Metro 会自动注入
   global.__DEV__ = false;
   ```

### 代码替换

在打包时，Metro 会进行**死代码消除（Dead Code Elimination）**：

**源代码：**
```typescript
BASE_URL: __DEV__
  ? 'https://dev-api.example.com'  // 开发环境
  : 'https://prod-api.example.com',  // 生产环境
```

**开发模式打包后：**
```typescript
BASE_URL: true
  ? 'https://dev-api.example.com'
  : 'https://prod-api.example.com',
// 简化为：
BASE_URL: 'https://dev-api.example.com',
```

**生产模式打包后：**
```typescript
BASE_URL: false
  ? 'https://dev-api.example.com'
  : 'https://prod-api.example.com',
// 简化为：
BASE_URL: 'https://prod-api.example.com',
```

## 在你的项目中的使用

### 当前配置

```typescript
// config/api.config.ts
export const API_CONFIG = {
  BASE_URL: __DEV__
    ? 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api' // 开发环境
    : 'https://cloud1-4gee45pq61cd6f19-1259499058.ap-shanghai.app.tcloudbase.com/task-collection-api', // 生产环境
};
```

### 实际行为

- **开发时**（`npm start`）：`__DEV__ = true`，使用第一个 URL
- **打包 APK 时**（`eas build`）：`__DEV__ = false`，使用第二个 URL

**注意：** 当前配置中，开发和生产环境使用相同的 URL，所以实际上 `__DEV__` 的值不会影响结果。

## 如何验证 `__DEV__` 的值

### 方法一：在代码中打印

```typescript
console.log('__DEV__ 的值:', __DEV__);
console.log('当前环境:', __DEV__ ? '开发环境' : '生产环境');
```

### 方法二：在 React Native Debugger 中查看

```javascript
// 在浏览器控制台中
console.log(__DEV__);
```

### 方法三：通过构建日志

在 EAS Build 的构建日志中，可以看到：
- Development build: `__DEV__ = true`
- Production build: `__DEV__ = false`

## 常见用法

### 1. 条件编译

```typescript
if (__DEV__) {
  console.log('这是开发环境的日志');
  // 这段代码在生产环境中会被移除
}
```

### 2. API 地址切换

```typescript
const API_URL = __DEV__
  ? 'http://localhost:3000'      // 开发环境
  : 'https://api.production.com'; // 生产环境
```

### 3. 功能开关

```typescript
const ENABLE_DEBUG = __DEV__;
const ENABLE_ANALYTICS = !__DEV__;
```

### 4. 错误处理

```typescript
if (__DEV__) {
  // 开发环境：显示详细错误
  console.error('详细错误信息:', error);
} else {
  // 生产环境：只记录错误，不显示详情
  console.error('发生错误');
}
```

## 注意事项

### 1. 不要手动设置

**不要**在代码中手动设置 `__DEV__`：

```typescript
// ❌ 错误：不要这样做
__DEV__ = true;

// ✅ 正确：让 Metro 自动处理
if (__DEV__) {
  // ...
}
```

### 2. 类型定义

TypeScript 中，`__DEV__` 的类型定义在：
- `node_modules/react-native/src/types/globals.d.ts`
- 或者通过 `@types/react-native`

### 3. 打包优化

Metro 会在生产构建时：
- 移除 `if (__DEV__) { ... }` 中为 `false` 的代码块
- 这称为"死代码消除"（Dead Code Elimination）

### 4. 环境变量 vs `__DEV__`

- **`__DEV__`**：由 Metro 自动设置，区分开发/生产模式
- **`process.env.NODE_ENV`**：Node.js 环境变量，在 React Native 中可能不可用
- **`process.env.EXPO_PUBLIC_*`**：Expo 环境变量，需要手动配置

## 总结

- `__DEV__` 是 React Native/Expo 提供的全局变量
- 开发模式：`__DEV__ = true`（运行 `npm start` 时）
- 生产模式：`__DEV__ = false`（打包 APK/IPA 时）
- Metro Bundler 会自动设置这个值
- 生产构建时会移除 `__DEV__ = true` 的代码块
- 不需要手动配置，由构建工具自动处理

