/**
 * 应用更新界面
 * 支持手动检查更新、下载、安装
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { appUpdateService, UpdateInfo, DownloadProgress } from '../../services/app-update.service';
import styles from './styles';

const AppUpdateScreen: React.FC = () => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<{ version: string; versionCode: number } | null>(null);

  useEffect(() => {
    // 获取当前版本信息
    const version = appUpdateService.getCurrentVersion();
    setCurrentVersion(version);
  }, []);

  /**
   * 检查更新
   */
  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setError(null);
    setUpdateInfo(null);

    try {
      const info = await appUpdateService.checkForUpdate();
      setUpdateInfo(info);
    } catch (err: any) {
      setError(err.message || '检查更新失败，请稍后重试');
      console.error('检查更新失败:', err);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 下载更新
   */
  const handleDownload = async () => {
    if (!updateInfo) return;

    setIsDownloading(true);
    setError(null);
    setDownloadProgress(null);

    try {
      // 使用新的 downloadApk 方法，支持优先从 EAS 下载
      const fileUri = await appUpdateService.downloadApk(
        updateInfo,
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      // 下载完成，提示安装
      Alert.alert(
        '下载完成',
        'APK 已下载完成，是否立即安装？',
        [
          { text: '稍后', style: 'cancel' },
          {
            text: '安装',
            onPress: async () => {
              try {
                await appUpdateService.installApk(fileUri);
              } catch (err: any) {
                Alert.alert('安装失败', err.message || '无法启动安装程序');
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '下载失败，请稍后重试');
      Alert.alert('下载失败', err.message || '无法下载更新文件');
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  /**
   * 格式化文件大小
   */
  const formatFileSize = (bytes: number): string => {
    return appUpdateService.formatFileSize(bytes);
  };

  /**
   * 格式化进度百分比
   */
  const formatProgress = (progress: number): string => {
    return `${Math.round(progress * 100)}%`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>检查更新</Text>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* 当前版本信息 */}
        {currentVersion && (
          <View style={styles.versionCard}>
            <Text style={styles.versionLabel}>当前版本</Text>
            <Text style={styles.versionText}>
              v{currentVersion.version} (Build {currentVersion.versionCode})
            </Text>
          </View>
        )}

        {/* 检查更新按钮 */}
        <TouchableOpacity
          style={[styles.checkButton, (isChecking || isDownloading) && styles.checkButtonDisabled]}
          onPress={handleCheckUpdate}
          disabled={isChecking || isDownloading}
          activeOpacity={0.7}
        >
          {isChecking ? (
            <>
              <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkButtonText}>检查中...</Text>
            </>
          ) : (
            <>
              <FontAwesome6 name="arrow-rotate-right" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.checkButtonText}>检查更新</Text>
            </>
          )}
        </TouchableOpacity>

        {/* 错误提示 */}
        {error && (
          <View style={styles.errorCard}>
            <FontAwesome6 name="circle-exclamation" size={20} color="#EF4444" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* 更新信息 */}
        {updateInfo && (
          <View style={styles.updateCard}>
            {updateInfo.hasUpdate ? (
              <>
                <View style={styles.updateHeader}>
                  <FontAwesome6 name="circle-check" size={24} color="#10B981" />
                  <Text style={styles.updateTitle}>发现新版本</Text>
                </View>

                <View style={styles.updateInfo}>
                  <View style={styles.updateInfoRow}>
                    <Text style={styles.updateInfoLabel}>最新版本：</Text>
                    <Text style={styles.updateInfoValue}>
                      v{updateInfo.latestVersion} (Build {updateInfo.latestVersionCode})
                    </Text>
                  </View>

                  {updateInfo.updateLog && (
                    <View style={styles.updateInfoRow}>
                      <Text style={styles.updateInfoLabel}>更新内容：</Text>
                      <Text style={styles.updateInfoValue}>{updateInfo.updateLog}</Text>
                    </View>
                  )}

                  {updateInfo.fileSize > 0 && (
                    <View style={styles.updateInfoRow}>
                      <Text style={styles.updateInfoLabel}>文件大小：</Text>
                      <Text style={styles.updateInfoValue}>{formatFileSize(updateInfo.fileSize)}</Text>
                    </View>
                  )}
                </View>

                {/* 下载进度 */}
                {isDownloading && downloadProgress && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${downloadProgress.progress * 100}%` },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>
                      {formatProgress(downloadProgress.progress)} ({formatFileSize(downloadProgress.totalBytesWritten)} / {formatFileSize(downloadProgress.totalBytesExpectedToWrite)})
                    </Text>
                  </View>
                )}

                {/* 下载按钮 */}
                <TouchableOpacity
                  style={[
                    styles.downloadButton,
                    (isDownloading || isChecking) && styles.downloadButtonDisabled,
                  ]}
                  onPress={handleDownload}
                  disabled={isDownloading || isChecking}
                  activeOpacity={0.7}
                >
                  {isDownloading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.downloadButtonText}>下载中...</Text>
                    </>
                  ) : (
                    <>
                      <FontAwesome6 name="download" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                      <Text style={styles.downloadButtonText}>立即更新</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <View style={styles.noUpdateCard}>
                <FontAwesome6 name="circle-check" size={24} color="#10B981" />
                <Text style={styles.noUpdateText}>当前已是最新版本</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AppUpdateScreen;

