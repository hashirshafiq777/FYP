# LegalDocReader - one-step setup and start for Windows.
# Run: powershell -ExecutionPolicy Bypass -File .start-app.ps1   Safe to run every time:
# steps that are already done are skipped.
#
#   -CheckOnly   report what is ready and what is missing, change nothing, start nothing

param([switch]$CheckOnly)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$backend = Join-Path $root "backend"
$frontend = Join-Path $root "frontend"
$envFile = Join-Path $backend ".env"
$venvPython = Join-Path $backend ".venv\Scripts\python.exe"

function Write-Step($text) { Write-Host ""; Write-Host "==> $text" -ForegroundColor Cyan }
function Write-Ok($text) { Write-Host "    OK   $text" -ForegroundColor Green }
function Write-Todo($text) { Write-Host "    TODO $text" -ForegroundColor Yellow }
function Stop-WithMessage($text) {
    Write-Host ""
    Write-Host "RUK GAYA: $text" -ForegroundColor Red
    Write-Host ""
    if (-not $CheckOnly) { Read-Host "Enter daba kar band karein" | Out-Null }
    exit 1
}

# ------------------------------------------------------------ 1. programs
Write-Step "Zaroori programs"
foreach ($tool in @("python", "node", "npm")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        if ($tool -eq "python") { $hint = "Python 3.11+ install karein: https://www.python.org/downloads/ (install mein 'Add python.exe to PATH' tick karein)" }
        else { $hint = "Node.js LTS install karein: https://nodejs.org/" }
        Stop-WithMessage "'$tool' nahi mila. $hint"
    }
}
$pythonVersion = (& python -c "import sys; print('%d.%d' % sys.version_info[:2])")
if ([version]$pythonVersion -lt [version]"3.11") {
    Stop-WithMessage "Python $pythonVersion purana hai. Python 3.11 ya naya install karein."
}
Write-Ok "Python $pythonVersion, Node $(& node --version)"

# ------------------------------------------------------------ 2. backend\.env
Write-Step "Settings file (backend\.env)"
if (-not (Test-Path $envFile)) {
    Stop-WithMessage "backend\.env nahi mili. Yeh file GitHub par nahi hoti (is mein database ka link hai). Purane computer se 'backend\.env' copy kar ke is folder mein rakhein: $backend"
}
Write-Ok "backend\.env maujood hai"

$envText = Get-Content $envFile -Raw
$hasGroqKey = $envText -match "(?m)^\s*GROQ_API_KEY\s*=\s*gsk_\S+"
if ($hasGroqKey) {
    Write-Ok "Groq API key set hai"
}
elseif ($CheckOnly) {
    Write-Todo "Groq API key set nahi hai (chatbot aur tasveer parhne ke liye zaroori)"
}
else {
    Write-Host ""
    Write-Host "    Groq ki free API key chahiye (chatbot aur tasveer/NIC parhne ke liye)." -ForegroundColor Yellow
    Write-Host "    1. https://console.groq.com/keys kholein aur Google se sign in karein"
    Write-Host "    2. 'Create API Key' dabayein aur key copy karein (gsk_ se shuru hoti hai)"
    $key = (Read-Host "    Key yahan paste kar ke Enter dabayein (abhi nahi hai to khali chhor kar Enter)").Trim()
    if ($key -match "^gsk_\S+$") {
        # Drop any old/placeholder line, then add the new one.
        $lines = @(Get-Content $envFile | Where-Object { $_ -notmatch "^\s*GROQ_API_KEY\s*=" })
        $lines += "GROQ_API_KEY=$key"
        [System.IO.File]::WriteAllLines($envFile, $lines)
        Write-Ok "Key backend\.env mein save ho gayi"
    }
    else {
        Write-Todo "Key nahi di. App chalegi, lekin chatbot jawab nahi dega aur tasveerein nahi parhi jayengi."
    }
}

# ------------------------------------------------------------ 3. backend packages
Write-Step "Backend (Python packages)"
if (-not (Test-Path $venvPython)) {
    if ($CheckOnly) { Write-Todo "Python environment banana hai" }
    else {
        Write-Host "    Python environment ban raha hai..."
        & python -m venv (Join-Path $backend ".venv")
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Python environment nahi ban saka." }
    }
}
if (Test-Path $venvPython) {
    if ($CheckOnly) { Write-Ok "Python environment maujood hai" }
    else {
        Write-Host "    Packages install ho rahe hain (pehli dafa chand minute lagte hain)..."
        & $venvPython -m pip install --quiet --disable-pip-version-check -r (Join-Path $backend "requirements.txt")
        if ($LASTEXITCODE -ne 0) { Stop-WithMessage "Python packages install nahi ho sake. Internet check karein aur dobara chalayein." }
        Write-Ok "Backend packages tayyar"
    }
}

