/**
 * 站内信服务 - 用于查询音频处理任务进度
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';

const STORAGE_KEY = '@messages';
const MESSAGES_KEY = `${STORAGE_KEY}:list`;

// 消息类型
export type MessageType = 'audio_processing' | 'system' | 'notification';

// 消息状态
export type MessageStatus = 'unread' | 'read';

// 消息接口
export interface Message {
  id: string;
  type: MessageType;
  title: string;
  content: string;
  status: MessageStatus;
  relatedId?: string; // 关联的内容ID或任务ID
  metadata?: {
    contentId?: string;
    processingStatus?: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    errorMessage?: string;
  };
  createdAt: string;
  readAt?: string;
}

class MessageService {
  /**
   * 是否应该使用云端存储
   */
  private shouldUseCloud(): boolean {
    return !!process.env.EXPO_PUBLIC_API_KEY;
  }

  /**
   * 从本地获取所有消息
   */
  private async getMessagesFromLocal(): Promise<Message[]> {
    try {
      const messagesJson = await AsyncStorage.getItem(MESSAGES_KEY);
      return messagesJson ? JSON.parse(messagesJson) : [];
    } catch (error) {
      console.error('从本地获取消息失败:', error);
      return [];
    }
  }

  /**
   * 保存消息到本地
   */
  private async saveMessagesToLocal(messages: Message[]): Promise<void> {
    try {
      await AsyncStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('保存消息到本地失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有消息
   */
  async getAllMessages(): Promise<Message[]> {
    if (this.shouldUseCloud()) {
      try {
        const cloudMessages = await apiService.getMessages();
        await this.saveMessagesToLocal(cloudMessages);
        return cloudMessages;
      } catch (error) {
        console.error('从云端获取消息失败:', error);
      }
    }
    return await this.getMessagesFromLocal();
  }

  /**
   * 获取未读消息
   */
  async getUnreadMessages(): Promise<Message[]> {
    const allMessages = await this.getAllMessages();
    return allMessages.filter(msg => msg.status === 'unread');
  }

  /**
   * 获取未读消息数量
   */
  async getUnreadCount(): Promise<number> {
    const unreadMessages = await this.getUnreadMessages();
    return unreadMessages.length;
  }

  /**
   * 标记消息为已读
   */
  async markAsRead(messageId: string): Promise<void> {
    const localMessages = await this.getMessagesFromLocal();
    const messageIndex = localMessages.findIndex(msg => msg.id === messageId);

    if (messageIndex !== -1) {
      localMessages[messageIndex] = {
        ...localMessages[messageIndex],
        status: 'read',
        readAt: new Date().toISOString(),
      };
      await this.saveMessagesToLocal(localMessages);
    }

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      apiService.markMessageAsRead(messageId).catch(error => {
        console.error('异步标记消息已读失败:', error);
      });
    }
  }

  /**
   * 标记所有消息为已读
   */
  async markAllAsRead(): Promise<void> {
    const localMessages = await this.getMessagesFromLocal();
    const now = new Date().toISOString();
    const updatedMessages = localMessages.map(msg => ({
      ...msg,
      status: 'read' as MessageStatus,
      readAt: msg.readAt || now,
    }));
    await this.saveMessagesToLocal(updatedMessages);

    // 异步同步到云端
    if (this.shouldUseCloud()) {
      apiService.markAllMessagesAsRead().catch(error => {
        console.error('异步标记所有消息已读失败:', error);
      });
    }
  }

  /**
   * 删除消息
   */
  async deleteMessage(messageId: string): Promise<void> {
    const localMessages = await this.getMessagesFromLocal();
    const filteredMessages = localMessages.filter(msg => msg.id !== messageId);
    await this.saveMessagesToLocal(filteredMessages);

    // 异步删除云端数据
    if (this.shouldUseCloud()) {
      apiService.deleteMessage(messageId).catch(error => {
        console.error('异步删除消息失败:', error);
      });
    }
  }

  /**
   * 根据关联ID获取消息
   */
  async getMessagesByRelatedId(relatedId: string): Promise<Message[]> {
    const allMessages = await this.getAllMessages();
    return allMessages.filter(msg => msg.relatedId === relatedId);
  }
}

// 导出单例
export const messageService = new MessageService();

