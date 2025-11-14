# Codemagic 构建时指定 EAS Update Channel

## 📋 概述

Codemagic 使用本地构建（gradle），而不是 EAS Build。要在构建的 APK 中指定 EAS Update Channel，需要在构建前通过环境变量或修改配置来设置。

## ✅ 解决方案

### 方案 1：通过环境变量设置 Channel（推荐）

在 Codemagic 构建脚本中，通过环境变量设置 channel，并在构建前注入到配置中。

#### 步骤 1：在 Codemagic 配置中添加环境变量

在 Codemagic UI 中：
1. 进入项目 Settings > Environment variables
2. 添加变量：
   - **变量名**：`EAS_UPDATE_CHANNEL`
   - **变量值**：`preview` 或 `production`
   - **勾选 Secure**（可选）

#### 步骤 2：修改 codemagic.yaml

在构建脚本中添加设置 channel 的步骤：

```yaml
scripts:
  - name: Set EAS Update Channel
    script: |
      # 从环境变量读取 channel，默认为 preview
      EAS_CHANNEL="${EAS_UPDATE_CHANNEL:-preview}"
      echo "📦 设置 EAS Update Channel: $EAS_CHANNEL"
      
      # 方法 1: 通过 app.json 配置（如果支持）
      # 注意：expo-updates 的 channel 需要在 AndroidManifest.xml 中设置
      
      # 方法 2: 在 prebuild 后修改 AndroidManifest.xml
      # 这需要在 prebuild 步骤之后执行
      
      # 方法 3: 使用 expo-updates 的配置插件
      # 在 app.json 中添加 channel 配置
      
      # 临时方案：在 prebuild 后手动注入 channel
      if [ -f "android/app/src/main/AndroidManifest.xml" ]; then
        echo "注入 channel 到 AndroidManifest.xml..."
        # 这里需要根据实际情况修改 AndroidManifest.xml
        # 添加或更新 expo.modules.updates.EXPO_UPDATE_CHANNEL meta-data
      fi
      
      echo "✅ EAS Update Channel 已设置为: $EAS_CHANNEL"
      export EAS_UPDATE_CHANNEL="$EAS_CHANNEL"
```

### 方案 2：在 app.json 中配置 Channel（需要 expo-updates 支持）

如果 expo-updates 支持在 app.json 中配置 channel，可以这样做：

```json
{
  "expo": {
    "updates": {
      "enabled": true,
      "checkAutomatically": "ON_LOAD",
      "url": "https://u.expo.dev/YOUR_PROJECT_ID",
      "channel": "preview"  // 或从环境变量读取
    }
  }
}
```

**注意：** 这种方式可能不被支持，因为 channel 通常是在构建时确定的。

### 方案 3：使用 EAS Build（最简单，推荐）

如果可能，建议使用 EAS Build 而不是本地构建：

```yaml
scripts:
  - name: Setup EAS CLI
    script: |
      npm install -g eas-cli
      eas login --non-interactive --token $EXPO_TOKEN
      
  - name: Build with EAS
    script: |
      # 从环境变量读取 channel
      EAS_CHANNEL="${EAS_UPDATE_CHANNEL:-preview}"
      
      # 使用 EAS Build，会自动处理 channel
      eas build --platform android \
        --profile preview \
        --non-interactive \
        --local  # 或移除 --local 使用云端构建
```

### 方案 4：修改 AndroidManifest.xml（最可靠）

在 prebuild 后，直接修改 AndroidManifest.xml 添加 channel：

```yaml
scripts:
  - name: Prebuild
    script: |
      npx expo prebuild --platform android --clean
      
  - name: Inject EAS Update Channel
    script: |
      EAS_CHANNEL="${EAS_UPDATE_CHANNEL:-preview}"
      echo "📦 注入 EAS Update Channel: $EAS_CHANNEL"
      
      ANDROID_MANIFEST="android/app/src/main/AndroidManifest.xml"
      
      if [ -f "$ANDROID_MANIFEST" ]; then
        # 检查是否已存在 channel meta-data
        if grep -q "expo.modules.updates.EXPO_UPDATE_CHANNEL" "$ANDROID_MANIFEST"; then
          # 更新现有的 channel
          sed -i.bak "s/android:value=\".*\"/android:value=\"$EAS_CHANNEL\"/" "$ANDROID_MANIFEST"
          echo "✅ 已更新 channel 为: $EAS_CHANNEL"
        else
          # 添加新的 channel meta-data
          # 需要在 <application> 标签内添加
          # 这需要更复杂的 XML 处理，建议使用 Python 或 Node.js 脚本
          echo "⚠️  需要手动添加 channel meta-data 到 AndroidManifest.xml"
          echo "   建议使用 Node.js 脚本处理"
        fi
      else
        echo "❌ AndroidManifest.xml 不存在"
      fi
```

## 🔧 完整实现示例

### 使用 Node.js 脚本注入 Channel

