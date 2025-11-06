

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
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4F46E5',
    marginBottom: 4,
  },
  activeNumber: {
    color: '#10B981',
  },
  completedNumber: {
    color: '#22C55E',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
});

