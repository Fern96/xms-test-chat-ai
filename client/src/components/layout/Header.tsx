import React, { useState } from "react";
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  ShareAltOutlined,
  DownloadOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { Button, Dropdown, Avatar, Space, Badge, message } from "antd";
import { useAuth } from "../../contexts/AuthContext";
import { useChatContext } from "../../contexts/ChatContext";
import AuthModal from "../auth/AuthModal";
import ModelSelector from "../ui/ModelSelector";
import ThemeToggle from "../ui/ThemeToggle";

interface HeaderProps {
  collapsed: boolean;
  onToggleSidebar: () => void;
  onKnowledgeBaseClick?: () => void;
  onShare?: () => void;
  onExport?: () => void;
}

/**
 * 头部组件
 * 左侧为侧边栏折叠/展开按钮，右侧显示用户信息或登录按钮
 */
const Header: React.FC<HeaderProps> = ({ 
  collapsed, 
  onToggleSidebar,
  onKnowledgeBaseClick,
  onShare,
  onExport,
}) => {
  const { state, logout } = useAuth();
  const { currentModel, setCurrentModel, currentSession } = useChatContext();
  const [authModalVisible, setAuthModalVisible] = useState(false);

  // 格式化当前日期为 YYYY.MM.DD
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;

  /**
   * 处理用户登出
   */
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("登出失败:", error);
    }
  };

  /**
   * 处理模型切换
   */
  const handleModelChange = (modelId: string) => {
    setCurrentModel(modelId);
  };

  /**
   * 用户菜单项
   */
  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人信息",
      disabled: true, // 暂时禁用，后续可扩展
    },
    {
      type: "divider" as const,
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  return (
    <>
      <header className="bg-panel border-b border-surface px-4 sm:px-6 py-3 transition-colors">
        <div className="flex items-center justify-between">
          {/* 左侧区域 - 会话标题和AI状态 */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <button
              onClick={onToggleSidebar}
              aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"}
              className="flex items-center justify-center h-9 w-9 rounded-md text-gray-700 dark:text-gray-200 hover:bg-[var(--surface-hover)] transition-colors flex-shrink-0"
            >
              {collapsed ? (
                <MenuUnfoldOutlined className="text-lg" />
              ) : (
                <MenuFoldOutlined className="text-lg" />
              )}
            </button>

            {/* 当前会话标题 */}
            {currentSession && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <h1 className="text-lg font-semibold text-foreground truncate">
                  {currentSession.title}
                </h1>
                <Badge status="success" text={<span className="text-xs text-gray-500">AI 在线</span>} />
              </div>
            )}
          </div>

          {/* 中间区域 - 模型选择器 */}
          <div className="flex items-center gap-3 mx-4 hidden md:flex">
            <ModelSelector
              value={currentModel}
              onChange={handleModelChange}
              size="middle"
              className="w-48"
            />
          </div>

          {/* 右侧操作区域 */}
          <div className="flex items-center space-x-2">
            {/* 分享按钮 */}
            {currentSession && (
              <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={onShare || (() => message.info("分享功能开发中"))}
                className="text-gray-600 dark:text-gray-300"
              >
                <span className="hidden sm:inline">分享</span>
              </Button>
            )}
            
            {/* 导出按钮 */}
            {currentSession && (
              <Button
                type="text"
                icon={<DownloadOutlined />}
                onClick={onExport || (() => message.info("导出功能开发中"))}
                className="text-gray-600 dark:text-gray-300"
              >
                <span className="hidden sm:inline">导出</span>
              </Button>
            )}

            {/* 知识库按钮 */}
            <Button
              type="text"
              icon={<BookOutlined />}
              onClick={onKnowledgeBaseClick}
              className="text-gray-600 dark:text-gray-300"
            >
              <span className="hidden sm:inline">知识库</span>
            </Button>

            {/* 主题切换 */}
            <ThemeToggle />
            
            {/* 用户状态显示 */}
            {state.isAuthenticated && state.user ? (
              <Dropdown
                menu={{ items: userMenuItems }}
                placement="bottomRight"
                trigger={["click"]}
              >
                <Space className="cursor-pointer hover:bg-[var(--surface-hover)] px-3 py-2 rounded-lg transition-colors">
                  <Avatar
                    size="small"
                    icon={<UserOutlined />}
                    className="bg-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-200 font-medium hidden sm:inline">
                    {state.user.username}
                  </span>
                </Space>
              </Dropdown>
            ) : (
              <Button
                type="primary"
                icon={<LoginOutlined />}
                onClick={() => setAuthModalVisible(true)}
                loading={state.isLoading}
                className="flex items-center"
              >
                <span className="hidden sm:inline ml-1">登录</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* 认证弹窗 */}
      <AuthModal
        visible={authModalVisible}
        onCancel={() => setAuthModalVisible(false)}
        onSuccess={() => {
          // 登录成功后的回调，数据同步逻辑已在useChatSessions中处理
          console.log("用户登录成功，数据同步将自动进行");
        }}
      />
    </>
  );
};

export default Header;
