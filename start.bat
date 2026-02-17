@echo off
chcp 65001 >nul 2>&1
echo ==========================================
echo       金策智显 GoldPolicy Intel
echo         一键启动脚本
echo ==========================================
echo.

:: 检查 Python
where python >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Python，请先安装 Python 3.9+
    pause
    exit /b 1
)

:: 检查 Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [1/5] 安装后端依赖...
cd backend
pip install -r requirements.txt -q >nul 2>&1
if %errorlevel% neq 0 (
    echo [警告] 后端依赖安装失败，尝试继续...
)
cd ..

echo [2/5] 安装前端依赖...
cd frontend
if not exist node_modules (
    echo      首次运行，正在安装 npm 包（可能需要数分钟）...
    call npm install
) else (
    echo      node_modules 已存在，跳过安装
)
cd ..

echo [3/5] 启动后端服务 (Port: 8000)...
start "Golden Agent Backend" cmd /k "cd /d %~dp0backend && python run.py"

echo [4/5] 启动前端服务 (Port: 3000)...
start "Golden Agent Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo [5/5] 等待服务初始化 (8秒)...
timeout /t 8 >nul

:: 首次运行时同步国会交易数据
echo 正在同步国会交易数据...
curl -s http://localhost:8000/api/congress/sync >nul 2>&1
if %errorlevel% neq 0 (
    echo [提示] 数据同步跳过（后端可能尚未就绪，稍后可手动访问 /api/congress/sync）
) else (
    echo 数据同步完成！
)

echo.
echo 正在打开浏览器...
start http://localhost:3000

echo.
echo ==========================================
echo  项目已启动！
echo  前端页面: http://localhost:3000
echo  后端文档: http://localhost:8000/docs
echo  API健康: http://localhost:8000/api/health
echo ==========================================
echo.
echo 按任意键关闭此窗口（不会影响运行中的服务）
pause >nul
