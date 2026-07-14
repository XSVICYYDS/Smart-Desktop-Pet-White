@echo off
chcp 65001 > nul
echo ======================================================
echo   小白桌面宠物 - 快速启动
echo ======================================================
echo.

cd /d "%~dp0小白-源代码"

echo 正在启动小白...
echo.

python main.py 2>nul
if errorlevel 1 (
    py main.py
)

pause
