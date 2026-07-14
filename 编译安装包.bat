@echo off
echo ========================================
echo 智能桌面宠物-小白 安装包编译程序
echo ========================================
echo.
echo 正在编译安装程序，请稍候...
echo.

"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白安装程序-简化版.iss"

if %errorlevel%==0 (
    echo.
    echo ========================================
    echo 编译成功！
    echo ========================================
    echo.
    echo 安装包已生成到：
    echo C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\安装包\
    echo.
) else (
    echo.
    echo ========================================
    echo 编译失败！
    echo ========================================
    echo.
    echo 请检查.iss脚本文件是否有错误
    echo.
)

pause
