const fs = require('fs')
const window_layer = 0 // Remember to update 'unique_map_data' with new arrays anytime you add more of these.
const firelock_layer = 1

/// Options

// The filename of the map we're trying to compile, needs to be in the same folder as Main.js
const map_name = 'Map.dmm'

// How wide/tall the blocks should be made (in hammer units)
// WARNING: if you mess with this eighter: 1. disable decals in performance options
// or 2. regex replace every decal .vmt file's '$decalscale' number with whatever 'texture_wrapping' gives you
// Else the decals will have too small/big dimensions
// Default = 96
const block_size = 96

/// Performance Options
// All of them were set as-is considered best, both true and false options on them are supported though

// Should the turfs (like corners or half-colored tiles) keep their directions?
// Turning this off allows for much greater vertex merging but destroys some details
// Default = true
const keep_turf_directions = true

// Should decals be created?
// Turning this off allows for better in-game performance and MUCH better hammer map loading times.
// Default = true
const create_decals = true

// The detail of light, smaller numbers = more detailed lighting.
// Touching this is not recommended, really.
// Default = 16
const lightmap_scale = 16

// End of Options

const half_block_size = (block_size * 0.5) // Used for entity displacement
const texture_wrapping = (half_block_size * 0.0625) // Used for properly scaling 32x32 textures into our block size
const large_pixel_6 = (texture_wrapping * 6)
const large_pixel_7 = (texture_wrapping * 7)

// These don't really matter to us, its whatever
let content = "versioninfo\n\
{\n\
	\"editorversion\" \"400\"\n\
	\"editorbuild\" \"10422\"\n\
	\"mapversion\" \"1\"\n\
	\"formatversion\" \"100\"\n\
	\"prefab\" \"0\"\n\
}\n\
visgroups\n\
{\n\
	visgroup\n\
	{\n\
		\"name\" \"skybox\"\n\
		\"visgroupid\" \"10\"\n\
		\"color\" \"166 143 108\"\n\
	}\n\
}\n\
viewsettings\n\
{\n\
	\"bSnapToGrid\" \"1\"\n\
	\"bShowGrid\" \"1\"\n\
	\"bShowLogicalGrid\" \"0\"\n\
	\"nGridSpacing\" \"64\"\n\
	\"bShow3DGrid\" \"0\"\n\
}\n\
world\n\
{\n\
	\"id\" \"1\"\n\
	\"mapversion\" \"1\"\n\
	\"classname\" \"worldspawn\"\n\
	\"skyname\" \"sky_borealis01\"\n\
	\"maxpropscreenwidth\" \"-1\"\n\
	\"detailvbsp\" \"detail.vbsp\"\n\
	\"detailmaterial\" \"detail/detailsprites\"\n\
"

const end = "\
cameras\n\
{\n\
	\"activecamera\" \"-1\"\n\
}\n\
cordons\n\
{\n\
	\"active\" \"0\"\n\
}\n\
"

let entity_string = ""

let total_decals = 0
let created_decals = 0
// ID's of all objects we create, ID 1 is reserved for the world parameters
let object_id = 2
// Offsets to make the world centered and not off to the side
let map_offset_x = 0
let map_offset_y = 0

