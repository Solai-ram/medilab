<#
.SYNOPSIS
    Generates a deterministic SHA-256 hardware fingerprint for device-bound commercial licensing.
.DESCRIPTION
    Queries Motherboard UUID, Primary Disk Serial Number, and CPU Processor ID using Win32 CIM instances.
#>

$ErrorActionPreference = "SilentlyContinue"

$uuid = (Get-CimInstance Win32_ComputerSystemProduct).UUID
$disk = (Get-CimInstance Win32_DiskDrive | Select-Object -First 1).SerialNumber
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1).ProcessorId

$rawString = ("$uuid" + "###" + "$disk" + "###" + "$cpu").Trim().ToUpper()

$sha256 = [System.Security.Cryptography.SHA256]::Create()
$bytes = [System.Text.Encoding]::UTF8.GetBytes($rawString)
$hashBytes = $sha256.ComputeHash($bytes)
$fingerprint = -join ($hashBytes | ForEach-Object { "{0:x2}" -f $_ })

Write-Host "======================================================"
Write-Host " MEDILAB DESKTOP HARDWARE FINGERPRINT (WINDOWS)"
Write-Host "======================================================"
Write-Host "Motherboard UUID : $uuid"
Write-Host "Disk Serial      : $disk"
Write-Host "CPU Processor ID : $cpu"
Write-Host "------------------------------------------------------"
Write-Host "Device SHA-256   : SHA256:$fingerprint"
Write-Host "======================================================"
