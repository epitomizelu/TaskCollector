

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
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  pageTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  calendarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    gap: 8,
  },
  currentDate: {
    fontSize: 14,
    color: '#6B7280',
  },
  tabContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#4F46E5',
  },
  tabButtonInactive: {
    backgroundColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: '#FFFFFF',
  },
  tabButtonTextInactive: {
    color: '#6B7280',
  },
  taskListContainer: {
    paddingHorizontal: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  taskList: {
    gap: 12,
    paddingBottom: 20,
  },
  emptyStateContainer: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyStateIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: '#F9FAFB',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  createPlanButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#4F46E5',
    borderRadius: 8,
  },
  createPlanButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalBackground: {
    flex: 1,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
    maxHeight: '50%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
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
  dateOptions: {
    paddingVertical: 16,
  },
  dateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dateOptionSelected: {
    backgroundColor: '#F3F4F6',
  },
  dateOptionContent: {
    marginLeft: 12,
    flex: 1,
  },
  dateOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  dateOptionSubtext: {
    fontSize: 14,
    color: '#6B7280',
  },
  datePickerContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  datePickerLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 8,
  },
  datePickerInput: {
    width: '100%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 16,
    color: '#1F2937',
  },
});

