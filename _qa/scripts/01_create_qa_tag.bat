@echo off
REM ========================================================
REM  QA 完成标签 - v1.0.0-qa-ready
REM  用法: Smart-Desktop-Pet-White\_qa\scripts\01_create_qa_tag.bat
REM  执行前提: 当前工作区干净 (git status clean)
REM ========================================================
setlocal
cd /d "%~dp0\..\..\.."
echo [STEP 1/3] 当前状态：
git status --short
echo.
echo [STEP 2/3] 创建 annotated tag：v1.0.0-qa-ready
git tag -a v1.0.0-qa-ready -m "QA v1.0.0 released: 0 TS errors, 0 ESLint errors, 14 QA docs generated, Playground 25+ games optimized"
echo.
echo [STEP 3/3] 推送到远端（请先 gh auth login / git remote -v 确认）
echo    如需推送，请执行：git push origin v1.0.0-qa-ready
echo.
REM 默认不 push，仅本地打 tag，避免误操作。
pause
