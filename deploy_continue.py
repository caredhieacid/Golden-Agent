#!/usr/bin/env python3
"""继续部署脚本"""

import paramiko
import sys

SERVER_HOST = "43.139.95.67"
SERVER_USER = "root"
SERVER_PASS = "F;6dp2Z]L~D/gwK"
REMOTE_BASE = "/var/www/dubhe"

def run_cmd(client, cmd):
    print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if out:
        safe = ''.join(c if ord(c) < 128 else '?' for c in out)
        if safe.strip():
            print(f"    {safe.strip()[:200]}")
    return exit_code

def main():
    print("[*] 连接服务器...")
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    client.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASS)
    print("[+] 已连接")

    try:
        # 初始化数据库
        print("\n[*] 初始化数据库...")
        run_cmd(client, f"cd {REMOTE_BASE}/server && npx prisma db push --accept-data-loss")

        # 创建默认管理员
        print("\n[*] 创建默认管理员...")
        run_cmd(client, f"cd {REMOTE_BASE}/server && node dist/scripts/create-admin.js 2>/dev/null || echo 'Admin may already exist'")

        # 配置Nginx
        print("\n[*] 配置Nginx...")
        run_cmd(client, "mkdir -p /etc/nginx/ssl")

        # 生成自签名证书
        run_cmd(client, "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/selfsigned.key -out /etc/nginx/ssl/selfsigned.crt -subj '/CN=dubheproject.com' 2>/dev/null || echo 'SSL cert exists'")

        # 写入nginx配置
        nginx_conf = '''
# 主站
server {
    listen 80;
    server_name dubheproject.com www.dubheproject.com dubheproject.cn www.dubheproject.cn;

    location / {
        root /var/www/dubhe/frontend;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/sse {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
    }
}

# 管理后台
server {
    listen 80;
    server_name admin.dubheproject.com admin.dubheproject.cn;

    location / {
        root /var/www/dubhe/admin;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
'''
        cmd = f'''cat > /etc/nginx/conf.d/dubhe.conf << 'EOF'
{nginx_conf}
EOF'''
        run_cmd(client, cmd)

        # 删除默认配置
        run_cmd(client, "rm -f /etc/nginx/conf.d/default.conf")
        run_cmd(client, "rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true")

        # 测试并重启nginx
        run_cmd(client, "nginx -t")
        run_cmd(client, "systemctl enable nginx")
        run_cmd(client, "systemctl restart nginx || nginx")

        # 配置PM2
        print("\n[*] 配置PM2...")

        pm2_config = '''module.exports = {
  apps: [{
    name: 'dubhe-server',
    cwd: '/var/www/dubhe/server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    env: { NODE_ENV: 'production', PORT: 8000 },
    error_file: '/var/www/dubhe/logs/error.log',
    out_file: '/var/www/dubhe/logs/out.log',
    time: true
  }]
};'''

        cmd = f'''cat > {REMOTE_BASE}/ecosystem.config.js << 'EOF'
{pm2_config}
EOF'''
        run_cmd(client, cmd)

        run_cmd(client, "pm2 delete dubhe-server 2>/dev/null || true")
        run_cmd(client, f"cd {REMOTE_BASE} && pm2 start ecosystem.config.js")
        run_cmd(client, "pm2 save")

        # 设置PM2开机自启
        code, startup_cmd = run_cmd(client, "pm2 startup | grep 'sudo' | head -1")
        if startup_cmd.strip():
            run_cmd(client, startup_cmd.strip())

        # 检查状态
        print("\n[*] 检查服务状态...")
        run_cmd(client, "pm2 status")
        run_cmd(client, "curl -s http://localhost:8000/api/health | head -c 100 || echo 'API not responding'")

        print("\n" + "=" * 50)
        print("  [+] 部署完成!")
        print("=" * 50)
        print("\n  访问地址:")
        print("  - 主站: http://www.dubheproject.com")
        print("  - 后台: http://admin.dubheproject.com")
        print("  - CN域名: http://www.dubheproject.cn")
        print("\n  管理员: admin / admin123")
        print("\n  常用命令:")
        print("  - pm2 status        # 查看状态")
        print("  - pm2 logs          # 查看日志")
        print("  - pm2 restart all   # 重启服务")

    finally:
        client.close()

if __name__ == "__main__":
    main()
