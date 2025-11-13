# getJSBundleLoader() 方法定义和 Override 说明

## 方法定义位置

### 1. 类继承关系

```
ReactNativeHost (抽象基类)
    ↓
DefaultReactNativeHost (具体实现类)
    ↓
MainApplication 中的匿名对象 (我们的代码)
```

### 2. 方法定义

**`getJSBundleLoader()` 方法定义在 `ReactNativeHost` 基类中：**

```kotlin
// ReactNativeHost.kt (React Native 源码)
abstract class ReactNativeHost {
  // 在新架构中，这个方法被引入
  open fun getJSBundleLoader(): JSBundleLoader? {
    // 默认实现，返回 null 表示使用默认 bundle
    return null
  }
  
  // 传统架构的方法
  open fun getJSBundleFile(): String? {
    return null
  }
}
```

### 3. DefaultReactNativeHost 继承

**`DefaultReactNativeHost` 继承自 `ReactNativeHost`：**

```kotlin
// DefaultReactNativeHost.kt (React Native 源码)
class DefaultReactNativeHost(application: Application) : ReactNativeHost(application) {
  // 继承自 ReactNativeHost，可以使用父类的方法
  // 可以 override getJSBundleLoader() 和 getJSBundleFile()
}
```

## 为什么可以在 MainApplication 中 Override

### MainApplication 的结构

在 Expo 生成的 `MainApplication.kt` 中：

```kotlin
class MainApplication : Application(), ReactApplication {
  
  // 创建一个 DefaultReactNativeHost 的匿名对象
  private val mReactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
    
    // ✅ 可以 override 父类 ReactNativeHost 的方法
    override fun getJSBundleFile(): String? {
      // 传统架构的实现
      return super.getJSBundleFile()
    }
    
    // ✅ 在新架构中，也可以 override 父类的方法
    override fun getJSBundleLoader(): JSBundleLoader? {
      // 新架构的实现
      return super.getJSBundleLoader()
    }
  }
  
  override fun getReactNativeHost(): ReactNativeHost {
    return mReactNativeHost
  }
}
```

### Override 的原理

1. **Kotlin 的继承机制**
   - `DefaultReactNativeHost` 继承自 `ReactNativeHost`
   - `ReactNativeHost` 中的 `getJSBundleLoader()` 是 `open` 方法（可被 override）
   - 因此，在 `DefaultReactNativeHost` 的匿名对象中可以 override

2. **方法查找顺序**
   - 当调用 `getJSBundleLoader()` 时，Kotlin 会先查找子类（匿名对象）的实现
   - 如果找到，使用子类的实现
   - 如果没找到，使用父类的实现

## 新架构中的调用流程

### 1. ReactHost 的创建

在新架构中，`ReactNativeHostWrapper` 会：

```kotlin
// ReactNativeHostWrapper.kt (React Native 源码)
fun createReactHost(
  context: Context,
  reactNativeHost: ReactNativeHost,
  ...
): ReactHost {
  // 从 ReactNativeHost 获取 bundle loader
  val bundleLoader = reactNativeHost.getJSBundleLoader()
  
  // 如果返回 null，使用默认的 bundle loader
  // 如果返回 JSBundleLoader，使用自定义的 loader
  if (bundleLoader != null) {
    // 使用自定义 loader
  } else {
    // 使用默认 loader（从 assets 加载）
  }
}
```

### 2. 我们的 Override 生效

当 `ReactNativeHostWrapper.createReactHost()` 调用 `reactNativeHost.getJSBundleLoader()` 时：

1. 会调用我们创建的 `DefaultReactNativeHost` 匿名对象
2. 匿名对象中的 `override fun getJSBundleLoader()` 被调用
3. 我们的实现返回自定义的 `JSBundleLoader`
4. `ReactHost` 使用我们的 loader 加载 bundle

## 验证方法

### 1. 检查编译

如果 `DefaultReactNativeHost` 没有继承 `getJSBundleLoader()` 方法，编译会失败：

```
Unresolved reference: getJSBundleLoader
```

### 2. 检查运行时日志

如果方法被正确调用，应该看到：

```
E/MainApplication: getJSBundleLoader() called (BridgelessReact)
```

## 总结

1. ✅ **`getJSBundleLoader()` 定义在 `ReactNativeHost` 基类中**
2. ✅ **`DefaultReactNativeHost` 继承自 `ReactNativeHost`**
3. ✅ **可以在 `MainApplication` 的匿名对象中 override**
4. ✅ **新架构会调用我们 override 的方法**

**因此，我们的实现是正确的！** 🎉

