# After CDP clicks "Load unpacked", drive the Windows folder dialog to extension/.
param(
  [string]$ExtPath = (Join-Path $PSScriptRoot "..\extension"),
  [int]$WaitMs = 8000
)

$ExtPath = (Resolve-Path $ExtPath).Path
Add-Type @"
using System;
using System.Runtime.InteropServices;
using System.Text;
public class ExtDlg {
  public delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr l);
  [DllImport("user32.dll")] public static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern int GetWindowText(IntPtr hWnd, StringBuilder sb, int max);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
  [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
  [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr hWnd, int X, int Y, int nWidth, int nHeight, bool repaint);
  [DllImport("user32.dll")] public static extern IntPtr FindWindowEx(IntPtr parent, IntPtr child, string cls, string win);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern IntPtr SendMessage(IntPtr hWnd, uint Msg, IntPtr wParam, string lParam);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr hWnd, EnumProc cb, IntPtr l);
  public const uint WM_SETTEXT = 0x000C;
  public const uint BM_CLICK = 0x00F5;
}
"@

$deadline = [DateTime]::UtcNow.AddMilliseconds($WaitMs)
$dlg = [IntPtr]::Zero
while ([DateTime]::UtcNow -lt $deadline) {
  [ExtDlg]::EnumWindows({
    param($h, $l)
    if (-not [ExtDlg]::IsWindowVisible($h)) { return $true }
    $cls = New-Object System.Text.StringBuilder 256
    [void][ExtDlg]::GetClassName($h, $cls, 256)
    if ($cls.ToString() -ne "#32770") { return $true }
    $title = New-Object System.Text.StringBuilder 256
    [void][ExtDlg]::GetWindowText($h, $title, 256)
    $t = $title.ToString()
    if ($t -match "Select|Load|Browse|Folder|Extension|Open") {
      $script:dlg = $h
      return $false
    }
    # Chrome often uses empty/generic title — take first visible #32770 after click
    if ([string]::IsNullOrWhiteSpace($t) -or $t -match "Chrome") {
      $script:dlg = $h
      return $false
    }
    return $true
  }, [IntPtr]::Zero)
  if ($dlg -ne [IntPtr]::Zero) { break }
  Start-Sleep -Milliseconds 250
}

if ($dlg -eq [IntPtr]::Zero) {
  Write-Error "No folder dialog found"
  exit 1
}

[void][ExtDlg]::ShowWindow($dlg, 9)
[void][ExtDlg]::MoveWindow($dlg, 80, 80, 900, 600, $true)
[void][ExtDlg]::SetForegroundWindow($dlg)
Start-Sleep -Milliseconds 400

# Address/filename edit is often ComboBoxEx32 -> Edit
$edit = [IntPtr]::Zero
[ExtDlg]::EnumChildWindows($dlg, {
  param($h, $l)
  $cls = New-Object System.Text.StringBuilder 256
  [void][ExtDlg]::GetClassName($h, $cls, 256)
  $c = $cls.ToString()
  if ($c -eq "Edit" -or $c -eq "AppControlHost") {
    $script:edit = $h
  }
  return $true
}, [IntPtr]::Zero)

if ($edit -eq [IntPtr]::Zero) {
  # Fallback: ComboBoxEx32 child Edit
  $combo = [ExtDlg]::FindWindowEx($dlg, [IntPtr]::Zero, "ComboBoxEx32", $null)
  if ($combo -ne [IntPtr]::Zero) {
    $edit = [ExtDlg]::FindWindowEx($combo, [IntPtr]::Zero, "Edit", $null)
  }
}

if ($edit -eq [IntPtr]::Zero) {
  Write-Error "No path Edit in dialog"
  exit 1
}

[void][ExtDlg]::SendMessage($edit, [ExtDlg]::WM_SETTEXT, [IntPtr]::Zero, $ExtPath)
Start-Sleep -Milliseconds 300

# Click Select Folder / Open — prefer button by text via UI Automation-ish: Enum child Button
$clicked = $false
[ExtDlg]::EnumChildWindows($dlg, {
  param($h, $l)
  $cls = New-Object System.Text.StringBuilder 64
  [void][ExtDlg]::GetClassName($h, $cls, 64)
  if ($cls.ToString() -ne "Button") { return $true }
  $title = New-Object System.Text.StringBuilder 128
  [void][ExtDlg]::GetWindowText($h, $title, 128)
  $t = $title.ToString()
  if ($t -match "Select Folder|Select|Open") {
    [void][ExtDlg]::SendMessage($h, [ExtDlg]::BM_CLICK, [IntPtr]::Zero, $null)
    $script:clicked = $true
    return $false
  }
  return $true
}, [IntPtr]::Zero)

# Alt+S sometimes selects Select Folder
if (-not $clicked) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.SendKeys]::SendWait("%s")
  $clicked = $true
}

Write-Output ("OK path=" + $ExtPath + " clicked=" + $clicked)
