const fs = require('fs');
const block_size = 64
const half_block_size = (block_size * 0.5)

// These don't really matter to us, its whatever
const start = "versioninfo\n\
{\n\
	\"editorversion\" \"400\"\n\
	\"editorbuild\" \"10422\"\n\
	\"mapversion\" \"1\"\n\
	\"formatversion\" \"100\"\n\
	\"prefab\" \"0\"\n\
}\n\
visgroups\n\
{\n\
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
	\"skyname\" \"sky_day01_01\"\n\
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

// ID's of all objects we create, ID 1 is reserved for the world parameters
let object_id = 2
// Offsets to make the world centered and not off to the side
let map_offset_x = 0
let map_offset_y = 0

function make_cube_simple(x, y, z, material = "TOOLS/TOOLSNODRAW"){
	return make_cube(x, x + block_size, y, y + block_size, 0, block_size*z, material)
}

function make_cube(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	// What do they mean? Who knows, not me.
	x1 -= map_offset_x
	x2 -= map_offset_x
	y1 += map_offset_y
	y2 += map_offset_y
	const vertices = [
		x1+" "+y1+" "+z1+") ("+x2+" "+y1+" "+z1+") ("+x2+" "+y2+" "+z1, // Bottom
		x1+" "+y2+" "+z2+") ("+x2+" "+y2+" "+z2+") ("+x2+" "+y1+" "+z2, // Top
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
	let index = 0
	cube += "side\n\
		{\n\
			\"id\" \"" + (index + 1) + "\"\n\
			\"plane\" \"(" + (vertices[index]) + ")\"\n\
			\"material\" \"TOOLS/TOOLSNODRAW\"\n\
			\"uaxis\" \"[" + (u_axis[index]) + " 0 0] 2\"\n\
			\"vaxis\" \"[0 " + (v_axis[index]) + " 0] 2\"\n\
			\"rotation\" \"0\"\n\
			\"lightmapscale\" \"16\"\n\
			\"smoothing_groups\" \"0\"\n\
		}\n\
		"
	index++
	for(index; index < 6; index++){
		cube += "side\n\
		{\n\
			\"id\" \"" + (index + 1) + "\"\n\
			\"plane\" \"(" + (vertices[index]) + ")\"\n\
			\"material\" \"" + material.slice(1) + "\"\n\
			\"uaxis\" \"[" + (u_axis[index]) + " 0 0] 2\"\n\
			\"vaxis\" \"[0 " + (v_axis[index]) + " 0] 2\"\n\
			\"rotation\" \"0\"\n\
			\"lightmapscale\" \"16\"\n\
			\"smoothing_groups\" \"0\"\n\
		}\n\
		"
	}
	cube += "editor\n\
		{\n\
			\"color\" \"0 178 239\"\n\
			\"visgroupshown\" \"1\"\n\
			\"visgroupautoshown\" \"1\"\n\
		}\n\
	}\n"
	object_id++
	return cube
}

function make_spawnpoint(x = 0, y = 0){
	const spawnpoint = "\
entity\n\
{\n\
	\"id\" \"" + object_id + "\"\n\
	\"classname\" \"info_player_start\"\n\
	\"angles\" \"0 0 0\"\n\
	\"origin\" \"" + x + " " + y + " 210\"\n\
	editor\n\
	{\n\
		\"color\" \"0 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
		\"logicalpos\" \"[0 1500]\"\n\
	}\n\
\n}\n"
	object_id++
	return spawnpoint
}

function make_light(x = 0, y = 0, dir = ""){
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
	let light = "entity\n\
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
	\"origin\" \"" + x + " " + y + " 180\"\n\
	editor\n\
	{\n\
		\"color\" \"255 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
		\"logicalpos\" \"[0 1000]\"\n\
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
	\"spawnflags\" \"0\"\n\
	\"origin\" \"" + (x + light_offset_x) + " " + (y + light_offset_y) + " 175\"\n\
	editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
		\"logicalpos\" \"[0 500]\"\n\
	}\n\
}\n\
"
	object_id += 2
	return light
}

function make_light_floor(x = 0, y = 0){
	x -= map_offset_x
	y += map_offset_y
	x += half_block_size
	y += half_block_size
	let light = "entity\n\
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
	\"solid\" \"6\"\n\
	\"origin\" \"" + x + " " + y + " 64\"\n\
	editor\n\
	{\n\
		\"color\" \"255 255 0\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
		\"logicalpos\" \"[0 1000]\"\n\
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
	\"spawnflags\" \"0\"\n\
	\"origin\" \"" + x + " " + y + " 74\"\n\
	editor\n\
	{\n\
		\"color\" \"220 30 220\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
		\"logicalpos\" \"[0 500]\"\n\
	}\n\
}\n\
"
	object_id += 2
	return light
}

// Yes, this entire thing is indented in it
fs.readFile('Map.dmm', 'utf8', (err, file_data) => {
	if(err){
		console.error(err)
		return
	}
	let Time = new Date()
	console.log(Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds() + "ms | Map fetched and program starting")

	// Integer, Length of the map in the X direction
	const map_x = file_data.match(/\(\d+,/g).length // How many tiles are in the X direction

	// Very expensive array made out of a regex of every single symbol with its associated objects 'aaa" = (\n...)"'
	const object_chunks = file_data.match(/...".+\((.|\n)+?\w\)\s("|\n)/g)

	// Integer, specific length of symbols ("aaa" >> 3)
	const symbol_length = object_chunks[0].match(/.+"/)[0].length - 1 // Get how long the symbols are

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

	if(object_chunks.length != symbols.length){
		console.log("Warning, symbol to object chunk mis-match. Map cannot be generated accuratelly.")
		console.log("Object chunks: " + object_chunks.length)
		console.log("Symbols: " + symbols.length)
		return
	}

	// Line below is fairly expensive, replace
	file_data = file_data.match(/\(1,1,1\)(.|\n)+/g)[0] // Cuts EVERYTHING below the map definition
	file_data = file_data.replace(/\(.+\s/g, '')

	Time = new Date()
	console.log(Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds() + "ms | Finished regexing")

	for(let index = 0; index < symbols.length; index++){
		file_data = file_data.replace(new RegExp(symbols[index], "g"), index)
	}
	symbols = null // Free up some of that delicious RAM
	const map_data = file_data.match(/\d+/g) // Indexes of turfs to take
	const map_indexes = map_data.slice()

	const map_y = (map_data.length / map_x)

	// Weird calculation huh? We need to be on an even number in map_x and map_y else textures don't get wrapped properly
	map_offset_x = ((Math.floor(map_x * 0.5) * 2) * half_block_size)
	map_offset_y = ((Math.floor(map_y * 0.5) * 2) * half_block_size)

	/**
	 * Alright, we made a lot of trash data from all of that so lets start cleaning it up
	 * 1. Cut turfs we won't want to make at all
	 * 2. Turn children of turfs that have literally no difference in garry's mod(airless tiles) into parents, to save on sprites.
	 * 3. Merge any turfs we can together to save on storage, ram and make hammer not crash if a very large map is converted
	 */
	// Step 1-2 start
	let cut_turfs = 0
	for(let index = 0; index < map_data.length; index++){
		let turf = turfs[map_data[index]]
		if((turf == "/turf/template_noop") || (turf.slice(0, 16) == "/turf/open/space")){
			map_data[index] = null // Mark it for skipping on generation
			cut_turfs++
			continue
		}
		if(turf.slice(-7) == "airless"){
			turfs[map_data[index]] = turf.slice(0, turf.length-8)
		}
	}
	Time = new Date()
	console.log(
		Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds()
		+ "ms | Hammer cleanup: Finished Turf Cutting at " + cut_turfs + " turfs cut"
	)
	// Step 1-2 end
	// Step 3 start
	let merged_turfs = 0
	// If we don't merge the cubes together everything crashes and has 5 million lines on a 255x255 map so better do it
	for(let index = 0; index < map_data.length; index++){
		if(map_data[index] == null){continue} // What are you going to merge?
		let turf = turfs[map_data[index]]
		let x = 1
		let y = 1
		let z = 1
		if(turf[6] == "c"){z = 3}
		while(turf == turfs[map_data[index + y]] && ((index + y) % map_y)){
			y++
			merged_turfs++
		}
		if(y > 1){
			map_data.fill(null, index + 1, index + y) // This proc exists.
		}
		let x_loop = true
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
		map_data[index] = [x, y, z, turfs[map_data[index]]]
	}
	Time = new Date()
	console.log(
		Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds()
		+ "ms | Hammer cleanup: Finished Turf Merging at " + merged_turfs + " turfs merged"
	)
	// Step 3 end

	// HAMMER MAP GENERATION START
	let content = start
	let entity_string = ""

	// Generate solids (floors, walls)
	let total_index = -1
	for(let index_x = 0; index_x < map_x; index_x++){
		for(let index_y = 0; index_y < map_y; index_y++){
			total_index++

			const local_objects = objects[map_indexes[total_index]]
			for(let index = 0; index < local_objects.length; index++){
				if(
					local_objects[index] == "/obj/machinery/light"
					|| local_objects[index].slice(0, 21) == "/obj/machinery/light/"
				){
					if(local_objects[index].slice(21, 26) == "floor")
						entity_string += make_light_floor(index_x * block_size, -index_y * block_size)
					else{
						entity_string += make_light(index_x * block_size, -index_y * block_size, local_objects[index].slice(-5))
					}
				}
			}

			if(map_data[total_index] == null){continue} // Leave that space empty
			if(Array.isArray(map_data[total_index])){
				const [x, y, z, material] = map_data[total_index]
				content += make_cube(
					index_x * block_size,
					((index_x + x) * block_size),
					(-(index_y + y) * block_size),
					-index_y * block_size,
					0,
					block_size * z,
					material,
				)
				continue
			}
			const current_turf = turfs[map_data[total_index]]
			const closed_turf = current_turf[6] == "c" ? 3 : 1 // checks if its /turf/[[c]]losed, if so extend it up a block
			if(closed_turf){
				content += make_cube_simple(index_x * block_size, -index_y * block_size, closed_turf, current_turf)
			}
		}
	}
	content += "}\n"
	entity_string += make_spawnpoint(0, 0)
	content += entity_string

	content += end
	// HAMMER MAP GENERATION END
	Time = new Date()
	console.log(Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds() + "ms | Finished map generation")

	fs.writeFile('output.vmf', content, err => {
		if(err){
			console.err
			return
		}
	})
})
