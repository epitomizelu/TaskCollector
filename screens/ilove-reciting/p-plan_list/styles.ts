

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
  },
  headerPlaceholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 24,
  },
  statsSection: {
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  planListSection: {
    paddingHorizontal: 24,
  },
  planListHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  planListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  planCount: {
    fontSize: 14,
    color: '#6B7280',
  },
  planList: {
    gap: 16,
  },
  progressBarContainer: {
    marginBottom: 12,
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarActive: {
    height: '100%',
    borderRadius: 4,
  },
  progressBarCompleted: {
    height: '100%',
    backgroundColor: '#22C55E',
    borderRadius: 4,
  },
  createPlanSection: {
    paddingHorizontal: 24,
    marginTop: 32,
  },
  createPlanButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
  createPlanIcon: {
    marginRight: 8,
  },
  createPlanText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});

