Write-Host "========================================"
Write-Host "智能桌面宠物-小白 安装包编译程序"
Write-Host "========================================"
Write-Host ""
Write-Host "正在编译安装程序，请稍候..."
Write-Host ""

$issPath = "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白安装程序-简化版.iss"
$outputDir = "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\安装包"

# 确保输出目录存在
if (-not (Test-Path $outputDir)) {
    New-Item -ItemType Directory -Path $outputDir | Out-Null
}

# 检查ISS文件是否存在
if (Test-Path $issPath) {
    Write-Host "找到安装脚本: $issPath"
    
    # 运行ISCC编译
    & "D:\安装源文件\Inno Setup 6\ISCC.exe" $issPath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================"
        Write-Host "编译成功！"
        Write-Host "========================================"
        Write-Host ""
        Write-Host "安装包已生成到："
        Write-Host $outputDir
        Write-Host ""
        
        # 显示生成的文件
        Get-ChildItem $outputDir | Where-Object { $_.Extension -eq ".exe" -or $_.Extension -eq ".msi" } | ForEach-Object {
            $sizeMB = [math]::Round($_.Length / 1MB, 2)
            Write-Host "  - $($_.Name) ($sizeMB MB)"
        }
    } else {
        Write-Host ""
        Write-Host "========================================"
        Write-Host "编译失败！退出代码: $LASTEXITCODE"
        Write-Host "========================================"
        Write-Host ""
        Write-Host "请检查.iss脚本文件是否有错误"
        Write-Host ""
    }
} else {
    Write-Host "未找到安装脚本: $issPath"
}

Write-Host ""
Write-Host "按回车键退出..."
Read-Host
