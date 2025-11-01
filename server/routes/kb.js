const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const dataDir = path.join(__dirname, "..", "data");
const kbFile = path.join(dataDir, "kb.json");

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
  }
  if (!fs.existsSync(kbFile)) {
    fs.writeFileSync(kbFile, JSON.stringify({ docs: [] }, null, 2), "utf-8");
  }
}

function readStore() {
  ensureStore();
  try {
    const raw = fs.readFileSync(kbFile, "utf-8");
    return JSON.parse(raw);
  } catch (e) {
    return { docs: [] };
  }
}

function writeStore(store) {
  ensureStore();
  fs.writeFileSync(kbFile, JSON.stringify(store, null, 2), "utf-8");
}

// 列表
router.get("/docs", (req, res) => {
  const store = readStore();
  res.json({ success: true, data: store.docs });
});

// 新增
router.post("/docs", (req, res) => {
  const { title, content, tags } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ success: false, message: "title 与 content 必填" });
  }
  const store = readStore();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const doc = { 
    id, 
    title: String(title), 
    content: String(content), 
    tags: Array.isArray(tags) ? tags.filter(t => t && t.trim()) : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  store.docs.unshift(doc);
  writeStore(store);
  res.json({ success: true, data: doc });
});

// 更新
router.put("/docs/:id", (req, res) => {
  const { id } = req.params;
  const { title, content, tags } = req.body || {};
  const store = readStore();
  const idx = store.docs.findIndex((d) => d.id === id);
  if (idx === -1) {
    return res.status(404).json({ success: false, message: "未找到文档" });
  }
  const doc = store.docs[idx];
  if (title !== undefined) doc.title = String(title);
  if (content !== undefined) doc.content = String(content);
  if (tags !== undefined) doc.tags = Array.isArray(tags) ? tags.filter(t => t && t.trim()) : [];
  doc.updatedAt = Date.now();
  writeStore(store);
  res.json({ success: true, data: doc });
});

// 获取单个文档
router.get("/docs/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const doc = store.docs.find((d) => d.id === id);
  if (!doc) {
    return res.status(404).json({ success: false, message: "未找到文档" });
  }
  res.json({ success: true, data: doc });
});

// 删除
router.delete("/docs/:id", (req, res) => {
  const { id } = req.params;
  const store = readStore();
  const before = store.docs.length;
  store.docs = store.docs.filter((d) => d.id !== id);
  if (store.docs.length === before) {
    return res.status(404).json({ success: false, message: "未找到文档" });
  }
  writeStore(store);
  res.json({ success: true });
});

// 简单搜索（关键词包含，返回前 5 条）
router.get("/search", (req, res) => {
  const q = (req.query.q || "").toString().trim();
  if (!q) return res.json({ success: true, data: [] });
  const store = readStore();
  const lower = q.toLowerCase();
  const results = store.docs
    .map((d) => ({
      id: d.id,
      title: d.title,
      snippet: d.content.slice(0, 500),
      score: (d.title.toLowerCase().includes(lower) ? 2 : 0) + (d.content.toLowerCase().includes(lower) ? 1 : 0),
    }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  res.json({ success: true, data: results });
});

module.exports = router;


