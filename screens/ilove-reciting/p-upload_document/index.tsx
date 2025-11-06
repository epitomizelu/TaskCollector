

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import styles from './styles';

interface SelectedFile {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const UploadDocumentScreen = () => {
  const router = useRouter();
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('文件上传过程中出现错误');

  const progressIntervalRef = useRef<number | null>(null);

  const handleBackPress = () => {
    if (!isUploading) {
      router.back();
    }
  };

  const handleUploadAreaPress = async () => {
    if (isUploading) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets) {
        const newFiles: SelectedFile[] = result.assets.map(asset => ({
          uri: asset.uri,
          name: asset.name,
          size: asset.size || 0,
          mimeType: asset.mimeType || '',
        }));
        handleFileSelection(newFiles);
      }
    } catch (error) {
      showError('文件选择失败，请重试');
    }
  };

  const handleFileSelection = (files: SelectedFile[]) => {
    const validFiles = files.filter(file => {
      const allowedTypes = ['text/plain', 'application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      const fileSizeMB = file.size / (1024 * 1024);

      if (!allowedTypes.includes(file.mimeType)) {
        showError(`不支持的文件格式: ${file.name}`);
        return false;
      }

      if (fileSizeMB > 50) {
        showError(`文件过大: ${file.name} (超过 50MB)`);
        return false;
      }

      return true;
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUploadPress = () => {
    if (selectedFiles.length > 0 && !isUploading) {
      startUpload();
    }
  };

  const handleCancelPress = () => {
    if (!isUploading) {
      router.back();
    }
  };

  const startUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);

    // 模拟上传进度
    let progress = 0;
    progressIntervalRef.current = setInterval(() => {
      progress += Math.random() * 15;

      if (progress >= 100) {
        progress = 100;
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }

        // 上传完成
        setTimeout(() => {
          completeUpload();
        }, 500);
      }

      setUploadProgress(progress);
    }, 200) as unknown as number;
  };

  const completeUpload = () => {
    setIsUploading(false);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleSuccessConfirm = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const handleErrorConfirm = () => {
    setShowErrorModal(false);
    setIsUploading(false);
    setUploadProgress(0);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadStatusText = (): string => {
    if (uploadProgress < 30) {
      return '正在上传文件...';
    } else if (uploadProgress < 70) {
      return '正在解析文档...';
    } else {
      return '正在处理内容...';
    }
  };

  const getFileIcon = (mimeType: string): string => {
    switch (mimeType) {
      case 'text/plain':
        return 'file-lines';
      case 'application/pdf':
        return 'file-pdf';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return 'file-word';
      default:
        return 'file';
    }
  };

  const getFileIconColor = (mimeType: string): string => {
    switch (mimeType) {
      case 'text/plain':
        return '#3B82F6';
      case 'application/pdf':
        return '#EF4444';
      case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        return '#3B82F6';
      default:
        return '#06B6D4';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          disabled={isUploading}
        >
          <FontAwesome6 name="arrow-left" size={20} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>上传文档</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 文档上传区域 */}
        <View style={styles.uploadSection}>
          <TouchableOpacity
            style={[styles.uploadArea, isUploading && styles.uploadAreaDisabled]}
            onPress={handleUploadAreaPress}
            disabled={isUploading}
          >
            <View style={styles.uploadIconContainer}>
              <FontAwesome6 name="file-lines" size={32} color="#06B6D4" />
            </View>
            <Text style={styles.uploadTitle}>选择文档文件</Text>
            <Text style={styles.uploadDescription}>支持 TXT、PDF、DOCX 格式</Text>
            <Text style={styles.uploadSizeInfo}>最大支持 50MB</Text>
          </TouchableOpacity>
        </View>

        {/* 已选择文件列表 */}
        {selectedFiles.length > 0 && (
          <View style={styles.selectedFilesSection}>
            <Text style={styles.sectionTitle}>已选择文件</Text>
            <View style={styles.filesList}>
              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <View style={styles.fileInfo}>
                    <View style={styles.fileIconWrapper}>
                      <FontAwesome6
                        name={getFileIcon(file.mimeType)}
                        size={16}
                        color={getFileIconColor(file.mimeType)}
                      />
                    </View>
                    <View style={styles.fileDetails}>
                      <Text style={styles.fileName} numberOfLines={1}>
                        {file.name}
                      </Text>
                      <Text style={styles.fileSize}>
                        {formatFileSize(file.size)}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removeFileButton}
                    onPress={() => handleRemoveFile(index)}
                    disabled={isUploading}
                  >
                    <FontAwesome6 name="xmark" size={14} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 上传进度 */}
        {isUploading && (
          <View style={styles.uploadProgressSection}>
            <View style={styles.progressCard}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>上传中...</Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(uploadProgress)}%
                </Text>
              </View>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${uploadProgress}%` },
                  ]}
                />
              </View>
              <View style={styles.uploadStatusContainer}>
                <View style={styles.loadingSpinner} />
                <Text style={styles.uploadStatusText}>
                  {getUploadStatusText()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (selectedFiles.length === 0 || isUploading) && styles.uploadButtonDisabled,
            ]}
            onPress={handleUploadPress}
            disabled={selectedFiles.length === 0 || isUploading}
          >
            <FontAwesome6 name="cloud-arrow-up" size={16} color="#FFFFFF" />
            <Text style={styles.uploadButtonText}>上传文档</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelPress}
            disabled={isUploading}
          >
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>

        {/* 支持格式说明 */}
        <View style={styles.formatInfoSection}>
          <View style={styles.formatInfoCard}>
            <Text style={styles.formatInfoTitle}>支持格式</Text>
            <View style={styles.formatGrid}>
              <View style={styles.formatItem}>
                <FontAwesome6 name="file-lines" size={20} color="#3B82F6" />
                <Text style={styles.formatLabel}>TXT</Text>
              </View>
              <View style={styles.formatItem}>
                <FontAwesome6 name="file-pdf" size={20} color="#EF4444" />
                <Text style={styles.formatLabel}>PDF</Text>
              </View>
              <View style={styles.formatItem}>
                <FontAwesome6 name="file-word" size={20} color="#3B82F6" />
                <Text style={styles.formatLabel}>DOCX</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 成功提示模态框 */}
      <Modal
        visible={showSuccessModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <FontAwesome6 name="check" size={24} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>上传成功</Text>
            <Text style={styles.modalMessage}>文档已成功上传，正在处理中</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleSuccessConfirm}
            >
              <Text style={styles.modalButtonText}>确定</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 错误提示模态框 */}
      <Modal
        visible={showErrorModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.errorIconContainer}>
              <FontAwesome6 name="triangle-exclamation" size={24} color="#EF4444" />
            </View>
            <Text style={styles.modalTitle}>上传失败</Text>
            <Text style={styles.modalMessage}>{errorMessage}</Text>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleErrorConfirm}
            >
              <Text style={styles.modalButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default UploadDocumentScreen;

