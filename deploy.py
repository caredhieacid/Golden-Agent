#!/usr/bin/env python3
"""
天枢项目部署脚本
自动部署到腾讯云服务器
"""

import paramiko
import os
import sys
from pathlib import Path

# 服务器配置
SERVER_HOST = "43.139.95.67"
SERVER_USER = "root"
SERVER_PASS = "F;6dp2Z]L~D/gwK"
SERVER_PORT = 22

# 项目路径
PROJECT_DIR = Path(__file__).parent
REMOTE_BASE = "/var/www/dubhe"

def create_ssh_client():
    """创建SSH连接"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"[*] 正在连接服务器 {SERVER_HOST}...")
    client.connect(SERVER_HOST, SERVER_PORT, SERVER_USER, SERVER_PASS)
    print("[+] 连接成功!")
    return client

def run_command(client, cmd, show_output=True):
    """执行远程命令"""
    if show_output:
        print(f"  $ {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd)
    exit_code = stdout.channel.recv_exit_status()
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    if show_output and out:
        # 过滤掉特殊字符避免编码问题
        safe_out = ''.join(c if ord(c) < 128 else '?' for c in out)
        print(safe_out.rstrip())
    if exit_code != 0 and err:
        safe_err = ''.join(c if ord(c) < 128 else '?' for c in err)
        print(f"  [!] Error: {safe_err.rstrip()}")
    return exit_code, out, err

def install_dependencies(client):
    """安装必要的依赖"""
    print("\n[*] 检查并安装依赖...")

    # 检查Node.js
    code, out, _ = run_command(client, "node -v", show_output=False)
    if code != 0:
        print("  [*] 安装 Node.js 20...")
        run_command(client, "curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -")
        run_command(client, "yum install -y nodejs")
    else:
        print(f"  [+] Node.js 已安装: {out.strip()}")

    # 检查PM2
    code, _, _ = run_command(client, "pm2 -v", show_output=False)
    if code != 0:
        print("  [*] 安装 PM2...")
        run_command(client, "npm install -g pm2")
    else:
        print("  [+] PM2 已安装")

    # 检查Nginx
    code, _, _ = run_command(client, "nginx -v", show_output=False)
    if code != 0:
        print("  [*] 安装 Nginx...")
        run_command(client, "yum install -y nginx")
    else:
        print("  [+] Nginx 已安装")

def setup_directories(client):
    """创建目录结构"""
    print("\n[*] 创建目录结构...")
    run_command(client, f"mkdir -p {REMOTE_BASE}/frontend")
    run_command(client, f"mkdir -p {REMOTE_BASE}/admin")
    run_command(client, f"mkdir -p {REMOTE_BASE}/server")
    run_command(client, f"mkdir -p {REMOTE_BASE}/logs")

def upload_files(client):
    """上传文件"""
    print("\n[*] 上传文件...")
    sftp = client.open_sftp()

    try:
        # 上传前端
        print("  [*] 上传前端 dist...")
        local_frontend = str(PROJECT_DIR / "frontend_vite" / "dist")
        upload_dir(sftp, local_frontend, f"{REMOTE_BASE}/frontend")

        # 上传后台管理
        print("  [*] 上传后台管理 dist...")
        local_admin = str(PROJECT_DIR / "admin" / "dist")
        upload_dir(sftp, local_admin, f"{REMOTE_BASE}/admin")

        # 上传后端
        print("  [*] 上传后端代码...")
        local_server = str(PROJECT_DIR / "server")
        # 上传package.json
        sftp.put(f"{local_server}/package.json", f"{REMOTE_BASE}/server/package.json")
        sftp.put(f"{local_server}/package-lock.json", f"{REMOTE_BASE}/server/package-lock.json")

        # 上传dist目录
        upload_dir(sftp, f"{local_server}/dist", f"{REMOTE_BASE}/server/dist")

        # 上传prisma目录
        upload_dir(sftp, f"{local_server}/prisma", f"{REMOTE_BASE}/server/prisma")

        print("  [+] 文件上传完成!")

    finally:
        sftp.close()

def upload_dir(sftp, local_dir, remote_dir):
    """递归上传目录"""
    import stat

    # 确保远程目录存在
    try:
        sftp.stat(remote_dir)
    except:
        sftp.mkdir(remote_dir)

    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"

        if os.path.isfile(local_path):
            sftp.put(local_path, remote_path)
            print(f"    - {item}")
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except:
                sftp.mkdir(remote_path)
            upload_dir(sftp, local_path, remote_path)

def install_server_deps(client):
    """安装服务器端依赖"""
    print("\n[*] 安装服务器依赖...")
    run_command(client, f"cd {REMOTE_BASE}/server && npm install --production")
    run_command(client, f"cd {REMOTE_BASE}/server && npx prisma generate")

def setup_nginx(client):
    """配置Nginx"""
    print("\n[*] 配置 Nginx...")

    nginx_conf = '''# 天枢项目 Nginx 配置
# 主站 - dubheproject.com
server {
    listen 80;
    server_name dubheproject.com www.dubheproject.com;
    return 301 https://www.dubheproject.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dubheproject.com www.dubheproject.com;

    # SSL证书路径 (稍后配置)
    # ssl_certificate /etc/nginx/ssl/dubheproject.com.pem;
    # ssl_certificate_key /etc/nginx/ssl/dubheproject.com.key;

    # 临时使用自签名证书
    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    # 前端
    location / {
        root /var/www/dubhe/frontend;
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache";
    }

    # API代理
    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # SSE支持
    location /api/sse {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_buffering off;
        proxy_cache off;
        chunked_transfer_encoding off;
    }
}

# 管理后台 - admin.dubheproject.com
server {
    listen 80;
    server_name admin.dubheproject.com;
    return 301 https://admin.dubheproject.com$request_uri;
}

server {
    listen 443 ssl http2;
    server_name admin.dubheproject.com;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    location / {
        root /var/www/dubhe/admin;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}

# CN域名
server {
    listen 80;
    server_name dubheproject.cn www.dubheproject.cn;
    return 301 https://www.dubheproject.cn$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dubheproject.cn www.dubheproject.cn;

    ssl_certificate /etc/nginx/ssl/selfsigned.crt;
    ssl_certificate_key /etc/nginx/ssl/selfsigned.key;

    location / {
        root /var/www/dubhe/frontend;
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

    # 写入配置
    run_command(client, f"mkdir -p /etc/nginx/ssl")

    # 使用heredoc写入配置
    cmd = f'''cat > /etc/nginx/conf.d/dubhe.conf << 'NGINX_EOF'
{nginx_conf}
NGINX_EOF'''
    run_command(client, cmd)

    # 生成自签名证书(临时)
    run_command(client, "openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/nginx/ssl/selfsigned.key -out /etc/nginx/ssl/selfsigned.crt -subj '/CN=dubheproject.com' 2>/dev/null || true")

    # 测试并重载nginx
    run_command(client, "nginx -t")
    run_command(client, "systemctl enable nginx")
    run_command(client, "systemctl restart nginx || nginx")

def setup_pm2(client):
    """配置PM2"""
    print("\n[*] 配置 PM2...")

    # 创建PM2配置文件
    pm2_config = '''module.exports = {
  apps: [{
    name: 'dubhe-server',
    cwd: '/var/www/dubhe/server',
    script: 'dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 8000
    },
    error_file: '/var/www/dubhe/logs/error.log',
    out_file: '/var/www/dubhe/logs/out.log',
    log_file: '/var/www/dubhe/logs/combined.log',
    time: true
  }]
};'''

    cmd = f'''cat > {REMOTE_BASE}/ecosystem.config.js << 'PM2_EOF'
{pm2_config}
PM2_EOF'''
    run_command(client, cmd)

    # 停止旧进程并启动新进程
    run_command(client, "pm2 delete dubhe-server 2>/dev/null || true")
    run_command(client, f"cd {REMOTE_BASE} && pm2 start ecosystem.config.js")
    run_command(client, "pm2 save")
    run_command(client, "pm2 startup | tail -1 | bash || true")

def init_database(client):
    """初始化数据库"""
    print("\n[*] 初始化数据库...")
    run_command(client, f"cd {REMOTE_BASE}/server && npx prisma db push")

def main():
    print("=" * 50)
    print("  天枢项目 - 自动部署脚本")
    print("=" * 50)

    client = create_ssh_client()

    try:
        install_dependencies(client)
        setup_directories(client)
        upload_files(client)
        install_server_deps(client)
        init_database(client)
        setup_nginx(client)
        setup_pm2(client)

        print("\n" + "=" * 50)
        print("  [+] 部署完成!")
        print("=" * 50)
        print("\n  访问地址:")
        print("  - 主站: https://www.dubheproject.com")
        print("  - 后台: https://admin.dubheproject.com")
        print("  - CN域名: https://www.dubheproject.cn")
        print("\n  管理员账号: admin / admin123")
        print("\n  常用命令:")
        print("  - pm2 status    # 查看服务状态")
        print("  - pm2 logs      # 查看日志")
        print("  - nginx -s reload  # 重载nginx")

    finally:
        client.close()
        print("\n[*] 连接已关闭")

if __name__ == "__main__":
    main()
