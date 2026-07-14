Option Explicit

Dim oShell, oFSO
Dim scriptPath, innoPath
Dim outputDir, oFolder, oFiles, oFile
Dim fileSize, sizeStr

Set oShell = CreateObject("WScript.Shell")
Set oFSO = CreateObject("Scripting.FileSystemObject")

scriptPath = "C:\Users\XS\Desktop\shangzhi809_xushen_xiaobai\小白安装程序-简化版.iss"

If oFSO.FileExists(scriptPath) Then
    WScript.Echo "Found installation script"
    WScript.Echo "Starting Inno Setup compiler..."
    
    innoPath = Chr(34) & "C:\Users\Public\Desktop\Inno Setup Compiler.lnk" & Chr(34) & " /cc " & Chr(34) & scriptPath & Chr(34)
    oShell.Run innoPath, 1, True
    
    WScript.Echo "Compilation completed!"
    
    outputDir = "C:\Users\XS\Desktop\shangzhi809_xushen_xiaobai\安装包"
    If oFSO.FolderExists(outputDir) Then
        Set oFolder = oFSO.GetFolder(outputDir)
        Set oFiles = oFolder.Files
        
        If oFiles.Count > 0 Then
            WScript.Echo "Generated files:"
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
            WScript.Echo "No installer files found"
        End If
    End If
Else
    WScript.Echo "Installation script not found"
    WScript.Echo "Please check the path"
End If

WScript.Echo "Press Enter to exit..."
WScript.StdIn.ReadLine
