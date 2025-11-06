# 我爱背书模块云端存储配置指南

## 🎯 不需要创建新云函数

**推荐：复用现有的 `task-collection-api` 云函数**

只需要在现有云函数中添加新的路由即可，不需要创建新的云函数。

## 📋 配置步骤

### 步骤 1：更新云函数代码

在现有的 `task-collection-api` 云函数中：

1. 复制 `docs/tencent-cloud-function-example.md` 中的完整代码
2. 在云函数控制台，点击"在线编辑"
3. 粘贴更新后的代码（已包含"我爱背书"模块的路由）
4. 保存并部署

### 步骤 2：创建数据库集合

在云开发控制台创建以下集合：

1. 进入"数据库"
2. 创建集合：
   - `reciting_plans` - 存储计划
   - `reciting_tasks` - 存储任务
   - `reciting_contents` - 存储内容（音频和文档元数据）

### 步骤 3：配置权限

为每个集合设置权限：
- **权限设置**：仅创建者可读写
- 或者根据需求设置其他权限规则

### 步骤 4：验证配置

使用前端测试页面或直接调用 API：

```typescript
import { recitingService } from './services/reciting.service';

// 创建计划
const plan = await recitingService.createPlan({
  title: '测试计划',
  content: '测试内容',
  contentId: 'content_123',
  period: 30,
  startDate: new Date().toISOString(),
  status: 'active',
  progress: 0,
  totalDays: 30,
});

// 获取计划列表
const plans = await recitingService.getAllPlans();
```

## 🔗 接口路径

所有接口都在同一个云函数下，通过路径区分：

```
任务收集模块：
  /tasks              - 任务相关
  /stats/today        - 统计相关

我爱背书模块：
  /reciting/plans     - 计划相关
  /reciting/tasks     - 任务相关
  /reciting/contents  - 内容相关
```

## ✅ 优势

使用同一个云函数的好处：

1. **共享配置**
   - 相同的 API Key 认证
   - 相同的数据库连接
   - 相同的环境变量

2. **统一管理**
   - 所有接口在一个地方
   - 易于维护和调试
   - 代码结构清晰

3. **节省资源**
   - 不需要额外的云函数实例
   - 降低成本和复杂度

## 📚 相关文档

- [云函数路由方案](./CLOUD_FUNCTION_ROUTING.md)
- [我爱背书云端存储方案](./ILOVE_RECITING_CLOUD_STORAGE.md)
- [云函数示例代码](./tencent-cloud-function-example.md)

## 🎯 总结

**不需要创建新云函数！**

只需：
1. ✅ 更新现有云函数代码（添加新路由）
2. ✅ 创建数据库集合
3. ✅ 使用 `recitingService` 管理数据

现在可以开始使用了！

