/**
 * 认识自己模块数据服务
 * 处理老师清单、人生目标清单、价值观和原则清单
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { API_CONFIG, API_ENDPOINTS } from '../config/api.config';

const TEACHERS_KEY = '@selfAwarenessTeachers';
const GOALS_KEY = '@selfAwarenessGoals';
const VALUES_KEY = '@selfAwarenessValues';

// 老师清单接口
export interface Teacher {
  teacherId: string;
  name: string;
  description?: string;
  fields?: string[]; // 领域/专业
  qualities?: string[]; // 品质/特点
  learnings?: string[]; // 学习要点
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}

// 人生目标清单接口
export interface Goal {
  goalId: string;
  title: string;
  description?: string;
  category?: string; // 分类：life, career, health, relationship, etc.
  priority?: number; // 优先级：1-高, 2-中, 3-低
  deadline?: string | null; // 截止日期
  status?: 'pending' | 'in_progress' | 'completed' | 'abandoned'; // 状态
  milestones?: string[]; // 里程碑
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}

// 价值观和原则清单接口
export interface Value {
  valueId: string;
  name: string;
  description?: string;
  type?: 'value' | 'principle'; // 类型：value-价值观, principle-原则
  importance?: number; // 重要性：1-最重要, 2-重要, 3-一般
  examples?: string[]; // 实例/应用场景
  notes?: string; // 备注
  order?: number; // 排序
  createdAt: string;
  updatedAt: string;
}

class SelfAwarenessService {
  // ========== 老师清单 ==========
  
  /**
   * 获取所有老师
   */
  async getTeachers(): Promise<Teacher[]> {
    try {
      // 优先从本地获取，快速显示
      const teachersJson = await AsyncStorage.getItem(TEACHERS_KEY);
      let localTeachers: Teacher[] = [];
      if (teachersJson) {
        localTeachers = JSON.parse(teachersJson);
      }
      
      if (API_CONFIG.API_KEY) {
        try {
          // 从云端获取最新数据
          const cloudTeachers = await apiService.getSelfAwarenessTeachers();
          // 保存到本地
          await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(cloudTeachers));
          return cloudTeachers;
        } catch (error) {
          console.error('从云端获取老师列表失败，使用本地数据:', error);
          // 云端获取失败，使用本地数据
          return localTeachers;
        }
      } else {
        // 没有 API Key，仅使用本地数据
        return localTeachers;
      }
    } catch (error) {
      console.error('获取老师列表失败:', error);
      // 尝试从本地获取
      try {
        const teachersJson = await AsyncStorage.getItem(TEACHERS_KEY);
        if (teachersJson) {
          return JSON.parse(teachersJson);
        }
      } catch (e) {
        console.error('从本地获取老师列表失败:', e);
      }
      return [];
    }
  }

  /**
   * 获取单个老师
   */
  async getTeacher(teacherId: string): Promise<Teacher | null> {
    try {
      if (API_CONFIG.API_KEY) {
        const teacher = await apiService.getSelfAwarenessTeacherById(teacherId);
        return teacher || null;
      } else {
        const teachers = await this.getTeachers();
        return teachers.find(t => t.teacherId === teacherId) || null;
      }
    } catch (error) {
      console.error('获取老师失败:', error);
      const teachers = await this.getTeachers();
      return teachers.find(t => t.teacherId === teacherId) || null;
    }
  }

  /**
   * 创建老师
   */
  async createTeacher(teacher: Omit<Teacher, 'teacherId' | 'createdAt' | 'updatedAt'>): Promise<Teacher> {
    // 先创建本地数据，确保数据不丢失
    const now = new Date().toISOString();
    const teacherId = `teacher_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTeacher: Teacher = {
      ...teacher,
      teacherId: teacherId,
      createdAt: now,
      updatedAt: now,
    };
    
    // 先保存到本地
    const teachers = await this.getTeachers();
    teachers.push(newTeacher);
    await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
    
    // 如果配置了 API Key，同步到云端（使用本地生成的ID）
    if (API_CONFIG.API_KEY) {
      try {
        const cloudTeacher = await apiService.createSelfAwarenessTeacher({
          ...teacher,
          teacherId: teacherId,
          createdAt: now,
        });
        // 使用云端返回的数据更新本地
        const index = teachers.findIndex(t => t.teacherId === teacherId);
        if (index !== -1) {
          teachers[index] = cloudTeacher;
          await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
          return cloudTeacher;
        }
      } catch (error) {
        console.error('同步老师到云端失败，但已保存到本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return newTeacher;
  }

  /**
   * 更新老师
   */
  async updateTeacher(teacherId: string, updates: Partial<Teacher>): Promise<Teacher> {
    // 先更新本地，确保数据不丢失
    const teachers = await this.getTeachers();
    const index = teachers.findIndex(t => t.teacherId === teacherId);
    if (index === -1) {
      throw new Error('老师不存在');
    }
    
    // 更新本地数据
    teachers[index] = {
      ...teachers[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
    const updatedTeacher = teachers[index];
    
    // 如果配置了 API Key，异步同步到云端
    if (API_CONFIG.API_KEY) {
      try {
        const cloudTeacher = await apiService.updateSelfAwarenessTeacher(teacherId, updates);
        // 使用云端返回的数据
        teachers[index] = cloudTeacher;
        await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(teachers));
        return cloudTeacher;
      } catch (error) {
        console.error('同步老师更新到云端失败，但已更新本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return updatedTeacher;
  }

  /**
   * 删除老师
   */
  async deleteTeacher(teacherId: string): Promise<void> {
    // 先从本地删除，确保立即生效
    const teachers = await this.getTeachers();
    const filtered = teachers.filter(t => t.teacherId !== teacherId);
    await AsyncStorage.setItem(TEACHERS_KEY, JSON.stringify(filtered));
    
    // 如果配置了 API Key，异步从云端删除
    if (API_CONFIG.API_KEY) {
      try {
        await apiService.deleteSelfAwarenessTeacher(teacherId);
      } catch (error) {
        console.error('从云端删除老师失败，但已从本地删除:', error);
        // 云端删除失败不影响本地删除
      }
    }
  }

  // ========== 人生目标清单 ==========
  
  /**
   * 获取所有目标
   */
  async getGoals(): Promise<Goal[]> {
    try {
      // 优先从本地获取，快速显示
      const goalsJson = await AsyncStorage.getItem(GOALS_KEY);
      let localGoals: Goal[] = [];
      if (goalsJson) {
        localGoals = JSON.parse(goalsJson);
      }
      
      if (API_CONFIG.API_KEY) {
        try {
          // 从云端获取最新数据
          const cloudGoals = await apiService.getSelfAwarenessGoals();
          // 保存到本地
          await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(cloudGoals));
          return cloudGoals;
        } catch (error) {
          console.error('从云端获取目标列表失败，使用本地数据:', error);
          // 云端获取失败，使用本地数据
          return localGoals;
        }
      } else {
        // 没有 API Key，仅使用本地数据
        return localGoals;
      }
    } catch (error) {
      console.error('获取目标列表失败:', error);
      try {
        const goalsJson = await AsyncStorage.getItem(GOALS_KEY);
        if (goalsJson) {
          return JSON.parse(goalsJson);
        }
      } catch (e) {
        console.error('从本地获取目标列表失败:', e);
      }
      return [];
    }
  }

  /**
   * 获取单个目标
   */
  async getGoal(goalId: string): Promise<Goal | null> {
    try {
      if (API_CONFIG.API_KEY) {
        const goal = await apiService.getSelfAwarenessGoalById(goalId);
        return goal || null;
      } else {
        const goals = await this.getGoals();
        return goals.find(g => g.goalId === goalId) || null;
      }
    } catch (error) {
      console.error('获取目标失败:', error);
      const goals = await this.getGoals();
      return goals.find(g => g.goalId === goalId) || null;
    }
  }

  /**
   * 创建目标
   */
  async createGoal(goal: Omit<Goal, 'goalId' | 'createdAt' | 'updatedAt'>): Promise<Goal> {
    // 先创建本地数据，确保数据不丢失
    const now = new Date().toISOString();
    const goalId = `goal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newGoal: Goal = {
      ...goal,
      goalId: goalId,
      createdAt: now,
      updatedAt: now,
    };
    
    // 先保存到本地
    const goals = await this.getGoals();
    goals.push(newGoal);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    
    // 如果配置了 API Key，同步到云端（使用本地生成的ID）
    if (API_CONFIG.API_KEY) {
      try {
        const cloudGoal = await apiService.createSelfAwarenessGoal({
          ...goal,
          goalId: goalId,
          createdAt: now,
        });
        // 使用云端返回的数据更新本地
        const index = goals.findIndex(g => g.goalId === goalId);
        if (index !== -1) {
          goals[index] = cloudGoal;
          await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
          return cloudGoal;
        }
      } catch (error) {
        console.error('同步目标到云端失败，但已保存到本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return newGoal;
  }

  /**
   * 更新目标
   */
  async updateGoal(goalId: string, updates: Partial<Goal>): Promise<Goal> {
    // 先更新本地，确保数据不丢失
    const goals = await this.getGoals();
    const index = goals.findIndex(g => g.goalId === goalId);
    if (index === -1) {
      throw new Error('目标不存在');
    }
    
    // 更新本地数据
    goals[index] = {
      ...goals[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
    const updatedGoal = goals[index];
    
    // 如果配置了 API Key，异步同步到云端
    if (API_CONFIG.API_KEY) {
      try {
        const cloudGoal = await apiService.updateSelfAwarenessGoal(goalId, updates);
        // 使用云端返回的数据
        goals[index] = cloudGoal;
        await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals));
        return cloudGoal;
      } catch (error) {
        console.error('同步目标更新到云端失败，但已更新本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return updatedGoal;
  }

  /**
   * 删除目标
   */
  async deleteGoal(goalId: string): Promise<void> {
    // 先从本地删除，确保立即生效
    const goals = await this.getGoals();
    const filtered = goals.filter(g => g.goalId !== goalId);
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(filtered));
    
    // 如果配置了 API Key，异步从云端删除
    if (API_CONFIG.API_KEY) {
      try {
        await apiService.deleteSelfAwarenessGoal(goalId);
      } catch (error) {
        console.error('从云端删除目标失败，但已从本地删除:', error);
        // 云端删除失败不影响本地删除
      }
    }
  }

  // ========== 价值观和原则清单 ==========
  
  /**
   * 获取所有价值观和原则
   */
  async getValues(type?: 'value' | 'principle'): Promise<Value[]> {
    try {
      // 优先从本地获取，快速显示
      const valuesJson = await AsyncStorage.getItem(VALUES_KEY);
      let localValues: Value[] = [];
      if (valuesJson) {
        localValues = JSON.parse(valuesJson);
      }
      
      if (API_CONFIG.API_KEY) {
        try {
          // 从云端获取最新数据（如果指定了类型，云端会过滤）
          const cloudValues = await apiService.getSelfAwarenessValues(type);
          // 保存所有值到本地（不区分类型）
          if (!type) {
            // 如果没有指定类型，保存所有值
            await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(cloudValues));
          } else {
            // 如果指定了类型，需要获取所有值来保存
            const allValues = await apiService.getSelfAwarenessValues();
            await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(allValues));
          }
          return cloudValues;
        } catch (error) {
          console.error('从云端获取价值观列表失败，使用本地数据:', error);
          // 云端获取失败，使用本地数据并过滤
          return type ? localValues.filter(v => v.type === type) : localValues;
        }
      } else {
        // 没有 API Key，仅使用本地数据
        return type ? localValues.filter(v => v.type === type) : localValues;
      }
    } catch (error) {
      console.error('获取价值观列表失败:', error);
      try {
        const valuesJson = await AsyncStorage.getItem(VALUES_KEY);
        if (valuesJson) {
          const values: Value[] = JSON.parse(valuesJson);
          return type ? values.filter(v => v.type === type) : values;
        }
      } catch (e) {
        console.error('从本地获取价值观列表失败:', e);
      }
      return [];
    }
  }

  /**
   * 获取单个价值观
   */
  async getValue(valueId: string): Promise<Value | null> {
    try {
      if (API_CONFIG.API_KEY) {
        const value = await apiService.getSelfAwarenessValueById(valueId);
        return value || null;
      } else {
        const values = await this.getValues();
        return values.find(v => v.valueId === valueId) || null;
      }
    } catch (error) {
      console.error('获取价值观失败:', error);
      const values = await this.getValues();
      return values.find(v => v.valueId === valueId) || null;
    }
  }

  /**
   * 创建价值观或原则
   */
  async createValue(value: Omit<Value, 'valueId' | 'createdAt' | 'updatedAt'>): Promise<Value> {
    // 先创建本地数据，确保数据不丢失
    const now = new Date().toISOString();
    const valueId = `value_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newValue: Value = {
      ...value,
      valueId: valueId,
      createdAt: now,
      updatedAt: now,
    };
    
    // 先保存到本地
    const values = await this.getValues();
    values.push(newValue);
    await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(values));
    
    // 如果配置了 API Key，同步到云端（使用本地生成的ID）
    if (API_CONFIG.API_KEY) {
      try {
        const cloudValue = await apiService.createSelfAwarenessValue({
          ...value,
          valueId: valueId,
          createdAt: now,
        });
        // 使用云端返回的数据更新本地
        const index = values.findIndex(v => v.valueId === valueId);
        if (index !== -1) {
          values[index] = cloudValue;
          await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(values));
          return cloudValue;
        }
      } catch (error) {
        console.error('同步价值观到云端失败，但已保存到本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return newValue;
  }

  /**
   * 更新价值观或原则
   */
  async updateValue(valueId: string, updates: Partial<Value>): Promise<Value> {
    // 先更新本地，确保数据不丢失
    const values = await this.getValues();
    const index = values.findIndex(v => v.valueId === valueId);
    if (index === -1) {
      throw new Error('价值观不存在');
    }
    
    // 更新本地数据
    values[index] = {
      ...values[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(values));
    const updatedValue = values[index];
    
    // 如果配置了 API Key，异步同步到云端
    if (API_CONFIG.API_KEY) {
      try {
        const cloudValue = await apiService.updateSelfAwarenessValue(valueId, updates);
        // 使用云端返回的数据
        values[index] = cloudValue;
        await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(values));
        return cloudValue;
      } catch (error) {
        console.error('同步价值观更新到云端失败，但已更新本地:', error);
        // 云端同步失败不影响本地数据
      }
    }
    
    return updatedValue;
  }

  /**
   * 删除价值观或原则
   */
  async deleteValue(valueId: string): Promise<void> {
    // 先从本地删除，确保立即生效
    const values = await this.getValues();
    const filtered = values.filter(v => v.valueId !== valueId);
    await AsyncStorage.setItem(VALUES_KEY, JSON.stringify(filtered));
    
    // 如果配置了 API Key，异步从云端删除
    if (API_CONFIG.API_KEY) {
      try {
        await apiService.deleteSelfAwarenessValue(valueId);
      } catch (error) {
        console.error('从云端删除价值观失败，但已从本地删除:', error);
        // 云端删除失败不影响本地删除
      }
    }
  }
}

export const selfAwarenessService = new SelfAwarenessService();

