//begin script when window loads
window.onload = setMap();

//set up choropleth map
function setMap(){

    //map frame dimensions
    var width = 960,
        height = 460;

    //create new svg container for the map
    var map = d3.select("body")
        .append("svg")
        .attr("class", "map")
        .attr("width", width)
        .attr("height", height);

    //create Albers equal area conic projection centered on France
    var projection = d3.geoAlbers()
        .center([0, 46.2])
        .rotate([-2, 0, 0])
        .parallels([43, 62])
        .scale(2500)
        .translate([width / 2, height / 2]);    

    //use Promise.all to parallelize asynchronous data loading
    var promises = [];    
    promises.push(d3.csv("data/unitsData.csv")); //load attributes from csv    
    promises.push(d3.json("data/EuropeCountries.topojson")); //load background spatial data    
    promises.push(d3.json("data/FranceRegions.topojson")); //load choropleth spatial data    
    Promise.all(promises).then(callback);
}
    
        function callback(data) {
            var csvData = data[0],
                europe = data[1],
                france = data[2];
            console.log(csvData);
            console.log(europe);
            console.log(france);

            //translate europe TopoJSON
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions);

            //examine the results
            console.log(europeCountries);
            console.log(franceRegions);
        }