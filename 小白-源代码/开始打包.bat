@echo off
chcp 65001 > nul
echo ======================================================
echo   小白桌面宠物 - 打包脚本
echo ======================================================
echo.

cd /d "%~dp0"

echo [1/4] 检查图标文件...
if exist "C:\Users\XS\Desktop\小白.ico" (
    echo   ✓ 图标文件找到
) else (
    echo   ✗ 图标文件未找到
    pause
    exit /b 1
)

echo.
echo [2/4] 检查Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo   尝试使用py命令...
    py --version >nul 2>&1
    if errorlevel 1 (
        echo   ✗ 未找到Python
        echo   请确保Python已正确安装并添加到PATH
        pause
        exit /b 1
    )
    set PYTHON_CMD=py
) else (
    set PYTHON_CMD=python
)

echo   ✓ Python已找到
%PYTHON_CMD% --version

echo.
echo [3/4] 运行打包脚本...
%PYTHON_CMD% 打包脚本.py

if errorlevel 1 (
    echo.
    echo   ✗ 打包失败
    pause
    exit /b 1
)

echo.
echo ======================================================
echo   打包完成！
echo ======================================================
echo.
echo 打包结果位于:
echo   %~dp0dist\智能桌面宠物-小白\
echo.
echo 安装程序位于:
echo   %~dp0安装包\
echo.
echo ======================================================
pause
