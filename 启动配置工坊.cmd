@echo off
chcp 65001 >nul
cd /d "%~dp0"
title ONE ATELIER - AMG ONE
if not exist node_modules (
  echo 正在安装项目依赖...
  call npm install
  if errorlevel 1 exit /b 1
)
echo.
echo ONE ATELIER 配置工坊
echo 浏览器打开 http://127.0.0.1:5180/
echo 保持此窗口开启，按 Ctrl+C 停止服务。
echo.
call npm run dev
