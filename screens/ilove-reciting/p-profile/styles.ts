

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  userProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  userAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  userLevel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  experienceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  experienceBar: {
    width: 80,
    height: 4,
    backgroundColor: '#E5E7EB',
    borderRadius: 2,
    marginRight: 8,
  },
  experienceProgress: {
    width: '75%',
    height: 4,
    backgroundColor: '#4F46E5',
    borderRadius: 2,
  },
  experienceText: {
    fontSize: 12,
    color: '#6B7280',
  },
  editButton: {
    padding: 8,
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    width: '47%',
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
  statContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 2,
  },
  tertiaryValue: {
    color: '#10B981',
  },
  secondaryValue: {
    color: '#06B6D4',
  },
  warningValue: {
    color: '#F59E0B',
  },
  statUnit: {
    fontSize: 12,
    color: '#6B7280',
  },
  statIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryIcon: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  secondaryIcon: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  tertiaryIcon: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  warningIcon: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  memoryCurveCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
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
  memoryCurveHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  memoryCurveTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  curveDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  memoryCurveChart: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  chartContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 80,
    paddingHorizontal: 8,
  },
  chartBarContainer: {
    alignItems: 'center',
    flex: 1,
  },
  chartBar: {
    width: 24,
    backgroundColor: '#4F46E5',
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    marginBottom: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  memoryInsights: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  insightItem: {
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  primaryValue: {
    color: '#4F46E5',
  },
  insightLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  functionList: {
    gap: 12,
  },
  functionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  functionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  functionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  functionIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  functionText: {
    flex: 1,
  },
  functionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  functionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  viewAllButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  recentList: {
    gap: 12,
  },
  recentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
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
  recentContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentText: {
    flex: 1,
  },
  recentTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  recentSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentRight: {
    alignItems: 'flex-end',
  },
  recentDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  recentStatus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedStatus: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  pendingStatus: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
});

