import React, { useState, useEffect } from 'react';
import {
  Upload,
  Button,
  Card,
  Table,
  Input,
  message,
  Space,
  Empty,
  Spin,
  Modal,
  Row,
  Col,
  Statistic,
  Tag,
  Popconfirm,
} from 'antd';
import {
  InboxOutlined,
  BarChartOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  LineChartOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import type { UploadProps } from 'antd';
import ChartRenderer from '../components/analysis/ChartRenderer';
import * as analysisApi from '../utils/analysisApi';

const { Dragger } = Upload;
const { TextArea } = Input;

interface DataFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  uploadedAt: string;
}

interface ChartConfig {
  type: string;
  data: any;
  options: any;
}

const DataAnalysis: React.FC = () => {
  const [files, setFiles] = useState<DataFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [selectedFile, setSelectedFile] = useState<DataFile | null>(null);
  const [chartConfig, setChartConfig] = useState<ChartConfig | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const result = await analysisApi.getFiles();
      setFiles(result.files);
    } catch (error: any) {
      message.error(error.message || '加载文件列表失败');
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    accept: '.csv,.xls,.xlsx,.json,.txt',
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        setUploading(true);
        const formData = new FormData();
        formData.append('files', file as File);

        const result = await analysisApi.uploadFiles(formData);
        
        message.success(`${result.files.length} 个文件上传成功`);
        onSuccess?.(result);
        await loadFiles();
      } catch (error: any) {
        message.error(error.message || '文件上传失败');
        onError?.(error);
      } finally {
        setUploading(false);
      }
    },
  };

  const handleGenerateChart = async () => {
    if (!selectedFile) {
      message.warning('请先选择一个数据文件');
      return;
    }

    if (!userQuery.trim()) {
      message.warning('请描述您想生成的图表');
      return;
    }

    try {
      setGenerating(true);
      const result = await analysisApi.generateChart({
        filePath: selectedFile.path,
        userQuery: userQuery.trim(),
      });

      setChartConfig(result.chart);
      message.success('图表生成成功');
    } catch (error: any) {
      message.error(error.message || '图表生成失败');
    } finally {
      setGenerating(false);
    }
  };

  const handlePreviewData = async (file: DataFile) => {
    try {
      setLoading(true);
      const result = await analysisApi.previewData(file.path);
      setPreviewData(result);
      setPreviewModalVisible(true);
    } catch (error: any) {
      message.error(error.message || '预览数据失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteFile = async (file: DataFile) => {
    try {
      await analysisApi.deleteFile(file.id);
      message.success('文件已删除');
      await loadFiles();
      
      if (selectedFile?.id === file.id) {
        setSelectedFile(null);
        setChartConfig(null);
      }
    } catch (error: any) {
      message.error(error.message || '删除文件失败');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const fileColumns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: DataFile) => (
        <Space>
          <FileTextOutlined />
          <span>{name}</span>
          {selectedFile?.id === record.id && <Tag color="blue">已选择</Tag>}
        </Space>
      ),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => <Tag>{type.toUpperCase()}</Tag>,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadedAt',
      key: 'uploadedAt',
      render: (time: string) => new Date(time).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: DataFile) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewData(record)}
          >
            预览
          </Button>
          <Button
            type={selectedFile?.id === record.id ? 'primary' : 'default'}
            size="small"
            onClick={() => setSelectedFile(record)}
          >
            {selectedFile?.id === record.id ? '已选择' : '选择'}
          </Button>
          <Popconfirm
            title="确定删除此文件?"
            onConfirm={() => handleDeleteFile(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const renderPreviewModal = () => {
    if (!previewData) return null;

    const { data, total, isArray } = previewData;

    return (
      <Modal
        title="数据预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        <div style={{ maxHeight: '60vh', overflow: 'auto' }}>
          {isArray && Array.isArray(data) ? (
            <>
              <p>共 {total} 条数据，显示前 {data.length} 条</p>
              <Table
                dataSource={data}
                columns={Object.keys(data[0] || {}).map(key => ({
                  title: key,
                  dataIndex: key,
                  key,
                }))}
                pagination={false}
                scroll={{ x: true }}
                size="small"
              />
            </>
          ) : (
            <pre>{JSON.stringify(data, null, 2)}</pre>
          )}
        </div>
      </Modal>
    );
  };

  return (
    <div style={{ padding: '24px', minHeight: '100vh', background: '#f0f2f5' }}>
      <Row gutter={[16, 16]}>
        {/* 统计信息 */}
        <Col span={24}>
          <Card>
            <Row gutter={16}>
              <Col span={8}>
                <Statistic
                  title="已上传文件"
                  value={files.length}
                  prefix={<FileTextOutlined />}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="总数据量"
                  value={files.reduce((sum, f) => sum + f.size, 0)}
                  formatter={(value) => formatFileSize(value as number)}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="已生成图表"
                  value={chartConfig ? 1 : 0}
                  prefix={<BarChartOutlined />}
                />
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 文件上传区域 */}
        <Col xs={24} lg={12}>
          <Card title="数据上传" bordered={false}>
            <Dragger {...uploadProps} disabled={uploading}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 CSV、Excel、JSON 格式文件，单个文件不超过 50MB
              </p>
            </Dragger>

            {uploading && (
              <div style={{ textAlign: 'center', marginTop: 16 }}>
                <Spin tip="上传中..." />
              </div>
            )}
          </Card>
        </Col>

        {/* 图表生成控制 */}
        <Col xs={24} lg={12}>
          <Card title="图表生成" bordered={false}>
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong>选择数据文件:</strong>
                </p>
                {selectedFile ? (
                  <Tag color="blue" icon={<FileTextOutlined />}>
                    {selectedFile.name}
                  </Tag>
                ) : (
                  <Tag>未选择</Tag>
                )}
              </div>

              <div>
                <p style={{ marginBottom: 8 }}>
                  <strong>描述您的需求:</strong>
                </p>
                <TextArea
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="例如: 生成销售额折线图、按地区分布的饼图、产品对比柱状图等"
                  rows={4}
                  disabled={!selectedFile}
                />
              </div>

              <Button
                type="primary"
                icon={<BarChartOutlined />}
                size="large"
                block
                onClick={handleGenerateChart}
                loading={generating}
                disabled={!selectedFile || !userQuery.trim()}
              >
                生成图表
              </Button>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <Tag icon={<LineChartOutlined />}>折线图</Tag>
                <Tag icon={<BarChartOutlined />}>柱状图</Tag>
                <Tag icon={<PieChartOutlined />}>饼图</Tag>
                <Tag>散点图</Tag>
                <Tag>面积图</Tag>
                <Tag>更多...</Tag>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 文件列表 */}
        <Col span={24}>
          <Card title="数据文件管理" bordered={false}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <Spin size="large" />
              </div>
            ) : files.length === 0 ? (
              <Empty description="暂无数据文件，请先上传" />
            ) : (
              <Table
                dataSource={files}
                columns={fileColumns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            )}
          </Card>
        </Col>

        {/* 图表展示 */}
        {chartConfig && (
          <Col span={24}>
            <Card
              title="图表结果"
              bordered={false}
              extra={
                <Button onClick={() => setChartConfig(null)}>清除</Button>
              }
            >
              <ChartRenderer config={chartConfig} />
            </Card>
          </Col>
        )}
      </Row>

      {renderPreviewModal()}
    </div>
  );
};

export default DataAnalysis;
