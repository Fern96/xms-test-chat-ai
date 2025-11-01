/**
 * 数据分析 API 客户端
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  [key: string]: any;
}

/**
 * 上传数据文件
 */
export async function uploadFiles(formData: FormData): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '上传失败');
  }

  return response.json();
}

/**
 * 获取文件列表
 */
export async function getFiles(): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/files`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '获取文件列表失败');
  }

  return response.json();
}

/**
 * 删除文件
 */
export async function deleteFile(fileId: string): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/files/${fileId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '删除文件失败');
  }

  return response.json();
}

/**
 * 生成图表
 */
export async function generateChart(params: {
  filePath: string;
  userQuery?: string;
  chartType?: string;
}): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/generate-chart`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '生成图表失败');
  }

  return response.json();
}

/**
 * 预览数据
 */
export async function previewData(filePath: string, limit: number = 100): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}/api/analysis/preview-data`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ filePath, limit }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || '预览数据失败');
  }

  return response.json();
}
