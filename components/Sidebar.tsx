import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
} from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  path?: string;
  onPress?: () => void;
  divider?: boolean;
}

interface SidebarProps {
  visible: boolean;
  onClose: () => void;
  menuItems: MenuItem[];
  moduleName: string;
  moduleIcon?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  visible,
  onClose,
  menuItems,
  moduleName,
  moduleIcon = 'grid',
}) => {
  const router = useRouter();
  const slideAnim = React.useRef(new Animated.Value(-SIDEBAR_WIDTH)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: -SIDEBAR_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleMenuItemPress = (item: MenuItem) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.path) {
      router.push(item.path as any);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sidebar,
                {
                  transform: [{ translateX: slideAnim }],
                },
              ]}
            >
              {/* 模块头部 */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <FontAwesome6 name={moduleIcon as any} size={24} color="#6366f1" />
                </View>
                <Text style={styles.moduleName}>{moduleName}</Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <FontAwesome6 name="xmark" size={20} color="#6b7280" />
                </TouchableOpacity>
              </View>

              {/* 菜单项列表 */}
              <View style={styles.menuList}>
                {menuItems.map((item, index) => (
                  <React.Fragment key={item.id}>
                    {item.divider && index > 0 && (
                      <View style={styles.divider} />
                    )}
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => handleMenuItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={styles.menuItemIcon}>
                          <FontAwesome6 name={item.icon as any} size={18} color="#6366f1" />
                        </View>
                        <Text style={styles.menuItemLabel}>{item.label}</Text>
                      </View>
                      <FontAwesome6 name="chevron-right" size={14} color="#9ca3af" />
                    </TouchableOpacity>
                  </React.Fragment>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'row',
  },
  sidebar: {
    width: SIDEBAR_WIDTH,
    height: '100%',
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  moduleName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuList: {
    flex: 1,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuItemLabel: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#e5e7eb',
    marginVertical: 8,
    marginHorizontal: 20,
  },
});

