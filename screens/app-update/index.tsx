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
  const [isApplyingEASOTA, setIsApplyingEASOTA] = useState(false);
  const [isDownloadingJSBundleOTA, setIsDownloadingJSBundleOTA] = useState(false);
  const [jsBundleProgress, setJSBundleProgress] = useState<DownloadProgress | null>(null);

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
   * 应用 EAS OTA 更新
   */
  const handleApplyEASOTAUpdate = async () => {
    setIsApplyingEASOTA(true);
    setError(null);

    try {
      Alert.alert(
        '应用 EAS OTA 更新',
        '应用将重启以应用更新，是否继续？',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '确定',
            onPress: async () => {
              try {
                await unifiedUpdateService.applyEASOTAUpdate();
                // reloadAsync 会重启应用，这里不会执行
              } catch (err: any) {
                setError(err.message || '应用更新失败');
                Alert.alert('更新失败', err.message || '无法应用更新');
              } finally {
                setIsApplyingEASOTA(false);
              }
            },
          },
        ]
      );
    } catch (err: any) {
      setError(err.message || '应用更新失败');
      setIsApplyingEASOTA(false);
    }
  };

  /**
   * 下载并应用自建 JS Bundle OTA 更新
   */
  const handleDownloadJSBundleOTA = async () => {
    if (!unifiedUpdateInfo?.jsBundleOtaUpdate) return;

    setIsDownloadingJSBundleOTA(true);
    setError(null);
    setJSBundleProgress(null);

    try {
      await unifiedUpdateService.downloadAndApplyJSBundleOTA(
        (progress) => {
          setJSBundleProgress({
            totalBytesWritten: progress.totalBytesWritten,
            totalBytesExpectedToWrite: progress.totalBytesExpectedToWrite,
            progress: progress.progress,
          });
        }
      );

      // 注意：applyUpdate 内部已经处理了重启提示，这里不需要再次提示
      // 更新已自动应用，用户可以选择立即重启或稍后重启
    } catch (err: any) {
      setError(err.message || '下载失败，请稍后重试');
      Alert.alert('下载失败', err.message || '无法下载更新文件');
    } finally {
      setIsDownloadingJSBundleOTA(false);
      setJSBundleProgress(null);
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

        {/* EAS OTA 更新信息 */}
        {unifiedUpdateInfo && unifiedUpdateInfo.easOtaUpdate && (
          <View style={[styles.updateCard, styles.otaUpdateCard]}>
            <View style={styles.updateHeader}>
              <View style={styles.updateTypeBadge}>
                <FontAwesome6 name="cloud-arrow-down" size={20} color="#3B82F6" />
                <Text style={styles.updateTypeText}>EAS OTA 更新</Text>
              </View>
            </View>
            <View style={styles.updateInfo}>
              {unifiedUpdateInfo.easOtaUpdate.isAvailable ? (
                <>
                  <Text style={styles.updateInfoValue}>
                    EAS OTA 更新可以快速更新应用代码，无需重新安装。更新后应用将自动重启。
                  </Text>
                  {unifiedUpdateInfo.easOtaUpdate.isDownloaded && (
                    <View style={styles.downloadedBadge}>
                      <FontAwesome6 name="check" size={12} color="#10B981" />
                      <Text style={styles.downloadedText}>更新已下载，等待应用</Text>
                    </View>
                  )}
                </>
              ) : (
                <>
                  <Text style={styles.updateInfoValue}>
                    {unifiedUpdateInfo.easOtaUpdate.error 
                      ? `EAS OTA 更新状态: ${unifiedUpdateInfo.easOtaUpdate.error.message}`
                      : '当前已是最新版本，无需 EAS OTA 更新。'}
                  </Text>
                  {__DEV__ && (
                    <View style={styles.infoBadge}>
                      <FontAwesome6 name="info-circle" size={12} color="#6B7280" />
                      <Text style={styles.infoText}>开发环境不支持 EAS OTA 更新检查</Text>
                    </View>
                  )}
                </>
              )}
            </View>
            {unifiedUpdateInfo.easOtaUpdate.isAvailable && (
              <TouchableOpacity
                style={[
                  styles.otaButton,
                  isApplyingEASOTA && styles.downloadButtonDisabled,
                ]}
                onPress={handleApplyEASOTAUpdate}
                disabled={isApplyingEASOTA}
                activeOpacity={0.7}
              >
                {isApplyingEASOTA ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadButtonText}>应用更新中...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome6 name="cloud-arrow-down" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadButtonText}>应用 EAS OTA 更新</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* 自建 JS Bundle OTA 更新信息 */}
        {unifiedUpdateInfo && unifiedUpdateInfo.jsBundleOtaUpdate && (
          <View style={[styles.updateCard, { borderLeftColor: '#8B5CF6' }]}>
            <View style={styles.updateHeader}>
              <View style={styles.updateTypeBadge}>
                <FontAwesome6 name="code" size={20} color="#8B5CF6" />
                <Text style={styles.updateTypeText}>自建 JS Bundle OTA 更新</Text>
              </View>
            </View>
            <View style={styles.updateInfo}>
              {unifiedUpdateInfo.jsBundleOtaUpdate.hasUpdate ? (
                <>
                  <View style={styles.updateInfoRow}>
                    <Text style={styles.updateInfoLabel}>最新版本：</Text>
                    <Text style={styles.updateInfoValue}>
                      v{unifiedUpdateInfo.jsBundleOtaUpdate.latestVersion} (JS Build {unifiedUpdateInfo.jsBundleOtaUpdate.latestJsVersionCode})
                    </Text>
                  </View>
                  {unifiedUpdateInfo.jsBundleOtaUpdate.fileSize > 0 && (
                    <View style={styles.updateInfoRow}>
                      <Text style={styles.updateInfoLabel}>文件大小：</Text>
                      <Text style={styles.updateInfoValue}>{formatFileSize(unifiedUpdateInfo.jsBundleOtaUpdate.fileSize)}</Text>
                    </View>
                  )}
                  <Text style={[styles.updateInfoValue, { marginTop: 8 }]}>
                    自建 JS Bundle OTA 更新可以快速更新应用代码，无需重新安装。下载完成后需要重启应用。
                  </Text>
                </>
              ) : (
                <Text style={styles.updateInfoValue}>
                  当前已是最新版本，无需自建 JS Bundle OTA 更新。
                </Text>
              )}
            </View>

            {/* 下载进度 */}
            {isDownloadingJSBundleOTA && jsBundleProgress && (
              <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${jsBundleProgress.progress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {formatProgress(jsBundleProgress.progress)} ({formatFileSize(jsBundleProgress.totalBytesWritten)} / {formatFileSize(jsBundleProgress.totalBytesExpectedToWrite)})
                </Text>
              </View>
            )}

            {unifiedUpdateInfo.jsBundleOtaUpdate.hasUpdate && (
              <TouchableOpacity
                style={[
                  styles.otaButton,
                  { backgroundColor: '#8B5CF6' },
                  (isDownloadingJSBundleOTA || isChecking) && styles.downloadButtonDisabled,
                ]}
                onPress={handleDownloadJSBundleOTA}
                disabled={isDownloadingJSBundleOTA || isChecking}
                activeOpacity={0.7}
              >
                {isDownloadingJSBundleOTA ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadButtonText}>下载中...</Text>
                  </>
                ) : (
                  <>
                    <FontAwesome6 name="code" size={16} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.downloadButtonText}>下载 JS Bundle 更新</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* APK 更新信息 */}
        {updateInfo && (
          <View style={[styles.updateCard, styles.apkUpdateCard]}>
            {updateInfo.hasUpdate ? (
              <>
                <View style={styles.updateHeader}>
                  <View style={styles.updateTypeBadge}>
                    <FontAwesome6 name="mobile-screen-button" size={20} color="#10B981" />
                    <Text style={styles.updateTypeText}>APK 更新</Text>
                  </View>
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
                    styles.apkButton,
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
                      <Text style={styles.downloadButtonText}>下载 APK 更新</Text>
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

