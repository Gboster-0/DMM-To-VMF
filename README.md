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

Turf directions are currently NOT supported, they will all face north upon the map being created

I tested the map generation on Metastation from Iristation, the program *might* break on other maps, but it should work with any 1-z level map just fine. If it errors out then tell me what one it broke on.

## Usage -- How to convert a map
1. Put a .dmm file into the same folder as 'Main.js'
2. Rename the .dmm file to "Map"
3. Run Main.js

After that a file named 'output.vmf' will appear, if it takes more than 5 seconds something probably went wrong

4. Launch the hammer editor (comes pre-installed with games that use it)
5. Open up the 'output.vmf' file
6. Click "File >> Run Map"
Suggested settings:
* Run BSP: Normal, No water
* Run VIS: Normal
* Run RAD: Faster (Baking the lights takes forever, save yourself the trouble)
