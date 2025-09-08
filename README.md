# DMM To Garrys Mod Map Tool
I got no idea for a better name, suggest one!

## Funtion
As the name suggests, turns byond's DMM files (specifically the TGM format, the base format is not supported) into garry's mod maps (.vmf)
To be more specific, it generates cubes that correspond to turfs with the materials being the turf's type-path (minus the beginning /).
Objects, mobs and areas are currently not supported.

## Usage -- How to convert a map
1. Put a .dmm file into the same folder as 'Main.js'
2. Rename the .dmm file to "Map"
3. Run Main.js

After that a file named 'output.vmf' will appear, if it takes more than 5 seconds something probably went wrong