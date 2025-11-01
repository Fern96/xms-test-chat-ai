// API 基础配置 - 使用环境变量
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

// 消息类型定义
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

// 流式响应错误处理函数（统一友好提示映射）
function handleStreamError(error: unknown): string {
  console.error("AI流式API调用失败:", error);

  // 默认：其他服务端错误（5xx、超时、模型不可用等）
  let errorMessage = "🤖 AI 服务暂时不可用，请稍后重试。";

  if (error instanceof Error) {
    const msg = error.message || "";

    // 400 Bad Request 且包含指定的格式错误提示
    if (
      msg.includes("每个消息必须包含 role 和 content 字段") ||
      // 一些环境可能只抛出 400 文本
      (msg.includes("HTTP 400") && msg.includes("Bad Request"))
    ) {
      return "⚠️ 消息格式异常，请刷新页面或重新开始对话。";
    }

    // 网络连接失败（如 Failed to fetch、ERR_CONNECTION_REFUSED 等）
    if (
      msg.includes("Failed to fetch") ||
      msg.includes("ERR_CONNECTION_REFUSED") ||
      msg.includes("ECONNREFUSED") ||
      msg.toLowerCase().includes("network")
    ) {
      return "🌐 网络连接失败，请检查网络或稍后重试。";
    }

    // 其他错误均统一为服务暂不可用
    return "🤖 AI 服务暂时不可用，请稍后重试。";
  }

  return errorMessage;
}

/**
 * 流式调用AI聊天接口（统一接口）
 * @param messages 聊天消息历史
 * @param onChunk 接收到数据块时的回调
 * @param onError 错误处理回调
 * @param onStats 接收到统计信息时的回调
 * @param model 使用的模型
 * @param abortController 用于中断请求的控制器
 */
export interface ChatRequestOptions {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  abortController?: AbortController;
  user_system_prompt?: string;
  useKb?: boolean;
}

export async function callAIChatStream(
  messages: ChatMessage[],
  onChunk: (chunk: string) => void,
  onError?: (error: string) => void,
  onStats?: (stats: {
    model: string;
    responseTime: string;
    totalTokens: number;
    promptTokens: number;
    completionTokens: number;
  }) => void,
  model: string = "Qwen/Qwen3-Next-80B-A3B-Instruct",
  options?: ChatRequestOptions
): Promise<void> {
  try {
    // 调用本地后端代理接口（流式）
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Connection: "keep-alive", // 告知服务器复用连接
        "Accept-Encoding": "gzip, deflate, br", // 支持压缩
      },
      body: JSON.stringify({
        messages,
        model,
        stream: true,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens ?? 10000, // 增加 max_tokens 以支持更长的回复
        top_p: options?.top_p ?? 0.9, // 核采样参数
        user_system_prompt: options?.user_system_prompt,
        use_kb: options?.useKb === true,
      }),
      signal: options?.abortController?.signal, // 添加中断信号
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    // 处理流式响应
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("无法获取响应流");
    }

    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            // 知识库引用事件
            if (parsed.kb && Array.isArray(parsed.kb)) {
              // 复用 onStats 通道：附加到 stats.kbRefs（懒分发，直到最终stats到来）
              // 这里直接抛给 onChunk 的上层由会话层处理更灵活，此处简单忽略，等待最终 stats 统一处理
              // 如果需要立即显示，也可在此触发 onStats({ ...kbRefs }) 的自定义扩展
              (window as any).__chatStudioKBRefsTemp = parsed.kb;
              break;
            }
            if (parsed.content) {
              onChunk(parsed.content);
            } else if (parsed.stats) {
              // 处理统计信息；如果之前收到过 kb 引用，合并进去
              const kbRefs = (window as any).__chatStudioKBRefsTemp;
              if (kbRefs && Array.isArray(kbRefs)) {
                parsed.stats.kbRefs = kbRefs;
                try { delete (window as any).__chatStudioKBRefsTemp; } catch {}
              }
              if (onStats) {
                onStats(parsed.stats);
              }
            } else if (parsed.error) {
              // 处理流式响应中的错误
              const errorMsg = handleStreamError(new Error(parsed.error));
              if (onError) {
                onError(errorMsg);
              } else {
                onChunk(errorMsg);
              }
              return;
            }
          } catch (e) {
            // 忽略解析错误，继续处理下一行
          }
        }
      }
    }
  } catch (error) {
    // 检查是否为中断错误
    if (error instanceof Error && error.name === "AbortError") {
      // 中断请求不需要显示错误信息
      return;
    }

    const errorMsg = handleStreamError(error);
    if (onError) {
      onError(errorMsg);
    } else {
      onChunk(errorMsg);
    }
  }
}