// Yes, this entire thing is indented in it
fs.readFile(map_name, 'utf8', (err, file_data) => {
	if(err){
		console.error(err)
		return
	}
	log_time("Map fetched and program starting")

	// Integer, Length of the map in the X direction
	const map_x = file_data.match(/\(\d+,/g).length // How many tiles are in the X direction

	// Integer, specific length of symbols ("aaa" >> 3)
	const symbol_length = file_data.match(/".+"/)[0].length - 2 // Get how long the symbols are

	if(keep_turf_directions){
		// Lets us properly assign directional materials later on by adding numbers into our turfs
		// 2 is the default direction and thus excluded from this, despite some people using dir=2, ew
		// Also a reminder (ordered in DMI appearance), 6 = south-east, 10 = south-west, 5 = north-east, 9 = north-west
		//>> TODO: Make a tool to kill turn halves that have unnecessary directions in DMM files
		const numbers_to_replace = [1, 4, 5, 6, 8, 9, 10]
		for(let index = 0; index < numbers_to_replace.length; index++){
			const number = numbers_to_replace[index]
			file_data = file_data.replace(new RegExp("\{\n.dir = " + number + "\n.\}", "g"), number)
		}
	}

	// Simple replacements
	const textures_to_replace = [
		"/airless",
		"/turf/open/floor/sandy_dirt", // Monkestation still uses this instead of the misc one
	]
	const replacement_textures = [
		"",
		"/turf/open/misc/sandy_dirt",
	]
	for(let index = 0; index < textures_to_replace.length; index++){
		file_data = file_data.replace(new RegExp(textures_to_replace[index], "g"), replacement_textures[index])
	}

	file_data = file_data.replace(/\/obj\/effect\/landmark\/start\/hangover.+/g, "") // Alcohol isn't real (we want normal spawnpoints)

	// Very expensive array made out of a regex of every single symbol with its associated objects 'aaa" = (\n...)"'
	const object_chunks = file_data.match(new RegExp(".{" + symbol_length + "}\".+\\((.|\n)+?\\w\\)\\s(\"|\n)", "g"))

	let symbols = []
	let areas = []
	let turfs = []
	let objects = []
	for(let index = 0; index < object_chunks.length; index++){
		let entities = object_chunks[index].match(/\/.+/g) // God's tiniest regex
		// These two will always be last, and second to last respectivelly
		let area = entities[entities.length - 1]
		let turf = entities[entities.length - 2]
		// Remember, our index captured all comma's, JSON starts and symbol endings, cut them off
		areas.push(area.slice(0, area.length - 1))
		turfs.push(turf.slice(0, turf.length - 1))
		let found_objects = []
		for(let index = 0; index < entities.length - 2; index++){
			let object = entities[index]
			found_objects.push(object.slice(0, object.length-1))
		}
		objects.push(found_objects)
		symbols.push(object_chunks[index].slice(0, symbol_length))
	}
	const skybox_symbol = symbols.length
	symbols.push("skybox")
	areas.push("0")
	// This is a dummy value for the texture merger to also do our work for us
	// The editor skybox texture is in the make_skybox() proc
	// The final skybox texture is in the 'world' section in the var 'skyname', very first few lines of our 'content'
	turfs.push("0")
	objects.push([])

	// Line below is fairly expensive, replace
	file_data = file_data.match(/\(1,1,1\)(.|\n)+/g)[0] // Cuts EVERYTHING below the map definition
	file_data = file_data.replace(/\(.+\s/g, '')

	log_time("Finished regexing")

	for(let index = 0; index < symbols.length; index++){
		file_data = file_data.replace(new RegExp(symbols[index], "g"), index)
	}
	/// Indexes that point to proper turf/objects
	let map_data = file_data.match(/\d+/g)
	/// A secondary map filled with turfs to be merged that cannot replace proper turfs
	let unique_map_data = [[], []]
	for(let index = 0; index < unique_map_data.length; index++){
		unique_map_data[index].fill(null, 0, map_data.length)
	}

	const map_indexes = map_data.slice() // map_data is optimized by the turf cutter/merger, this saves the current state

	const map_y = (map_data.length / map_x)

	// Weird calculation huh? We need to be on an even number in map_x and map_y else textures don't get wrapped properly
	map_offset_x = ((Math.floor(map_x * 0.5) * 2) * half_block_size)
	map_offset_y = ((Math.floor(map_y * 0.5) * 2) * half_block_size)

	log_time("Finished symbol assignment")

	for(let index = 0; index < map_data.length; index++){ // Prepare everything extra we want to merge
		if(map_data[index] == null){continue}
		const local_objects = objects[map_indexes[index]]
		for(let object_index = 0; object_index < local_objects.length; object_index++){
			let object = local_objects[object_index]
			if(object.slice(0, 36) == "/obj/effect/spawner/structure/window"){
				unique_map_data[window_layer][index] = object
				continue
			}
			if(object.slice(0, 28) == "/obj/machinery/door/firedoor"){
				unique_map_data[firelock_layer][index] = object
			}
		}
	}

	log_time("Starting turf cleanup")

	/**
	 * Alright, we made a lot of trash data from all of that so lets start cleaning it up
	 * 1. Cut turfs we won't want to make at all alongside shortening those who don't have any difference
	 * 2. Merge any turfs we can together to save on storage and make hammer not crash if a very large map is converted
	 * 3.(optional) Same as 2, but specifically targetting unique_map_data that has a bit of a different structure
	 */
	// Step 1 start
	let cut_turfs = 0
	for(let index = 0; index < map_data.length; index++){
		let turf = turfs[map_data[index]]
		if((turf == "/turf/template_noop") || (turf.slice(0, 16) == "/turf/open/space")){
			map_data[index] = null // Mark it for skipping on generation
			cut_turfs++
			continue
		}
	}
	for(let index = 0; index < map_data.length; index++){
		if(map_data[index] != null){
			continue
		}
		if( // This is really cursed but it just checks if there's any open turfs in the 4 direction around a space turf
			(map_data[index - 1] && turfs[map_data[index - 1]][6] == "o")
			|| (map_data[index + 1] && turfs[map_data[index + 1]][6] == "o")
			|| (map_data[index - map_y] && turfs[map_data[index - map_y]][6] == "o")
			|| (map_data[index + map_y] && turfs[map_data[index + map_y]][6] == "o")
		){
			map_data[index] = skybox_symbol
		}
	}
	log_time("Hammer cleanup: Finished Turf Cutting at " + cut_turfs + " turfs cut")
	// Step 1 end
	// Step 2 start
	let merged_turfs = 0
	// If we don't merge the cubes together everything crashes and has 5 million lines on a 255x255 map so better do it
	for(let index = 0; index < map_data.length; index++){
		if(map_data[index] == null){continue} // What are you going to merge?
		let turf = turfs[map_data[index]]
		let x = 1
		let y = 1
		while(turf == turfs[map_data[index + y]] && ((index + y) % map_y)){
			y++
			merged_turfs++
		}
		if(y > 1){
			map_data.fill(null, index + 1, index + y) // This proc exists.
		}
		let x_loop = true // while(true) is real
		while(x_loop){
			for(let x_index = 0; x_index < y; x_index++){
				if(turf != turfs[map_data[index + x_index + (map_y * x)]]){
					x_loop = false
					break
				}
			}
			if(x_loop){
				let funky_number = index + (map_y * x)
				map_data.fill(null, funky_number, funky_number + y)
				x++
				merged_turfs += y
			}
		}
		map_data[index] = [x, y, turfs[map_data[index]]]
	}
	log_time("Hammer cleanup: Finished Turf Merging at " + merged_turfs + " turfs merged")
	// Step 2 end
	// Step 3 start
	merged_turfs = 0 // Bit of a bad practise to re-use vars but tbh its close enough to whats above.
	for(let master_index = 0; master_index < unique_map_data.length; master_index++){
		for(let index = 0; index < map_data.length; index++){
			if(unique_map_data[master_index][index] == null){continue}
			let turf = unique_map_data[master_index][index]
			let x = 1
			let y = 1
			while(turf == unique_map_data[master_index][index + y] && ((index + y) % map_y)){
				y++
				merged_turfs++
			}
			if(y > 1){
				unique_map_data[master_index].fill(null, index + 1, index + y)
			}
			let x_loop = true
			while(x_loop){
				for(let x_index = 0; x_index < y; x_index++){
					if(turf != unique_map_data[master_index][index + x_index + (map_y * x)]){
						x_loop = false
						break
					}
				}
				if(x_loop){
					let funky_number = index + (map_y * x)
					unique_map_data[master_index].fill(null, funky_number, funky_number + y)
					x++
					merged_turfs += y
				}
			}
			unique_map_data[master_index][index] = [x, y, turf]
		}
	}
	log_time("Hammer cleanup: Finished Special Turf Merging at " + merged_turfs + " turfs merged")
	// Step 3 end
	/**
	 * Turf cleanup over
	 * Now we start generating the hammer map using all the data we collected and cleaned
	 * This involves a lot of random magic numbers (also index_y is evil and needs to be made negative before using)
	 * This is because we generate things a bit differently to DMM, so we have to correct ourselfes to not mirror the map
	 */
	let total_index = -1
	for(let index_x = 0; index_x < map_x; index_x++){
		for(let index_y = 0; index_y < map_y; index_y++){
			total_index++
			const local_area = areas[map_indexes[total_index]]
			const local_objects = objects[map_indexes[total_index]]
			for(let index = 0; index < local_objects.length; index++){
				let object = local_objects[index]
				if(create_decals && object.slice(0, 27) == "/obj/effect/turf_decal/tile"){
					total_decals++
					if( // Please... no more decal work... i beg you, each color takes like 40-50 minutes to make
						object.slice(28, 35) == "neutral"
						|| object.slice(28, 32) == "blue"
						|| (object.slice(28, 32) == "dark" && object.slice(32, 33) != "_")
					){
						make_decal(index_x * block_size, -index_y * block_size, object)
						created_decals++
					}
					continue
				}
				if(object.slice(0, 27) == "/obj/machinery/light_switch"){
					make_light_switch(index_x * block_size, -index_y * block_size, object.slice(-5), local_area)
					continue
				}
				if(object.slice(0, 20) == "/obj/machinery/light"){ // Offset by 1 unit to optimize water indices?
					if(object.slice(21, 26) == "floor"){
						make_light_floor(index_x * block_size, -index_y * block_size, local_area)
					}
					else if(object.slice(21, 26) == "small"){
						make_light_small(index_x * block_size, -index_y * block_size, object.slice(-5), local_area)
					}
					else {
						make_light(index_x * block_size, -index_y * block_size, object.slice(-5), local_area)
					}
					continue
				}
				if(object.slice(0, 58) == "/obj/machinery/atmospherics/components/unary/vent_scrubber"){ // beeg
					make_floor_entity(index_x * block_size, -index_y * block_size, "/obj/machinery/atmospherics/scrubber")
					continue
				}
				if(object.slice(0, 54) == "/obj/machinery/atmospherics/components/unary/vent_pump"){
					make_floor_entity(index_x * block_size, -index_y * block_size, "/obj/machinery/atmospherics/vent")
					continue
				}
				if(object.slice(0, 24) == "/obj/machinery/firealarm"){
					make_fire_alarm(index_x * block_size, -index_y * block_size, object.slice(-5), local_area)
					continue
				}
				else if(object.slice(0, 26) == "/obj/effect/landmark/start"){
					make_spawnpoint(index_x * block_size, -index_y * block_size)
				}
			}

			let window = unique_map_data[window_layer][total_index]
			if(window != null){
				const [x, y, material] = window
				if(material.slice(37, 43) != "hollow"){ // temporary exclusion until i figure out how to handle these.
					make_entity_cube_wall(
						index_x * block_size,
						((index_x + x) * block_size),
						(-(index_y + y) * block_size),
						-index_y * block_size,
						block_size,
						block_size * 2,
						material,
					)
				}
			}

			let firelock = unique_map_data[firelock_layer][total_index]
			if(firelock != null){
				const [x, y, material] = firelock
				make_firelock(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					true,
					local_area
				)
				make_firelock(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					false,
					local_area
				)
			}
			// Don't create a turf here, could be because its space OR because its already here due to merging.
			if(map_data[total_index] == null){continue}
			const [x, y, material] = map_data[total_index]
			if(material[0] == "0"){ // Its a skybox
				make_skybox(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					block_size,
					block_size * 2,
				)
			}
			else if(material[6] == "c"){
				make_cube_wall(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					0,
					block_size * 2,
					material,
				)
			}
			else {
				make_cube_floor(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					0,
					block_size,
					material,
				)
			}
		}
	}
	// Sandwich the map in both at the top and bottom, this prevents leaks from transparent floors and from... the ceiling, duh.
	make_skybox(0, map_x * block_size, -map_y * block_size, 0, -16, 0)
	make_skybox(0, map_x * block_size, -map_y * block_size, 0, block_size * 2, (block_size * 2) + 16)
	content += "}\n"
	content += entity_string

	if(create_decals){
		log_time("Decals created out of total decals: " + created_decals + "/" + total_decals)
	}
	content += end
	// HAMMER MAP GENERATION END
	log_time("Finished map generation")

	fs.writeFile('output.vmf', content, err => {
		if(err){
			console.err
			return
		}
	})
})

function log_time(text){
	const Time = new Date()
	console.log(Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds() + "ms | " + text)
}

/// A cube with a texture only on the top side
function make_cube_floor(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	const material_array = [
		"ss13" + material,
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
	]
	content += make_cube(x1, x2, y1, y2, z1, z2, material_array)
}

/// Same above, but only bottom
function make_cube_ceiling(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"ss13" + material,
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
	]
	content += make_cube(x1, x2, y1, y2, z1, z2, material_array)
}

/// Same above, but all sides.
function make_cube_wall(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"ss13" + material,
		"ss13" + material,
		"ss13" + material,
		"ss13" + material,
	]
	content += make_cube(x1, x2, y1, y2, z1, z2, material_array)
}

