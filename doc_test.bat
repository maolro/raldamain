set "outputTxt=C:\Users\matia\Documents\GitHub\raldamain\output\output.txt"

set "rootDirectory=C:\Users\matia\Documents\GitHub\raldamain\rules"

set "combDir=C:\Users\matia\Documents\GitHub\raldamain\combine.lua"

set "output_file=C:\Users\matia\Documents\GitHub\raldamain\output\output.md"

del "%outputTxt%"

for /r "%rootDirectory%" %%f in (*.md) do (
    echo %%f >> "%outputTxt%"
)

set files=cat %outputTxt%

pandoc --from="%combDir%" -s -o %output_file% %files%
