#!/usr/bin/env python3
import paramiko

SERVER_HOST = "43.139.95.67"
SERVER_USER = "root"
SERVER_PASS = "F;6dp2Z]L~D/gwK"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASS)

def run(cmd):
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    code = stdout.channel.recv_exit_status()
    return code, out, err

print("=" * 50)
print("  部署状态检查")
print("=" * 50)

# PM2状态
print("\n[*] PM2 状态:")
code, out, err = run("pm2 status")
safe = ''.join(c if ord(c) < 128 else '?' for c in out)
print(safe)

# API健康检查
print("\n[*] API 健康检查:")
code, out, err = run("curl -s http://localhost:8000/api/health")
safe = ''.join(c if ord(c) < 128 else '?' for c in out)
print(safe[:300] if safe else "No response")

# Nginx状态
print("\n[*] Nginx 状态:")
code, out, err = run("systemctl status nginx | head -5")
safe = ''.join(c if ord(c) < 128 else '?' for c in out)
print(safe)

# 端口监听
print("\n[*] 端口监听:")
code, out, err = run("netstat -tlnp | grep -E ':(80|8000)'")
safe = ''.join(c if ord(c) < 128 else '?' for c in out)
print(safe)

# 设置PM2开机自启
print("\n[*] 设置开机自启:")
code, out, err = run("pm2 startup systemd -u root --hp /root 2>&1 | tail -1")
if code == 0:
    startup_cmd = out.strip()
    if startup_cmd and 'systemctl' in startup_cmd:
        run(startup_cmd)
        print("  [+] 已配置开机自启")
    else:
        print("  [+] PM2 startup configured")

print("\n" + "=" * 50)
print("  部署完成!")
print("=" * 50)
print("""
  访问地址:
  - 主站: http://www.dubheproject.com
  - 后台: http://admin.dubheproject.com
  - CN域名: http://www.dubheproject.cn

  管理员账号: admin / admin123

  常用命令:
  - pm2 status        # 查看服务状态
  - pm2 logs          # 查看日志
  - pm2 restart all   # 重启服务
  - nginx -s reload   # 重载nginx
""")

client.close()
