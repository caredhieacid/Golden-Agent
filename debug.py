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
    return out, err

print("[*] 检查PM2错误日志...")
out, err = run("pm2 logs dubhe-server --lines 30 --nostream 2>&1")
safe = ''.join(c if ord(c) < 128 else '?' for c in out)
print(safe)

print("\n[*] 检查服务器目录结构...")
out, err = run("ls -la /var/www/dubhe/server/")
print(out)

print("\n[*] 检查dist目录...")
out, err = run("ls -la /var/www/dubhe/server/dist/")
print(out)

print("\n[*] 尝试直接运行...")
out, err = run("cd /var/www/dubhe/server && node dist/index.js 2>&1 &")
print(out)
print(err)

client.close()
