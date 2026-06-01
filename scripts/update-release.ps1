param(
  [string]$Release
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$scriptDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptDirectory

if (-not $Release) {
  $Release = Get-Date -Format "yyyyMMdd-HHmm"
}

$utf8NoBom = New-Object System.Text.UTF8Encoding $false
$htmlFiles = @("index.html", "luftblasen.html")

foreach ($fileName in $htmlFiles) {
  $path = Join-Path $repoRoot $fileName
  $content = [System.IO.File]::ReadAllText($path)
  $content = [regex]::Replace($content, '\?v=[^"''\s>]+', "?v=$Release")
  $content = [regex]::Replace(
    $content,
    '(<span data-version>)[^<]*(</span>)',
    "`${1}$Release`${2}"
  )
  [System.IO.File]::WriteAllText($path, $content, $utf8NoBom)
}

Write-Host "Updated Luftblasen release to $Release"
