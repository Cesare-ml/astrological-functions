# Explicit manual Windows launcher; no Git checkout/pull, npm install, kernel download,
# deployment, deletion or overwrite. Source SHA must be copied from the PR page.
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[0-9a-fA-F]{40}$')]
    [string]$ExpectedCommit,

    [string]$EphemerisCheckout,
    [string]$BaselineReceipt,
    [string]$OutputDirectory,

    # SHA-256 of the owner's original 17 Nov 2026 UTF-16LE/BOM receipt.
    [ValidatePattern('^[0-9a-fA-F]{64}$')]
    [string]$ExpectedBaselineSha256 = '002b567327cdb77f73c5f4c3ca223cd51cb8af4a952dccced3f1f779e7cd1577',

    [switch]$CheckOnly
)

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$runner = Join-Path $PSScriptRoot 'run-native-house-latitude-regression.mjs'

if ([string]::IsNullOrWhiteSpace($EphemerisCheckout)) {
    $EphemerisCheckout = Join-Path (Split-Path -Parent $repoRoot) 'VirgoStars-Ephemeris'
}
if ([string]::IsNullOrWhiteSpace($BaselineReceipt)) {
    $BaselineReceipt = Join-Path $repoRoot 'house-latitudes-local.json'
}
if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
    $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
    $nonce = [guid]::NewGuid().ToString('N').Substring(0, 8)
    $OutputDirectory = Join-Path $repoRoot (Join-Path 'tmp' "house-regression-$stamp-$nonce")
}

$EphemerisCheckout = (Resolve-Path -LiteralPath $EphemerisCheckout -ErrorAction Stop).Path
$BaselineReceipt = (Resolve-Path -LiteralPath $BaselineReceipt -ErrorAction Stop).Path
$OutputDirectory = [System.IO.Path]::GetFullPath($OutputDirectory)

if (-not (Test-Path -LiteralPath $runner -PathType Leaf)) {
    throw "Missing local runner: $runner. Select the astrological-functions PR #225 branch."
}
Get-Command node -ErrorAction Stop | Out-Null
Get-Command git -ErrorAction Stop | Out-Null
if (-not $CheckOnly) {
    Get-Command npm -ErrorAction Stop | Out-Null
    Get-Command cargo -ErrorAction Stop | Out-Null
}

$arguments = @(
    $runner,
    '--checkout', $EphemerisCheckout,
    '--expected-commit', $ExpectedCommit.ToLowerInvariant(),
    '--baseline', $BaselineReceipt,
    '--expected-baseline-sha256', $ExpectedBaselineSha256.ToLowerInvariant(),
    '--out-dir', $OutputDirectory,
    '--kernel-context', 'HOUSE_ANGLES_NO_KERNEL'
)
if ($CheckOnly) {
    $arguments += '--check-only'
    Write-Host 'Checking pinned native source and original receipt (no build or writes)...'
} else {
    Write-Host 'Starting opt-in real native build and full 161-case regression...'
}

& node @arguments
$nativeExit = $LASTEXITCODE
if (-not $CheckOnly -and ($nativeExit -eq 0 -or $nativeExit -eq 2)) {
    $bundle = Join-Path $OutputDirectory 'house-regression-bundle.json'
    if (-not (Test-Path -LiteralPath $bundle -PathType Leaf)) {
        throw "Runner completed but portable evidence is missing: $bundle"
    }
    Write-Host "Attach only this file for review: $bundle"
    if ($nativeExit -eq 2) {
        Write-Warning 'Valid evidence saved; one or more methods/angles still need manual review.'
    }
}
exit $nativeExit
