$here = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $here

Write-Host "================================================"
Write-Host "  Foundational C# - กำลังเปิดหนังสือเรียน"
Write-Host "================================================"
Write-Host ""

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) { $pythonCmd = Get-Command py -ErrorAction SilentlyContinue }

if (-not $pythonCmd) {
    Write-Host "[ผิดพลาด] ไม่พบ Python ในเครื่องนี้" -ForegroundColor Red
    Write-Host ""
    Write-Host "กรุณาติดตั้ง Python จาก https://www.python.org/downloads/ ก่อน"
    Write-Host '(ตอนติดตั้ง อย่าลืมติ๊ก "Add python.exe to PATH")'
    Write-Host ""
    Read-Host "กด Enter เพื่อปิดหน้าต่างนี้"
    exit 1
}

Write-Host "พบ Python ที่: $($pythonCmd.Source)"
Write-Host "กำลังเริ่มเซิร์ฟเวอร์ในเครื่อง (ไม่ต้องใช้อินเทอร์เน็ต)..."
Write-Host "เบราว์เซอร์จะเปิดให้อัตโนมัติใน 2 วินาที"
Write-Host ""
Write-Host "เมื่ออ่านเสร็จแล้ว ปิดหน้าต่างนี้ได้เลย (กด Ctrl+C แล้วตอบ Y)"
Write-Host "================================================"
Write-Host ""

Start-Sleep -Seconds 1
Start-Process "http://localhost:8420/index.html"

& $pythonCmd.Source -m http.server 8420
