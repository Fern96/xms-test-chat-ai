import React, { useEffect, useRef, useState } from 'react';
import { Empty, Alert, Spin } from 'antd';

interface ChartRendererProps {
  config: any;
}

/**
 * 图表渲染组件
 * 使用 G2Plot 渲染 MCP Server 返回的图表配置
 */
const ChartRenderer: React.FC<ChartRendererProps> = ({ config }) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!config || !chartRef.current) return;

    setLoading(true);
    setError(null);

    // 动态导入 G2Plot
    import('@antv/g2plot')
      .then((G2Plot) => {
        try {
          // 清理之前的图表实例
          if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
          }

          // 获取图表类型
          const chartType = config.type || config.chartType || 'Line';
          const ChartClass = (G2Plot as any)[chartType];

          if (!ChartClass) {
            setError(`不支持的图表类型: ${chartType}`);
            setLoading(false);
            return;
          }

          // 创建图表实例
          const chart = new ChartClass(chartRef.current, {
            ...config.options,
            data: config.data,
            autoFit: true,
            height: 400,
          });

          chart.render();
          chartInstanceRef.current = chart;
          setLoading(false);
        } catch (err: any) {
          console.error('渲染图表失败:', err);
          setError(err.message || '渲染图表失败');
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('加载 G2Plot 失败:', err);
        setError('请先安装 @antv/g2plot: pnpm add @antv/g2plot');
        setLoading(false);
      });

    // 清理函数
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
    };
  }, [config]);

  if (!config) {
    return <Empty description="暂无图表数据" />;
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <Spin size="large" tip="正在渲染图表..." />
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert
          message="图表渲染错误"
          description={error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      {config.error && (
        <Alert
          message="图表生成错误"
          description={config.error}
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}
      <div ref={chartRef} style={{ minHeight: 400 }} />
      {config.description && (
        <Alert
          message="图表说明"
          description={config.description}
          type="info"
          showIcon
          style={{ marginTop: 16 }}
        />
      )}
    </div>
  );
};

export default ChartRenderer;
