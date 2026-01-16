# Map indexes: How it works and how to move across it

I don't know how to write guides, but here's the basics of map indexes:

## How they work

To understand why its done as it is, ya gotta understand DMM
In the DMM format tiles can share the same symbol to place the exact same things across multiple places, sounds simple enough yeah?
map_indexes is a giant list of ints that points to lists that represent that specific tile, using it you can access areas[], objects[], unique_map_data[][LAYER] but NOT map_data[]

Example:
objects[map_indexes[1]] would give you all objects from the first tile, objects[map_indexes[2]] would give you a second tile
accessing it directly: objects[1] would give you all objects from the first symbol that was made

## How to navigate it

map_indexes is specifically made to go from the upper-left corner of the map, down and then onto the 2nd column. Repeating for the entire map. That lets us consistently navigate it.

To navigate it simply:
map_indexes[index - 1] would move you up a tile
map_indexes[index + 1] would move you down a tile
map_indexes[index - map_y] would move you left (because we're skipping the height of the map onto the previous index)
map_indexes[index + map_y] would move you right

Simple enough yeah? map_x is not used for much and shouldn't be used here.
