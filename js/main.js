//First line of main.js...wrap everything in a self-executing anonymous function to move to local scope
(function(){

    //pseudo-global variables
    var attrArray = ["varA", "varB", "varC", "varD", "varE"]; //list of attributes
    var expressed = attrArray[0]; //initial attribute

    //chart frame dimensions
    var chartWidth = window.innerWidth * 0.425,
        chartHeight = 473,
        leftPadding = 25,
        rightPadding = 2,
        topBottomPadding = 5,
        chartInnerWidth = chartWidth - leftPadding - rightPadding,
        chartInnerHeight = chartHeight - topBottomPadding * 2,
        translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

    //create a scale to size bars proportionally to frame and for axis
    var yScale = d3.scaleLinear()
        .range([463, 0])
        .domain([0, 110]);

    //begin script when window loads
    window.onload = setMap;

    //set up choropleth map
    function setMap() {
        //map frame dimensions
        var width = window.innerWidth * 0.5,
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
            
            /* console.log(csvData);
            console.log(europe);
            console.log(france); */

            //translate europe and France TopoJSONs
            var europeCountries = topojson.feature(europe, europe.objects.EuropeCountries),
                franceRegions = topojson.feature(france, france.objects.FranceRegions).features;

            //place graticule on the map
            setGraticule(map, path);

            //join csv data to GeoJSON enumeration units
            franceRegions = joinData(franceRegions, csvData);

            //create a color scale
            var colorScale = makeColorScale(csvData);

            //add Europe countries to map
            var countries = map.append("path")
                .datum(europeCountries)
                .attr("class", "countries")
                .attr("d", path);           

            //add enumeration units to the map with color scale
            setEnumerationUnits(franceRegions, map, path, colorScale);

            //call the setChart function to add bars
            setChart(csvData, colorScale);

            //create the dropdown menu
            createDropdown(csvData);

            //create the legend
            createLegend(colorScale);
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

    function setEnumerationUnits(franceRegions, map, path, colorScale) {    
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
                var value = d.properties[expressed];            
                if (value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc"; // neutral gray color for missing values            
                }    
            })
            .each(function(d){ // store the initial style
                var element = d3.select(this);
                var originalStyle = {
                    "stroke": element.style("stroke"),
                    "stroke-width": element.style("stroke-width")
                };
                element.append("desc")
                    .text(JSON.stringify(originalStyle));
            })
            .on("mouseover", function(event, d){
                highlight(d.properties);
                setLabel(d.properties);
            })
            .on("mouseout", function(event, d){
                dehighlight(d.properties);
                d3.select(".infolabel").remove();
            })
            .on("mousemove", moveLabel);
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
    }

    //function to create coordinated bar chart
    function setChart(csvData, colorScale){
        //chart frame dimensions
        var chartWidth = window.innerWidth * 0.425,
            chartHeight = 473,
            leftPadding = 25,
            rightPadding = 2,
            topBottomPadding = 5,
            chartInnerWidth = chartWidth - leftPadding - rightPadding,
            chartInnerHeight = chartHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        //create a second svg element to hold the bar chart
        var chart = d3.select("body")
            .append("svg")
            .attr("width", chartWidth)
            .attr("height", chartHeight)
            .attr("class", "chart");

        //create a rectangle for chart background fill
        var chartBackground = chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        //create a scale to size bars proportionally to frame and for axis
        var yScale = d3.scaleLinear()
            .range([463, 0])
            .domain([0, 100]);

        //set bars for each province
        var bars = chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort(function(a, b){
                return b[expressed]-a[expressed]
            })
            .attr("class", function(d){
                return "bar " + d.adm1_code;
            })
            .attr("width", chartInnerWidth / csvData.length - 1)
            .attr("x", function(d, i){
                return i * (chartInnerWidth / csvData.length) + leftPadding;
            })
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            .style("fill", function(d){
                return colorScale(d[expressed]);
            })
            .each(function(d){ // store the initial style
                var element = d3.select(this);
                var originalStyle = {
                    "stroke": element.style("stroke"),
                    "stroke-width": element.style("stroke-width")
                };
                element.append("desc")
                    .text(JSON.stringify(originalStyle));
            })
            .on("mouseover", function(event, d){
                highlight(d);
                setLabel(d);
            })
            .on("mouseout", function(event, d){
                dehighlight(d);
                d3.select(".infolabel").remove();
            })
            .on("mousemove", moveLabel);

        //create a text element for the chart title
        var chartTitle = chart.append("text")
            .attr("x", 40)
            .attr("y", 40)
            .attr("class", "chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");

        //create vertical axis generator
        var yAxis = d3.axisLeft()
            .scale(yScale);

        //place axis
        var axis = chart.append("g")
            .attr("class", "axis")
            .attr("transform", translate)
            .call(yAxis);

        //create frame for chart border
        var chartFrame = chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
        };

    //function to create a dropdown menu for attribute selection
    function createDropdown(csvData){
        //add select element
        var dropdown = d3.select("body")
            .append("select")
            .attr("class", "dropdown")
            .on("change", function(){
                changeAttribute(this.value, csvData);
            });

        //add initial option
        var titleOption = dropdown.append("option")
            .attr("class", "titleOption")
            .attr("disabled", "true")
            .text("Select Attribute");

        //add attribute name options
        var attrOptions = dropdown.selectAll("attrOptions")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", function(d){ return d })
            .text(function(d){ return d });
    }

    //function to handle change in attribute selection
    function changeAttribute(attribute, csvData) {
        //change the expressed attribute
        expressed = attribute;

        //recreate the color scale
        var colorScale = makeColorScale(csvData);

        //recolor enumeration units
        var regions = d3.selectAll(".regions")
        .transition()
        .duration(1000)
        .style("fill", function(d){            
            var value = d.properties[expressed];            
            if(value) {                
                return colorScale(value);           
            } else {                
                return "#ccc";            
            }    
        });

        //update the legend
        //updateLegend(colorScale);
 
        //Sort, resize, and recolor bars
        var bars = d3.selectAll(".bar")
            //Sort bars
            .sort(function(a, b){
                return b[expressed] - a[expressed];
            })
            .transition() //add animation
            .delay(function(d, i){
                return i * 20
            })
            .duration(500);

        updateChart(bars, csvData.length, colorScale);

        //update the chart title
        d3.select(".chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");

        // Update the legend
        updateLegend(colorScale);

    }; //end of changeAttribute()

    //function to position, size, and color bars in chart
    function updateChart(bars, n, colorScale){
        //position bars
        bars.attr("x", function(d, i){
                return i * (chartInnerWidth / n) + leftPadding;
            })
            //size/resize bars
            .attr("height", function(d, i){
                return 463 - yScale(parseFloat(d[expressed]));
            })
            .attr("y", function(d, i){
                return yScale(parseFloat(d[expressed])) + topBottomPadding;
            })
            //color/recolor bars
            .style("fill", function(d){            
                var value = d[expressed];            
                if(value) {                
                    return colorScale(value);            
                } else {                
                    return "#ccc";            
                }    
            });

        //add text to char title
        d3.select(".chartTitle")
            .text("Number of Variable " + expressed[3] + " in each region");
    }

     //function to highlight enumeration units and bars
     function highlight(props){
        //change stroke
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", "blue")
            .style("stroke-width", "2");
    };

    //function to reset the element style on mouseout
    function dehighlight(props){
        var selected = d3.selectAll("." + props.adm1_code)
            .style("stroke", function(){
                return getStyle(this, "stroke")
            })
            .style("stroke-width", function(){
                return getStyle(this, "stroke-width")
        });

        //remove dynamic label
        d3.select(".infolabel").remove();
    };

    //function to get the original style of elements
    function getStyle(element, styleName){
        var styleText = d3.select(element)
            .select("desc")
            .text();

        var styleObject = JSON.parse(styleText);

        return styleObject[styleName];
};

//function to create dynamic label
function setLabel(props){
    //label content
    var labelAttribute = "<h1>" + props[expressed] +
        "</h1><b>" + expressed + "</b>";

    //create info label div
    var infolabel = d3.select("body")
        .append("div")
        .attr("class", "infolabel")
        .attr("id", props.adm1_code + "_label")
        .html(labelAttribute);

    var regionName = infolabel.append("div")
        .attr("class", "labelname")
        .html(props.name);
};

//function to move info label with mouse
function moveLabel(){

    //get width of label
    var labelWidth = d3.select(".infolabel")
        .node()
        .getBoundingClientRect()
        .width;

    //use coordinates of mousemove event to set label coordinates
    var x1 = event.clientX + 10,
        y1 = event.clientY - 75,
        x2 = event.clientX - labelWidth - 10,
        y2 = event.clientY + 25;

    //horizontal label coordinate, testing for overflow
    var x = event.clientX > window.innerWidth - labelWidth - 20 ? x2 : x1; 
    //vertical label coordinate, testing for overflow
    var y = event.clientY < 75 ? y2 : y1; 

    d3.select(".infolabel")
        .style("left", x + "px")
        .style("top", y + "px");

};

function createLegend(colorScale) {
    //select the legend container and clear any existing content
    var legendContainer = d3.select(".legendContainer").html("");

    var legend = legendContainer.append("svg")
        .attr("class", "legend")
        .attr("width", 300)
        .attr("height", 50);



   /*  var legend = d3.select(".legendContainer")
        .append("svg")
        .attr("class", "legend")
        .attr("width", 300)
        .attr("height", 50) */
        //.attr("transform", "translate(20,20)");

    var legendLinear = d3.legendColor()
        .shapeWidth(30)
        .orient('horizontal')
        .scale(colorScale);

    legend.call(legendLinear);
}

//function to update the legend
/* function updateLegend(colorScale) {
    d3.select(".legend").remove();
    createLegend(colorScale);
} */

//function to update the legend
function updateLegend(colorScale) {
    createLegend(colorScale);
}

})(); //last line of main.js