import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { apiService } from '../services/api.service';
import { API_CONFIG } from '../config/api.config';

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  data?: any;
}

const TestApiScreen = () => {
  const [results, setResults] = useState<TestResult[]>([]);
  const [isTesting, setIsTesting] = useState(false);

  const runTest = async (testName: string, testFn: () => Promise<any>) => {
    const result: TestResult = {
      name: testName,
      status: 'pending',
      message: '测试中...',
    };
    
    setResults(prev => [...prev, result]);

    try {
      const data = await testFn();
      result.status = 'success';
      result.message = '测试通过';
      result.data = data;
    } catch (error: any) {
      result.status = 'error';
      
      // 提供更详细的错误信息
      if (error.status === 401) {
        result.message = '认证失败 (401) - 请检查 API Key 是否正确配置';
        result.data = {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
          hint: '请确认：\n1. .env 文件中已配置 EXPO_PUBLIC_API_KEY\n2. API Key 值与云函数环境变量中的值一致\n3. 已重启开发服务器',
        };
      } else if (error.status === 404) {
        result.message = '接口不存在 (404) - 请检查云函数地址是否正确';
        result.data = {
          status: error.status,
          message: error.message,
          baseUrl: API_CONFIG.BASE_URL,
        };
      } else if (error.status) {
        result.message = `HTTP 错误 (${error.status}) - ${error.message}`;
        result.data = {
          status: error.status,
          statusText: error.statusText,
          message: error.message,
        };
      } else {
        result.message = error.message || '测试失败';
        result.data = error;
      }
    }

    setResults(prev => prev.map(r => r.name === testName ? result : r));
  };

  const runAllTests = async () => {
    setIsTesting(true);
    setResults([]);

    // 测试 1: 检查配置
    await runTest('检查配置', async () => {
      const hasApiKey = !!API_CONFIG.API_KEY;
      const hasBaseUrl = !!API_CONFIG.BASE_URL;
      
      if (!hasApiKey) {
        throw new Error('未配置 API Key');
      }
      if (!hasBaseUrl) {
        throw new Error('未配置 Base URL');
      }
      
      return {
        apiKey: API_CONFIG.API_KEY.substring(0, 8) + '...',
        baseUrl: API_CONFIG.BASE_URL,
      };
    });

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 500));

    // 测试 2: 获取所有任务
    await runTest('获取所有任务', async () => {
      const tasks = await apiService.getAllTasks();
      return { count: tasks.length, tasks: tasks.slice(0, 3) };
    });

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 500));

    // 测试 3: 创建任务
    await runTest('创建测试任务', async () => {
      const newTask = await apiService.createTask({
        rawText: '测试任务 - 完成代码审查 3个',
        taskName: '代码审查',
        completionTime: new Date().toISOString(),
        quantity: { '个': 3 },
        recordDate: new Date().toISOString().split('T')[0],
        recordMonth: String(new Date().getMonth() + 1),
        recordYear: String(new Date().getFullYear()),
      });
      return newTask;
    });

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 500));

    // 测试 4: 获取今日统计
    await runTest('获取今日统计', async () => {
      const stats = await apiService.getTodayStats();
      return stats;
    });

    setIsTesting(false);
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return <FontAwesome6 name="check-circle" size={20} color="#10b981" />;
      case 'error':
        return <FontAwesome6 name="xmark-circle" size={20} color="#ef4444" />;
      default:
        return <FontAwesome6 name="clock" size={20} color="#6b7280" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'success':
        return '#10b981';
      case 'error':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>云函数测试</Text>
        <Text style={styles.subtitle}>测试云函数连接和API Key验证</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* 配置信息 */}
        <View style={styles.configCard}>
          <Text style={styles.configTitle}>当前配置</Text>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>Base URL:</Text>
            <Text style={styles.configValue}>{API_CONFIG.BASE_URL}</Text>
          </View>
          <View style={styles.configItem}>
            <Text style={styles.configLabel}>API Key:</Text>
            <Text style={[styles.configValue, !API_CONFIG.API_KEY && styles.configValueWarning]}>
              {API_CONFIG.API_KEY
                ? `${API_CONFIG.API_KEY.substring(0, 8)}...${API_CONFIG.API_KEY.substring(API_CONFIG.API_KEY.length - 4)}`
                : '⚠️ 未配置 - 请在 .env 文件中设置 EXPO_PUBLIC_API_KEY'}
            </Text>
          </View>
          {!API_CONFIG.API_KEY && (
            <View style={styles.warningBox}>
              <Text style={styles.warningText}>
                💡 配置步骤：{'\n'}
                1. 在项目根目录创建 .env 文件{'\n'}
                2. 添加：EXPO_PUBLIC_API_KEY=your-api-key{'\n'}
                3. 重启开发服务器
              </Text>
            </View>
          )}
        </View>

        {/* 测试按钮 */}
        <TouchableOpacity
          style={[styles.testButton, isTesting && styles.testButtonDisabled]}
          onPress={runAllTests}
          disabled={isTesting}
        >
          <FontAwesome6 name="play" size={16} color="#ffffff" />
          <Text style={styles.testButtonText}>
            {isTesting ? '测试中...' : '开始测试'}
          </Text>
        </TouchableOpacity>

        {/* 测试结果 */}
        {results.length > 0 && (
          <View style={styles.resultsContainer}>
            <Text style={styles.resultsTitle}>测试结果</Text>
            {results.map((result, index) => (
              <View key={index} style={styles.resultCard}>
                <View style={styles.resultHeader}>
                  {getStatusIcon(result.status)}
                  <Text style={[styles.resultName, { color: getStatusColor(result.status) }]}>
                    {result.name}
                  </Text>
                </View>
                <Text style={styles.resultMessage}>{result.message}</Text>
                {result.data && (
                  <View style={styles.resultData}>
                    <Text style={styles.resultDataText}>
                      {JSON.stringify(result.data, null, 2).substring(0, 200)}
                      {JSON.stringify(result.data).length > 200 ? '...' : ''}
                    </Text>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {/* 使用说明 */}
        <View style={styles.helpCard}>
          <Text style={styles.helpTitle}>💡 使用说明</Text>
          <Text style={styles.helpText}>
            1. 确保已配置 API Key 和 Base URL{'\n'}
            2. 点击"开始测试"按钮{'\n'}
            3. 查看测试结果，确认云函数是否正常{'\n'}
            4. 如果测试失败，检查：{'\n'}
            {'   '}- API Key 是否正确{'\n'}
            {'   '}- 云函数地址是否正确{'\n'}
            {'   '}- 云函数是否已部署{'\n'}
            {'   '}- 网络连接是否正常
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  configCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  configItem: {
    marginBottom: 8,
  },
  configLabel: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 4,
  },
  configValue: {
    fontSize: 14,
    color: '#1f2937',
    fontFamily: 'monospace',
  },
  testButton: {
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  testButtonDisabled: {
    opacity: 0.6,
  },
  testButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultsContainer: {
    marginBottom: 24,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
  },
  resultCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  resultMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resultData: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  resultDataText: {
    fontSize: 12,
    color: '#374151',
    fontFamily: 'monospace',
  },
  helpCard: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#78350f',
    lineHeight: 20,
  },
  configValueWarning: {
    color: '#dc2626',
    fontWeight: '600',
  },
  warningBox: {
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  warningText: {
    fontSize: 12,
    color: '#991b1b',
    lineHeight: 18,
  },
});

export default TestApiScreen;

