/**
 * 复盘数据服务层 - 整合本地存储和云端同步
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

const STORAGE_KEY = '@review';
const SYNC_KEY = '@reviewLastSyncTime';
const DELETED_IDS_KEY = '@reviewDeletedIds';
const LAST_ACCESS_DATE_KEY = (type: ReviewType) => `@reviewLastAccessDate_${type}`; // 记录上次访问日期（按类型）

export type ReviewType = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ReviewData {
  reviewId: string;
  userId?: string;
  type: ReviewType;
  date: string; // YYYY-MM-DD for daily, YYYY-WW for weekly, YYYY-MM for monthly, YYYY for yearly
  content: {
    achievements?: string[]; // 成就/完成事项
    reflections?: string[]; // 反思
    improvements?: string[]; // 改进
    gratitude?: string[]; // 感恩
    goals?: string[]; // 目标
    notes?: string; // 备注
  };
  rating?: number; // 评分 1-10
  tags?: string[];
  createdAt?: string;
  updatedAt?: string;
}

class ReviewService {
  /**
   * 是否应该使用云端存储
   */
  private shouldUseCloud(): boolean {
    const hasApiKey = !!API_CONFIG.API_KEY;
    return hasApiKey;
  }

  /**
   * 从本地存储获取复盘
   */
  private async getReviewsFromLocal(): Promise<ReviewData[]> {
    try {
      const reviewsJson = await AsyncStorage.getItem(STORAGE_KEY);
      if (reviewsJson) {
        return JSON.parse(reviewsJson);
      }
      return [];
    } catch (error) {
      console.error('从本地获取复盘失败:', error);
      return [];
    }
  }

  /**
   * 保存复盘到本地存储
   */
  private async saveReviewsToLocal(reviews: ReviewData[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(reviews));
    } catch (error) {
      console.error('保存复盘到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取已删除的复盘ID列表
   */
  private async getDeletedReviewIds(): Promise<Set<string>> {
    try {
      const deletedIdsJson = await AsyncStorage.getItem(DELETED_IDS_KEY);
      if (deletedIdsJson) {
        const deletedIds = JSON.parse(deletedIdsJson) as string[];
        return new Set(deletedIds);
      }
      return new Set<string>();
    } catch (error) {
      console.error('获取已删除复盘ID列表失败:', error);
      return new Set<string>();
    }
  }

  /**
   * 添加已删除的复盘ID
   */
  private async addDeletedReviewId(reviewId: string): Promise<void> {
    try {
      const deletedIds = await this.getDeletedReviewIds();
      deletedIds.add(reviewId);
      await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
    } catch (error) {
      console.error('保存已删除复盘ID失败:', error);
    }
  }

  /**
   * 从已删除列表中移除复盘ID
   */
  private async removeDeletedReviewId(reviewId: string): Promise<void> {
    try {
      const deletedIds = await this.getDeletedReviewIds();
      deletedIds.delete(reviewId);
      await AsyncStorage.setItem(DELETED_IDS_KEY, JSON.stringify(Array.from(deletedIds)));
    } catch (error) {
      console.error('移除已删除复盘ID失败:', error);
    }
  }

  /**
   * 从云端同步复盘
   * 同步时只保留每个日期每个类型的最新一条数据
   */
  private async syncFromCloud(): Promise<ReviewData[]> {
    if (!this.shouldUseCloud()) {
      return await this.getReviewsFromLocal();
    }

    try {
      const localReviews = await this.getReviewsFromLocal();
      const deletedIds = await this.getDeletedReviewIds();
      const localReviewMap = new Map<string, ReviewData>();
      localReviews.forEach(review => {
        localReviewMap.set(review.reviewId, review);
      });

      // 获取云端数据（云端会返回每个日期每个类型的最新一条）
      const cloudReviews = await apiService.getReviews();
      
      // 再次清理，确保只保留最新数据
      const cleanedCloudReviews = this.keepOnlyLatestReviews(cloudReviews);

      const mergedReviews: ReviewData[] = [];
      const mergedReviewIds = new Set<string>();

      // 添加所有本地复盘
      localReviews.forEach(review => {
        mergedReviews.push(review);
        mergedReviewIds.add(review.reviewId);
      });

      // 处理云端复盘（使用清理后的数据）
      cleanedCloudReviews.forEach(cloudReview => {
        if (deletedIds.has(cloudReview.reviewId)) {
          return;
        }

        // 检查本地是否已有相同日期和类型的复盘
        const existingLocalReview = localReviews.find(
          r => r.type === cloudReview.type && r.date === cloudReview.date
        );

        if (existingLocalReview) {
          // 比较更新时间，保留最新的
          const localUpdated = existingLocalReview.updatedAt ? new Date(existingLocalReview.updatedAt).getTime() : 0;
          const cloudUpdated = cloudReview.updatedAt ? new Date(cloudReview.updatedAt).getTime() : 0;

          if (cloudUpdated > localUpdated + 1000) {
            // 云端更新，替换本地
            const index = mergedReviews.findIndex(r => r.reviewId === existingLocalReview.reviewId);
            if (index !== -1) {
              mergedReviews[index] = cloudReview;
            }
          }
        } else {
          // 本地不存在，添加云端数据
          mergedReviews.push(cloudReview);
          mergedReviewIds.add(cloudReview.reviewId);
        }
      });

      // 清理历史数据：每个日期每个类型只保留最新的一条
      const cleanedReviews = this.keepOnlyLatestReviews(mergedReviews);

      await this.saveReviewsToLocal(cleanedReviews);
      await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
      return cleanedReviews;
    } catch (error) {
      console.error('从云端同步失败:', error);
      return await this.getReviewsFromLocal();
    }
  }

  /**
   * 清理历史数据：每个日期每个类型只保留最新的一条
   */
  private keepOnlyLatestReviews(reviews: ReviewData[]): ReviewData[] {
    // 按日期和类型分组
    const grouped = new Map<string, ReviewData[]>();
    
    reviews.forEach(review => {
      const key = `${review.type}_${review.date}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(review);
    });

    // 每个组只保留最新的一条
    const result: ReviewData[] = [];
    grouped.forEach((groupReviews) => {
      // 按更新时间排序，取最新的
      const sorted = groupReviews.sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
      result.push(sorted[0]);
    });

    return result;
  }

  /**
   * 清理昨日无用数据（保留每个日期每个类型的最新一条）
   */
  async cleanupOldReviews(): Promise<void> {
    const localReviews = await this.getReviewsFromLocal();
    const cleanedReviews = this.keepOnlyLatestReviews(localReviews);
    await this.saveReviewsToLocal(cleanedReviews);

    // 如果启用云端存储，请求云端清理
    if (this.shouldUseCloud()) {
      try {
        await apiService.cleanupOldReviews();
      } catch (error) {
        console.error('清理云端历史数据失败:', error);
      }
    }
  }

  /**
   * 检查日期是否变更，如果变更则清理页面数据
   */
  async checkDateChange(type: ReviewType): Promise<boolean> {
    const today = this.getDateString(type);
    const lastAccessDateKey = LAST_ACCESS_DATE_KEY(type);
    const lastAccessDate = await AsyncStorage.getItem(lastAccessDateKey);
    
    if (lastAccessDate !== today) {
      // 日期已变更，更新记录
      await AsyncStorage.setItem(lastAccessDateKey, today);
      
      // 如果是新的一天，清理昨日无用数据
      if (lastAccessDate) {
        await this.cleanupOldReviews();
      }
      
      return true; // 日期已变更
    }
    
    return false; // 日期未变更
  }

  /**
   * 获取所有复盘
   */
  async getAllReviews(): Promise<ReviewData[]> {
    const localReviews = await this.getReviewsFromLocal();

    if (this.shouldUseCloud()) {
      this.syncFromCloud().catch(error => {
        console.error('后台同步云端数据失败:', error);
      });
    }

    return localReviews;
  }

  /**
   * 根据类型获取复盘
   */
  async getReviewsByType(type: ReviewType): Promise<ReviewData[]> {
    const allReviews = await this.getAllReviews();
    return allReviews.filter(review => review.type === type);
  }

  /**
   * 根据日期获取复盘（只返回最新的一个）
   */
  async getReviewByDate(type: ReviewType, date: string): Promise<ReviewData | null> {
    const allReviews = await this.getAllReviews();
    // 获取该日期该类型的所有复盘，按更新时间倒序，返回最新的
    const reviews = allReviews
      .filter(review => review.type === type && review.date === date)
      .sort((a, b) => {
        const timeA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const timeB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return timeB - timeA;
      });
    return reviews[0] || null;
  }

  /**
   * 检查是否为今天的日期
   */
  isToday(date: string, type: ReviewType): boolean {
    const today = this.getDateString(type);
    return date === today;
  }

  /**
   * 检查是否可以编辑（只有今天的复盘可以编辑）
   */
  canEdit(review: ReviewData): boolean {
    return this.isToday(review.date, review.type);
  }

  /**
   * 根据ID获取复盘
   */
  async getReviewById(reviewId: string): Promise<ReviewData | null> {
    const allReviews = await this.getAllReviews();
    return allReviews.find(review => review.reviewId === reviewId) || null;
  }

  /**
   * 创建或更新复盘
   * 如果是今天的复盘，会覆盖同一天同类型的旧数据（本地）
   * 云端会保存每次提交
   */
  async createOrUpdateReview(
    review: Omit<ReviewData, 'reviewId' | 'createdAt' | 'updatedAt'>
  ): Promise<ReviewData> {
    const user = authService.getCurrentUser();
    const now = new Date();
    const isTodayReview = this.isToday(review.date, review.type);

    // 先保存到本地存储
    const localReviews = await this.getReviewsFromLocal();
    
    if (isTodayReview) {
      // 如果是今天的复盘，查找并删除同一天同类型的旧数据（本地只保留最新）
      const existingIndex = localReviews.findIndex(
        r => r.type === review.type && r.date === review.date
      );
      
      if (existingIndex !== -1) {
        // 删除旧的本地数据
        localReviews.splice(existingIndex, 1);
      }
    }

    // 创建新的复盘数据
    const reviewData: ReviewData = {
      ...review,
      reviewId: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.userId || 'anonymous',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 添加到本地（最新的在前面）
    localReviews.unshift(reviewData);
    await this.saveReviewsToLocal(localReviews);

    // 如果启用云端存储，异步同步到云端（云端保存每次提交）
    if (this.shouldUseCloud()) {
      apiService.createReview(reviewData).catch(error => {
        console.error('异步同步复盘到云端失败:', error);
      });
    }

    return reviewData;
  }

  /**
   * 创建复盘（保留原方法以兼容）
   */
  async createReview(
    review: Omit<ReviewData, 'reviewId' | 'createdAt' | 'updatedAt'>
  ): Promise<ReviewData> {
    return this.createOrUpdateReview(review);
  }

  /**
   * 更新复盘（只有今天的复盘可以更新）
   */
  async updateReview(
    reviewId: string,
    updates: Partial<ReviewData>
  ): Promise<ReviewData> {
    const localReviews = await this.getReviewsFromLocal();
    const reviewIndex = localReviews.findIndex(r => r.reviewId === reviewId);

    if (reviewIndex === -1) {
      throw new Error('复盘不存在');
    }

    const existingReview = localReviews[reviewIndex];
    
    // 检查是否可以编辑（只有今天的复盘可以编辑）
    if (!this.canEdit(existingReview)) {
      throw new Error('历史复盘不允许修改');
    }

    const updatedReview: ReviewData = {
      ...existingReview,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    // 更新本地数据
    localReviews[reviewIndex] = updatedReview;
    await this.saveReviewsToLocal(localReviews);

    // 云端保存为新的提交（创建新记录）
    if (this.shouldUseCloud()) {
      // 云端保存每次提交，所以创建新记录而不是更新
      apiService.createReview(updatedReview).catch(error => {
        console.error('异步同步复盘到云端失败:', error);
      });
    }

    return updatedReview;
  }

  /**
   * 删除复盘
   */
  async deleteReview(reviewId: string): Promise<void> {
    const localReviews = await this.getReviewsFromLocal();
    const filteredReviews = localReviews.filter(r => r.reviewId !== reviewId);

    if (filteredReviews.length === localReviews.length) {
      throw new Error('复盘不存在');
    }

    await this.saveReviewsToLocal(filteredReviews);
    await this.addDeletedReviewId(reviewId);

    if (this.shouldUseCloud()) {
      apiService.deleteReview(reviewId)
        .then(() => {
          this.removeDeletedReviewId(reviewId);
        })
        .catch(error => {
          console.error('异步从云端删除复盘失败:', error);
          // 如果云端删除失败是因为"复盘不存在"，这是正常的（可能复盘本来就不在云端）
          const errorMessage = error?.message || '';
          if (errorMessage.includes('不存在') || errorMessage.includes('not found') || errorMessage.includes('404')) {
            console.log('云端复盘不存在，保留在已删除列表中（防止同步时恢复）');
          }
        });
    }
  }

  /**
   * 获取日期字符串
   */
  getDateString(type: ReviewType, date?: Date): string {
    const d = date || new Date();
    
    switch (type) {
      case 'daily':
        return d.toISOString().split('T')[0]; // YYYY-MM-DD
      case 'weekly':
        const year = d.getFullYear();
        const week = this.getWeekNumber(d);
        return `${year}-W${String(week).padStart(2, '0')}`;
      case 'monthly':
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      case 'yearly':
        return String(d.getFullYear());
      default:
        return d.toISOString().split('T')[0];
    }
  }

  /**
   * 获取周数
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * 检查存储类型
   */
  getStorageType(): 'local' | 'cloud' {
    return this.shouldUseCloud() ? 'cloud' : 'local';
  }
}

// 导出单例
export const reviewService = new ReviewService();