/// Same above, but entity so it does not create LDR leafs (something related to autumn idk)
/// They also allow portals though them and don't count as solid for map-closing purposes
function make_entity_cube_wall(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"ss13" + material,
		"ss13" + material,
		"ss13" + material,
		"ss13" + material,
	]
	let result = "\n\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"func_detail\"\n"
	object_id++
	result += make_cube(x1, x2, y1, y2, z1, z2, material_array)
	result += "\n\
	editor\n\
	{\n\
		\"color\" \"0 180 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n"
	entity_string += result
}

function make_firelock(x1 = 0, x2 = 0, y1 = 0, y2 = 0, bottom = true, local_area = ""){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"ss13/obj/machinery/door/firelock",
		"ss13/obj/machinery/door/firelock",
		"ss13/obj/machinery/door/firelock",
		"ss13/obj/machinery/door/firelock",
	]
	let result = "\n\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"func_door\"\n\
	\"disableflashlight\" \"0\"\n\
	\"disablereceiveshadows\" \"0\"\n\
	\"disableshadows\" \"0\"\n\
	\"dmg\" \"1\"\n\
	\"forceclosed\" \"1\"\n\
	\"gmod_allowphysgun\" \"1\"\n\
	\"ignoredebris\" \"0\"\n\
	\"lip\" \"0\"\n\
	\"locked_sentence\" \"0\"\n\
	\"loopmovesound\" \"0\"\n"
	if(bottom){
		result += "	\"movedir\" \"90 0 0\"\n"
	}
	else {
		result += "	\"movedir\" \"-90 0 0\"\n"
	}
	result += "	\"origin\" \"-224 32 31.5\"\n\
	\"renderamt\" \"255\"\n\
	\"rendercolor\" \"255 255 255\"\n\
	\"renderfx\" \"0\"\n\
	\"rendermode\" \"0\"\n\
	\"spawnflags\" \"0\"\n\
	\"spawnpos\" \"1\"\n\
	\"speed\" \"100\"\n\
	\"targetname\" \"firelock_" + local_area + "\"\n\
	\"unlocked_sentence\" \"0\"\n\
	\"wait\" \"-1\"\n"
	object_id++
	if(bottom){
		material_array[0] = "ss13/turf/open/floor/catwalk_floor/iron_dark"
		result += make_cube(x1, x2, y1, y2, block_size - 1, block_size * 1.5, material_array)
	}
	else {
		material_array[1] = "ss13/turf/open/floor/catwalk_floor/iron_dark"
		result += make_cube(x1, x2, y1, y2, block_size * 1.5, (block_size * 2) + 1, material_array)
	}
	result += "\n\
	editor\n\
	{\n\
		\"color\" \"0 180 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n"
	entity_string += result
}