创建脚本 `scripts/inject-eas-channel.js`：

```javascript
const fs = require('fs');
const path = require('path');
const { XMLParser, XMLBuilder } = require('fast-xml-parser');

const channel = process.env.EAS_UPDATE_CHANNEL || 'preview';
const manifestPath = path.join(__dirname, '../android/app/src/main/AndroidManifest.xml');

console.log(`📦 注入 EAS Update Channel: ${channel}`);

if (!fs.existsSync(manifestPath)) {
  console.error('❌ AndroidManifest.xml 不存在');
  process.exit(1);
}

// 读取 AndroidManifest.xml
const xmlContent = fs.readFileSync(manifestPath, 'utf8');

// 解析 XML
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
});
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  format: true,
});

const manifest = parser.parse(xmlContent);

// 查找或创建 channel meta-data
if (!manifest.manifest.application) {
  console.error('❌ 无法找到 <application> 标签');
  process.exit(1);
}

let application = manifest.manifest.application;

// 确保 'meta-data' 是数组
if (!Array.isArray(application['meta-data'])) {
  application['meta-data'] = application['meta-data'] ? [application['meta-data']] : [];
}

// 查找现有的 channel meta-data
const channelMetaData = application['meta-data'].find(
  (meta) => meta['@_android:name'] === 'expo.modules.updates.EXPO_UPDATE_CHANNEL'
);

if (channelMetaData) {
  // 更新现有的 channel
  channelMetaData['@_android:value'] = channel;
  console.log('✅ 已更新 channel');
} else {
  // 添加新的 channel meta-data
  application['meta-data'].push({
    '@_android:name': 'expo.modules.updates.EXPO_UPDATE_CHANNEL',
    '@_android:value': channel,
  });
  console.log('✅ 已添加 channel');
}

// 写回 AndroidManifest.xml
const newXml = builder.build(manifest);
fs.writeFileSync(manifestPath, newXml, 'utf8');

console.log(`✅ EAS Update Channel 已设置为: ${channel}`);
```

在 `codemagic.yaml` 中使用：

```yaml
scripts:
  - name: Prebuild
    script: |
      npx expo prebuild --platform android --clean
      
  - name: Inject EAS Update Channel
    script: |
      # 设置默认 channel
      export EAS_UPDATE_CHANNEL="${EAS_UPDATE_CHANNEL:-preview}"
      echo "📦 注入 EAS Update Channel: $EAS_UPDATE_CHANNEL"
      
      # 安装依赖（如果需要）
      npm install fast-xml-parser --save-dev || true
      
      # 运行注入脚本
      node scripts/inject-eas-channel.js
```

## 📝 推荐的 Codemagic 配置

### 为不同 Workflow 设置不同 Channel

```yaml
workflows:
  android-preview:
    name: Android Preview Build (APK)
    environment:
      vars:
        EAS_UPDATE_CHANNEL: preview  # 预览版使用 preview channel
    scripts:
      - name: Inject EAS Update Channel
        script: |
          export EAS_UPDATE_CHANNEL="${EAS_UPDATE_CHANNEL:-preview}"
          node scripts/inject-eas-channel.js
          
  android-production:
    name: Android Production Build (AAB)
    environment:
      vars:
        EAS_UPDATE_CHANNEL: production  # 生产版使用 production channel
    scripts:
      - name: Inject EAS Update Channel
        script: |
          export EAS_UPDATE_CHANNEL="${EAS_UPDATE_CHANNEL:-production}"
          node scripts/inject-eas-channel.js
```

## ⚠️ 注意事项

1. **Channel 必须在构建时设置**：channel 信息会嵌入到 APK 中，运行时无法更改
2. **需要重新构建**：修改 channel 后必须重新构建 APK
3. **匹配更新通道**：APK 的 channel 必须与发布更新时使用的 channel 匹配
4. **AndroidManifest.xml 位置**：确保在 prebuild 之后、构建之前注入 channel

## ✅ 验证

构建完成后，可以验证 channel 是否正确设置：

```bash
# 解压 APK（APK 是 ZIP 格式）
unzip app-release.apk -d apk_extracted

# 查看 AndroidManifest.xml（需要 aapt 工具）
aapt dump xmltree app-release.apk AndroidManifest.xml | grep -i channel
```

或者安装 APK 后，在应用中检查：

```typescript
import * as Updates from 'expo-updates';

console.log('Channel:', Updates.channel);
```

## 🎯 总结

**推荐方案：**
1. ✅ 使用环境变量 `EAS_UPDATE_CHANNEL` 设置 channel
2. ✅ 在 prebuild 后、构建前注入 channel 到 AndroidManifest.xml
3. ✅ 使用 Node.js 脚本处理 XML（更可靠）
4. ✅ 为不同 workflow 设置不同的 channel

**关键点：**
- Channel 必须在构建时设置
- 需要在 prebuild 之后、构建之前注入
- APK 的 channel 必须与更新发布的 channel 匹配

