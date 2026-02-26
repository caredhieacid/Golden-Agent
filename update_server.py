#!/usr/bin/env python3
import paramiko
import os
from pathlib import Path

SERVER_HOST = "43.139.95.67"
SERVER_USER = "root"
SERVER_PASS = "F;6dp2Z]L~D/gwK"
REMOTE_BASE = "/var/www/dubhe/server"
PROJECT_DIR = Path(__file__).parent / "server"

def upload_dir(sftp, local_dir, remote_dir):
    try:
        sftp.stat(remote_dir)
    except:
        sftp.mkdir(remote_dir)

    for item in os.listdir(local_dir):
        local_path = os.path.join(local_dir, item)
        remote_path = f"{remote_dir}/{item}"

        if os.path.isfile(local_path):
            sftp.put(local_path, remote_path)
            print(f"  - {item}")
        elif os.path.isdir(local_path):
            try:
                sftp.stat(remote_path)
            except:
                sftp.mkdir(remote_path)
            upload_dir(sftp, local_path, remote_path)

print("[*] 连接服务器...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(SERVER_HOST, 22, SERVER_USER, SERVER_PASS)
print("[+] 已连接")

sftp = client.open_sftp()

try:
    # 上传新的package.json和package-lock.json
    print("\n[*] 上传package文件...")
    sftp.put(str(PROJECT_DIR / "package.json"), f"{REMOTE_BASE}/package.json")
    sftp.put(str(PROJECT_DIR / "package-lock.json"), f"{REMOTE_BASE}/package-lock.json")
    print("  [+] Done")

    # 上传新的dist
    print("\n[*] 上传dist目录...")
    # 先删除旧的
    stdin, stdout, stderr = client.exec_command(f"rm -rf {REMOTE_BASE}/dist")
    stdout.channel.recv_exit_status()
    sftp.mkdir(f"{REMOTE_BASE}/dist")
    upload_dir(sftp, str(PROJECT_DIR / "dist"), f"{REMOTE_BASE}/dist")

    # 重新安装依赖
    print("\n[*] 安装依赖...")
    stdin, stdout, stderr = client.exec_command(f"cd {REMOTE_BASE} && npm install --production")
    stdout.channel.recv_exit_status()

    # 重启PM2
    print("\n[*] 重启服务...")
    stdin, stdout, stderr = client.exec_command("pm2 restart dubhe-server")
    code = stdout.channel.recv_exit_status()

    # 检查状态
    import time
    time.sleep(2)
    print("\n[*] 检查状态...")
    stdin, stdout, stderr = client.exec_command("pm2 status")
    out = stdout.read().decode('utf-8', errors='replace')
    safe = ''.join(c if ord(c) < 128 else '?' for c in out)
    print(safe)

    print("\n[*] 测试API...")
    stdin, stdout, stderr = client.exec_command("curl -s http://localhost:8000/api/health | head -c 200")
    out = stdout.read().decode('utf-8', errors='replace')
    print(out if out else "No response")

finally:
    sftp.close()
    client.close()
    print("\n[*] 完成")
