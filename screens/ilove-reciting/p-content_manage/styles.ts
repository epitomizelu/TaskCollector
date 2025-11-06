

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  searchButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  tabContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: {
    backgroundColor: '#4F46E5',
  },
  tabInactive: {
    backgroundColor: '#F9FAFB',
  },
  tabIcon: {
    marginRight: 8,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: '#6B7280',
  },
  statsContainer: {
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  statsCard: {
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
  statsInfo: {
    flex: 1,
  },
  statsLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  statsCount: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  statsIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentListContainer: {
    paddingHorizontal: 24,
    paddingBottom: 100,
    gap: 12,
  },
  contentItem: {
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
  contentItemLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contentItemIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  contentItemInfo: {
    flex: 1,
  },
  contentItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 4,
  },
  contentItemDate: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  contentItemCount: {
    fontSize: 12,
    color: '#6B7280',
  },
  contentItemRight: {
    alignItems: 'center',
  },
  statusIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statusText: {
    fontSize: 12,
    color: '#6B7280',
  },
  uploadFab: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 24,
  },
  modalOptions: {
    gap: 16,
  },
  modalOption: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  modalOptionInfo: {
    flex: 1,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  modalOptionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  modalCancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
  },
});

