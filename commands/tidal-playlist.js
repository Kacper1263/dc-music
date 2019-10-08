const Tidal = require("tidal-api-wrapper")
const tidal = new Tidal()

var songList = [];

/**
 * Will return array of songs from given UUID in promise. Array will be shuffled and won't have songs with special characters in title
 * 
 * @param {String} UUID Playlist UUID from Tidal. Can be found in https://listen.tidal.com URL
 */
async function getPlaylistSongs(UUID){
    var promise = new Promise((resolve, reject) => {
        tidal.getPlaylistTracks(UUID).then(songs => {
            songs.forEach(song => {
                songList.push(song.title)
            });
            songList = songList.filter(arrayWithoutSpecials)
            resolve(shuffleArray(songList))
        }).catch(e => {
            console.log("Error: Can't find playlist")
            reject("Error: Can't find playlist")
        }) 
    }); 
    
    return promise;
}

function shuffleArray(array) {
    let counter = array.length;

    // While there are elements in the array
    while (counter > 0) {
        // Pick a random index
        let index = Math.floor(Math.random() * counter);

        // Decrease counter by 1
        counter--;

        // And swap the last element with it
        let temp = array[counter];
        array[counter] = array[index];
        array[index] = temp;
    }
    return array;
}

/**
 * Array filter - Ignore all songs with special characters
 */
function arrayWithoutSpecials(element, index, array){ 
    return (!element.includes("#") && !element.includes("/") && !element.includes("'") && !element.includes("!") && !element.includes("\\") && !element.includes("ź"))
}
module.exports = getPlaylistSongs