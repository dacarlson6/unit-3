//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute


    //begin script when window loads
    window.onload = setMap;

    //set up choropleth map
    function setMap() {
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
        
        //create path generator
        var path = d3.geoPath()
            .projection(projection);

        //use Promise.all to parallelize asynchronous data loading
        var promises = [
            d3.csv("data/unitsData.csv"), //load attributes from csv
            d3.json("data/EuropeCountries.topojson"), //load background spatial data
            d3.json("data/FranceRegions.topojson") //load choropleth spatial data
        ];

        Promise.all(promises).then(callback);
        
        function callback(data) {
            var csvData = data[0],
                europe = data[1],
                france = data[2];

            
            console.log(csvData);
            console.log(europe);
            console.log(france);

            //translate europe and France TopoJSONs
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions).features;

            //place graticule on the map
            setGraticule(map, path);

            //join csv data to GeoJSON enumeration units
            franceRegions = joinData(franceRegions, csvData);

            //add Europe countries to map
            var countries = map.append("path")
                .datum(europeCountries)
                .attr("class", "countries")
                .attr("d", path);           

            //add enumeration units to the map
            setEnumerationUnits(franceRegions, map, path);
        };

    }; //end of setMap()

        function setGraticule(map, path){
            //...GRATICULE BLOCKS FROM CHAPTER 8
        };        

        //function to join csv data to GeoJSON
        function joinData(franceRegions, csvData) {
            //variables for data join
            var attrArray = ["varA", "varB", "varC", "varD", "varE"];

            //loop through csv to assign each set of csv attribute values to geojson region
            for (var i = 0; i < csvData.length; i++) {
                var csvRegion = csvData[i]; //the current region
                var csvKey = csvRegion.adm1_code; //the CSV primary key

                //loop through geojson regions to find correct region
                for (var a = 0; a < franceRegions.length; a++) {
                    var geojsonProps = franceRegions[a].properties; //the current region geojson properties
                    var geojsonKey = geojsonProps.adm1_code; //the geojson primary key

                    //where primary keys match, transfer csv data to geojson properties object
                    if (geojsonKey === csvKey) {
                        //assign all attributes and values
                        attrArray.forEach(function(attr) {
                            var val = parseFloat(csvRegion[attr]); //get csv attribute value
                            geojsonProps[attr] = val; //assign attribute and value to geojson properties
                        });
                    }
                }
            }
            return franceRegions;
        }

        //Example 1.3 line 38
        function setEnumerationUnits(franceRegions, map, path, colorScale){

            //add France regions to map
            var regions = map.selectAll(".regions")
                .data(franceRegions)
                .enter()
                .append("path")
                .attr("class", function(d){
                    return "regions " + d.properties.adm1_code;
                })
                .attr("d", path)
                .style("fill", function(d){
                    return colorScale(d.properties[expressed]);
                });
        }

        //function to create color scale generator
        function makeColorScale(data){
            var colorClasses = [
                "#D4B9DA",
                "#C994C7",
                "#DF65B0",
                "#DD1C77",
                "#980043"
            ];

            //create color scale generator
            var colorScale = d3.scaleQuantile()
                .range(colorClasses);

            //build array of all values of the expressed attribute
            var domainArray = [];
            for (var i=0; i<data.length; i++){
                var val = parseFloat(data[i][expressed]);
                domainArray.push(val);
            };

            //assign array of expressed values as scale domain
            colorScale.domain(domainArray);

            return colorScale;
        };

})(); //last line of main.js