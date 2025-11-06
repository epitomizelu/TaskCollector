

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerContent: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  content: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  metaInfo: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusActive: {
    backgroundColor: 'rgba(79, 70, 229, 0.1)',
  },
  statusCompleted: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
  },
  statusPaused: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressSection: {
    marginBottom: 12,
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
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  todayTask: {
    fontSize: 14,
    color: '#6B7280',
  },
  todayStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  todayStatusText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

