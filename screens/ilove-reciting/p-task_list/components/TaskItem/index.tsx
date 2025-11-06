

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { TaskItemProps } from '../../types';
import styles from './styles';

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
  const getIconBackgroundColor = () => {
    if (task.completed) {
      return `${task.iconColor}1A`; // 10% opacity
    }
    return `${task.iconColor}1A`; // 10% opacity for incomplete tasks
  };

  const getTimeText = () => {
    if (task.completed && task.completedAt) {
      return `完成于 ${task.completedAt}`;
    }
    if (task.estimatedTime) {
      return `预计用时 ${task.estimatedTime}`;
    }
    return '';
  };

  return (
    <TouchableOpacity
      style={[styles.container, task.completed && styles.completedContainer]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftSection}>
          <View style={[styles.iconContainer, { backgroundColor: getIconBackgroundColor() }]}>
            <FontAwesome6 name={task.icon} size={20} color={task.iconColor} />
          </View>
          <View style={styles.textContainer}>
            <Text style={[styles.title, task.completed && styles.completedText]}>
              {task.title}
            </Text>
            <Text style={[styles.description, task.completed && styles.completedText]}>
              {task.description}
            </Text>
            {getTimeText() ? (
              <Text style={styles.timeText}>{getTimeText()}</Text>
            ) : null}
          </View>
        </View>
        <View style={styles.rightSection}>
          {task.completed ? (
            <View style={styles.completedCheckbox}>
              <FontAwesome6 name="check" size={12} color="#22C55E" />
            </View>
          ) : (
            <View style={styles.incompleteCheckbox} />
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default TaskItem;