# ------------------------------------------------------------ 4. law index
Write-Step "Qanoon ka knowledge base (index)"
$chunks = 0
if (Test-Path $venvPython) {
    Push-Location $backend
    $countText = (& $venvPython -c "from app.ai import vector_store as v; print(v.count(v.LAW_COLLECTION))" 2>$null | Select-Object -Last 1)
    Pop-Location
    [int]::TryParse("$countText", [ref]$chunks) | Out-Null
}
if ($chunks -ge 1000) {
    Write-Ok "Index maujood hai ($chunks hisse)"
}
elseif ($CheckOnly) {
    Write-Todo "Index banana hai (abhi $chunks hisse; taqreeban 8 minute lagenge)"
}
else {
    Write-Host "    Index ban raha hai. Pehli dafa taqreeban 8 minute lagte hain aur internet chahiye. Window band na karein..."
    Push-Location $backend
    & $venvPython -m scripts.build_index --reset
    $buildExit = $LASTEXITCODE
    Pop-Location
    if ($buildExit -ne 0) { Stop-WithMessage "Index nahi ban saka. Internet check karein aur dobara chalayein." }
    Write-Ok "Index ban gaya"
}

# ------------------------------------------------------------ 5. frontend packages
Write-Step "Frontend (Node packages)"
if (Test-Path (Join-Path $frontend "node_modules")) {
    Write-Ok "Frontend packages maujood hain"
}
elseif ($CheckOnly) {
    Write-Todo "Frontend packages install karne hain"
}
else {
    Write-Host "    npm install chal raha hai (pehli dafa chand minute)..."
    Push-Location $frontend
    & npm install
    $npmExit = $LASTEXITCODE
    Pop-Location
    if ($npmExit -ne 0) { Stop-WithMessage "npm install fail ho gaya. Internet check karein aur dobara chalayein." }
    Write-Ok "Frontend packages tayyar"
}

if ($CheckOnly) {
    Write-Host ""
    Write-Host "Check mukammal. Kuch badla nahi gaya, kuch start nahi hua." -ForegroundColor Cyan
    exit 0
}

# ------------------------------------------------------------ 6. start both servers
Write-Step "App start ho rahi hai"
function Test-Port($port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect("127.0.0.1", $port); return $true } catch { return $false } finally { $client.Close() }
}

if (Test-Port 8000) { Write-Ok "Backend pehle se chal raha hai (port 8000)" }
else {
    Start-Process powershell -WorkingDirectory $backend -ArgumentList @(
        "-NoExit", "-NoProfile", "-Command",
        "`$host.UI.RawUI.WindowTitle = 'LegalDocReader BACKEND (band na karein)'; & '.\.venv\Scripts\python.exe' -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
    )
}
if (Test-Port 5173) { Write-Ok "Frontend pehle se chal raha hai (port 5173)" }
else {
    Start-Process powershell -WorkingDirectory $frontend -ArgumentList @(
        "-NoExit", "-NoProfile", "-Command",
        "`$host.UI.RawUI.WindowTitle = 'LegalDocReader FRONTEND (band na karein)'; npm run dev"
    )
}

Write-Host "    Servers ke tayyar hone ka intezar..."
$ready = $false
for ($i = 0; $i -lt 90; $i++) {
    if ((Test-Port 8000) -and (Test-Port 5173)) { $ready = $true; break }
    Start-Sleep -Seconds 1
}
if (-not $ready) {
    Stop-WithMessage "Server 90 second mein start nahi hue. Jo do nayi windows khuli hain un mein laal error parhein."
}

Start-Process "http://localhost:5173"
Write-Host ""
Write-Host "CHAL GAYA: browser mein http://localhost:5173 khul gaya hai." -ForegroundColor Green
Write-Host "Do nayi windows (BACKEND aur FRONTEND) khuli rehne dein. Band karne ke liye unhein band kar dein."
Write-Host ""
Read-Host "Yeh window band karne ke liye Enter dabayein" | Out-Null
