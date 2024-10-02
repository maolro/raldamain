# Define the source and destination directories
$sourceDir = "C:\Users\matia\Documents\GitHub\raldamain\rules"
$destinationDir = "C:\Users\matia\Documents\GitHub\raldamain\output"

# Create the destination directory if it doesn't exist
if (-not (Test-Path -Path $destinationDir)) {
    New-Item -ItemType Directory -Path $destinationDir
}

# Get all .md files recursively in the source directory
$mdFiles = Get-ChildItem -Path $sourceDir -Recurse -Filter *.md

foreach ($file in $mdFiles) {
    # Define the output PDF file path
    $outputFile = Join-Path -Path $destinationDir -ChildPath ($file.BaseName + ".pdf")
    
    # Convert Markdown to PDF using Pandoc
    pandoc $file.FullName -o $outputFile

    if ($?) {
        Write-Host "Converted: $($file.FullName) to $outputFile"
    } else {
        Write-Host "Failed to convert: $($file.FullName)"
    }
}