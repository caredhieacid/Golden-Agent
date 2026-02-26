@echo off
echo ========================================
echo        天枢 DubheProject 启动脚本
echo ========================================
echo.

echo [步骤1] 检查Node.js...
node -v
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js
    pause
    exit /b 1
)
echo.

echo [步骤2] 启动后端服务...
cd server
start "后端服务" cmd /k "npm run dev"
cd ..
echo.

echo [步骤3] 等待3秒...
timeout /t 3 /nobreak >nul
echo.

echo [步骤4] 启动前端服务...
cd frontend_vite
start "前端服务" cmd /k "npm run dev"
cd ..
echo.

echo [步骤5] 启动管理后台...
cd admin
if not exist node_modules (
    echo      首次运行，安装管理后台依赖...
    call npm install
)
start "管理后台" cmd /k "npm run dev"
cd ..
echo.

echo ========================================
echo  服务已启动!
echo  前端: http://localhost:3000
echo  后端: http://localhost:8000
echo  管理后台: http://localhost:3001
echo  默认管理员: admin / admin123
echo ========================================
echo.
echo 按任意键打开前端...
pause >nul
start http://localhost:3000
echo.
echo 启动完成! 可以关闭此窗口。
pause
