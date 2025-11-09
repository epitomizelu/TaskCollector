/**
 * 想法数据服务层 - 整合本地存储和云端同步
 * 
 * 存储策略：
 * - 所有操作都先保存到本地存储（确保离线可用）
 * - 如果启用云端存储，再异步同步到云端
 * - 云端同步失败不影响本地操作，保证数据不丢失
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { authService } from './auth.service';
import { API_CONFIG } from '../config/api.config';

const STORAGE_KEY = '@ideaCollector';
const SYNC_KEY = '@ideaLastSyncTime';
const DELETED_IDS_KEY = '@ideaDeletedIds'; // 记录已删除的想法ID，防止同步时恢复

export interface IdeaData {
  ideaId: string;
  userId?: string;
  content: string;
  tags?: string[];
  recordDate: string;
  recordMonth: string;
  recordYear: string;
  analysis?: {
    insights: string[];
    emotions: string[];
    themes: string[];
    suggestions: string[];
    truth: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface IdeaAnalysis {
  insights: string[];
  emotions: string[];
  themes: string[];
  suggestions: string[];
  truth: string;
}

class IdeaService {
  /**
   * 是否应该使用云端存储
   */
  private shouldUseCloud(): boolean {
    const hasApiKey = !!API_CONFIG.API_KEY;
    return hasApiKey;
  }

  /**
   * 从本地存储获取想法
   */
  private async getIdeasFromLocal(): Promise<IdeaData[]> {
    try {
      const ideasJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (ideasJson) {
        return JSON.parse(ideasJson);
      }
      return [];
    } catch (error) {
      console.error('从本地获取想法失败:', error);
      return [];
    }
  }

  /**
   * 保存想法到本地存储
   */
  private async saveIdeasToLocal(ideas: IdeaData[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ideas));
    } catch (error) {
      console.error('保存想法到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取已删除的想法ID列表
   */
  private async getDeletedIdeaIds(): Promise<Set<string>> {
    try {
      const deletedIdsJson = await AsyncStorage.getItem(DELETED_IDS_KEY);
      if (deletedIdsJson) {
        const deletedIds = JSON.parse(deletedIdsJson) as string[];
        return new Set(deletedIds);
      }
      return new Set<string>();
    } catch (error) {
      console.error('获取已删除想法ID列表失败:', error);
      return new Set<string>();
    }
  }

  /**
   * 添加已删除的想法ID
   */
  private async addDeletedIdeaId(ideaId: string): Promise<void> {
    try {
      const deletedIds = await this.getDeletedIdeaIds();
      deletedIds.add(ideaId);
      await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
    } catch (error) {
      console.error('保存已删除想法ID失败:', error);
    }
  }

  /**
   * 从已删除列表中移除想法ID（云端删除成功后调用）
   */
  private async removeDeletedIdeaId(ideaId: string): Promise<void> {
    try {
      const deletedIds = await this.getDeletedIdeaIds();
      deletedIds.delete(ideaId);
      await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
    } catch (error) {
      console.error('移除已删除想法ID失败:', error);
    }
  }

  /**
   * 从云端同步想法
   * 智能合并策略：以本地数据为主，合并云端数据
   */
  private async syncFromCloud(): Promise<IdeaData[]> {
    if (!this.shouldUseCloud()) {
      return await this.getIdeasFromLocal();
    }

    try {
      // 先获取本地数据和已删除ID列表
      const localIdeas = await this.getIdeasFromLocal();
      const deletedIds = await this.getDeletedIdeaIds();
      const localIdeaMap = new Map<string, IdeaData>();
      localIdeas.forEach(idea => {
        localIdeaMap.set(idea.ideaId, idea);
      });

      // 获取云端数据
      const cloudIdeas = await apiService.getIdeas();
      
      // 智能合并策略：
      // 1. 本地存在的想法：保留本地（包括新创建的和已修改的）
      // 2. 云端存在但本地不存在的想法：
      //    - 如果在已删除列表中，不恢复（避免恢复刚删除的想法）
      //    - 否则添加云端想法（可能是从其他设备同步的）
      // 3. 本地和云端都存在的想法：使用最新的更新时间
      const mergedIdeas: IdeaData[] = [];
      const mergedIdeaIds = new Set<string>();
      
      // 第一步：添加所有本地想法（优先保留本地数据）
      localIdeas.forEach(idea => {
        mergedIdeas.push(idea);
        mergedIdeaIds.add(idea.ideaId);
      });
      
      // 第二步：处理云端想法
      cloudIdeas.forEach(cloudIdea => {
        // 如果想法在已删除列表中，跳过（不恢复）
        if (deletedIds.has(cloudIdea.ideaId)) {
          console.log('跳过已删除的想法:', cloudIdea.ideaId);
          return;
        }
        
        if (mergedIdeaIds.has(cloudIdea.ideaId)) {
          // 如果本地和云端都存在，使用最新的更新时间
          const localIdea = localIdeaMap.get(cloudIdea.ideaId)!;
          const localUpdated = localIdea.updatedAt ? new Date(localIdea.updatedAt).getTime() : 0;
          const cloudUpdated = cloudIdea.updatedAt ? new Date(cloudIdea.updatedAt).getTime() : 0;
          
          if (cloudUpdated > localUpdated + 1000) { // 允许1秒的误差
            // 云端更新，替换本地
            const index = mergedIdeas.findIndex(i => i.ideaId === cloudIdea.ideaId);
            if (index !== -1) {
              mergedIdeas[index] = cloudIdea;
            }
          }
        } else {
          // 云端存在但本地不存在，且不在已删除列表中，添加（可能是从其他设备同步的）
          mergedIdeas.push(cloudIdea);
          mergedIdeaIds.add(cloudIdea.ideaId);
        }
      });

      // 保存合并后的数据
      await this.saveIdeasToLocal(mergedIdeas);
      await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
      return mergedIdeas;
    } catch (error) {
      console.error('从云端同步失败:', error);
      return await this.getIdeasFromLocal();
    }
  }

  /**
   * 获取所有想法
   * 优先从本地读取，快速返回；云端同步在后台异步进行
   */
  async getAllIdeas(): Promise<IdeaData[]> {
    // 第一步：立即从本地读取数据（快速返回）
    const localIdeas = await this.getIdeasFromLocal();
    
    // 第二步：如果启用云端存储，在后台异步同步（不阻塞）
    if (this.shouldUseCloud()) {
      // 异步同步，不等待结果
      this.syncFromCloud().catch(error => {
        console.error('后台同步云端数据失败:', error);
        // 同步失败不影响本地数据使用
      });
    }
    
    // 立即返回本地数据
    return localIdeas;
  }

  /**
   * 根据日期获取想法
   */
  async getIdeasByDate(date: string): Promise<IdeaData[]> {
    const allIdeas = await this.getAllIdeas();
    return allIdeas.filter(idea => idea.recordDate === date);
  }

  /**
   * 根据月份获取想法
   */
  async getIdeasByMonth(month: string): Promise<IdeaData[]> {
    const allIdeas = await this.getAllIdeas();
    return allIdeas.filter(idea => idea.recordMonth === month);
  }

  /**
   * 根据ID获取想法
   */
  async getIdeaById(ideaId: string): Promise<IdeaData | null> {
    const allIdeas = await this.getAllIdeas();
    return allIdeas.find(idea => idea.ideaId === ideaId) || null;
  }

  /**
   * 创建想法
   * 策略：先保存到本地存储，再异步同步到云端（如果启用）
   */
  async createIdea(
    idea: Omit<IdeaData, 'ideaId' | 'createdAt' | 'updatedAt'>,
    autoAnalyze: boolean = true
  ): Promise<IdeaData> {
    const user = authService.getCurrentUser();
    const now = new Date();
    const recordDate = idea.recordDate || now.toISOString().split('T')[0];
    const recordMonth = idea.recordMonth || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const recordYear = idea.recordYear || String(now.getFullYear());

    const ideaData: IdeaData = {
      ...idea,
      ideaId: `idea_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.userId || 'anonymous',
      recordDate,
      recordMonth,
      recordYear,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 第一步：先保存到本地存储
    const localIdeas = await this.getIdeasFromLocal();
    localIdeas.unshift(ideaData);
    await this.saveIdeasToLocal(localIdeas);

    // 第二步：如果启用云端存储，异步同步到云端
    if (this.shouldUseCloud()) {
      this.syncIdeaToCloud(ideaData, autoAnalyze).catch(error => {
        console.error('异步同步想法到云端失败:', error);
      });
    }

    return ideaData;
  }

  /**
   * 异步同步单个想法到云端
   */
  private async syncIdeaToCloud(ideaData: IdeaData, autoAnalyze: boolean): Promise<void> {
    try {
      await apiService.createIdea(ideaData, autoAnalyze);
    } catch (error) {
      // 如果想法已存在，尝试更新
      try {
        await apiService.updateIdea(ideaData.ideaId, ideaData, autoAnalyze);
      } catch (updateError) {
        console.error('同步想法到云端失败:', ideaData.ideaId, updateError);
        throw updateError;
      }
    }
  }

  /**
   * 更新想法
   */
  async updateIdea(
    ideaId: string,
    updates: Partial<IdeaData>,
    autoAnalyze: boolean = true
  ): Promise<IdeaData> {
    const localIdeas = await this.getIdeasFromLocal();
    const ideaIndex = localIdeas.findIndex(i => i.ideaId === ideaId);
    
    if (ideaIndex === -1) {
      throw new Error('想法不存在');
    }

    const updatedIdea: IdeaData = {
      ...localIdeas[ideaIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 第一步：先更新本地存储
    localIdeas[ideaIndex] = updatedIdea;
    await this.saveIdeasToLocal(localIdeas);

    // 第二步：如果启用云端存储，异步同步到云端
    if (this.shouldUseCloud()) {
      apiService.updateIdea(ideaId, updatedIdea, autoAnalyze).catch(error => {
        console.error('异步更新想法到云端失败:', error);
      });
    }

    return updatedIdea;
  }

  /**
   * 删除想法
   */
  async deleteIdea(ideaId: string): Promise<void> {
    console.log('deleteIdea 开始执行', ideaId);
    
    // 第一步：先删除本地存储
    const localIdeas = await this.getIdeasFromLocal();
    console.log('删除前本地想法数量:', localIdeas.length);
    
    const filteredIdeas = localIdeas.filter(i => i.ideaId !== ideaId);
    console.log('删除后本地想法数量:', filteredIdeas.length);
    
    if (filteredIdeas.length === localIdeas.length) {
      console.warn('警告: 未找到要删除的想法', ideaId);
      throw new Error('想法不存在');
    }
    
    await this.saveIdeasToLocal(filteredIdeas);
    console.log('本地删除成功');

    // 将想法ID添加到已删除列表（防止同步时恢复）
    await this.addDeletedIdeaId(ideaId);
    console.log('已添加到删除列表，防止同步时恢复');

    // 第二步：如果启用云端存储，异步同步删除到云端
    if (this.shouldUseCloud()) {
      console.log('启用云端存储，异步删除云端数据');
      apiService.deleteIdea(ideaId)
        .then(() => {
          // 云端删除成功，从已删除列表中移除（云端已确认删除，不需要再过滤）
          console.log('云端删除成功，从已删除列表中移除');
          this.removeDeletedIdeaId(ideaId);
        })
        .catch(error => {
          // 如果云端删除失败是因为"想法不存在"，这是正常的（可能想法本来就不在云端）
          // 保留在已删除列表中，防止同步时恢复
          const errorMessage = error?.message || '';
          if (errorMessage.includes('不存在') || errorMessage.includes('not found') || errorMessage.includes('404')) {
            console.log('云端想法不存在，保留在已删除列表中（防止同步时恢复）');
          } else {
            console.error('异步从云端删除想法失败:', error);
            // 其他错误也保留在已删除列表中，防止同步时恢复
          }
        });
    } else {
      console.log('未启用云端存储，仅删除本地数据');
    }
    
    console.log('deleteIdea 执行完成');
  }

  /**
   * 分析想法（调用AI分析）
   */
  async analyzeIdea(content: string): Promise<IdeaAnalysis> {
    if (this.shouldUseCloud()) {
      try {
        return await apiService.analyzeIdea(content);
      } catch (error) {
        console.error('云端AI分析失败:', error);
        // 如果云端分析失败，返回简单的本地分析
        return this.localAnalyzeIdea(content);
      }
    }
    return this.localAnalyzeIdea(content);
  }

  /**
   * 本地简单分析（当云端不可用时）
   */
  private localAnalyzeIdea(content: string): IdeaAnalysis {
    // 简单的关键词分析
    const analysis: IdeaAnalysis = {
      insights: [],
      emotions: [],
      themes: [],
      suggestions: [],
      truth: '这是一个值得记录的想法，继续观察和思考可能会带来更多洞察。',
    };

    // 简单的情感检测
    if (content.includes('开心') || content.includes('快乐') || content.includes('兴奋')) {
      analysis.emotions.push('positive');
      analysis.insights.push('这个想法反映了积极的情绪');
    } else if (content.includes('焦虑') || content.includes('担心') || content.includes('压力')) {
      analysis.emotions.push('negative');
      analysis.insights.push('这个想法可能反映了你当前的压力或担忧');
      analysis.suggestions.push('尝试深呼吸，给自己一些时间放松');
    } else {
      analysis.emotions.push('neutral');
    }

    return analysis;
  }

  /**
   * 手动同步
   */
  async manualSync(): Promise<void> {
    if (!this.shouldUseCloud()) {
      throw new Error('未配置 API Key，无法使用云端同步。请在 .env 文件中配置 EXPO_PUBLIC_API_KEY');
    }

    const localIdeas = await this.getIdeasFromLocal();
    // 同步所有想法到云端
    for (const idea of localIdeas) {
      try {
        await apiService.createIdea(idea, false);
      } catch (error) {
        // 如果已存在，尝试更新
        try {
          await apiService.updateIdea(idea.ideaId, idea, false);
        } catch (updateError) {
          console.error('同步想法失败:', idea.ideaId, updateError);
        }
      }
    }
    await this.syncFromCloud();
  }

  /**
   * 检查存储类型
   */
  getStorageType(): 'local' | 'cloud' {
    return this.shouldUseCloud() ? 'cloud' : 'local';
  }
}

// 导出单例
export const ideaService = new IdeaService();

