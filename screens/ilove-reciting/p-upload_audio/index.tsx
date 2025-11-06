

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import styles from './styles';

interface FileInfo {
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}

const UploadAudioScreen = () => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<FileInfo | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('准备上传...');
  const [isUploading, setIsUploading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('网络错误，请重试');
  
  const uploadIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);

  const handleBackPress = () => {
    if (!isUploading) {
      router.back();
    }
  };

  const handleSelectFile = async () => {
    if (isUploading) return;

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const file = result.assets[0];
        handleFileSelect({
          uri: file.uri,
          name: file.name,
          size: file.size || 0,
          mimeType: file.mimeType || '',
        });
      }
    } catch (error) {
      showError('选择文件时出错');
    }
  };

  const handleFileSelect = (file: FileInfo) => {
    // 验证文件类型
    if (!file.mimeType.startsWith('audio/')) {
      showError('请选择音频文件');
      return;
    }

    // 验证文件大小 (100MB)
    if (file.size > 100 * 1024 * 1024) {
      showError('文件大小不能超过 100MB');
      return;
    }

    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    if (!isUploading) {
      setSelectedFile(null);
      setUploadProgress(0);
      setUploadStatus('准备上传...');
      setUploadSpeed(0);
    }
  };

  const handleStartUpload = () => {
    if (selectedFile && !isUploading) {
      startUpload();
    }
  };

  const handleCancel = () => {
    if (!isUploading) {
      router.back();
    }
  };

  const startUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('上传中...');
    setUploadSpeed(0);
    startTimeRef.current = Date.now();
    
    // 模拟上传进度
    simulateUpload();
  };

  const simulateUpload = () => {
    let progress = 0;
    
    uploadIntervalRef.current = setInterval(() => {
      progress += Math.random() * 15; // 随机增加进度
      
      if (progress >= 100) {
        progress = 100;
        if (uploadIntervalRef.current) {
          clearInterval(uploadIntervalRef.current);
        }
        
        // 上传完成
        setTimeout(() => {
          uploadComplete();
        }, 500);
      }
      
      updateProgress(progress);
    }, 200) as unknown as number;
  };

  const updateProgress = (progress: number) => {
    const currentTime = Date.now();
    const elapsedTime = (currentTime - startTimeRef.current) / 1000; // 秒
    const uploadedSize = (selectedFile?.size || 0 * progress / 100) / (1024 * 1024); // MB
    const speed = uploadedSize / elapsedTime; // MB/s
    
    setUploadProgress(progress);
    setUploadSpeed(speed);
  };

  const uploadComplete = () => {
    setIsUploading(false);
    setShowSuccessModal(true);
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const handleSuccessOk = () => {
    setShowSuccessModal(false);
    router.back();
  };

  const handleErrorRetry = () => {
    setShowErrorModal(false);
    if (selectedFile) {
      startUpload();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
        <Text style={styles.headerTitle}>上传音频</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* 上传说明 */}
        <View style={styles.uploadInfoSection}>
          <View style={styles.uploadInfoCard}>
            <View style={styles.uploadInfoHeader}>
              <View style={styles.uploadIconContainer}>
                <FontAwesome6 name="file-audio" size={32} color="#4F46E5" />
              </View>
              <Text style={styles.uploadInfoTitle}>选择音频文件</Text>
              <Text style={styles.uploadInfoDescription}>
                支持 MP3、WAV、FLAC 等格式，文件大小不超过 100MB
              </Text>
            </View>
            
            {/* 上传区域 */}
            <TouchableOpacity
              style={styles.uploadArea}
              onPress={handleSelectFile}
              disabled={isUploading}
            >
              <FontAwesome6 name="cloud-arrow-up" size={40} color="#6B7280" />
              <Text style={styles.uploadAreaText}>点击选择文件</Text>
              <Text style={styles.uploadAreaSubText}>支持 MP3、WAV、FLAC 格式</Text>
              <View style={styles.selectFileButton}>
                <FontAwesome6 name="folder-open" size={16} color="#FFFFFF" />
                <Text style={styles.selectFileButtonText}>选择音频文件</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 已选择文件信息 */}
        {selectedFile && (
          <View style={styles.fileInfoSection}>
            <View style={styles.fileInfoCard}>
              <View style={styles.fileInfoHeader}>
                <Text style={styles.fileInfoTitle}>已选择文件</Text>
                <TouchableOpacity
                  style={styles.removeFileButton}
                  onPress={handleRemoveFile}
                  disabled={isUploading}
                >
                  <FontAwesome6 name="xmark" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.fileDetails}>
                <View style={styles.fileIconContainer}>
                  <FontAwesome6 name="file-audio" size={20} color="#4F46E5" />
                </View>
                <View style={styles.fileInfoContent}>
                  <Text style={styles.fileName}>{selectedFile.name}</Text>
                  <Text style={styles.fileSize}>{formatFileSize(selectedFile.size)}</Text>
                  <Text style={styles.fileType}>{selectedFile.mimeType}</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* 上传进度 */}
        {isUploading && (
          <View style={styles.uploadProgressSection}>
            <View style={styles.uploadProgressCard}>
              <View style={styles.uploadProgressHeader}>
                <Text style={styles.uploadProgressTitle}>上传进度</Text>
                <Text style={styles.progressPercentage}>{Math.round(uploadProgress)}%</Text>
              </View>
              
              <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${uploadProgress}%` }]} />
              </View>
              
              <View style={styles.uploadProgressFooter}>
                <Text style={styles.uploadStatus}>{uploadStatus}</Text>
                <Text style={styles.uploadSpeed}>{uploadSpeed.toFixed(2)} MB/s</Text>
              </View>
            </View>
          </View>
        )}

        {/* 操作按钮 */}
        <View style={styles.actionButtonsSection}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!selectedFile || isUploading) && styles.uploadButtonDisabled,
            ]}
            onPress={handleStartUpload}
            disabled={!selectedFile || isUploading}
          >
            <FontAwesome6 
              name={isUploading ? "spinner" : "arrow-up"} 
              size={16} 
              color="#FFFFFF" 
            />
            <Text style={styles.uploadButtonText}>
              {isUploading ? '上传中...' : '开始上传'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={isUploading}
          >
            <FontAwesome6 name="xmark" size={16} color="#1F2937" />
            <Text style={styles.cancelButtonText}>取消</Text>
          </TouchableOpacity>
        </View>

        {/* 支持格式说明 */}
        <View style={styles.formatInfoSection}>
          <View style={styles.formatInfoCard}>
            <Text style={styles.formatInfoTitle}>支持格式</Text>
            <View style={styles.formatGrid}>
              <View style={styles.formatItem}>
                <FontAwesome6 name="music" size={24} color="#4F46E5" />
                <Text style={styles.formatName}>MP3</Text>
                <Text style={styles.formatDescription}>音频格式</Text>
              </View>
              <View style={styles.formatItem}>
                <FontAwesome6 name="wave-square" size={24} color="#06B6D4" />
                <Text style={styles.formatName}>WAV</Text>
                <Text style={styles.formatDescription}>无损音频</Text>
              </View>
              <View style={styles.formatItem}>
                <FontAwesome6 name="compact-disc" size={24} color="#10B981" />
                <Text style={styles.formatName}>FLAC</Text>
                <Text style={styles.formatDescription}>无损压缩</Text>
              </View>
            </View>
            <View style={styles.warningContainer}>
              <FontAwesome6 name="triangle-exclamation" size={16} color="#F59E0B" />
              <View style={styles.warningContent}>
                <Text style={styles.warningTitle}>注意事项</Text>
                <Text style={styles.warningText}>
                  文件大小限制 100MB，过大的文件可能影响上传速度
                </Text>
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
        onRequestClose={handleSuccessOk}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconContainer}>
              <FontAwesome6 name="check" size={24} color="#22C55E" />
            </View>
            <Text style={styles.modalTitle}>上传成功</Text>
            <Text style={styles.modalMessage}>
              音频文件已成功上传，正在处理中...
            </Text>
            <TouchableOpacity style={styles.modalButton} onPress={handleSuccessOk}>
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
            <TouchableOpacity style={styles.modalButton} onPress={handleErrorRetry}>
              <Text style={styles.modalButtonText}>重试</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default UploadAudioScreen;

