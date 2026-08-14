"""通过 cmd 绕过 PowerShell 执行 npm 命令的辅助脚本。"""
import subprocess
import sys

if __name__ == "__main__":
    args = sys.argv[1:]
    cmd = ["cmd.exe", "/c", "npm", *args]
    print(f"[RUN] {' '.join(cmd)}")
    proc = subprocess.run(cmd, shell=False)
    sys.exit(proc.returncode)
