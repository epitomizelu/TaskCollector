

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
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  userGreeting: {
    flex: 1,
  },
  greetingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  subtitleText: {
    fontSize: 14,
    color: '#6B7280',
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 12,
    height: 12,
    backgroundColor: '#EF4444',
    borderRadius: 6,
  },
  learningOverview: {
    paddingHorizontal: 24,
    marginBottom: 24,
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
  primaryIconBg: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  secondaryIconBg: {
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
  },
  tertiaryIconBg: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  warningIconBg: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  todayTasksSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  todayTasksCard: {
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
  todayTasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  todayTasksTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  todayDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskProgress: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    width: '37.5%',
    height: '100%',
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  taskStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  taskStatItem: {
    alignItems: 'center',
  },
  taskStatNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  taskStatLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  quickActionsSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  quickActionCard: {
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
  quickActionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  quickActionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentLearningSection: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  recentLearningHeader: {
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
  recentItems: {
    gap: 12,
  },
  recentItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  recentItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  recentItemInfo: {
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  recentItemSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  recentItemRight: {
    alignItems: 'center',
  },
  recentItemDate: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  recentItemStatus: {
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
  bottomSpacing: {
    height: 100,
  },
});

