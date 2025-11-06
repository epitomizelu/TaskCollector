

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
  content: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },

  // 通用section样式
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },

  // 内容选择
  contentSelectButton: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  contentSelectIconContainer: {
    marginBottom: 8,
  },
  contentSelectText: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 4,
  },
  contentSelectSubtext: {
    fontSize: 12,
    color: '#6B7280',
  },

  // 参数设置
  parameterGroup: {
    marginBottom: 24,
  },
  parameterLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 12,
  },

  // 周期选择
  durationOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  durationOption: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    alignItems: 'center',
  },
  durationOptionSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  durationOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
  },
  durationOptionTextSelected: {
    color: '#FFFFFF',
  },

  // 日期选择
  dateSelectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
  dateSelectLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateSelectText: {
    fontSize: 16,
    color: '#1F2937',
  },

  // 计划预览
  previewContainer: {
    gap: 12,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  previewContent: {
    flex: 1,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  previewSubtitle: {
    fontSize: 12,
    color: '#6B7280',
  },

  // 生成计划按钮
  generateSection: {
    paddingTop: 16,
  },
  generateButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  generateButtonDisabled: {
    backgroundColor: '#D1D5DB',
    ...Platform.select({
      ios: {
        shadowOpacity: 0,
      },
      android: {
        elevation: 0,
      },
    }),
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingSpinner: {
    width: 24,
    height: 24,
    borderWidth: 3,
    borderColor: '#F3F4F6',
    borderTopColor: '#FFFFFF',
    borderRadius: 12,
    marginTop: 8,
  },

  // 模态框样式
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // 日期选择模态框
  dateOptions: {
    gap: 8,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  dateOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  dateOptionSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },

  // 内容选择模态框
  contentOptions: {
    gap: 12,
  },
  contentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
  },
  contentOptionSelected: {
    borderColor: '#4F46E5',
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  contentOptionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentOptionInfo: {
    flex: 1,
  },
  contentOptionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  contentOptionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
});

