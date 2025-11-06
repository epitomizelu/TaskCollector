/**
 * 用户相关类型定义
 */

/**
 * 会员类型
 */
export enum MembershipType {
  FREE = 'free',           // 免费用户
  MONTHLY = 'monthly',     // 月付会员
  YEARLY = 'yearly',       // 年付会员
  LIFETIME = 'lifetime',  // 终身VIP
}

/**
 * 会员状态
 */
export enum MembershipStatus {
  ACTIVE = 'active',       // 激活中
  EXPIRED = 'expired',     // 已过期
  CANCELLED = 'cancelled', // 已取消
}

/**
 * 用户信息
 * 设计具有扩展性，可以添加任意字段
 */
export interface UserInfo {
  userId: string;                    // 用户ID（唯一标识）
  phone: string;                     // 手机号（必填，用于登录）
  nickname: string;                  // 昵称（必填）
  avatar?: string;                   // 头像URL
  email?: string;                    // 邮箱
  openId?: string;                   // 微信OpenID（可选）
  unionId?: string;                  // 微信UnionID（可选）
  membershipType: MembershipType;    // 会员类型
  membershipStatus: MembershipStatus; // 会员状态
  membershipExpireAt?: string;       // 会员到期时间（ISO格式）
  membershipStartAt?: string;        // 会员开始时间（ISO格式）
  createdAt: string;                 // 创建时间
  updatedAt: string;                 // 更新时间
  // 扩展字段 - 可以添加任意自定义字段
  [key: string]: any;                // 允许添加任意扩展字段
}

/**
 * 微信登录响应
 */
export interface WechatLoginResponse {
  code: number;
  message: string;
  data: {
    token: string;          // JWT Token
    userInfo: UserInfo;     // 用户信息
    expiresIn: number;      // Token过期时间（秒）
  };
}

/**
 * 会员信息
 */
export interface MembershipInfo {
  type: MembershipType;
  name: string;              // 会员名称
  price: number;            // 价格（分）
  duration: number;         // 时长（天）
  features: string[];       // 权益列表
}