function make_skybox(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0){
	const material_array = [
		"TOOLS/TOOLSSKYBOX2D",
		"TOOLS/TOOLSSKYBOX2D",
		"TOOLS/TOOLSSKYBOX2D",
		"TOOLS/TOOLSSKYBOX2D",
		"TOOLS/TOOLSSKYBOX2D",
		"TOOLS/TOOLSSKYBOX2D",
	]
	let skybox = make_cube(x1, x2, y1, y2, z1, z2, material_array, false)
	// Have a little grouping thats easy to disable if you want a good screenshot, as a treat.
	skybox += "editor\n\
		{\n\
			\"color\" \"0 178 239\"\n\
			\"visgroupid\" \"10\"\n\
			\"visgroupshown\" \"1\"\n\
			\"visgroupautoshown\" \"1\"\n\
		}\n\
	}\n"
	content += skybox
}

function make_cube(
	x1 = 0,
	x2 = 0,
	y1 = 0,
	y2 = 0,
	z1 = 0,
	z2 = 0,
	materials = [],
	add_editor = true,
	wrapping = texture_wrapping,
	x_offset = 0,
	y_offset = 0,
){
	// What do they mean? Who knows, not me.
	x1 -= map_offset_x
	x2 -= map_offset_x
	y1 += map_offset_y
	y2 += map_offset_y
	const vertices = [
		x1+" "+y2+" "+z2+") ("+x2+" "+y2+" "+z2+") ("+x2+" "+y1+" "+z2, // Top
		x1+" "+y1+" "+z1+") ("+x2+" "+y1+" "+z1+") ("+x2+" "+y2+" "+z1, // Bottom
		x1+" "+y2+" "+z2+") ("+x1+" "+y1+" "+z2+") ("+x1+" "+y1+" "+z1, // One of the sides, idk what one
		x2+" "+y2+" "+z1+") ("+x2+" "+y1+" "+z1+") ("+x2+" "+y1+" "+z2,
		x2+" "+y2+" "+z2+") ("+x1+" "+y2+" "+z2+") ("+x1+" "+y2+" "+z1,
		x2+" "+y1+" "+z1+") ("+x1+" "+y1+" "+z1+") ("+x1+" "+y1+" "+z2
	]
	// they go in pairs, index 0 is the same as 1, 2-3, 4-5. Optimize somehow? (preferably without performance cost)
	const u_axis = [
		"1 0", "1 0",
		"0 1", "0 1",
		"1 0", "1 0",
	]
	const v_axis = [
		"-1 0", "-1 0",
		"0 -1", "0 -1",
		"0 -1", "0 -1",
	]
	let cube = "\
	solid\n\
	{\n\
		\"id\" \"" + object_id + "\"\n	\
	"
	for(let index = 0; index < 6; index++){
		cube += "side\n\
		{\n\
			\"id\" \"" + (index + 1) + "\"\n\
			\"plane\" \"(" + (vertices[index]) + ")\"\n\
			\"material\" \"" + materials[index] + "\"\n\
			\"uaxis\" \"[" + (u_axis[index]) + " 0 " + x_offset + "] " + wrapping + "\"\n\
			\"vaxis\" \"[0 " + (v_axis[index]) + " " + y_offset + "] " + wrapping + "\"\n\
			\"rotation\" \"0\"\n\
			\"lightmapscale\" \"" + lightmap_scale + "\"\n\
			\"smoothing_groups\" \"0\"\n\
		}\n\
		"
	}
	if(add_editor){
		cube += "editor\n\
		{\n\
			\"color\" \"0 178 239\"\n\
			\"visgroupshown\" \"1\"\n\
			\"visgroupautoshown\" \"1\"\n\
		}\n\
	}\n"
	}
	object_id++
	return cube
}

