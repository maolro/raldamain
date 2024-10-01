@echo off

:: Define the output file name
set output_file=combined_document.docx

:: Initialize a temporary file list
set file_list=temp_file_list.txt

:: Define the root directory to search (change this to your specific path)
set "rootDirectory=C:\Users\matia\Documents\GitHub\raldamain\rules"

:: Create or clear the temporary file
if exist %fileList% (
	del %fileList%
)
type nul > %fileList%

:: Search for all .md files in the folder and subfolders, and add them to the file list
for /r "%rootDirectory%" %%f in (*.md) do (
    echo Adding: %%f
	echo %%f >> %fileList%
)

:: Combine the .md files using pandoc
if exist %file_list% (
    echo Combining files into %output_file% ...
    pandoc -s -o %output_file% @%file_list%
    echo Combined document saved as %output_file%.
) else (
    echo No .md files found in the folder system.
)

:: Clean up temporary files
del %file_list%
pause