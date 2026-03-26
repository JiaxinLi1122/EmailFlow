@echo off
title EmailFlow AI
cd /d "%~dp0"
echo.
echo  EmailFlow AI 启动中...
echo  浏览器将自动打开 http://localhost:3000
echo  关闭此窗口即可停止服务
echo.
start http://localhost:3000
npm run dev