function make_spawnpoint(x = 0, y = 0){
	x -= map_offset_x
	y += map_offset_y
	x += half_block_size
	y -= half_block_size
	const spawnpoint = "\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"info_player_start\"\n\
	\"angles\" \"0 270 0\"\n\
	\"origin\" \"" + x + " " + y + " " + block_size + "\"\n\
	editor\n\
	{\n\
		\"color\" \"0 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
\n}\n"
	object_id++
	entity_string += spawnpoint
}

// Really short huh, all rotation/size info is in vmt's
function make_decal(x = 0, y = 0, material = ""){
	x -= map_offset_x
	y += map_offset_y
	x += half_block_size
	y -= half_block_size
	const decal = "\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"infodecal\"\n\
	\"texture\" \"ss13" + material + "\"\n\
	\"origin\" \"" + x + " " + y + " " + block_size + "\"\n\
	editor\n\
	{\n\
		\"color\" \"0 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
\n}\n"
	object_id++
	entity_string += decal
}

function make_floor_entity(x = 0, y = 0, material = ""){
	const material_array = [
		"ss13" + material,
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
	]
	let result = "\n\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"func_detail\"\n"
	object_id++
	result += make_cube(x + large_pixel_6, x + block_size - large_pixel_7, y - block_size + large_pixel_7, y - large_pixel_6, block_size, block_size + 1, material_array)
	result += "\n\
	editor\n\
	{\n\
		\"color\" \"0 180 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n"
	entity_string += result
}

