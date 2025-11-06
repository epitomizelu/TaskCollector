

import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
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
  completedContainer: {
    opacity: 0.7,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  timeText: {
    fontSize: 12,
    color: '#6B7280',
  },
  completedText: {
    textDecorationLine: 'line-through',
  },
  rightSection: {
    marginLeft: 12,
  },
  completedCheckbox: {
    width: 24,
    height: 24,
    backgroundColor: '#22C55E1A',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incompleteCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
  },
});

