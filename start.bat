@echo off
setlocal EnableExtensions
chcp 65001 >nul 2>&1
title 天枢 DubheProject - 启动脚本
echo ==========================================
echo       天枢 DubheProject
echo         一键启动脚本 (Node.js Ver)
echo ==========================================
echo.

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    echo.
    pause
    exit /b 1
)

:: 检查 Python
set "PYTHON_AVAILABLE=0"
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 Python，AI 推荐服务将不可用
) else (
    set "PYTHON_AVAILABLE=1"
)

echo [1/4] 安装/检查后端依赖 (Server)...
cd server
if not exist node_modules (
    echo      首次运行，正在安装后端 npm 包...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        cd ..
        pause
        exit /b 1
    )
) else (
    echo      后端 node_modules 已存在，跳过安装
)
echo      正在初始化数据库 (Prisma db push)...
call npm run db:push
if %errorlevel% neq 0 (
    echo [警告] db:push 有问题，但继续尝试启动...
)
cd ..

echo [2/4] 安装/检查前端依赖 (Frontend)...
cd frontend_vite
if not exist node_modules (
    echo      首次运行，正在安装前端 npm 包...
    call npm install
    if %errorlevel% neq 0 (
        echo [错误] npm install 失败
        cd ..
        pause
        exit /b 1
    )
) else (
    echo      前端 node_modules 已存在，跳过安装
)
cd ..

:: Python AI 服务依赖 (可选)
if /i "%PYTHON_AVAILABLE%"=="1" (
    echo [3/4] 安装/检查 AI 服务依赖 - Python...
    if exist ai-trader-service (
        cd ai-trader-service
        if not exist venv (
            echo      创建 Python 虚拟环境...
            python -m venv venv
        )
        echo      检查 Python 依赖...
        call venv\Scripts\pip install -q fastapi uvicorn pydantic python-dotenv openai httpx pandas numpy python-dateutil pytz 2>nul
        cd ..
    ) else (
        echo      ai-trader-service 目录不存在，跳过
    )
) else (
    echo [3/4] 跳过 AI 服务依赖 - Python 未安装
)

echo [4/4] 启动服务...

:: 启动后端 (Node.js) - Port 8000
echo      启动后端服务 (端口 8000)...
start "Golden Agent Server" cmd /k "cd /d %~dp0server && npm run dev"

:: 等待后端启动
echo      等待后端启动 (3秒)...
timeout /t 3 >nul

:: 启动前端 (Vite) - Port 3000
echo      启动前端服务 (端口 3000)...
start "Golden Agent Frontend" cmd /k "cd /d %~dp0frontend_vite && npm run dev"

:: 启动 Python AI 服务 - Port 8001 (可选)
if /i "%PYTHON_AVAILABLE%"=="1" (
    if exist ai-trader-service (
        echo      启动 AI 服务 - 端口 8001...
        start "Golden Agent AI Service" cmd /k "cd /d %~dp0ai-trader-service && venv\Scripts\python main.py"
    )
)

echo.
echo 正在等待服务启动 (10秒)...
timeout /t 10 >nul

:: 检查服务状态
echo 正在检查服务状态...
curl -s http://localhost:8000/api/health >nul 2>&1
if %errorlevel%==0 (
    echo      后端服务: 正常
) else (
    echo      后端服务: 启动中或异常
)

echo.
echo ==========================================
echo  服务启动完成！
echo  前端页面: http://localhost:3000
echo  后端接口: http://localhost:8000
echo ==========================================
echo.
echo 正在打开浏览器...
timeout /t 2 >nul
start http://localhost:3000

echo.
echo 提示: 关闭此窗口不会影响服务运行
echo       要停止服务，请关闭对应的命令行窗口
echo.
pause
