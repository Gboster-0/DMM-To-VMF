// making time ~6.5 hours
const fs = require('fs');
const block_size = 64

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
}\n\
cameras\n\
{\n\
	\"activecamera\" \"-1\"\n\
}\n\
cordons\n\
{\n\
	\"active\" \"0\"\n\
}\n\
"

let object_id = 2

function make_cube_simple(x, y, z, material = "TOOLS/TOOLSNODRAW"){
	return make_cube(x, x + block_size, y, y + block_size, block_size*(z-1), block_size*z, material)
}

function make_cube(x1 = 0, x2 = 0, y1 = 0, y2 = 0, z1 = 0, z2 = 0, material = "TOOLS/TOOLSNODRAW"){
	let cube = "solid\n{\n"
	cube += ("\"id\" \"" + object_id + "\"\n")
	let index = 0
	// IM SORRY, PLEASE FORGIVE ME GODS. HAMMER IS HAMMERING ME INTO OBLIVION.
	const vertices = [
		x1+" "+y2+" "+z2+") ("+x2+" "+y2+" "+z2+") ("+x2+" "+y1+" "+z2,
		x1+" "+y1+" "+z1+") ("+x2+" "+y1+" "+z1+") ("+x2+" "+y2+" "+z1,
		x1+" "+y2+" "+z2+") ("+x1+" "+y1+" "+z2+") ("+x1+" "+y1+" "+z1,
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
	for(index; index < 6; index++){
		cube += "side\n{\n"
		cube += ("\"id\" \"" + (index + 1) + "\"\n") // index of the planes, 1-6
		cube += ("\"plane\" \"(" + (vertices[index]) + ")\"\n")
		cube += ("\"material\" \"" + material.slice(1) + "\"\n")
		cube += ("\"uaxis\" \"[" + (u_axis[index]) + " 0 0] 2\"\n")
		cube += ("\"vaxis\" \"[0 " + (v_axis[index]) + " 0] 2\"\n")
		cube += ("\"rotation\" \"0\"\n") // static, 0
		cube += ("\"lightmapscale\" \"16\"\n") // static, 16
		cube += ("\"smoothing_groups\" \"0\"\n") // static, 0
		cube += "}\n"
	}
	cube += "\
	editor\n\
	{\n\
		\"color\" \"0 178 239\"\n\
		\"visgroupshown\" \"1\"\n\
		\"visgroupautoshown\" \"1\"\n\
	}\n\
	}\
	"
	object_id++
	return cube
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
	let map_x = file_data.match(/\(\d+,/g).length // How many tiles are in the X direction

	file_data = file_data.replace(/(,|{)/g, '') // Remove start of JSON, very dirty, leaves behind endings and content of JSON
	// Integer, specific length of symbols ("aaa" >> 3)
	let symbol_length = file_data.match(/".+"/)[0].length - 2 // Get how long the symbols are

	// Array of strings (turf paths) in order of appearance of them in symbols
	let turfs = file_data.match(/\/turf\/.+/g) // Match turfs paths so we can use them later

	let symbol_regex = new RegExp("\".{"+symbol_length+"}\" =", "g")
	let dirty_symbols = file_data.match(symbol_regex)
	let symbols = []
	// Clean em up, we had to get a bit dirty due to shuttle dock lists in DMM files that are "xx" (this took me hours to figure out)
	for(let index = 0; index < dirty_symbols.length; index++){
		symbols.push(dirty_symbols[index].slice(1, symbol_length + 1))
	}
	if(turfs.length != symbols.length){
		console.log("Warning, symbol to turf mis-match. The final map may generate buggy.")
	}

	// Line below is fairly expensive, replace
	file_data = file_data.match(/\(111\)(.|\n)+/g)[0] // Cuts EVERYTHING below the map definition, we optimizing
	file_data = file_data.replace(/\(.+\s/g, '')

	Time = new Date()
	console.log(Time.getMinutes() + "m:" + Time.getSeconds() + "s:" + Time.getMilliseconds() + "ms | Finished regexing")

	for(let index = 0; index < symbols.length; index++){
		file_data = file_data.replace(new RegExp(symbols[index], "g"), index)
	}
	symbols = null // Free up some of that delicious RAM
	let map_data = file_data.match(/\d+/g) // Indexes of turfs to take

	const map_y = (map_data.length / map_x)

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
		if(turf[6] == "c"){z = 2}
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
	let total_index = -1
	for(let index_x = 0; index_x < map_x; index_x++){
		for(let index_y = 0; index_y < map_y; index_y++){
			total_index++
			if(map_data[total_index] == null){continue} // Leave that space empty
			if(Array.isArray(map_data[total_index])){
				let [x, y, z, material] = map_data[total_index]
				content += make_cube(
					index_x * block_size,
					((index_x + x) * block_size),
					index_y * block_size,
					((index_y + y) * block_size),
					block_size * (z - 1),
					block_size * z,
					material,
				)
				continue
			}
			let current_turf = turfs[map_data[total_index]]
			let closed_turf = current_turf[6] == "c" ? 2 : 1 // checks if its /turf/[[c]]losed, if so extend it up a block
			if(closed_turf){
				content += make_cube_simple(index_x * block_size, index_y * block_size, closed_turf, current_turf)
			}
		}
	}

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
