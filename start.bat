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

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 未找到 Python，AI 推荐服务将不可用
    set PYTHON_AVAILABLE=0
) else (
    set PYTHON_AVAILABLE=1
)

echo [1/4] 安装/检查后端依赖 (Server)...
cd server
if not exist node_modules (
    echo      首次运行，正在安装后端 npm 包...
    call npm install
) else (
    echo      后端 node_modules 已存在，跳过安装
)
echo      正在初始化数据库 (Prisma db push)...
call npm run db:push
cd ..

echo [2/4] 安装/检查前端依赖 (Frontend)...
cd frontend_vite
if not exist node_modules (
    echo      首次运行，正在安装前端 npm 包...
    call npm install
) else (
    echo      前端 node_modules 已存在，跳过安装
)
cd ..

:: Python AI 服务依赖
if %PYTHON_AVAILABLE%==1 (
    echo [3/4] 安装/检查 AI 服务依赖 (Python)...
    cd ai-trader-service
    if not exist venv (
        echo      创建 Python 虚拟环境...
        python -m venv venv
    )
    echo      检查 Python 依赖...
    call venv\Scripts\pip install -q fastapi uvicorn pydantic python-dotenv openai httpx pandas numpy python-dateutil pytz 2>nul
    cd ..
) else (
    echo [3/4] 跳过 AI 服务依赖 (Python 未安装)
)

echo [4/4] 启动服务...

:: 启动后端 (Node.js) - Port 8000
start "Golden Agent Server (Node.js)" cmd /k "cd /d %~dp0server && npm run dev"

:: 启动前端 (Vite) - Port 3000
start "Golden Agent Frontend" cmd /k "cd /d %~dp0frontend_vite && npm run dev"

:: 启动 Python AI 服务 - Port 8001
if %PYTHON_AVAILABLE%==1 (
    start "Golden Agent AI Service (Python)" cmd /k "cd /d %~dp0ai-trader-service && venv\Scripts\python main.py"
)

echo.
echo 正在等待服务启动 (15秒)...
timeout /t 15 >nul

:: 触发数据同步 (POST)
echo 正在初始化数据同步...
curl -X POST -s http://localhost:8000/api/congress/sync >nul 2>&1
curl -X POST -s http://localhost:8000/api/gold/sync >nul 2>&1

echo.
echo ==========================================
echo  ✅ 服务已启动！
echo  前端页面: http://localhost:3000
echo  后端接口: http://localhost:8000
if %PYTHON_AVAILABLE%==1 (
echo  AI 服务:  http://localhost:8001
)
echo ==========================================
echo.
echo 正在打开浏览器...
start http://localhost:3000

echo.
echo 按任意键关闭此引导窗口（服务窗口将保持运行）
pause >nul
