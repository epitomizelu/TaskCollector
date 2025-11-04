/**
 * 迁移示例：将 AsyncStorage 替换为 taskService
 * 
 * 这个文件展示了如何将现有代码从直接使用 AsyncStorage
 * 迁移到使用 taskService（支持本地存储和云端同步）
 */

// ========== 示例 1: 主页面 (p-home/index.tsx) ==========

// ❌ 之前的代码（直接使用 AsyncStorage）
/*
import AsyncStorage from '@react-native-async-storage/async-storage';

const initializeData = async () => {
  try {
    const tasksJson = await AsyncStorage.getItem('@taskCollection');
    if (!tasksJson) {
      // 添加示例数据
      await AsyncStorage.setItem('@taskCollection', JSON.stringify(sampleTasks));
    } else {
      const tasks = JSON.parse(tasksJson);
      setRecentTasks(tasks.slice(0, 3));
      updateTaskStats(tasks);
    }
  } catch (error) {
    console.error('初始化数据失败:', error);
  }
};

const saveTaskToStorage = async (taskData: TaskData) => {
  const tasksJson = await AsyncStorage.getItem('@taskCollection');
  let tasks: TaskData[] = tasksJson ? JSON.parse(tasksJson) : [];
  tasks.unshift(taskData);
  await AsyncStorage.setItem('@taskCollection', JSON.stringify(tasks));
};
*/

// ✅ 新的代码（使用 taskService）
import { taskService } from '../services/task.service';

const initializeData = async () => {
  try {
    const tasks = await taskService.getAllTasks();
    if (tasks.length === 0) {
      // 添加示例数据（如果需要）
      for (const sampleTask of sampleTasks) {
        await taskService.createTask(sampleTask);
      }
      setRecentTasks(sampleTasks.slice(0, 3));
      updateTaskStats(sampleTasks);
    } else {
      setRecentTasks(tasks.slice(0, 3));
      updateTaskStats(tasks);
    }
  } catch (error) {
    console.error('初始化数据失败:', error);
  }
};

const saveTaskToStorage = async (taskData: TaskData) => {
  await taskService.createTask(taskData);
};

// ========== 示例 2: 数据视图页面 (p-data_view/index.tsx) ==========

// ❌ 之前的代码
/*
const loadTasksFromStorage = async () => {
  const tasksJson = await AsyncStorage.getItem('@taskCollection');
  if (tasksJson) {
    const tasks = JSON.parse(tasksJson);
    // 转换为按日期分组的格式
    const groupedTasks: TaskData = {};
    tasks.forEach((task: any) => {
      if (!groupedTasks[task.recordDate]) {
        groupedTasks[task.recordDate] = [];
      }
      groupedTasks[task.recordDate].push({
        id: task.taskId,
        name: task.taskName,
        time: task.completionTime.split(' ')[1],
        status: 'completed',
        completionTime: task.completionTime
      });
    });
    return groupedTasks;
  }
  return {};
};
*/

// ✅ 新的代码
const loadTasksFromStorage = async () => {
  const tasks = await taskService.getAllTasks();
  // 转换为按日期分组的格式
  const groupedTasks: TaskData = {};
  tasks.forEach((task) => {
    if (!groupedTasks[task.recordDate]) {
      groupedTasks[task.recordDate] = [];
    }
    groupedTasks[task.recordDate].push({
      id: task.taskId,
      name: task.taskName,
      time: task.completionTime.split(' ')[1],
      status: 'completed',
      completionTime: task.completionTime
    });
  });
  return groupedTasks;
};

// ========== 示例 3: 删除任务 ==========

// ❌ 之前的代码
/*
const handleDeleteTask = async (taskId: string) => {
  const tasksJson = await AsyncStorage.getItem('@taskCollection');
  if (tasksJson) {
    const tasks = JSON.parse(tasksJson);
    const remainingTasks = tasks.filter((task: TaskData) => task.taskId !== taskId);
    await AsyncStorage.setItem('@taskCollection', JSON.stringify(remainingTasks));
    // 更新UI
    setRecentTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
    await updateTaskStatsFromStorage();
  }
};
*/

// ✅ 新的代码
const handleDeleteTask = async (taskId: string) => {
  try {
    await taskService.deleteTask(taskId);
    // 更新UI
    setRecentTasks(prevTasks => prevTasks.filter(task => task.taskId !== taskId));
    await updateTaskStatsFromStorage();
    showToast('任务已删除');
  } catch (error) {
    console.error('删除任务失败:', error);
    showToast('删除失败，请重试');
  }
};

// ========== 示例 4: 清空今日任务 ==========

// ❌ 之前的代码
/*
if (actionType === 'clear_today') {
  const tasksJson = await AsyncStorage.getItem('@taskCollection');
  if (tasksJson) {
    const tasks = JSON.parse(tasksJson);
    const today = new Date().toISOString().split('T')[0];
    const remainingTasks = tasks.filter((task: any) => task.recordDate !== today);
    await AsyncStorage.setItem('@taskCollection', JSON.stringify(remainingTasks));
  }
}
*/

// ✅ 新的代码
if (actionType === 'clear_today') {
  const today = new Date().toISOString().split('T')[0];
  await taskService.deleteTasksByDate(today);
}

// ========== 示例 5: 清空所有数据 ==========

// ❌ 之前的代码
/*
if (actionType === 'clear_all') {
  await AsyncStorage.removeItem('@taskCollection');
}
*/

// ✅ 新的代码
if (actionType === 'clear_all') {
  await taskService.deleteAllTasks();
}

// ========== 示例 6: 获取今日任务 ==========

// ❌ 之前的代码
/*
const loadTodayTasks = async () => {
  const tasksJson = await AsyncStorage.getItem('@taskCollection');
  if (tasksJson) {
    const allTasks: TaskData[] = JSON.parse(tasksJson);
    const today = new Date().toISOString().split('T')[0];
    const todayTasksData = allTasks.filter(task => task.recordDate === today);
    // ...
  }
};
*/

// ✅ 新的代码
const loadTodayTasks = async () => {
  const today = new Date().toISOString().split('T')[0];
  const todayTasksData = await taskService.getTasksByDate(today);
  // ...
};

// ========== 额外功能：云端同步控制 ==========

// 在应用设置页面，可以添加云端同步开关
import { taskService } from '../services/task.service';
import { useState } from 'react';

const SettingsScreen = () => {
  const [useCloud, setUseCloud] = useState(taskService.getUseCloud());

  const toggleCloudSync = async (enabled: boolean) => {
    await taskService.setUseCloud(enabled);
    setUseCloud(enabled);
    
    if (enabled) {
      // 启用云端后，立即同步一次
      try {
        await taskService.manualSync();
        showToast('云端同步已启用，数据已同步');
      } catch (error) {
        showToast('同步失败，请检查网络连接');
      }
    } else {
      showToast('已切换到本地存储模式');
    }
  };

  return (
    <View>
      <Switch
        value={useCloud}
        onValueChange={toggleCloudSync}
      />
      <Text>启用云端同步</Text>
    </View>
  );
};

