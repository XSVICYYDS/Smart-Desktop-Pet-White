@echo off
chcp 65001 > nul
echo ======================================================
echo   小白桌面宠物 - 打包助手
echo ======================================================
echo.

setlocal enabledelayedexpansion

cd /d "%~dp0小白-源代码"

echo [1/5] 查找Python...
echo.

set PYTHON_CMD=
set PYTHON_FOUND=0

:: 尝试常见的Python安装位置
echo   检查Python安装...

:: 尝试直接使用python
python --version >nul 2>&1
if !errorlevel! equ 0 (
    set PYTHON_CMD=python
    echo   ✓ 使用命令: python
    set PYTHON_FOUND=1
    goto :found_python
)

:: 尝试py命令
py --version >nul 2>&1
if !errorlevel! equ 0 (
    set PYTHON_CMD=py
    echo   ✓ 使用命令: py
    set PYTHON_FOUND=1
    goto :found_python
)

:: 尝试常见安装路径
for %%p in (
    "C:\Python311\python.exe"
    "C:\Python310\python.exe"
    "C:\Python39\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python311\python.exe"
    "%LOCALAPPDATA%\Programs\Python\Python310\python.exe"
) do (
    if exist %%p (
        set PYTHON_CMD=%%p
        echo   ✓ 使用路径: %%p
        set PYTHON_FOUND=1
        goto :found_python
    )
)

if !PYTHON_FOUND! equ 0 (
    echo   ✗ 未找到Python
    echo.
    echo   请手动找到Python的安装路径，
    echo   然后在这个脚本中编辑PYTHON_CMD变量
    pause
    exit /b 1
)

:found_python
echo.

echo [2/5] 检查图标文件...
if exist "C:\Users\XS\Desktop\小白.ico" (
    echo   ✓ 图标文件已找到
) else (
    echo   ✗ 图标文件未找到
    pause
    exit /b 1
)
echo.

echo [3/5] 显示版本信息...
%PYTHON_CMD% --version
echo.

echo [4/5] 检查依赖...
%PYTHON_CMD% -m pip list | findstr /i "pyinstaller" >nul
if !errorlevel! equ 0 (
    echo   ✓ PyInstaller已安装
) else (
    echo   ⚠ PyInstaller未找到，尝试安装...
    %PYTHON_CMD% -m pip install pyinstaller
)
echo.

echo [5/5] 开始打包...
echo.
%PYTHON_CMD% 打包脚本.py

if !errorlevel! equ 0 (
    echo.
    echo ======================================================
    echo   ✓ 打包成功！
    echo ======================================================
    echo.
    echo 打包结果位于:
    echo   %~dp0小白-源代码\dist\
    echo.
    echo 安装程序位于:
    echo   %~dp0安装包\
    echo.
    echo ======================================================
) else (
    echo.
    echo ======================================================
    echo   ✗ 打包失败
    echo ======================================================
    echo.
    echo 请检查错误信息
)

echo.
pause
