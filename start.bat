@echo off
chcp 65001 >nul 2>&1
echo ==========================================
echo       金策智显 GoldenPolicy Intel
echo         一键启动脚本 (Node.js Ver)
echo ==========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [1/3] 安装/检查后端依赖 (Server)...
cd server
if not exist node_modules (
    echo      首次运行，正在安装后端 npm 包...
    call npm install
) else (
    echo      后端 node_modules 已存在，跳过安装
)
cd ..

echo [2/3] 安装/检查前端依赖 (Frontend)...
cd frontend_vite
if not exist node_modules (
    echo      首次运行，正在安装前端 npm 包...
    call npm install
) else (
    echo      前端 node_modules 已存在，跳过安装
)
cd ..

echo [3/3] 启动服务...

:: 启动后端 (Node.js) - Port 8000
start "Golden Agent Server (Node.js)" cmd /k "cd /d %~dp0server && npm run dev"

:: 启动前端 (Next.js) - Port 3000
start "Golden Agent Frontend" cmd /k "cd /d %~dp0frontend_vite && npm run dev"

echo.
echo 正在等待服务启动 (10秒)...
timeout /t 10 >nul

:: 触发数据同步 (POST)
echo 正在初始化数据同步...
curl -X POST -s http://localhost:8000/api/congress/sync >nul 2>&1
curl -X POST -s http://localhost:8000/api/gold/sync >nul 2>&1

echo.
echo ==========================================
echo  ✅ 服务已启动！
echo  前端页面: http://localhost:3000
echo  后端接口: http://localhost:8000
echo ==========================================
echo.
echo 正在打开浏览器...
start http://localhost:3000

echo.
echo 按任意键关闭此引导窗口（服务窗口将保持运行）
pause >nul
