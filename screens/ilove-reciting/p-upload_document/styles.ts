

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
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
  scrollView: {
    flex: 1,
  },
  uploadSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 12,
  },
  uploadArea: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
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
  uploadAreaDisabled: {
    opacity: 0.6,
  },
  uploadIconContainer: {
    width: 80,
    height: 80,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  uploadTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  uploadDescription: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  uploadSizeInfo: {
    fontSize: 12,
    color: '#6B7280',
  },
  selectedFilesSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  filesList: {
    gap: 12,
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fileIconWrapper: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 2,
  },
  fileSize: {
    fontSize: 12,
    color: '#6B7280',
  },
  removeFileButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
  },
  uploadProgressSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  progressCard: {
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
  progressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#6B7280',
  },
  progressPercentage: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4F46E5',
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#4F46E5',
    borderRadius: 4,
  },
  uploadStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingSpinner: {
    width: 16,
    height: 16,
    borderWidth: 2,
    borderColor: '#4F46E5',
    borderTopColor: 'transparent',
    borderRadius: 8,
    marginRight: 8,
  },
  uploadStatusText: {
    fontSize: 14,
    color: '#6B7280',
  },
  actionButtons: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    gap: 12,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
  },
  uploadButtonDisabled: {
    backgroundColor: '#9CA3AF',
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  cancelButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  formatInfoSection: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    paddingBottom: 32,
  },
  formatInfoCard: {
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
  formatInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  formatGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  formatItem: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    flex: 1,
    marginHorizontal: 4,
  },
  formatLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    width: '100%',
    maxWidth: 320,
  },
  successIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  errorIconContainer: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  modalButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
  },
});

