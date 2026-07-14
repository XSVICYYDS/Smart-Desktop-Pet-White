$innoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
$scriptPath = "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白安装程序.iss"

if (Test-Path $innoSetupPath) {
    Write-Host "找到 Inno Setup 编译器"
    Write-Host "开始编译安装程序..."
    
    & $innoSetupPath $scriptPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "编译成功！"
        Get-ChildItem "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\安装包" | Format-Table Name, Length
    } else {
        Write-Host "编译失败，退出代码: $LASTEXITCODE"
    }
} else {
    Write-Host "未找到 Inno Setup 编译器"
    Write-Host "请检查安装路径或手动打开 Inno Setup"
}
