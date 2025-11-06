

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome5, FontAwesome6 } from '@expo/vector-icons';
import styles from './styles';

interface PlanData {
  id: string;
  title: string;
  content: string;
  period: number;
  startDate: string;
  completedDate?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  totalDays: number;
  todayTask: string;
  todayStatus: 'completed' | 'pending' | 'expired';
  memoryEffect?: string;
}

interface PlanItemProps {
  plan: PlanData;
  onPress: () => void;
  renderProgressBar: (progress: number, total: number, status: string) => React.ReactNode;
}

const PlanItem: React.FC<PlanItemProps> = ({ plan, onPress, renderProgressBar }) => {
  const getStatusStyle = () => {
    switch (plan.status) {
      case 'active':
        return styles.statusActive;
      case 'completed':
        return styles.statusCompleted;
      case 'paused':
        return styles.statusPaused;
      default:
        return styles.statusActive;
    }
  };

  const getStatusText = () => {
    switch (plan.status) {
      case 'active':
        return '进行中';
      case 'completed':
        return '已完成';
      case 'paused':
        return '已暂停';
      default:
        return '进行中';
    }
  };

  const getTodayStatusIcon = () => {
    if (plan.status === 'completed') {
      if (plan.memoryEffect === '优秀') {
        return 'trophy';
      }
      return 'star';
    }
    
    switch (plan.todayStatus) {
      case 'completed':
        return 'check';
      case 'pending':
        return 'clock';
      case 'expired':
        return 'exclamation-triangle';
      default:
        return 'clock';
    }
  };

  const getTodayStatusColor = () => {
    if (plan.status === 'completed') {
      return '#F59E0B';
    }
    
    switch (plan.todayStatus) {
      case 'completed':
        return '#22C55E';
      case 'pending':
        return '#F59E0B';
      case 'expired':
        return '#EF4444';
      default:
        return '#F59E0B';
    }
  };

  const getTodayStatusText = () => {
    if (plan.status === 'completed') {
      return plan.memoryEffect || '良好';
    }
    
    switch (plan.todayStatus) {
      case 'completed':
        return '已完成';
      case 'pending':
        return '待完成';
      case 'expired':
        return '已过期';
      default:
        return '待完成';
    }
  };

  const getProgressText = () => {
    if (plan.status === 'completed') {
      return `${plan.progress}/${plan.totalDays} 天`;
    }
    return `${plan.progress}/${plan.totalDays} 天`;
  };

  const getProgressLabel = () => {
    return plan.status === 'completed' ? '完成度' : '进度';
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{plan.title}</Text>
          <Text style={styles.content}>内容：{plan.content}</Text>
          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <FontAwesome6 name="calendar" size={10} color="#6B7280" />
              <Text style={styles.metaText}>周期：{plan.period}天</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome5 name="calendar-alt" size={10} color="#6B7280" />
              <Text style={styles.metaText}>
                {plan.status === 'completed' ? '完成：' : '开始：'}{plan.status === 'completed' ? plan.completedDate : plan.startDate}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.statusBadge, getStatusStyle()]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{getProgressLabel()}</Text>
          <Text style={styles.progressText}>{getProgressText()}</Text>
        </View>
        {renderProgressBar(plan.progress, plan.totalDays, plan.status)}
      </View>

      <View style={styles.footer}>
        <Text style={styles.todayTask}>
          {plan.status === 'completed' ? '记忆效果：' : '今日任务：'}{plan.status === 'completed' ? plan.memoryEffect : plan.todayTask}
        </Text>
        <View style={styles.todayStatus}>
          <FontAwesome6 
            name={getTodayStatusIcon()} 
            size={14} 
            color={getTodayStatusColor()} 
          />
          <Text style={[styles.todayStatusText, { color: getTodayStatusColor() }]}>
            {getTodayStatusText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default PlanItem;

