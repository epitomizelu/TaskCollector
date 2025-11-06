

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // 顶部导航栏
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 40,
  },
  
  // 滚动视图
  scrollView: {
    flex: 1,
  },
  
  // 上传说明区域
  uploadInfoSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  uploadInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadInfoHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadInfoTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  uploadInfoDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // 上传区域
  uploadArea: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 32,
    alignItems: 'center',
  },
  uploadAreaText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 8,
    marginTop: 16,
  },
  uploadAreaSubText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  selectFileButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // 文件信息区域
  fileInfoSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  fileInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  fileInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  fileInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  removeFileButton: {
    padding: 4,
  },
  fileDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  fileIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fileInfoContent: {
    flex: 1,
  },
  fileName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  fileSize: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  fileType: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // 上传进度区域
  uploadProgressSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  uploadProgressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  uploadProgressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadProgressTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  progressBarContainer: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 6,
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
  },
  uploadProgressFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  uploadStatus: {
    fontSize: 14,
    color: '#6B7280',
  },
  uploadSpeed: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // 操作按钮区域
  actionButtonsSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 16,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  cancelButtonText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '500',
  },
  
  // 支持格式说明区域
  formatInfoSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  formatInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  formatInfoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  formatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 16,
  },
  formatItem: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 8,
  },
  formatName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginTop: 8,
    marginBottom: 4,
  },
  formatDescription: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  warningContent: {
    flex: 1,
  },
  warningTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12,
    color: '#6B7280',
  },
  
  // 模态框样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});

