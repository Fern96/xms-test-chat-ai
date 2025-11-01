/**
 * 数据分析路由
 * 集成 MCP Server Chart 进行图表生成
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { promisify } = require('util');

const router = express.Router();
const execAsync = promisify(exec);

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'data', 'analysis');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // 支持的文件类型：CSV, Excel, JSON
    const allowedExtensions = ['.csv', '.xls', '.xlsx', '.json', '.txt'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${ext}。支持的类型: ${allowedExtensions.join(', ')}`));
    }
  }
});

/**
 * MCP Server Chart 集成类
 */
class MCPChartServer {
  constructor() {
    this.command = 'npx';
    this.args = ['-y', '@antv/mcp-server-chart'];
  }

  /**
   * 调用 MCP Server 生成图表
   * @param {Object} params - 参数
   * @param {string} params.data - 数据 (JSON 格式)
   * @param {string} params.chartType - 图表类型 (line, bar, pie, scatter等)
   * @param {string} params.userQuery - 用户查询描述
   * @returns {Promise<Object>} 图表配置
   */
  async generateChart({ data, chartType, userQuery }) {
    try {
      // 准备输入数据
      const inputData = {
        data: typeof data === 'string' ? JSON.parse(data) : data,
        chartType: chartType || 'auto', // 自动推断图表类型
        query: userQuery || ''
      };

      // 创建临时文件存储输入
      const tempInputFile = path.join(__dirname, '..', 'data', 'analysis', `input-${Date.now()}.json`);
      fs.writeFileSync(tempInputFile, JSON.stringify(inputData, null, 2));

      // 调用 MCP Server
      const command = `${this.command} ${this.args.join(' ')} --input ${tempInputFile}`;
      console.log('📊 调用 MCP Server Chart:', command);

      const { stdout, stderr } = await execAsync(command, {
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        timeout: 60000 // 60s timeout
      });

      if (stderr) {
        console.warn('⚠️ MCP Server stderr:', stderr);
      }

      // 解析输出
      let chartConfig;
      try {
        chartConfig = JSON.parse(stdout);
      } catch (parseError) {
        console.error('❌ 解析 MCP Server 输出失败:', parseError);
        // 尝试提取 JSON 部分
        const jsonMatch = stdout.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          chartConfig = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('MCP Server 返回格式错误');
        }
      }

      // 清理临时文件
      fs.unlinkSync(tempInputFile);

      return chartConfig;
    } catch (error) {
      console.error('❌ MCP Server Chart 调用失败:', error);
      throw error;
    }
  }

  /**
   * 使用 AI 智能生成图表
   * @param {Object} params
   * @param {string} params.filePath - 数据文件路径
   * @param {string} params.userQuery - 用户需求描述
   * @returns {Promise<Object>}
   */
  async generateChartWithAI({ filePath, userQuery }) {
    try {
      // 读取数据文件
      const data = this.readDataFile(filePath);

      // 调用 MCP Server 生成图表
      return await this.generateChart({
        data,
        chartType: 'auto',
        userQuery
      });
    } catch (error) {
      console.error('❌ AI 图表生成失败:', error);
      throw error;
    }
  }

  /**
   * 读取数据文件
   * @param {string} filePath
   * @returns {Array|Object} 数据
   */
  readDataFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const content = fs.readFileSync(filePath, 'utf-8');

    if (ext === '.json') {
      return JSON.parse(content);
    } else if (ext === '.csv') {
      // 简单的 CSV 解析（生产环境建议使用 papaparse）
      const lines = content.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, index) => {
          const value = values[index]?.trim();
          // 尝试转换为数字
          obj[header] = isNaN(value) ? value : parseFloat(value);
        });
        return obj;
      });
      return data;
    } else if (ext === '.txt') {
      // 尝试 JSON 解析
      try {
        return JSON.parse(content);
      } catch {
        throw new Error('TXT 文件必须包含有效的 JSON 数据');
      }
    } else {
      throw new Error(`不支持的文件格式: ${ext}`);
    }
  }
}

