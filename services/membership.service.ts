/**
 * 会员服务 - 处理会员购买和权益管理
 */

import { apiService } from './api.service';
import { authService } from './auth.service';
import { MembershipType, MembershipStatus, MembershipInfo } from '../types/user.types';

/**
 * 会员套餐配置
 */
export const MEMBERSHIP_PLANS: Record<MembershipType, MembershipInfo> = {
  [MembershipType.FREE]: {
    type: MembershipType.FREE,
    name: '免费用户',
    price: 0,
    duration: 0,
    features: [
      '本地存储任务数据',
      '基础功能使用',
    ],
  },
  [MembershipType.MONTHLY]: {
    type: MembershipType.MONTHLY,
    name: '月付会员',
    price: 990, // 9.9元 = 990分
    duration: 30,
    features: [
      '云端数据同步',
      '多设备数据共享',
      '数据备份与恢复',
      '优先客服支持',
    ],
  },
  [MembershipType.YEARLY]: {
    type: MembershipType.YEARLY,
    name: '年付会员',
    price: 9990, // 99.9元 = 9990分（约8.3元/月）
    duration: 365,
    features: [
      '云端数据同步',
      '多设备数据共享',
      '数据备份与恢复',
      '优先客服支持',
      '高级报表功能',
      '导出数据格式更多',
    ],
  },
  [MembershipType.LIFETIME]: {
    type: MembershipType.LIFETIME,
    name: '终身VIP',
    price: 19900, // 199元 = 19900分
    duration: -1, // -1表示永久
    features: [
      '云端数据同步',
      '多设备数据共享',
      '数据备份与恢复',
      '优先客服支持',
      '高级报表功能',
      '导出数据格式更多',
      '专属客服通道',
      '功能优先体验',
      '终身免费更新',
    ],
  },
};

class MembershipService {
  /**
   * 获取所有会员套餐
   */
  getMembershipPlans(): MembershipInfo[] {
    return Object.values(MEMBERSHIP_PLANS).filter(
      plan => plan.type !== MembershipType.FREE
    );
  }

  /**
   * 获取指定会员套餐信息
   */
  getMembershipPlan(type: MembershipType): MembershipInfo | undefined {
    return MEMBERSHIP_PLANS[type];
  }

  /**
   * 购买会员
   */
  async purchaseMembership(
    membershipType: MembershipType,
    paymentMethod: 'wechat' | 'alipay' = 'wechat'
  ): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('请先登录');
    }

    if (membershipType === MembershipType.FREE) {
      throw new Error('不能购买免费套餐');
    }

    const plan = MEMBERSHIP_PLANS[membershipType];
    if (!plan) {
      throw new Error('无效的会员类型');
    }

    try {
      // 调用后端API创建订单
      const response = await fetch(`${apiService['baseUrl']}/membership/purchase`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`,
        },
        body: JSON.stringify({
          membershipType,
          paymentMethod,
        }),
      });

      const result = await response.json();

      if (result.code === 0) {
        // 获取支付信息
        const paymentInfo = result.data;
        
        // 调用微信支付SDK进行支付
        // TODO: 集成微信支付SDK
        await this.processPayment(paymentInfo);

        // 支付成功后，刷新用户信息
        await authService.refreshUserInfo();
      } else {
        throw new Error(result.message || '购买失败');
      }
    } catch (error) {
      console.error('购买会员失败:', error);
      throw error;
    }
  }

  /**
   * 处理支付（模拟实现）
   * 实际应该调用微信支付SDK
   */
  private async processPayment(paymentInfo: any): Promise<void> {
    // TODO: 集成微信支付SDK
    // 示例：使用微信支付
    // const paymentResult = await wx.requestPayment({
    //   timeStamp: paymentInfo.timeStamp,
    //   nonceStr: paymentInfo.nonceStr,
    //   package: paymentInfo.package,
    //   signType: paymentInfo.signType,
    //   paySign: paymentInfo.paySign,
    // });

    // 模拟支付成功
    console.log('支付信息:', paymentInfo);
    
    // 在实际应用中，这里应该等待微信支付回调
    // 或者使用轮询方式检查支付状态
    return Promise.resolve();
  }

  /**
   * 取消会员（仅限月付/年付）
   */
  async cancelMembership(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('请先登录');
    }

    if (user.membershipType === MembershipType.FREE) {
      throw new Error('免费用户无需取消');
    }

    if (user.membershipType === MembershipType.LIFETIME) {
      throw new Error('终身VIP无法取消');
    }

    try {
      const response = await fetch(`${apiService['baseUrl']}/membership/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authService.getToken()}`,
        },
      });

      const result = await response.json();

      if (result.code === 0) {
        await authService.refreshUserInfo();
      } else {
        throw new Error(result.message || '取消失败');
      }
    } catch (error) {
      console.error('取消会员失败:', error);
      throw error;
    }
  }

  /**
   * 续费会员（仅限月付/年付）
   */
  async renewMembership(): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('请先登录');
    }

    if (!user.membershipType || user.membershipType === MembershipType.FREE) {
      throw new Error('当前不是付费会员');
    }

    if (user.membershipType === MembershipType.LIFETIME) {
      throw new Error('终身VIP无需续费');
    }

    // 续费和购买流程相同
    await this.purchaseMembership(user.membershipType);
  }

  /**
   * 检查是否可以升级会员
   */
  canUpgradeMembership(): boolean {
    const user = authService.getCurrentUser();
    if (!user) return false;

    // 免费用户、月付、年付都可以升级
    return [
      MembershipType.FREE,
      MembershipType.MONTHLY,
      MembershipType.YEARLY,
    ].includes(user.membershipType);
  }

  /**
   * 升级会员
   */
  async upgradeMembership(newType: MembershipType): Promise<void> {
    const user = authService.getCurrentUser();
    if (!user) {
      throw new Error('请先登录');
    }

    // 验证是否可以升级
    if (user.membershipType === MembershipType.LIFETIME) {
      throw new Error('终身VIP无法升级');
    }

    if (newType === MembershipType.FREE) {
      throw new Error('不能降级为免费用户');
    }

    // 计算升级差价（如果有）
    // TODO: 实现差价计算逻辑

    await this.purchaseMembership(newType);
  }
}

// 导出单例
export const membershipService = new MembershipService();