function make_light_switch(x = 0, y = 0, dir = "", local_area = ""){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
	]
	let trigger_offset_x1 = -3 // Idk what i made here, it works. Just barelly.
	let trigger_offset_x2 = 3
	let trigger_offset_y1 = -3
	let trigger_offset_y2 = 3
	if(dir == "north"){
		material_array[5] = "ss13/obj/machinery/light_switch"
		trigger_offset_y1 = -1
		trigger_offset_y2 = -0.9
		x += half_block_size
	}
	else if(dir == "/east"){
		material_array[2] = "ss13/obj/machinery/light_switch"
		trigger_offset_x1 = -1
		trigger_offset_x2 = -0.9
		x += block_size
		y -= half_block_size
	}
	else if(dir == "/west"){
		material_array[3] = "ss13/obj/machinery/light_switch"
		trigger_offset_x1 = 0
		trigger_offset_x2 = 0.1
		y -= half_block_size
	}
	else {
		material_array[4] = "ss13/obj/machinery/light_switch"
		trigger_offset_y1 = 0
		trigger_offset_y2 = 0.1
		x += half_block_size
		y -= block_size
	}
	let trigger_x1 = (x + trigger_offset_x1)
	let trigger_x2 = (x + trigger_offset_x2)
	let trigger_y1 = (y + trigger_offset_y1)
	let trigger_y2 = (y + trigger_offset_y2)
	let light = "entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"func_button\"\n\
	\"disablereceiveshadows\" \"0\"\n\
	\"gmod_allowphysgun\" \"1\"\n\
	\"health\" \"0\"\n\
	\"lip\" \"0\"\n\
	\"locked_sentence\" \"0\"\n\
	\"locked_sound\" \"0\"\n\
	\"min_use_angle\" \"0.0\"\n\
	\"movedir\" \"0 0 0\"\n\
	\"origin\" \"" + (x - map_offset_x) + " " + (y + map_offset_y) + " 152\"\n\
	\"renderamt\" \"255\"\n\
	\"rendercolor\" \"255 255 255\"\n\
	\"renderfx\" \"0\"\n\
	\"rendermode\" \"0\"\n\
	\"sounds\" \"14\"\n\
	\"spawnflags\" \"1025\"\n\
	\"speed\" \"200\"\n\
	\"unlocked_sentence\" \"0\"\n\
	\"unlocked_sound\" \"0\"\n\
	\"wait\" \"0\"\n"
	object_id++
	light += make_cube(trigger_x1, trigger_x2, trigger_y1, trigger_y2, 144, 152, material_array, true, 1, 4)
	light += "editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
