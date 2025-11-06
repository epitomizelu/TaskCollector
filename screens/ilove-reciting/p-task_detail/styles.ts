

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
    backgroundColor: '#F3F4F6',
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
  
  // 通用区域样式
  section: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  card: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  // 句子内容
  sentenceText: {
    fontSize: 18,
    color: '#1F2937',
    lineHeight: 28,
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  sentenceTranslation: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
  },
  
  // 音频播放控制
  playbackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
  },
  playIconAdjustment: {
    marginLeft: 4,
  },
  speedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
  
  // 进度条
  progressContainer: {
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressBar: {
    width: '100%',
    height: 40,
  },
  progressThumb: {
    width: 20,
    height: 20,
    backgroundColor: '#4F46E5',
  },
  modeIndicator: {
    alignItems: 'center',
  },
  modeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // 录音功能
  recordingControls: {
    alignItems: 'center',
    marginBottom: 16,
  },
  recordButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recordButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#EF4444',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  recordingTimeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  recordingStatus: {
    alignItems: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // 录音播放区域
  recordedAudio: {
    marginTop: 16,
  },
  recordPlaybackControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  recordPlayButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#06B6D4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  recordDurationText: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // 音频对比
  comparisonControls: {
    alignItems: 'center',
    marginBottom: 16,
  },
  compareButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  comparisonStatus: {
    alignItems: 'center',
  },
  comparisonPlaying: {
    alignItems: 'center',
    marginTop: 16,
  },
  comparisonIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  comparisonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#F59E0B',
    marginLeft: 8,
  },
  
  // 学习提示
  tipsContent: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipIconPrimary: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  tipIconSecondary: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  tipIconTertiary: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  tipText: {
    flex: 1,
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  
  // 底部按钮
  bottomSpacing: {
    height: 100,
  },
  bottomAction: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    padding: 24,
    paddingBottom: Platform.select({
      ios: 34,
      android: 24,
    }),
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    gap: 8,
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
  completeButtonCompleted: {
    backgroundColor: '#22C55E',
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

