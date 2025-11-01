import { ConfigProvider, App as AntdApp, theme as antdTheme } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import 'antd/dist/reset.css'
import Home from './pages/Home'
import { ChatProvider } from './contexts/ChatContext'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider, useTheme } from './contexts/ThemeContext'

const InnerApp: React.FC = () => {
  const { isDark } = useTheme();
  return (
    <ConfigProvider 
      locale={zhCN} 
      theme={{ 
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
        components: {
          Button: {
            colorPrimary: '#3b82f6',
            colorPrimaryHover: '#2563eb',
            colorPrimaryActive: '#1d4ed8',
          },
          Switch: {
            colorPrimary: '#3b82f6',
            colorPrimaryHover: '#2563eb',
          }
        }
      }}
    >
      <AntdApp>
        <AuthProvider>
          <ChatProvider>
            <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
              <Home />
            </div>
          </ChatProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  );
};

function App() {
  return (
    <ThemeProvider>
      <InnerApp />
    </ThemeProvider>
  )
}

export default App;