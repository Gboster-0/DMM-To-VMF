# DMM To Garrys Mod Map Tool
I got no idea for a better name, suggest one!

## Funtion
As the name suggests, turns byond's DMM files (specifically the TGM format, the base format is not supported) into garry's mod maps (.vmf)
To be more specific, it generates cubes that correspond to turfs with the materials being the turf's type-path (minus the beginning /).
Objects*, mobs and areas are currently not supported.
* Lights are supported, nothing else

## Requirements
1. Node.js
2. Hammer editor

## Info before converting a map
You might want to go into 'textures_mirror' and follow the README there to install the textures first
Without installing the textures you will just see all textures as white in the editor, and all black/pink in-game

This does not convert multi-z maps, maybe in the future but for now its too complex due to leaks and such.

Maps that were tested and will have the best results are in the 'textures_mirror' README file

## Usage -- How to convert a map
1. Put a .dmm file into the same folder as 'Main.js'
2. Rename the .dmm file to "Map"
3. Run Main.js

After that a file named 'output.vmf' will appear, if it takes more than 5 seconds something probably went wrong

4. Launch the hammer editor (comes pre-installed with games that use it)
5. Open up the 'output.vmf' file (if it tells you that a few invalid solids exist, just tell it to erase them and tell me the map)
* Psst, if you want a map preview/good screenshot then all the skyboxes are grouped in 1 visgroup thats easy to disable
* Do remember to enable it when doing the next step, else the hammer editor will take your balls
6. Click "File >> Run Map"
* (just a suggestion, before actual compiling try to do it with RAD OFF and auto-run also being off, if the map has leaks as indicated by a giant **** leaked **** at the top of the log there's no point compiling it.)
Suggested settings:
* Run BSP: Normal, No water
* Run VIS: Normal
* Run RAD: Faster (Baking the lights takes forever, save yourself the trouble)
