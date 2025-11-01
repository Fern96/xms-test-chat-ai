import React, { useState, useEffect } from "react";
import { Drawer, Input, Button, message, Modal, Tag, Upload, Select, Checkbox, Space, Divider } from "antd";
import {
  BookOutlined,
  CloseOutlined,
  CloudUploadOutlined,
  FolderOutlined,
  DeleteOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  TagOutlined,
  FileTextOutlined,
  LineChartOutlined,
  DatabaseOutlined,
  BulbOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import { listDocs, addDoc, deleteDoc, updateDoc, getDoc, type KBDoc } from "../../utils/kbApi";

interface KnowledgeBaseDrawerProps {
  open: boolean;
  onClose: () => void;
}

const KnowledgeBaseDrawer: React.FC<KnowledgeBaseDrawerProps> = ({
  open,
  onClose,
}) => {
  const [kbDocs, setKbDocs] = useState<KBDoc[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | undefined>();
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [kbAddOpen, setKbAddOpen] = useState(false);
  const [kbEditOpen, setKbEditOpen] = useState(false);
  const [kbViewOpen, setKbViewOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KBDoc | null>(null);
  const [viewingDoc, setViewingDoc] = useState<KBDoc | null>(null);
  const [kbTitle, setKbTitle] = useState("");
  const [kbContent, setKbContent] = useState("");
  const [kbTags, setKbTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [addMode, setAddMode] = useState<"manual" | "upload">("manual");
  const [dragActive, setDragActive] = useState(false);

  const refreshKb = async () => {
    try {
      setKbLoading(true);
      const docs = await listDocs();
      setKbDocs(docs);
    } catch (e) {
      message.error("获取知识库失败");
    } finally {
      setKbLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      refreshKb();
    }
  }, [open]);

  // 获取所有标签
  const allTags = Array.from(
    new Set(kbDocs.flatMap((doc) => doc.tags || []))
  ).sort();

  // 根据文档标题/内容智能选择图标和颜色（原型图风格：蓝色文档、绿色图表、橙色堆叠、紫色灯泡）
  const getDocIcon = (doc: KBDoc) => {
    const title = doc.title.toLowerCase();
    const content = doc.content.toLowerCase();
    const tags = (doc.tags || []).map(t => t.toLowerCase());
    
    if (title.includes('增长') || title.includes('用户') || tags.includes('增长') || tags.includes('用户') || content.includes('aarrr')) {
      return { icon: <LineChartOutlined />, color: '#52c41a' }; // 绿色图表
    }
    if (title.includes('数据') && (title.includes('清洗') || title.includes('质量') || tags.includes('数据质量') || tags.includes('etl'))) {
      return { icon: <DatabaseOutlined />, color: '#fa8c16' }; // 橙色堆叠
    }
    if (title.includes('洞察') || title.includes('方法论') || tags.includes('洞察') || tags.includes('方法论')) {
      return { icon: <BulbOutlined />, color: '#722ed1' }; // 紫色灯泡
    }
    if (title.includes('销售') || tags.includes('销售')) {
      return { icon: <FileTextOutlined />, color: '#1890ff' }; // 蓝色文档
    }
    return { icon: <FileTextOutlined />, color: '#1890ff' }; // 默认蓝色文档
  };

  // 判断标签是否需要高亮（第一个标签或重要标签）
  const isTagHighlighted = (tag: string, index: number, allTags: string[]) => {
    // 第一个标签高亮，或者包含关键词的标签高亮
    const highlightKeywords = ['销售', '增长', '洞察', '数据分析'];
    return index === 0 || highlightKeywords.some(kw => tag.includes(kw));
  };

  // 过滤文档
  const filteredDocs = kbDocs.filter((doc) => {
    const matchSearch =
      !searchQuery ||
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchTag = !selectedTag || (doc.tags || []).includes(selectedTag);
    return matchSearch && matchTag;
  });

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      const text = await file.text();
      const title = file.name.replace(/\.[^/.]+$/, "");
      // 从文件名提取可能的标签
      const tags = title.split(/[_\-\s]+/).filter(t => t.length > 1).slice(0, 3);
      await addDoc(title, text, tags);
      message.success("文档上传成功");
      refreshKb();
    } catch (error) {
      message.error("上传失败");
    } finally {
      setUploading(false);
    }
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !kbTags.includes(tagInput.trim())) {
      setKbTags([...kbTags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setKbTags(kbTags.filter((t) => t !== tag));
  };

  const handleEdit = async (doc: KBDoc) => {
    setEditingDoc(doc);
    setKbTitle(doc.title);
    setKbContent(doc.content);
    setKbTags(doc.tags || []);
    setKbEditOpen(true);
  };

  const handleView = async (docId: string) => {
    try {
      const doc = await getDoc(docId);
      setViewingDoc(doc);
      setKbViewOpen(true);
    } catch {
      message.error("获取文档详情失败");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingDoc || !kbTitle.trim() || !kbContent.trim()) {
      message.warning("请填写标题与内容");
      return;
    }
    try {
      await updateDoc(editingDoc.id, {
        title: kbTitle.trim(),
        content: kbContent.trim(),
        tags: kbTags,
      });
      message.success("更新成功");
      setKbEditOpen(false);
      setEditingDoc(null);
      setKbTitle("");
      setKbContent("");
      setKbTags([]);
      refreshKb();
    } catch {
      message.error("更新失败");
    }
  };

  const handleBatchDelete = async () => {
    if (selectedDocIds.size === 0) {
      message.warning("请先选择要删除的文档");
      return;
    }
    Modal.confirm({
      title: "确认删除",
      content: `确定要删除选中的 ${selectedDocIds.size} 个文档吗？`,
      onOk: async () => {
        try {
          await Promise.all(Array.from(selectedDocIds).map((id) => deleteDoc(id)));
          message.success("删除成功");
          setSelectedDocIds(new Set());
          refreshKb();
        } catch {
          message.error("删除失败");
        }
      },
    });
  };

  const handleToggleSelect = (docId: string) => {
    const newSelected = new Set(selectedDocIds);
    if (newSelected.has(docId)) {
      newSelected.delete(docId);
    } else {
      newSelected.add(docId);
    }
    setSelectedDocIds(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedDocIds.size === filteredDocs.length) {
      setSelectedDocIds(new Set());
    } else {
      setSelectedDocIds(new Set(filteredDocs.map((d) => d.id)));
    }
  };

  return (
    <>
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <BookOutlined />
            <span>知识库</span>
            {selectedDocIds.size > 0 && (
              <Tag color="blue">{selectedDocIds.size} 个已选中</Tag>
            )}
          </div>
        }
        placement="right"
        onClose={onClose}
        open={open}
        width={450}
        closable={false}
        styles={{
          body: {
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
          },
        }}
        extra={
          <Space>
            {selectedDocIds.size > 0 && (
              <Button
                danger
                size="small"
                icon={<DeleteOutlined />}
                onClick={handleBatchDelete}
              >
                批量删除
              </Button>
            )}
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              className="text-gray-500"
            />
          </Space>
        }
      >
        {/* 搜索框和标签筛选 - 同一行 */}
        <div className="flex items-center gap-2 mb-4">
          <Input
            placeholder="搜索知识库..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
          />
          {allTags.length > 0 && (
            <Select
              placeholder="标签"
              value={selectedTag}
              onChange={setSelectedTag}
              allowClear
              style={{ width: 120 }}
              suffixIcon={<TagOutlined />}
            >
              {allTags.map((tag) => (
                <Select.Option key={tag} value={tag}>
                  {tag}
                </Select.Option>
              ))}
            </Select>
          )}
        </div>

        {/* 添加文档按钮（合并上传和手动添加） */}
        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          className="mb-4"
          onClick={() => {
            setKbAddOpen(true);
            setAddMode("manual");
            setKbTitle("");
            setKbContent("");
            setKbTags([]);
          }}
        >
          添加文档
        </Button>

        {/* 文档列表 - 使用flex-1填充剩余空间 */}
        <div className="border-t border-gray-200 pt-4 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <FolderOutlined className="text-gray-600 text-base" />
              <span className="font-semibold text-gray-700 text-sm">我的知识库</span>
            </div>
            {filteredDocs.length > 0 && (
              <Checkbox
                checked={selectedDocIds.size === filteredDocs.length && filteredDocs.length > 0}
                indeterminate={selectedDocIds.size > 0 && selectedDocIds.size < filteredDocs.length}
                onChange={handleSelectAll}
                className="text-xs"
              >
                全选
              </Checkbox>
            )}
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto pr-1 min-h-0">
            {filteredDocs.map((doc) => {
              const docIcon = getDocIcon(doc);
              const isSelected = selectedDocIds.has(doc.id);
              
              return (
                <div
                  key={doc.id}
                  className={`group relative border rounded-lg p-4 transition-all duration-200 cursor-pointer bg-white ${
                    isSelected
                      ? "border-blue-400 bg-blue-50 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    handleView(doc.id);
                  }}
                  onClick={(e) => {
                    // 点击卡片其他区域也可以选择
                    if (!(e.target as HTMLElement).closest('button') && 
                        !(e.target as HTMLElement).closest('input') &&
                        !(e.target as HTMLElement).closest('.view-btn')) {
                      handleToggleSelect(doc.id);
                    }
                  }}
                >
                  {/* 选择框 - 右上角显示（仅在选中或悬浮时显示） */}
                  <div className="absolute top-3 right-3 z-10">
                    <Checkbox
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleToggleSelect(doc.id);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
                      style={{ transition: 'opacity 0.2s' }}
                    />
                  </div>

                  <div className="flex items-start gap-3">
                    {/* 图标 */}
                    <div
                      className="flex-shrink-0 flex items-center justify-center text-xl"
                      style={{ color: docIcon.color }}
                    >
                      {docIcon.icon}
                    </div>

                    {/* 内容 */}
                    <div className="flex-1 min-w-0">
                      {/* 标题 */}
                      <h3 className="font-semibold text-sm text-gray-700 mb-1.5 leading-tight">
                        {doc.title}
                      </h3>

                      {/* 描述 */}
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2.5 leading-relaxed">
                        {doc.content.slice(0, 100)}
                        {doc.content.length > 100 ? "..." : ""}
                      </p>

                      {/* 标签 - 原型图风格：第一个紫色高亮，其他灰色 */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {(doc.tags || []).map((tag, idx) => {
                          const isHighlight = isTagHighlighted(tag, idx, doc.tags || []);
                          return (
                            <span
                              key={tag}
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                isHighlight
                                  ? "bg-purple-100 text-purple-700"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                        {(!doc.tags || doc.tags.length === 0) && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                            未分类
                          </span>
                        )}
                      </div>

                      {/* 底部操作栏 - 悬浮显示 */}
                      <div className="flex items-center justify-end gap-3 mt-3 pt-2 border-t border-gray-100 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          type="text"
                          size="small"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleView(doc.id);
                          }}
                          className="h-7 px-2 text-xs text-gray-500 hover:text-blue-500"
                        >
                          查看
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEdit(doc);
                          }}
                          className="h-7 px-2 text-xs text-gray-500 hover:text-blue-500"
                        >
                          编辑
                        </Button>
                        <Button
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            Modal.confirm({
                              title: "确认删除",
                              content: `确定要删除文档 "${doc.title}" 吗？`,
                              onOk: async () => {
                                try {
                                  await deleteDoc(doc.id);
                                  message.success("已删除");
                                  refreshKb();
                                } catch {
                                  message.error("删除失败");
                                }
                              },
                            });
                          }}
                          className="h-7 px-2 text-xs"
                        >
                          删除
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredDocs.length === 0 && !kbLoading && (
              <div className="text-center text-gray-400 text-sm py-8">
                {searchQuery || selectedTag ? "未找到匹配的文档" : "暂无文档"}
              </div>
            )}
          </div>
        </div>

      </Drawer>

      {/* 新增文档弹窗（合并手动添加和上传） */}
      <Modal
        title="添加知识文档"
        open={kbAddOpen}
        onCancel={() => {
          setKbAddOpen(false);
          setKbTitle("");
          setKbContent("");
          setKbTags([]);
          setAddMode("manual");
          setDragActive(false);
        }}
        onOk={async () => {
          if (addMode === "manual") {
            if (!kbTitle.trim() || !kbContent.trim()) {
              message.warning("请填写标题与内容");
              return;
            }
            try {
              await addDoc(kbTitle.trim(), kbContent.trim(), kbTags);
              setKbTitle("");
              setKbContent("");
              setKbTags([]);
              setKbAddOpen(false);
              setAddMode("manual");
              message.success("已添加");
              refreshKb();
            } catch {
              message.error("添加失败");
            }
          }
          // upload模式不需要在OK按钮处理，文件选择后自动上传
        }}
        width={600}
        footer={addMode === "manual" ? undefined : null}
      >
        {/* 模式切换标签 */}
        <div className="flex items-center gap-2 mb-4 pb-3 border-b">
          <Button
            type={addMode === "manual" ? "primary" : "default"}
            onClick={() => setAddMode("manual")}
            className="flex-1"
          >
            手动添加
          </Button>
          <Button
            type={addMode === "upload" ? "primary" : "default"}
            onClick={() => setAddMode("upload")}
            className="flex-1"
            icon={<CloudUploadOutlined />}
          >
            上传文件
          </Button>
        </div>

        {/* 手动添加模式 */}
        {addMode === "manual" && (
          <div className="space-y-3">
            <Input
              placeholder="标题"
              value={kbTitle}
              onChange={(e) => setKbTitle(e.target.value)}
            />
            <Input.TextArea
              rows={8}
              placeholder="内容（支持粘贴）"
              value={kbContent}
              onChange={(e) => setKbContent(e.target.value)}
            />
            <div>
              <div className="mb-2 text-sm text-gray-600">标签</div>
              <div className="flex flex-wrap gap-2 mb-2">
                {kbTags.map((tag) => (
                  <Tag
                    key={tag}
                    closable
                    onClose={() => handleRemoveTag(tag)}
                    color="blue"
                  >
                    {tag}
                  </Tag>
                ))}
              </div>
              <Space.Compact style={{ width: "100%" }}>
                <Input
                  placeholder="输入标签并按回车"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onPressEnter={handleAddTag}
                />
                <Button type="primary" onClick={handleAddTag}>
                  添加
                </Button>
              </Space.Compact>
            </div>
          </div>
        )}

        {/* 文件上传模式 - 支持拖拽 */}
        {addMode === "upload" && (
          <Upload.Dragger
            beforeUpload={(file) => {
              const validTypes = [
                "application/pdf",
                "text/plain",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                "text/markdown",
              ];
              if (!validTypes.includes(file.type)) {
                message.error("仅支持 PDF, TXT, DOCX, MD 格式");
                return false;
              }
              handleFileUpload(file);
              setKbAddOpen(false);
              setDragActive(false);
              return false;
            }}
            showUploadList={false}
            accept=".pdf,.txt,.docx,.md"
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => {
              setDragActive(false);
            }}
            className={dragActive ? "border-blue-400 bg-blue-50" : ""}
          >
            <p className="ant-upload-drag-icon">
              <CloudUploadOutlined style={{ fontSize: 48, color: "#1890ff" }} />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">支持 PDF, TXT, DOCX, MD 格式</p>
          </Upload.Dragger>
        )}
      </Modal>

      {/* 编辑文档弹窗 */}
      <Modal
        title="编辑知识文档"
        open={kbEditOpen}
        onCancel={() => {
          setKbEditOpen(false);
          setEditingDoc(null);
          setKbTitle("");
          setKbContent("");
          setKbTags([]);
        }}
        onOk={handleSaveEdit}
        width={600}
      >
        <div className="space-y-3">
          <Input
            placeholder="标题"
            value={kbTitle}
            onChange={(e) => setKbTitle(e.target.value)}
          />
          <Input.TextArea
            rows={8}
            placeholder="内容（支持粘贴）"
            value={kbContent}
            onChange={(e) => setKbContent(e.target.value)}
          />
          <div>
            <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">标签</div>
            <div className="flex flex-wrap gap-2 mb-2">
              {kbTags.map((tag) => (
                <Tag
                  key={tag}
                  closable
                  onClose={() => handleRemoveTag(tag)}
                  color="blue"
                >
                  {tag}
                </Tag>
              ))}
            </div>
            <Space.Compact style={{ width: "100%" }}>
              <Input
                placeholder="输入标签并按回车"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onPressEnter={handleAddTag}
              />
              <Button type="primary" onClick={handleAddTag}>
                添加
              </Button>
            </Space.Compact>
          </div>
        </div>
      </Modal>

      {/* 查看文档详情弹窗 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <BookOutlined />
            <span>{viewingDoc?.title}</span>
          </div>
        }
        open={kbViewOpen}
        onCancel={() => {
          setKbViewOpen(false);
          setViewingDoc(null);
        }}
        footer={[
          <Button key="edit" icon={<EditOutlined />} onClick={() => {
            if (viewingDoc) {
              setKbViewOpen(false);
              handleEdit(viewingDoc);
            }
          }}>
            编辑
          </Button>,
          <Button key="close" onClick={() => {
            setKbViewOpen(false);
            setViewingDoc(null);
          }}>
            关闭
          </Button>,
        ]}
        width={700}
      >
        {viewingDoc && (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">标签</div>
              <div className="flex flex-wrap gap-2">
                {(viewingDoc.tags || []).map((tag) => (
                  <Tag key={tag} color="blue">
                    {tag}
                  </Tag>
                ))}
                {(!viewingDoc.tags || viewingDoc.tags.length === 0) && (
                  <Tag>未分类</Tag>
                )}
              </div>
            </div>
            <Divider />
            <div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">内容</div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded p-4 max-h-96 overflow-y-auto whitespace-pre-wrap">
                {viewingDoc.content}
              </div>
            </div>
            <div className="text-xs text-gray-400">
              创建时间: {new Date(viewingDoc.createdAt).toLocaleString()}
              {viewingDoc.updatedAt && (
                <> | 更新时间: {new Date(viewingDoc.updatedAt).toLocaleString()}</>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
};

export default KnowledgeBaseDrawer;
