

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  
  // 顶部导航栏
  header: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
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
  
  // 应用信息区域
  appInfoSection: {
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  
  appInfoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
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
  
  appLogo: {
    width: 96,
    height: 96,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  
  appName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  
  appSlogan: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 24,
  },
  
  versionInfo: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
  },
  
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  versionLabel: {
    fontSize: 16,
    color: '#6B7280',
  },
  
  versionNumber: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4F46E5',
  },
  
  appDescription: {
    fontSize: 16,
    color: '#6B7280',
    lineHeight: 24,
    textAlign: 'center',
  },
  
  // 联系我们
  contactSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
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
  
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  
  contactItemWithBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  
  contactItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  
  contactIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  websiteIcon: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  
  emailIcon: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  
  phoneIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  
  termsIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  
  privacyIcon: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  
  contactTextContainer: {
    flex: 1,
  },
  
  contactTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  
  contactSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  
  // 法律信息
  legalSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  
  legalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
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
  
  // 版权声明
  copyrightSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  
  copyrightCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
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
  
  copyrightText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  buildInfo: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
});

