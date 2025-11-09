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
import { unifiedUpdateService, UnifiedUpdateInfo } from '../../services/unified-update.service';
import { updateService } from '../../services/update.service';
import styles from './styles';

const AppUpdateScreen: React.FC = () => {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [unifiedUpdateInfo, setUnifiedUpdateInfo] = useState<UnifiedUpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentVersion, setCurrentVersion] = useState<{ version: string; versionCode: number } | null>(null);
  const [isApplyingOTA, setIsApplyingOTA] = useState(false);

  useEffect(() => {
    // 获取当前版本信息
    const version = appUpdateService.getCurrentVersion();
    setCurrentVersion(version);
  }, []);

  /**
   * 检查更新（统一检查 OTA 和 APK 更新）
   */
  const handleCheckUpdate = async () => {
    setIsChecking(true);
    setError(null);
    setUpdateInfo(null);
    setUnifiedUpdateInfo(null);

    try {
      // 使用统一更新服务检查所有类型的更新
      const unifiedInfo = await unifiedUpdateService.checkForUpdates();
      setUnifiedUpdateInfo(unifiedInfo);
      
      // 为了兼容原有 UI，也设置 APK 更新信息
      if (unifiedInfo.apkUpdate) {
        setUpdateInfo({
          hasUpdate: unifiedInfo.apkUpdate.hasUpdate,
          latestVersion: unifiedInfo.apkUpdate.latestVersion,
          latestVersionCode: unifiedInfo.apkUpdate.latestVersionCode,
          downloadUrl: unifiedInfo.apkUpdate.downloadUrl,
          easDownloadUrl: unifiedInfo.apkUpdate.easDownloadUrl,
          forceUpdate: unifiedInfo.apkUpdate.forceUpdate,
          updateLog: unifiedInfo.apkUpdate.updateLog,
          fileSize: unifiedInfo.apkUpdate.fileSize,
          releaseDate: unifiedInfo.apkUpdate.releaseDate,
        });
      }
    } catch (err: any) {
      setError(err.message || '检查更新失败，请稍后重试');
      console.error('检查更新失败:', err);
    } finally {
      setIsChecking(false);
    }
  };

  /**
   * 应用 OTA 更新
   */
  const handleApplyOTAUpdate = async () => {
    setIsApplyingOTA(true);
    setError(null);

    try {
      Alert.alert(
        '应用更新',
        '应用将重启以应用更新，是否继续？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: async () => {
              try {
                await unifiedUpdateService.applyOTAUpdate();
                // reloadAsync 会重启应用，这里不会执行
              } catch (err: any) {
                setError(err.message || '应用更新失败');
                Alert.alert('更新失败', err.message || '无法应用更新');
              } finally {
                setIsApplyingOTA(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '应用更新失败');
      setIsApplyingOTA(false);
    }
  };

  /**
   * 下载 APK 更新
   */
  const handleDownload = async () => {
    if (!updateInfo || !unifiedUpdateInfo?.apkUpdate) return;

    setIsDownloading(true);
    setError(null);
    setDownloadProgress(null);

    try {
      // 使用统一更新服务下载 APK
      const fileUri = await unifiedUpdateService.downloadAPKUpdate(
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
                await unifiedUpdateService.installAPK(fileUri);
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

        {/* OTA 更新信息 */}
        {unifiedUpdateInfo && unifiedUpdateInfo.otaUpdate?.isAvailable && (
          <View style={styles.updateCard}>
            <View style={styles.updateHeader}>
              <FontAwesome6 name="cloud-arrow-down" size={24} color="#3B82F6" />
              <Text style={styles.updateTitle}>发现 OTA 更新</Text>
            </View>
            <View style={styles.updateInfo}>
              <Text style={styles.updateInfoValue}>
                OTA 更新可以快速更新应用代码，无需重新安装。更新后应用将自动重启。
              </Text>
            </View>
            <TouchableOpacity
              style={[
                styles.downloadButton,
                isApplyingOTA && styles.downloadButtonDisabled,
              ]}
              onPress={handleApplyOTAUpdate}
              disabled={isApplyingOTA}
              activeOpacity={0.7}
            >
              {isApplyingOTA ? (
                <>
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadButtonText}>应用更新中...</Text>
                </>
              ) : (
                <>
                  <FontAwesome6 name="cloud-arrow-down" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                  <Text style={styles.downloadButtonText}>应用 OTA 更新</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* APK 更新信息 */}
        {updateInfo && (
          <View style={styles.updateCard}>
            {updateInfo.hasUpdate ? (
              <>
                <View style={styles.updateHeader}>
                  <FontAwesome6 name="circle-check" size={24} color="#10B981" />
                  <Text style={styles.updateTitle}>
                    {unifiedUpdateInfo?.updateType === 'both' ? '发现 APK 更新' : '发现新版本'}
                  </Text>
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

