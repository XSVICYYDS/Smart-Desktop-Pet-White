Option Explicit

Dim oShell, oFSO
Dim scriptPath, innoPath
Dim outputDir, oFolder, oFiles, oFile
Dim fileSize, sizeStr

Set oShell = CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")

scriptPath = "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\小白安装程序-简化版.iss"

If oFSO.FileExists(scriptPath) Then
    WScript.Echo "找到安装脚本"
    WScript.Echo "正在启动 Inno Setup 编译器..."
    
    innoPath = Chr(34) & "C:\Users\Public\Desktop\Inno Setup Compiler.lnk" & Chr(34) & " /cc " & Chr(34) & scriptPath & Chr(34)
    oShell.Run innoPath, 1, True
    
    WScript.Echo "编译完成！"
    
    outputDir = "C:\Users\XS\Desktop\尚志中学809班徐慎智能桌面宠物小白\安装包"
    If oFSO.FolderExists(outputDir) Then
        Set oFolder = oFSO.GetFolder(outputDir)
        Set oFiles = oFolder.Files
        
        If oFiles.Count > 0 Then
            WScript.Echo "生成的文件:"
            For Each oFile In oFiles
                If InStr(1, LCase(oFile.Name), ".exe") > 0 Or InStr(1, LCase(oFile.Name), ".msi") > 0 Then
                    fileSize = CLng(oFile.Size)
                    If fileSize >= 1048576 Then
                        sizeStr = FormatNumber(fileSize / 1048576, 2) & " MB"
                    ElseIf fileSize >= 1024 Then
                        sizeStr = FormatNumber(fileSize / 1024, 2) & " KB"
                    Else
                        sizeStr = fileSize & " bytes"
                    End If
                    WScript.Echo "  - " & oFile.Name & " (" & sizeStr & ")"
                End If
            Next
        Else
            WScript.Echo "未找到安装包文件"
        End If
    End If
Else
    WScript.Echo "未找到安装脚本"
End If

WScript.Echo "按回车键退出..."
WScript.StdIn.ReadLine
