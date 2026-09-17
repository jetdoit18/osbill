# Lightweight Static HTTP Server for Windows PowerShell
param (
    [int]$Port = 8080
)

$listener = New-Object System.Net.HttpListener
$prefix = "http://localhost:$Port/"

try {
    $listener.Prefixes.Add($prefix)
    $listener.Start()
    Write-Host "========================================================" -ForegroundColor Cyan
    Write-Host " Freight Billing Tracker Web Server is LIVE!" -ForegroundColor Green
    Write-Host " URL: $prefix" -ForegroundColor Yellow
    Write-Host " Directory: $PSScriptRoot" -ForegroundColor Gray
    Write-Host "========================================================" -ForegroundColor Cyan
} catch {
    Write-Error "Failed to start listener on port $Port : $_"
    exit 1
}

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".ico"  = "image/x-icon"
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            $rawPath = $request.Url.LocalPath
            if ($rawPath -eq "/" -or [string]::IsNullOrWhiteSpace($rawPath)) {
                $rawPath = "/index.html"
            }

            # Remove leading slashes and map to disk
            $relativeFile = $rawPath.TrimStart('/').Replace('/', [System.IO.Path]::DirectorySeparatorChar)
            $fullPath = Join-Path $PSScriptRoot $relativeFile

            if (Test-Path -PathType Leaf $fullPath) {
                $ext = [System.IO.Path]::GetExtension($fullPath).ToLower()
                $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { "application/octet-stream" }
                
                $response.ContentType = $contentType
                $response.AddHeader("Cache-Control", "no-cache")
                $response.AddHeader("Access-Control-Allow-Origin", "*")

                $bytes = [System.IO.File]::ReadAllBytes($fullPath)
                $response.ContentLength64 = $bytes.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($bytes, 0, $bytes.Length)
                }
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: $rawPath")
                $response.ContentType = "text/plain; charset=utf-8"
                $response.ContentLength64 = $msg.Length
                if ($request.HttpMethod -ne "HEAD") {
                    $response.OutputStream.Write($msg, 0, $msg.Length)
                }
            }
            $response.Close()
        } catch {
            Write-Warning "Request handling warning: $_"
        }
    }
} finally {
    if ($listener.IsListening) {
        $listener.Stop()
    }
    $listener.Close()
}