const mcpChartServer = new MCPChartServer();

/**
 * POST /api/analysis/upload
 * 上传数据文件
 */
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '请上传文件'
      });
    }

    const uploadedFiles = req.files.map(file => ({
      id: path.basename(file.filename, path.extname(file.filename)),
      name: file.originalname,
      path: file.path,
      size: file.size,
      type: path.extname(file.originalname).slice(1),
      uploadedAt: new Date().toISOString()
    }));

    res.json({
      success: true,
      files: uploadedFiles
    });
  } catch (error) {
    console.error('❌ 文件上传失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '文件上传失败'
    });
  }
});

/**
 * POST /api/analysis/generate-chart
 * 生成图表
 */
router.post('/generate-chart', async (req, res) => {
  try {
    const { filePath, userQuery, chartType } = req.body;

    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: '缺少文件路径'
      });
    }

    // 验证文件存在
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    let chartConfig;

    if (userQuery) {
      // 使用 AI 智能生成
      chartConfig = await mcpChartServer.generateChartWithAI({
        filePath,
        userQuery
      });
    } else {
      // 基于数据自动生成
      const data = mcpChartServer.readDataFile(filePath);
      chartConfig = await mcpChartServer.generateChart({
        data,
        chartType: chartType || 'auto'
      });
    }

    res.json({
      success: true,
      chart: chartConfig
    });
  } catch (error) {
    console.error('❌ 图表生成失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '图表生成失败'
    });
  }
});

/**
 * GET /api/analysis/files
 * 获取已上传的文件列表
 */
router.get('/files', (req, res) => {
  try {
    const analysisDir = path.join(__dirname, '..', 'data', 'analysis');
    
    if (!fs.existsSync(analysisDir)) {
      return res.json({
        success: true,
        files: []
      });
    }

    const files = fs.readdirSync(analysisDir)
      .filter(filename => {
        const ext = path.extname(filename).toLowerCase();
        return ['.csv', '.xls', '.xlsx', '.json', '.txt'].includes(ext);
      })
      .map(filename => {
        const filePath = path.join(analysisDir, filename);
        const stats = fs.statSync(filePath);
        return {
          id: path.basename(filename, path.extname(filename)),
          name: filename,
          path: filePath,
          size: stats.size,
          type: path.extname(filename).slice(1),
          uploadedAt: stats.birthtime.toISOString()
        };
      })
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    res.json({
      success: true,
      files
    });
  } catch (error) {
    console.error('❌ 获取文件列表失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '获取文件列表失败'
    });
  }
});

/**
 * DELETE /api/analysis/files/:id
 * 删除文件
 */
router.delete('/files/:id', (req, res) => {
  try {
    const { id } = req.params;
    const analysisDir = path.join(__dirname, '..', 'data', 'analysis');
    
    // 查找匹配的文件
    const files = fs.readdirSync(analysisDir);
    const matchedFile = files.find(f => path.basename(f, path.extname(f)) === id);

    if (!matchedFile) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const filePath = path.join(analysisDir, matchedFile);
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      message: '文件已删除'
    });
  } catch (error) {
    console.error('❌ 删除文件失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '删除文件失败'
    });
  }
});

/**
 * POST /api/analysis/preview-data
 * 预览数据文件内容
 */
router.post('/preview-data', (req, res) => {
  try {
    const { filePath, limit = 100 } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: '文件不存在'
      });
    }

    const data = mcpChartServer.readDataFile(filePath);
    const preview = Array.isArray(data) ? data.slice(0, limit) : data;

    res.json({
      success: true,
      data: preview,
      total: Array.isArray(data) ? data.length : 1,
      isArray: Array.isArray(data)
    });
  } catch (error) {
    console.error('❌ 预览数据失败:', error);
    res.status(500).json({
      success: false,
      message: error.message || '预览数据失败'
    });
  }
});

module.exports = router;
