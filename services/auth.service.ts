/**
 * 用户认证服务 - 处理微信登录和用户状态
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './api.service';
import { UserInfo, WechatLoginResponse, MembershipType, MembershipStatus } from '../types/user.types';

const STORAGE_KEYS = {
  USER_TOKEN: '@userToken',
  USER_INFO: '@userInfo',
  LOGIN_STATE: '@loginState',
};

class AuthService {
  private currentUser: UserInfo | null = null;
  private token: string | null = null;

  /**
   * 初始化 - 从本地存储加载用户信息
   */
  async initialize(): Promise<void> {
    try {
      const [token, userInfoJson] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.USER_TOKEN),
        AsyncStorage.getItem(STORAGE_KEYS.USER_INFO),
      ]);

      if (token && userInfoJson) {
        this.token = token;
        this.currentUser = JSON.parse(userInfoJson);
        apiService.setToken(token);
        
        // 验证Token是否有效，并刷新用户信息
        try {
          await this.refreshUserInfo();
        } catch (error) {
          console.error('刷新用户信息失败:', error);
          // Token可能已过期，清除本地数据
          await this.logout();
        }
      }
    } catch (error) {
      console.error('初始化认证服务失败:', error);
    }
  }

  /**
   * 微信扫码登录
   * 注意：在实际使用中，需要集成微信SDK或使用腾讯云微信登录能力
   */
  async loginWithWechat(): Promise<UserInfo> {
    try {
      // 方案1: 使用腾讯云开发微信登录
      // const loginState = await wx.cloud.callFunction({
      //   name: 'auth',
      //   data: { action: 'wechatLogin' }
      // });

      // 方案2: 使用微信SDK获取code，然后调用后端API
      // 这里使用模拟实现，实际需要集成微信SDK
      const wechatCode = await this.getWechatCode();
      
      // 调用后端API进行登录
      const response = await fetch(`${apiService['baseUrl']}/auth/wechat-login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: wechatCode,
          loginType: 'wechat',
        }),
      });

      const result: WechatLoginResponse = await response.json();
      
      if (result.code === 0) {
        await this.setAuthData(result.data.token, result.data.userInfo);
        return result.data.userInfo;
      } else {
        throw new Error(result.message || '登录失败');
      }
    } catch (error) {
      console.error('微信登录失败:', error);
      throw error;
    }
  }

  /**
   * 获取微信登录code（模拟实现）
   * 实际应该使用微信SDK或腾讯云开发的微信登录能力
   */
  private async getWechatCode(): Promise<string> {
    // TODO: 集成微信SDK
    // 例如：使用 @tencentcloud/weapp-auth 或微信官方SDK
    
    // 模拟返回（实际应该从微信SDK获取）
    return 'mock_wechat_code_' + Date.now();
  }

  /**
   * 设置认证数据
   */
  private async setAuthData(token: string, userInfo: UserInfo): Promise<void> {
    this.token = token;
    this.currentUser = userInfo;
    apiService.setToken(token);

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEYS.USER_TOKEN, token),
      AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo)),
      AsyncStorage.setItem(STORAGE_KEYS.LOGIN_STATE, 'logged_in'),
    ]);
  }

  /**
   * 刷新用户信息
   */
  async refreshUserInfo(): Promise<UserInfo> {
    try {
      // 调用后端API获取最新用户信息
      const response = await fetch(`${apiService['baseUrl']}/auth/user-info`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });

      const result = await response.json();
      
      if (result.code === 0) {
        this.currentUser = result.data;
        await AsyncStorage.setItem(STORAGE_KEYS.USER_INFO, JSON.stringify(result.data));
        return result.data;
      } else {
        throw new Error(result.message || '获取用户信息失败');
      }
    } catch (error) {
      console.error('刷新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 登出
   */
  async logout(): Promise<void> {
    this.token = null;
    this.currentUser = null;
    apiService.clearToken();

    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.USER_TOKEN),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_INFO),
      AsyncStorage.removeItem(STORAGE_KEYS.LOGIN_STATE),
    ]);
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): UserInfo | null {
    return this.currentUser;
  }

  /**
   * 获取Token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * 是否已登录
   */
  isLoggedIn(): boolean {
    return this.token !== null && this.currentUser !== null;
  }

  /**
   * 是否是付费用户
   */
  isPaidUser(): boolean {
    if (!this.currentUser) return false;
    
    const { membershipType, membershipStatus, membershipExpireAt } = this.currentUser;
    
    // 免费用户
    if (membershipType === MembershipType.FREE) {
      return false;
    }

    // 终身VIP
    if (membershipType === MembershipType.LIFETIME) {
      return membershipStatus === MembershipStatus.ACTIVE;
    }

    // 月付/年付 - 检查是否激活且未过期
    if (membershipStatus === MembershipStatus.ACTIVE && membershipExpireAt) {
      return new Date(membershipExpireAt) > new Date();
    }

    return false;
  }

  /**
   * 检查会员是否过期
   */
  async checkMembershipExpiry(): Promise<void> {
    if (!this.currentUser) return;

    const { membershipType, membershipStatus, membershipExpireAt } = this.currentUser;

    // 终身VIP或免费用户不需要检查
    if (
      membershipType === MembershipType.LIFETIME ||
      membershipType === MembershipType.FREE ||
      membershipStatus !== MembershipStatus.ACTIVE
    ) {
      return;
    }

    // 检查是否过期
    if (membershipExpireAt && new Date(membershipExpireAt) < new Date()) {
      // 会员已过期，刷新用户信息
      await this.refreshUserInfo();
    }
  }

  /**
   * 获取会员类型名称
   */
  getMembershipTypeName(): string {
    if (!this.currentUser) return '未登录';
    
    const typeMap: Record<MembershipType, string> = {
      [MembershipType.FREE]: '免费用户',
      [MembershipType.MONTHLY]: '月付会员',
      [MembershipType.YEARLY]: '年付会员',
      [MembershipType.LIFETIME]: '终身VIP',
    };

    return typeMap[this.currentUser.membershipType] || '未知';
  }
}

// 导出单例
export const authService = new AuthService();

