

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  
  // 顶部导航栏
  header: {
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  
  headerPlaceholder: {
    width: 40,
  },
  
  // 滚动视图
  scrollView: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  
  // 成功提示卡片
  successCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginBottom: 32,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  
  successDescription: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  
  // 数据统计
  exportStats: {
    backgroundColor: '#f9fafb',
    borderRadius: 12,
    padding: 16,
    width: '100%',
  },
  
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  statItem: {
    alignItems: 'center',
  },
  
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  // 操作按钮
  actionButtons: {
    marginBottom: 32,
  },
  
  downloadButton: {
    backgroundColor: '#6366f1',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  downloadButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  
  copyButton: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  
  copyButtonText: {
    color: '#1f2937',
    fontSize: 18,
    fontWeight: '500',
    marginLeft: 12,
  },
  
  // 提示信息
  tipsSection: {
    backgroundColor: '#dbeafe',
    borderRadius: 16,
    padding: 24,
    marginBottom: 32,
  },
  
  tipsContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  
  tipsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 4,
  },
  
  tipsText: {
    flex: 1,
  },
  
  tipsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 8,
  },
  
  tipsList: {
    gap: 4,
  },
  
  tipsItem: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  
  // Toast提示框
  toast: {
    position: 'absolute',
    top: 80,
    left: '50%',
    transform: [{ translateX: -100 }],
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 1000,
    minWidth: 200,
    alignItems: 'center',
  },
  
  toastText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});

