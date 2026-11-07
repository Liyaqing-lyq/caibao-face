$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$runner = $null
foreach ($candidate in @('py', 'python', 'python3')) {
    $command = Get-Command $candidate -ErrorAction SilentlyContinue
    if ($command) {
        try {
            & $command.Source -c "import sys; assert sys.version_info >= (3, 8)" 2>$null
            if ($LASTEXITCODE -eq 0) { $runner = $command.Source; break }
        } catch { }
    }
}
if (-not $runner) {
    throw 'Python 3.8+ is required. Install Python with Add python.exe to PATH, then run this script again.'
}
& $runner (Join-Path $PSScriptRoot 'serve.py') --open