"
	entity_string += light
}

function make_fire_alarm(x = 0, y = 0, dir = "", local_area = ""){
	const material_array = [
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
		"TOOLS/TOOLSNODRAW",
	]
	let trigger_offset_x1 = -4
	let trigger_offset_x2 = 4
	let trigger_offset_y1 = -4
	let trigger_offset_y2 = 4
	if(dir == "north"){
		material_array[5] = "ss13/obj/machinery/fire_alarm"
		trigger_offset_y1 = -1
		trigger_offset_y2 = -0.9
		x += half_block_size
	}
	else if(dir == "/east"){
		material_array[2] = "ss13/obj/machinery/fire_alarm"
		trigger_offset_x1 = -1
		trigger_offset_x2 = -0.9
		x += block_size
		y -= half_block_size
	}
	else if(dir == "/west"){
		material_array[3] = "ss13/obj/machinery/fire_alarm"
		trigger_offset_x1 = 0
		trigger_offset_x2 = 0.1
		y -= half_block_size
	}
	else {
		material_array[4] = "ss13/obj/machinery/fire_alarm"
		trigger_offset_y1 = 0
		trigger_offset_y2 = 0.1
		x += half_block_size
		y -= block_size
	}
	let trigger_x1 = (x + trigger_offset_x1)
	let trigger_x2 = (x + trigger_offset_x2)
	let trigger_y1 = (y + trigger_offset_y1)
	let trigger_y2 = (y + trigger_offset_y2)
	let alarm = "entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"func_button\"\n\
	\"disablereceiveshadows\" \"0\"\n\
	\"gmod_allowphysgun\" \"1\"\n\
	\"health\" \"0\"\n\
	\"lip\" \"0\"\n\
	\"locked_sentence\" \"0\"\n\
	\"locked_sound\" \"0\"\n\
	\"min_use_angle\" \"0.0\"\n\
	\"movedir\" \"0 0 0\"\n\
	\"origin\" \"" + (x - map_offset_x) + " " + (y + map_offset_y) + " 152\"\n\
	\"renderamt\" \"255\"\n\
	\"rendercolor\" \"255 255 255\"\n\
	\"renderfx\" \"0\"\n\
	\"rendermode\" \"0\"\n\
	\"sounds\" \"14\"\n\
	\"spawnflags\" \"1025\"\n\
	\"speed\" \"200\"\n\
	\"unlocked_sentence\" \"0\"\n\
	\"unlocked_sound\" \"0\"\n\
	\"wait\" \"0\"\n\
	connections\n\
	{\n\
		\"OnPressed\" \"firelock_" + local_area + "Toggle0-1\"\n\
	}\n"
	object_id++
	alarm += make_cube(trigger_x1, trigger_x2, trigger_y1, trigger_y2, 141, 155, material_array, true, 1, 8, -4)
	alarm += "editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
"
	entity_string += alarm
}

