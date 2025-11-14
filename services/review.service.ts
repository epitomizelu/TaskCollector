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

      // 获取云端数据（这里需要根据实际API调整）
      // const cloudReviews = await apiService.getReviews();
      const cloudReviews: ReviewData[] = []; // 暂时为空，等待API实现

      const mergedReviews: ReviewData[] = [];
      const mergedReviewIds = new Set<string>();

      // 添加所有本地复盘
      localReviews.forEach(review => {
        mergedReviews.push(review);
        mergedReviewIds.add(review.reviewId);
      });

      // 处理云端复盘
      cloudReviews.forEach(cloudReview => {
        if (deletedIds.has(cloudReview.reviewId)) {
          return;
        }

        if (mergedReviewIds.has(cloudReview.reviewId)) {
          const localReview = localReviewMap.get(cloudReview.reviewId)!;
          const localUpdated = localReview.updatedAt ? new Date(localReview.updatedAt).getTime() : 0;
          const cloudUpdated = cloudReview.updatedAt ? new Date(cloudReview.updatedAt).getTime() : 0;

          if (cloudUpdated > localUpdated + 1000) {
            const index = mergedReviews.findIndex(r => r.reviewId === cloudReview.reviewId);
            if (index !== -1) {
              mergedReviews[index] = cloudReview;
            }
          }
        } else {
          mergedReviews.push(cloudReview);
          mergedReviewIds.add(cloudReview.reviewId);
        }
      });

      await this.saveReviewsToLocal(mergedReviews);
      await AsyncStorage.setItem(SYNC_KEY, Date.now().toString());
      return mergedReviews;
    } catch (error) {
      console.error('从云端同步失败:', error);
      return await this.getReviewsFromLocal();
    }
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
   * 根据日期获取复盘
   */
  async getReviewByDate(type: ReviewType, date: string): Promise<ReviewData | null> {
    const allReviews = await this.getAllReviews();
    return allReviews.find(review => review.type === type && review.date === date) || null;
  }

  /**
   * 根据ID获取复盘
   */
  async getReviewById(reviewId: string): Promise<ReviewData | null> {
    const allReviews = await this.getAllReviews();
    return allReviews.find(review => review.reviewId === reviewId) || null;
  }

  /**
   * 创建复盘
   */
  async createReview(
    review: Omit<ReviewData, 'reviewId' | 'createdAt' | 'updatedAt'>
  ): Promise<ReviewData> {
    const user = authService.getCurrentUser();
    const now = new Date();

    const reviewData: ReviewData = {
      ...review,
      reviewId: `review_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user?.userId || 'anonymous',
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    // 先保存到本地存储
    const localReviews = await this.getReviewsFromLocal();
    localReviews.unshift(reviewData);
    await this.saveReviewsToLocal(localReviews);

    // 如果启用云端存储，异步同步到云端
    if (this.shouldUseCloud()) {
      // 这里可以调用API同步
      // this.syncReviewToCloud(reviewData).catch(error => {
      //   console.error('异步同步复盘到云端失败:', error);
      // });
    }

    return reviewData;
  }

  /**
   * 更新复盘
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

    const updatedReview: ReviewData = {
      ...localReviews[reviewIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    localReviews[reviewIndex] = updatedReview;
    await this.saveReviewsToLocal(localReviews);

    if (this.shouldUseCloud()) {
      // 这里可以调用API同步
      // apiService.updateReview(reviewId, updatedReview).catch(error => {
      //   console.error('异步更新复盘到云端失败:', error);
      // });
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
      // 这里可以调用API删除
      // apiService.deleteReview(reviewId)
      //   .then(() => {
      //     this.removeDeletedReviewId(reviewId);
      //   })
      //   .catch(error => {
      //     console.error('异步从云端删除复盘失败:', error);
      //   });
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

