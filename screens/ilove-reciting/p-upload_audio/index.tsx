

import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome6 } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { recitingService } from '../../../services/reciting.service';
import { apiService } from '../../../services/api.service';
import { API_CONFIG } from '../../../config/api.config';
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

  const startUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setUploadStatus('准备上传...');
    setUploadSpeed(0);
    startTimeRef.current = Date.now();

    try {
      // 读取文件为 Base64
      setUploadStatus('读取文件...');
      const fileBase64 = await FileSystem.readAsStringAsync(selectedFile.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // 计算文件大小（Base64 编码后）
      const fileSize = fileBase64.length;
      const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB 每片（Base64 编码后约 2.67MB）
      const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

      setUploadStatus(`上传中 (0/${totalChunks})...`);

      // 分片上传
      const uploadId = `audio_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const fileName = selectedFile.name;
      const cloudPath = `reciting/audio/${uploadId}/${fileName}`;

      // 上传所有分片
      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, fileSize);
        const chunkBase64 = fileBase64.substring(start, end);

        // 调用云函数上传分片
        const response = await fetch(`${API_CONFIG.BASE_URL}/storage/upload-chunk`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.API_KEY || ''}`,
          },
          body: JSON.stringify({
            u: uploadId,
            i: i,
            t: totalChunks,
            p: cloudPath,
            d: chunkBase64,
            n: fileName,
          }),
        });

        if (!response.ok) {
          throw new Error(`上传分片 ${i + 1}/${totalChunks} 失败`);
        }

        // 更新进度
        const progress = ((i + 1) / totalChunks) * 100;
        const currentTime = Date.now();
        const elapsedTime = (currentTime - startTimeRef.current) / 1000;
        const uploadedSize = ((i + 1) * CHUNK_SIZE) / (1024 * 1024);
        const speed = uploadedSize / elapsedTime;

        setUploadProgress(progress);
        setUploadSpeed(speed);
        setUploadStatus(`上传中 (${i + 1}/${totalChunks})...`);
      }

      // 完成分片上传
      setUploadStatus('合并文件...');
      const completeResponse = await fetch(`${API_CONFIG.BASE_URL}/storage/complete-chunk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_CONFIG.API_KEY || ''}`,
        },
        body: JSON.stringify({
          u: uploadId,
          t: totalChunks,
          p: cloudPath,
          n: fileName,
        }),
      });

      if (!completeResponse.ok) {
        throw new Error('合并文件失败');
      }

      const completeResult = await completeResponse.json();
      if (completeResult.code !== 0) {
        throw new Error(completeResult.message || '合并文件失败');
      }

      // 创建内容记录并触发处理
      setUploadStatus('创建任务...');
      const content = await recitingService.createContent(
        {
          title: fileName.replace(/\.[^/.]+$/, ''), // 移除扩展名
          type: 'audio',
          sentenceCount: 0,
          status: 'not_started',
          fileSize: selectedFile.size,
          mimeType: selectedFile.mimeType,
        },
        selectedFile.uri
      );

      // 触发音频处理
      setUploadStatus('启动处理任务...');
      try {
        const processResponse = await fetch(`${API_CONFIG.BASE_URL}/reciting/audio/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${API_CONFIG.API_KEY || ''}`,
          },
          body: JSON.stringify({
            contentId: content.id,
            audioUrl: completeResult.data.fileUrl,
          }),
        });
        if (!processResponse.ok) {
          console.warn('触发处理任务失败，但上传已成功');
        }
      } catch (error) {
        console.warn('触发处理任务失败，但上传已成功:', error);
      }

      setUploadProgress(100);
      setUploadStatus('上传成功');
      uploadComplete();
    } catch (error: any) {
      console.error('上传失败:', error);
      showError(error.message || '上传失败，请重试');
      setIsUploading(false);
    }
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
              音频文件已成功上传，正在后台处理中。{'\n'}
              处理完成后将通过站内信通知您。
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

