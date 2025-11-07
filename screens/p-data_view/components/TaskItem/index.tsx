

import React from 'react';
import { View, Text, TouchableOpacity, Pressable, Alert } from 'react-native';
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

  const handleEdit = () => {
    console.log('✅ 编辑按钮被点击:', task.id);
    console.log('任务详情:', task);
    console.log('onEdit 回调函数:', typeof onEdit, onEdit);
    
    if (!task.id) {
      console.error('❌ 任务ID无效，无法编辑:', task);
      Alert.alert('错误', '任务ID无效，无法编辑');
      return;
    }
    
    if (typeof onEdit !== 'function') {
      console.error('❌ onEdit 不是函数:', onEdit);
      Alert.alert('错误', '编辑回调函数无效');
      return;
    }
    
    try {
      console.log('准备调用 onEdit 回调...');
      onEdit();
      console.log('onEdit 回调已调用');
    } catch (error) {
      console.error('编辑按钮处理错误:', error);
      Alert.alert('错误', `编辑失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDelete = () => {
    console.log('✅ 删除按钮被点击:', task.id);
    console.log('任务详情:', task);
    console.log('onDelete 回调函数:', typeof onDelete, onDelete);
    
    if (!task.id) {
      console.error('❌ 任务ID无效，无法删除:', task);
      Alert.alert('错误', '任务ID无效，无法删除');
      return;
    }
    
    if (typeof onDelete !== 'function') {
      console.error('❌ onDelete 不是函数:', onDelete);
      Alert.alert('错误', '删除回调函数无效');
      return;
    }
    
    try {
      console.log('准备调用 onDelete 回调...');
      onDelete();
      console.log('onDelete 回调已调用');
    } catch (error) {
      console.error('删除按钮处理错误:', error);
      Alert.alert('错误', `删除失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.content} 
        onPress={onPress} 
        activeOpacity={0.7}
      >
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
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleEdit}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
          testID="edit-task-button"
          disabled={false}
        >
          <FontAwesome6 name="pen-to-square" size={16} color="#6366f1" />
          <Text style={styles.actionText}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleDelete}
          activeOpacity={0.6}
          hitSlop={{ top: 25, bottom: 25, left: 25, right: 25 }}
          testID="delete-task-button"
          disabled={false}
        >
          <FontAwesome6 name="trash-can" size={16} color="#ef4444" />
          <Text style={styles.deleteText}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default TaskItem;

