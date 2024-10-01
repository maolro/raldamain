set "output_file=C:\Users\matia\Documents\GitHub\raldamain\output\output.md"

set "rootDirectory=C:\Users\matia\Documents\GitHub\raldamain\rules"

set "combDir=C:\Users\matia\Documents\GitHub\raldamain\combine.lua"

del "%output_file%"

for /r "%rootDirectory%" %%f in (*.md) do (
    echo Adding: %%f
	pandoc --from="%combDir%" %%f >> "%output_file%"
)