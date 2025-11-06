# 🔧 快速修复：method undefined 和 API Key 验证失败

## 问题症状

从日志看到：
1. `method: undefined` - HTTP 方法未定义
2. `无效的 API Key` - API Key 验证失败

## 🚀 快速解决方案

### 步骤 1：更新云函数代码

已更新 `docs/tencent-cloud-function-example.md`，主要修复：

1. ✅ **修复 method 获取**：从 `event.httpMethod` 获取
2. ✅ **添加详细调试日志**：帮助排查 API Key 问题
3. ✅ **改进错误提示**：更清晰的错误信息

### 步骤 2：部署更新后的代码

1. 复制 `docs/tencent-cloud-function-example.md` 中的完整代码
2. 在云函数控制台，点击"在线编辑"
3. 粘贴更新后的代码到 `index.js`
4. 保存并部署

### 步骤 3：检查环境变量

确保云函数环境变量中已配置 API Key：

1. 在云函数控制台，点击函数名称
2. 进入"环境变量"标签
3. 确认以下环境变量存在：
   - `API_KEY_1` = 你的实际 API Key 值
   - `TCB_ENV` = 你的云开发环境 ID

**重要：**
- API Key 值必须与前端 `.env` 文件中的 `EXPO_PUBLIC_API_KEY` **完全一致**
- 不能有空格、引号、换行符
- 区分大小写

### 步骤 4：查看调试日志

部署后，再次测试，查看云函数日志中的调试信息：

**应该看到：**
```
验证 API Key: {
  hasHeaders: true,
  validApiKeysCount: 1,  // 应该是 1 或更多
  validApiKeysPrefix: ['xxxx...']  // 显示配置的 API Key 前缀
}
提取的 API Key: {
  length: 32,  // 或其他长度
  prefix: 'xxxx...',
  suffix: '...xxxx'
}
```

**如果看到：**
- `validApiKeysCount: 0` → 环境变量未配置
- `缺少 Authorization 头` → 前端请求头未发送
- `API Key 验证失败` → API Key 值不匹配

### 步骤 5：验证修复

1. 访问 `/test-api` 页面
2. 点击"开始测试"
3. 查看云函数日志，确认：
   - ✅ `method: 'GET'` 或 `'POST'`
   - ✅ `API Key 验证成功`
   - ✅ 接口返回 200 状态码

## 🔍 关键修复点

### 1. 修复 method 获取

```javascript
// 修复前
let { method } = event;  // method 可能是 undefined

// 修复后
let { method } = event;
if (!method) {
  method = event.httpMethod || event.method || 'GET';
}
method = method.toUpperCase();
```

### 2. 添加调试日志

```javascript
console.log('验证 API Key:', {
  validApiKeysCount: VALID_API_KEYS.length,
  validApiKeysPrefix: VALID_API_KEYS.map(k => k ? k.substring(0, 8) + '...' : '空'),
});

console.log('提取的 API Key:', {
  length: apiKey.length,
  prefix: apiKey.substring(0, 8) + '...',
});
```

## 📝 检查清单

修复后，确认以下各项：

- [ ] 云函数代码已更新并部署
- [ ] 环境变量 `API_KEY_1` 已配置
- [ ] 环境变量 `TCB_ENV` 已配置
- [ ] `.env` 文件中的 `EXPO_PUBLIC_API_KEY` 与云函数环境变量中的值一致
- [ ] 日志中显示 `method: 'GET'`（不是 undefined）
- [ ] 日志中显示 `API Key 验证成功`

## 🐛 常见问题

### Q1: 仍然显示 "method: undefined"

**原因：** 代码未更新或部署失败。

**解决：**
1. 确认代码已保存
2. 确认已点击"部署"按钮
3. 查看部署日志，确认部署成功

### Q2: validApiKeysCount: 0

**原因：** 环境变量未配置。

**解决：**
1. 在云函数控制台，进入"环境变量"
2. 添加 `API_KEY_1` 环境变量
3. 填入实际的 API Key 值
4. 保存后重新测试

### Q3: API Key 验证失败（但已配置）

**原因：** API Key 值不匹配或有空格。

**解决：**
1. 检查云函数环境变量中的 API Key（复制出来）
2. 检查前端 `.env` 文件中的 API Key（复制出来）
3. 对比两个值，确保**完全一致**（包括大小写、空格）
4. 如果 `.env` 文件中有引号，去掉引号
5. 重启前端开发服务器

### Q4: 缺少 Authorization 头

**原因：** 前端请求未发送 Authorization 头。

**解决：**
1. 检查 `.env` 文件中是否配置了 `EXPO_PUBLIC_API_KEY`
2. 确认已重启开发服务器
3. 在浏览器控制台运行：
   ```javascript
   console.log('API Key:', process.env.EXPO_PUBLIC_API_KEY);
   ```
4. 确认值不为空

## 📚 相关文档

- [快速修复 401 错误](./QUICK_FIX_401.md)
- [环境变量配置指南](./ENV_VARIABLES_GUIDE.md)
- [API Key 设置指南](./API_KEY_SETUP.md)

## ✅ 成功标志

修复成功后，日志应该显示：

```
请求详情: {
  method: 'GET',  // ✅ 不再是 undefined
  normalizedPath: '/stats/today',
  hasAuthorization: true,
  authorizationPrefix: 'Bearer xxxxxxxx...'
}
验证 API Key: {
  validApiKeysCount: 1,  // ✅ 已配置
  validApiKeysPrefix: ['xxxxxxxx...']
}
提取的 API Key: {
  length: 32,
  prefix: 'xxxxxxxx...',
  suffix: '...xxxx'
}
API Key 验证成功  // ✅ 验证通过
```

完成以上步骤后，问题应该可以解决！

