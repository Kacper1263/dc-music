var os = require('os');

function usage (msg){
    var cpuUsage;
		
    var m = msg.channel.send({embed: {
        color: 0xffdd00,
        description: "Reading data. Please wait..."
    }});

    try{
        //Grab first CPU Measure
        var startMeasure = cpuAverage();  
        //Set delay for second Measure
        setTimeout(function() { 
    
            //Grab second Measure
            var endMeasure = cpuAverage(); 
        
            //Calculate the difference in idle and total time between the measures
            var idleDifference = endMeasure.idle - startMeasure.idle;
            var totalDifference = endMeasure.total - startMeasure.total;
        
            //Calculate the average percentage CPU usage
            var percentageCPU = 100 - ~~(100 * idleDifference / totalDifference);
        
            //Output result to console
            cpuUsage =  percentageCPU;
                
            var freeRam = formatBytes(os.freemem());
            var totalRam = formatBytes(os.totalmem());
            var usedRam = formatBytes(os.totalmem() - os.freemem());
            var color;

            if(cpuUsage >= 90){
                color = 0xff0000; //red
            }
            else if(cpuUsage > 65 && cpuUsage < 90){
                color = 0xffdd00; //yellow
            }
            else if(cpuUsage <=65){
                color = 0x04ff00; //green
            }

            m.then( _m => 
                _m.edit({embed: {
                    color: color,
                    description: "**Average CPU usage:** " + cpuUsage + "%\n\n**Total RAM:** " + formatBytesString(os.totalmem()) + "\n**Free RAM:** " + formatBytesString(os.freemem()) + "\n**Used RAM:** " + formatBytesString(os.totalmem() - os.freemem())
                }})
            );

        }, 100);
    }
    catch(e){
        m.then( _m => 
            _m.edit({embed: {
                color: 0xff0000, //red
                description: "**An error was encountered:**\n " + e
            }})
        );
    }
    
}

function formatBytesString(bytes, decimals) {
	if (bytes === 0) return '0 GB'
	if (isNaN(parseInt(bytes))) return bytes
	if (typeof bytes === 'string') bytes = parseInt(bytes)
	if (bytes === 0) return '0';
	const k = 1000;
	const dm = decimals + 1 || 3;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(0))} ${sizes[i]}`;  //OLD: toFixed(dm)
}
function formatBytes(bytes, decimals) {
	if (bytes === 0) return '0 GB'
	if (isNaN(parseInt(bytes))) return bytes
	if (typeof bytes === 'string') bytes = parseInt(bytes)
	if (bytes === 0) return '0';
	const k = 1000;
	const dm = decimals + 1 || 3;
	const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${parseFloat((bytes / k ** i).toFixed(0))}`;  //OLD: toFixed(dm)
}

function cpuAverage() {

	//Initialise sum of idle and time of cores and fetch CPU info
	var totalIdle = 0, totalTick = 0;
	var cpus = os.cpus();
  
	//Loop through CPU cores
	for(var i = 0, len = cpus.length; i < len; i++) {
  
	  //Select CPU core
	  var cpu = cpus[i];
  
	  //Total up the time in the cores tick
	  for(type in cpu.times) {
		totalTick += cpu.times[type];
	 }     
  
	  //Total up the idle time of the core
	  totalIdle += cpu.times.idle;
	}
  
	//Return the average Idle and Tick times
	return {idle: totalIdle / cpus.length,  total: totalTick / cpus.length};
}  

module.exports.usage = usage;