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

Also by the way the script assumes the following:
- That the map format is in the TGM format
> If unfulfilled: Won't work, at all

- That every exit out of the inside of the map is eighter a wall or has a space tile next to it
* (in other words, doors of a whiteship touching the edge of the map is a no-go)
> If unfulfilled: You get a leak, see 2 spaces below. Fairly easy to fix in-editor by just patching the holes, or expand the map by 1 tile in both directions in StrongDMM

- The map is smaller than like 350x350 (at 96 hammer units per turf setting) (i didn't limit-test this one)
> If unfulfilled: Most likelly deletes the upper/bottom skybox since they go out of bounds and you get a leak, see above

- That there isn't a turf with transparency next to a space tile (like reinforced glass floors under windows to space)
> If unfulfilled: Will cause a map leak, and that in turn will get your a horribly long RAD compile time + way more resource usage

## Usage -- How to convert a map
1. Put a .dmm file into the same folder as 'Main.js'
2. Rename the .dmm file to "Map"
3. Run Main.js

After that a file named 'output.vmf' will appear, if it takes more than 5 seconds something probably went wrong

4. Launch the hammer editor (comes pre-installed with games that use it)
5. Open up the 'output.vmf' file (if it tells you that a few invalid solids exist, just tell it to erase them and tell me the map)
* Psst, if you want a map preview/good hammer screenshot then all the skyboxes are grouped in 1 visgroup thats easy to disable
* Do remember to enable it when doing the next step, else the hammer editor will take your balls
6. Click "File >> Run Map"
* (just a suggestion, before actual compiling try to do it with RAD OFF and auto-run also being off, if the map has leaks as indicated by a giant **** leaked **** at the top of the log compile it without RAD and suffer the lack of lighting.)
Suggested settings:
* Run BSP: Normal, No water
* Run VIS: Normal
* Run RAD: Faster (Baking the lights takes forever, save yourself the trouble)
