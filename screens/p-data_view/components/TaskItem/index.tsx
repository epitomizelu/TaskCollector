

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import styles from './styles';

interface Task {
  id: string;
  name: string;
  time: string;
  status: 'completed' | 'ongoing';
}

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress, onEdit, onDelete }) => {
  const getStatusIcon = () => {
    return task.status === 'completed' ? 'check' : 'clock';
  };

  const getStatusColor = () => {
    return task.status === 'completed' ? '#10b981' : '#f59e0b';
  };

  const getStatusText = () => {
    return task.status === 'completed' ? '完成' : '进行中';
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.content} onPress={onPress} activeOpacity={0.7}>
        <View style={styles.leftSection}>
          <View style={[styles.statusIcon, { backgroundColor: getStatusColor() }]}>
            <FontAwesome6 name={getStatusIcon()} size={14} color="#ffffff" />
          </View>
          <View style={styles.taskInfo}>
            <Text style={styles.taskName}>{task.name}</Text>
            <Text style={styles.taskTime}>
              {task.time} {getStatusText()}
            </Text>
          </View>
        </View>
        <View style={styles.rightSection}>
          <FontAwesome6 name="chevron-right" size={14} color="#6b7280" />
        </View>
      </TouchableOpacity>
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit} testID="edit-task-button">
          <FontAwesome6 name="pen-to-square" size={14} color="#6366f1" />
          <Text style={styles.actionText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={onDelete} testID="delete-task-button">
          <FontAwesome6 name="trash-can" size={14} color="#ef4444" />
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TaskItem;