// Makes a light tube, the commented out parts in directions bump the light 1 unit away from the wall
// This is a possible way to fix T-junctions? Does not seem necessary but for now keeping it
function make_light(x = 0, y = 0, dir = "", local_area = ""){
	x -= map_offset_x
	y += map_offset_y
	let light_offset_x = 0
	let light_offset_y = 0
	if(dir == "north"){
		x += half_block_size
//		y -= 1
		light_offset_y = -10
		dir = 270
	}
	else if(dir == "/east"){
//		x += (block_size - 1)
		x += block_size
		y -= half_block_size
		light_offset_x = -10
		dir = 180
	}
	else if(dir == "/west"){
//		x += 1
		y -= half_block_size
		light_offset_x = 10
		dir = 0
	}
	else {
		x += half_block_size
//		y -= (block_size - 1)
		y -= block_size
		light_offset_y = 10
		dir = 90
	}
	const light = "entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"prop_static\"\n\
	\"angles\" \"0 "+ dir +" 0\"\n\
	\"fademindist\" \"-1\"\n\
	\"fadescale\" \"1\"\n\
	\"lightmapresolutionx\" \"32\"\n\
	\"lightmapresolutiony\" \"32\"\n\
	\"model\" \"models/props/de_nuke/wall_light.mdl\"\n\
	\"skin\" \"0\"\n\
	\"solid\" \"6\"\n\
	\"origin\" \"" + x + " " + y + " 176\"\n\
	editor\n\
	{\n\
		\"color\" \"255 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
entity\n\
{\n\
	\"id\" \"" + (object_id + 1) + "\"\n\
	\"classname\" \"light\"\n\
	\"_light\" \"255 255 255 80\"\n\
	\"_lightHDR\" \"-1 -1 -1 1\"\n\
	\"_lightscaleHDR\" \"1\"\n\
	\"_quadratic_attn\" \"1\"\n\
	\"origin\" \"" + (x + light_offset_x) + " " + (y + light_offset_y) + " 175\"\n\
	editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
" // In case anyone wants to change how much light these give off, look at '_light', last number.
	object_id += 2
	entity_string += light
}

function make_light_small(x = 0, y = 0, dir = "", local_area = ""){
	x -= map_offset_x
	y += map_offset_y
	let light_offset_x = 0
	let light_offset_y = 0
	if(dir == "north"){
		x += half_block_size
		light_offset_y = -10
		dir = 270
	}
	else if(dir == "/east"){
		x += block_size
		y -= half_block_size
		light_offset_x = -10
		dir = 180
	}
	else if(dir == "/west"){
		y -= half_block_size
		light_offset_x = 10
		dir = 0
	}
	else {
		x += half_block_size
		y -= block_size
		light_offset_y = 10
		dir = 90
	}
	const light = "entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"prop_static\"\n\
	\"angles\" \"270 "+ dir +" 0\"\n\
	\"fademindist\" \"-1\"\n\
	\"fadescale\" \"1\"\n\
	\"lightmapresolutionx\" \"32\"\n\
	\"lightmapresolutiony\" \"32\"\n\
	\"model\" \"models/props/de_inferno/ceiling_light.mdl\"\n\
	\"skin\" \"0\"\n\
	\"solid\" \"6\"\n\
	\"origin\" \"" + x + " " + y + " 176\"\n\
	editor\n\
	{\n\
		\"color\" \"255 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
entity\n\
{\n\
	\"id\" \"" + (object_id + 1) + "\"\n\
	\"classname\" \"light\"\n\
	\"_light\" \"255 255 255 40\"\n\
	\"_lightHDR\" \"-1 -1 -1 1\"\n\
	\"_lightscaleHDR\" \"1\"\n\
	\"_quadratic_attn\" \"1\"\n\
	\"origin\" \"" + (x + light_offset_x) + " " + (y + light_offset_y) + " 175\"\n\
	editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
"
	object_id += 2
	entity_string += light
}

function make_light_floor(x = 0, y = 0, local_area = ""){
	x -= map_offset_x
	y += map_offset_y
	x += half_block_size
	y -= half_block_size
	const light = "entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"prop_static\"\n\
	\"angles\" \"180 0 0\"\n\
	\"fademindist\" \"-1\"\n\
	\"fadescale\" \"1\"\n\
	\"lightmapresolutionx\" \"32\"\n\
	\"lightmapresolutiony\" \"32\"\n\
	\"model\" \"models/props_c17/light_domelight02_on.mdl\"\n\
	\"skin\" \"0\"\n\
	\"solid\" \"0\"\n\
	\"origin\" \"" + x + " " + y + " " + block_size + "\"\n\
	editor\n\
	{\n\
		\"color\" \"255 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
entity\n\
{\n\
	\"id\" \"" + (object_id + 1) + "\"\n\
	\"classname\" \"light\"\n\
	\"_light\" \"255 255 255 40\"\n\
	\"_lightHDR\" \"-1 -1 -1 1\"\n\
	\"_lightscaleHDR\" \"1\"\n\
	\"_quadratic_attn\" \"1\"\n\
	\"origin\" \"" + x + " " + y + " " + (block_size + 10) + "\"\n\
	editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
}\n\
"
	object_id += 2
	entity_string += light
}
