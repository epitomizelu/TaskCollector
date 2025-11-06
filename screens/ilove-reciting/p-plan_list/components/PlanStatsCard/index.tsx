

import React from 'react';
import { View, Text } from 'react-native';
import styles from './styles';

interface PlanStatsCardProps {
  totalPlans: number;
  activePlans: number;
  completedPlans: number;
}

const PlanStatsCard: React.FC<PlanStatsCardProps> = ({
  totalPlans,
  activePlans,
  completedPlans,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>计划概览</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{totalPlans}</Text>
          <Text style={styles.statLabel}>总计划</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.activeNumber]}>{activePlans}</Text>
          <Text style={styles.statLabel}>进行中</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, styles.completedNumber]}>{completedPlans}</Text>
          <Text style={styles.statLabel}>已完成</Text>
        </View>
      </View>
    </View>
  );
};

export default PlanStatsCard;

