/**
 * SSE (Server-Sent Events) 广播器
 * 
 * 维护所有连接的客户端，当数据更新时广播事件
 */
import { Response } from "express";

type SSEClient = {
    id: string;
    res: Response;
};

class SSEBroadcaster {
    private clients: SSEClient[] = [];

    /** 添加新的 SSE 客户端连接 */
    addClient(res: Response): string {
        const id = `sse_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        this.clients.push({ id, res });
        console.log(`[SSE] 客户端连接: ${id} (当前 ${this.clients.length} 个)`);
        return id;
    }

    /** 移除断开的客户端 */
    removeClient(id: string): void {
        this.clients = this.clients.filter(c => c.id !== id);
        console.log(`[SSE] 客户端断开: ${id} (剩余 ${this.clients.length} 个)`);
    }

    /** 向所有客户端广播数据更新 */
    broadcast(eventType: string, data: any): void {
        const payload = JSON.stringify({ type: eventType, data, timestamp: new Date().toISOString() });
        const msg = `event: ${eventType}\ndata: ${payload}\n\n`;

        let dead: string[] = [];
        for (const client of this.clients) {
            try {
                client.res.write(msg);
            } catch {
                dead.push(client.id);
            }
        }
        // 清理断开的连接
        if (dead.length > 0) {
            this.clients = this.clients.filter(c => !dead.includes(c.id));
        }

        if (this.clients.length > 0) {
            console.log(`[SSE] 广播 ${eventType} → ${this.clients.length} 个客户端`);
        }
    }

    get clientCount(): number {
        return this.clients.length;
    }
}

// 全局单例
export const broadcaster = new SSEBroadcaster();
