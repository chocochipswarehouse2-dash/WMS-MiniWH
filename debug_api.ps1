Add-Type -AssemblyName System.Web
$body = 'data=' + [System.Web.HttpUtility]::UrlEncode('{"action":"getUsers"}')
$res = Invoke-WebRequest -Uri 'https://script.google.com/macros/s/AKfycbwzme5WXV7_sY87iCjz7RyVT8IV5q6T2stIGpqPbDph5UDBDCFH1VVoCRjgXZWB2e6k/exec' -Method POST -Body $body -ContentType 'application/x-www-form-urlencoded' -MaximumRedirection 10
$res.Content | Out-File -Encoding UTF8 'D:\WMS_api_debug.json'
Write-Output "Saved response to D:\WMS_api_debug.json"
